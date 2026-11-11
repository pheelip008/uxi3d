# Custom Canopy Tent Configurator

[Live demo](https://uxi3d.vercel.app) · [Embed demo](https://uxi3d.vercel.app/embed-demo.html)

I built this as an interactive configurator for custom canopy tents. I enjoyed this project because it is more than a typical product page: a customer needs to design something accurately, understand its price, and feel confident ordering it without speaking to a sales or print team.

## What it solves

The main challenge was keeping the design experience simple while handling real production needs. Customers need to know where their logo will print, how the tent will look in real life, and how custom choices affect the price. The production team needs the final order to be clear and traceable.

The configurator lets customers choose a tent size and frame, customise each tent panel with colours, Pantone references, text, and uploaded logos, then see the result in both 2D and 3D. It also creates an itemised quote, a Shopify-ready cart payload, and a production PDF.

## Features I added

- A **Tent** tab so users can choose the tent size and frame before they start designing.
- A small live 3D preview beside the 2D editor, with a **3D** button that opens the full preview.
- Keyboard shortcuts for undo/redo, duplicate, delete, deselect, and precise arrow-key nudging.
- Independent editing for roof peaks and valances, including text, logo upload, colours, Pantone codes, rotation, resizing, and layers.
- Automatic local saving and JSON import/export.
- A PDF production summary with 3D views, the print layout, panel colours, artwork sizing, DPI checks, and a configuration ID.

## Architecture

I used React, TypeScript, Zustand, React Three Fiber/Three.js, Konva, and jsPDF.

The most important decision was using one `DesignConfig` object as the source of truth. Artwork positions are stored in UV coordinates rather than pixels, so they stay attached to the correct physical tent panel regardless of screen size or tent model.

```text
DesignConfig
     ↓
shared canvas renderer
 ┌───┼────┐
 2D  3D  PDF
```

The 2D editor, 3D tent texture, and production PDF all use the same renderer. This prevents the common problem where a customer sees one design in the preview but the print team receives something different.

The app is also structured so that products are data-driven: tent sizes, 3D models, printable sections, and variants live in product definitions instead of being hard-coded throughout the UI. That makes the approach reusable for other configurable products.

## Pricing and Shopify approach

Pricing comes from a service layer, not the UI. The project includes a mock pricing service and an HTTP version that can be connected to a real pricing or CRM API later. Quotes include the product variant, printed panels, custom-colour matching, artwork setup, quantity, and discounts.

For Shopify, the selected variant and configuration are turned into a `/cart/add.js` payload. When embedded in an iframe, the configurator sends the cart payload, design JSON, quote, and PDF to the parent store with a restricted-origin `postMessage` flow.

## Running locally

```bash
npm install
npm run dev
npm test
npm run build
```

To use a real pricing API, add this to `.env.local`:

```env
VITE_PRICING_API_URL=https://pricing.example.com
```

## What I would improve next

- Upload artwork to cloud storage instead of storing it in browser data.
- Verify quotes on the server before checkout.
- Create vector, print-ready exports for each panel.
- Compress the 3D models further for faster loading on mobile networks.
