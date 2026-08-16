export type SubmitVoteRequest = {
  key: string;
  requestId: string;
  ranking: number[];
  fingerprint?: string;
};

export type SubmitVoteResult = {
  status: 'accepted';
  voteId: number;
  replayed: boolean;
};

export type V2ApiErrorCode =
  | 'validation_failed'
  | 'ballot_not_found'
  | 'idempotency_conflict'
  | 'voting_closed'
  | 'voter_name_required'
  | 'secure_code_required'
  | 'group_answers_required'
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
      'idempotency_conflict',
      'voting_closed',
      'voter_name_required',
      'secure_code_required',
      'group_answers_required',
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

    let envelope: unknown;
    try {
      envelope = JSON.parse(await response.text());
    } catch {
      if (!response.ok) {
        throw new V2ApiError(
          'http',
          'The vote server returned an error.',
          response.status >= 500,
          response.status,
        );
      }
      throw new V2ApiError('malformed_response', 'The vote server returned invalid data.');
    }

    if (!isRecord(envelope)) {
      throw new V2ApiError('malformed_response', 'The vote server returned invalid data.');
    }

    if (envelope.error !== null) {
      const error = envelope.error;
      if (!isRecord(error) || !isKnownErrorCode(error.code) || typeof error.message !== 'string') {
        throw new V2ApiError('malformed_response', 'The vote server returned invalid error data.');
      }
      throw new V2ApiError(
        error.code,
        error.message,
        error.code === 'server_error' || response.status >= 500,
        response.status,
      );
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
}
