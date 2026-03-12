import { Stack } from "expo-router";
import { AppStoreProvider } from "../src/store/AppStore";

export default function RootLayout() {
  return (
    <AppStoreProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppStoreProvider>
  );
}