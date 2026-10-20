import { useRouter } from "expo-router";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { es } from "../i18n/es";
import { Button } from "../ui/button";
import { colors, ui } from "../ui/theme";

/** Explains the notifications before the system dialog. The permission request itself arrives with FCM (phase 5). */
export default function NotificationsIntro() {
  const router = useRouter();
  const done = () => router.replace("/");
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[ui.screen, { justifyContent: "center" }]}
      >
        <Text style={ui.title} accessibilityRole="header">
          {es.notifications.title}
        </Text>
        <Text style={ui.body}>{es.notifications.body}</Text>
        <Button label={es.notifications.allow} onPress={done} />
        <Button
          label={es.notifications.later}
          variant="secondary"
          onPress={done}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
