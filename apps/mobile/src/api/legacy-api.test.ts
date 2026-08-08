import { describe, expect, it, vi } from 'vitest';

import { LegacyApiClient, LegacyApiError, normalizeBallotDetail } from './legacy-api';

const legacyPayload = {
  ballot: {
    id: '42',
    key: 'pizza night',
    name: 'Pizza Night',
    positions: '2',
    register: '0',
    resultsRelease: null,
    voteCutoff: '2099-01-01 00:00:00',
    hideNames: '1',
    hideDetails: '0',
    allowCustom: '0',
    showGraph: '1',
    kickbackUrl: null,
    iframeUrl: '',
    oneDeviceOneVote: '0',
    isSecure: '1',
    orderedEntries: '0',
    allowGrouping: '1',
    createdBy: 'guest',
  },
  candidates: [
    { entry_id: '7', candidate: 'Mushroom', image: '', hyperlink: '', color: 'abcdef' },
    { entry_id: '8', candidate: 'Pepperoni', image: '', hyperlink: '', color: null },
  ],
  groupFields: [
    {
      id: '3',
      title: 'Neighborhood',
      question_text: 'Where do you live?',
      type: 'select',
      required: '1',
      sort_order: '0',
      options: [{ id: '9', label: 'North', sort_order: '0' }],
    },
  ],
};

describe('normalizeBallotDetail', () => {
  it('normalizes PDO string values into a native-friendly model', () => {
    const detail = normalizeBallotDetail(legacyPayload);

    expect(detail.ballot).toMatchObject({
      id: 42,
      positions: 2,
      hideNames: true,
      hideDetails: false,
      showGraph: true,
      isSecure: true,
      allowGrouping: true,
      iframeUrl: null,
    });
    expect(detail.candidates[0]).toEqual({
      id: 7,
      name: 'Mushroom',
      image: '',
      hyperlink: '',
      color: 'abcdef',
    });
    expect(detail.groupFields[0]).toMatchObject({
      id: 3,
      type: 'select',
      required: true,
      sortOrder: 0,
      options: [{ id: 9, label: 'North', sortOrder: 0 }],
    });
  });

  it('rejects malformed candidates at the compatibility seam', () => {
    expect(() =>
      normalizeBallotDetail({ ...legacyPayload, candidates: [{ candidate: 'Missing ID' }] }),
    ).toThrowError(LegacyApiError);
  });
});

describe('LegacyApiClient.getBallot', () => {
  it('encodes the shortcode and returns normalized data', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(legacyPayload)));
    const client = new LegacyApiClient({
      baseUrl: 'https://example.test/api/',
      fetchImpl,
      now: () => 1234,
    });

    const detail = await client.getBallot(' pizza night ');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.test/api/get-candidates.php?key=pizza%20night&t=1234',
      { signal: undefined },
    );
    expect(detail.ballot.key).toBe('pizza night');
  });

  it('maps the legacy text not-found response to a stable error code', async () => {
    const client = new LegacyApiClient({
      baseUrl: 'https://example.test/api',
      fetchImpl: async () => new Response('Shortcode not found.'),
    });

    await expect(client.getBallot('missing')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('preserves the results release when voting is closed', async () => {
    const client = new LegacyApiClient({
      baseUrl: 'https://example.test/api',
      fetchImpl: async () =>
        new Response(JSON.stringify({ status: 'closed', resultsRelease: '2099-02-03 04:05:06' })),
    });

    await expect(client.getBallot('closed')).rejects.toMatchObject({
      code: 'closed',
      details: { resultsRelease: '2099-02-03 04:05:06' },
    });
  });

  it('maps fetch failures without exposing transport details', async () => {
    const client = new LegacyApiClient({
      baseUrl: 'https://example.test/api',
      fetchImpl: async () => {
        throw new Error('socket details');
      },
    });

    await expect(client.getBallot('pizza')).rejects.toMatchObject({ code: 'network' });
  });
});
