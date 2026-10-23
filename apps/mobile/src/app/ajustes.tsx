import Constants from "expo-constants";
import {
  Bell,
  CodeXml,
  Moon,
  MoonStar,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash,
} from "lucide-react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { es } from "../i18n/es";
import { Button } from "../ui/button";
import { Card, IconBadge, OptionRow, Segmented } from "../ui/kit";
import { localStore, useLocalState } from "../ui/local-store";
import { resetCityData } from "../ui/use-city";
import { privacyUrl, sourceCodeUrl } from "../ui/links";
import { useTheme } from "../ui/theme";
import { space } from "../ui/tokens";
import {
  forgetPush,
  pushEnabled,
  setNotifications,
} from "../ui/use-topic-sync";

export default function Settings() {
  const { colors, ui } = useTheme();
  const theme = useLocalState().theme;
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
      <Card>
        <View style={styles.row}>
          <IconBadge icon={Bell} tone="luz" />
          <View style={styles.flex}>
            <Text style={ui.heading}>{t.notifications}</Text>
            <Text style={ui.muted}>
              {notificationsOn ? es.notifications.on : es.notifications.off}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t.notifications}
            value={notificationsOn === true}
            disabled={notificationsOn === null}
            onValueChange={(next) => void toggleNotifications(next)}
            trackColor={{ true: colors.primary, false: `${colors.muted}66` }}
            ios_backgroundColor={`${colors.muted}66`}
          />
        </View>
        <View
          style={[styles.row, styles.divider, { borderColor: colors.border }]}
        >
          <MoonStar size={22} color={colors.muted} />
          <Text style={[ui.muted, styles.flex]}>{t.quietHoursBody}</Text>
        </View>
      </Card>

      <Card>
        <Text style={ui.heading}>{t.theme}</Text>
        <Segmented
          label={t.theme}
          value={theme}
          onChange={(next) => localStore.update((s) => ({ ...s, theme: next }))}
          options={[
            { value: "dark", label: t.themes.dark, icon: Moon },
            { value: "light", label: t.themes.light, icon: Sun },
            { value: "system", label: t.themes.system, icon: Smartphone },
          ]}
        />
      </Card>

      {policy && (
        <OptionRow
          icon={ShieldCheck}
          title={t.privacy}
          onPress={() => void Linking.openURL(policy)}
        />
      )}
      <OptionRow
        icon={CodeXml}
        title={t.code}
        onPress={() => void Linking.openURL(sourceCodeUrl)}
      />

      <View style={{ marginTop: space.md }}>
        <Button label={t.wipe} variant="danger" icon={Trash} onPress={wipe} />
      </View>
      <Text style={[ui.muted, styles.center]}>
        {t.version(Constants.expoConfig?.version ?? "")}
      </Text>
      <Text style={[ui.muted, styles.center]}>{es.independence}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  flex: { flex: 1 },
  center: { textAlign: "center" },
  divider: { borderTopWidth: 1, paddingTop: space.md, marginTop: space.xs },
});
