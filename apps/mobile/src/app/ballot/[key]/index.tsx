import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BallotPlaceholderScreen() {
  const params = useLocalSearchParams<{ key?: string | string[] }>();
  const key = Array.isArray(params.key) ? params.key[0] : params.key ?? '';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>EXPO SCAFFOLD</Text>
        <Text style={styles.title}>Ballot route ready</Text>
        <Text style={styles.description}>
          Shortcode: {key || 'none'}
          {'\n\n'}The typed PHP adapter and read-only ballot display are intentionally layered in
          the next stacked PR.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    maxWidth: 520,
    padding: 24,
    width: '100%',
  },
  eyebrow: {
    color: '#b24c00',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#12355b',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 10,
  },
  description: {
    color: '#40556b',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
});
