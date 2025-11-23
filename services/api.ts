import { Zone, Coordinates, LocationCheckResult } from '../types';

let API_BASE_URL = 'http://localhost:3001/api';

export const setBaseUrl = (url: string) => {
  // Remove trailing slash if present
  const cleanUrl = url.replace(/\/$/, '');
  // If user didn't include /api, add it, unless they are just setting the root domain
  API_BASE_URL = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const fetchZones = async (): Promise<Zone[]> => {
  const response = await fetch(`${API_BASE_URL}/zones`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
};

export const createZone = async (zone: Omit<Zone, 'id'>): Promise<Zone> => {
  const response = await fetch(`${API_BASE_URL}/zones`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(zone),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
};

export const checkLocation = async (coords: Coordinates): Promise<LocationCheckResult> => {
  const response = await fetch(`${API_BASE_URL}/check-location`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(coords),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
};
