import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';

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
        tabBarActiveTintColor: colors.text.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarLabelStyle: { fontFamily: fontFamily.bold, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.bg.elevated, borderTopColor: colors.border.subtle },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{ title: t.title, tabBarIcon: ({ color, focused }) => <TabIcon name={t.icon} color={color} focused={focused} /> }}
        />
      ))}
    </Tabs>
  );
}

// 선택된 탭 아이콘 오른쪽 위에 민트 출발점을 찍는다 (브랜드 심볼 "모"의 출발점 모티프, FOUNDATION-DECISION-LOG 11항).
function TabIcon({ name, color, focused }: { name: IconName; color: ColorValue; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View>
      <AppIcon name={name} size={22} color={color} />
      {focused ? (
        <View
          style={{
            position: 'absolute',
            top: -3,
            right: -5,
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: colors.action.primary,
            borderWidth: 2,
            borderColor: colors.text.primary,
          }}
        />
      ) : null}
    </View>
  );
}
