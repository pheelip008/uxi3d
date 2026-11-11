import { CATALOG, findVariant } from '../data/catalog.ts';
import { getFrameLabel, getSize, isStandardColour } from '../data/tent.ts';
import { formatMoney } from '../lib/format.ts';
import { sectionAnchor } from '../lib/geometry.ts';
import type { ViewName } from '../lib/previewBridge.ts';
import { printInfo } from '../lib/printInfo.ts';
import type { PriceQuote } from '../pricing/types.ts';
import type { DesignConfig } from '../types.ts';

export interface ProductionPdfInput {
  config: DesignConfig;
  quote: PriceQuote;
  quantity: number;
  /** JPEG data URLs of the 3D views. */
  views: Partial<Record<ViewName, string>>;
  /** JPEG data URL of the flat print layout. */
  layout: string;
}

const MARGIN = 15;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;

// jsPDF's built-in fonts cannot draw "₹", so money is written as "Rs." here.
const money = (amount: number, currency: string) =>
  formatMoney(amount, currency).replace('₹', 'Rs. ');

/** A4 production summary for the print team. Returned as a Blob so it can be attached to the order. */
export async function createProductionPdf(input: ProductionPdfInput): Promise<Blob> {
  // Loaded only when needed: jsPDF is large and most visitors never open a PDF.
  const { jsPDF } = await import('jspdf');
  const { config, quote, quantity, views, layout } = input;
  const size = getSize(config.sizeId);
  const variant = findVariant(config.sizeId, config.frame);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  doc.setProperties({
    title: `Production summary ${config.id}`,
    subject: `Design ${config.id}`,
    keywords: `configuration_id:${config.id} quote_id:${quote.quoteId} variant_id:${variant.id}`,
    creator: 'Tent configurator',
  });

  let y = MARGIN;
  const heading = (text: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(text, MARGIN, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
  };
  const row = (label: string, value: string) => {
    doc.setTextColor(100);
    doc.text(label, MARGIN, y);
    doc.setTextColor(20);
    doc.text(value, MARGIN + 42, y);
    y += 5;
  };

  // ---- Page 1: order and 3D views
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Production summary', MARGIN, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Design ${config.id}`, PAGE_W - MARGIN, y, { align: 'right' });
  doc.text(new Date().toLocaleString('en-IN'), PAGE_W - MARGIN, y + 5, { align: 'right' });
  y += 16;

  heading('Order');
  row('Product', `${CATALOG.productTitle} - ${size.label}`);
  row('Frame', getFrameLabel(config.frame));
  row('Shopify variant', `${variant.title} (ID ${variant.id}, SKU ${variant.sku})`);
  row('Quantity', String(quantity));
  row('Quote', `${quote.quoteId} - total ${money(quote.total, quote.currency)}`);
  y += 3;

  heading('Price breakdown');
  for (const line of quote.lines) {
    doc.text(line.label, MARGIN, y);
    doc.text(`${line.quantity} x ${money(line.unitAmount, quote.currency)}`, MARGIN + 110, y);
    doc.text(money(line.amount, quote.currency), PAGE_W - MARGIN, y, { align: 'right' });
    y += 5;
  }
  doc.setFont('helvetica', 'bold');
  doc.text('Total', MARGIN, y);
  doc.text(money(quote.total, quote.currency), PAGE_W - MARGIN, y, { align: 'right' });
  y += 9;

  const viewOrder: ViewName[] = ['front', 'right', 'back', 'left'];
  const shots = viewOrder.filter((v) => views[v]);
  if (shots.length > 0) {
    heading('3D preview');
    const cellW = (CONTENT_W - 6) / 2;
    const cellH = cellW * 0.68;
    shots.forEach((view, i) => {
      const x = MARGIN + (i % 2) * (cellW + 6);
      const top = y + Math.floor(i / 2) * (cellH + 9);
      const props = doc.getImageProperties(views[view]!);
      const scale = Math.min(cellW / props.width, cellH / props.height);
      const w = props.width * scale;
      const h = props.height * scale;
      doc.addImage(views[view]!, 'JPEG', x + (cellW - w) / 2, top, w, h);
      doc.setTextColor(90);
      doc.text(`${view[0].toUpperCase()}${view.slice(1)} view`, x, top + cellH + 4);
      doc.setTextColor(20);
    });
  }

  // ---- Page 2: flat print layout and colours
  doc.addPage();
  y = MARGIN;
  heading('Print layout (canopy texture, as sent to print)');
  const layoutSize = 125;
  const lx = MARGIN + (CONTENT_W - layoutSize) / 2;
  doc.addImage(layout, 'JPEG', lx, y, layoutSize, layoutSize);
  // Panel names on small white labels so they stay readable on any colour.
  doc.setFontSize(6.5);
  for (const s of size.sections) {
    const [ax, ay] = sectionAnchor(s);
    const cx = lx + ax * layoutSize;
    const cy = y + ay * layoutSize;
    const w = doc.getTextWidth(s.label) + 2;
    doc.setFillColor('#ffffff'); // set every time: drawing text changes the fill colour
    doc.rect(cx - w / 2, cy - 2.4, w, 3.4, 'F');
    doc.text(s.label, cx, cy, { align: 'center' });
  }
  y += layoutSize + 8;

  heading('Panel colours');
  for (const s of size.sections) {
    const color = config.sections[s.id]?.color ?? '#ffffff';
    doc.setFillColor(color);
    doc.setDrawColor(160);
    doc.rect(MARGIN, y - 3.2, 4, 4, 'FD');
    doc.text(s.label, MARGIN + 7, y);
    doc.text(color.toUpperCase(), MARGIN + 45, y);
    doc.text(isStandardColour(color) ? 'Standard fabric colour' : 'Custom colour - match required', MARGIN + 70, y);
    y += 5.5;
  }

  // ---- Artwork list (continues on new pages if long)
  y += 4;
  heading('Artwork');
  if (config.layers.length === 0) doc.text('No artwork. Plain colour panels only.', MARGIN, y);
  for (const s of size.sections) {
    const layers = config.layers.filter((l) => l.sectionId === s.id);
    for (const layer of layers) {
      if (y > 275) {
        doc.addPage();
        y = MARGIN;
      }
      const info = printInfo(layer, s, size, config);
      const what =
        layer.type === 'text'
          ? `Text "${layer.text.replace(/\n/g, ' / ')}" - ${layer.fontFamily}${layer.bold ? ' bold' : ''}${layer.italic ? ' italic' : ''}, ${layer.color.toUpperCase()}, letters ~${Math.round(info.heightCm)} cm`
          : `Image "${config.assets[layer.assetId]?.name}" - ${Math.round(info.widthCm)} x ${Math.round(info.heightCm)} cm at ${info.dpi} DPI${info.rating === 'low' ? ' (LOW RESOLUTION)' : ''}`;
      const lines = doc.splitTextToSize(`${s.label}: ${what}, rotation ${Math.round(layer.rotation)} deg`, CONTENT_W);
      doc.text(lines, MARGIN, y);
      y += lines.length * 4.2 + 1.5;
    }
  }

  // ---- Footer on every page: how this PDF is matched to the Shopify order
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(
      `Design ${config.id} - matches Shopify line item property _configuration_id=${config.id} - page ${p}/${pages}`,
      PAGE_W / 2,
      290,
      { align: 'center' },
    );
  }

  return doc.output('blob');
}
