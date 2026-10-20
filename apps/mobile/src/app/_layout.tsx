import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { es } from "../i18n/es";

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ title: es.appName }} />
      <StatusBar style="auto" />
    </>
  );
}
