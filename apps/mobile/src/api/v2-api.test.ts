import { describe, expect, it, vi } from 'vitest';

import { V2ApiClient, V2ApiError } from './v2-api';

const request = {
  groupAnswers: { '12': '42', '13': false, '14': 'Blue' },
  key: 'pizza',
  requestId: '12345678-1234-4234-8234-123456789012',
  ranking: [3, 1, 2],
  fingerprint: 'installation-id',
  voterCode: 'abcooi',
};

const createdBallot = {
  status: 'created',
  ballot: { id: 42, key: '12ab34cd', name: 'Lunch', positions: 1 },
  candidates: [
    { id: 100, name: 'Tacos' },
    { id: 101, name: 'Salad' },
  ],
  managementToken: 'a'.repeat(43),
};

describe('V2ApiClient.createBallot', () => {
  it('creates a basic ballot and accepts the one-time management credential', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: createdBallot, error: null }), { status: 201 }),
    );
    const client = new V2ApiClient({ baseUrl: 'https://example.test/api/', fetchImpl });

    await expect(
      client.createBallot({ name: 'Lunch', candidates: ['Tacos', 'Salad'] }),
    ).resolves.toEqual(createdBallot);
    expect(fetchImpl).toHaveBeenCalledWith('https://example.test/api/v2/ballots.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Lunch', candidates: ['Tacos', 'Salad'] }),
      signal: undefined,
    });
  });

  it('preserves server field errors for the creation form', async () => {
    const client = new V2ApiClient({
      baseUrl: 'https://example.test/api',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: null,
            error: {
              code: 'validation_failed',
              message: 'Check the ballot details.',
              fields: { name: 'Enter a name.', 'candidates.1': 'Candidate names must be unique.' },
            },
          }),
          { status: 422 },
        ),
    });

    await expect(client.createBallot({ name: '', candidates: ['A', 'A'] })).rejects.toMatchObject({
      code: 'validation_failed',
      fields: { name: 'Enter a name.', 'candidates.1': 'Candidate names must be unique.' },
      retryable: false,
      status: 422,
    });
  });

  it('treats a lost creation response as uncertain and unsafe to retry', async () => {
    const client = new V2ApiClient({
      baseUrl: 'https://example.test/api',
      fetchImpl: async () => {
        throw new Error('connection lost');
      },
    });

    await expect(client.createBallot({ name: 'Lunch', candidates: ['A', 'B'] })).rejects.toMatchObject({
      code: 'creation_unknown',
      retryable: false,
    });
  });

  it('rejects success data without a valid management credential', async () => {
    const client = new V2ApiClient({
      baseUrl: 'https://example.test/api',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({ data: { ...createdBallot, managementToken: 'short' }, error: null }),
          { status: 201 },
        ),
    });

    await expect(client.createBallot({ name: 'Lunch', candidates: ['A', 'B'] })).rejects.toMatchObject({
      code: 'malformed_response',
    });
  });
});

describe('V2ApiClient.submitVote', () => {
  it('submits typed rankings and returns the accepted response', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: { status: 'accepted', voteId: 42, replayed: false },
          error: null,
        }),
        { status: 201 },
      ),
    );
    const client = new V2ApiClient({ baseUrl: 'https://example.test/api/', fetchImpl });

    await expect(client.submitVote(request)).resolves.toEqual({
      status: 'accepted',
      voteId: 42,
      replayed: false,
    });
    expect(fetchImpl).toHaveBeenCalledWith('https://example.test/api/v2/votes.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: undefined,
    });
  });

  it('preserves typed duplicate errors', async () => {
    const client = new V2ApiClient({
      baseUrl: 'https://example.test/api',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: null,
            error: { code: 'duplicate_device', message: 'Already voted.' },
          }),
          { status: 409 },
        ),
    });

    await expect(client.submitVote(request)).rejects.toMatchObject({
      code: 'duplicate_device',
      retryable: false,
      status: 409,
    });
  });

  it('preserves invalid voter-code errors', async () => {
    const client = new V2ApiClient({
      baseUrl: 'https://example.test/api',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: null,
            error: { code: 'invalid_voter_code', message: 'Code not accepted.' },
          }),
          { status: 403 },
        ),
    });

    await expect(client.submitVote(request)).rejects.toMatchObject({
      code: 'invalid_voter_code',
      retryable: false,
      status: 403,
    });
  });

  it('preserves invalid grouping-answer errors', async () => {
    const client = new V2ApiClient({
      baseUrl: 'https://example.test/api',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: null,
            error: { code: 'invalid_group_answers', message: 'Answers are invalid.' },
          }),
          { status: 422 },
        ),
    });

    await expect(client.submitVote(request)).rejects.toMatchObject({
      code: 'invalid_group_answers',
      retryable: false,
      status: 422,
    });
  });

  it('marks transport and server errors as retryable', async () => {
    const networkClient = new V2ApiClient({
      baseUrl: 'https://example.test/api',
      fetchImpl: async () => {
        throw new Error('offline');
      },
    });
    const serverClient = new V2ApiClient({
      baseUrl: 'https://example.test/api',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: null,
            error: { code: 'server_error', message: 'Try later.' },
          }),
          { status: 500 },
        ),
    });

    await expect(networkClient.submitVote(request)).rejects.toMatchObject({
      code: 'network',
      retryable: true,
    });
    await expect(serverClient.submitVote(request)).rejects.toMatchObject({
      code: 'server_error',
      retryable: true,
    });
  });

  it('rejects malformed envelopes at the compatibility seam', async () => {
    const client = new V2ApiClient({
      baseUrl: 'https://example.test/api',
      fetchImpl: async () => new Response(JSON.stringify({ ok: true })),
    });

    await expect(client.submitVote(request)).rejects.toBeInstanceOf(V2ApiError);
    await expect(client.submitVote(request)).rejects.toMatchObject({ code: 'malformed_response' });
  });
});

describe('V2ApiClient.getResults', () => {
  it('loads typed anonymous election data', async () => {
    const payload = {
      ballot: { key: 'pizza night', name: 'Pizza', positions: 1, tieBreak: 'weighted' },
      candidates: [{ id: 3, name: 'Mushroom' }],
      votes: [[3]],
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: payload, error: null })),
    );
    const client = new V2ApiClient({ baseUrl: 'https://example.test/api/', fetchImpl });

    await expect(client.getResults(' pizza night ')).resolves.toEqual(payload);
    expect(fetchImpl).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calledUrl = (fetchImpl.mock.calls as any)[0][0] as string;
    expect(calledUrl).toMatch(/^https:\/\/example\.test\/api\/v2\/results\.php\?key=pizza%20night&_=\d+$/);
  });

  it('preserves the unreleased-results state', async () => {
    const client = new V2ApiClient({
      baseUrl: 'https://example.test/api',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: null,
            error: { code: 'results_not_released', message: 'Not released.' },
          }),
          { status: 403 },
        ),
    });

    await expect(client.getResults('private')).rejects.toMatchObject({
      code: 'results_not_released',
      retryable: false,
    });
  });
});
