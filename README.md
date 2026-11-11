# Custom Canopy Tent Configurator

A product configurator for a printed canopy tent. Customers choose a size and frame, colour each panel, add text and logos in a 2D editor, and see the result on a 3D tent straight away. The price updates as they work. "Add to cart" sends the configuration and price to a Shopify-style cart, along with a production PDF that the print team can match to the order.

Built with React 19, TypeScript, Vite, three.js (React Three Fiber), Konva, Zustand and jsPDF.

- **Live demo:** `https://<your-project>.vercel.app`
- **Embedded in a store page:** `https://<your-project>.vercel.app/embed-demo.html`

## Features

- **Editor layout:** a `2D | 3D` switch in the header, a tool rail (Tent, Colours, Uploads, Text) with a floating panel for each tool, the print layout on a card in the middle, a small live 3D preview beside it, and a floating toolbar for undo/redo, zoom, panel view and guides.
- **Product options:** 5 x 5, 6.5 x 6.5 and 8 x 8 ft tents, with or without the frame. Each option is a Shopify variant with its own price.
- **Eight print sections:** four roof peaks and four valances. A "tent part" dropdown colours the whole tent, all peaks, all valances or one panel, from 16 fabric swatches, a colour picker, or a typed **Pantone code** (e.g. `185 C`) or hex value. Pantone codes travel with the order so print can match the ink.
- **Uploads library:** add several images at once (button or drag and drop). Uploads stay in the library, so one logo can be placed on several panels; deleting it from the canvas keeps it in the library.
- **Text and images on any section:** font, size, colour, bold, italic, rotation and opacity. Layers can be reordered, centred, duplicated, or copied to the matching sections.
- **2D editor:** drag, resize and rotate on the flat print layout. Zoom from "fit" to 400% (buttons or scroll wheel), drag empty space to pan, or show one section turned upright. "Guides" draws the texture grid and panel names, in 2D and on the 3D model.
- **Live 3D preview:** the 2D design is the texture on the 3D model, so both always match. The full 3D view has camera presets (Orbit, Front, Back, Left, Right, Top), zoom limits so the camera can neither enter the canopy nor lose the tent, and a pan boundary around the tent. Click a section on the tent to select it.
- **Print checks:** real print sizes in cm, and a DPI warning for low-resolution logos.
- **Undo/redo and shortcuts:** Ctrl+Z / Ctrl+Shift+Z, Delete, Ctrl+D, and arrow keys to nudge.
- **Saving:** designs autosave in the browser and can be exported or imported as JSON.
- **Dynamic pricing:** from a pricing service (a mock by default, or a real API through an environment variable).
- **Add to cart:** produces a Shopify `/cart/add.js` body. Inside a store iframe, it is sent to the store page with `postMessage`.
- **Production PDF:** price breakdown, four 3D views, the print layout, panel colours (with Pantone codes) and an artwork list. It carries the same configuration ID as the cart line.
- **Works on phones:** the tool rail moves to the bottom, panels open as a sheet above it, and the header switch flips between 2D and 3D.

## Run it locally

You need Node 20.19+ or 22.12+.

```bash
cd uix3d
npm install
npm run dev        # http://localhost:5173
npm test           # pricing unit tests
npm run build      # type-check and build into dist/
npm run preview    # serve dist/ locally
```

To use a real pricing backend instead of the built-in mock, create `uix3d/.env.local`:

```
VITE_PRICING_API_URL=https://pricing.example.com
```

The app then sends `POST {VITE_PRICING_API_URL}/quote` with a `QuoteRequest` and expects a `PriceQuote` back (types in `src/pricing/types.ts`).

## How it works

### One design, three outputs

```
            DesignConfig (JSON in a Zustand store; undo/redo; autosave)
                                     |
                                     v
         renderDesign()  ->  one 2048 x 2048 canvas (the print layout)
                                     |
        +----------------------------+-----------------------------+
        v                            v                             v
  3D preview                   2D editor                     Production PDF
  CanvasTexture on the         background image under        "as sent to print"
  tent's fabric material       Konva's drag/resize handles   layout page
```

Every section is a polygon on the model's UV map. Every layer's position and size is stored in UV units (0 to 1, y pointing down). The 2D editor, the 3D texture and the PDF all draw from the same JSON through the same renderer, so they cannot disagree.

When the design changes, the canvas is redrawn on the next animation frame. Then the 3D texture is marked for upload and the Konva layer repaints.

The 2D editor draws only invisible hit boxes and the transform handles; the canvas underneath does the actual drawing. A Konva `Group` transform turns the whole layout into a single-section view (rotated so the section reads upright). Clicks on the 3D model read the UV coordinate under the pointer and find which section polygon contains it.

### Folders

The app lives in `uix3d/`; paths below are relative to it.

