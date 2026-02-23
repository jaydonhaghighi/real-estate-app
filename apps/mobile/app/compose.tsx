import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { Card } from '../components/card';
import { apiPost } from '../lib/api';
import { spacing } from '../lib/theme';
import { TabThemeColors, useTabTheme } from '../lib/tab-theme';

function normalizeParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default function ComposeScreen(): JSX.Element {
  const { colors, mode } = useTabTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ lead_id?: string }>();
  const leadId = normalizeParam(params.lead_id);
  const [subject, setSubject] = useState('Quick follow-up');
  const [body, setBody] = useState('Hi, checking in to see if you are available for a quick update today.');

  const sendMutation = useMutation({
    mutationFn: () => {
      if (!leadId) {
        throw new Error('Missing lead context. Open compose from a lead thread.');
      }

      return apiPost('/messages/email/reply', {
        lead_id: leadId,
        subject,
        body
      });
    }
  });

  const draftMutation = useMutation({
    mutationFn: () => {
      if (!leadId) {
        throw new Error('Missing lead context. Open compose from a lead thread.');
      }

      return apiPost('/ai/draft', {
        lead_id: leadId,
        channel: 'email',
        instruction: 'Friendly follow-up with clear next step',
        human_action_required: true
      });
    },
    onSuccess: (data: unknown) => {
      if (!data || typeof data !== 'object') {
        return;
      }

      const text = (data as { text?: unknown }).text;
      if (typeof text === 'string') {
        setBody(text);
      }
    }
  });

  const isBlocked = !leadId;
  const sendDisabled = isBlocked || !subject.trim() || !body.trim() || sendMutation.isPending;
  const draftDisabled = isBlocked || draftMutation.isPending;
  const errorMessage = (sendMutation.error instanceof Error ? sendMutation.error.message : null)
    ?? (draftMutation.error instanceof Error ? draftMutation.error.message : null);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Compose Message</Text>
      <Text style={styles.subtitle}>Human-in-the-loop email draft. Review and send manually.</Text>

      {isBlocked ? (
        <Card tone={mode}>
          <Text style={styles.warningTitle}>Lead context required</Text>
          <Text style={styles.warningBody}>Open this screen from a lead thread to compose without internal IDs.</Text>
        </Card>
      ) : null}

      <Card tone={mode}>
        <Text style={styles.label}>Subject</Text>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          style={styles.input}
          placeholder="Subject"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.label}>Message</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          style={[styles.input, styles.largeInput]}
          placeholder="Write your message"
          placeholderTextColor={colors.textSecondary}
          multiline
        />

        <Pressable
          style={[styles.actionButton, styles.aiButton, draftDisabled ? styles.disabledButton : null]}
          onPress={() => draftMutation.mutate()}
          disabled={draftDisabled}
        >
          <Text style={styles.aiActionText}>Generate AI Draft</Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.sendButton, sendDisabled ? styles.disabledButton : null]}
          onPress={() => sendMutation.mutate()}
          disabled={sendDisabled}
        >
          <Text style={styles.actionText}>Send Message</Text>
        </Pressable>
      </Card>

      {sendMutation.isSuccess ? <Text style={styles.success}>Message logged and queued successfully.</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </ScrollView>
  );
}

function createStyles(colors: TabThemeColors) {
  return StyleSheet.create({
    container: {
      padding: spacing.lg,
      paddingBottom: 120
    },
    heading: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '800'
    },
    subtitle: {
      color: colors.textSecondary,
      marginTop: 4,
      marginBottom: spacing.md
    },
    label: {
      color: colors.textSecondary,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontWeight: '700',
      marginBottom: 4
    },
    input: {
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 11,
      paddingHorizontal: 12,
      marginBottom: spacing.sm,
      backgroundColor: colors.surfaceMuted,
      color: colors.text
    },
    largeInput: {
      minHeight: 140,
      textAlignVertical: 'top'
    },
    actionButton: {
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: spacing.xs
    },
    aiButton: {
      backgroundColor: colors.cardMuted
    },
    sendButton: {
      backgroundColor: colors.primary
    },
    disabledButton: {
      opacity: 0.55
    },
    actionText: {
      color: colors.white,
      fontWeight: '800'
    },
    aiActionText: {
      color: colors.text,
      fontWeight: '800'
    },
    warningTitle: {
      color: colors.warning,
      fontWeight: '800',
      marginBottom: 6
    },
    warningBody: {
      color: colors.textSecondary
    },
    success: {
      color: colors.accent,
      marginTop: spacing.sm,
      fontWeight: '700'
    },
    error: {
      color: '#FF8A8A',
      marginTop: spacing.sm
    }
  });
}
