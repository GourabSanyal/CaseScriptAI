module.exports = {
  dependencies: {
    'ffmpeg-kit-react-native': {
      platforms: {
        ios: null, // Disable autolinking on iOS to prevent 404 download errors
        // Enable Android autolinking so the native RN bridge module is registered.
        // Local FFmpeg AAR usage is still enforced by `scripts/manage-ffmpeg.js`.
      },
    },
  },
};
