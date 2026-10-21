import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { Service } from "@luz-y-agua/shared";
import * as Crypto from "expo-crypto";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { configuredReportApi } from "../../adapters/report-api";
import {
  submitReport,
  type ReportOutcome,
} from "../../application/submit-report";
import type { ReportStatus } from "../../domain/reports";
import { barrioName } from "../../domain/barrios";
import { statusFor } from "../../domain/city";
import { removePlace } from "../../domain/local-state";
import { es } from "../../i18n/es";
import { formatOutageWindow } from "../../i18n/format";
import { Button } from "../../ui/button";
import { EeqZonePicker } from "../../ui/eeq-zone-picker";
import { localStore, useLocalState } from "../../ui/local-store";
import { colors, ui } from "../../ui/theme";
import { refreshCityData, useCity } from "../../ui/use-city";

export default function PlaceDetail() {
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

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <Stack.Screen options={{ title: place.alias }} />
      <Text style={ui.muted}>{barrioName(barrios, place.barrioId)}</Text>

      <Text style={ui.heading} accessibilityRole="header">
        {t.upcoming}
      </Text>
      {city.status === "loading" && (
        <Text style={ui.muted}>{es.city.loading}</Text>
      )}
      {city.status === "error" && (
        <Text style={[ui.muted, { color: colors.danger }]}>
          {es.city.error}
        </Text>
      )}
      {status && status.outages.length === 0 && (
        <Text style={ui.body}>{t.none}</Text>
      )}
      {status?.outages.map((outage) => (
        <View key={outage.id} style={ui.card}>
          <Text style={ui.heading}>
            {es.services[outage.service]}
            {outage.tier === "medium" ? ` · ${t.unconfirmed}` : ""}
          </Text>
          <Text style={ui.body}>
            {formatOutageWindow(outage.starts_at, outage.ends_at)}
          </Text>
          {outage.notes && <Text style={ui.body}>{outage.notes}</Text>}
          <Text style={ui.muted}>{t.source(outage.source_label)}</Text>
        </View>
      ))}

      <Text style={ui.heading} accessibilityRole="header">
        {t.neighbors}
      </Text>
      {status && status.crowd.length === 0 && (
        <Text style={ui.body}>{t.neighborsNone}</Text>
      )}
      {status?.crowd.map((c) => (
        <Text key={c.service} style={[ui.body, { color: colors.warning }]}>
          {t.neighborsCount(es.services[c.service], c.reports)}
        </Text>
      ))}

      <Text style={ui.heading}>{t.report.title}</Text>
      <View style={{ gap: 8 }}>
        {(["luz", "agua"] as const).flatMap((service) =>
          (["out", "restored"] as const).map((status) => (
            <Button
              key={`${service}-${status}`}
              label={label(service, status)}
              variant={status === "out" ? "primary" : "secondary"}
              disabled={sending}
              onPress={() => confirmReport(service, status)}
            />
          )),
        )}
      </View>
      {(sending || reportMessage) && (
        <Text style={ui.body} accessibilityLiveRegion="polite">
          {sending ? t.report.sending : reportMessage}
        </Text>
      )}

      <EeqZonePicker place={place} />

      <Button label={t.remove} variant="danger" onPress={remove} />
    </ScrollView>
  );
}
