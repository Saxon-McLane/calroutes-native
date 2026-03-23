import { WorkoutDetailSheet } from "@/src/components/WorkoutDetailSheet";
import { useAppStore, type Workout } from "@/src/store/AppStore";
import {
  aggregateWorkoutTotals,
  calculateStreak,
  formatWeekRangeLabel,
  sortWorkoutsNewestFirst,
  startOfCurrentWeek,
  workoutsThisWeek,
} from "@/src/utils/workoutFilters";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const THIS_WEEK_LIST_LIMIT = 5;

export default function Index() {
  const { workouts, profile } = useAppStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const weekStart = startOfCurrentWeek(new Date());

  const weeklyWorkouts = useMemo(() => workoutsThisWeek(workouts), [workouts]);

  const streakDays = useMemo(() => calculateStreak(workouts), [workouts]);

  const { calories: totalCalories, distanceKm: totalDistance, durationMin: totalTime, count: weekCount } =
    useMemo(() => aggregateWorkoutTotals(weeklyWorkouts), [weeklyWorkouts]);

  const progress = Math.min(totalCalories / profile.weeklyCalorieGoal, 1);
  const progressPct = Math.round(progress * 100);

  const thisWeekSorted = useMemo(
    () => sortWorkoutsNewestFirst(weeklyWorkouts).slice(0, THIS_WEEK_LIST_LIMIT),
    [weeklyWorkouts]
  );

  const [detailWorkout, setDetailWorkout] = useState<Workout | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: "#F6F7FB" }}>
      <LinearGradient
        colors={["#7C3AED", "#5B21B6"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <Text style={styles.title}>Welcome back!</Text>
        <Text style={styles.subtitle}>Track your calorie-burning journey</Text>

        <View style={styles.streakCard}>
          <View style={styles.streakIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.streakLabel}>Current Streak</Text>
            <Text style={styles.streakValue}>
              {streakDays} {streakDays === 1 ? "day" : "days"}
            </Text>
          </View>
          <Text style={styles.keepItUp}>Keep it up! 🔥</Text>
        </View>

        <Pressable style={styles.primaryBtn} onPress={() => router.push("/routes")}>
          <Text style={styles.primaryBtnText}>＋  Find New Route</Text>
        </Pressable>
      </LinearGradient>

      <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.weekText}>Week of {formatWeekRangeLabel(weekStart)}</Text>

          <View style={styles.statsRow}>
            <View style={[styles.tile, { backgroundColor: "#F97316" }]}>
              <Text style={styles.tileLabel}>Calories</Text>
              <Text style={styles.tileValue}>{totalCalories}</Text>
            </View>
            <View style={[styles.tile, { backgroundColor: "#3B82F6" }]}>
              <Text style={styles.tileLabel}>Distance</Text>
              <Text style={styles.tileValue}>
                {totalDistance.toFixed(1)} <Text style={styles.tileUnit}>km</Text>
              </Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.tile, { backgroundColor: "#8B5CF6" }]}>
              <Text style={styles.tileLabel}>Active Time</Text>
              <Text style={styles.tileValue}>
                {totalTime} <Text style={styles.tileUnit}>min</Text>
              </Text>
            </View>
            <View style={[styles.tile, { backgroundColor: "#22C55E" }]}>
              <Text style={styles.tileLabel}>Workouts</Text>
              <Text style={styles.tileValue}>{weekCount}</Text>
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

          <Text style={styles.sectionTitle}>This week</Text>

          {weeklyWorkouts.length === 0 ? (
            <View style={styles.emptyWeekCard}>
              <Text style={styles.emptyWeekText}>No workouts this week yet.</Text>
              <Pressable
                style={styles.emptyWeekCta}
                onPress={() => router.push("/routes")}
              >
                <Text style={styles.emptyWeekCtaText}>Generate Your First Route</Text>
              </Pressable>
            </View>
          ) : (
            thisWeekSorted.map((w) => (
              <View key={w.id} style={styles.activityCard}>
                <View style={styles.activityTop}>
                  <View style={styles.routeIcon} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeTitle}>{w.routeName ?? "Workout"}</Text>
                    <Text style={styles.routeDate}>
                      {new Date(w.dateISO).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
                <View style={styles.activityMetrics}>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Calories</Text>
                    <Text style={styles.metricValue}>{w.calories} cal</Text>
                  </View>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Duration</Text>
                    <Text style={styles.metricValue}>{w.durationMin} min</Text>
                  </View>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Distance</Text>
                    <Text style={styles.metricValue}>{w.distanceKm.toFixed(1)} km</Text>
                  </View>
                </View>
                <Pressable style={styles.viewDetailsBtn} onPress={() => setDetailWorkout(w)}>
                  <Text style={styles.viewDetailsText}>View details</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <WorkoutDetailSheet
        visible={detailWorkout !== null}
        workout={detailWorkout}
        onClose={() => setDetailWorkout(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { color: "#FFF", fontSize: 24, fontWeight: "800", marginBottom: 4 },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 12 },

  streakCard: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  streakIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FB923C" },
  streakLabel: { color: "rgba(255,255,255,0.9)", fontWeight: "800", fontSize: 12 },
  streakValue: { color: "#FFF", fontSize: 20, fontWeight: "900", marginTop: 2 },
  keepItUp: { color: "rgba(255,255,255,0.85)", fontWeight: "700", fontSize: 12 },

  primaryBtn: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  primaryBtnText: { color: "#5B21B6", fontWeight: "900", fontSize: 17 },

  content: { padding: 18, paddingTop: 14, paddingBottom: 36 },
  weekText: { textAlign: "center", color: "#6B7280", marginBottom: 12, fontSize: 13 },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  tile: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 84,
    justifyContent: "center",
  },
  tileLabel: { color: "rgba(255,255,255,0.92)", fontWeight: "800", fontSize: 12, marginBottom: 6 },
  tileValue: { color: "#FFF", fontSize: 22, fontWeight: "900" },
  tileUnit: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "700" },

  goalCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    marginTop: 4,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  goalTitle: { color: "#111827", fontWeight: "800", fontSize: 15 },
  goalValue: { color: "#111827", fontWeight: "900", fontSize: 28, marginTop: 6 },
  goalSub: { color: "#9CA3AF", fontWeight: "800", fontSize: 14 },
  goalPct: { color: "#7C3AED", fontWeight: "900", fontSize: 15, marginTop: 4 },
  progressTrack: {
    height: 8,
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#7C3AED",
    borderRadius: 999,
  },
  goalHint: { marginTop: 10, color: "#6B7280", fontWeight: "600", fontSize: 13 },

  sectionTitle: { fontSize: 17, fontWeight: "900", color: "#111827", marginBottom: 10 },

  emptyWeekCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF0F5",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  emptyWeekText: { fontSize: 15, fontWeight: "700", color: "#6B7280", textAlign: "center" },
  emptyWeekCta: {
    marginTop: 16,
    backgroundColor: "#7C3AED",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
  },
  emptyWeekCtaText: { color: "#FFF", fontWeight: "900", fontSize: 15 },

  activityCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  activityTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  routeIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#7C3AED" },
  routeTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  routeDate: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  activityMetrics: {
    flexDirection: "row",
    marginTop: 12,
    gap: 10,
  },
  metricCol: { flex: 1 },
  metricLabel: { fontSize: 11, fontWeight: "800", color: "#9CA3AF", marginBottom: 4 },
  metricValue: { fontSize: 14, fontWeight: "800", color: "#111827" },
  viewDetailsBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
  },
  viewDetailsText: { color: "#5B21B6", fontWeight: "800", fontSize: 13 },
});
