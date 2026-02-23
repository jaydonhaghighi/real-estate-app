import { useLocalSearchParams, Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/card';
import { apiGet } from '../../lib/api';
import { spacing } from '../../lib/theme';
import { TabThemeColors, useTabTheme } from '../../lib/tab-theme';

interface LeadDerivedProfile {
  lead_id: string;
  summary: string;
  language: string;
  fields_json: Record<string, unknown>;
  metrics_json: Record<string, unknown>;
  updated_at: string;
  state: string;
  last_touch_at: string | null;
  next_action_at: string | null;
}

interface EventMetadata {
  id: string;
  channel: string;
  type: string;
  direction: string;
  created_at: string;
}

interface KeyValueRow {
  label: string;
  value: string;
}

function normalizeParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'Not set';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Not set';
  }

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function humanizeToken(value: string | undefined): string {
  if (!value) {
    return 'Unknown';
  }

  return value
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function getStateColor(colors: TabThemeColors, state: string): string {
  if (state === 'Active') {
    return colors.accent;
  }
  if (state === 'At-Risk') {
    return colors.warning;
  }
  if (state === 'Stale') {
    return '#FF7A7A';
  }
  return colors.primary;
}

function extractLeadHighlights(fields: Record<string, unknown> | undefined): KeyValueRow[] {
  if (!fields || typeof fields !== 'object') {
    return [];
  }

  return Object.entries(fields)
    .slice(0, 4)
    .map(([key, value]) => {
      const label = humanizeToken(key);
      const formattedValue =
        typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : Array.isArray(value)
            ? `${value.length} values`
            : value && typeof value === 'object'
              ? 'Structured'
              : 'Unavailable';

      return { label, value: formattedValue };
    });
}

export default function LeadScreen(): JSX.Element {
  const { colors, mode } = useTabTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const params = useLocalSearchParams<{
    id: string;
    primary_email?: string;
    primary_phone?: string;
    lead_state?: string;
    task_type?: string;
    due_at?: string;
  }>();

  const leadId = normalizeParam(params.id);
  const primaryEmail = normalizeParam(params.primary_email);
  const primaryPhone = normalizeParam(params.primary_phone);
  const routeLeadState = normalizeParam(params.lead_state);
  const routeTaskType = normalizeParam(params.task_type);
  const routeDueAt = normalizeParam(params.due_at);

  const derived = useQuery({
    queryKey: ['lead', leadId, 'derived'],
    queryFn: () => apiGet<LeadDerivedProfile>(`/leads/${leadId}/derived`),
    enabled: Boolean(leadId)
  });

  const metadata = useQuery({
    queryKey: ['lead', leadId, 'metadata'],
    queryFn: () => apiGet<EventMetadata[]>(`/leads/${leadId}/events/metadata`),
    enabled: Boolean(leadId)
  });

  const displayState = derived.data?.state ?? routeLeadState ?? 'Unknown';
  const summaryText = derived.data?.summary ?? 'No summary generated yet.';
  const leadHeadline = primaryEmail ?? primaryPhone ?? 'Client Lead';
  const stateColor = getStateColor(colors, displayState);
  const timelineEvents = metadata.data?.slice(0, 8) ?? [];
  const eventCount = metadata.data?.length ?? 0;
  const lastActivity = timelineEvents[0]?.created_at;
  const leadLoadError = derived.error instanceof Error ? derived.error.message : null;
  const metadataLoadError = metadata.error instanceof Error ? metadata.error.message : null;
  const highlightRows = extractLeadHighlights(derived.data?.fields_json);
  const composeHref = leadId
    ? { pathname: '/compose' as const, params: { lead_id: leadId } }
    : '/compose';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroAccent} />
        <View style={styles.heroTop}>
          <Text style={styles.eyebrow}>Lead Brief</Text>
          <View style={[styles.statePill, { borderColor: stateColor, backgroundColor: colors.surfaceMuted }]}>
            <Text style={[styles.stateText, { color: stateColor }]}>{displayState}</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>{leadHeadline}</Text>
        <Text style={styles.heroSubtitle}>Summary-first context for quick, high-quality follow-up.</Text>

        <View style={styles.chips}>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Task</Text>
            <Text style={styles.chipValue}>{humanizeToken(routeTaskType)}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Events</Text>
            <Text style={styles.chipValue}>{eventCount}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Language</Text>
            <Text style={styles.chipValue}>{derived.data?.language ?? 'Unknown'}</Text>
          </View>
        </View>

        <View style={styles.heroActions}>
          <Link href={composeHref} style={[styles.actionButton, styles.actionPrimary]}>
            Message
          </Link>
          <Link href="/call-outcome" style={[styles.actionButton, styles.actionSecondary]}>
            Log Call
          </Link>
        </View>
      </View>

      <Card tone={mode} style={styles.summaryCard}>
        <Text style={styles.sectionEyebrow}>AI Summary</Text>
        <Text style={styles.summaryText}>{summaryText}</Text>
        <Text style={styles.summaryMeta}>Updated {formatDateTime(derived.data?.updated_at)}</Text>
      </Card>

      <View style={styles.twoColumnRow}>
        <Card tone={mode} style={styles.halfCard}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.infoLabel}>Primary Email</Text>
          <Text style={styles.infoValue}>{primaryEmail ?? 'Unavailable'}</Text>

          <Text style={styles.infoLabel}>Primary Phone</Text>
          <Text style={styles.infoValue}>{primaryPhone ?? 'Unavailable'}</Text>
        </Card>

        <Card tone={mode} style={styles.halfCard}>
          <Text style={styles.sectionTitle}>Timing</Text>
          <Text style={styles.infoLabel}>Task Due</Text>
          <Text style={styles.infoValue}>{formatDateTime(routeDueAt)}</Text>

          <Text style={styles.infoLabel}>Next Action</Text>
          <Text style={styles.infoValue}>{formatDateTime(derived.data?.next_action_at)}</Text>

          <Text style={styles.infoLabel}>Last Touch</Text>
          <Text style={styles.infoValue}>{formatDateTime(derived.data?.last_touch_at)}</Text>
        </Card>
      </View>

      {highlightRows.length > 0 ? (
        <Card tone={mode}>
          <Text style={styles.sectionTitle}>Lead Highlights</Text>
          {highlightRows.map((row) => (
            <View key={row.label} style={styles.highlightRow}>
              <Text style={styles.highlightLabel}>{row.label}</Text>
              <Text style={styles.highlightValue}>{row.value}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Card tone={mode} style={styles.timelineCard}>
        <View style={styles.timelineHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Text style={styles.timelineMeta}>{eventCount} items</Text>
        </View>

        <Text style={styles.timelineMeta}>Last activity {formatDateTime(lastActivity)}</Text>

        {timelineEvents.length === 0 ? (
          <Text style={styles.emptyText}>No timeline events recorded yet.</Text>
        ) : (
          timelineEvents.map((event) => (
            <View key={event.id} style={styles.timelineRow}>
              <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
              <View style={styles.timelineTextWrap}>
                <Text style={styles.timelineTop}>
                  {humanizeToken(event.channel)} · {humanizeToken(event.direction)}
                </Text>
                <Text style={styles.timelineBottom}>
                  {humanizeToken(event.type)} · {formatDateTime(event.created_at)}
                </Text>
              </View>
            </View>
          ))
        )}
      </Card>

      {derived.isLoading || metadata.isLoading ? <Text style={styles.loading}>Loading lead summary...</Text> : null}
      {leadLoadError ? <Text style={styles.error}>Unable to load derived profile ({leadLoadError})</Text> : null}
      {metadataLoadError ? <Text style={styles.error}>Unable to load timeline metadata ({metadataLoadError})</Text> : null}
    </ScrollView>
  );
}

function createStyles(colors: TabThemeColors) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: 120
    },
    heroCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: spacing.lg,
      marginBottom: spacing.md,
      position: 'relative',
      overflow: 'hidden'
    },
    heroAccent: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 4,
      backgroundColor: colors.primary
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm
    },
    eyebrow: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8
    },
    statePill: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 5
    },
    stateText: {
      fontSize: 12,
      fontWeight: '800'
    },
    heroTitle: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '800',
      lineHeight: 34
    },
    heroSubtitle: {
      color: colors.textSecondary,
      marginTop: spacing.xs,
      lineHeight: 20
    },
    chips: {
      marginTop: spacing.md,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs
    },
    chip: {
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 10,
      minWidth: 94
    },
    chipLabel: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4
    },
    chipValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 2
    },
    heroActions: {
      marginTop: spacing.md,
      flexDirection: 'row',
      gap: spacing.sm
    },
    actionButton: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      textAlign: 'center',
      fontWeight: '800',
      overflow: 'hidden'
    },
    actionPrimary: {
      backgroundColor: colors.primary,
      color: colors.white
    },
    actionSecondary: {
      backgroundColor: colors.cardMuted,
      color: colors.text
    },
    summaryCard: {
      marginBottom: spacing.md
    },
    sectionEyebrow: {
      color: colors.textSecondary,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontWeight: '700',
      marginBottom: spacing.xs
    },
    summaryText: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 23,
      fontWeight: '500'
    },
    summaryMeta: {
      color: colors.textSecondary,
      marginTop: spacing.sm,
      fontSize: 12
    },
    twoColumnRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.xs
    },
    halfCard: {
      flex: 1
    },
    sectionTitle: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 16,
      marginBottom: spacing.sm
    },
    infoLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: spacing.xs,
      marginBottom: 2,
      fontWeight: '700'
    },
    infoValue: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20
    },
    highlightRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.sm,
      marginTop: spacing.sm
    },
    highlightLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontWeight: '700'
    },
    highlightValue: {
      color: colors.text,
      marginTop: 4,
      fontSize: 14
    },
    timelineCard: {
      marginBottom: spacing.xs
    },
    timelineHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline'
    },
    timelineMeta: {
      color: colors.textSecondary,
      fontSize: 12,
      marginBottom: spacing.sm
    },
    emptyText: {
      color: colors.textSecondary
    },
    timelineRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.sm
    },
    timelineDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      marginTop: 6,
      marginRight: spacing.sm
    },
    timelineTextWrap: {
      flex: 1
    },
    timelineTop: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 13
    },
    timelineBottom: {
      color: colors.textSecondary,
      marginTop: 2,
      fontSize: 12
    },
    loading: {
      color: colors.text,
      marginTop: spacing.sm
    },
    error: {
      color: '#FF8A8A',
      marginTop: spacing.xs
    }
  });
}
