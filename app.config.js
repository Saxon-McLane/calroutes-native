// Use EXPO_PUBLIC_GOOGLE_MAPS_API_KEY from env (e.g. .env) — do not hardcode.
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

module.exports = {
  expo: {
    name: "calroutes-native",
    slug: "calroutes-native",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "calroutesnative",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    platforms: ["ios", "android", "web"],
    jsEngine: "hermes",
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "CalRoutes uses your location to track your walk and estimate calories.",
        ITSAppUsesNonExemptEncryption: false,
      },
      bundleIdentifier: "com.saxonmclane.fitroutes",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      // Google Maps for iOS (and Android). Key from EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.
      ...(googleMapsApiKey
        ? [
            [
              "react-native-maps",
              {
                iosGoogleMapsApiKey: googleMapsApiKey,
                androidGoogleMapsApiKey: googleMapsApiKey,
              },
            ],
          ]
        : []),
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "f895ed77-54b8-4000-bf0d-4b0d331c0a0d",
      },
    },
  },
};
