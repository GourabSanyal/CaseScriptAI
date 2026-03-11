const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo Config Plugin to override FFmpegKit pod with a mirror URL
 * to fix the 404 error caused by FFmpegKit retirement.
 */
module.exports = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.projectRoot,
        "ios",
        "Podfile",
      );
      const libsDir = path.join(config.modRequest.projectRoot, "ios", "libs");
      const srcDir = path.join(config.modRequest.projectRoot, "src");
      let podfileContent = fs.readFileSync(podfilePath, "utf8");

      const zipFilename = "ffmpeg-kit-https-6.0-ios-xcframework.zip";
      const sourceFile = path.join(srcDir, zipFilename);
      const targetFile = path.join(libsDir, zipFilename);
      const podspecFile = path.join(libsDir, "ffmpeg-kit-ios-https.podspec");

      // Ensure libs directory exists
      if (!fs.existsSync(libsDir)) {
        console.log("[withFFmpegMirror] Creating ios/libs directory");
        fs.mkdirSync(libsDir, { recursive: true });
      }

      // Copy the binary if it's missing or if we're in a fresh prebuild
      if (fs.existsSync(targetFile)) {
        // Skip if already exists
      } else if (fs.existsSync(sourceFile)) {
        console.log(
          `[withFFmpegMirror] Copying binary from ${sourceFile} to ${targetFile}`,
        );
        fs.copyFileSync(sourceFile, targetFile);
      } else {
        console.error(
          `[withFFmpegMirror] ❌ ERROR: Source binary not found at ${sourceFile}`,
        );
      }

      // Generate the missing podspec (because CocoaPods Trunk deleted it)
      const podspecContent = `
Pod::Spec.new do |s|
  s.name         = "ffmpeg-kit-ios-https"
  s.version      = "6.0"
  s.summary      = "FFmpegKit for iOS (Local Mirror)"
  s.homepage     = "https://github.com/tanersener/ffmpeg-kit"
  s.license      = "LGPL"
  s.author       = "Taner Sener"
  s.platforms    = { :ios => "12.1" }
  s.source       = { :http => "file://#{__dir__}/${zipFilename}" }
  s.vendored_frameworks = "*.xcframework"
end
      `.trim();
      fs.writeFileSync(podspecFile, podspecContent);

      // Tell Podfile to use our generated local podspec
      const localPodEntry = `pod 'ffmpeg-kit-ios-https', :podspec => './libs/ffmpeg-kit-ios-https.podspec'`;

      // Check if any version of this pod is already in the Podfile
      if (podfileContent.includes("ffmpeg-kit-ios-https")) {
        console.log(
          "[withFFmpegMirror] Updating existing FFmpeg pod to use local podspec",
        );
        podfileContent = podfileContent.replace(
          /pod 'ffmpeg-kit-ios-https'.*/,
          localPodEntry,
        );
      } else {
        console.log(
          "[withFFmpegMirror] Injecting local FFmpeg podspec path into Podfile",
        );
        podfileContent = podfileContent.replace(
          /use_expo_modules!/,
          `${localPodEntry}\n  use_expo_modules!`,
        );
      }

      fs.writeFileSync(podfilePath, podfileContent);

      return config;
    },
  ]);
};
