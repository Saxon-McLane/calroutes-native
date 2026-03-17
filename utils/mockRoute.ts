/**
 * Mock route coordinates for map display.
 * TODO: replace with real Routes API (Google Routes API) — this returns a small walking loop around the user.
 */

export type LatLng = { latitude: number; longitude: number };

/**
 * Generates 3–4 nearby points around the user to form a walking loop (polyline).
 * Approx 150–400 m per side. Replace with Google Routes API response when integrated.
 */
export function getMockRouteCoordinates(center: LatLng): LatLng[] {
  const { latitude, longitude } = center;
  // ~0.001 deg ≈ 100–110 m at mid latitudes; small loop
  const d = 0.0018;
  return [
    { latitude, longitude },
    { latitude: latitude + d, longitude },
    { latitude: latitude + d * 0.9, longitude: longitude + d },
    { latitude: latitude + d * 0.2, longitude: longitude + d * 0.85 },
    { latitude, longitude },
  ];
}
