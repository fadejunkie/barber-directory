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
    console.log("Geocode Response Status:", response.status);

    if (!response.ok) {
      console.error("Geocode Error Body:", await response.text());
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

/**
 * Fetches place suggestions for a partial query.
 * Limits to 5 results, US only.
 */
export const getPlaceSuggestions = async (query: string): Promise<GeocodeResult[]> => {
  if (!query || query.length < 3) return [];

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'us'
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`);

    if (!response.ok) return [];

    const data = await response.json();

    if (Array.isArray(data)) {
      return data.map((result: any) => ({
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        display_name: result.display_name
      }));
    }

    return [];
  } catch (error) {
    console.warn('Error fetching suggestions:', error);
    return [];
  }
};
