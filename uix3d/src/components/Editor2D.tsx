import type Konva from 'konva';
import { useEffect, useRef, useState } from 'react';
import {
  Group,
  Image as KonvaImage,
  Layer as KonvaLayer,
  Line,
  Rect,
  Stage,
  Text as KonvaText,
  Transformer,
} from 'react-konva';
import { getSection, getSize } from '../data/tent.ts';
import { designCanvas, useSurfaceVersion } from '../lib/designSurface.ts';
import { boundingBox, clamp, normalizeAngle, pointInPolygon, sectionAnchor } from '../lib/geometry.ts';
import { measureText } from '../lib/renderDesign.ts';
import { useDesignStore, type EditorView, type LayerPatch } from '../store/designStore.ts';
import type { Layer, SectionDefinition } from '../types.ts';

const ACCENT = '#2563eb';

function layerSize(layer: Layer) {
  return layer.type === 'text' ? measureText(layer) : { width: layer.width, height: layer.height };
}

/** Group transform that shows either the whole UV layout or one panel, turned upright. */
function computeView(width: number, height: number, section: SectionDefinition, mode: EditorView) {
  if (mode === 'section') {
    const box = boundingBox(section.polygon);
    const turned = Math.abs(section.upright) === 90;
    const w = turned ? box.height : box.width;
    const h = turned ? box.width : box.height;
    const scale = Math.min(width / (w * 1.12), height / (h * 1.3));
    return { x: width / 2, y: height / 2, offsetX: box.cx, offsetY: box.cy, rotation: -section.upright, scale };
  }
  return { x: width / 2, y: height / 2, offsetX: 0.5, offsetY: 0.5, rotation: 0, scale: Math.min(width, height) * 0.97 };
}

function setCursor(e: Konva.KonvaEventObject<MouseEvent>, cursor: string) {
  const container = e.target.getStage()?.container();
  if (container) container.style.cursor = cursor;
}

