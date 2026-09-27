import { StyleSheet, Text, View } from 'react-native';

// Bootstrap placeholder. 실제 화면은 UI Foundation(Design System Playground) 이후 구현한다.
export default function Index() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        달리모
      </Text>
      <Text style={styles.subtitle}>DALLIMO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
  },
});
