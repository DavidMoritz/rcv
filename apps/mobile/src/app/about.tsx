import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  PRIVACY_POLICY_URL,
  SOURCE_CODE_URL,
  SUPPORT_EMAIL,
  SUPPORT_URL,
  TERMS_OF_SERVICE_URL,
} from '@/config/service-links';

type ResourceLinkProps = {
  description: string;
  label: string;
  onPress: () => void;
};

function ResourceLink({ description, label, onPress }: ResourceLinkProps) {
  return (
    <Pressable
      accessibilityHint={description}
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [styles.resource, pressed && styles.pressed]}>
      <Text style={styles.resourceLabel}>{label}</Text>
      <Text style={styles.resourceDescription}>{description}</Text>
    </Pressable>
  );
}

export default function AboutScreen() {
  const [error, setError] = useState('');

  const open = async (url: string) => {
    setError('');
    try {
      await Linking.openURL(url);
    } catch {
      setError(`That link could not be opened. Contact ${SUPPORT_EMAIL} for help.`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>RANKED CHOICES</Text>
        <Text style={styles.title}>Privacy & support</Text>
        <Text style={styles.introduction}>
          Learn how ballot and device data are handled, review the terms, contact support, or
          inspect the open-source project.
        </Text>

        {error ? (
          <Text accessibilityLiveRegion="assertive" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <View style={styles.card}>
          <ResourceLink
            description="How Ranked Choices collects, uses, retains, and protects data"
            label="Privacy policy"
            onPress={() => void open(PRIVACY_POLICY_URL)}
          />
          <ResourceLink
            description="The rules for using Ranked Choices"
            label="Terms of service"
            onPress={() => void open(TERMS_OF_SERVICE_URL)}
          />
          <ResourceLink
            description={`Email ${SUPPORT_EMAIL}`}
            label="Contact support"
            onPress={() => void open(SUPPORT_URL)}
          />
          <ResourceLink
            description="View the source code and report issues on GitHub"
            label="Open-source project"
            onPress={() => void open(SOURCE_CODE_URL)}
          />
        </View>

        <Text selectable style={styles.email}>
          Support: {SUPPORT_EMAIL}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7fa' },
  scrollContent: { padding: 22 },
  content: { alignSelf: 'center', maxWidth: 620, width: '100%' },
  eyebrow: { color: '#b24c00', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#12355b', fontSize: 32, fontWeight: '800', lineHeight: 38, marginTop: 8 },
  introduction: { color: '#40556b', fontSize: 16, lineHeight: 24, marginTop: 12 },
  error: {
    backgroundColor: '#fff1ef',
    borderRadius: 10,
    color: '#81261f',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 18,
    padding: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    marginTop: 24,
    overflow: 'hidden',
  },
  resource: {
    borderBottomColor: '#dce3e9',
    borderBottomWidth: 1,
    minHeight: 84,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  resourceLabel: { color: '#12355b', fontSize: 17, fontWeight: '800' },
  resourceDescription: { color: '#52697f', fontSize: 14, lineHeight: 20, marginTop: 4 },
  pressed: { opacity: 0.7 },
  email: { color: '#52697f', fontSize: 14, marginTop: 18, textAlign: 'center' },
});
