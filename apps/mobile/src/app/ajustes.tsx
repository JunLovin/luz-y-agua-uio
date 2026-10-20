import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Alert, Linking, ScrollView, Text, View } from "react-native";
import { es } from "../i18n/es";
import { Button } from "../ui/button";
import { localStore } from "../ui/local-store";
import { resetCityData } from "../ui/use-city";
import { privacyUrl, sourceCodeUrl } from "../ui/links";
import { ui } from "../ui/theme";

export default function Settings() {
  const router = useRouter();
  const t = es.settings;
  const policy = privacyUrl;

  function wipe() {
    Alert.alert(t.wipe, t.wipeConfirm, [
      { text: es.common.cancel, style: "cancel" },
      {
        text: es.common.delete,
        style: "destructive",
        onPress: () => {
          localStore.wipe();
          resetCityData();
          router.replace("/bienvenida");
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={ui.screen}>
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
