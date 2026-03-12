module.exports = {
  dependencies: {
    'ffmpeg-kit-react-native': {
      platforms: {
        ios: null, // Disable autolinking on iOS to prevent 404 download errors
      },
    },
  },
};
