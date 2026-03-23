import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/src/store/AppStore";
import { calculateCalories } from "../utils/calculateCalories";
import type { LocationSubscription } from "expo-location";

type GeoPoint = { latitude: number; longitude: number; timestamp?: number };

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371; // km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

export default function WorkoutScreen() {
  const router = useRouter();
  const { profile, selectedRoute, addWorkout, setSelectedRoute } = useAppStore();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const watchRef = useRef<LocationSubscription | null>(null);

  const stopWatching = () => {
    if (watchRef.current) {
      watchRef.current.remove?.();
      watchRef.current = null;
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timer | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  // Manage foreground location tracking while running
  useEffect(() => {
    if (Platform.OS === "web") {
      // Do not start native location watcher on web
      return () => {
        stopWatching();
      };
    }

    async function startWatcher() {
      if (!isRunning || permissionDenied || Platform.OS === "web") return;
      if (watchRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Location = require("expo-location") as typeof import("expo-location");

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          setPoints((prev) => [
            ...prev,
            { latitude, longitude, timestamp: loc.timestamp },
          ]);
        }
      );

      watchRef.current = subscription;
    }

    if (isRunning) {
      startWatcher();
    } else {
      stopWatching();
    }

    return () => {
      stopWatching();
    };
  }, [isRunning, permissionDenied]);

  const weightKg = useMemo(() => {
    if (profile.units === "metric" && profile.weightKg) {
      return profile.weightKg;
    }
    if (profile.weightLbs) {
      return profile.weightLbs * 0.453592;
    }
    return 70; // fallback
  }, [profile.units, profile.weightKg, profile.weightLbs]);

  const caloriesBurned = useMemo(
    () =>
      selectedRoute
        ? calculateCalories(weightKg, elapsedSeconds, selectedRoute.difficulty)
        : 0,
    [elapsedSeconds, selectedRoute, weightKg]
  );

  const distanceKmLive = useMemo(() => {
    if (points.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += haversineKm(points[i - 1], points[i]);
    }
    return total;
  }, [points]);

  const paceText = useMemo(() => {
    if (distanceKmLive <= 0.05 || elapsedSeconds === 0) return "";
    const minutes = elapsedSeconds / 60 / distanceKmLive;
    const whole = Math.floor(minutes);
    const secs = Math.round((minutes - whole) * 60);
    const mm = whole.toString().padStart(2, "0");
    const ss = secs.toString().padStart(2, "0");
    return `${mm}:${ss} min/km`;
  }, [distanceKmLive, elapsedSeconds]);

  const formattedTime = useMemo(() => {
    const m = Math.floor(elapsedSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (elapsedSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [elapsedSeconds]);

  const handleFinishInternal = () => {
    if (!selectedRoute) return;

    const hasElapsed = elapsedSeconds > 0;
    const durationMin = hasElapsed
      ? Math.max(1, Math.round(elapsedSeconds / 60))
      : selectedRoute.durationMin;
    const calories = hasElapsed
      ? Math.round(
          calculateCalories(weightKg, elapsedSeconds, selectedRoute.difficulty)
        )
      : selectedRoute.calories ?? 0;

    const distanceKm =
      distanceKmLive > 0.05 ? distanceKmLive : selectedRoute.distanceKm ?? 0;

    const workout = {
      id: `w_${Date.now()}`,
      dateISO: new Date().toISOString(),
      calories,
      distanceKm,
      durationMin,
      difficulty: selectedRoute.difficulty,
      routeName: selectedRoute.name,
      completed: true as const,
    };

    addWorkout(workout);
    setSelectedRoute(null);
    stopWatching();
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      router.replace("/");
    }, 1200);
  };

  const handleFinish = () => {
    if (elapsedSeconds === 0) {
      Alert.alert(
        "Finish workout?",
        "You haven't started the timer yet. Save this workout anyway?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Save", style: "destructive", onPress: handleFinishInternal },
        ]
      );
      return;
    }
    handleFinishInternal();
  };

  const requestPermissionAndStart = async () => {
    if (Platform.OS === "web") {
      // Web UI-only: no real location, but we still let the timer run.
      setPermissionDenied(false);
      setIsRunning(true);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Location = require("expo-location") as typeof import("expo-location");

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        return;
      }
      setPermissionDenied(false);
      setIsRunning(true);
    } catch {
      setPermissionDenied(true);
    }
  };

  const handleStartPauseResume = () => {
    if (!isRunning && elapsedSeconds === 0) {
      // First start
      requestPermissionAndStart();
    } else {
      // Pause or resume
      setIsRunning((v) => !v);
    }
  };

  if (!selectedRoute) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Workout Session</Text>
          <View style={styles.card}>
            <Text style={styles.emptyText}>No route selected</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.replace("/routes")}
            >
              <Text style={styles.primaryButtonLabel}>Back to Routes</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.root}>
        {/* Full-screen map placeholder background */}
        <View style={styles.mapPlaceholder} pointerEvents="none">
          <Text style={styles.mapPlaceholderText}>Live Map (Available on iOS)</Text>
        </View>

        {/* Floating stats overlay */}
        <View style={styles.statsOverlay}>
          <View style={styles.statsCard}>
            <View style={styles.statsTopRow}>
              <View style={styles.elapsedBlock}>
                <Text style={styles.elapsedLabel}>Elapsed</Text>
                <Text style={styles.elapsedValue}>{formattedTime}</Text>
              </View>
            </View>

            <View style={styles.statsBottomRow}>
              <View style={styles.statMini}>
                <Text style={styles.statMiniLabel}>Calories</Text>
                <Text style={styles.statMiniValue}>~{Math.round(caloriesBurned)} kcal</Text>
              </View>
              <View style={styles.statMini}>
                <Text style={styles.statMiniLabel}>Distance</Text>
                <Text style={styles.statMiniValue}>{distanceKmLive.toFixed(2)} km</Text>
              </View>
            </View>

            {paceText ? <Text style={styles.statSub}>Pace: {paceText}</Text> : null}
          </View>

          {permissionDenied && (
            <View style={styles.permissionBanner}>
              <Text style={styles.permissionText}>
                Location permission is needed to track distance.
              </Text>
              <Pressable
                style={[
                  styles.primaryButton,
                  { marginTop: 0, paddingVertical: 10, paddingHorizontal: 18 },
                ]}
                onPress={requestPermissionAndStart}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="location-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryButtonLabel}>Grant Permission</Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>

        {/* Fixed bottom controls */}
        <View style={styles.bottomControls} pointerEvents="box-none">
          <View style={styles.controlsBar}>
            {saved ? <Text style={styles.savedText}>Saved</Text> : null}
            <View style={styles.controlsRow}>
              <Pressable
                style={[styles.controlButton, styles.startButton]}
                onPress={handleStartPauseResume}
              >
                <Ionicons
                  name={isRunning ? "pause-circle-outline" : "play-circle-outline"}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.controlButtonLabel}>
                  {isRunning ? "Pause" : elapsedSeconds > 0 ? "Resume" : "Start"}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.controlButton, styles.finishButton]}
                onPress={handleFinish}
              >
                <Ionicons name="stop-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.controlButtonLabel}>Finish</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1220",
  },
  root: {
    flex: 1,
    position: "relative",
  },
  page: {
    flex: 1,
    paddingHorizontal: 18,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: "#EEF0F5",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  main: {
    flex: 1,
    paddingTop: 16,
    gap: 18,
  },
  mapPlaceholder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0B1220",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },
  mapPlaceholderSubText: {
    marginTop: 6,
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    fontWeight: "600",
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "#EEF0F5",
  },
  statsOverlay: {
    position: "absolute",
    left: 18,
    right: 18,
    top: 90,
    zIndex: 2,
  },
  statsTopRow: {
    alignItems: "center",
  },
  elapsedBlock: {
    alignItems: "center",
  },
  elapsedLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "900",
  },
  elapsedValue: {
    marginTop: 6,
    fontSize: 46,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: 0.2,
  },
  statsBottomRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 14,
  },
  statMini: {
    flex: 1,
    alignItems: "center",
  },
  statMiniLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "900",
  },
  statMiniValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  statSub: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },
  permissionBanner: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  permissionText: {
    fontSize: 13,
    color: "#9A3412",
    fontWeight: "700",
    marginBottom: 10,
  },
  controlsBar: {
    backgroundColor: "rgba(245,246,250,0.98)",
    borderTopWidth: 1,
    borderTopColor: "rgba(229,231,235,0.9)",
    paddingTop: 12,
    paddingBottom: 18,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },
  controlsRow: {
    flexDirection: "row",
    gap: 12,
  },
  controlButton: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  startButton: {
    backgroundColor: "#4F46E5",
  },
  finishButton: {
    backgroundColor: "#EF4444",
  },
  controlButtonLabel: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },
  savedText: {
    marginBottom: 8,
    fontSize: 13,
    color: "#10B981",
    fontWeight: "900",
  },
  primaryButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonLabel: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  emptyText: {
    fontSize: 15,
    color: "#4B5563",
  },
  bottomSpacer: {
    height: 2,
  },
  bottomControls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    zIndex: 3,
  },
});

