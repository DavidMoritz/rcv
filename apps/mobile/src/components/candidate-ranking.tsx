import type { Candidate } from '@/api/legacy-api';
import { createRanking, moveCandidate, removeCandidate } from '@/features/ranking';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type CandidateRankingProps = {
  candidates: readonly Candidate[];
  onChange: (ranking: Candidate[]) => void;
  orderedEntries: boolean;
  ranking: readonly Candidate[];
};

export function CandidateRanking({
  candidates,
  onChange,
  orderedEntries,
  ranking,
}: CandidateRankingProps) {
  const reset = () => onChange(createRanking(candidates, orderedEntries));

  return (
    <View>
      <Text accessibilityLiveRegion="polite" style={styles.rankingStatus}>
        {ranking.length} {ranking.length === 1 ? 'choice' : 'choices'} ranked
      </Text>

      <View style={styles.candidateList}>
        {ranking.map((candidate, index) => {
          const moveUpDisabled = index === 0;
          const moveDownDisabled = index === ranking.length - 1;

          return (
            <View key={candidate.id} style={styles.candidateRow}>
              <View accessibilityLabel={`Rank ${index + 1}`} style={styles.rankBadge}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <Text style={styles.candidateName}>{candidate.name}</Text>
              <View accessibilityLabel={`Ranking controls for ${candidate.name}`} style={styles.actions}>
                <RankButton
                  disabled={moveUpDisabled}
                  label="Up"
                  accessibilityLabel={`Move ${candidate.name} up`}
                  onPress={() => onChange(moveCandidate(ranking, candidate.id, 'up'))}
                />
                <RankButton
                  disabled={moveDownDisabled}
                  label="Down"
                  accessibilityLabel={`Move ${candidate.name} down`}
                  onPress={() => onChange(moveCandidate(ranking, candidate.id, 'down'))}
                />
                <RankButton
                  label="Remove"
                  accessibilityLabel={`Remove ${candidate.name} from ranking`}
                  destructive
                  onPress={() => onChange(removeCandidate(ranking, candidate.id))}
                />
              </View>
            </View>
          );
        })}
      </View>

      {ranking.length === 0 ? (
        <Text accessibilityLiveRegion="polite" style={styles.emptyText}>
          No choices are currently ranked. Reset to restore the ballot.
        </Text>
      ) : null}

      <Pressable
        accessibilityHint="Restores every choice and its initial ballot ordering"
        accessibilityLabel="Reset candidate ranking"
        accessibilityRole="button"
        onPress={reset}
        style={({ pressed }) => [styles.resetButton, pressed && styles.buttonPressed]}>
        <Text style={styles.resetText}>Reset ranking</Text>
      </Pressable>
    </View>
  );
}

type RankButtonProps = {
  accessibilityLabel: string;
  destructive?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

function RankButton({
  accessibilityLabel,
  destructive = false,
  disabled = false,
  label,
  onPress,
}: RankButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        destructive && styles.removeButton,
        disabled && styles.actionDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}>
      <Text style={[styles.actionText, destructive && styles.removeText, disabled && styles.disabledText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rankingStatus: { color: '#40556b', fontSize: 13, marginTop: 12 },
  candidateList: { gap: 10, marginTop: 10 },
  candidateRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d9e0e7',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 12,
  },
  rankBadge: {
    alignItems: 'center',
    backgroundColor: '#12355b',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  rankText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  candidateName: { color: '#1f3143', flex: 1, fontSize: 17, fontWeight: '700', minWidth: 120 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionButton: {
    backgroundColor: '#e8eef4',
    borderColor: '#b8c5d1',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  actionText: { color: '#173b5e', fontSize: 14, fontWeight: '700' },
  removeButton: { backgroundColor: '#fff1ef', borderColor: '#d8aaa5' },
  removeText: { color: '#81261f' },
  actionDisabled: { backgroundColor: '#f1f3f5', borderColor: '#dce1e5' },
  disabledText: { color: '#8a959f' },
  buttonPressed: { opacity: 0.72 },
  emptyText: { color: '#6a5754', fontSize: 14, lineHeight: 20, marginTop: 14 },
  resetButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderColor: '#8ba0b4',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 16,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resetText: { color: '#173b5e', fontSize: 15, fontWeight: '800' },
});
