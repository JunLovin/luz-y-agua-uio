import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { es } from "./src/i18n/es";

export default function App() {
  return (
    <View style={styles.container}>
      <Text>{es.appName}</Text>
      <Text>{es.independence}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
