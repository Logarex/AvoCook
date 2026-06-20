const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withAndroidLint(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = config.modResults.contents.replace(
        /android\s*\{/,
        `android {
    lint {
        checkReleaseBuilds false
        abortOnError false
    }`
      );
    }
    return config;
  });
};
