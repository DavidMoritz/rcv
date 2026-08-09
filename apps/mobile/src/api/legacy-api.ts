export type Ballot = {
  id: number;
  key: string;
  name: string;
  positions: number;
  register: number;
  resultsRelease: string | null;
  voteCutoff: string | null;
  hideNames: boolean;
  hideDetails: boolean;
  allowCustom: boolean;
  showGraph: boolean;
  kickbackUrl: string | null;
  iframeUrl: string | null;
  oneDeviceOneVote: boolean;
  isSecure: boolean;
  orderedEntries: boolean;
  allowGrouping: boolean;
  createdBy: string;
};

export type Candidate = {
  id: number;
  name: string;
  image: string;
  hyperlink: string;
  color: string | null;
};

export type GroupOption = {
  id: number;
  label: string;
  sortOrder: number;
};

export type GroupField = {
  id: number;
  title: string;
  questionText: string;
  type: 'select' | 'checkbox' | 'text';
  required: boolean;
  sortOrder: number;
  options: GroupOption[];
};

export type BallotDetail = {
  ballot: Ballot;
  candidates: Candidate[];
  groupFields: GroupField[];
};

export type LegacyApiErrorCode =
  | 'invalid_shortcode'
  | 'not_found'
  | 'unavailable'
  | 'closed'
  | 'network'
  | 'http'
  | 'malformed_response';

export class LegacyApiError extends Error {
  constructor(
    public readonly code: LegacyApiErrorCode,
    message: string,
    public readonly details?: { resultsRelease?: string | null; status?: number },
  ) {
    super(message);
    this.name = 'LegacyApiError';
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type LegacyApiClientOptions = {
  baseUrl: string;
  fetchImpl?: FetchLike;
  now?: () => number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function malformed(field?: string): LegacyApiError {
  const suffix = field ? `: ${field}` : '';
  return new LegacyApiError('malformed_response', `The ballot server returned invalid data${suffix}.`);
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw malformed(field);
  }
  return String(value);
}

function asNullableString(value: unknown, field: string): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return asString(value, field);
}

function asNumber(value: unknown, field: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw malformed(field);
  }
  return number;
}

function asBoolean(value: unknown, field: string): boolean {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0' || value === null) return false;
  throw malformed(field);
}

function normalizeBallot(value: unknown): Ballot {
  if (!isRecord(value)) throw malformed('ballot');

  return {
    id: asNumber(value.id, 'ballot.id'),
    key: asString(value.key, 'ballot.key'),
    name: asString(value.name, 'ballot.name'),
    positions: asNumber(value.positions, 'ballot.positions'),
    register: asNumber(value.register ?? 0, 'ballot.register'),
    resultsRelease: asNullableString(value.resultsRelease, 'ballot.resultsRelease'),
    voteCutoff: asNullableString(value.voteCutoff, 'ballot.voteCutoff'),
    hideNames: asBoolean(value.hideNames ?? 0, 'ballot.hideNames'),
    hideDetails: asBoolean(value.hideDetails ?? 0, 'ballot.hideDetails'),
    allowCustom: asBoolean(value.allowCustom ?? 0, 'ballot.allowCustom'),
    showGraph: asBoolean(value.showGraph ?? 0, 'ballot.showGraph'),
    kickbackUrl: asNullableString(value.kickbackUrl, 'ballot.kickbackUrl'),
    iframeUrl: asNullableString(value.iframeUrl, 'ballot.iframeUrl'),
    oneDeviceOneVote: asBoolean(value.oneDeviceOneVote ?? 0, 'ballot.oneDeviceOneVote'),
    isSecure: asBoolean(value.isSecure ?? 0, 'ballot.isSecure'),
    orderedEntries: asBoolean(value.orderedEntries ?? 0, 'ballot.orderedEntries'),
    allowGrouping: asBoolean(value.allowGrouping ?? 0, 'ballot.allowGrouping'),
    createdBy: asString(value.createdBy, 'ballot.createdBy'),
  };
}

