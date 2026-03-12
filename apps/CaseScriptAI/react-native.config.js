module.exports = {
  dependencies: {
    'ffmpeg-kit-react-native': {
      platforms: {
        ios: null, // Disable autolinking on iOS to prevent 404 download errors
        android: null, // Disable autolinking on Android to ensure local AAR usage
      },
    },
  },
};
