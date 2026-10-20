import { StyleSheet, Text, View } from "react-native";
import { es } from "../i18n/es";

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {es.appName}
      </Text>
      <Text>{es.tagline}</Text>
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
