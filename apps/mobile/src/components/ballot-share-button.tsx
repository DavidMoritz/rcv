import { ballotShareContent, ballotShareOptions } from '@/features/ballot-sharing';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

type BallotShareButtonProps = {
  ballotKey: string;
  ballotName: string;
  label?: string;
};

export function BallotShareButton({
  ballotKey,
  ballotName,
  label = 'Share ballot',
}: BallotShareButtonProps) {
  const [sharing, setSharing] = useState(false);
  const [failed, setFailed] = useState(false);

  const share = async () => {
    setFailed(false);
    setSharing(true);
    try {
      await Share.share(ballotShareContent(ballotName, ballotKey), ballotShareOptions(ballotName));
    } catch {
      setFailed(true);
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityHint="Opens the system share sheet with the ballot link"
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ busy: sharing, disabled: sharing }}
        disabled={sharing}
        onPress={share}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>{sharing ? 'Opening…' : label}</Text>
      </Pressable>
      {failed ? (
        <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
          Could not open sharing. Try again.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-start', marginTop: 14 },
  button: {
    backgroundColor: '#12355b',
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  errorText: { color: '#81261f', fontSize: 13, marginTop: 7 },
  pressed: { opacity: 0.76 },
});