function normalizeCandidate(value: unknown): Candidate {
  if (!isRecord(value)) throw malformed('candidate');

  return {
    id: asNumber(value.entry_id, 'candidate.entry_id'),
    name: asString(value.candidate, 'candidate.candidate'),
    image: asString(value.image ?? '', 'candidate.image'),
    hyperlink: asString(value.hyperlink ?? '', 'candidate.hyperlink'),
    color: asNullableString(value.color, 'candidate.color'),
  };
}

function normalizeGroupOption(value: unknown): GroupOption {
  if (!isRecord(value)) throw malformed('groupField.option');
  return {
    id: asNumber(value.id, 'groupField.option.id'),
    label: asString(value.label, 'groupField.option.label'),
    sortOrder: asNumber(value.sort_order ?? 0, 'groupField.option.sort_order'),
  };
}

function normalizeGroupField(value: unknown): GroupField {
  if (!isRecord(value)) throw malformed('groupField');
  const type = asString(value.type ?? 'select', 'groupField.type');
  if (type !== 'select' && type !== 'checkbox' && type !== 'text') {
    throw malformed('groupField.type');
  }
  if (value.options !== undefined && !Array.isArray(value.options)) {
    throw malformed('groupField.options');
  }

  return {
    id: asNumber(value.id, 'groupField.id'),
    title: asString(value.title ?? '', 'groupField.title'),
    questionText: asString(value.question_text ?? '', 'groupField.question_text'),
    type,
    required: asBoolean(value.required ?? 0, 'groupField.required'),
    sortOrder: asNumber(value.sort_order ?? 0, 'groupField.sort_order'),
    options: (value.options ?? []).map(normalizeGroupOption),
  };
}

export function normalizeBallotDetail(value: unknown): BallotDetail {
  if (!isRecord(value)) throw malformed();
  if (!Array.isArray(value.candidates)) throw malformed('candidates');
  if (value.groupFields !== undefined && !Array.isArray(value.groupFields)) {
    throw malformed('groupFields');
  }

  return {
    ballot: normalizeBallot(value.ballot),
    candidates: value.candidates.map(normalizeCandidate),
    groupFields: (value.groupFields ?? []).map(normalizeGroupField),
  };
}

export class LegacyApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly now: () => number;

  constructor(options: LegacyApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
  }

  async getBallot(key: string, signal?: AbortSignal): Promise<BallotDetail> {
    const shortcode = key.trim();
    if (!shortcode) {
      throw new LegacyApiError('invalid_shortcode', 'Enter a ballot shortcode.');
    }

    let response: Response;
    try {
      const url = `${this.baseUrl}/get-candidates.php?key=${encodeURIComponent(shortcode)}&t=${this.now()}`;
      response = await this.fetchImpl(url, { signal });
    } catch (error) {
      if (error instanceof LegacyApiError || (error instanceof Error && error.name === 'AbortError')) {
        throw error;
      }
      throw new LegacyApiError('network', 'Could not reach the ballot server. Check your connection.');
    }

    if (!response.ok) {
      throw new LegacyApiError('http', 'The ballot server could not complete the request.', {
        status: response.status,
      });
    }

    const raw = await response.text();
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      const message = raw.trim();
      if (message === 'Shortcode not found.') {
        throw new LegacyApiError('not_found', 'No ballot was found for that shortcode.');
      }
      if (message === 'This ballot has no candidates and cannot accept votes.') {
        throw new LegacyApiError('unavailable', message);
      }
      throw malformed();
    }

    if (isRecord(payload) && payload.status === 'closed') {
      throw new LegacyApiError('closed', 'Voting has closed for this ballot.', {
        resultsRelease: asNullableString(payload.resultsRelease, 'resultsRelease'),
      });
    }

    return normalizeBallotDetail(payload);
  }
}
