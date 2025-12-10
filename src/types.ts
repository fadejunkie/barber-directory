
export interface Coords {
  lat: number;
  lng: number;
}

export interface School {
  id: string;
  name: string;
  address: string;
  coords: Coords | null;
  website: string | null;
  phone: string | null;
  _distance?: number; // Runtime calculated property
  
  // Status for sorting and badges
  status: "regular" | "verified" | "featured";

  // Optional detailed fields for Mini Profile
  programs?: string[];
  schedule?: string;
  hours_required?: number;
  tuition?: string;
  description?: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}
