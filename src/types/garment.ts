export type GarmentSilhouette = 'oversized' | 'classic' | 'longsleeve' | 'hoodie';

export type FabricPreset =
  | 'matte-jersey'
  | 'heavy-terry'
  | 'vintage-wash'
  | 'silky-interlock';

export type ProjectionMode = 'full-photo' | 'graphic-decal';

export type BackdropTheme = 'concrete' | 'chalk' | 'obsidian' | 'sand';

export type AppView = 'viewer' | 'lookbook' | 'spec-sheet';

export type Language = 'en' | 'mm';

export interface CropBox {
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
  w: number; // 0..1 normalized
  h: number; // 0..1 normalized
}

export interface ImageCalibration {
  scale: number; // 0.6..1.6
  offsetX: number; // -0.3..0.3
  offsetY: number; // -0.3..0.3
  removeBg: boolean;
  bgTolerance: number; // 8..80
  cropBox?: CropBox;
}

export interface GarmentItem {
  id: string;
  name: string;
  brand: string;
  collection: string;
  designer: string;
  sku: string;
  price: string;
  currency: 'USD' | 'MMK' | 'EUR' | 'JPY';
  fabric: string;
  gsm: string;
  fitCut: string;
  printMethod: string;
  sizes: string[];
  careNotes: string;
  description: string;
  silhouette: GarmentSilhouette;
  fabricPreset: FabricPreset;
  projectionMode: ProjectionMode;
  baseColor: string;
  frontImage: string | null;
  backImage: string | null;
  frontCalibration: ImageCalibration;
  backCalibration: ImageCalibration;
  updatedAt: number;
}

export const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

export const DEFAULT_CALIBRATION: ImageCalibration = {
  scale: 1.0,
  offsetX: 0,
  offsetY: 0,
  removeBg: true,
  bgTolerance: 28,
};
