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
