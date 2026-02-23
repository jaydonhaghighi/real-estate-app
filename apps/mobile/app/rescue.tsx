import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Card } from '../components/card';
import { apiGet } from '../lib/api';
import { spacing } from '../lib/theme';
import { TabThemeColors, useTabTheme } from '../lib/tab-theme';

export default function RescueScreen(): JSX.Element {
  const { colors, mode } = useTabTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const dashboard = useQuery({
    queryKey: ['sla-dashboard'],
    queryFn: () => apiGet<Record<string, number>>('/team/sla-dashboard')
  });

  const sequences = useQuery({
    queryKey: ['rescue-sequences'],
    queryFn: () => apiGet<Array<Record<string, unknown>>>('/team/rescue-sequences')
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Stale Rescue</Text>
      <Card tone={mode}>
        <Text style={styles.metric}>Stale Leads: {dashboard.data?.stale_leads ?? '-'}</Text>
        <Text style={styles.metric}>Open Tasks: {dashboard.data?.tasks_due_today ?? '-'}</Text>
      </Card>

      <Card tone={mode}>
        <Text style={styles.sectionTitle}>Rescue Sequences</Text>
        {sequences.data?.map((sequence) => (
          <Text key={String(sequence.id)} style={styles.metric}>
            {String(sequence.name)}
          </Text>
        ))}
      </Card>
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
      marginBottom: spacing.md,
      color: colors.text
    },
    sectionTitle: {
      color: colors.text,
      fontWeight: '700',
      marginBottom: spacing.sm
    },
    metric: {
      fontSize: 15,
      marginBottom: 6,
      color: colors.textSecondary
    }
  });
}
