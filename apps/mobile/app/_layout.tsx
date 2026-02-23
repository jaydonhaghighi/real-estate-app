import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { TabThemeProvider, useTabTheme } from '../lib/tab-theme';

const queryClient = new QueryClient();

export default function Layout(): JSX.Element {
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <TabThemeProvider>
          <RootStack />
        </TabThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function RootStack(): JSX.Element {
  const { colors } = useTabTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="lead/[id]" options={{ title: 'Lead Thread' }} />
      <Stack.Screen name="templates" options={{ title: 'Templates' }} />
      <Stack.Screen name="compose" options={{ title: 'Compose' }} />
      <Stack.Screen name="mailboxes" options={{ title: 'Mailboxes' }} />
      <Stack.Screen name="call-outcome" options={{ title: 'Call Outcome' }} />
      <Stack.Screen name="rescue" options={{ title: 'Rescue' }} />
      <Stack.Screen name="settings" options={{ title: 'Profile Settings' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
});
