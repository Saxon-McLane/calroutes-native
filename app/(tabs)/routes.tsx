import { Slider } from "@miblanchard/react-native-slider";
import * as Location from "expo-location";
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
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useAppStore, type Difficulty } from "@/src/store/AppStore";
import { getMockRouteCoordinates, type LatLng } from "@/utils/mockRoute";

type GeneratedRoute = {
  id: string;
  title: string;
  calories: number;
  distanceKm: number;
  durationMin: number;
  difficulty: Difficulty;
};

const INITIAL_REGION_DELTA = { latitudeDelta: 0.008, longitudeDelta: 0.008 };

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

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Location permission denied. Enable it in Settings to see the map.");
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
    } catch (err) {
      setLocationError(
        "Could not get your location. Check that location is enabled and try again."
      );
      setLocationLoading(false);
      return;
    }

    // Existing route generation logic (unchanged)
    const calorieTarget = targetCalories;
    let weightKg = 70;
    if (profile.units === "metric" && profile.weightKg) {
      weightKg = profile.weightKg;
    } else if (profile.weightLbs) {
      weightKg = profile.weightLbs * 0.453592;
    }
    const met =
      difficulty === "easy" ? 3.3 : difficulty === "moderate" ? 4.3 : 5.0;
    const timeHours = calorieTarget / (met * weightKg);
    const durationMin = Math.max(10, Math.round(timeHours * 60));
    const paceMph =
      difficulty === "easy" ? 3.0 : difficulty === "moderate" ? 3.7 : 4.5;
    const baseDistanceMiles = paceMph * timeHours;
    const baseDistanceKm = baseDistanceMiles * 1.60934;
    const names =
      difficulty === "easy"
        ? ["Scenic Loop", "Neighborhood Walk", "Lakefront Stroll", "Campus Loop"]
        : difficulty === "moderate"
        ? ["Park Circuit", "River Trail", "Hill Mix", "Downtown Loop"]
        : ["Power Loop", "Tempo Route", "Stairs + Walk", "Hills Circuit"];

    const newRoutes: GeneratedRoute[] = Array.from({ length: 4 }).map((_, i) => {
      const jitter = (i - 1.5) * 0.08;
      const distanceKm = Math.max(
        0.5,
        Number((baseDistanceKm * (1 + jitter)).toFixed(2))
      );
      return {
        id: `${Date.now()}-${i}`,
        title: names[i] ?? `Route Option ${i + 1}`,
        calories: calorieTarget,
        distanceKm,
        durationMin,
        difficulty,
      };
    });

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
        <Text style={styles.header}>Generate Routes</Text>
        <View style={styles.difficultyRow}>
          {(["easy", "moderate", "hard"] as Difficulty[]).map((d) => (
            <Pressable
              key={d}
              onPress={() => setDifficulty(d)}
              style={[
                styles.difficultyBtn,
                d === difficulty && styles.difficultyBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.difficultyBtnText,
                  d === difficulty && styles.difficultyBtnTextActive,
                ]}
              >
                {d}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.calorieLabel}>Target Calories: {targetCalories}</Text>
        <Slider
          minimumValue={100}
          maximumValue={800}
          step={25}
          value={targetCalories}
          onValueChange={(val) => setTargetCalories(val[0])}
          minimumTrackTintColor="#7C3AED"
        />
        <Pressable
          style={styles.generateBtn}
          onPress={generateRoutes}
          disabled={locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>
              Generate {targetCalories} Calorie Routes
            </Text>
          )}
        </Pressable>

        {locationError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{locationError}</Text>
          </View>
        ) : null}

        {/* Route info: shown after Generate, above the map */}
        {showMap && firstRoute && userLocation && (
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

        {/* Map: only after Generate; centered on user with marker and mock polyline */}
        {showMap && userLocation && (
          <View style={styles.mapWrapper}>
            <MapView
              style={styles.map}
              provider={Platform.OS !== "web" ? PROVIDER_GOOGLE : undefined}
              initialRegion={{
                ...userLocation,
                ...INITIAL_REGION_DELTA,
              }}
              region={
                userLocation
                  ? {
                      ...userLocation,
                      ...INITIAL_REGION_DELTA,
                    }
                  : undefined
              }
              showsUserLocation={false}
            >
              <Marker coordinate={userLocation} title="You" />
              {mockRouteCoords.length > 1 && (
                <Polyline
                  coordinates={mockRouteCoords}
                  strokeColor="#7C3AED"
                  strokeWidth={4}
                />
              )}
            </MapView>
          </View>
        )}

        {routes.map((route) => (
          <View key={route.id} style={styles.card}>
            <Text style={styles.title}>{route.title}</Text>
            <Text>🔥 {route.calories} cal</Text>
            <Text>📏 {route.distanceKm} km</Text>
            <Text>⏱ {route.durationMin} min</Text>
            <Pressable
              style={styles.saveBtn}
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
              <Text style={styles.saveBtnText}>Start Workout</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F7FB" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 22, fontWeight: "800", marginBottom: 20 },
  difficultyRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  difficultyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  difficultyBtnActive: { backgroundColor: "#7C3AED" },
  difficultyBtnText: { fontWeight: "800", color: "#111827", textTransform: "capitalize" },
  difficultyBtnTextActive: { color: "#fff" },
  calorieLabel: { marginBottom: 8 },
  generateBtn: {
    backgroundColor: "#7C3AED",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
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
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#E5E7EB",
  },
  map: { width: "100%", height: "100%" },
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  title: { fontWeight: "700", marginBottom: 6 },
  saveBtn: {
    marginTop: 10,
    backgroundColor: "#22C55E",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnText: { color: "white", fontWeight: "700" },
});
