// 블루투스 심박 센서 (modules/dallimo-heart, 결정 로그 80항).
// 화면을 끈 채 달려도 센서 심박을 받으려면 bluetooth-central 백그라운드 모드가 필요하다.
// UIBackgroundModes는 expo-location(location) · expo-notifications도 넣는 배열이라 덮어쓰지 않고 더한다.
const { withInfoPlist } = require('expo/config-plugins');

module.exports = function withHeartSensor(config, { bluetoothPermission } = {}) {
  if (!bluetoothPermission) {
    throw new Error('with-heart-sensor: `bluetoothPermission` option is required.');
  }

  return withInfoPlist(config, (config) => {
    config.modResults.NSBluetoothAlwaysUsageDescription = bluetoothPermission;
    if (!Array.isArray(config.modResults.UIBackgroundModes)) {
      config.modResults.UIBackgroundModes = [];
    }
    if (!config.modResults.UIBackgroundModes.includes('bluetooth-central')) {
      config.modResults.UIBackgroundModes.push('bluetooth-central');
    }
    return config;
  });
};
