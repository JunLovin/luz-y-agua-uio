import { useRouter } from "expo-router";
import {
  BellRing,
  ChevronLeft,
  MapPinOff,
  UserRoundX,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import {
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { PRIVACY_VERSION } from "../domain/consent";
import { es } from "../i18n/es";
import { Button } from "../ui/button";
import { IconBadge, type ToneName } from "../ui/kit";
import { privacyUrl } from "../ui/links";
import { localStore } from "../ui/local-store";
import { useReduceMotion } from "../ui/motion";
import { NightCity } from "../ui/night-city";
import { useTheme } from "../ui/theme";
import { radius, space } from "../ui/tokens";
import { setNotifications } from "../ui/use-topic-sync";

const STEPS = 4;
const PRIVACY_ICONS: [LucideIcon, ToneName][] = [
  [MapPinOff, "agua"],
  [UserRoundX, "crowd"],
  [BellRing, "luz"],
];

/** SPEC §8.1 steps 1 and 2 in one flow: each step lights up more of the city. */
export default function Welcome() {
  const { colors, ui } = useTheme();
  const router = useRouter();
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [enter] = useState(() => new Animated.Value(1));
  const t = es.welcome;
  const policy = privacyUrl;
  const finish = () => router.replace("/");

  useEffect(() => {
    if (reduceMotion) return enter.setValue(1);
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [step, reduceMotion, enter]);

  const pages: { title: string; content: ReactNode; actions: ReactNode }[] = [
    {
      title: t.intro.title,
      content: (
        <>
          <Text style={ui.body}>{t.intro.body}</Text>
          <Text style={ui.muted}>{es.independence}</Text>
        </>
      ),
      actions: <Button label={es.common.continue} onPress={() => setStep(1)} />,
    },
    {
      title: t.age.title,
      content: <Text style={ui.body}>{t.age.body}</Text>,
      actions: (
        <Button
          label={t.age.confirm}
          onPress={() => {
            localStore.update((s) => ({ ...s, ageConfirmed: true }));
            setStep(2);
          }}
        />
      ),
    },
    {
      title: t.privacy.title,
      content: (
        <>
          {t.privacy.points.map((point, i) => {
            const [icon, tone] = PRIVACY_ICONS[i] ?? PRIVACY_ICONS[0]!;
            return (
              <View key={point} style={styles.point}>
                <IconBadge icon={icon} tone={tone} />
                <Text style={[ui.body, styles.pointText]}>{point}</Text>
              </View>
            );
          })}
          {policy ? (
            <Button
              label={t.privacy.link}
              variant="ghost"
              onPress={() => void Linking.openURL(policy)}
            />
          ) : (
            <Text style={ui.muted}>{t.privacyMissing}</Text>
          )}
        </>
      ),
      actions: (
        <Button
          label={t.privacy.confirm}
          disabled={!policy}
          onPress={() => {
            localStore.update((s) => ({
              ...s,
              privacyAcceptedVersion: PRIVACY_VERSION,
            }));
            setStep(3);
          }}
        />
      ),
    },
    {
      title: es.notifications.title,
      content: <Text style={ui.body}>{es.notifications.body}</Text>,
      actions: (
        <>
          <Button
            label={es.notifications.allow}
            icon={BellRing}
            onPress={() => void setNotifications(true).then(finish)}
          />
          <Button
            label={es.notifications.later}
            variant="ghost"
            onPress={finish}
          />
        </>
      ),
    },
  ];
  const page = pages[step] ?? pages[0]!;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      <View style={styles.top}>
        {step > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.back}
            hitSlop={12}
            onPress={() => setStep(step - 1)}
            style={[styles.back, { backgroundColor: colors.raised }]}
          >
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        <View
          style={styles.progress}
          accessibilityRole="progressbar"
          accessibilityLabel={t.stepLabel(step + 1, STEPS)}
          accessibilityValue={{ min: 1, max: STEPS, now: step + 1 }}
        >
          {Array.from({ length: STEPS }, (_, i) => (
            <View
              key={i}
              style={[
                styles.segment,
                {
                  backgroundColor: i <= step ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </View>
      </View>
      <View style={styles.scene}>
        <NightCity progress={(step + 1) / STEPS} />
      </View>
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            paddingBottom: space.lg + insets.bottom,
            opacity: enter,
            transform: [
              {
                translateY: enter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          },
        ]}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ gap: space.md }}
        >
          <Text style={ui.title} accessibilityRole="header">
            {page.title}
          </Text>
          {page.content}
        </ScrollView>
        <View style={{ gap: space.sm }}>{page.actions}</View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  progress: { flex: 1, flexDirection: "row", gap: 6 },
  segment: { flex: 1, height: 6, borderRadius: 3 },
  scene: { flex: 1, justifyContent: "flex-end", overflow: "hidden" },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: space.lg,
    gap: space.lg,
    maxHeight: "62%",
  },
  scroll: { flexGrow: 0 },
  point: { flexDirection: "row", alignItems: "center", gap: space.md },
  pointText: { flex: 1 },
});
