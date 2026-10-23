import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_500Medium,
  AtkinsonHyperlegibleNext_700Bold,
  AtkinsonHyperlegibleNext_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/atkinson-hyperlegible-next";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { View } from "react-native";
import { es } from "../i18n/es";
import { useTheme } from "../ui/theme";
import { fonts } from "../ui/tokens";
import { useTopicSync } from "../ui/use-topic-sync";

export default function RootLayout() {
  const { colors, scheme } = useTheme();
  // Bundled with the app: the font never comes from the internet.
  const [fontsLoaded] = useFonts({
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_500Medium,
    AtkinsonHyperlegibleNext_700Bold,
    AtkinsonHyperlegibleNext_800ExtraBold,
  });
  useTopicSync();
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  if (!fontsLoaded)
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <>
      <Stack
        screenOptions={{
          headerTransparent: false,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text, fontFamily: fonts.bold },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: es.places.title, headerShown: false }}
        />
        <Stack.Screen name="bienvenida" options={{ headerShown: false }} />
        <Stack.Screen
          name="agregar"
          options={{ title: es.addPlace.title, presentation: "modal" }}
        />
        <Stack.Screen name="lugar/[id]" options={{ title: "" }} />
        <Stack.Screen name="ajustes" options={{ title: es.settings.title }} />
        <Stack.Screen name="mapa" options={{ title: es.map.title }} />
      </Stack>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
    </>
  );
}
