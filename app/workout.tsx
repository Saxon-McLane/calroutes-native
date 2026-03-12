import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
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
  const watchRef = useRef<Location.LocationSubscription | null>(null);

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
    try {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Workout Session</Text>

        <View style={styles.card}>
          <Text style={styles.routeName}>{selectedRoute.name}</Text>
          <Text style={styles.routeMeta}>
            {selectedRoute.difficulty.toUpperCase()} •{" "}
            {selectedRoute.distanceKm.toFixed(1)} km •{" "}
            {selectedRoute.durationMin} min
          </Text>
          <Text style={styles.routeMeta}>
            Est. {selectedRoute.calories ?? 0} cal
          </Text>
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>Elapsed Time</Text>
          <Text style={styles.timerValue}>{formattedTime}</Text>
          <Text style={styles.caloriesText}>
            ~ {Math.round(caloriesBurned)} cal burned
          </Text>
          <Text style={styles.caloriesText}>
            Distance: {distanceKmLive.toFixed(2)} km
          </Text>
          {paceText ? (
            <Text style={styles.caloriesText}>Pace: {paceText}</Text>
          ) : null}
          {permissionDenied && (
            <View style={{ marginTop: 8, alignItems: "center" }}>
              <Text style={[styles.caloriesText, { color: "#FBBF24" }]}>
                Location permission is needed to track distance.
              </Text>
              <Pressable
                style={[
                  styles.primaryButton,
                  { marginTop: 8, paddingVertical: 8, paddingHorizontal: 16 },
                ]}
                onPress={requestPermissionAndStart}
              >
                <Text style={styles.primaryButtonLabel}>Grant Permission</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            style={[
              styles.controlButton,
              isRunning && styles.controlButtonSecondary,
            ]}
            onPress={handleStartPauseResume}
          >
            <Text style={styles.controlButtonLabel}>
              {isRunning ? "Pause" : elapsedSeconds > 0 ? "Resume" : "Start"}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.controlButton,
              styles.controlButtonFinish,
            ]}
            onPress={handleFinish}
          >
            <Text style={styles.controlButtonLabel}>Finish</Text>
          </Pressable>
        </View>

        {saved && <Text style={styles.savedText}>Saved</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  routeName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  routeMeta: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  timerCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 8,
  },
  timerLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  timerValue: {
    fontSize: 40,
    fontWeight: "900",
    color: "#F9FAFB",
  },
  caloriesText: {
    fontSize: 14,
    color: "#E5E7EB",
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  controlButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#10B981",
  },
  controlButtonSecondary: {
    backgroundColor: "#F59E0B",
  },
  controlButtonFinish: {
    backgroundColor: "#EF4444",
  },
  controlButtonLabel: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: "#4F46E5",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonLabel: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  emptyText: {
    fontSize: 15,
    color: "#4B5563",
  },
  savedText: {
    marginTop: 12,
    fontSize: 13,
    color: "#10B981",
    fontWeight: "700",
    textAlign: "center",
  },
});

