import { Slider } from "@miblanchard/react-native-slider";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppStore, type Difficulty } from "@/src/store/AppStore";
import RouteMap from "@/src/components/RouteMap";
import { getMockRouteCoordinates, type LatLng } from "@/utils/mockRoute";

type GeneratedRoute = {
  id: string;
  title: string;
  calories: number;
  distanceKm: number;
  durationMin: number;
  difficulty: Difficulty;
};

type DifficultyModel = {
  label: string;
  accentColor: string;
  iconGlyph: string;
  intensity: number; // 0..1 for UI bar
  description: string;
  benefitLine: string;
  // Route-logic placeholders (NO API yet)
  preferredElevation: number; // 0..1 (more = more elevation influence)
  preferredPace: number; // multiplier for pace
  metBase: number; // baseline MET at flat terrain
  paceBaseMph: number; // baseline pace before multipliers
  distanceJitter: number; // how much distance varies across options
  routeNames: string[];
};

const DIFFICULTY_MODEL: Record<Difficulty, DifficultyModel> = {
  easy: {
    label: "Easy",
    accentColor: "#22C55E",
    iconGlyph: "🚶",
    intensity: 0.25,
    description: "Longer, lower intensity",
    benefitLine: "Designed for steady calorie burn with a calmer pace.",
    preferredElevation: 0.12,
    preferredPace: 0.9,
    metBase: 3.1,
    paceBaseMph: 3.35,
    distanceJitter: 0.06,
    routeNames: ["Scenic Loop", "Neighborhood Walk", "Lakefront Stroll", "Campus Loop"],
  },
  moderate: {
    label: "Medium",
    accentColor: "#F59E0B",
    iconGlyph: "🏃",
    intensity: 0.55,
    description: "Balanced pace and distance",
    benefitLine: "Balanced intensity to keep your burn consistent.",
    preferredElevation: 0.45,
    preferredPace: 1.0,
    metBase: 4.0,
    paceBaseMph: 3.35,
    distanceJitter: 0.085,
    routeNames: ["Park Circuit", "River Trail", "Hill Mix", "Downtown Loop"],
  },
  hard: {
    label: "Hard",
    accentColor: "#EF4444",
    iconGlyph: "⚡",
    intensity: 0.85,
    description: "Shorter, higher intensity",
    benefitLine: "More challenge built-in—burn calories faster.",
    preferredElevation: 0.75,
    preferredPace: 1.18,
    metBase: 4.8,
    paceBaseMph: 3.35,
    distanceJitter: 0.11,
    routeNames: ["Power Loop", "Tempo Route", "Stairs + Walk", "Hills Circuit"],
  },
};

const ROUTE_TAGLINES: Record<Difficulty, string[]> = {
  easy: [
    "Best for steady walking",
    "Easy pace — great for recovery",
    "Flat-friendly and relaxed",
  ],
  moderate: [
    "Good for jogging",
    "Balanced walk or light run",
    "Steady cardio without overdoing it",
  ],
  hard: [
    "Includes elevation changes",
    "Shorter — higher burn rate",
    "Power session energy",
  ],
};

function taglineFor(difficulty: Difficulty, index: number): string {
  const list = ROUTE_TAGLINES[difficulty];
  return list[index % list.length];
}

