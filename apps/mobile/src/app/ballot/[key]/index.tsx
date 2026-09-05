import { createLegacyApiClient } from '@/api/client';
import { LegacyApiError, type BallotDetail, type Candidate } from '@/api/legacy-api';
import { BallotShareButton } from '@/components/ballot-share-button';
import { CandidateRanking } from '@/components/candidate-ranking';
import { ElectionResults } from '@/components/election-results';
import { GroupQuestions } from '@/components/group-questions';
import { VoteSubmission } from '@/components/vote-submission';
import type { GroupAnswers } from '@/features/group-answers';
import { createRanking } from '@/features/ranking';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type LoadState =
  | { status: 'loading'; key: string }
  | { status: 'loaded'; key: string; detail: BallotDetail }
  | { status: 'error'; key: string; error: LegacyApiError };

function unknownError(): LegacyApiError {
  return new LegacyApiError('network', 'The ballot could not be loaded.');
}

export default function BallotScreen() {
  const params = useLocalSearchParams<{ key?: string | string[] }>();
  const key = Array.isArray(params.key) ? params.key[0] : params.key ?? '';
  const client = useMemo(() => createLegacyApiClient(), []);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState>({ status: 'loading', key });
  const [ranking, setRanking] = useState<Candidate[]>([]);
  const [groupAnswers, setGroupAnswers] = useState<GroupAnswers>({});
  const [voteAccepted, setVoteAccepted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    client.getBallot(key, controller.signal).then(
      (detail) => {
        setRanking(createRanking(detail.candidates, detail.ballot.orderedEntries));
        setGroupAnswers({});
        setVoteAccepted(false);
        setState({ status: 'loaded', key, detail });
      },
      (error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setState({
          status: 'error',
          key,
          error: error instanceof LegacyApiError ? error : unknownError(),
        });
      },
    );

    return () => controller.abort();
  }, [attempt, client, key]);

  const retry = () => {
    setState({ status: 'loading', key });
    setAttempt((value) => value + 1);
  };

  if (state.status === 'loading' || state.key !== key) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator accessibilityLabel="Loading ballot" color="#146c43" size="large" />
        <Text style={styles.loadingText}>Loading ballot…</Text>
      </SafeAreaView>
    );
  }

  if (state.status === 'error') {
    const canRetry = state.error.code === 'network' || state.error.code === 'http';
    return (
      <SafeAreaView style={styles.centered}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Ballot unavailable</Text>
          <Text style={styles.errorText}>{state.error.message}</Text>
          {state.error.details?.resultsRelease ? (
            <Text style={styles.errorMeta}>Results release: {state.error.details.resultsRelease}</Text>
          ) : null}
          {canRetry ? (
            <Pressable
              accessibilityRole="button"
              onPress={retry}
              style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  const { ballot, candidates, groupFields } = state.detail;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>RANK YOUR CHOICES</Text>
        <Text style={styles.title}>{ballot.name}</Text>
        <Text style={styles.shortcode}>Shortcode: {ballot.key}</Text>
        <BallotShareButton ballotKey={ballot.key} ballotName={ballot.name} />

        <View style={styles.metaRow}>
          <View style={styles.metaCard}>
            <Text style={styles.metaValue}>{candidates.length}</Text>
            <Text style={styles.metaLabel}>choices</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaValue}>{ballot.positions}</Text>
            <Text style={styles.metaLabel}>{ballot.positions === 1 ? 'seat' : 'seats'}</Text>
          </View>
          {ballot.isSecure ? (
            <View style={styles.metaCard}>
              <Text style={styles.metaValue}>Code</Text>
              <Text style={styles.metaLabel}>required</Text>
            </View>
          ) : null}
        </View>

        {!voteAccepted && ballot.allowGrouping ? (
          <GroupQuestions answers={groupAnswers} fields={groupFields} onChange={setGroupAnswers} />
        ) : null}

        {!voteAccepted ? (
          <>
            <Text style={styles.sectionTitle}>Your ranking</Text>
            <Text style={styles.helpText}>
              Put your favorite choice first. Use the controls to move or remove choices; you can
              reset the ballot at any time.
            </Text>
            <CandidateRanking
              candidates={candidates}
              onChange={setRanking}
              orderedEntries={ballot.orderedEntries}
              ranking={ranking}
            />
          </>
        ) : null}

        <VoteSubmission
          ballot={ballot}
          groupAnswers={groupAnswers}
          groupFields={groupFields}
          onAccepted={() => setVoteAccepted(true)}
          ranking={ranking}
        />
        {voteAccepted ? (
          <>
            <ElectionResults ballotKey={ballot.key} />
            <BallotShareButton
              ballotKey={ballot.key}
              ballotName={ballot.name}
              label="Share this ballot"
            />
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7fa' },
  scrollContent: { padding: 22 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  centered: {
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: { color: '#40556b', fontSize: 16, marginTop: 12 },
  eyebrow: { color: '#b24c00', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#12355b', fontSize: 32, fontWeight: '800', lineHeight: 38, marginTop: 8 },
  shortcode: { color: '#52697f', fontSize: 15, marginTop: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 },
  metaCard: {
    backgroundColor: '#e8f2ed',
    borderRadius: 12,
    minWidth: 92,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaValue: { color: '#125435', fontSize: 18, fontWeight: '800' },
  metaLabel: { color: '#436251', fontSize: 12, marginTop: 2 },
  sectionTitle: { color: '#1f3143', fontSize: 22, fontWeight: '800', marginTop: 30 },
  helpText: { color: '#52697f', fontSize: 14, lineHeight: 20, marginTop: 6 },
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    maxWidth: 480,
    padding: 24,
    width: '100%',
  },
  errorTitle: { color: '#81261f', fontSize: 24, fontWeight: '800' },
  errorText: { color: '#4e3b39', fontSize: 16, lineHeight: 23, marginTop: 10 },
  errorMeta: { color: '#6a5754', fontSize: 13, marginTop: 10 },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#146c43',
    borderRadius: 10,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  buttonPressed: { opacity: 0.8 },
});
