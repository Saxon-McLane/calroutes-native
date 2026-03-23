import type React from "react";
import type { LatLng } from "@/utils/mockRoute";

type Props = {
  userLocation: LatLng | null;
  mockRouteCoords: LatLng[];
};

declare const RouteMap: React.ComponentType<Props>;

export default RouteMap;

