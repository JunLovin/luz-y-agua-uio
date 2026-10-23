import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PRIVACY_VERSION } from "../domain/consent";
import { es } from "../i18n/es";
import { Button } from "../ui/button";
import { localStore } from "../ui/local-store";
import { privacyUrl } from "../ui/links";
import { useTheme } from "../ui/theme";

export default function Welcome() {
  const { colors, ui } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [intro, age, privacy] = es.welcome.steps;
  const policy = privacyUrl;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[ui.screen, { justifyContent: "center" }]}
      >
        <Text
          style={ui.muted}
          accessibilityLabel={es.welcome.stepLabel(step + 1, 3)}
        >
          {step + 1} / 3
        </Text>
        {step === 0 && (
          <View style={{ gap: 16 }}>
            <Text style={ui.title} accessibilityRole="header">
              {intro.title}
            </Text>
            <Text style={ui.body}>{intro.body}</Text>
            <Text style={ui.muted}>{es.independence}</Text>
            <Button label={es.common.continue} onPress={() => setStep(1)} />
          </View>
        )}
        {step === 1 && (
          <View style={{ gap: 16 }}>
            <Text style={ui.title} accessibilityRole="header">
              {age.title}
            </Text>
            <Text style={ui.body}>{age.body}</Text>
            <Button
              label={age.confirm}
              onPress={() => {
                localStore.update((s) => ({ ...s, ageConfirmed: true }));
                setStep(2);
              }}
            />
          </View>
        )}
        {step === 2 && (
          <View style={{ gap: 16 }}>
            <Text style={ui.title} accessibilityRole="header">
              {privacy.title}
            </Text>
            <Text style={ui.body}>{privacy.body}</Text>
            {policy && (
              <Button
                label={privacy.link}
                variant="secondary"
                onPress={() => void Linking.openURL(policy)}
              />
            )}
            {!policy && (
              <Text style={ui.muted}>{es.welcome.privacyMissing}</Text>
            )}
            <Button
              label={privacy.confirm}
              disabled={!policy}
              onPress={() => {
                localStore.update((s) => ({
                  ...s,
                  privacyAcceptedVersion: PRIVACY_VERSION,
                }));
                router.replace("/avisos");
              }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
