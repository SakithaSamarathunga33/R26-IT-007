// App.tsx - root of the mobile app. Loads the Outfit fonts, then shows the navigator
// (src/navigation/AppNavigator) wrapped in the language provider (src/i18n).
import React from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";
import AppNavigator from "./src/navigation/AppNavigator";
import { LanguageProvider } from "./src/i18n";

// Waits for fonts to load (spinner on a dark background), then renders the whole app.
export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#020B18" }}>
        <ActivityIndicator color="#2D8EFF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AppNavigator />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
