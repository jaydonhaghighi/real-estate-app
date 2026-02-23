import { Tabs } from 'expo-router';

import { useTabTheme } from '../../lib/tab-theme';

export default function TabsLayout(): JSX.Element {
  const { colors } = useTabTheme();

  return (
    <Tabs
      initialRouteName="task-deck"
      screenOptions={() => ({
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 74,
          paddingTop: 8,
          paddingBottom: 12
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700'
        }
      })}
    >
      <Tabs.Screen name="task-deck" options={{ title: 'Task Deck' }} />
      <Tabs.Screen name="leads" options={{ title: 'Leads' }} />
      <Tabs.Screen name="metrics" options={{ title: 'Metrics' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
