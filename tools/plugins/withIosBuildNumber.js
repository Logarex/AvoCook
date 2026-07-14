const { withXcodeProject } = require('expo/config-plugins');

module.exports = function withIosBuildNumber(config) {
  return withXcodeProject(config, (config) => {
    const buildNumber = config.ios?.buildNumber || "1";
    const xcodeProject = config.modResults;
    xcodeProject.addBuildProperty('CURRENT_PROJECT_VERSION', buildNumber);
    return config;
  });
};
