import { useSignUp } from '@clerk/clerk-expo';
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
  onSwitchToSignIn: () => void;
}

export function SignUpScreen({ onSwitchToSignIn }: Props): JSX.Element {
  const { colors } = useTabTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signUp, setActive, isLoaded } = useSignUp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSignUp = useCallback(async () => {
    if (!isLoaded) return;
    setError('');
    setLoading(true);

    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'errors' in err
          ? (err as { errors: { longMessage?: string }[] }).errors[0]?.longMessage
          : undefined;
      setError(msg ?? 'Sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isLoaded, signUp, email, password]);

  const onVerify = useCallback(async () => {
    if (!isLoaded) return;
    setError('');
    setLoading(true);

    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });

      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
      } else {
        setError('Verification incomplete. Please try again.');
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'errors' in err
          ? (err as { errors: { longMessage?: string }[] }).errors[0]?.longMessage
          : undefined;
      setError(msg ?? 'Verification failed. Check your code and try again.');
    } finally {
      setLoading(false);
    }
  }, [isLoaded, signUp, setActive, code]);

  if (pendingVerification) {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We sent a verification code to {email}
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="Enter 6-digit code"
              placeholderTextColor={colors.tabInactive}
              keyboardType="number-pad"
              autoComplete="one-time-code"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.button, (!code || loading) && styles.buttonDisabled]}
              onPress={onVerify}
              disabled={!code || loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Verify Email</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const disabled = !email || !password || loading;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Get started with your team</Text>
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
            placeholder="Create a password"
            placeholderTextColor={colors.tabInactive}
            secureTextEntry
            autoComplete="new-password"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, disabled && styles.buttonDisabled]}
            onPress={onSignUp}
            disabled={disabled}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={onSwitchToSignIn}>
            <Text style={styles.footerLink}>Sign In</Text>
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
