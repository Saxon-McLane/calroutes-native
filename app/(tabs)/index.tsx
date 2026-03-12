import { useAppStore } from "@/src/store/AppStore";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
export default function Index() {

  const { workouts, profile, clearWorkouts } = useAppStore();
  const router = useRouter();

  function getMonday(date: Date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 (Sun) - 6 (Sat)
    const diff = (day + 6) % 7; // days since Monday
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - diff);
    return d;
  }

  const weekStart = getMonday(new Date());

  const weeklyWorkouts = workouts.filter((w) => {
    return new Date(w.dateISO) >= weekStart;
  });

  const totalCalories = weeklyWorkouts.reduce((sum, w) => sum + w.calories, 0);
  const totalDistance = weeklyWorkouts.reduce((sum, w) => sum + w.distanceKm, 0);
  const totalTime = weeklyWorkouts.reduce((sum, w) => sum + w.durationMin, 0);

  const progress = Math.min(
    totalCalories / profile.weeklyCalorieGoal,
    1
  );
  const progressPct = Math.round(progress * 100);

  return (
  
  
    <View style={{ flex: 1, backgroundColor: "#F6F7FB" }}>
      <LinearGradient
        colors={["#7C3AED", "#5B21B6"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.title}>Welcome back!</Text>
        <Text style={styles.subtitle}>Track your calorie-burning journey</Text>

        <View style={styles.streakCard}>
          <View style={styles.streakIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.streakLabel}>Current Streak</Text>
            <Text style={styles.streakValue}>0 days</Text>
          </View>
          <Text style={styles.keepItUp}>Keep it up! 🔥</Text>
        </View>

        <Pressable
          style={styles.primaryBtn}
          onPress={() => {
            router.push("/routes");
          }}
        >
          <Text style={styles.primaryBtnText}>＋  Find New Route</Text>
        </Pressable>
      </LinearGradient>

      <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.weekText}>Week of Mar 1 - Mar 7</Text>

          <View style={styles.tilesRow}>
            <View style={[styles.tile, { backgroundColor: "#F97316" }]}>
              <Text style={styles.tileLabel}>Calories Burned</Text>
              <Text style={styles.tileValue}>{totalCalories}</Text>
            </View>
            <View style={[styles.tile, { backgroundColor: "#3B82F6" }]}>
              <Text style={styles.tileLabel}>Distance</Text>
              <Text style={styles.tileValue}>
                {totalDistance.toFixed(1)} <Text style={styles.tileUnit}>km</Text>
              </Text>
            </View>
          </View>

          <View style={styles.tilesRow}>
            <View style={[styles.tile, { backgroundColor: "#8B5CF6" }]}>
              <Text style={styles.tileLabel}>Active Time</Text>
              <Text style={styles.tileValue}>
                {totalTime} <Text style={styles.tileUnit}>min</Text>
              </Text>
            </View>
            <View style={[styles.tile, { backgroundColor: "#22C55E" }]}>
              <Text style={styles.tileLabel}>Workouts</Text>
              <Text style={styles.tileValue}>{weeklyWorkouts.length}</Text>
            </View>
          </View>

          <View style={styles.goalCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <Text style={styles.goalTitle}>Weekly Goal</Text>
                <Text style={styles.goalValue}>
                  {totalCalories}{" "}
                  <Text style={styles.goalSub}>
                    / {profile.weeklyCalorieGoal.toLocaleString()} cal
                  </Text>
                </Text>
              </View>
              <Text style={styles.goalPct}>{progressPct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(0, Math.min(1, progress)) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.goalHint}>
              {Math.max(profile.weeklyCalorieGoal - totalCalories, 0)} calories to go this week
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Recent Activity</Text>

          {weeklyWorkouts.map((w) => (
            <View key={w.id} style={styles.routeCard}>
              <View style={styles.routeTop}>
                <View style={styles.routeIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeTitle}>{w.routeName ?? "Workout"}</Text>
                  <Text style={styles.routeDate}>
                    {new Date(w.dateISO).toLocaleDateString()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.pill,
                    {
                      backgroundColor:
                        w.difficulty === "easy"
                          ? "#D1FAE5"
                          : w.difficulty === "moderate"
                          ? "#FEF3C7"
                          : "#FECACA",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      {
                        color:
                          w.difficulty === "easy"
                            ? "#065F46"
                            : w.difficulty === "moderate"
                            ? "#92400E"
                            : "#991B1B",
                      },
                    ]}
                  >
                    {w.difficulty.charAt(0).toUpperCase() + w.difficulty.slice(1)}
                  </Text>
                </View>
              </View>
              <View style={styles.metricsRow}>
                <Text style={styles.metric}>🔥 {w.calories} cal</Text>
                <Text style={styles.metric}>📈 {w.distanceKm.toFixed(1)} km</Text>
                <Text style={styles.metric}>⏱ {w.durationMin} min</Text>
              </View>
            </View>
          ))}
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>
              Dev Tools
            </Text>
            <Pressable
              style={[styles.routeCard, { alignItems: "center" }]}
              onPress={clearWorkouts}
            >
              <Text style={{ color: "#EF4444", fontWeight: "800" }}>
                Clear Workouts
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 64, paddingHorizontal: 24, paddingBottom: 24 },
  title: { color: "#FFF", fontSize: 28, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginBottom: 18 },

  streakCard: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  streakIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#FB923C" },
  streakLabel: { color: "rgba(255,255,255,0.9)", fontWeight: "800" },
  streakValue: { color: "#FFF", fontSize: 24, fontWeight: "900", marginTop: 2 },
  keepItUp: { color: "rgba(255,255,255,0.85)", fontWeight: "700" },

  primaryBtn: { backgroundColor: "#FFF", borderRadius: 14, height: 50, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: "#7C3AED", fontWeight: "900", fontSize: 16 },

  content: { padding: 24, paddingTop: 18, paddingBottom: 40 },
  weekText: { textAlign: "center", color: "#6B7280", marginBottom: 18 },

  tilesRow: { flexDirection: "row", gap: 14, marginBottom: 14 },
  tile: { flex: 1, borderRadius: 22, padding: 18, minHeight: 92 },
  tileLabel: { color: "rgba(255,255,255,0.92)", fontWeight: "700", marginBottom: 8 },
  tileValue: { color: "#FFF", fontSize: 28, fontWeight: "900" },
  tileUnit: { color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: "700" },

  goalCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 24,
    marginTop: 10,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  goalTitle: { color: "#111827", fontWeight: "800", fontSize: 16 },
  goalValue: { color: "#111827", fontWeight: "900", fontSize: 34, marginTop: 8 },
  goalSub: { color: "#9CA3AF", fontWeight: "800", fontSize: 16 },
  goalPct: { color: "#7C3AED", fontWeight: "900", fontSize: 16, marginTop: 6 },
  progressTrack: {
    height: 10,
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    marginTop: 18,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#7C3AED",
    borderRadius: 999,
  },
  goalHint: { marginTop: 14, color: "#6B7280", fontWeight: "600" },

  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#111827", marginBottom: 14 },

  routeCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  routeTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  routeIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#7C3AED" },
  routeTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  routeDate: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontWeight: "800", fontSize: 12 },
  metricsRow: { flexDirection: "row", gap: 14, marginTop: 14 },
  metric: { color: "#374151", fontWeight: "700" },
});