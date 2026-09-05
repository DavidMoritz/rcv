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
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.test/api/v2/results.php?key=pizza%20night',
      { signal: undefined },
    );
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
