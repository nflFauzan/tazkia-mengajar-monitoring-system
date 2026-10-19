import { describe, expect, it } from "vitest";

import {
  calculateDistanceMeters,
  checkGeofence,
  formatDistance,
} from "./geo";

describe("geo utility - distance & geofencing", () => {
  it("returns 0 meters for identical coordinates", () => {
    const lat = -6.589123;
    const lon = 106.789123;
    expect(calculateDistanceMeters(lat, lon, lat, lon)).toBe(0);
  });

  it("calculates realistic distance between two real-world coordinates", () => {
    // Monas Jakarta: -6.175392, 106.827153
    // Masjid Istiqlal: -6.170200, 106.831500
    // Expected distance is approx ~750 meters
    const dist = calculateDistanceMeters(
      -6.175392,
      106.827153,
      -6.1702,
      106.8315,
    );

    expect(dist).toBeGreaterThan(700);
    expect(dist).toBeLessThan(850);
  });

  it("correctly identifies when coordinate is inside geofence radius", () => {
    // Point A and Point B approx 40 meters apart
    const lat1 = -6.5891;
    const lon1 = 106.7891;
    const lat2 = -6.5893;
    const lon2 = 106.7892;

    const result = checkGeofence(lat1, lon1, lat2, lon2, 100);
    expect(result.isInside).toBe(true);
    expect(result.distanceMeters).toBeLessThanOrEqual(100);
    expect(result.radiusMeters).toBe(100);
  });

  it("correctly identifies when coordinate is outside geofence radius", () => {
    // Point A and Point B approx 800 meters apart
    const result = checkGeofence(
      -6.175392,
      106.827153,
      -6.1702,
      106.8315,
      100,
    );

    expect(result.isInside).toBe(false);
    expect(result.distanceMeters).toBeGreaterThan(100);
  });

  it("formats distance for human readability", () => {
    expect(formatDistance(45)).toBe("45 m");
    expect(formatDistance(999)).toBe("999 m");
    expect(formatDistance(1000)).toBe("1.0 km");
    expect(formatDistance(1540)).toBe("1.5 km");
    expect(formatDistance(12400)).toBe("12.4 km");
  });
});
