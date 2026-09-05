import { describe, expect, it } from 'vitest';

import type { GroupField } from '@/api/legacy-api';

import {
  groupAnswersAreValid,
  groupAnswersKey,
  normalizeGroupAnswers,
  validateGroupAnswers,
} from './group-answers';

const fields: GroupField[] = [
  {
    id: 1,
    title: 'Region',
    questionText: 'Where do you live?',
    type: 'select',
    required: true,
    sortOrder: 0,
    options: [
      { id: 11, label: 'North', sortOrder: 0 },
      { id: 12, label: 'South', sortOrder: 1 },
    ],
  },
  {
    id: 2,
    title: 'Member',
    questionText: 'Are you a member?',
    type: 'checkbox',
    required: true,
    sortOrder: 1,
    options: [],
  },
  {
    id: 3,
    title: 'Team',
    questionText: 'Which team?',
    type: 'text',
    required: false,
    sortOrder: 2,
    options: [],
  },
];

describe('group answers', () => {
  it('normalizes answers in configured field order', () => {
    expect(normalizeGroupAnswers(fields, { '3': '  Blue  ', '1': '11' })).toEqual({
      '1': '11',
      '2': false,
      '3': 'Blue',
    });
  });

  it('accepts configured options, false checkboxes, and optional blank text', () => {
    const answers = { '1': '12', '2': false, '3': '' };

    expect(validateGroupAnswers(fields, answers)).toEqual({});
    expect(groupAnswersAreValid(fields, answers)).toBe(true);
  });

  it('rejects missing required answers, unknown options, and oversized text', () => {
    expect(validateGroupAnswers(fields, { '1': '99', '3': 'x'.repeat(1001) })).toEqual({
      '1': 'Choose one of the available options.',
      '3': 'Keep this answer under 1,000 characters.',
    });
    expect(validateGroupAnswers(fields, {})).toMatchObject({
      '1': 'This question is required.',
    });
  });

  it('builds a stable idempotency key independent of input insertion order', () => {
    expect(groupAnswersKey(fields, { '3': 'Blue', '1': '11' })).toBe(
      groupAnswersKey(fields, { '1': '11', '3': 'Blue' }),
    );
  });
});
