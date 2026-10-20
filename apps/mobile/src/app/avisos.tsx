import { useRouter } from "expo-router";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fcmPush } from "../adapters/fcm-push";
import { es } from "../i18n/es";
import { Button } from "../ui/button";
import { colors, ui } from "../ui/theme";
import { syncNow } from "../ui/use-topic-sync";

/** Explains the notifications before the system dialog (SPEC §8.1). */
export default function NotificationsIntro() {
  const router = useRouter();
  const done = () => router.replace("/");
  async function allow() {
    await fcmPush.requestPermission().catch(() => false);
    void syncNow();
    done();
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[ui.screen, { justifyContent: "center" }]}
      >
        <Text style={ui.title} accessibilityRole="header">
          {es.notifications.title}
        </Text>
        <Text style={ui.body}>{es.notifications.body}</Text>
        <Button label={es.notifications.allow} onPress={() => void allow()} />
        <Button
          label={es.notifications.later}
          variant="secondary"
          onPress={done}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
