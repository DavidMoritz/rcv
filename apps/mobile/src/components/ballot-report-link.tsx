import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { createBallotReportUrl, SUPPORT_EMAIL } from '@/config/service-links';

type BallotReportLinkProps = {
  ballotKey: string;
};

export function BallotReportLink({ ballotKey }: BallotReportLinkProps) {
  const [error, setError] = useState('');

  const report = async () => {
    setError('');
    try {
      await Linking.openURL(createBallotReportUrl(ballotKey));
    } catch {
      setError(`Email ${SUPPORT_EMAIL} and include shortcode ${ballotKey}.`);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityHint="Opens an email with this ballot shortcode so you can report objectionable or abusive content"
        accessibilityRole="link"
        onPress={() => void report()}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <Text style={styles.linkText}>Report this ballot</Text>
      </Pressable>
      {error ? (
        <Text accessibilityLiveRegion="assertive" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginTop: 18 },
  link: { paddingHorizontal: 12, paddingVertical: 8 },
  linkText: { color: '#81261f', fontSize: 14, textDecorationLine: 'underline' },
  error: { color: '#81261f', fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
  pressed: { opacity: 0.72 },
});
