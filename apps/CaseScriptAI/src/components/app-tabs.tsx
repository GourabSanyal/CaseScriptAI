import { NativeTabs, Label, Icon } from "expo-router/unstable-native-tabs";
import React from "react";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

export default function AppTabs() {
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? "dark" : "light";
  const colors = Colors[theme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        <Icon src={require("@/assets/images/tabIcons/home.png")} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="poc">
        <Label>POC</Label>
        <Icon src={require("@/assets/images/tabIcons/explore.png")} />
      </NativeTabs.Trigger>

      {/* POC_remove_ffmpeg: throwaway tab for native-audio pipeline POC. */}
      <NativeTabs.Trigger name="poc-audio">
        <Label>Audio</Label>
        <Icon src={require("@/assets/images/tabIcons/explore.png")} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <Label>Explore</Label>
        <Icon src={require("@/assets/images/tabIcons/explore.png")} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
