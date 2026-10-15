import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { LazyMotion, domAnimation } from 'motion/react'
import { App } from './App'
import './styles.css'
import './components.css'

// Test hook: a frozen reveal clock also stills every CSS animation (stable screenshots).
if (typeof window.__RTR_FREEZE_T === 'number') document.documentElement.classList.add('frozen')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {/* LazyMotion + m.* keeps Motion's bundle cost to the dom-animation feature set. */}
      <LazyMotion features={domAnimation} strict>
        <App />
      </LazyMotion>
    </BrowserRouter>
  </StrictMode>,
)
