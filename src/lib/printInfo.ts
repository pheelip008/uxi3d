import type { DesignConfig, Layer, SectionDefinition, SizeDefinition } from '../types.ts';
import { longSide } from './geometry.ts';

export type DpiRating = 'good' | 'fair' | 'low';

export interface PrintInfo {
  widthCm: number;
  heightCm: number;
  /** Only for images: pixels per inch at the printed size. */
  dpi?: number;
  rating?: DpiRating;
}

/** How many centimetres of fabric one UV unit covers on this panel. */
export function cmPerUv(section: SectionDefinition, size: SizeDefinition): number {
  return size.widthCm / longSide(section);
}

/** Real printed size of a layer, plus a resolution check for images. */
export function printInfo(
  layer: Layer,
  section: SectionDefinition,
  size: SizeDefinition,
  config: DesignConfig,
): PrintInfo {
  const k = cmPerUv(section, size);
  if (layer.type === 'text') {
    return { widthCm: 0, heightCm: layer.fontSize * k };
  }
  const widthCm = layer.width * k;
  const heightCm = layer.height * k;
  const asset = config.assets[layer.assetId];
  if (!asset) return { widthCm, heightCm };
  const dpi = Math.round(asset.width / (widthCm / 2.54));
  const rating: DpiRating = dpi >= 150 ? 'good' : dpi >= 100 ? 'fair' : 'low';
  return { widthCm, heightCm, dpi, rating };
}