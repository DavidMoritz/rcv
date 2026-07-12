// @vitest-environment node

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

const apiBaseUrl = process.env.RCV_API_BASE_URL || 'http://127.0.0.1:2461/api';
const createdBallots = [];

function endpointUrl(endpoint, query = {}) {
  const url = new URL(`${apiBaseUrl}/${endpoint}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function requestApi(method, endpoint, { query, body } = {}) {
  const response = await fetch(endpointUrl(endpoint, query), {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    status: response.status,
    ok: response.ok,
    text,
    json
  };
}

async function createBallot() {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const key = `contract-${uniqueId}`;
  const createdBy = `contract-test-${uniqueId}`;
  const ballotName = `Contract Test ${uniqueId}`;

  const newBallot = await requestApi('POST', 'new-ballot.php', {
    body: {
      name: ballotName,
      key,
      positions: '1',
      createdBy,
      sqlVoteCutoff: '2099-12-31 23:59:59',
      sqlResultsRelease: '2099-12-31 23:59:59'
    }
  });

  expect(newBallot.text).toMatch(/^\d+$/);

  const ballotId = Number(newBallot.text);
  createdBallots.push({ ballotId, createdBy });

  const addEntries = await requestApi('POST', 'add-entries.php', {
    body: {
      ballotId,
      entries: ['Alpha', 'Beta', 'Gamma'],
      images: ['', '', ''],
      hyperlinks: ['', '', ''],
      colors: ['', '', '']
    }
  });

  expect(addEntries.text).toBe('Success');

  return {
    ballotId,
    ballotName,
    createdBy,
    key
  };
}

async function cleanupBallot({ ballotId, createdBy }) {
  await requestApi('POST', 'delete-votes.php', {
    body: {
      id: ballotId,
      createdBy
    }
  });

  await requestApi('POST', 'delete-ballot.php', {
    body: {
      id: ballotId,
      createdBy
    }
  });
}

beforeAll(async () => {
  try {
    const response = await requestApi('GET', 'get-candidates.php');
    if (response.status >= 500) {
      throw new Error(`server responded with HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Live API contract tests require a running PHP dev server at ${apiBaseUrl}. ` +
        `Start it with "cd src && php -S localhost:2461" or set RCV_API_BASE_URL.\n` +
        `Reachability check failed: ${error.message}`
    );
  }
});

afterEach(async () => {
  while (createdBallots.length > 0) {
    const ballot = createdBallots.pop();
    await cleanupBallot(ballot);
  }
});

describe('live PHP API contracts', () => {
  it('creates a ballot, returns candidates, records a vote, and returns results', async () => {
    const ballot = await createBallot();

    const candidates = await requestApi('GET', 'get-candidates.php', {
      query: { key: ballot.key }
    });

    expect(candidates.json).toMatchObject({
      ballot: expect.objectContaining({
        id: ballot.ballotId,
        key: ballot.key,
        name: ballot.ballotName,
        positions: '1'
      }),
      candidates: expect.arrayContaining([
        expect.objectContaining({ candidate: 'Alpha' }),
        expect.objectContaining({ candidate: 'Beta' }),
        expect.objectContaining({ candidate: 'Gamma' })
      ]),
      groupFields: []
    });

    const candidateIds = candidates.json.candidates.map((candidate) => candidate.entry_id);

    const vote = await requestApi('POST', 'vote.php', {
      body: {
        key: ballot.key,
        id: ballot.ballotId,
        vote: 'Alpha,Beta,Gamma',
        voteIds: candidateIds.join(','),
        name: 'Contract Voter'
      }
    });

    expect(vote.text).toBe('');

    const votes = await requestApi('GET', 'get-votes.php', {
      query: { key: ballot.key }
    });

    expect(votes.json).toMatchObject({
      ballot: expect.objectContaining({
        id: ballot.ballotId,
        ballotName: ballot.ballotName,
        createdBy: ballot.createdBy
      }),
      entries: expect.arrayContaining([
        expect.objectContaining({ name: 'Alpha' }),
        expect.objectContaining({ name: 'Beta' }),
        expect.objectContaining({ name: 'Gamma' })
      ]),
      votes: expect.arrayContaining([
        expect.objectContaining({
          voteIds: candidateIds.join(','),
          name: 'Contract Voter'
        })
      ]),
      groupFields: []
    });
  });

  it('returns the expected validation envelope for new-ballot errors', async () => {
    const response = await requestApi('POST', 'new-ballot.php', {
      body: {}
    });

    expect(response.json).toEqual({
      errors: {
        name: 'Name is required.',
        key: 'Key is required.',
        positions: 'Positions is required.',
        createdBy: 'Created By is required.'
      },
      post: []
    });
  });

  it('returns the expected plain-text and JSON error contracts for common failures', async () => {
    const missingShortcode = await requestApi('GET', 'get-candidates.php');
    expect(missingShortcode.text).toBe('Failed to supply Shortcode');

    const missingVote = await requestApi('POST', 'vote.php', {
      body: { key: 'missing-vote-key' }
    });

    expect(missingVote.json).toEqual({
      errors: {
        vote: 'Vote is required.'
      },
      post: {
        key: 'missing-vote-key'
      }
    });
  });
});
