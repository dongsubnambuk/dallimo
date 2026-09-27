import { Tabs } from 'expo-router';

import { AppIcon, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily } from '@/design/tokens';

// 65장 정보 구조 최종안: 하단 탭 4개 (Explore / Run / Together / My). 탭 구조는 임의로 바꾸지 않는다 (115.1장).
const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: '탐색', icon: 'tabExplore' },
  { name: 'run', title: '달리기', icon: 'tabRun' },
  { name: 'together', title: '함께', icon: 'tabTogether' },
  { name: 'my', title: '마이', icon: 'tabMy' },
];

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.action.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarLabelStyle: { fontFamily: fontFamily.medium },
        tabBarStyle: { backgroundColor: colors.bg.surface, borderTopColor: colors.border.subtle },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{ title: t.title, tabBarIcon: ({ color }) => <AppIcon name={t.icon} size={22} color={color} /> }}
        />
      ))}
    </Tabs>
  );
}
