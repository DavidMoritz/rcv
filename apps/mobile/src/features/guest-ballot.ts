import type { CreateBallotRequest } from '@/api/v2-api';

export type GuestBallotFieldErrors = {
  name?: string;
  candidates?: string;
  candidateNames: Record<number, string>;
};

export type GuestBallotValidation =
  | { ok: true; request: CreateBallotRequest }
  | { ok: false; errors: GuestBallotFieldErrors };

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/u;
const ASTRAL_CHARACTERS = /[\u{10000}-\u{10ffff}]/u;

function normalizeText(value: string, maxCharacters: number): string | null {
  const normalized = value.trim();
  if (
    !normalized ||
    CONTROL_CHARACTERS.test(normalized) ||
    ASTRAL_CHARACTERS.test(normalized) ||
    Array.from(normalized).length > maxCharacters
  ) {
    return null;
  }
  return normalized;
}

export function validateGuestBallot(
  nameValue: string,
  candidateValues: string[],
): GuestBallotValidation {
  const errors: GuestBallotFieldErrors = { candidateNames: {} };
  const name = normalizeText(nameValue, 64);
  if (name === null) {
    errors.name = 'Enter a ballot name of 64 characters or fewer.';
  }

  if (candidateValues.length < 2 || candidateValues.length > 100) {
    errors.candidates = 'Enter between 2 and 100 candidates.';
  }

  const candidates: string[] = [];
  const seen = new Set<string>();
  candidateValues.forEach((candidateValue, index) => {
    const candidate = normalizeText(candidateValue, 256);
    if (candidate === null) {
      errors.candidateNames[index] = 'Enter a candidate name of 256 characters or fewer.';
      return;
    }

    const key = candidate.toLowerCase();
    if (seen.has(key)) {
      errors.candidateNames[index] = 'Candidate names must be unique.';
      return;
    }
    seen.add(key);
    candidates.push(candidate);
  });

  if (errors.name || errors.candidates || Object.keys(errors.candidateNames).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, request: { name: name as string, candidates } };
}