| Path | What is in it |
| --- | --- |
| `src/types.ts` | The data model: sections, sizes, layers, `DesignConfig` |
| `src/data/` | Product definition (`tent.ts`: sizes, section outlines, colours), Pantone lookup (`pantone.ts`) and the mock Shopify catalog (`catalog.ts`) |
| `src/store/` | Zustand store with history (`designStore.ts`), editor UI state that is never saved or undone (`uiStore.ts`: 2D/3D mode, open tool, zoom, guides) and saving/loading (`persistence.ts`) |
| `src/lib/` | Geometry, the canvas renderer, fonts, images, print sizes, keyboard shortcuts |
| `src/components/` | Header, tool rail and tool panels (`tools/`), 2D editor, canvas toolbar, 3D preview, price bar |
| `src/pricing/` | Pricing engine (pure function), pricing service (mock or HTTP), React hook, tests |
| `src/shopify/` | Cart payload builder and add-to-cart |
| `src/embed/` | `postMessage` bridge to the parent store page |
| `src/pdf/` | Production PDF |
| `public/models/` | Tent models (one `.glb` per size) |
| `public/embed-demo.html` | A stand-in store page that embeds the configurator in an iframe |

### Adding another product

A product is just data: a `ProductDefinition` (sizes, models, section outlines in UV units, material names) plus its variants in the catalog. Nothing in the components is tent-specific apart from the default design.

## Configuration format

This is the design that gets saved, exported and sent to the cart (shortened):

```json
{
  "schemaVersion": 1,
  "id": "cfg_14eea6bd",
  "productId": "custom-canopy-tent",
  "sizeId": "8x8",
  "frame": "frame",
  "sections": {
    "peak_front": { "color": "#0b2545" },
    "valance_front": { "color": "#e4002b", "pantone": "Pantone 185 C" }
  },
  "layers": [
    {
      "id": "txt_9fc0bce9",
      "type": "text",
      "sectionId": "peak_front",
      "x": 0.4977,
      "y": 0.7727,
      "rotation": 0,
      "opacity": 1,
      "text": "YOUR BRAND",
      "fontFamily": "Montserrat",
      "fontSize": 0.0403,
      "bold": true,
      "italic": false,
      "color": "#ffffff"
    }
  ],
  "assets": {},
  "updatedAt": "2026-11-11T03:28:04.580Z"
}
```

- Image layers have `assetId`, `width` and `height`. `assets` is the uploads library: each uploaded file (as a data URL) and its pixel size, kept even when it is not placed on the tent.
- A section colour may carry a `pantone` code next to its on-screen hex value.
- When the customer changes size, every layer is moved and scaled onto the matching section of the new model.

## Pricing

Prices come from `pricingService.getQuote(request)`. The request is a small summary of the design (variant, quantity, number of printed sections, custom colours and images). The rules live in one pure function, `calculateQuote()`, so the mock service, a real backend and the tests share the same code.

| Rule | Amount (INR) | Charged |
| --- | --- | --- |
| Tent variant | 27,500 to 66,800 | per tent (see the variant table below) |
| Printed section (any section with text or an image) | 1,500 | per section, per tent |
| Custom colour match (a colour outside the 16 standard fabrics) | 750 | once per order, per colour |
| Extra artwork setup (images beyond the first 2) | 500 | once per order, per image |
| Volume discount | 5% for 3+, 10% for 5+, 15% for 10+ | on the per-tent part only |

The amounts are mock values. The base prices follow the scale of the reference store, where a 10 x 10 tent with frame is ₹80,700.

Mock Shopify variants:

| Variant ID | Option | SKU | Price |
| --- | --- | --- | --- |
| 45010000001 | 5 x 5 ft / Canopy + frame | TENT-5-FR | ₹46,900 |
| 45010000002 | 5 x 5 ft / Canopy only | TENT-5-CO | ₹27,500 |
| 45010000003 | 6.5 x 6.5 ft / Canopy + frame | TENT-65-FR | ₹56,400 |
| 45010000004 | 6.5 x 6.5 ft / Canopy only | TENT-65-CO | ₹33,900 |
| 45010000005 | 8 x 8 ft / Canopy + frame | TENT-8-FR | ₹66,800 |
| 45010000006 | 8 x 8 ft / Canopy only | TENT-8-CO | ₹41,600 |

## Shopify integration

### Cart payload

"Add to cart" builds the body for Shopify's AJAX cart API (`POST /cart/add.js`):

- The tent line uses the chosen variant. It has readable properties for the order page and hidden ones (starting with `_`) for the system.
- Each customisation fee is a separate line for a hidden fee product, linked to the tent by `_configuration_id`.

```json
{
  "items": [
    {
      "id": 45010000005,
      "quantity": 2,
      "properties": {
        "Design ID": "cfg_14eea6bd",
        "Size": "8 x 8 ft",
        "Frame": "Canopy + frame",
        "Printed panels": "Front peak, Front valance",
        "Panel colours": "Front peak #0B2545, ..., Front valance Pantone 185 C (#E4002B), ...",
        "Text": "YOUR BRAND | yourbrand.com",
        "_configuration_id": "cfg_14eea6bd",
        "_configuration_updated_at": "2026-11-11T03:28:04.580Z",
        "_quote_id": "q_mwbk6uhw",
        "_quoted_total": "139600"
      }
    },
    {
      "id": 45020000001,
      "quantity": 4,
      "properties": { "_configuration_id": "cfg_14eea6bd", "_fee": "Printed panel x 2" }
    }
  ]
}
```

