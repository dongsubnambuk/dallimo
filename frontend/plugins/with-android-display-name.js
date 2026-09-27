// Android launcher label을 expo.name(DALLIMO)과 분리해 사용자 노출 이름(달리모)으로 설정한다.
// iOS는 app.json의 ios.infoPlist.CFBundleDisplayName으로 처리한다.
const { AndroidConfig, withStringsXml } = require('expo/config-plugins');

module.exports = function withAndroidDisplayName(config, { displayName } = {}) {
  if (!displayName) {
    throw new Error('with-android-display-name: `displayName` option is required.');
  }

  return withStringsXml(config, (config) => {
    config.modResults = AndroidConfig.Strings.setStringItem(
      [AndroidConfig.Resources.buildResourceItem({ name: 'app_name', value: displayName })],
      config.modResults,
    );
    return config;
  });
};
