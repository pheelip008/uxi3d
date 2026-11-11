// Compressed copies of the supplied models: about 0.55 MB each instead of 10 MB, with the
// same triangles and UVs (Meshopt geometry, 1024 px WebP textures). Made with:
//   npx @gltf-transform/cli optimize in.glb out.glb --simplify false --texture-compress webp --texture-size 1024
// Importing them gives each file a hashed name, so browsers can cache it for good.
import model5x5 from '../assets/models/tent-5x5.glb?url';
import model6x6 from '../assets/models/tent-6.5x6.5.glb?url';
import model8x8 from '../assets/models/tent-8x8.glb?url';
import type { Point, ProductDefinition, SectionDefinition, SizeDefinition } from '../types.ts';

// Panel outlines measured from each model's UV map (UV units, y down).
// "front" is the +Z side of the model; left and right are as seen from the front.
// All three models share the same layout: 4 peak triangles and 4 valance strips.
type Outlines = Record<string, Point[]>;

const OUTLINES_5X5: Outlines = {
  peak_front: [[0.506, 0.535], [0.743, 0.87], [0.255, 0.87]],
  peak_back: [[0.256, 0.13], [0.741, 0.133], [0.498, 0.467]],
  peak_left: [[0.116, 0.257], [0.453, 0.5], [0.116, 0.741]],
  peak_right: [[0.53, 0.499], [0.864, 0.252], [0.864, 0.736]],
  valance_front: [[0.255, 0.881], [0.746, 0.881], [0.746, 0.969], [0.255, 0.969]],
  valance_back: [[0.256, 0.033], [0.742, 0.033], [0.742, 0.122], [0.256, 0.122]],
  valance_left: [[0.021, 0.256], [0.109, 0.256], [0.109, 0.742], [0.021, 0.742]],
  valance_right: [[0.876, 0.242], [0.966, 0.242], [0.966, 0.733], [0.876, 0.733]],
};

const OUTLINES_6_5X6_5: Outlines = {
  peak_front: [[0.5, 0.517], [0.733, 0.882], [0.27, 0.882]],
  peak_back: [[0.266, 0.12], [0.728, 0.12], [0.499, 0.485]],
  peak_left: [[0.118, 0.27], [0.483, 0.502], [0.118, 0.733]],
  peak_right: [[0.519, 0.4995], [0.884, 0.268], [0.884, 0.731]],
  valance_front: [[0.268, 0.89], [0.73, 0.89], [0.73, 0.996], [0.268, 0.996]],
  valance_back: [[0.262, 0.006], [0.725, 0.006], [0.725, 0.113], [0.262, 0.113]],
  valance_left: [[0.005, 0.273], [0.111, 0.273], [0.111, 0.736], [0.005, 0.736]],
  valance_right: [[0.89, 0.268], [0.997, 0.268], [0.997, 0.731], [0.89, 0.731]],
};

const OUTLINES_8X8: Outlines = {
  peak_front: [[0.497, 0.534], [0.786, 0.892], [0.21, 0.892]],
  peak_back: [[0.216, 0.116], [0.791, 0.118], [0.503, 0.475]],
  peak_left: [[0.105, 0.224], [0.461, 0.513], [0.104, 0.8]],
  peak_right: [[0.529, 0.513], [0.885, 0.227], [0.885, 0.803]],
  valance_front: [[0.211, 0.899], [0.785, 0.899], [0.785, 0.976], [0.211, 0.976]],
  valance_back: [[0.217, 0.031], [0.79, 0.031], [0.79, 0.108], [0.217, 0.108]],
  valance_left: [[0.012, 0.225], [0.089, 0.225], [0.089, 0.799], [0.012, 0.799]],
  valance_right: [[0.896, 0.226], [0.972, 0.226], [0.972, 0.801], [0.896, 0.801]],
};

