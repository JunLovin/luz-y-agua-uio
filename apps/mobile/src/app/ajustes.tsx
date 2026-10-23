import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Linking, ScrollView, Text, View } from "react-native";
import { es } from "../i18n/es";
import { Button } from "../ui/button";
import { localStore } from "../ui/local-store";
import { resetCityData } from "../ui/use-city";
import { privacyUrl, sourceCodeUrl } from "../ui/links";
import { ui } from "../ui/theme";
import {
  forgetPush,
  pushEnabled,
  setNotifications,
} from "../ui/use-topic-sync";

export default function Settings() {
  const router = useRouter();
  const t = es.settings;
  const policy = privacyUrl;
  const [notificationsOn, setNotificationsOn] = useState<boolean | null>(null);
  useFocusEffect(
    useCallback(() => {
      void pushEnabled().then(setNotificationsOn, () => undefined);
    }, []),
  );

  async function toggleNotifications(enabled: boolean) {
    const granted = await setNotifications(enabled);
    if (!granted) return void Linking.openSettings();
    setNotificationsOn(enabled);
  }

  function wipe() {
    Alert.alert(t.wipe, t.wipeConfirm, [
      { text: es.common.cancel, style: "cancel" },
      {
        text: es.common.delete,
        style: "destructive",
        onPress: () => {
          void forgetPush(localStore.get().subscribedTopics);
          localStore.wipe();
          resetCityData();
          router.replace("/bienvenida");
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      {notificationsOn !== null && (
        <View style={[ui.card, { gap: 10 }]}>
          <Text style={ui.heading}>{t.notifications}</Text>
          <Text style={ui.body}>
            {notificationsOn ? es.notifications.on : es.notifications.off}
          </Text>
          <Button
            label={
              notificationsOn
                ? es.notifications.disable
                : es.notifications.allow
            }
            variant={notificationsOn ? "secondary" : "primary"}
            onPress={() => void toggleNotifications(!notificationsOn)}
          />
        </View>
      )}
      <View style={ui.card}>
        <Text style={ui.heading}>{t.quietHours}</Text>
        <Text style={ui.body}>{t.quietHoursBody}</Text>
      </View>
      {policy && (
        <Button
          label={t.privacy}
          variant="secondary"
          onPress={() => void Linking.openURL(policy)}
        />
      )}
      <Button
        label={t.code}
        variant="secondary"
        onPress={() => void Linking.openURL(sourceCodeUrl)}
      />
      <Button label={t.wipe} variant="danger" onPress={wipe} />
      <Text style={[ui.muted, { textAlign: "center" }]}>
        {t.version(Constants.expoConfig?.version ?? "")}
      </Text>
      <Text style={[ui.muted, { textAlign: "center" }]}>{es.independence}</Text>
    </ScrollView>
  );
}
