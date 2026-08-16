import { createV2ApiClient } from '@/api/client';
import { V2ApiError } from '@/api/v2-api';
import { calculateElection, type ElectionResult } from '@rankedchoices/rcv-core';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type ResultState =
  | { status: 'loading' }
  | { status: 'loaded'; result: ElectionResult; voteCount: number }
  | { status: 'error'; error: V2ApiError };

export function ElectionResults({ ballotKey }: { ballotKey: string }) {
  const client = useMemo(() => createV2ApiClient(), []);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ResultState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    client.getResults(ballotKey, controller.signal).then(
      (data) => {
        setState({
          status: 'loaded',
          voteCount: data.votes.length,
          result: calculateElection({
            candidates: data.candidates,
            ballots: data.votes,
            seats: data.ballot.positions,
            tieBreak: data.ballot.tieBreak,
          }),
        });
      },
      (error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setState({
          status: 'error',
          error:
            error instanceof V2ApiError
              ? error
              : new V2ApiError('network', 'Results could not be loaded.', true),
        });
      },
    );
    return () => controller.abort();
  }, [attempt, ballotKey, client]);

  if (state.status === 'loading') {
    return (
      <View accessibilityLiveRegion="polite" style={styles.statusCard}>
        <ActivityIndicator accessibilityLabel="Calculating election results" color="#146c43" />
        <Text style={styles.statusText}>Calculating results on this device…</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    const unreleased = state.error.code === 'results_not_released';
    return (
      <View accessibilityLiveRegion="polite" style={styles.statusCard}>
        <Text style={styles.sectionTitle}>
          {unreleased ? 'Results are private' : 'Results unavailable'}
        </Text>
        <Text style={styles.statusText}>
          {unreleased ? 'This ballot’s results have not been released yet.' : state.error.message}
        </Text>
        {state.error.retryable ? (
          <Pressable
            accessibilityLabel="Retry election results"
            accessibilityRole="button"
            onPress={() => {
              setState({ status: 'loading' });
              setAttempt((value) => value + 1);
            }}
            style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return <ElectionResultsView result={state.result} voteCount={state.voteCount} />;
}

export function ElectionResultsView({
  result,
  voteCount,
}: {
  result: ElectionResult;
  voteCount: number;
}) {
  return (
    <View accessibilityLabel="Local election results" style={styles.results}>
      <Text style={styles.sectionTitle}>Current results</Text>
      <Text style={styles.summary}>
        Calculated on this device from {voteCount} {voteCount === 1 ? 'vote' : 'votes'}.
      </Text>

      <View style={styles.winnerCard}>
        <Text style={styles.winnerLabel}>{result.winners.length === 1 ? 'Winner' : 'Winners'}</Text>
        <Text style={styles.winnerNames}>
          {result.winners.length > 0
            ? result.winners.map((candidate) => candidate.name).join(', ')
            : 'No winner yet'}
        </Text>
      </View>

      {result.rounds.map((round) => (
        <View key={round.number} style={styles.roundCard}>
          <Text style={styles.roundTitle}>Round {round.number}</Text>
          {Object.entries(round.tally)
            .sort((left, right) => right[1] - left[1])
            .map(([candidateId, votes]) => (
              <View key={candidateId} style={styles.tallyRow}>
                <Text style={styles.tallyName}>{candidateName(result, Number(candidateId))}</Text>
                <Text style={styles.tallyVotes}>{formatVotes(votes)}</Text>
              </View>
            ))}
          <Text style={styles.outcomeText}>
            {round.outcome.type === 'elected' ? 'Elected' : 'Eliminated'}:{' '}
            {round.outcome.candidateName}
          </Text>
        </View>
      ))}
    </View>
  );
}

function candidateName(result: ElectionResult, id: number): string {
  return result.candidates.find((candidate) => candidate.id === id)?.name ?? `Choice ${id}`;
}

function formatVotes(votes: number): string {
  return Number.isInteger(votes) ? String(votes) : votes.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

const styles = StyleSheet.create({
  results: { marginTop: 28 },
  sectionTitle: { color: '#1f3143', fontSize: 22, fontWeight: '800' },
  summary: { color: '#52697f', fontSize: 14, lineHeight: 20, marginTop: 5 },
  statusCard: { backgroundColor: '#ffffff', borderRadius: 14, marginTop: 18, padding: 18 },
  statusText: { color: '#52697f', fontSize: 14, lineHeight: 20, marginTop: 8 },
  winnerCard: { backgroundColor: '#e8f2ed', borderRadius: 14, marginTop: 14, padding: 16 },
  winnerLabel: { color: '#436251', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  winnerNames: { color: '#125435', fontSize: 21, fontWeight: '800', marginTop: 4 },
  roundCard: { backgroundColor: '#ffffff', borderRadius: 14, marginTop: 12, padding: 16 },
  roundTitle: { color: '#12355b', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  tallyRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingVertical: 4 },
  tallyName: { color: '#344a5f', flex: 1, fontSize: 14 },
  tallyVotes: { color: '#1f3143', fontSize: 14, fontWeight: '700' },
  outcomeText: { color: '#6b4600', fontSize: 13, fontWeight: '700', marginTop: 10 },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#146c43',
    borderRadius: 8,
    marginTop: 12,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  retryText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  buttonPressed: { opacity: 0.75 },
});
