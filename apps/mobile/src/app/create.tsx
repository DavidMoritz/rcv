import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { V2ApiClient, V2ApiError, type CreatedBallot } from '@/api/v2-api';
import { BallotShareButton } from '@/components/ballot-share-button';
import { TermsAcceptance } from '@/components/terms-acceptance';
import { getApiBaseUrl } from '@/config/api';
import { TERMS_OF_SERVICE_URL } from '@/config/service-links';
import { validateGuestBallot, type GuestBallotFieldErrors } from '@/features/guest-ballot';
import { saveBallotManagementToken } from '@/utils/ballot-management-token-store';

type CreatedBallotSummary = Omit<CreatedBallot, 'managementToken'>;
type SubmissionState = 'editing' | 'submitting' | 'created' | 'storage-error' | 'error';

const emptyErrors = (): GuestBallotFieldErrors => ({ candidateNames: {} });

export default function CreateBallotScreen() {
  const router = useRouter();
  const client = useMemo(() => new V2ApiClient({ baseUrl: getApiBaseUrl() }), []);
  const [name, setName] = useState('');
  const [candidates, setCandidates] = useState(['', '']);
  const [fieldErrors, setFieldErrors] = useState<GuestBallotFieldErrors>(emptyErrors);
  const [submissionState, setSubmissionState] = useState<SubmissionState>('editing');
  const [message, setMessage] = useState('');
  const [createdBallot, setCreatedBallot] = useState<CreatedBallotSummary | null>(null);
  const [pendingManagementToken, setPendingManagementToken] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const updateCandidate = (index: number, value: string) => {
    setCandidates((current) => current.map((candidate, candidateIndex) =>
      candidateIndex === index ? value : candidate,
    ));
  };

  const removeCandidate = (index: number) => {
    if (candidates.length <= 2) return;
    setCandidates((current) => current.filter((_, candidateIndex) => candidateIndex !== index));
  };

  const storeCreatedBallot = async (result: CreatedBallot) => {
    const { managementToken, ...summary } = result;
    try {
      await saveBallotManagementToken(SecureStore, result.ballot.key, managementToken);
      setCreatedBallot(summary);
      setPendingManagementToken(null);
      setMessage('Management access is protected on this device.');
      setSubmissionState('created');
    } catch {
      // Keep the credential only in memory so the user can retry storage while
      // this screen remains open. Never display or log it.
      setCreatedBallot(summary);
      setPendingManagementToken(managementToken);
      setMessage(
        'Your ballot was created, but this device could not save management access. Keep this screen open and try saving again.',
      );
      setSubmissionState('storage-error');
    }
  };

  const createBallot = async () => {
    if (!acceptedTerms) {
      setMessage('Accept the ballot content rules before creating a ballot.');
      setSubmissionState('error');
      return;
    }

    const validation = validateGuestBallot(name, candidates);
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      setMessage('Check the highlighted details.');
      setSubmissionState('error');
      return;
    }

    setFieldErrors(emptyErrors());
    setMessage('');

    try {
      if (Platform.OS === 'web' || !(await SecureStore.isAvailableAsync())) {
        setMessage('Basic ballot creation currently requires the iOS or Android app.');
        setSubmissionState('error');
        return;
      }
    } catch {
      setMessage('Encrypted device storage is unavailable, so a manageable ballot cannot be created.');
      setSubmissionState('error');
      return;
    }

    setSubmissionState('submitting');
    try {
      await storeCreatedBallot(await client.createBallot(validation.request));
    } catch (error) {
      if (error instanceof V2ApiError) {
        const serverFields = error.fields ?? {};
        const candidateNames: Record<number, string> = {};
        Object.entries(serverFields).forEach(([field, fieldMessage]) => {
          const match = /^candidates\.(\d+)$/.exec(field);
          if (match) candidateNames[Number(match[1])] = fieldMessage;
        });
        setFieldErrors({
          name: serverFields.name,
          candidates: serverFields.candidates,
          candidateNames,
        });
        setMessage(error.message);
      } else {
        setMessage('The ballot could not be created. Try again.');
      }
      setSubmissionState('error');
    }
  };

  const openTerms = async () => {
    try {
      await Linking.openURL(TERMS_OF_SERVICE_URL);
    } catch {
      setMessage('The Terms of Use could not be opened. Visit rankedchoices.com before continuing.');
      setSubmissionState('error');
    }
  };

  const retryCredentialStorage = async () => {
    if (!createdBallot || !pendingManagementToken) return;
    setSubmissionState('submitting');
    try {
      await saveBallotManagementToken(
        SecureStore,
        createdBallot.ballot.key,
        pendingManagementToken,
      );
      setPendingManagementToken(null);
      setMessage('Management access is protected on this device.');
      setSubmissionState('created');
    } catch {
      setMessage('Management access still could not be saved. Keep this screen open and try again.');
      setSubmissionState('storage-error');
    }
  };

  if (createdBallot) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>BALLOT CREATED</Text>
            <Text style={styles.title}>{createdBallot.ballot.name}</Text>
            <Text style={styles.description}>
              Share this shortcode so people can open and vote on your ballot.
            </Text>
            <Text style={styles.shortcodeLabel}>Ballot shortcode</Text>
            <Text selectable style={styles.shortcode}>{createdBallot.ballot.key}</Text>
            <Text
              accessibilityLiveRegion={submissionState === 'storage-error' ? 'assertive' : 'polite'}
              style={submissionState === 'storage-error' ? styles.error : styles.success}>
              {message}
            </Text>

            {submissionState === 'created' ? (
              <Text style={styles.deviceNote}>
                Until account claiming is available, losing this device or its app data may mean
                losing management access.
              </Text>
            ) : null}

            {pendingManagementToken ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: submissionState === 'submitting', disabled: submissionState === 'submitting' }}
                disabled={submissionState === 'submitting'}
                onPress={retryCredentialStorage}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                {submissionState === 'submitting' ? <ActivityIndicator color="#ffffff" /> : (
                  <Text style={styles.primaryButtonText}>Try saving access again</Text>
                )}
              </Pressable>
            ) : (
              <>
                <BallotShareButton
                  ballotKey={createdBallot.ballot.key}
                  ballotName={createdBallot.ballot.name}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.replace({
                    pathname: '/ballot/[key]',
                    params: { key: createdBallot.ballot.key },
                  })}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                  <Text style={styles.primaryButtonText}>Open ballot</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const submitting = submissionState === 'submitting';
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.eyebrow}>BASIC BALLOT</Text>
            <Text style={styles.title}>Create a ranked-choice ballot</Text>
            <Text style={styles.description}>
              Add a name and at least two candidates. Advanced settings remain available on
              RankedChoices.com.
            </Text>

            <Text style={styles.label}>Ballot name</Text>
            <TextInput
              accessibilityLabel="Ballot name"
              autoCorrect
              editable={!submitting}
              maxLength={64}
              onChangeText={setName}
              placeholder="For example: Team lunch"
              returnKeyType="next"
              style={[styles.input, fieldErrors.name && styles.inputError]}
              value={name}
            />
            {fieldErrors.name ? <Text style={styles.error}>{fieldErrors.name}</Text> : null}

            <Text style={styles.sectionTitle}>Candidates</Text>
            {candidates.map((candidate, index) => (
              <View key={index} style={styles.candidateGroup}>
                <View style={styles.candidateHeading}>
                  <Text style={styles.label}>Candidate {index + 1}</Text>
                  {candidates.length > 2 ? (
                    <Pressable
                      accessibilityLabel={`Remove candidate ${index + 1}`}
                      accessibilityRole="button"
                      disabled={submitting}
                      onPress={() => removeCandidate(index)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </Pressable>
                  ) : null}
                </View>
                <TextInput
                  accessibilityLabel={`Candidate ${index + 1}`}
                  autoCorrect
                  editable={!submitting}
                  maxLength={256}
                  onChangeText={(value) => updateCandidate(index, value)}
                  placeholder="Candidate name"
                  returnKeyType="next"
                  style={[styles.input, fieldErrors.candidateNames[index] && styles.inputError]}
                  value={candidate}
                />
                {fieldErrors.candidateNames[index] ? (
                  <Text style={styles.error}>{fieldErrors.candidateNames[index]}</Text>
                ) : null}
              </View>
            ))}
            {fieldErrors.candidates ? <Text style={styles.error}>{fieldErrors.candidates}</Text> : null}

            {candidates.length < 100 ? (
              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={() => setCandidates((current) => [...current, ''])}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <Text style={styles.secondaryButtonText}>Add candidate</Text>
              </Pressable>
            ) : null}

            <TermsAcceptance
              accepted={acceptedTerms}
              disabled={submitting}
              onChange={setAcceptedTerms}
              onOpenTerms={() => void openTerms()}
            />

            {message ? (
              <Text accessibilityLiveRegion="assertive" style={styles.error}>{message}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: submitting, disabled: submitting }}
              disabled={submitting}
              onPress={createBallot}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              {submitting ? <ActivityIndicator color="#ffffff" /> : (
                <Text style={styles.primaryButtonText}>Create ballot</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  safeArea: { flex: 1, backgroundColor: '#f5f7fa' },
  scrollContent: { flexGrow: 1, padding: 24 },
  card: {
    width: '100%', maxWidth: 520, alignSelf: 'center', borderRadius: 20,
    backgroundColor: '#ffffff', padding: 24, shadowColor: '#0d2033',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 4,
  },
  eyebrow: { color: '#b24c00', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#12355b', fontSize: 30, fontWeight: '800', lineHeight: 36, marginTop: 10 },
  description: { color: '#40556b', fontSize: 16, lineHeight: 24, marginTop: 12, marginBottom: 24 },
  label: { color: '#1f3143', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  sectionTitle: { color: '#12355b', fontSize: 20, fontWeight: '800', marginTop: 24, marginBottom: 14 },
  candidateGroup: { marginBottom: 16 },
  candidateHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: {
    borderColor: '#9aabba', borderRadius: 12, borderWidth: 1, color: '#14283b',
    fontSize: 17, paddingHorizontal: 14, paddingVertical: 13,
  },
  inputError: { borderColor: '#a6261d', borderWidth: 2 },
  error: { color: '#a6261d', fontSize: 14, lineHeight: 20, marginTop: 8 },
  success: { color: '#146c43', fontSize: 14, lineHeight: 20, marginTop: 12 },
  deviceNote: { color: '#40556b', fontSize: 13, lineHeight: 19, marginTop: 10 },
  removeText: { color: '#a6261d', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  primaryButton: {
    alignItems: 'center', backgroundColor: '#146c43', borderRadius: 12,
    marginTop: 18, minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 14,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  secondaryButton: {
    alignItems: 'center', borderColor: '#146c43', borderRadius: 12, borderWidth: 1,
    alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 11,
  },
  secondaryButtonText: { color: '#146c43', fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.78 },
  shortcodeLabel: { color: '#40556b', fontSize: 14, fontWeight: '700' },
  shortcode: {
    color: '#12355b', fontSize: 30, fontWeight: '800', letterSpacing: 2,
    marginTop: 5, paddingVertical: 6,
  },
});
