import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { GroupField } from '@/api/legacy-api';

import { GroupQuestions } from './group-questions';

const fields: GroupField[] = [
  {
    id: 1,
    title: 'Region',
    questionText: 'Where do you live?',
    type: 'select',
    required: true,
    sortOrder: 0,
    options: [{ id: 11, label: 'North', sortOrder: 0 }],
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

describe('GroupQuestions', () => {
  it('renders accessible controls for every supported question type', () => {
    const html = renderToStaticMarkup(
      <GroupQuestions
        answers={{ '1': '11', '2': false, '3': 'Blue' }}
        fields={fields}
        onChange={() => undefined}
      />,
    );

    expect(html).toContain('Voter questions');
    expect(html).toContain('role="radiogroup"');
    expect(html).toMatch(/aria-checked="true"[^>]*role="radio"/);
    expect(html).toMatch(/aria-checked="false"[^>]*role="checkbox"/);
    expect(html).toContain('aria-label="Which team?"');
    expect(html).toContain('value="Blue"');
  });
});
