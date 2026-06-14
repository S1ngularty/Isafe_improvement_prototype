// Nominatim Geocoding Service for address search in Philippines
// API: https://nominatim.openstreetmap.org/

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function searchAddress(query) {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      countrycodes: "ph", // Philippines only
      format: "json",
      limit: 10,
    });

    const response = await fetch(`${NOMINATIM_URL}?${params}`);
    if (!response.ok) throw new Error("Geocoding API error");

    const data = await response.json();
    return data.map((result) => ({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      display_name: result.display_name,
    }));
  } catch (error) {
    console.error("[searchAddress] Error:", error);
    throw error;
  }
}

export async function reverseGeocode(lat, lng) {
  try {
    const params = new URLSearchParams({
      lat,
      lon: lng,
      format: "json",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`
    );
    if (!response.ok) throw new Error("Reverse geocoding API error");

    const data = await response.json();
    return {
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
      address: data.address?.city || data.address?.town || data.display_name,
      display_name: data.display_name,
    };
  } catch (error) {
    console.error("[reverseGeocode] Error:", error);
    throw error;
  }
}
