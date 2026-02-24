import { ClerkLoaded, ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthGate } from '../components/auth-gate';
import { setTokenProvider } from '../lib/api';
import { TabThemeProvider, useTabTheme } from '../lib/tab-theme';

const queryClient = new QueryClient();

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

export default function Layout(): JSX.Element {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>
          <QueryClientProvider client={queryClient}>
            <TabThemeProvider>
              <AuthGate>
                <TokenSync />
                <RootStack />
              </AuthGate>
            </TabThemeProvider>
          </QueryClientProvider>
        </ClerkLoaded>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

function TokenSync(): null {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenProvider(() => getToken());
  }, [getToken]);

  return null;
}

function RootStack(): JSX.Element {
  const { colors } = useTabTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitle: '',
        headerBackTitle: '',
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="lead/[id]" />
      <Stack.Screen name="templates" />
      <Stack.Screen name="compose" />
      <Stack.Screen name="mailboxes" />
      <Stack.Screen name="call-outcome" />
      <Stack.Screen name="rescue" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
});
