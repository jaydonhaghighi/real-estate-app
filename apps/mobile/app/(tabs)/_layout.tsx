import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useTabTheme } from '../../lib/tab-theme';

export default function TabsLayout(): JSX.Element {
  const { colors } = useTabTheme();

  return (
    <Tabs
      initialRouteName="task-deck"
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitle: '',
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 6,
          paddingBottom: 14
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
          letterSpacing: 0.4,
          textTransform: 'uppercase'
        },
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === 'task-deck'
              ? 'layers'
              : route.name === 'leads'
                ? 'users'
                : route.name === 'metrics'
                  ? 'bar-chart-2'
                  : 'user';
          return <Feather name={iconName} size={(size ?? 18) - 4} color={color} />;
        }
      })}
    >
      <Tabs.Screen name="task-deck" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="leads" options={{ title: 'Leads' }} />
      <Tabs.Screen name="metrics" options={{ title: 'Metrics' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
