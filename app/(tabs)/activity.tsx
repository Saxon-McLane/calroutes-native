import { WorkoutDetailSheet } from "@/src/components/WorkoutDetailSheet";
import { useAppStore, type Workout } from "@/src/store/AppStore";
import {
  type ActivityFilter,
  activityByRange,
  aggregateWorkoutTotals,
  computeBestDayInsightLine,
  computeConsistencyInsight,
  sortWorkoutsNewestFirst,
  workoutRouteTag,
} from "@/src/utils/workoutFilters";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FILTER_OPTIONS: { key: ActivityFilter; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "3m", label: "3 Mo" },
  { key: "6m", label: "6 Mo" },
  { key: "year", label: "Year" },
  { key: "all", label: "All Time" },
];

export default function ActivityScreen() {
  const { workouts } = useAppStore();
  const [filter, setFilter] = useState<ActivityFilter>("month");
  const [detailWorkout, setDetailWorkout] = useState<Workout | null>(null);

  /** Completed workouts in range — drives summary cards, insights, and history list. */
  const filtered = useMemo(
    () => sortWorkoutsNewestFirst(activityByRange(workouts, filter)),
    [workouts, filter]
  );

  const totals = useMemo(() => aggregateWorkoutTotals(filtered), [filtered]);

  const consistency = useMemo(
    () => (filtered.length > 0 ? computeConsistencyInsight(filtered) : null),
    [filtered]
  );

  const bestDayLine = useMemo(
    () => (filtered.length > 0 ? computeBestDayInsightLine(filtered) : null),
    [filtered]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.subtitle}>Review completed routes and trends</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_OPTIONS.map(({ key, label }) => {
            const active = filter === key;
            return (
              <Pressable
                key={key}
                onPress={() => setFilter(key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryCardFlex]}>
            <Text style={styles.summaryLabel}>Workouts</Text>
            <Text style={styles.summaryValue}>{totals.count}</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardFlex]}>
            <Text style={styles.summaryLabel}>Calories</Text>
            <Text style={styles.summaryValue}>{totals.calories.toLocaleString()}</Text>
          </View>
        </View>
        <View style={[styles.summaryRow, styles.summaryRowLast]}>
          <View style={[styles.summaryCard, styles.summaryCardFlex]}>
            <Text style={styles.summaryLabel}>Distance</Text>
            <Text style={styles.summaryValue}>{totals.distanceKm.toFixed(1)} km</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardFlex]}>
            <Text style={styles.summaryLabel}>Active time</Text>
            <Text style={styles.summaryValue}>{totals.durationMin} min</Text>
          </View>
        </View>

        <Text style={styles.insightsHeading}>Insights</Text>
        <Text style={styles.insightsSub}>Quick takeaways from your selected activity range</Text>

        {filtered.length === 0 ? (
          <View style={styles.insightsEmptyCard}>
            <Text style={styles.insightsEmptyTitle}>No insights yet for this period.</Text>
            <Text style={styles.insightsEmptySub}>
              Complete more workouts to unlock activity trends.
            </Text>
          </View>
        ) : (
          <View style={styles.insightsCards}>
            <View style={styles.insightCard}>
              <Text style={styles.insightCardTitle}>Consistency</Text>
              {consistency ? (
                <>
                  <Text style={styles.insightCardText}>
                    You were active on {consistency.activeDays}{" "}
                    {consistency.activeDays === 1 ? "day" : "days"} in this period.
                  </Text>
                  <Text style={styles.insightCardText}>
                    You completed {consistency.totalWorkouts}{" "}
                    {consistency.totalWorkouts === 1 ? "workout" : "workouts"} total.
                  </Text>
                </>
              ) : null}
            </View>
            <View style={styles.insightCard}>
              <Text style={styles.insightCardTitle}>Best Day</Text>
              <Text style={styles.insightCardText}>
                {bestDayLine ?? "Not enough data for a standout day yet."}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.listHeading}>History</Text>

        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No activity for this period yet.</Text>
          </View>
        ) : (
          filtered.map((w, index) => (
            <View key={w.id} style={styles.listCard}>
              <View style={styles.listTop}>
                <View style={styles.listIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{w.routeName ?? "Workout"}</Text>
                  <Text style={styles.listDate}>
                    {new Date(w.dateISO).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                </View>
                <View style={styles.tagPill}>
                  <Text style={styles.tagText}>{workoutRouteTag(w, index)}</Text>
                </View>
              </View>
              <View style={styles.listMetrics}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Calories</Text>
                  <Text style={styles.metricValue}>{w.calories} cal</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Distance</Text>
                  <Text style={styles.metricValue}>{w.distanceKm.toFixed(1)} km</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Duration</Text>
                  <Text style={styles.metricValue}>{w.durationMin} min</Text>
                </View>
              </View>
              <Text style={styles.difficultyLine}>
                {w.difficulty.charAt(0).toUpperCase() + w.difficulty.slice(1)}
              </Text>
              <Pressable style={styles.viewDetailsBtn} onPress={() => setDetailWorkout(w)}>
                <Text style={styles.viewDetailsText}>View details</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <WorkoutDetailSheet
        visible={detailWorkout !== null}
        workout={detailWorkout}
        onClose={() => setDetailWorkout(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },
  scroll: { padding: 18, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: "900", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 4, marginBottom: 16, fontWeight: "600" },

  filterRow: { flexDirection: "row", gap: 8, paddingBottom: 4, marginBottom: 14 },
  filterChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  filterChipText: { fontSize: 13, fontWeight: "800", color: "#374151" },
  filterChipTextActive: { color: "#FFF" },

  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  summaryRowLast: { marginBottom: 16 },
  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEF0F5",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  summaryCardFlex: { flex: 1 },
  summaryLabel: { fontSize: 11, fontWeight: "800", color: "#9CA3AF" },
  summaryValue: { fontSize: 18, fontWeight: "900", color: "#111827", marginTop: 6 },

  insightsHeading: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
    marginTop: 4,
    marginBottom: 4,
  },
  insightsSub: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 18,
  },
  insightsCards: { gap: 10, marginBottom: 18 },
  insightCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF0F5",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  insightCardTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },
  insightCardText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    lineHeight: 20,
    marginTop: 2,
  },
  insightsEmptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#EEF0F5",
    alignItems: "center",
  },
  insightsEmptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#374151",
    textAlign: "center",
  },
  insightsEmptySub: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },

  listHeading: { fontSize: 17, fontWeight: "900", color: "#111827", marginBottom: 10 },

  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF0F5",
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#6B7280", textAlign: "center" },

  listCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: "#EEF0F5",
  },
  listTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  listIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#7C3AED" },
  listTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  listDate: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  tagPill: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagText: { fontSize: 11, fontWeight: "800", color: "#5B21B6" },
  listMetrics: { flexDirection: "row", marginTop: 12, gap: 10 },
  metricItem: { flex: 1 },
  metricLabel: { fontSize: 11, fontWeight: "800", color: "#9CA3AF", marginBottom: 4 },
  metricValue: { fontSize: 14, fontWeight: "800", color: "#111827" },
  difficultyLine: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
  },
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
