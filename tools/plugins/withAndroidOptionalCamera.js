const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withAndroidOptionalCamera(config) {
  return withAndroidManifest(config, (config) => {
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
};
