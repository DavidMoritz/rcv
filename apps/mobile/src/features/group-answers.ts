import type { GroupField } from '@/api/legacy-api';

export type GroupAnswerValue = string | boolean;
export type GroupAnswers = Record<string, GroupAnswerValue>;

export function normalizeGroupAnswers(
  fields: readonly GroupField[],
  answers: GroupAnswers,
): GroupAnswers {
  return Object.fromEntries(
    fields.map((field) => {
      const answer = answers[String(field.id)];
      if (field.type === 'checkbox') return [String(field.id), answer === true];
      return [String(field.id), typeof answer === 'string' ? answer.trim() : ''];
    }),
  );
}

export function validateGroupAnswers(
  fields: readonly GroupField[],
  answers: GroupAnswers,
): Record<string, string> {
  const normalized = normalizeGroupAnswers(fields, answers);
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const key = String(field.id);
    const answer = normalized[key];
    if (field.type === 'checkbox') continue;

    if (field.required && answer === '') {
      errors[key] = 'This question is required.';
      continue;
    }

    if (
      field.type === 'select' &&
      answer !== '' &&
      !field.options.some((option) => String(option.id) === answer)
    ) {
      errors[key] = 'Choose one of the available options.';
    } else if (field.type === 'text' && typeof answer === 'string' && answer.length > 1000) {
      errors[key] = 'Keep this answer under 1,000 characters.';
    }
  }

  return errors;
}

export function groupAnswersAreValid(
  fields: readonly GroupField[],
  answers: GroupAnswers,
): boolean {
  return Object.keys(validateGroupAnswers(fields, answers)).length === 0;
}

export function groupAnswersKey(fields: readonly GroupField[], answers: GroupAnswers): string {
  return JSON.stringify(normalizeGroupAnswers(fields, answers));
}
