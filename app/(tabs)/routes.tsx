import { Slider } from "@miblanchard/react-native-slider";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppStore, type Difficulty } from "@/src/store/AppStore";

type GeneratedRoute = {
  id: string;
  title: string;
  calories: number;
  distanceKm: number;
  durationMin: number;
  difficulty: Difficulty;
};

export default function RoutesScreen() {
  const router = useRouter();
  const { setSelectedRoute, profile } = useAppStore();

  const [routes, setRoutes] = useState<GeneratedRoute[]>([]);
  const [targetCalories, setTargetCalories] = useState(300);
  const [difficulty, setDifficulty] = useState<Difficulty>("moderate");

  function generateRoutes() {
    const calorieTarget = targetCalories;

    // Derive weight in kg from profile
    let weightKg = 70;
    if (profile.units === "metric" && profile.weightKg) {
      weightKg = profile.weightKg;
    } else if (profile.weightLbs) {
      weightKg = profile.weightLbs * 0.453592;
    }

    // MET per difficulty
    const met =
      difficulty === "easy" ? 3.3 : difficulty === "moderate" ? 4.3 : 5.0;

    // Required time in hours to hit calorieTarget
    const timeHours = calorieTarget / (met * weightKg);
    const durationMin = Math.max(10, Math.round(timeHours * 60));

    // Walking pace per difficulty (mph)
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
      // Jitter distance slightly around base while keeping time (and thus calories) constant
      const jitter = (i - 1.5) * 0.08; // -12%, -4%, +4%, +12%
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
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Generate Routes</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
        {(["easy", "moderate", "hard"] as Difficulty[]).map((d) => (
          <Pressable
            key={d}
            onPress={() => setDifficulty(d)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 999,
              backgroundColor:
                d === difficulty ? "#7C3AED" : "rgba(255,255,255,0.9)",
            }}
          >
            <Text
              style={{
                fontWeight: "800",
                color: d === difficulty ? "#fff" : "#111827",
                textTransform: "capitalize",
              }}
            >
              {d}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ marginBottom: 8 }}>
        Target Calories: {targetCalories}
      </Text>

      <Slider
        minimumValue={100}
        maximumValue={800}
        step={25}
        value={targetCalories}
        onValueChange={(val) => setTargetCalories(val[0])}
        minimumTrackTintColor="#7C3AED"
      />
      <Pressable style={styles.generateBtn} onPress={generateRoutes}>
        <Text style={styles.btnText}>
          Generate {targetCalories} Calorie Routes
        </Text>
      </Pressable>

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
            <Text style={{ color: "white", fontWeight: "700" }}>
              Start Workout
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F6F7FB" },
  header: { fontSize: 22, fontWeight: "800", marginBottom: 20 },
  generateBtn: {
    backgroundColor: "#7C3AED",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  btnText: { color: "white", fontWeight: "700" },
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
});