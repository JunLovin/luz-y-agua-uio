import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { Service } from "@luz-y-agua/shared";
import * as Crypto from "expo-crypto";
import { useState } from "react";
import {
  CircleCheck,
  Droplet,
  DropletOff,
  MapPin,
  Trash,
  Users,
  WifiOff,
  Zap,
  ZapOff,
  type LucideIcon,
} from "lucide-react-native";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { configuredReportApi } from "../../adapters/report-api";
import {
  submitReport,
  type ReportOutcome,
} from "../../application/submit-report";
import type { ReportStatus } from "../../domain/reports";
import { barrioName } from "../../domain/barrios";
import { placeAlerts, statusFor } from "../../domain/city";
import { removePlace } from "../../domain/local-state";
import { es } from "../../i18n/es";
import { formatOutageWindow } from "../../i18n/format";
import { Button } from "../../ui/button";
import { EeqZonePicker } from "../../ui/eeq-zone-picker";
import { Card, IconBadge, Pill } from "../../ui/kit";
import { localStore, useLocalState } from "../../ui/local-store";
import { useTheme } from "../../ui/theme";
import { radius, space } from "../../ui/tokens";
import { refreshCityData, useCity } from "../../ui/use-city";

export default function PlaceDetail() {
  const { colors, ui } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const local = useLocalState();
  const city = useCity();
  const [sending, setSending] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const place = local.places.find((p) => p.id === id);
  if (!place) return <Redirect href="/" />;

  const barrios = city.status === "ready" ? city.barrios : null;
  const status =
    city.status === "ready"
      ? statusFor(city.snapshot, place.barrioId, new Date())
      : null;
  const t = es.place;

  const placeId = place.id;

  function remove() {
    Alert.alert(t.remove, t.removeConfirm, [
      { text: es.common.cancel, style: "cancel" },
      {
        text: es.common.delete,
        style: "destructive",
        onPress: () => {
          localStore.update((state) => removePlace(state, placeId));
          router.back();
        },
      },
    ]);
  }

  const barrioId = place.barrioId;
  const label = (service: Service, status: ReportStatus) =>
    t.report[
      `${status === "out" ? "out" : "back"}${service === "luz" ? "Luz" : "Agua"}`
    ];

  function messageFor(outcome: ReportOutcome): string {
    switch (outcome.result) {
      case "ok":
        return t.report.sent;
      case "cooldown":
        return t.report.cooldown(Math.ceil(outcome.waitMs / 60_000));
      case "rate_limited":
        return t.report.rateLimited;
      default:
        return t.report.error;
    }
  }

  async function send(service: Service, status: ReportStatus) {
    setSending(true);
    try {
      const outcome = await submitReport(
        localStore.get(),
        { barrioId, service, status },
        new Date(),
        { send: configuredReportApi(), newNonce: Crypto.randomUUID },
      );
      localStore.update((state) => ({
        ...state,
        reportNonce: outcome.state.reportNonce,
        lastReports: outcome.state.lastReports,
      }));
      setReportMessage(messageFor(outcome));
      if (outcome.result === "ok") void refreshCityData();
    } catch {
      setReportMessage(t.report.error);
    } finally {
      setSending(false);
    }
  }

  function confirmReport(service: Service, status: ReportStatus) {
    Alert.alert(
      t.report.confirmTitle,
      t.report.confirm(label(service, status), barrioName(barrios, barrioId)),
      [
        { text: es.common.cancel, style: "cancel" },
        { text: t.report.send, onPress: () => void send(service, status) },
      ],
    );
  }

  const now = new Date();
  const alerts =
    city.status === "ready" ? placeAlerts(city.snapshot, barrioId, now) : [];

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <Stack.Screen options={{ title: "" }} />
      <View style={styles.head}>
        <IconBadge icon={MapPin} tone="luz" size={56} />
        <View style={styles.flex}>
          <Text style={ui.title} accessibilityRole="header">
            {place.alias}
          </Text>
          <Text style={ui.muted}>{barrioName(barrios, barrioId)}</Text>
        </View>
      </View>

      {city.status === "loading" && (
        <Text style={ui.muted}>{es.city.loading}</Text>
      )}
      {city.status === "error" && (
        <Card style={styles.row}>
          <IconBadge icon={WifiOff} tone="danger" />
          <Text style={[ui.body, styles.flex]}>{es.city.error}</Text>
        </Card>
      )}

      {city.status === "ready" && (
        <View style={styles.tiles}>
          {(["luz", "agua"] as const).map((service) => {
            const alert = alerts.find((a) => a.service === service);
            const tone = !alert
              ? colors.raised
              : alert.kind === "crowd"
                ? colors.crowd.soft
                : colors[service].soft;
            const fg = !alert
              ? colors.text
              : alert.kind === "crowd"
                ? colors.crowd.text
                : colors[service].text;
            const Icon = !alert
              ? CircleCheck
              : alert.kind === "crowd"
                ? Users
                : SERVICE_ICON[service];
            return (
              <View
                key={service}
                style={[styles.tile, { backgroundColor: tone }]}
                accessible
              >
                <Icon size={28} color={fg} strokeWidth={2.25} />
                <Text style={[ui.heading, { color: fg }]}>
                  {es.services[service]}
                </Text>
                <Text style={[ui.label, { color: fg }]}>
                  {!alert
                    ? t.now.clear
                    : alert.kind === "crowd"
                      ? t.now.crowd
                      : alert.kind === "ongoing"
                        ? t.now.ongoing
                        : formatOutageWindow(
                            alert.outage.starts_at,
                            alert.outage.ends_at,
                            now,
                          )}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {status && status.outages.length > 0 && (
        <>
          <Text style={ui.heading} accessibilityRole="header">
            {t.upcoming}
          </Text>
          {status.outages.map((outage) => (
            <Card key={outage.id}>
              <View style={styles.row}>
                <Pill
                  tone={outage.service}
                  icon={SERVICE_ICON[outage.service]}
                  label={es.services[outage.service]}
                />
                {outage.tier === "medium" && (
                  <Pill tone="neutral" label={t.unconfirmed} />
                )}
              </View>
              <Text style={ui.heading}>
                {formatOutageWindow(outage.starts_at, outage.ends_at, now)}
              </Text>
              {outage.notes && <Text style={ui.body}>{outage.notes}</Text>}
              <Text style={ui.muted}>{t.source(outage.source_label)}</Text>
            </Card>
          ))}
        </>
      )}

      {status && status.crowd.length > 0 && (
        <Card>
          <Text style={ui.heading}>{t.neighbors}</Text>
          {status.crowd.map((c) => (
            <Pill
              key={c.service}
              tone="crowd"
              icon={Users}
              label={t.neighborsCount(es.services[c.service], c.reports)}
            />
          ))}
        </Card>
      )}

      <Text style={[ui.heading, { marginTop: space.sm }]}>
        {t.report.title}
      </Text>
      <View style={styles.grid}>
        {REPORTS.map(({ service, status: reportStatus, icon: Icon }) => {
          const tone = colors[service];
          return (
            <Pressable
              key={`${service}-${reportStatus}`}
              accessibilityRole="button"
              accessibilityLabel={label(service, reportStatus)}
              accessibilityState={{ disabled: sending }}
              disabled={sending}
              onPress={() => confirmReport(service, reportStatus)}
              style={({ pressed }) => [
                styles.report,
                {
                  backgroundColor:
                    reportStatus === "out" ? tone.soft : colors.surface,
                  borderColor:
                    reportStatus === "out" ? tone.soft : colors.border,
                },
                pressed && { transform: [{ scale: 0.97 }] },
                sending && { opacity: 0.5 },
              ]}
            >
              <Icon size={30} color={tone.solid} strokeWidth={2.25} />
              <Text style={[ui.label, { textAlign: "center" }]}>
                {label(service, reportStatus)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {(sending || reportMessage) && (
        <Card style={styles.row}>
          <Text style={[ui.body, styles.flex]} accessibilityLiveRegion="polite">
            {sending ? t.report.sending : reportMessage}
          </Text>
        </Card>
      )}

      <EeqZonePicker place={place} />

      <Button label={t.remove} variant="danger" icon={Trash} onPress={remove} />
    </ScrollView>
  );
}

const SERVICE_ICON: Record<Service, LucideIcon> = { luz: Zap, agua: Droplet };

const REPORTS: { service: Service; status: ReportStatus; icon: LucideIcon }[] =
  [
    { service: "luz", status: "out", icon: ZapOff },
    { service: "luz", status: "restored", icon: Zap },
    { service: "agua", status: "out", icon: DropletOff },
    { service: "agua", status: "restored", icon: Droplet },
  ];

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1 },
  tiles: { flexDirection: "row", gap: space.sm },
  tile: {
    flex: 1,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.xs,
    minHeight: 132,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  report: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 104,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    padding: space.sm,
  },
});
