import type { Point, SectionDefinition } from '../types.ts';

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

export function boundingBox(polygon: Point[]): Box {
  const xs = polygon.map((p) => p[0]);
  const ys = polygon.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
}

/** Ray casting test: is the point inside the polygon? */
export function pointInPolygon([x, y]: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Where new content goes: the average of the corners (a third of the way up a peak). */
export function sectionAnchor(section: SectionDefinition): Point {
  const n = section.polygon.length;
  const x = section.polygon.reduce((sum, p) => sum + p[0], 0) / n;
  const y = section.polygon.reduce((sum, p) => sum + p[1], 0) / n;
  return [x, y];
}

/** Length of the long side (peak base or valance length) in UV units. */
export function longSide(section: SectionDefinition): number {
  const box = boundingBox(section.polygon);
  return Math.max(box.width, box.height);
}

/** Length of the short side (peak height or valance depth) in UV units. */
export function shortSide(section: SectionDefinition): number {
  const box = boundingBox(section.polygon);
  return Math.min(box.width, box.height);
}

/** Rotate a vector clockwise (y points down) by a number of degrees. */
export function rotate([x, y]: Point, degrees: number): Point {
  const r = (degrees * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [x * cos - y * sin, x * sin + y * cos];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Keep wrapping angles in the -180..180 range. */
export function normalizeAngle(degrees: number): number {
  let a = degrees % 360;
  if (a > 180) a -= 360;
  if (a <= -180) a += 360;
  return Math.round(a * 100) / 100;
}

/**
 * Move a point from one section to another, keeping its place relative to the
 * section. Used to copy artwork to the other peaks and to keep a design when
 * the customer switches tent size.
 */
export function mapBetweenSections(
  point: Point,
  from: SectionDefinition,
  to: SectionDefinition,
): { point: Point; rotationDelta: number; scale: number } {
  const [fx, fy] = sectionAnchor(from);
  const [tx, ty] = sectionAnchor(to);
  const rotationDelta = to.upright - from.upright;
  const scale = longSide(to) / longSide(from);
  const [dx, dy] = rotate([point[0] - fx, point[1] - fy], rotationDelta);
  return { point: [tx + dx * scale, ty + dy * scale], rotationDelta, scale };
}