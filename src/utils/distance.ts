import type { Coords } from "../types";

/**
 * Calculate the distance between two coordinates in miles using the Haversine formula.
 * If either coordinate is missing, returns Infinity so those results can be sorted last.
 */
export function distanceMiles(a: Coords | null, b: Coords | null): number {
  if (!a || !b) return Infinity;

  const R = 3958.8; // Earth radius in miles

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  const distance = R * c;

  // Round to 1 decimal place to avoid ugly long floats
  return Math.round(distance * 10) / 10;
}
