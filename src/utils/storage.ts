import type { GarmentItem } from '../types/garment';
import { createDefaultGarments } from '../data/defaultGarments';

const STORAGE_KEY = 'atelier360_garments_v1';
const ACTIVE_ID_KEY = 'atelier360_active_garment_v1';

export function loadSavedGarments(): GarmentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultGarments();
    }
    const parsed = JSON.parse(raw) as GarmentItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return createDefaultGarments();
    }
    return parsed;
  } catch {
    return createDefaultGarments();
  }
}

export function saveGarments(garments: GarmentItem[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(garments));
    return true;
  } catch {
    // Handle storage quota gracefully without crashing app
    return false;
  }
}

export function loadActiveGarmentId(fallbackId: string): string {
  try {
    return localStorage.getItem(ACTIVE_ID_KEY) || fallbackId;
  } catch {
    return fallbackId;
  }
}

export function saveActiveGarmentId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_ID_KEY, id);
  } catch {
    // ignore storage errors
  }
}
