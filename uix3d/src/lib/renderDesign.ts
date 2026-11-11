import type { DesignConfig, Point, SizeDefinition, TextLayer } from '../types.ts';
import { ensureFontLoaded, fontString } from './fonts.ts';
import { sectionAnchor } from './geometry.ts';
import { getDecodedImage } from './images.ts';

/** Resolution of the canopy texture. */
export const TEXTURE_SIZE = 2048;

/** Colour of texture areas that belong to no panel (seams and hems). */
const UNUSED_AREA = '#d5dae1';
const LINE_HEIGHT = 1.15;

function tracePolygon(ctx: CanvasRenderingContext2D, polygon: Point[], scale: number) {
  ctx.beginPath();
  polygon.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x * scale, y * scale);
    else ctx.lineTo(x * scale, y * scale);
  });
  ctx.closePath();
}

let measureCtx: CanvasRenderingContext2D | null = null;

/** Size of a text layer in UV units. The editor needs it for hit boxes and handles. */
export function measureText(layer: TextLayer): { width: number; height: number } {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  const px = 100;
  const lines = layer.text.split('\n');
  let widest = px * 0.4;
  if (measureCtx) {
    measureCtx.font = fontString(layer, px);
    for (const line of lines) widest = Math.max(widest, measureCtx.measureText(line).width);
  }
  const k = layer.fontSize / px;
  return { width: widest * k, height: lines.length * px * LINE_HEIGHT * k };
}

export interface RenderOptions {
  /** Draw a UV grid and the panel names on top (editor aid, never printed). */
  guides?: boolean;
}

/** Grid every 0.05 UV plus each panel's outline and name, so you can see how 2D maps onto the model. */
function drawGuides(ctx: CanvasRenderingContext2D, size: SizeDefinition, S: number) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  ctx.lineWidth = Math.max(1, S * 0.0007);
  ctx.strokeStyle = 'rgba(236, 0, 140, 0.45)';
  ctx.beginPath();
  for (let i = 1; i < 20; i++) {
    const v = (i / 20) * S;
    ctx.moveTo(v, 0);
    ctx.lineTo(v, S);
    ctx.moveTo(0, v);
    ctx.lineTo(S, v);
  }
  ctx.stroke();

  ctx.lineWidth = S * 0.002;
  ctx.setLineDash([S * 0.008, S * 0.005]);
  ctx.strokeStyle = '#ec008c';
  for (const section of size.sections) {
    tracePolygon(ctx, section.polygon, S);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.font = `700 ${Math.round(S * 0.017)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const section of size.sections) {
    const [x, y] = sectionAnchor(section);
    const label = section.label.toUpperCase();
    ctx.save();
    ctx.translate(x * S, y * S);
    ctx.rotate((section.upright * Math.PI) / 180);
    ctx.lineWidth = S * 0.004;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(label, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Draw the whole design onto a square canvas laid out like the model's UV map.
 * This one function feeds the 3D texture, the 2D editor background and the PDF,
 * so all three always match.
 */
export function renderDesign(
  canvas: HTMLCanvasElement,
  config: DesignConfig,
  size: SizeDefinition,
  options: RenderOptions = {},
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const S = canvas.width;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = UNUSED_AREA;
  ctx.fillRect(0, 0, S, S);

  // 1. Panel colours. The stroke adds a little bleed so texture filtering never shows a seam.
  ctx.lineJoin = 'round';
  ctx.lineWidth = S * 0.008;
  for (const section of size.sections) {
    const color = config.sections[section.id]?.color ?? '#ffffff';
    tracePolygon(ctx, section.polygon, S);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  // 2. Artwork in list order (last on top), each clipped to its own panel.
  for (const layer of config.layers) {
    const section = size.sections.find((s) => s.id === layer.sectionId);
    if (!section) continue;

    ctx.save();
    tracePolygon(ctx, section.polygon, S);
    ctx.clip();
    ctx.translate(layer.x * S, layer.y * S);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.globalAlpha = layer.opacity;

    if (layer.type === 'text') {
      ensureFontLoaded(layer);
      const px = layer.fontSize * S;
      const lines = layer.text.split('\n');
      ctx.font = fontString(layer, px);
      ctx.fillStyle = layer.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      lines.forEach((line, i) => {
        ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * px * LINE_HEIGHT);
      });
    } else {
      const asset = config.assets[layer.assetId];
      const img = asset ? getDecodedImage(asset) : null;
      if (img) {
        const w = layer.width * S;
        const h = layer.height * S;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      }
    }
    ctx.restore();
  }

  if (options.guides) drawGuides(ctx, size, S);
}