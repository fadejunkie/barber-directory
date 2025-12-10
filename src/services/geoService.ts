import type { GeocodeResult } from '../types';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Geocodes a query string (Zip or City) using OpenStreetMap.
 * Returns null if not found or error.
 */
export const geocodeQuery = async (query: string): Promise<GeocodeResult | null> => {
  if (!query) return null;

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '1',
      countrycodes: 'us' // Restrict to US for this specific use case
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        display_name: result.display_name
      };
    }

    return null;
  } catch (error) {
    console.error('Error during geocoding:', error);
    return null;
  }
};
