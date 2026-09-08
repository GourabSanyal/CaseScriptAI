// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "android/*", "ios/*", ".expo/*"],
  },
  {
    rules: {
      "import/namespace": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    }
  }
]);

