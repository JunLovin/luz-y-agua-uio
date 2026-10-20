import { StyleSheet, Text, View } from "react-native";
import { es } from "../i18n/es";
import { useCity } from "../ui/use-city";

export default function Home() {
  const city = useCity();
  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {es.appName}
      </Text>
      <Text>{es.tagline}</Text>
      {city.status === "loading" && <Text>{es.city.loading}</Text>}
      {city.status === "error" && <Text>{es.city.error}</Text>}
      {city.status === "ready" && (
        <>
          <Text>
            {es.city.summary(
              city.barrios?.features.length ?? 0,
              city.snapshot.outages.length,
            )}
          </Text>
          {city.offline && <Text>{es.city.offline}</Text>}
        </>
      )}
      <Text style={styles.notice}>{es.independence}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: "700" },
  notice: { fontSize: 13, textAlign: "center" },
});
