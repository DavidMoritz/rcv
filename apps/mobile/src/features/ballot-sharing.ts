export const RANKED_CHOICES_ORIGIN = 'https://rankedchoices.com';

export type BallotShareContent = {
  message: string;
  title: string;
  url: string;
};

export function canonicalBallotUrl(key: string): string {
  return `${RANKED_CHOICES_ORIGIN}/ballot/${encodeURIComponent(key.trim())}`;
}

export function ballotShareContent(ballotName: string, key: string): BallotShareContent {
  const name = ballotName.trim() || 'this ballot';
  const url = canonicalBallotUrl(key);

  return {
    message: `Vote in “${name}” on Ranked Choices: ${url}`,
    title: `Share ${name}`,
    url,
  };
}

export function ballotShareOptions(ballotName: string) {
  const name = ballotName.trim() || 'Ranked Choices ballot';
  return {
    dialogTitle: `Share ${name}`,
    subject: `Vote in ${name}`,
  };
}
