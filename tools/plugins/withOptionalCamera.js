const { withAndroidManifest, withInfoPlist } = require('expo/config-plugins');

module.exports = function withOptionalCamera(config) {
  // Android Manifest modifications
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;
    
    if (!androidManifest['uses-feature']) {
      androidManifest['uses-feature'] = [];
    }
    
    // Define the camera features to mark as optional
    const cameraFeatures = [
      {
        $: {
          'android:name': 'android.hardware.camera',
          'android:required': 'false',
        },
      },
      {
        $: {
          'android:name': 'android.hardware.camera.autofocus',
          'android:required': 'false',
        },
      },
      {
        $: {
          'android:name': 'android.hardware.camera.front',
          'android:required': 'false',
        },
      },
      {
        $: {
          'android:name': 'android.hardware.camera.any',
          'android:required': 'false',
        },
      }
    ];

    // Add them to the manifest if they don't exist, or update them if they do
    cameraFeatures.forEach((feature) => {
      const existing = androidManifest['uses-feature'].find(
        (f) => f.$['android:name'] === feature.$['android:name']
      );
      if (!existing) {
        androidManifest['uses-feature'].push(feature);
      } else {
        existing.$['android:required'] = 'false';
      }
    });

    return config;
  });

  // iOS Info.plist modifications
  config = withInfoPlist(config, (config) => {
    if (config.modResults.UIRequiredDeviceCapabilities) {
      if (Array.isArray(config.modResults.UIRequiredDeviceCapabilities)) {
        config.modResults.UIRequiredDeviceCapabilities = 
          config.modResults.UIRequiredDeviceCapabilities.filter(
            (cap) => cap !== 'camera'
          );
      } else if (typeof config.modResults.UIRequiredDeviceCapabilities === 'object') {
        // If it's a dictionary
        delete config.modResults.UIRequiredDeviceCapabilities['camera'];
      }
    }
    return config;
  });

  return config;
};
