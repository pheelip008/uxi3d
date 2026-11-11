// Shared types for the configurator.
//
// All positions and sizes are in UV units: 0..1 across the canopy texture,
// with y pointing down (the glTF convention). That keeps a design independent
// of screen size and texture resolution, and the 2D editor, the 3D texture
// and the PDF can all draw the same data.

export type Point = [number, number];

export type SectionKind = 'peak' | 'valance';
export type Side = 'front' | 'back' | 'left' | 'right';

/** One printable panel of the product, e.g. the front peak. */
export interface SectionDefinition {
  id: string;
  label: string;
  kind: SectionKind;
  side: Side;
  /** Outline of the panel on the texture (UV units). */
  polygon: Point[];
  /** Rotation in degrees that makes content read upright on the 3D model. */
  upright: number;
}

/** One size of the product: its 3D model and where each panel sits on the texture. */
export interface SizeDefinition {
  id: string;
  label: string;
  modelUrl: string;
  /** Corrects a model that was not exported at its real size. */
  modelScale: [number, number, number];
  /** Real width of one side in cm (peak base and valance length), used for print sizes. */
  widthCm: number;
  sections: SectionDefinition[];
}

export interface OptionChoice {
  id: string;
  label: string;
}

/** Everything the configurator needs to know about a product. */
export interface ProductDefinition {
  id: string;
  title: string;
  sizes: SizeDefinition[];
  frames: OptionChoice[];
  /** Material on the model that receives the design texture. */
  printMaterial: string;
  /** Material that is hidden when the customer orders the canopy without a frame. */
  frameMaterial: string;
}

interface LayerBase {
  id: string;
  sectionId: string;
  /** Centre of the layer (UV units). */
  x: number;
  y: number;
  /** Degrees, clockwise on the layout. */
  rotation: number;
  /** 0..1 */
  opacity: number;
}

export interface TextLayer extends LayerBase {
  type: 'text';
  text: string;
  fontFamily: string;
  /** Font size in UV units. */
  fontSize: number;
  bold: boolean;
  italic: boolean;
  color: string;
}

export interface ImageLayer extends LayerBase {
  type: 'image';
  assetId: string;
  width: number;
  height: number;
}

export type Layer = TextLayer | ImageLayer;

/** An uploaded image. Kept inside the design so a saved design can be reopened. */
export interface ImageAsset {
  id: string;
  name: string;
  /** Data URL of the original file. */
  src: string;
  /** Original size in pixels, used for the print resolution check. */
  width: number;
  height: number;
}

/** The saved configuration. This is the single source of truth for the design. */
export interface DesignConfig {
  schemaVersion: 1;
  id: string;
  productId: string;
  sizeId: string;
  frame: string;
  sections: Record<string, { color: string }>;
  layers: Layer[];
  assets: Record<string, ImageAsset>;
  updatedAt: string;
}