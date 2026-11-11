const fs = require('fs');
const path = require('path');
const { IOSConfig, withDangerousMod, withXcodeProject } = require('expo/config-plugins');

const FILE = 'AvoCookAppIntents.swift';

// App Intents must be compiled into the app target itself for Siri and Shortcuts to discover them.
module.exports = function withAppIntents(config) {
  config = withDangerousMod(config, [
    'ios',
    (config) => {
      const projectName = IOSConfig.XcodeUtils.getProjectName(config.modRequest.projectRoot);
      const destination = path.join(config.modRequest.platformProjectRoot, projectName, FILE);
      fs.copyFileSync(path.join(config.modRequest.projectRoot, 'tools/plugins/ios', FILE), destination);
      return config;
    },
  ]);
  return withXcodeProject(config, (config) => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(config.modRequest.projectRoot);
    const filepath = `${projectName}/${FILE}`;
    if (!config.modResults.hasFile(filepath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath,
        groupName: projectName,
        project: config.modResults,
      });
    }
    return config;
  });
};
