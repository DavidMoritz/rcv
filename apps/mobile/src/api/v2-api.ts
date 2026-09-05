export type SubmitVoteRequest = {
  groupAnswers?: Record<string, string | boolean>;
  key: string;
  requestId: string;
  ranking: number[];
  fingerprint?: string;
  voterCode?: string;
};

export type SubmitVoteResult = {
  status: 'accepted';
  voteId: number;
  replayed: boolean;
};

export type ElectionResults = {
  ballot: {
    key: string;
    name: string;
    positions: number;
    tieBreak: 'weighted' | 'random';
  };
  candidates: { id: number; name: string }[];
  votes: number[][];
};

export type V2ApiErrorCode =
  | 'validation_failed'
  | 'ballot_not_found'
  | 'results_not_released'
  | 'idempotency_conflict'
  | 'voting_closed'
  | 'voter_name_required'
  | 'secure_code_required'
  | 'invalid_voter_code'
  | 'group_answers_required'
  | 'invalid_group_answers'
  | 'fingerprint_required'
  | 'duplicate_device'
  | 'invalid_ranking'
  | 'server_error'
  | 'network'
  | 'http'
  | 'malformed_response';

export class V2ApiError extends Error {
  constructor(
    public readonly code: V2ApiErrorCode,
    message: string,
    public readonly retryable = false,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'V2ApiError';
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type V2ApiClientOptions = {
  baseUrl: string;
  fetchImpl?: FetchLike;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isKnownErrorCode(value: unknown): value is V2ApiErrorCode {
  return (
    typeof value === 'string' &&
    [
      'validation_failed',
      'ballot_not_found',
      'results_not_released',
      'idempotency_conflict',
      'voting_closed',
      'voter_name_required',
      'secure_code_required',
      'invalid_voter_code',
      'group_answers_required',
      'invalid_group_answers',
      'fingerprint_required',
      'duplicate_device',
      'invalid_ranking',
      'server_error',
    ].includes(value)
  );
}

export class V2ApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor({ baseUrl, fetchImpl = fetch }: V2ApiClientOptions) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fetchImpl = fetchImpl;
  }

  async getResults(key: string, signal?: AbortSignal): Promise<ElectionResults> {
    let response: Response;
    try {
      response = await this.fetchImpl(
        `${this.baseUrl}/v2/results.php?key=${encodeURIComponent(key.trim())}`,
        { signal },
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      throw new V2ApiError('network', 'The results server could not be reached.', true);
    }

    const envelope = await this.parseEnvelope(response);
    if (envelope.error !== null) throw this.normalizeError(envelope.error, response.status);
    if (!response.ok || !isElectionResults(envelope.data)) {
      throw new V2ApiError('malformed_response', 'The results server returned invalid data.');
    }
    return envelope.data;
  }

  async submitVote(request: SubmitVoteRequest, signal?: AbortSignal): Promise<SubmitVoteResult> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/v2/votes.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      throw new V2ApiError('network', 'The vote server could not be reached.', true);
    }

    const envelope = await this.parseEnvelope(response);

    if (envelope.error !== null) {
      throw this.normalizeError(envelope.error, response.status);
    }

    const data = envelope.data;
    if (
      !response.ok ||
      !isRecord(data) ||
      data.status !== 'accepted' ||
      typeof data.voteId !== 'number' ||
      typeof data.replayed !== 'boolean'
    ) {
      throw new V2ApiError('malformed_response', 'The vote server returned invalid success data.');
    }

    return {
      status: 'accepted',
      voteId: data.voteId,
      replayed: data.replayed,
    };
  }

  private async parseEnvelope(response: Response): Promise<Record<string, unknown>> {
    let envelope: unknown;
    try {
      envelope = JSON.parse(await response.text());
    } catch {
      if (!response.ok) {
        throw new V2ApiError('http', 'The server returned an error.', response.status >= 500, response.status);
      }
      throw new V2ApiError('malformed_response', 'The server returned invalid data.');
    }
    if (!isRecord(envelope) || !('error' in envelope) || !('data' in envelope)) {
      throw new V2ApiError('malformed_response', 'The server returned invalid data.');
    }
    return envelope;
  }

  private normalizeError(error: unknown, status: number): V2ApiError {
    if (!isRecord(error) || !isKnownErrorCode(error.code) || typeof error.message !== 'string') {
      return new V2ApiError('malformed_response', 'The server returned invalid error data.');
    }
    return new V2ApiError(
      error.code,
      error.message,
      error.code === 'server_error' || status >= 500,
      status,
    );
  }
}

function isElectionResults(value: unknown): value is ElectionResults {
  if (!isRecord(value) || !isRecord(value.ballot) || !Array.isArray(value.candidates) || !Array.isArray(value.votes)) {
    return false;
  }
  const ballot = value.ballot;
  return (
    typeof ballot.key === 'string' &&
    typeof ballot.name === 'string' &&
    typeof ballot.positions === 'number' &&
    (ballot.tieBreak === 'weighted' || ballot.tieBreak === 'random') &&
    value.candidates.every(
      (candidate) => isRecord(candidate) && typeof candidate.id === 'number' && typeof candidate.name === 'string',
    ) &&
    value.votes.every(
      (vote) => Array.isArray(vote) && vote.every((candidateId) => typeof candidateId === 'number'),
    )
  );
}
