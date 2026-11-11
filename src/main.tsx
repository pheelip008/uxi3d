import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getSize } from './data/tent.ts'
import { useDesignStore } from './store/designStore.ts'
import { restoreDesign } from './store/persistence.ts'

// Reopen the last design (and apply ?size= / ?variant_id=) before the first render.
restoreDesign()

// The 3D code is a separate chunk. Ask for the tent model now, so the two download
// side by side instead of one after the other. The loader's fetch() reuses this request.
const modelPreload = document.createElement('link')
modelPreload.rel = 'preload'
modelPreload.as = 'fetch'
modelPreload.crossOrigin = 'anonymous'
modelPreload.href = getSize(useDesignStore.getState().config.sizeId).modelUrl
document.head.append(modelPreload)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)