import React from 'react';
import ReactDOM from 'react-dom/client';
import { TurnkeyProvider } from '@turnkey/react-wallet-kit';
import App from './App';
import { TURNKEY_ORGANIZATION_ID } from './config';
import './index.css';

// TurnkeyProviderConfig — email OTP + passkey auth, embedded wallet
// auto-provisioned on first login inside the browser's TEE.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const turnkeyConfig: any = {
  organizationId: TURNKEY_ORGANIZATION_ID,
  authProxyConfigId: import.meta.env.VITE_AUTH_PROXY_CONFIG_ID!,
  redirectUri: import.meta.env.VITE_REDIRECT_URI ?? 'http://localhost:5173/callback',
  auth: {
    sessionExpirationSeconds: String(60 * 60 * 24 * 7), // 7 days
    otpAlphanumeric: false,
  },
  ui: {
    authModal: {
      methods: {
        emailOtpAuthEnabled: true,
        passkeyAuthEnabled: true,
        smsOtpAuthEnabled: false,
        walletAuthEnabled: false,
      },
      methodOrder: ['email', 'passkey'],
    },
    darkMode: true,
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TurnkeyProvider config={turnkeyConfig}>
      <App />
    </TurnkeyProvider>
  </React.StrictMode>
);