export default function RoutesScreen() {
  const router = useRouter();
  const { setSelectedRoute, profile } = useAppStore();

  const [routes, setRoutes] = useState<GeneratedRoute[]>([]);
  const [targetCalories, setTargetCalories] = useState(300);
  const [difficulty, setDifficulty] = useState<Difficulty>("moderate");

  // Map only shows after user presses Generate
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [mockRouteCoords, setMockRouteCoords] = useState<LatLng[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const generateRoutes = useCallback(async () => {
    setLocationError(null);
    setLocationLoading(true);

    const calorieTarget = targetCalories;

    // Route-logic preparation (NO API yet):
    // these placeholders represent how terrain + pace influence intensity.
    // TODO: replace with real Google Routes API response when available.
    const model = DIFFICULTY_MODEL[difficulty];
    const preferredElevation = model.preferredElevation;
    const preferredPace = model.preferredPace;
    const metBase = model.metBase;
    const paceBaseMph = model.paceBaseMph;
    const distanceJitter = model.distanceJitter;
    const routeNames = model.routeNames;

    let weightKg = 70;
    if (profile.units === "metric" && profile.weightKg) {
      weightKg = profile.weightKg;
    } else if (profile.weightLbs) {
      weightKg = profile.weightLbs * 0.453592;
    }

    // Effective intensity: elevation increases calorie burn rate.
    const elevationMetScale = 0.15; // tuned for "easy/medium/hard" feel
    const met = metBase * (1 + preferredElevation * elevationMetScale);

    const timeHours = calorieTarget / (met * weightKg);
    const durationMin = Math.max(10, Math.round(timeHours * 60));

    // Pace: chosen difficulty biases the walking pace.
    const paceMph = paceBaseMph * preferredPace;

    const baseDistanceMiles = paceMph * timeHours;
    const baseDistanceKm = baseDistanceMiles * 1.60934;

    const newRoutes: GeneratedRoute[] = Array.from({ length: 4 }).map((_, i) => {
      const jitter = (i - 1.5) * distanceJitter;
      const distanceKm = Math.max(
        0.5,
        Number((baseDistanceKm * (1 + jitter)).toFixed(2))
      );
      return {
        id: `${Date.now()}-${i}`,
        title: routeNames[i] ?? `Route Option ${i + 1}`,
        calories: calorieTarget,
        distanceKm,
        durationMin,
        difficulty,
      };
    });

    // Web: no real location and no real map for now.
    if (Platform.OS === "web") {
      setRoutes(newRoutes);
      setShowMap(true);
      setLocationLoading(false);
      return;
    }

    try {
      const Location = (await import("expo-location")) as typeof import("expo-location");

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(
          "Location permission denied. Enable it in Settings to see the map."
        );
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(coords);

      // TODO: replace with real Google Routes API — call API with coords + distance/duration,
      // then set route coords from API response and use API route stats for route info.
      const mockCoords = getMockRouteCoordinates(coords);
      setMockRouteCoords(mockCoords);
    } catch {
      setLocationError(
        "Could not get your location. Check that location is enabled and try again."
      );
      setLocationLoading(false);
      return;
    }

    setRoutes(newRoutes);
    setShowMap(true);
    setLocationLoading(false);
  }, [targetCalories, difficulty, profile.units, profile.weightKg, profile.weightLbs]);

  const firstRoute = routes[0];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.header}>Generate Routes</Text>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Difficulty</Text>

            <View style={styles.difficultyGrid}>
              {(["easy", "moderate", "hard"] as Difficulty[]).map((d) => {
                const meta = DIFFICULTY_MODEL[d];
                const isActive = d === difficulty;

                // Medium selected should feel softer + more distinct.
                const activeBg =
                  isActive && d === "moderate" ? "#FDE68A" : meta.accentColor;
                const activeText = isActive && d === "moderate" ? "#111827" : "#FFFFFF";
                const activeDesc =
                  isActive && d === "moderate" ? "#374151" : "rgba(255,255,255,0.92)";

                return (
                  <Pressable
                    key={d}
                    onPress={() => setDifficulty(d)}
                    style={[
                      styles.difficultyCard,
                      isActive && styles.difficultyCardActive,
                      {
                        borderColor: isActive ? meta.accentColor : "#E5E7EB",
                        borderWidth: isActive ? 3 : 1,
                        backgroundColor: isActive ? activeBg : "#F3F4F6",
                      },
                    ]}
                  >
                    <View style={styles.difficultyCardTop}>
                      <View
                        style={[
                          styles.difficultyIconCircle,
                          {
                            borderColor: meta.accentColor,
                            backgroundColor:
                              isActive && d === "moderate" ? "#FFFFFF" : isActive
                                ? "rgba(255,255,255,0.16)"
                                : "#F9FAFB",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.difficultyIconGlyph,
                            { color: isActive ? activeText : meta.accentColor },
                          ]}
                        >
                          {meta.iconGlyph}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.difficultyName,
                          isActive ? { color: activeText } : null,
                        ]}
                      >
                        {meta.label}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.difficultyDescription,
                        isActive ? { color: activeDesc } : null,
                      ]}
                    >
                      {meta.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.caloriesCard}>
            <View style={styles.caloriesHeaderRow}>
              <View style={styles.caloriesHeaderLeft}>
                <Text style={styles.sectionLabelDark}>Target Calories</Text>
                <Text style={styles.caloriesValue}>
                  {targetCalories}
                  <Text style={styles.caloriesUnit}> kcal</Text>
                </Text>
              </View>
            </View>

            <Slider
              minimumValue={100}
              maximumValue={800}
              step={25}
              value={targetCalories}
              onValueChange={(val: number[]) => setTargetCalories(val[0])}
              minimumTrackTintColor="#7C3AED"
            />
            <Text style={styles.sliderHelper}>
              Route distance and pace will adjust to match your calorie goal.
            </Text>
          </View>

          <Text style={styles.readyText}>Ready to generate your workout?</Text>

          <Pressable
            style={styles.generateBtn}
            onPress={generateRoutes}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Generate Route</Text>
            )}
          </Pressable>

          {locationError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{locationError}</Text>
            </View>
          ) : null}

        {/* Route info: shown after Generate, above the map */}
        {showMap && firstRoute && (Platform.OS === "web" || userLocation) && (
          <View style={styles.routeInfo}>
            <Text style={styles.routeInfoTitle}>Route overview</Text>
            <View style={styles.routeInfoRow}>
              <Text style={styles.routeInfoLabel}>Distance</Text>
              <Text style={styles.routeInfoValue}>{firstRoute.distanceKm} km</Text>
            </View>
            <View style={styles.routeInfoRow}>
              <Text style={styles.routeInfoLabel}>Est. calories</Text>
              <Text style={styles.routeInfoValue}>{firstRoute.calories} cal</Text>
            </View>
            <View style={styles.routeInfoRow}>
              <Text style={styles.routeInfoLabel}>Difficulty</Text>
              <Text style={styles.routeInfoValue}>
                {firstRoute.difficulty.charAt(0).toUpperCase() +
                  firstRoute.difficulty.slice(1)}
              </Text>
            </View>
          </View>
        )}

        {/* Map: only after Generate; web shows a preview placeholder */}
        {showMap && (
          <View style={styles.mapWrapper}>
            <RouteMap
              userLocation={userLocation}
              mockRouteCoords={mockRouteCoords}
            />
          </View>
        )}

        {routes.map((route: GeneratedRoute, index: number) => (
          <View key={route.id} style={styles.routeResultCard}>
            <Text style={styles.routeResultTitle}>{route.title}</Text>
            <Text style={styles.routeResultTagline}>{taglineFor(route.difficulty, index)}</Text>
            <View style={styles.routeResultGrid}>
              <View style={styles.routeResultStat}>
                <Text style={styles.routeResultLabel}>Calories</Text>
                <Text style={styles.routeResultValue}>{route.calories} kcal</Text>
              </View>
              <View style={styles.routeResultStat}>
                <Text style={styles.routeResultLabel}>Distance</Text>
                <Text style={styles.routeResultValue}>{route.distanceKm.toFixed(2)} km</Text>
              </View>
              <View style={styles.routeResultStat}>
                <Text style={styles.routeResultLabel}>Est. time</Text>
                <Text style={styles.routeResultValue}>{route.durationMin} min</Text>
              </View>
            </View>
            <Pressable
              style={styles.startWorkoutBtn}
              onPress={() => {
                setSelectedRoute({
                  id: route.id,
                  name: route.title,
                  distanceKm: route.distanceKm,
                  durationMin: route.durationMin,
                  difficulty: route.difficulty,
                  calories: route.calories,
                });
                router.push("/workout");
              }}
            >
              <Text style={styles.startWorkoutBtnText}>Start Workout</Text>
            </Pressable>
          </View>
        ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F7FB" },
  scroll: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 40, alignItems: "center" },
  content: { width: "100%", maxWidth: 680 },
  header: { fontSize: 22, fontWeight: "800", marginBottom: 14 },

  section: { marginBottom: 10 },
  sectionLabel: { fontSize: 13, fontWeight: "800", color: "#6B7280", marginBottom: 10 },
  sectionLabelDark: { fontSize: 13, fontWeight: "800", color: "#111827" },

  difficultyGrid: { flexDirection: "row", gap: 10 },
  difficultyCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
  },
  difficultyCardActive: {
    transform: [{ scale: 1.02 }],
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  difficultyCardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  difficultyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  difficultyIconGlyph: { fontSize: 16, fontWeight: "900" },
  difficultyName: { fontWeight: "900", color: "#111827", fontSize: 15 },
  difficultyDescription: {
    fontSize: 12.5,
    fontWeight: "800",
    lineHeight: 16,
    color: "#374151",
  },

  caloriesCard: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    marginBottom: 12,
  },
  caloriesHeaderRow: { marginBottom: 10 },
  caloriesHeaderLeft: { gap: 6 },
  caloriesValue: { fontSize: 22, fontWeight: "900", color: "#111827" },
  caloriesUnit: { fontSize: 13, fontWeight: "900", color: "#6B7280" },

  readyText: { marginBottom: 10, marginTop: 0, fontSize: 13.5, fontWeight: "800", color: "#6B7280" },
  sliderHelper: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    lineHeight: 17,
  },

  generateBtn: {
    backgroundColor: "#7C3AED",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
    shadowColor: "#7C3AED",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  btnText: { color: "white", fontWeight: "700" },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: { color: "#B91C1C", fontSize: 14 },
  routeInfo: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  routeInfoTitle: { fontWeight: "700", marginBottom: 12, fontSize: 16 },
  routeInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  routeInfoLabel: { color: "#6B7280" },
  routeInfoValue: { fontWeight: "600" },
  mapWrapper: {
    height: 280,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 18,
    backgroundColor: "#D1D5DB",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  map: { width: "100%", height: "100%" },
  routeResultCard: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#EEF0F5",
  },
  routeResultTitle: { fontSize: 18, fontWeight: "900", color: "#111827", marginBottom: 6 },
  routeResultTagline: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 14,
    lineHeight: 18,
  },
  routeResultGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  routeResultStat: { flex: 1, backgroundColor: "#F9FAFB", borderRadius: 12, padding: 10 },
  routeResultLabel: { fontSize: 11, fontWeight: "800", color: "#9CA3AF", marginBottom: 4 },
  routeResultValue: { fontSize: 15, fontWeight: "900", color: "#111827" },
  startWorkoutBtn: {
    backgroundColor: "#7C3AED",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#7C3AED",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  startWorkoutBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
});
