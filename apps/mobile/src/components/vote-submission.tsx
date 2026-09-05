import { createV2ApiClient } from '@/api/client';
import type { Ballot, Candidate } from '@/api/legacy-api';
import { V2ApiError } from '@/api/v2-api';
import {
  blockerMessage,
  formatCutoffCountdown,
  getOrCreateVoteRequest,
  getVoteBlocker,
  normalizeVoterCode,
  type PendingVoteRequest,
} from '@/features/vote-submission';
import { loadInstallationId } from '@/utils/installation-id';
import * as Crypto from 'expo-crypto';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type SubmissionState =
  | { status: 'idle'; submissionKey: string }
  | { status: 'submitting'; submissionKey: string }
  | { status: 'accepted'; submissionKey: string; replayed: boolean; voteId: number }
  | { status: 'error'; submissionKey: string; error: V2ApiError };

type VoteSubmissionProps = {
  ballot: Ballot;
  onAccepted: () => void;
  ranking: readonly Candidate[];
};

export function VoteSubmission({ ballot, onAccepted, ranking }: VoteSubmissionProps) {
  const client = useMemo(() => createV2ApiClient(), []);
  const [now, setNow] = useState(() => Date.now());
  const [request, setRequest] = useState<PendingVoteRequest | null>(null);
  const [voterCode, setVoterCode] = useState('');
  const rankingKey = ranking.map((candidate) => candidate.id).join(',');
  const normalizedVoterCode = normalizeVoterCode(voterCode);
  const ballotRankingKey = `${ballot.key}|${rankingKey}`;
  const submissionKey = ballot.isSecure
    ? `${ballotRankingKey}|${normalizedVoterCode}`
    : ballotRankingKey;
  const [state, setState] = useState<SubmissionState>({ status: 'idle', submissionKey });
  const currentState: SubmissionState =
    state.submissionKey === submissionKey ? state : { status: 'idle', submissionKey };

  useEffect(() => {
    if (!ballot.voteCutoff) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ballot.voteCutoff]);

  const blocker = getVoteBlocker(ballot, ranking.length, now, voterCode);
  const cutoffMessage = formatCutoffCountdown(ballot.voteCutoff, now);

  const submit = async () => {
    if (blocker || currentState.status === 'submitting' || currentState.status === 'accepted') return;

    const activeRequest = getOrCreateVoteRequest(request, submissionKey, Crypto.randomUUID);
    const activeRequestId = activeRequest.requestId;
    setRequest(activeRequest);
    setState({ status: 'submitting', submissionKey });

    try {
      const fingerprint = ballot.oneDeviceOneVote ? await loadInstallationId() : undefined;
      const result = await client.submitVote({
        key: ballot.key,
        requestId: activeRequestId,
        ranking: ranking.map((candidate) => candidate.id),
        fingerprint,
        voterCode: ballot.isSecure ? normalizedVoterCode : undefined,
      });
      setState({
        status: 'accepted',
        submissionKey,
        replayed: result.replayed,
        voteId: result.voteId,
      });
      onAccepted();
    } catch (error) {
      setState({
        status: 'error',
        submissionKey,
        error:
          error instanceof V2ApiError
            ? error
            : new V2ApiError('fingerprint_required', 'The device identifier could not be loaded.', true),
      });
    }
  };

  if (currentState.status === 'accepted') {
    return (
      <View accessibilityLiveRegion="polite" style={styles.successCard}>
        <Text style={styles.successTitle}>Vote recorded</Text>
        <Text style={styles.successText}>
          Thank you. Your vote was {currentState.replayed ? 'confirmed again safely' : 'accepted'}.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {cutoffMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.cutoffNotice}>
          {cutoffMessage}
        </Text>
      ) : null}

      {ballot.isSecure ? (
        <View style={styles.codeField}>
          <Text style={styles.codeLabel}>Voter code</Text>
          <TextInput
            accessibilityLabel="Voter code"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            autoCorrect={false}
            editable={currentState.status !== 'submitting'}
            maxLength={6}
            onChangeText={(value) => setVoterCode(value.replace(/\s/g, ''))}
            placeholder="Six-character code"
            style={styles.codeInput}
            textContentType="oneTimeCode"
            value={voterCode}
          />
        </View>
      ) : null}

      {blocker ? (
        <Text accessibilityLiveRegion="polite" style={styles.blockerNotice}>
          {blockerMessage(blocker)}
        </Text>
      ) : null}

      {currentState.status === 'error' ? (
        <View accessibilityLiveRegion="assertive" style={styles.errorCard}>
          <Text style={styles.errorTitle}>
            {currentState.error.code === 'duplicate_device'
              ? 'Already voted'
              : currentState.error.code === 'invalid_voter_code'
                ? 'Code not accepted'
                : 'Vote not recorded'}
          </Text>
          <Text style={styles.errorText}>{currentState.error.message}</Text>
          {currentState.error.retryable ? (
            <Pressable
              accessibilityLabel="Retry vote submission"
              accessibilityRole="button"
              onPress={submit}
              style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Pressable
        accessibilityHint="Records the ranking shown above"
        accessibilityLabel="Submit vote"
        accessibilityRole="button"
        accessibilityState={{ disabled: blocker !== null || currentState.status === 'submitting' }}
        disabled={blocker !== null || currentState.status === 'submitting'}
        onPress={submit}
        style={({ pressed }) => [
          styles.submitButton,
          (blocker !== null || currentState.status === 'submitting') && styles.submitDisabled,
          pressed && currentState.status !== 'submitting' && styles.buttonPressed,
        ]}>
        {currentState.status === 'submitting' ? (
          <View style={styles.submittingRow}>
            <ActivityIndicator accessibilityLabel="Submitting vote" color="#ffffff" />
            <Text style={styles.submitText}>Submitting…</Text>
          </View>
        ) : (
          <Text style={styles.submitText}>Submit vote</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 22 },
  cutoffNotice: {
    backgroundColor: '#fff3dc',
    borderRadius: 10,
    color: '#6b4600',
    fontSize: 14,
    marginBottom: 12,
    padding: 12,
  },
  blockerNotice: {
    backgroundColor: '#f4eceb',
    borderRadius: 10,
    color: '#6f2822',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    padding: 12,
  },
  codeField: { marginBottom: 12 },
  codeLabel: { color: '#263b33', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  codeInput: {
    backgroundColor: '#ffffff',
    borderColor: '#8aa097',
    borderRadius: 10,
    borderWidth: 1,
    color: '#172b23',
    fontSize: 18,
    letterSpacing: 2,
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  errorCard: { backgroundColor: '#fff1ef', borderRadius: 12, marginBottom: 12, padding: 14 },
  errorTitle: { color: '#81261f', fontSize: 17, fontWeight: '800' },
  errorText: { color: '#5f3a36', fontSize: 14, lineHeight: 20, marginTop: 5 },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#81261f',
    borderRadius: 8,
    marginTop: 12,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#146c43',
    borderRadius: 12,
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  submitDisabled: { backgroundColor: '#879891' },
  submitText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  submittingRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  buttonPressed: { opacity: 0.75 },
  successCard: { backgroundColor: '#e8f2ed', borderRadius: 14, marginTop: 22, padding: 18 },
  successTitle: { color: '#125435', fontSize: 21, fontWeight: '800' },
  successText: { color: '#365c48', fontSize: 15, lineHeight: 21, marginTop: 6 },
});