export function Editor2D() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<Konva.Group>(null);
  const backgroundRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodes = useRef(new Map<string, Konva.Rect>());
  // While Konva scales a node during a resize, we keep drawing it at its starting size.
  const transforming = useRef<{ id: string; base: Layer } | null>(null);
  const [frozen, setFrozen] = useState<{ id: string; width: number; height: number } | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const config = useDesignStore((s) => s.config);
  const selectedSectionId = useDesignStore((s) => s.selectedSectionId);
  const selectedLayerId = useDesignStore((s) => s.selectedLayerId);
  const editorView = useDesignStore((s) => s.editorView);
  const version = useSurfaceVersion((s) => s.version);
  const { selectSection, selectLayer, updateLayer, setEditorView } = useDesignStore.getState();

  const size = getSize(config.sizeId);
  const selectedSection = getSection(size, selectedSectionId);
  const view = computeView(box.width, box.height, selectedSection, editorView);

  // Keep the stage the same size as its container.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setBox({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The background is the shared design canvas: repaint when it changes.
  useEffect(() => {
    backgroundRef.current?.getLayer()?.batchDraw();
  }, [version]);

  // Attach the resize/rotate handles to the selected layer.
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const node = selectedLayerId ? nodes.current.get(selectedLayerId) : undefined;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  });

  function handleStagePointerDown(e: Konva.KonvaEventObject<PointerEvent>) {
    if (e.target !== e.target.getStage()) return; // a layer or a handle handles itself
    const pos = groupRef.current?.getRelativePointerPosition();
    if (!pos) return;
    const hit = size.sections.find((s) => pointInPolygon([pos.x, pos.y], s.polygon));
    selectLayer(null);
    if (hit) selectSection(hit.id);
  }

  function handleDragMove(layer: Layer, node: Konva.Node) {
    // Keep the layer's centre on its own panel.
    const b = boundingBox(getSection(size, layer.sectionId).polygon);
    const x = clamp(node.x(), b.minX, b.maxX);
    const y = clamp(node.y(), b.minY, b.maxY);
    node.position({ x, y });
    updateLayer(layer.id, { x, y }, `drag:${layer.id}`);
  }

  function handleTransform(layer: Layer, node: Konva.Node, finished: boolean) {
    const start = transforming.current;
    if (!start || start.id !== layer.id) return;
    const sx = Math.abs(node.scaleX());
    const sy = Math.abs(node.scaleY());
    const common = { x: node.x(), y: node.y(), rotation: normalizeAngle(node.rotation()) };
    const base = start.base;
    const patch: LayerPatch =
      base.type === 'text'
        ? { ...common, fontSize: clamp(base.fontSize * sy, 0.004, 0.4) }
        : { ...common, width: base.width * sx, height: base.height * sy };
    if (finished) {
      node.scale({ x: 1, y: 1 });
      transforming.current = null;
      setFrozen(null);
    }
    updateLayer(layer.id, patch, `transform:${layer.id}`);
  }

  const emptySections = size.sections.filter((s) => !config.layers.some((l) => l.sectionId === s.id));

  return (
    <div className="editor2d">
      <div className="pane-toolbar">
        <div className="segmented small" role="group" aria-label="2D view">
          <button type="button" aria-pressed={editorView === 'layout'} onClick={() => setEditorView('layout')}>
            Whole layout
          </button>
          <button type="button" aria-pressed={editorView === 'section'} onClick={() => setEditorView('section')}>
            {selectedSection.label} only
          </button>
        </div>
        <span className="pane-hint">Drag to move · corners resize · top handle rotates</span>
      </div>

      <div className="stage-wrap" ref={wrapRef}>
        {box.width > 0 && box.height > 0 && (
          <Stage width={box.width} height={box.height} onPointerDown={handleStagePointerDown}>
            <KonvaLayer>
              <Group
                ref={groupRef}
                x={view.x}
                y={view.y}
                offsetX={view.offsetX}
                offsetY={view.offsetY}
                rotation={view.rotation}
                scaleX={view.scale}
                scaleY={view.scale}
              >
                <KonvaImage ref={backgroundRef} image={designCanvas} width={1} height={1} listening={false} />

                {size.sections.map((section) => {
                  const selected = section.id === selectedSectionId;
                  return (
                    <Line
                      key={section.id}
                      points={section.polygon.flat()}
                      closed
                      stroke={selected ? ACCENT : 'rgba(15, 23, 42, 0.45)'}
                      strokeWidth={(selected ? 2.5 : 1) / view.scale}
                      dash={selected ? undefined : [4 / view.scale, 4 / view.scale]}
                      listening={false}
                    />
                  );
                })}

                {emptySections.map((section) => {
                  const [x, y] = sectionAnchor(section);
                  const fontSize = 12 / view.scale;
                  return (
                    <KonvaText
                      key={`label-${section.id}`}
                      text={section.label}
                      x={x}
                      y={y}
                      width={0.4}
                      offsetX={0.2}
                      offsetY={fontSize / 2}
                      align="center"
                      rotation={section.upright}
                      fontSize={fontSize}
                      fontFamily="Inter, system-ui, sans-serif"
                      fill="#ffffff"
                      shadowColor="#000000"
                      shadowBlur={3}
                      shadowOpacity={0.6}
                      listening={false}
                    />
                  );
                })}

                {config.layers.map((layer) => {
                  const { width, height } = frozen?.id === layer.id ? frozen : layerSize(layer);
                  const showOutline = hoveredId === layer.id && selectedLayerId !== layer.id;
                  return (
                    <Rect
                      key={layer.id}
                      ref={(node) => {
                        if (node) nodes.current.set(layer.id, node);
                        else nodes.current.delete(layer.id);
                      }}
                      x={layer.x}
                      y={layer.y}
                      width={width}
                      height={height}
                      offsetX={width / 2}
                      offsetY={height / 2}
                      rotation={layer.rotation}
                      fill="transparent"
                      stroke={showOutline ? ACCENT : undefined}
                      strokeWidth={1 / view.scale}
                      dash={[4 / view.scale, 3 / view.scale]}
                      draggable
                      onPointerDown={() => selectLayer(layer.id)}
                      onDragMove={(e) => handleDragMove(layer, e.target)}
                      onTransformStart={() => {
                        transforming.current = { id: layer.id, base: layer };
                        setFrozen({ id: layer.id, width, height });
                      }}
                      onTransform={(e) => handleTransform(layer, e.target, false)}
                      onTransformEnd={(e) => handleTransform(layer, e.target, true)}
                      onDblClick={() => document.getElementById('layer-text')?.focus()}
                      onDblTap={() => document.getElementById('layer-text')?.focus()}
                      onMouseEnter={(e) => {
                        setHoveredId(layer.id);
                        setCursor(e, 'move');
                      }}
                      onMouseLeave={(e) => {
                        setHoveredId(null);
                        setCursor(e, '');
                      }}
                    />
                  );
                })}
              </Group>

              <Transformer
                ref={transformerRef}
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                keepRatio
                flipEnabled={false}
                rotationSnaps={[0, 90, 180, 270]}
                rotationSnapTolerance={4}
                anchorSize={11}
                anchorCornerRadius={3}
                anchorStroke={ACCENT}
                anchorFill="#ffffff"
                borderStroke={ACCENT}
                boundBoxFunc={(oldBox, newBox) =>
                  Math.abs(newBox.width) < 8 || Math.abs(newBox.height) < 8 ? oldBox : newBox
                }
              />
            </KonvaLayer>
          </Stage>
        )}
      </div>
    </div>
  );
}