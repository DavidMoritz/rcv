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

async function createBallot({ isSecure = false, codeCount = 0, allowGrouping = false } = {}) {
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
      sqlResultsRelease: '2099-12-31 23:59:59',
      isSecure,
      codeCount,
      allowGrouping
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
  it('records and safely replays an idempotent v2 anonymous vote', async () => {
    const ballot = await createBallot();
    const candidates = await requestApi('GET', 'get-candidates.php', {
      query: { key: ballot.key }
    });
    const ranking = candidates.json.candidates.map((candidate) => Number(candidate.entry_id));
    const body = {
      key: ballot.key,
      requestId: `contract_request_${Date.now()}`,
      ranking
    };

    const first = await requestApi('POST', 'v2/votes.php', { body });
    const replay = await requestApi('POST', 'v2/votes.php', { body });

    expect(first.status).toBe(201);
    expect(first.json).toMatchObject({
      data: { status: 'accepted', replayed: false },
      error: null
    });
    expect(replay.status).toBe(200);
    expect(replay.json).toEqual({
      data: { ...first.json.data, replayed: true },
      error: null
    });
  });

  it('redeems a secure voter code once while preserving idempotent retries', async () => {
    const ballot = await createBallot({ isSecure: true, codeCount: 1 });
    const candidates = await requestApi('GET', 'get-candidates.php', {
      query: { key: ballot.key }
    });
    const codes = await requestApi('POST', 'get-ballot-codes.php', {
      body: { ballotId: ballot.ballotId, createdBy: ballot.createdBy }
    });
    const voterCode = codes.json.codes[0].code;
    const ranking = candidates.json.candidates.map((candidate) => Number(candidate.entry_id));
    const body = {
      key: ballot.key,
      requestId: `secure_contract_${Date.now()}`,
      ranking,
      voterCode: voterCode.toUpperCase()
    };

    const first = await requestApi('POST', 'v2/votes.php', { body });
    const replay = await requestApi('POST', 'v2/votes.php', { body });
    const reused = await requestApi('POST', 'v2/votes.php', {
      body: { ...body, requestId: `secure_reuse_${Date.now()}` }
    });

    expect(first.status).toBe(201);
    expect(first.json).toMatchObject({
      data: { status: 'accepted', replayed: false },
      error: null
    });
    expect(replay.status).toBe(200);
    expect(replay.json).toEqual({
      data: { ...first.json.data, replayed: true },
      error: null
    });
    expect(reused.status).toBe(403);
    expect(reused.json).toMatchObject({
      data: null,
      error: { code: 'invalid_voter_code' }
    });
  });

  it('validates and records grouping answers through the v2 vote contract', async () => {
    const ballot = await createBallot({ allowGrouping: true });
    const savedFields = await requestApi('POST', 'save-group-fields.php', {
      body: {
        ballotId: ballot.ballotId,
        createdBy: ballot.createdBy,
        fields: [
          {
            title: 'Region',
            question_text: 'Where do you live?',
            type: 'select',
            required: true,
            options: ['North', 'South']
          },
          {
            title: 'Member',
            question_text: 'Are you a member?',
            type: 'checkbox',
            required: true,
            options: []
          },
          {
            title: 'Team',
            question_text: 'Which team?',
            type: 'text',
            required: false,
            options: []
          }
        ]
      }
    });

    expect(savedFields.json).toEqual({ data: { success: true } });

    const candidates = await requestApi('GET', 'get-candidates.php', {
      query: { key: ballot.key }
    });
    const [region, member, team] = candidates.json.groupFields;
    const north = region.options.find((option) => option.label === 'North');
    const ranking = candidates.json.candidates.map((candidate) => Number(candidate.entry_id));
    const groupAnswers = {
      [region.id]: String(north.id),
      [member.id]: false,
      [team.id]: '  Blue  '
    };

    const invalid = await requestApi('POST', 'v2/votes.php', {
      body: {
        key: ballot.key,
        requestId: `group_invalid_${Date.now()}`,
        ranking,
        groupAnswers: { ...groupAnswers, [region.id]: '999999999' }
      }
    });
    expect(invalid.status).toBe(422);
    expect(invalid.json).toMatchObject({
      data: null,
      error: {
        code: 'invalid_group_answers',
        fields: { [`groupAnswers.${region.id}`]: expect.any(String) }
      }
    });

    const accepted = await requestApi('POST', 'v2/votes.php', {
      body: {
        key: ballot.key,
        requestId: `group_contract_${Date.now()}`,
        ranking,
        groupAnswers
      }
    });
    expect(accepted.status).toBe(201);
    expect(accepted.json).toMatchObject({
      data: { status: 'accepted', replayed: false },
      error: null
    });

    const votes = await requestApi('GET', 'get-votes.php', {
      query: { key: ballot.key }
    });
    expect(JSON.parse(votes.json.votes[0].group_answers)).toEqual({
      [region.id]: String(north.id),
      [member.id]: false,
      [team.id]: 'Blue'
    });
  });

  it('creates a ballot, returns candidates, records a vote, and returns results', async () => {
    const ballot = await createBallot();

    const candidates = await requestApi('GET', 'get-candidates.php', {
      query: { key: ballot.key }
    });

    expect(candidates.json).toMatchObject({
      ballot: expect.objectContaining({
        id: ballot.ballotId,
        key: ballot.key,
        name: ballot.ballotName
      }),
      candidates: expect.arrayContaining([
        expect.objectContaining({ candidate: 'Alpha' }),
        expect.objectContaining({ candidate: 'Beta' }),
        expect.objectContaining({ candidate: 'Gamma' })
      ]),
      groupFields: []
    });
    expect(Number(candidates.json.ballot.positions)).toBe(1);

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
