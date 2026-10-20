import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { es } from "../i18n/es";
import { colors } from "../ui/theme";

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerTransparent: false,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: es.places.title }} />
        <Stack.Screen name="bienvenida" options={{ headerShown: false }} />
        <Stack.Screen name="avisos" options={{ headerShown: false }} />
        <Stack.Screen
          name="agregar"
          options={{ title: es.addPlace.title, presentation: "modal" }}
        />
        <Stack.Screen name="lugar/[id]" options={{ title: "" }} />
        <Stack.Screen name="ajustes" options={{ title: es.settings.title }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
