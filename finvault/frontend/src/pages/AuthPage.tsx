import { FormEvent, useState } from 'react';
import { Lock, Mail, ShieldCheck } from 'lucide-react';
import { ApiError, request } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { Field } from '../components/Field';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import type { User } from '../types';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

interface AuthPageProps {
  onAuthenticated: (user: User) => void;
}

const PASSWORD_HINT =
  'Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo.';

const initialMode = (): Mode => {
  const params = new URLSearchParams(window.location.search);
  return params.has('token') ? 'reset' : 'login';
};

export const AuthPage = ({ onAuthenticated }: AuthPageProps) => {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const run = async (action: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === 'login') {
      void run(async () => {
        const data = await request<{ user: User }>('/auth/login', { method: 'POST', body: { email, password } });
        onAuthenticated(data.user);
      });
    }

    if (mode === 'register') {
      void run(async () => {
        await request('/auth/register', { method: 'POST', body: { email, password } });
        setNotice('Cuenta creada. Ahora puedes iniciar sesión.');
        setPassword('');
        switchMode('login');
      });
    }

    if (mode === 'forgot') {
      void run(async () => {
        const data = await request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email } });
        setNotice(data.message);
      });
    }

    if (mode === 'reset') {
      const token = new URLSearchParams(window.location.search).get('token') ?? '';
      void run(async () => {
        await request('/auth/reset-password', { method: 'POST', body: { token, newPassword } });
        window.history.replaceState({}, '', window.location.pathname);
        setNewPassword('');
        setNotice('Contraseña actualizada. Inicia sesión con tu nueva clave.');
        switchMode('login');
      });
    }
  };

  const handleGoogle = (credential: string) => {
    void run(async () => {
      const data = await request<{ user: User }>('/auth/google', { method: 'POST', body: { credential } });
      onAuthenticated(data.user);
    });
  };

  const submitLabels: Record<Mode, string> = {
    login: 'Iniciar sesión',
    register: 'Crear cuenta',
    forgot: 'Enviar instrucciones',
    reset: 'Guardar contraseña',
  };

  const titles: Record<Mode, string> = {
    login: 'Accede a tu bóveda',
    register: 'Crea tu bóveda',
    forgot: 'Recupera tu acceso',
    reset: 'Define una nueva contraseña',
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <GlassCard className="w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-black/40">
            <ShieldCheck className="h-6 w-6 text-accent-soft" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">FinVault</h1>
            <p className="text-sm text-neutral-400">{titles[mode]}</p>
          </div>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-xl border border-neutral-700 bg-black/50 px-4 py-3 text-sm text-neutral-200">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mb-4 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-neutral-200">
            {notice}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <Field
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          )}

          {(mode === 'login' || mode === 'register') && (
            <Field
              label="Contraseña"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint={mode === 'register' ? PASSWORD_HINT : undefined}
            />
          )}

          {mode === 'reset' && (
            <Field
              label="Nueva contraseña"
              type="password"
              autoComplete="new-password"
              required
              maxLength={128}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint={PASSWORD_HINT}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-medium text-white shadow-lg shadow-blue-500/20 transition hover:bg-accent-hover disabled:opacity-50"
          >
            {mode === 'login' ? <Lock className="h-4 w-4" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />}
            {loading ? 'Procesando…' : submitLabels[mode]}
          </button>
        </form>

        {(mode === 'login' || mode === 'register') && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <span className="h-px flex-1 bg-neutral-700" />o<span className="h-px flex-1 bg-neutral-700" />
            </div>
            <GoogleSignInButton onCredential={handleGoogle} />
          </div>
        )}

        <nav className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-neutral-400">
          {mode !== 'login' && <button className="hover:text-white" onClick={() => switchMode('login')}>Iniciar sesión</button>}
          {mode !== 'register' && <button className="hover:text-white" onClick={() => switchMode('register')}>Crear cuenta</button>}
          {mode !== 'forgot' && <button className="hover:text-white" onClick={() => switchMode('forgot')}>¿Olvidaste tu contraseña?</button>}
        </nav>
      </GlassCard>
    </main>
  );
};
