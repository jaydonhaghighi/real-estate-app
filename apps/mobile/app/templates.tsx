import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useMemo } from 'react';

import { Card } from '../components/card';
import { apiGet, apiPost } from '../lib/api';
import { spacing } from '../lib/theme';
import { TabThemeColors, useTabTheme } from '../lib/tab-theme';

interface Template {
  id: string;
  name: string;
  language: string;
  channel: 'email' | 'sms';
  body: string;
}

export default function TemplateScreen(): JSX.Element {
  const { colors, mode } = useTabTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const [name, setName] = useState('Follow-up');
  const [body, setBody] = useState('Hi, checking in on your availability this week.');

  const templates = useQuery({
    queryKey: ['templates'],
    queryFn: () => apiGet<Template[]>('/team/templates')
  });

  const createTemplate = useMutation({
    mutationFn: () =>
      apiPost('/team/templates', {
        language: 'en',
        channel: 'email',
        name,
        body
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] })
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Template Library</Text>
      <Card tone={mode}>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="Template name"
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          style={[styles.input, styles.largeInput]}
          placeholder="Template body"
          placeholderTextColor={colors.textSecondary}
          multiline
        />
        <Pressable style={styles.button} onPress={() => createTemplate.mutate()}>
          <Text style={styles.buttonText}>Create Template</Text>
        </Pressable>
      </Card>

      {templates.data?.map((template) => (
        <Card key={template.id} tone={mode}>
          <Text style={styles.templateName}>{template.name}</Text>
          <Text style={styles.meta}>
            {template.language} • {template.channel}
          </Text>
          <Text style={styles.body}>{template.body}</Text>
        </Card>
      ))}
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
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
      marginBottom: spacing.md
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      marginBottom: spacing.sm,
      backgroundColor: colors.surfaceMuted,
      color: colors.text
    },
    largeInput: {
      minHeight: 90,
      textAlignVertical: 'top'
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      padding: 10,
      alignItems: 'center'
    },
    buttonText: {
      color: colors.white,
      fontWeight: '700'
    },
    templateName: {
      color: colors.text,
      fontWeight: '700',
      marginBottom: 4
    },
    meta: {
      color: colors.textSecondary,
      marginBottom: 8
    },
    body: {
      color: colors.text
    }
  });
}
