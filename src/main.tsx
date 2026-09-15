import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import App from './App';
import { PRIVY_APP_ID } from './config';
import './index.css';
import './bufferPolyfill';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyProvider appId={PRIVY_APP_ID}>
      <App />
    </PrivyProvider>
  </StrictMode>
);
