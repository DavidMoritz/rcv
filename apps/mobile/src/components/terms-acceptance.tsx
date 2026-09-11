import { Pressable, StyleSheet, Text, View } from 'react-native';

type TermsAcceptanceProps = {
  accepted: boolean;
  disabled?: boolean;
  onChange: (accepted: boolean) => void;
  onOpenTerms: () => void;
};

export function TermsAcceptance({
  accepted,
  disabled = false,
  onChange,
  onOpenTerms,
}: TermsAcceptanceProps) {
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Accept the ballot content rules"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted, disabled }}
        disabled={disabled}
        onPress={() => onChange(!accepted)}
        style={({ pressed }) => [styles.acceptRow, pressed && styles.pressed]}>
        <View style={[styles.checkbox, accepted && styles.checkboxAccepted]}>
          {accepted ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={styles.acceptText}>
          I agree not to create unlawful, abusive, hateful, sexually explicit, deceptive, or
          rights-infringing ballot content.
        </Text>
      </Pressable>
      <Pressable
        accessibilityHint="Opens the Ranked Choices Terms of Use"
        accessibilityRole="link"
        disabled={disabled}
        onPress={onOpenTerms}
        style={({ pressed }) => [styles.termsLink, pressed && styles.pressed]}>
        <Text style={styles.termsLinkText}>Read the Terms of Use</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 24 },
  acceptRow: { alignItems: 'flex-start', flexDirection: 'row' },
  checkbox: {
    alignItems: 'center',
    borderColor: '#71879a',
    borderRadius: 5,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    marginRight: 11,
    marginTop: 1,
    width: 24,
  },
  checkboxAccepted: { backgroundColor: '#146c43', borderColor: '#146c43' },
  checkmark: { color: '#ffffff', fontSize: 16, fontWeight: '900', lineHeight: 19 },
  acceptText: { color: '#40556b', flex: 1, fontSize: 14, lineHeight: 21 },
  termsLink: { alignSelf: 'flex-start', marginLeft: 35, marginTop: 7, paddingVertical: 4 },
  termsLinkText: { color: '#075eb5', fontSize: 14, textDecorationLine: 'underline' },
  pressed: { opacity: 0.72 },
});
