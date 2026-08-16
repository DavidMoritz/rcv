import type { Candidate } from '@/api/legacy-api';

export type RankDirection = 'up' | 'down';
export type RandomSource = () => number;

export function shuffleCandidates(
  candidates: readonly Candidate[],
  random: RandomSource = Math.random,
): Candidate[] {
  const shuffled = [...candidates];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function createRanking(
  candidates: readonly Candidate[],
  orderedEntries: boolean,
  random: RandomSource = Math.random,
): Candidate[] {
  return orderedEntries ? [...candidates] : shuffleCandidates(candidates, random);
}

export function moveCandidate(
  candidates: readonly Candidate[],
  candidateId: number,
  direction: RankDirection,
): Candidate[] {
  const currentIndex = candidates.findIndex((candidate) => candidate.id === candidateId);
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= candidates.length) {
    return [...candidates];
  }

  const ranked = [...candidates];
  [ranked[currentIndex], ranked[targetIndex]] = [ranked[targetIndex], ranked[currentIndex]];
  return ranked;
}

export function removeCandidate(
  candidates: readonly Candidate[],
  candidateId: number,
): Candidate[] {
  return candidates.filter((candidate) => candidate.id !== candidateId);
}
