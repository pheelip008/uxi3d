import { useRef, useState, type DragEvent } from 'react';
import { getSection, getSize } from '../../data/tent.ts';
import { ACCEPTED_IMAGE_TYPES, readImageFile } from '../../lib/images.ts';
import { printInfo } from '../../lib/printInfo.ts';
import { useDesignStore } from '../../store/designStore.ts';
import type { ImageLayer } from '../../types.ts';
import { CloseIcon, UploadIcon } from '../icons.tsx';
import { LayerControls } from './LayerControls.tsx';
import { SectionSelect } from './SectionSelect.tsx';

const DPI_TEXT = {
  good: 'Sharp at this size',
  fair: 'OK, may look a little soft up close',
  low: 'Low resolution: will look blurry. Upload a bigger file or make it smaller.',
};

function ImageSettings({ layer }: { layer: ImageLayer }) {
  const config = useDesignStore((s) => s.config);
  const size = getSize(config.sizeId);
  const section = getSection(size, layer.sectionId);
  const asset = config.assets[layer.assetId];
  const info = printInfo(layer, section, size, config);

  return (
    <section className="subpanel" aria-label="Selected image">
      <h3>Selected image · {section.label}</h3>
      <div className={`print-check ${info.rating ?? ''}`}>
        <strong>
          {asset?.name} · {asset?.width} × {asset?.height} px
        </strong>
        <span>
          Prints at {Math.round(info.widthCm)} × {Math.round(info.heightCm)} cm · {info.dpi} DPI
        </span>
        {info.rating && <span>{DPI_TEXT[info.rating]}</span>}
      </div>
      <LayerControls layer={layer} />
    </section>
  );
}

export function UploadsPanel() {
  const assets = useDesignStore((s) => s.config.assets);
  const layers = useDesignStore((s) => s.config.layers);
  const selectedLayerId = useDesignStore((s) => s.selectedLayerId);
  const { addImage, placeImage, removeAsset } = useDesignStore.getState();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const library = Object.values(assets);
  const selected = layers.find((l): l is ImageLayer => l.id === selectedLayerId && l.type === 'image');

  async function addFiles(files: Iterable<File>) {
    setError(null);
    setBusy(true);
    const problems: string[] = [];
    for (const file of files) {
      try {
        addImage(await readImageFile(file));
      } catch (err) {
        problems.push(`${file.name}: ${err instanceof Error ? err.message : 'could not be read.'}`);
      }
    }
    setBusy(false);
    if (problems.length > 0) setError(problems.join(' '));
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    void addFiles(Array.from(e.dataTransfer.files));
  }

  return (
    <>
      <SectionSelect id="upload-section" label="Place images on" />

      <div
        className={dragging ? 'dropzone over' : 'dropzone'}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <button type="button" className="btn primary block" disabled={busy} onClick={() => inputRef.current?.click()}>
          <UploadIcon />
          {busy ? 'Reading…' : 'Add images'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = ''; // allow picking the same file again
            void addFiles(files);
          }}
        />
        <p className="hint">or drop files here · PNG, JPG, WebP or SVG · up to 10 MB</p>
      </div>
      {error && (
        <p className="hint error" role="alert">
          {error}
        </p>
      )}

      {library.length === 0 ? (
        <p className="hint">Your uploads stay here, so you can place the same logo on several panels.</p>
      ) : (
        <>
          <ul className="upload-grid" aria-label="Uploaded images">
            {library.map((asset) => {
              const uses = layers.filter((l) => l.type === 'image' && l.assetId === asset.id).length;
              return (
                <li key={asset.id} className="upload-tile">
                  <button
                    type="button"
                    className="upload-thumb"
                    title={`Place ${asset.name} on the selected panel`}
                    onClick={() => placeImage(asset.id)}
                  >
                    <img src={asset.src} alt="" />
                    <span className="upload-name">{asset.name}</span>
                    <span className="upload-uses">{uses > 0 ? `On the tent ${uses}×` : 'Not placed'}</span>
                  </button>
                  <button
                    type="button"
                    className="upload-remove"
                    title={uses > 0 ? 'Delete the image and remove it from the tent' : 'Delete the image'}
                    aria-label={`Delete ${asset.name}`}
                    onClick={() => removeAsset(asset.id)}
                  >
                    <CloseIcon width={14} height={14} />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="hint">
            Click an image to place it on the selected panel. Select an image on the canvas to move it, change its
            order or delete it.
          </p>
        </>
      )}

      {selected && <ImageSettings layer={selected} />}
    </>
  );
}
