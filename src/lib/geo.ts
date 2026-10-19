/**
 * Geolocation and geofencing utilities.
 *
 * Provides distance calculation based on the spherical Haversine formula
 * and geofence boundary validation without needing any third-party paid APIs.
 */

export const EARTH_RADIUS_METERS = 6371000;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the great-circle distance between two points on the Earth surface in meters.
 * Uses the Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c);
}

export interface GeofenceResult {
  isInside: boolean;
  distanceMeters: number;
  radiusMeters: number;
}

/**
 * Checks whether the current coordinates are within the target location's radius.
 */
export function checkGeofence(
  targetLat: number,
  targetLon: number,
  currentLat: number,
  currentLon: number,
  radiusMeters: number = 100,
): GeofenceResult {
  const distanceMeters = calculateDistanceMeters(
    targetLat,
    targetLon,
    currentLat,
    currentLon,
  );

  return {
    isInside: distanceMeters <= radiusMeters,
    distanceMeters,
    radiusMeters,
  };
}

/**
 * Human-readable distance formatting (e.g., "45 m", "1.2 km").
 */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }
  const km = (distanceMeters / 1000).toFixed(1);
  return `${km} km`;
}
