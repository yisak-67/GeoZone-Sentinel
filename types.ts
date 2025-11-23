export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Zone {
  id: string;
  name: string;
  center: Coordinates;
  radiusMeters: number;
  description?: string;
}

export interface LocationCheckResult {
  inZone: boolean;
  matchedZones: Zone[];
  userLocation: Coordinates;
}

export enum Tab {
  MANAGE = 'MANAGE',
  CHECK = 'CHECK',
  BACKEND_DOCS = 'BACKEND_DOCS'
}