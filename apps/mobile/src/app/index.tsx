import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { normalizeShortcode } from '@/utils/shortcode';

export default function HomeScreen() {
  const router = useRouter();
  const [shortcode, setShortcode] = useState('');
  const [error, setError] = useState('');

  const openBallot = () => {
    const key = normalizeShortcode(shortcode);
    if (!key) {
      setError('Enter a ballot shortcode.');
      return;
    }

    setError('');
    router.push({ pathname: '/ballot/[key]', params: { key } });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>PHASE 0 PREVIEW</Text>
          <Text style={styles.title}>Open a ranked-choice ballot</Text>
          <Text style={styles.description}>
            Enter the shortcode from a Ranked Choices ballot. This preview is read-only; ranking
            and vote submission arrive in the next migration slice.
          </Text>

          <Text style={styles.label}>Ballot shortcode</Text>
          <TextInput
            accessibilityLabel="Ballot shortcode"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setShortcode}
            onSubmitEditing={openBallot}
            placeholder="For example: pizza"
            returnKeyType="go"
            style={styles.input}
            value={shortcode}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            onPress={openBallot}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>Find ballot</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f5f7fa',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 24,
    shadowColor: '#0d2033',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
  },
  eyebrow: {
    color: '#b24c00',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#12355b',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    marginTop: 10,
  },
  description: {
    color: '#40556b',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    marginBottom: 24,
  },
  label: {
    color: '#1f3143',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderColor: '#9aabba',
    borderRadius: 12,
    borderWidth: 1,
    color: '#14283b',
    fontSize: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  error: {
    color: '#a6261d',
    fontSize: 14,
    marginTop: 8,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#146c43',
    borderRadius: 12,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
