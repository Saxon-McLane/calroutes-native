import React from "react";
import { StyleSheet, View } from "react-native";
import type { LatLng } from "@/utils/mockRoute";

type Props = {
  userLocation: LatLng | null;
  mockRouteCoords: LatLng[];
};

/**
 * Web: no react-native-maps — render a map-like frame (terrain + route stroke)
 * so the results screen reads as a real map container.
 */
export default function RouteMapWeb(_props: Props) {
  return (
    <View style={styles.shell}>
      <View style={styles.sky} />
      <View style={styles.ground}>
        {/* subtle grid */}
        {Array.from({ length: 8 }).map((_, i) => (
          <View
            key={`grid-v-${i}`}
            style={[styles.gridLineV, { left: `${12 + i * 11}%` }]}
          />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={`grid-h-${i}`}
            style={[styles.gridLineH, { top: `${10 + i * 16}%` }]}
          />
        ))}
        {/* pseudo “roads” */}
        <View style={styles.roadA} />
        <View style={styles.roadB} />
        {/* route polyline approximation */}
        <View style={styles.routeStroke} />
        <View style={styles.routeGlow} />
        {/* start / end markers */}
        <View style={styles.markerStart} />
        <View style={styles.markerEnd} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  sky: {
    height: "34%",
    backgroundColor: "#BFDBFE",
  },
  ground: {
    flex: 1,
    backgroundColor: "#D8E2DC",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden",
  },
  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  gridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  roadA: {
    position: "absolute",
    left: "-10%",
    top: "42%",
    width: "120%",
    height: 14,
    backgroundColor: "rgba(255,255,255,0.55)",
    transform: [{ rotate: "-8deg" }],
    borderRadius: 4,
  },
  roadB: {
    position: "absolute",
    left: "18%",
    top: "18%",
    width: 10,
    height: "78%",
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: 4,
  },
  routeStroke: {
    position: "absolute",
    left: "14%",
    top: "52%",
    width: "78%",
    height: 5,
    borderRadius: 999,
    backgroundColor: "#7C3AED",
    transform: [{ rotate: "-18deg" }],
    opacity: 0.95,
  },
  routeGlow: {
    position: "absolute",
    left: "12%",
    top: "50%",
    width: "82%",
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.22)",
    transform: [{ rotate: "-18deg" }],
  },
  markerStart: {
    position: "absolute",
    left: "12%",
    top: "46%",
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  markerEnd: {
    position: "absolute",
    right: "14%",
    top: "36%",
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
