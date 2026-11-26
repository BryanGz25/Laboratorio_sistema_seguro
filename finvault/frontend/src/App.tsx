import { useEffect, useState } from 'react';
import { request } from './api/client';
import { AuthPage } from './pages/AuthPage';
import { VaultDashboard } from './pages/VaultDashboard';
import type { User } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    request<{ user: User }>('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-400">Verificando sesión…</p>
      </main>
    );
  }

  if (!user) {
    return <AuthPage onAuthenticated={setUser} />;
  }

  return <VaultDashboard user={user} onLogout={() => setUser(null)} />;
}
