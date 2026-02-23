import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/card';
import { apiGet, apiPost } from '../../lib/api';
import { spacing } from '../../lib/theme';
import { TabThemeColors, useTabTheme } from '../../lib/tab-theme';

interface TaskCard {
  id: string;
  lead_id: string;
  due_at: string;
  type: string;
  lead_state: string;
  summary?: string;
  primary_email?: string;
  primary_phone?: string;
}

const SWIPE_ACTION_THRESHOLD = 132;
const SWIPE_MAX_DRAG = 360;
const SWIPE_OUT_DISTANCE = 320;

function formatTaskType(value: string): string {
  return value
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function formatDueDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function getPrimaryContact(task: TaskCard): string {
  return task.primary_email ?? task.primary_phone ?? 'No contact available';
}

function getLeadStateColor(colors: TabThemeColors, state: string): string {
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

interface TaskSwipeCardProps {
  task: TaskCard;
  mode: 'dark' | 'light';
  colors: TabThemeColors;
  styles: ReturnType<typeof createStyles>;
  onDone: (taskId: string) => void;
  onSnooze: (taskId: string) => void;
  onOpenLead: (task: TaskCard) => void;
  onSwipeStart: () => void;
  onSwipeEnd: () => void;
}

function TaskSwipeCard({
  task,
  mode,
  colors,
  styles,
  onDone,
  onSnooze,
  onOpenLead,
  onSwipeStart,
  onSwipeEnd
}: TaskSwipeCardProps): JSX.Element {
  const translateX = useRef(new Animated.Value(0)).current;
  const leadParams: Record<string, string> = {
    id: task.lead_id
  };
  const contact = getPrimaryContact(task);
  const leadStateColor = getLeadStateColor(colors, task.lead_state);
  const contactInitial = contact.charAt(0).toUpperCase();

  if (task.primary_email) {
    leadParams.primary_email = task.primary_email;
  }
  if (task.primary_phone) {
    leadParams.primary_phone = task.primary_phone;
  }
  leadParams.lead_state = task.lead_state;
  leadParams.task_type = task.type;
  leadParams.due_at = task.due_at;
  const leadHref = { pathname: '/lead/[id]' as const, params: leadParams };

  const translateY = translateX.interpolate({
    inputRange: [-SWIPE_MAX_DRAG, 0, SWIPE_MAX_DRAG],
    outputRange: [-8, 0, -8],
    extrapolate: 'clamp'
  });

  const rotateZ = translateX.interpolate({
    inputRange: [-SWIPE_MAX_DRAG, 0, SWIPE_MAX_DRAG],
    outputRange: ['-2.4deg', '0deg', '2.4deg'],
    extrapolate: 'clamp'
  });

  const answerOpacity = translateX.interpolate({
    inputRange: [0, 24, 72, 120],
    outputRange: [0, 0.4, 0.8, 1],
    extrapolate: 'clamp'
  });

  const answerTranslateX = translateX.interpolate({
    inputRange: [0, 120],
    outputRange: [-20, 0],
    extrapolate: 'clamp'
  });

  const snoozeOpacity = translateX.interpolate({
    inputRange: [-120, -72, -24, 0],
    outputRange: [1, 0.8, 0.4, 0],
    extrapolate: 'clamp'
  });

  const snoozeTranslateX = translateX.interpolate({
    inputRange: [-120, 0],
    outputRange: [0, 18],
    extrapolate: 'clamp'
  });

  function resetPosition(): void {
    Animated.spring(translateX, {
      toValue: 0,
      damping: 18,
      stiffness: 170,
      mass: 0.85,
      useNativeDriver: true
    }).start(() => {
      onSwipeEnd();
    });
  }

  function completeSwipe(toValue: number, callback: () => void): void {
    Animated.timing(translateX, {
      toValue,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (!finished) {
        resetPosition();
        return;
      }

      translateX.setValue(0);
      onSwipeEnd();
      callback();
    });
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dx) > 6 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 0.8,
        onPanResponderGrant: () => {
          translateX.stopAnimation();
          onSwipeStart();
        },
        onPanResponderMove: (_event, gestureState) => {
          const clampedX = Math.max(-SWIPE_MAX_DRAG, Math.min(SWIPE_MAX_DRAG, gestureState.dx));
          translateX.setValue(clampedX);
        },
        onPanResponderRelease: (_event, gestureState) => {
          const projectedDx = gestureState.dx;

          if (projectedDx <= -SWIPE_ACTION_THRESHOLD) {
            completeSwipe(-SWIPE_OUT_DISTANCE, () => onSnooze(task.id));
            return;
          }

          if (projectedDx >= SWIPE_ACTION_THRESHOLD) {
            completeSwipe(SWIPE_OUT_DISTANCE, () => onOpenLead(task));
            return;
          }

          resetPosition();
        },
        onPanResponderTerminate: resetPosition,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true
      }),
    [translateX, task, onOpenLead, onSnooze, onSwipeStart, onSwipeEnd]
  );

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.actionsBackdrop} pointerEvents="none">
        <View style={[styles.swipeAction, styles.swipeAnswer]}>
          <Animated.Text style={[styles.swipeActionText, { opacity: answerOpacity, transform: [{ translateX: answerTranslateX }] }]}>
            Answer Lead
          </Animated.Text>
        </View>
        <View style={[styles.swipeAction, styles.swipeSnooze]}>
          <Animated.Text style={[styles.swipeActionText, { opacity: snoozeOpacity, transform: [{ translateX: snoozeTranslateX }] }]}>
            Snooze
          </Animated.Text>
        </View>
      </View>

      <Animated.View
        style={[
          styles.cardMotion,
          {
            transform: [{ translateX }, { translateY }, { rotateZ }]
          }
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable onPress={() => onOpenLead(task)}>
          <Card tone={mode} style={styles.taskCard}>
            <View style={styles.cardHeader}>
              <View style={styles.identityCluster}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarLabel}>{contactInitial}</Text>
                </View>
                <View style={styles.identityTextWrap}>
                  <Text style={styles.contactHeading} numberOfLines={1}>
                    {contact}
                  </Text>
                  <Text style={styles.taskType}>{formatTaskType(task.type)}</Text>
                </View>
              </View>
              <View style={[styles.statePill, { borderColor: leadStateColor, backgroundColor: colors.surfaceMuted }]}>
                <Text style={[styles.statePillText, { color: leadStateColor }]}>{task.lead_state}</Text>
              </View>
            </View>

            <Text style={styles.summary} numberOfLines={3}>
              {task.summary ?? 'No summary yet'}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>Due</Text>
                <Text style={styles.metaChipValue}>{formatDueDate(task.due_at)}</Text>
              </View>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>Lead</Text>
                <Text style={styles.metaChipValue}>#{task.lead_id.slice(0, 8)}</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable style={[styles.button, styles.primary]} onPress={() => onDone(task.id)}>
                <Text style={styles.buttonText}>Done</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.secondary]} onPress={() => onSnooze(task.id)}>
                <Text style={styles.secondaryButtonText}>Snooze</Text>
              </Pressable>
              <Link href={leadHref} style={styles.linkButton}>
                Open
              </Link>
            </View>
          </Card>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default function TaskDeckScreen(): JSX.Element {
  const { colors, mode } = useTabTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeSwipeCount, setActiveSwipeCount] = useState(0);
  const tasks = useQuery({
    queryKey: ['task-deck'],
    queryFn: () => apiGet<TaskCard[]>('/task-deck')
  });

  const doneMutation = useMutation({
    mutationFn: (taskId: string) => apiPost(`/tasks/${taskId}/done`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task-deck'] })
  });

  const snoozeMutation = useMutation({
    mutationFn: (taskId: string) => apiPost(`/tasks/${taskId}/snooze`, { mode: 'tomorrow' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task-deck'] })
  });

  const openCount = tasks.data?.length ?? 0;
  const atRiskCount = tasks.data?.filter((task) => task.lead_state === 'At-Risk').length ?? 0;
  const staleCount = tasks.data?.filter((task) => task.lead_state === 'Stale').length ?? 0;
  const taskDeckErrorMessage =
    tasks.error instanceof Error ? tasks.error.message : tasks.error ? 'Unknown error' : null;
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  function openLead(task: TaskCard): void {
    const params: Record<string, string> = {
      id: task.lead_id,
      lead_state: task.lead_state,
      task_type: task.type,
      due_at: task.due_at
    };
    if (task.primary_email) {
      params.primary_email = task.primary_email;
    }
    if (task.primary_phone) {
      params.primary_phone = task.primary_phone;
    }

    router.push({ pathname: '/lead/[id]', params });
  }

  return (
    <ScrollView contentContainerStyle={styles.container} scrollEnabled={activeSwipeCount === 0}>
      <View style={styles.heroCard}>
        <View style={styles.heroAccent} />
        <View style={styles.heroTop}>
          <Text style={styles.heroEyebrow}>Task Deck</Text>
          <Text style={styles.heroDate}>{todayLabel}</Text>
        </View>
        <Text style={styles.heroTitle}>Execution Queue</Text>
        <Text style={styles.heroSubtitle}>Prioritize follow-up actions and clear the deck with swipe gestures.</Text>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Open</Text>
            <Text style={styles.kpiValue}>{openCount}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>At-Risk</Text>
            <Text style={[styles.kpiValue, { color: colors.warning }]}>{atRiskCount}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Stale</Text>
            <Text style={[styles.kpiValue, { color: '#FF7A7A' }]}>{staleCount}</Text>
          </View>
        </View>

        <View style={styles.swipeGuideRow}>
          <View style={[styles.swipeGuideChip, styles.swipeGuideAnswer]}>
            <Text style={styles.swipeGuideText}>Swipe right: Answer</Text>
          </View>
          <View style={[styles.swipeGuideChip, styles.swipeGuideSnooze]}>
            <Text style={styles.swipeGuideText}>Swipe left: Snooze</Text>
          </View>
        </View>
      </View>

      {tasks.isLoading ? (
        <Card tone={mode}>
          <Text style={styles.loading}>Loading task deck...</Text>
        </Card>
      ) : null}

      {tasks.error ? (
        <Card tone={mode}>
          <Text style={styles.error}>
            Unable to load task deck.
            {taskDeckErrorMessage ? ` (${taskDeckErrorMessage})` : ''}
          </Text>
        </Card>
      ) : null}

      {tasks.data?.map((task) => (
        <TaskSwipeCard
          key={task.id}
          task={task}
          mode={mode}
          colors={colors}
          styles={styles}
          onDone={(taskId) => doneMutation.mutate(taskId)}
          onSnooze={(taskId) => snoozeMutation.mutate(taskId)}
          onOpenLead={openLead}
          onSwipeStart={() => setActiveSwipeCount((count) => count + 1)}
          onSwipeEnd={() => setActiveSwipeCount((count) => Math.max(0, count - 1))}
        />
      ))}

      {!tasks.isLoading && !tasks.error && openCount === 0 ? (
        <Card tone={mode}>
          <Text style={styles.emptyTitle}>Deck cleared</Text>
          <Text style={styles.emptySubtitle}>No open tasks right now. Check back after the next sync.</Text>
        </Card>
      ) : null}
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
    heroEyebrow: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8
    },
    heroDate: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700'
    },
    heroTitle: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '800',
      lineHeight: 34
    },
    heroSubtitle: {
      color: colors.textSecondary,
      marginTop: spacing.xs,
      lineHeight: 20
    },
    kpiRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md
    },
    kpiCard: {
      flex: 1,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm
    },
    kpiLabel: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5
    },
    kpiValue: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
      marginTop: 4
    },
    swipeGuideRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md
    },
    swipeGuideChip: {
      flex: 1,
      borderRadius: 11,
      paddingVertical: 8,
      paddingHorizontal: 10
    },
    swipeGuideAnswer: {
      backgroundColor: colors.accent
    },
    swipeGuideSnooze: {
      backgroundColor: colors.warning
    },
    swipeGuideText: {
      color: colors.white,
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center'
    },
    loading: {
      color: colors.text
    },
    error: {
      color: '#FF8A8A'
    },
    swipeContainer: {
      position: 'relative',
      borderRadius: 18,
      overflow: 'hidden',
      marginBottom: 12
    },
    actionsBackdrop: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row'
    },
    cardMotion: {
      borderRadius: 18
    },
    taskCard: {
      marginBottom: 0
    },
    swipeAction: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg
    },
    swipeAnswer: {
      backgroundColor: colors.accent,
      alignItems: 'flex-start'
    },
    swipeSnooze: {
      backgroundColor: colors.warning,
      alignItems: 'flex-end'
    },
    swipeActionText: {
      color: colors.white,
      fontWeight: '800',
      fontSize: 13
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    },
    identityCluster: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: spacing.sm
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 999,
      backgroundColor: colors.cardMuted,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm
    },
    avatarLabel: {
      color: colors.text,
      fontWeight: '800'
    },
    identityTextWrap: {
      flex: 1
    },
    contactHeading: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800'
    },
    taskType: {
      color: colors.textSecondary,
      marginTop: 2,
      fontSize: 12,
      fontWeight: '700'
    },
    statePill: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 5
    },
    statePillText: {
      fontSize: 11,
      fontWeight: '800'
    },
    summary: {
      color: colors.text,
      marginTop: spacing.sm,
      fontSize: 15,
      lineHeight: 22
    },
    metaRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md
    },
    metaChip: {
      flex: 1,
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    metaChipLabel: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4
    },
    metaChipValue: {
      color: colors.text,
      marginTop: 3,
      fontSize: 12,
      fontWeight: '700'
    },
    actions: {
      marginTop: spacing.md,
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center'
    },
    button: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10
    },
    primary: {
      backgroundColor: colors.primary
    },
    secondary: {
      backgroundColor: colors.cardMuted
    },
    buttonText: {
      color: colors.white,
      fontWeight: '700'
    },
    secondaryButtonText: {
      color: colors.text,
      fontWeight: '700'
    },
    linkButton: {
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      overflow: 'hidden',
      fontWeight: '700'
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800'
    },
    emptySubtitle: {
      color: colors.textSecondary,
      marginTop: spacing.xs,
      lineHeight: 20
    }
  });
}
