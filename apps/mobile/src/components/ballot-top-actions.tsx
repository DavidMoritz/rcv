import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BallotShareButton } from './ballot-share-button';

type BallotTopActionsProps = {
  ballotKey: string;
  ballotName: string;
  onViewResults: () => void;
  resultsVisible: boolean;
};

export function BallotTopActions({
  ballotKey,
  ballotName,
  onViewResults,
  resultsVisible,
}: BallotTopActionsProps) {
  return (
    <View style={styles.topActions}>
      <BallotShareButton ballotKey={ballotKey} ballotName={ballotName} />
      {!resultsVisible ? (
        <Pressable
          accessibilityRole="button"
          onPress={onViewResults}
          style={({ pressed }) => [styles.resultsButton, pressed && styles.buttonPressed]}>
          <Text style={styles.resultsButtonText}>View Results</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  resultsButton: {
    alignItems: 'center',
    backgroundColor: '#e8f2ed',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultsButtonText: { color: '#125435', fontSize: 15, fontWeight: '800' },
  buttonPressed: { opacity: 0.75 },
});
