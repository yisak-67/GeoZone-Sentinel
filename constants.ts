export const DEFAULT_CENTER = { lat: 9.005401, lng: 38.763611 }; // Addis Ababa, as per prompt context
export const DEFAULT_ZOOM = 13;

// Haversine formula to simulate PostGIS ST_DWithin on the client side
export const calculateDistanceMeters = (coord1: {lat: number, lng: number}, coord2: {lat: number, lng: number}): number => {
  const R = 6371e3; // metres
  const φ1 = (coord1.lat * Math.PI) / 180; // φ, λ in radians
  const φ2 = (coord2.lat * Math.PI) / 180;
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};