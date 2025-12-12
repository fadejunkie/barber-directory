import type { Coords, School } from "../types";
import { distanceMiles } from "./distance";

/**
 * Calculates the diagonal distance (spread) in miles of the bounding box
 * containing all the provided coordinates.
 * 
 * Returns 0 if 0 or 1 coords provided.
 */
export function calculateGeographicSpread(schools: School[]): number {
    const coords = schools
        .map(s => s.coords)
        .filter((c): c is Coords => c !== null);

    if (coords.length < 2) return 0;

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    for (const c of coords) {
        if (c.lat < minLat) minLat = c.lat;
        if (c.lat > maxLat) maxLat = c.lat;
        if (c.lng < minLng) minLng = c.lng;
        if (c.lng > maxLng) maxLng = c.lng;
    }

    // Calculate diagonal distance between (minLat, minLng) and (maxLat, maxLng)
    return distanceMiles(
        { lat: minLat, lng: minLng },
        { lat: maxLat, lng: maxLng }
    );
}
