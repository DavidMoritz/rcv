import { canonicalBallotUrl } from '@/features/ballot-sharing';

export const PRIVACY_POLICY_URL = 'https://rankedchoices.com/privacy-policy.html';
export const TERMS_OF_SERVICE_URL = 'https://rankedchoices.com/terms-of-service.html';
export const SOURCE_CODE_URL = 'https://github.com/DavidMoritz/rcv';
export const SUPPORT_EMAIL = 'davidmoritz@gmail.com';
export const SUPPORT_URL = `mailto:${SUPPORT_EMAIL}?subject=Ranked%20Choices%20support`;

export function createBallotReportUrl(ballotKey: string): string {
  const normalizedKey = ballotKey.trim();
  const subject = encodeURIComponent(`Report Ranked Choices ballot ${normalizedKey}`);
  const body = encodeURIComponent(
    `Ballot shortcode: ${normalizedKey}\nBallot link: ${canonicalBallotUrl(normalizedKey)}\n\nDescribe the objectionable or abusive content:\n`,
  );

  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}
