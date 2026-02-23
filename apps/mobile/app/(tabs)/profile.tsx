import { useMemo } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/card';
import { spacing } from '../../lib/theme';
import { TabThemeColors, useTabTheme } from '../../lib/tab-theme';

const profile = {
  userId: process.env.EXPO_PUBLIC_USER_ID ?? '00000000-0000-0000-0000-000000000001',
  teamId: process.env.EXPO_PUBLIC_TEAM_ID ?? '00000000-0000-0000-0000-000000000010',
  role: process.env.EXPO_PUBLIC_ROLE ?? 'AGENT',
  language: 'en'
};

export default function ProfileScreen(): JSX.Element {
  const { colors, mode, setMode } = useTabTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Profile</Text>
        <Text style={styles.heroSubtitle}>Preferences, shortcuts, and communication tools.</Text>
      </View>

      <Card tone={mode}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <Text style={styles.rowLabel}>Theme</Text>
        <View style={styles.modeSwitch}>
          <Pressable
            style={[styles.modeOption, mode === 'dark' ? styles.modeOptionActive : null]}
            onPress={() => setMode('dark')}
          >
            <Text style={[styles.modeLabel, mode === 'dark' ? styles.modeLabelActive : null]}>Dark</Text>
          </Pressable>
          <Pressable
            style={[styles.modeOption, mode === 'light' ? styles.modeOptionActive : null]}
            onPress={() => setMode('light')}
          >
            <Text style={[styles.modeLabel, mode === 'light' ? styles.modeLabelActive : null]}>Light</Text>
          </Pressable>
        </View>
      </Card>

      <Card tone={mode}>
        <Text style={styles.sectionTitle}>Workspace Identity</Text>
        <Text style={styles.rowLabel}>Role</Text>
        <Text style={styles.rowValue}>{profile.role}</Text>

        <Text style={styles.rowLabel}>Language</Text>
        <Text style={styles.rowValue}>{profile.language}</Text>

        <Text style={styles.rowLabel}>User ID</Text>
        <Text style={styles.code}>{profile.userId}</Text>

        <Text style={styles.rowLabel}>Team ID</Text>
        <Text style={styles.code}>{profile.teamId}</Text>
      </Card>

      <Card tone={mode}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <Link href="/templates" style={styles.actionLink}>
            Templates
          </Link>
          <Link href="/compose" style={styles.actionLink}>
            Compose
          </Link>
          <Link href="/call-outcome" style={styles.actionLink}>
            Call Outcome
          </Link>
          <Link href="/rescue" style={styles.actionLink}>
            Rescue
          </Link>
          <Link href="/mailboxes" style={styles.actionLink}>
            Mailboxes
          </Link>
          <Link href="/settings" style={styles.actionLink}>
            Settings
          </Link>
        </View>
      </Card>

      <Link href="/mailboxes" style={styles.cta}>
        <Text style={styles.ctaText}>Sync Mailboxes</Text>
      </Link>
    </ScrollView>
  );
}

function createStyles(colors: TabThemeColors) {
  return StyleSheet.create({
    container: {
      padding: spacing.lg,
      paddingBottom: 120
    },
    hero: {
      marginBottom: spacing.md
    },
    heroTitle: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '800'
    },
    heroSubtitle: {
      color: colors.textSecondary,
      marginTop: 4
    },
    sectionTitle: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 16,
      marginBottom: spacing.sm
    },
    rowLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      marginTop: spacing.sm
    },
    rowValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700'
    },
    code: {
      color: colors.textSecondary,
      fontFamily: 'Courier',
      fontSize: 12,
      marginTop: 2
    },
    modeSwitch: {
      marginTop: spacing.xs,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 4,
      flexDirection: 'row',
      gap: 6
    },
    modeOption: {
      flex: 1,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center'
    },
    modeOptionActive: {
      backgroundColor: colors.primary
    },
    modeLabel: {
      color: colors.textSecondary,
      fontWeight: '700'
    },
    modeLabelActive: {
      color: colors.white
    },
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm
    },
    actionLink: {
      backgroundColor: colors.cardMuted,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      overflow: 'hidden',
      fontWeight: '700'
    },
    cta: {
      marginTop: spacing.md,
      backgroundColor: colors.primary,
      borderRadius: 14,
      alignItems: 'center',
      paddingVertical: 14,
      overflow: 'hidden'
    },
    ctaText: {
      color: colors.white,
      fontWeight: '800'
    }
  });
}
