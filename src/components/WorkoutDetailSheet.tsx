import type { Workout } from "@/src/store/AppStore";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";

type Props = {
  visible: boolean;
  workout: Workout | null;
  onClose: () => void;
};

export function WorkoutDetailSheet({ visible, workout, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={styles.modalSheet}
          onPress={(e: GestureResponderEvent) => e.stopPropagation()}
        >
          <Text style={styles.modalTitle}>Workout details</Text>
          {workout ? (
            <>
              <Text style={styles.modalRoute}>{workout.routeName ?? "Workout"}</Text>
              <Text style={styles.modalMeta}>{new Date(workout.dateISO).toLocaleString()}</Text>
              <View style={styles.modalStats}>
                <View style={styles.modalStat}>
                  <Text style={styles.modalStatLabel}>Calories</Text>
                  <Text style={styles.modalStatValue}>{workout.calories} cal</Text>
                </View>
                <View style={styles.modalStat}>
                  <Text style={styles.modalStatLabel}>Distance</Text>
                  <Text style={styles.modalStatValue}>{workout.distanceKm.toFixed(2)} km</Text>
                </View>
                <View style={styles.modalStat}>
                  <Text style={styles.modalStatLabel}>Duration</Text>
                  <Text style={styles.modalStatValue}>{workout.durationMin} min</Text>
                </View>
                <View style={styles.modalStat}>
                  <Text style={styles.modalStatLabel}>Difficulty</Text>
                  <Text style={styles.modalStatValue}>
                    {workout.difficulty.charAt(0).toUpperCase() + workout.difficulty.slice(1)}
                  </Text>
                </View>
              </View>
            </>
          ) : null}
          <Pressable style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 22,
    paddingBottom: 28,
  },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  modalRoute: { fontSize: 20, fontWeight: "900", color: "#111827", marginTop: 10 },
  modalMeta: { fontSize: 13, color: "#6B7280", marginTop: 6 },
  modalStats: { marginTop: 16, gap: 12 },
  modalStat: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalStatLabel: { fontSize: 14, color: "#6B7280", fontWeight: "700" },
  modalStatValue: { fontSize: 15, fontWeight: "900", color: "#111827" },
  modalClose: {
    marginTop: 20,
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCloseText: { color: "#FFF", fontWeight: "900", fontSize: 15 },
});
