import { useEffect, useRef } from 'react';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentityApi {
  initialize(options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void;
  renderButton(element: HTMLElement, options: Record<string, string | number>): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentityApi } };
  }
}

const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
}

/** Botón oficial de Google Identity Services. Entrega un ID token que el backend verifica. */
export const GoogleSignInButton = ({ onCredential }: GoogleSignInButtonProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !containerRef.current) return;

    const render = () => {
      const api = window.google?.accounts.id;
      if (!api || !containerRef.current) return;
      api.initialize({ client_id: clientId, callback: (r) => onCredential(r.credential) });
      api.renderButton(containerRef.current, { theme: 'filled_black', size: 'large', width: 320, shape: 'pill' });
    };

    if (window.google) {
      render();
      return;
    }

    const script = document.createElement('script');
    script.src = GSI_SCRIPT_URL;
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [clientId, onCredential]);

  if (!clientId) {
    return (
      <p className="text-center text-xs text-neutral-500">
        Inicio con Google no configurado (VITE_GOOGLE_CLIENT_ID).
      </p>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
};
