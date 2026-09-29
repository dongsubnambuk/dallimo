import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';

import { AppIcon, type IconName } from '@/design/primitives';
import { darkTheme, useTheme } from '@/design/theme';
import { fontFamily } from '@/design/tokens';
import { useRunRecovery } from '@/features/run/useRunRecovery';
import { useOpenPendingShareLink } from '@/features/share/usePendingShareLink';

// 65장 정보 구조 최종안: 하단 탭 4개 (Explore / Run / Together / My). 탭 구조는 임의로 바꾸지 않는다 (115.1장).
const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: '탐색', icon: 'tabExplore' },
  { name: 'run', title: '달리기', icon: 'tabRun' },
  { name: 'together', title: '함께', icon: 'tabTogether' },
  { name: 'my', title: '마이', icon: 'tabMy' },
];

export default function TabsLayout() {
  const { colors } = useTheme();
  // 로그인한 뒤 탭이 처음 뜰 때, 앱이 꺼지기 전 달리던 기록이 있으면 이어서 기록한다
  useRunRecovery();
  // 로그인 전에 연 공유 · 초대 링크를 이어서 연다
  useOpenPendingShareLink();
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
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused }) => <TabIcon name={t.icon} color={color} focused={focused} />,
            // 달리기 탭은 러닝 컨텍스트(dark)라 탭 바도 어둡게 맞춘다 (110.1장, FOUNDATION-DECISION-LOG 14항)
            ...(t.name === 'run' ? darkTabBar : null),
          }}
        />
      ))}
    </Tabs>
  );
}

const dark = darkTheme.colors;
const darkTabBar = {
  tabBarActiveTintColor: dark.text.primary,
  tabBarInactiveTintColor: dark.text.secondary,
  tabBarStyle: { backgroundColor: dark.bg.canvas, borderTopColor: dark.border.subtle },
};

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
            borderColor: color,
          }}
        />
      ) : null}
    </View>
  );
}
