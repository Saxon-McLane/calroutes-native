import React from "react";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { StyleSheet } from "react-native";
import type { LatLng } from "@/utils/mockRoute";

type Props = {
  userLocation: LatLng | null;
  mockRouteCoords: LatLng[];
};

const INITIAL_REGION_DELTA = { latitudeDelta: 0.008, longitudeDelta: 0.008 };

export default function RouteMapNative({ userLocation, mockRouteCoords }: Props) {
  if (!userLocation) return null;

  return (
    <MapView
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={{
        ...userLocation,
        ...INITIAL_REGION_DELTA,
      }}
      region={{
        ...userLocation,
        ...INITIAL_REGION_DELTA,
      }}
      showsUserLocation={false}
    >
      <Marker coordinate={userLocation} title="You" />
      {mockRouteCoords.length > 1 ? (
        <Polyline
          coordinates={mockRouteCoords}
          strokeColor="#7C3AED"
          strokeWidth={4}
        />
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: "100%",
  },
});