Opened on its own (not in an iframe), the app has no store to talk to. It shows this exact body in a dialog and keeps a demo cart in `localStorage`.

### Embedding in a store page

```html
<iframe
  src="https://<your-project>.vercel.app/?variant_id=45010000005&parent_origin=https://your-store.myshopify.com"
  title="Tent configurator"
  style="width: 100%; height: 900px; border: 0"
></iframe>
```

- `variant_id` preselects the size and frame.
- `parent_origin` is the only origin the configurator will post to. It must be `https` (or `localhost` while developing), and the app never posts to `"*"`.

Messages:

| Direction | `type` | Contents |
| --- | --- | --- |
| app → store | `CONFIGURATOR_READY` | `version` |
| app → store | `CONFIGURATOR_ADD_TO_CART` | `requestId`, `payload` (cart body), `design` (full JSON), `quote`, `productionPdf` (Blob) |
| app → store | `CONFIGURATOR_CLOSE` | none |
| store → app | `CONFIGURATOR_CART_UPDATED` | `requestId`, `ok`, `message` |

The store page sends the payload to `/cart/add.js` and answers with `CONFIGURATOR_CART_UPDATED`. If nothing answers within 10 seconds, the customer sees an error. Both sides check `event.origin` and `event.source`.

`public/embed-demo.html` is a working example of the store side, using a pretend cart.

### In a real store

- Create the fee products (printed section, colour match, artwork setup) as hidden products, priced by Shopify, so the checkout total is calculated by Shopify rather than trusted from the browser.
- Apply the volume discount as a Shopify automatic discount, or with a Cart Transform function that groups the tent and its fee lines by `_configuration_id`.
- Upload the production PDF and design JSON to storage (S3 or Shopify Files) from the store page or a small backend, keyed by the configuration ID, and save the link in a cart attribute or order metafield.
- Restrict who may embed the app with a `Content-Security-Policy: frame-ancestors https://your-store.com` header in `vercel.json`. It is left open here so the demo works anywhere.

## Production PDF

Made in the browser with jsPDF, which is loaded only when it is needed. It contains:

- **Page 1:** order details (product, frame, Shopify variant, quantity, quote ID), the price breakdown, and the front, right, back and left 3D views. The views are rendered at a fixed 1200 x 900 size, whatever the screen.
- **Page 2:** the print layout exactly as it goes on the fabric, with each section labelled, and a table of panel colours that shows Pantone codes and flags custom colour matches. Editor guides are never drawn into the PDF.
- **Artwork list:** every text and image, with print size in cm, DPI and rotation.
- **Every page:** a footer with the configuration ID, which matches the cart line property `_configuration_id`. The PDF's keywords metadata also holds the configuration, quote and variant IDs.

## Performance

- **Lazy loading:** the 3D view (three.js) and the PDF code (jsPDF) are separate chunks loaded only when needed. The other sizes' models are fetched in the background, so switching sizes is instant.
- **No idle rendering:** the 3D canvas only draws when something changes (`frameloop="demand"`), and the design canvas redraws at most once per frame.
- **One texture:** a single texture is shared by every view. No extra render targets.
- **Offline lighting:** the environment lighting is built from in-scene light panels, so no HDR file is downloaded.

## Deploying

The project is a static site. On Vercel:

1. Import the GitHub repo and set **Root Directory** to `uix3d`. The framework preset is then detected as Vite, with build command `npm run build` and output folder `dist`.
2. Optionally add the `VITE_PRICING_API_URL` environment variable.
3. Deploy, then open `/embed-demo.html` to test the store round trip.

`vercel.json` adds cache headers for the models and the hashed build files.

## Known limits and next steps

- Uploaded images are stored inside the design JSON as data URLs. That is fine for a demo, but a real setup should upload them to storage and keep only the URL.
- Fonts come from Google Fonts. The PDF lists font names, but the print file is the rendered layout image, not vector artwork.
- The Pantone table covers about 60 common coated colours with approximate screen values. A real setup would use the licensed Pantone library.
- The 6.5 x 6.5 ft model was exported at the 5 ft size, so the app scales it up by 1.3.
- The models are the original files (about 10 MB each), so the first 3D load is slow on a weak connection. Compressing them with `gltf-transform` (meshopt geometry, quantisation, 1024 px WebP textures) brings each to about 0.4 MB with no visible change. The code finds parts by material name, so it works with either version:
  ```bash
  npx @gltf-transform/cli@4.5.1 optimize public/models/tent-8x8.glb public/models/tent-8x8.glb --texture-compress webp --texture-size 1024
  ```
- Next steps:
  - a server-side quote check at checkout
  - a 300 DPI vector print export (SVG or PDF) per section
  - customer accounts for saved designs
  - more products built from the same `ProductDefinition` format
