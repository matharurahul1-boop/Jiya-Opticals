import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { reloadForNewVersion } from './lib/staleReload';

// A tab left open across a deploy asks for lazy files that no longer exist: load the new version instead of failing.
window.addEventListener('vite:preloadError', (event) => { event.preventDefault(); reloadForNewVersion(); });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
