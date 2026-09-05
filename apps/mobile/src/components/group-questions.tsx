import type { GroupField } from '@/api/legacy-api';
import type { GroupAnswers, GroupAnswerValue } from '@/features/group-answers';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type GroupQuestionsProps = {
  answers: GroupAnswers;
  disabled?: boolean;
  fields: readonly GroupField[];
  onChange: (answers: GroupAnswers) => void;
};

export function GroupQuestions({ answers, disabled = false, fields, onChange }: GroupQuestionsProps) {
  const updateAnswer = (fieldId: number, value: GroupAnswerValue) => {
    onChange({ ...answers, [String(fieldId)]: value });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voter questions</Text>
      <Text style={styles.helpText}>Answer these questions before submitting your ranking.</Text>

      {fields.map((field) => {
        const key = String(field.id);
        const answer = answers[key];
        const label = field.questionText || field.title;

        if (field.type === 'checkbox') {
          const checked = answer === true;
          return (
            <View key={field.id} style={styles.fieldCard}>
              <Pressable
                aria-checked={checked}
                aria-disabled={disabled}
                accessibilityLabel={label}
                accessibilityRole="checkbox"
                accessibilityState={{ checked, disabled }}
                disabled={disabled}
                onPress={() => updateAnswer(field.id, !checked)}
                style={({ pressed }) => [styles.checkboxRow, pressed && styles.pressed]}>
                <Text style={styles.checkboxMark}>{checked ? '☑' : '☐'}</Text>
                <Text style={styles.checkboxLabel}>{label}</Text>
              </Pressable>
            </View>
          );
        }

        return (
          <View key={field.id} style={styles.fieldCard}>
            <Text style={styles.label}>
              {label}
              {field.required ? ' *' : ''}
            </Text>

            {field.type === 'text' ? (
              <TextInput
                accessibilityLabel={label}
                editable={!disabled}
                maxLength={1000}
                onChangeText={(value) => updateAnswer(field.id, value)}
                placeholder="Enter your answer"
                style={styles.textInput}
                value={typeof answer === 'string' ? answer : ''}
              />
            ) : (
              <View accessibilityLabel={label} accessibilityRole="radiogroup">
                {!field.required ? (
                  <RadioOption
                    checked={!answer}
                    disabled={disabled}
                    label="No answer"
                    onPress={() => updateAnswer(field.id, '')}
                  />
                ) : null}
                {field.options.map((option) => (
                  <RadioOption
                    checked={answer === String(option.id)}
                    disabled={disabled}
                    key={option.id}
                    label={option.label}
                    onPress={() => updateAnswer(field.id, String(option.id))}
                  />
                ))}
              </View>
            )}
          </View>
        );
      })}

      {fields.some((field) => field.required && field.type !== 'checkbox') ? (
        <Text style={styles.requiredNote}>* Required</Text>
      ) : null}
    </View>
  );
}

type RadioOptionProps = {
  checked: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
};

function RadioOption({ checked, disabled, label, onPress }: RadioOptionProps) {
  return (
    <Pressable
      aria-checked={checked}
      aria-disabled={disabled}
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.optionRow, checked && styles.optionSelected, pressed && styles.pressed]}>
      <Text style={styles.radioMark}>{checked ? '●' : '○'}</Text>
      <Text style={styles.optionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 26 },
  title: { color: '#1f3143', fontSize: 22, fontWeight: '800' },
  helpText: { color: '#52697f', fontSize: 14, lineHeight: 20, marginTop: 6 },
  fieldCard: { backgroundColor: '#ffffff', borderRadius: 12, marginTop: 12, padding: 14 },
  label: { color: '#263b33', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  textInput: {
    borderColor: '#8aa097',
    borderRadius: 9,
    borderWidth: 1,
    color: '#172b23',
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  checkboxRow: { alignItems: 'center', flexDirection: 'row', minHeight: 44 },
  checkboxMark: { color: '#146c43', fontSize: 25, marginRight: 10 },
  checkboxLabel: { color: '#263b33', flex: 1, fontSize: 15, fontWeight: '700' },
  optionRow: {
    alignItems: 'center',
    borderColor: '#d2ddd8',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionSelected: { backgroundColor: '#e8f2ed', borderColor: '#146c43' },
  radioMark: { color: '#146c43', fontSize: 20, marginRight: 10 },
  optionLabel: { color: '#263b33', flex: 1, fontSize: 15 },
  requiredNote: { color: '#52697f', fontSize: 12, marginTop: 10 },
  pressed: { opacity: 0.72 },
});
