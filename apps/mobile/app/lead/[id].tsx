import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

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

function normalizeParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not set';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Not set';
  return (
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' \u00B7 ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  );
}

function relativeTime(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 0) return 'Just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function humanizeToken(value: string | undefined): string {
  if (!value) return 'Unknown';
  return value
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(' ');
}

function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local
    .replace(/[._+]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function getStateColor(colors: TabThemeColors, state: string): string {
  if (state === 'Active') return colors.accent;
  if (state === 'At-Risk') return colors.warning;
  if (state === 'Stale') return '#FF7A7A';
  return colors.primary;
}

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const FIELD_ICONS: Record<string, FeatherName> = {
  budget: 'dollar-sign',
  price: 'dollar-sign',
  price_range: 'dollar-sign',
  area: 'map-pin',
  location: 'map-pin',
  neighborhood: 'map-pin',
  bedrooms: 'home',
  beds: 'home',
  rooms: 'home',
  timeline: 'calendar',
  timeframe: 'calendar',
  move_date: 'calendar',
  move_in: 'calendar',
};

function getFieldIcon(key: string): FeatherName {
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(FIELD_ICONS)) {
    if (lower.includes(k)) return v;
  }
  return 'info';
}

interface FieldItem {
  key: string;
  label: string;
  value: string;
  icon: FeatherName;
}

function extractFields(fields: Record<string, unknown> | undefined): FieldItem[] {
  if (!fields || typeof fields !== 'object') return [];
  return Object.entries(fields)
    .slice(0, 4)
    .map(([key, value]) => ({
      key,
      label: humanizeToken(key).toUpperCase(),
      value:
        typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : Array.isArray(value)
            ? value.join(', ')
            : '\u2014',
      icon: getFieldIcon(key),
    }));
}

const CHANNEL_LABEL: Record<string, string> = {
  email: 'Email',
  sms: 'SMS',
  call: 'Call',
  note: 'Note',
  system: 'System',
};

const CHANNEL_ICON: Record<string, FeatherName> = {
  email: 'mail',
  sms: 'message-square',
  call: 'phone',
  note: 'edit-3',
  system: 'settings',
};

