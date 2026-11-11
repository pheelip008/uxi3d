import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { restoreDesign } from './store/persistence.ts'

// Reopen the last design (and apply ?size= / ?variant_id=) before the first render.
restoreDesign()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)