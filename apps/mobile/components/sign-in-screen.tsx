import { useSignIn } from '@clerk/clerk-expo';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TabThemeColors, useTabTheme } from '../lib/tab-theme';

interface Props {
  onSwitchToSignUp: () => void;
}

export function SignInScreen({ onSwitchToSignUp }: Props): JSX.Element {
  const { colors } = useTabTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signIn, setActive, isLoaded } = useSignIn();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onPress = useCallback(async () => {
    if (!isLoaded) return;
    setError('');
    setLoading(true);

    try {
      const attempt = await signIn.create({ identifier: email, password });

      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
      } else {
        setError('Sign-in incomplete. Please try again.');
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'errors' in err
          ? (err as { errors: { longMessage?: string }[] }).errors[0]?.longMessage
          : undefined;
      setError(msg ?? 'Sign-in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }, [isLoaded, signIn, setActive, email, password]);

  const disabled = !email || !password || loading;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            placeholderTextColor={colors.tabInactive}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor={colors.tabInactive}
            secureTextEntry
            autoComplete="password"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, disabled && styles.buttonDisabled]}
            onPress={onPress}
            disabled={disabled}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <Pressable onPress={onSwitchToSignUp}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: TabThemeColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background
    },
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24
    },
    header: {
      marginBottom: 32
    },
    title: {
      color: colors.text,
      fontSize: 32,
      fontWeight: '800'
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 16,
      marginTop: 6
    },
    form: {
      gap: 8
    },
    label: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 8
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: colors.text
    },
    error: {
      color: '#FF6B6B',
      fontSize: 13,
      marginTop: 4
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 16
    },
    buttonDisabled: {
      opacity: 0.5
    },
    buttonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '700'
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 24
    },
    footerText: {
      color: colors.textSecondary,
      fontSize: 14
    },
    footerLink: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '700'
    }
  });
}