export default function LeadScreen(): JSX.Element {
  const { colors, mode } = useTabTheme();
  const s = useMemo(() => createStyles(colors, mode), [colors, mode]);
  const router = useRouter();

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
    enabled: Boolean(leadId),
  });

  const metadata = useQuery({
    queryKey: ['lead', leadId, 'metadata'],
    queryFn: () => apiGet<EventMetadata[]>(`/leads/${leadId}/events/metadata`),
    enabled: Boolean(leadId),
  });

  const displayState = derived.data?.state ?? routeLeadState ?? 'Unknown';
  const stateColor = getStateColor(colors, displayState);
  const summaryText = derived.data?.summary ?? 'No summary generated yet.';
  const fields = extractFields(derived.data?.fields_json);
  const lastTouchRel = relativeTime(derived.data?.last_touch_at);
  const nextActionText = routeTaskType
    ? humanizeToken(routeTaskType) + (routeDueAt ? ` \u00B7 Due ${formatDateTime(routeDueAt)}` : '')
    : derived.data?.next_action_at
      ? `Follow up \u00B7 ${formatDateTime(derived.data.next_action_at)}`
      : null;
  const timelineEvents = metadata.data?.slice(0, 12) ?? [];

  const composeHref = leadId
    ? { pathname: '/compose' as const, params: { lead_id: leadId } }
    : '/compose';

  const leadLoadError = derived.error instanceof Error ? derived.error.message : null;
  const metadataLoadError = metadata.error instanceof Error ? metadata.error.message : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerBackTitle: '',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Feather name="chevron-left" size={28} color={colors.text} />
            </Pressable>
          ),
          headerRight: () => (
            <View style={[s.headerBadge, { borderColor: stateColor }]}>
              <Text style={[s.headerBadgeText, { color: stateColor }]}>{displayState}</Text>
            </View>
          ),
        }}
      />

      <ScrollView contentContainerStyle={s.container}>
        {/* Client Memory Panel */}
        <View style={s.memoryCard}>
          <View style={s.memoryHeader}>
            <Feather name="cpu" size={14} color={colors.warning} />
            <Text style={s.memoryTitle}>CLIENT MEMORY</Text>
          </View>

          <Text style={s.memorySummary}>{summaryText}</Text>

          {fields.length > 0 && (
            <View style={s.fieldsGrid}>
              {fields.map((f) => (
                <View key={f.key} style={s.fieldCell}>
                  <Feather name={f.icon} size={14} color={colors.textSecondary} />
                  <View>
                    <Text style={s.fieldLabel}>{f.label}</Text>
                    <Text style={s.fieldValue}>{f.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={s.lastTouchRow}>
            <Feather name="clock" size={12} color={colors.textSecondary} />
            <Text style={s.lastTouchText}>Last touch: {lastTouchRel}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={s.actionsRow}>
          <Pressable style={[s.actionBtn, s.actionEmail]} onPress={() => router.push(composeHref)}>
            <Feather name="mail" size={16} color={colors.primary} />
            <Text style={s.actionEmailText}>Email</Text>
          </Pressable>
          <Pressable style={[s.actionBtn, s.actionCall]} onPress={() => router.push('/call-outcome')}>
            <Feather name="phone" size={16} color={colors.accent} />
            <Text style={s.actionCallText}>Call</Text>
          </Pressable>
          <Pressable style={[s.actionBtn, s.actionSchedule]}>
            <Feather name="clock" size={16} color={colors.textSecondary} />
            <Text style={s.actionScheduleText}>Schedule</Text>
          </Pressable>
        </View>

        {/* Next Action */}
        {nextActionText && (
          <View style={s.nextActionCard}>
            <Text style={s.nextActionEyebrow}>NEXT ACTION</Text>
            <Text style={s.nextActionText}>{nextActionText}</Text>
          </View>
        )}

        {/* Timeline */}
        <Text style={s.timelineSectionTitle}>TIMELINE</Text>

        {(derived.isLoading || metadata.isLoading) && (
          <View style={s.statusCard}>
            <Text style={s.statusText}>Loading...</Text>
          </View>
        )}

        {leadLoadError && (
          <View style={s.statusCard}>
            <Text style={s.errText}>Unable to load profile ({leadLoadError})</Text>
          </View>
        )}
        {metadataLoadError && (
          <View style={s.statusCard}>
            <Text style={s.errText}>Unable to load timeline ({metadataLoadError})</Text>
          </View>
        )}

        {timelineEvents.length === 0 && !metadata.isLoading && !metadata.error && (
          <View style={s.statusCard}>
            <Text style={s.statusText}>No timeline events recorded yet.</Text>
          </View>
        )}

        {timelineEvents.map((ev) => {
          const isInbound = ev.direction === 'inbound';
          const channelLabel = CHANNEL_LABEL[ev.channel] ?? humanizeToken(ev.channel);
          const channelIcon: FeatherName = CHANNEL_ICON[ev.channel] ?? 'activity';
          const iconBg = isInbound ? colors.primary + '1A' : colors.surfaceMuted;
          const iconColor = isInbound ? colors.primary : colors.textSecondary;
          const arrowIcon: FeatherName = isInbound ? 'arrow-down-left' : 'arrow-up-right';
          const arrowColor = isInbound ? colors.primary : colors.textSecondary;

          return (
            <View key={ev.id} style={s.eventCard}>
              <View style={s.eventHeader}>
                <View style={[s.eventIconBox, { backgroundColor: iconBg }]}>
                  <Feather name={channelIcon} size={13} color={iconColor} />
                </View>
                <Text style={s.eventChannel}>{channelLabel}</Text>
                <Feather name={arrowIcon} size={12} color={arrowColor} style={s.eventArrow} />
                <Text style={s.eventTime}>{formatDateTime(ev.created_at)}</Text>
              </View>
              <Text style={s.eventBody}>
                {humanizeToken(ev.type)} {isInbound ? 'received from lead' : 'sent to lead'}
              </Text>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   Styles
   ──────────────────────────────────────────────────────────── */

function createStyles(colors: TabThemeColors, mode: 'dark' | 'light') {
  const cardBg = mode === 'dark' ? '#101A2E' : '#F7F9FC';
  const cardBorder = mode === 'dark' ? '#213452' : '#D4DEEE';
  const elevatedBg = mode === 'dark' ? '#131E34' : '#FFFFFF';

  return StyleSheet.create({
    headerBadge: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: colors.surfaceMuted,
    },
    headerBadgeText: {
      fontSize: 12,
      fontWeight: '700',
    },

    container: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: 120,
    },

    /* Client Memory */
    memoryCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: cardBorder,
      backgroundColor: elevatedBg,
      padding: 16,
      marginBottom: spacing.md,
      shadowColor: '#040915',
      shadowOpacity: 0.12,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 3 },
      elevation: 5,
    },
    memoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
    },
    memoryTitle: {
      color: colors.warning,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
    },
    memorySummary: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
      marginBottom: 12,
    },
    fieldsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    fieldCell: {
      width: '47%' as unknown as number,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    fieldLabel: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    fieldValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 1,
    },
    lastTouchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderTopWidth: 1,
      borderTopColor: cardBorder,
      paddingTop: 10,
    },
    lastTouchText: {
      color: colors.textSecondary,
      fontSize: 12,
    },

    /* Quick Actions */
    actionsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: spacing.md,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1,
      overflow: 'hidden',
    },
    actionEmail: {
      backgroundColor: colors.primary + '1A',
      borderColor: colors.primary + '33',
    },
    actionEmailText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    actionCall: {
      backgroundColor: colors.accent + '1A',
      borderColor: colors.accent + '33',
    },
    actionCallText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '600',
    },
    actionSchedule: {
      backgroundColor: colors.surfaceMuted,
      borderColor: cardBorder,
    },
    actionScheduleText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },

    /* Next Action */
    nextActionCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: cardBorder,
      backgroundColor: cardBg,
      padding: 14,
      marginBottom: spacing.md,
    },
    nextActionEyebrow: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    nextActionText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },

    /* Timeline */
    timelineSectionTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 1,
      marginBottom: 10,
    },
    eventCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: cardBorder,
      backgroundColor: cardBg,
      padding: 14,
      marginBottom: 10,
    },
    eventHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    eventIconBox: {
      width: 26,
      height: 26,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    eventChannel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    eventArrow: {
      marginLeft: 4,
    },
    eventTime: {
      color: colors.textSecondary,
      fontSize: 11,
      marginLeft: 'auto',
    },
    eventBody: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },

    statusCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: cardBorder,
      backgroundColor: cardBg,
      padding: 14,
      marginBottom: 10,
    },
    statusText: {
      color: colors.textSecondary,
    },
    errText: {
      color: '#FF8A8A',
    },
  });
}