// Upright angles: the front panels are drawn the right way up on the texture,
// the back panels upside down and the side panels turned by 90 degrees.
const SECTION_META: Omit<SectionDefinition, 'polygon'>[] = [
  { id: 'peak_front', label: 'Front peak', kind: 'peak', side: 'front', upright: 0 },
  { id: 'peak_back', label: 'Back peak', kind: 'peak', side: 'back', upright: 180 },
  { id: 'peak_left', label: 'Left peak', kind: 'peak', side: 'left', upright: 90 },
  { id: 'peak_right', label: 'Right peak', kind: 'peak', side: 'right', upright: -90 },
  { id: 'valance_front', label: 'Front valance', kind: 'valance', side: 'front', upright: 0 },
  { id: 'valance_back', label: 'Back valance', kind: 'valance', side: 'back', upright: 180 },
  { id: 'valance_left', label: 'Left valance', kind: 'valance', side: 'left', upright: 90 },
  { id: 'valance_right', label: 'Right valance', kind: 'valance', side: 'right', upright: -90 },
];

function buildSections(outlines: Outlines): SectionDefinition[] {
  return SECTION_META.map((meta) => ({ ...meta, polygon: outlines[meta.id] }));
}

export const TENT: ProductDefinition = {
  id: 'custom-canopy-tent',
  title: 'Custom Canopy Tent',
  printMaterial: 'fabric_Mat',
  frameMaterial: 'Metal_mat',
  frames: [
    { id: 'frame', label: 'Canopy + frame' },
    { id: 'canopy-only', label: 'Canopy only' },
  ],
  sizes: [
    {
      id: '5x5',
      label: '5 x 5 ft',
      modelUrl: model5x5,
      modelScale: [1, 1, 1],
      widthCm: 152,
      sections: buildSections(OUTLINES_5X5),
    },
    {
      id: '6.5x6.5',
      label: '6.5 x 6.5 ft',
      modelUrl: model6x6,
      // This model was exported at 5 ft wide, so stretch it to 6.5 ft.
      modelScale: [1.3, 1, 1.3],
      widthCm: 198,
      sections: buildSections(OUTLINES_6_5X6_5),
    },
    {
      id: '8x8',
      label: '8 x 8 ft',
      modelUrl: model8x8,
      modelScale: [1, 1, 1],
      widthCm: 244,
      sections: buildSections(OUTLINES_8X8),
    },
  ],
};

export const DEFAULT_SIZE_ID = '8x8';

export function getSize(sizeId: string): SizeDefinition {
  return TENT.sizes.find((s) => s.id === sizeId) ?? TENT.sizes[0];
}

export function getSection(size: SizeDefinition, sectionId: string): SectionDefinition {
  return size.sections.find((s) => s.id === sectionId) ?? size.sections[0];
}

export function getFrameLabel(frameId: string): string {
  return TENT.frames.find((f) => f.id === frameId)?.label ?? frameId;
}

/** Standard fabric colours. Anything else counts as a custom colour match. */
export const STANDARD_COLOURS = [
  { name: 'White', hex: '#ffffff' },
  { name: 'Black', hex: '#111111' },
  { name: 'Charcoal', hex: '#4b5563' },
  { name: 'Silver', hex: '#c0c4ca' },
  { name: 'Red', hex: '#c8102e' },
  { name: 'Maroon', hex: '#7f1d1d' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Yellow', hex: '#facc15' },
  { name: 'Lime', hex: '#84cc16' },
  { name: 'Green', hex: '#15803d' },
  { name: 'Teal', hex: '#0f766e' },
  { name: 'Sky', hex: '#38bdf8' },
  { name: 'Royal blue', hex: '#1d4ed8' },
  { name: 'Navy', hex: '#0b2545' },
  { name: 'Purple', hex: '#7e22ce' },
  { name: 'Pink', hex: '#ec4899' },
];

export function isStandardColour(hex: string): boolean {
  return STANDARD_COLOURS.some((c) => c.hex === hex.toLowerCase());
}