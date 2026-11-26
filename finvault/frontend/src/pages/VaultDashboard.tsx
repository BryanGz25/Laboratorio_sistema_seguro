import { FormEvent, useEffect, useState } from 'react';
import { Landmark, LogOut, Plus, Trash2 } from 'lucide-react';
import { ApiError, request } from '../api/client';
import { Field } from '../components/Field';
import { GlassCard } from '../components/GlassCard';
import type { Account, CreateAccountPayload, User } from '../types';

interface VaultDashboardProps {
  user: User;
  onLogout: () => void;
}

const formatBalance = (value: string): string => {
  const [integer, decimals = '00'] = value.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${grouped}.${decimals.padEnd(2, '0')}`;
};

const emptyForm: CreateAccountPayload = { alias: '', iban: '', balance: '', notes: '' };

export const VaultDashboard = ({ user, onLogout }: VaultDashboardProps) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState<CreateAccountPayload>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadAccounts = async () => {
    try {
      const data = await request<{ data: Account[] }>('/accounts');
      setAccounts(data.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las cuentas');
    }
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await request('/accounts', {
        method: 'POST',
        body: { ...form, notes: form.notes ? form.notes : undefined },
      });
      setForm(emptyForm);
      await loadAccounts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la cuenta');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await request(`/accounts/${id}`, { method: 'DELETE' });
      await loadAccounts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar la cuenta');
    }
  };

  const handleLogout = async () => {
    await request('/auth/logout', { method: 'POST' }).catch(() => undefined);
    onLogout();
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <GlassCard className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">FinVault</h1>
          <p className="text-sm text-neutral-400">{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" aria-hidden /> Cerrar sesión
        </button>
      </GlassCard>

      {error && (
        <p role="alert" className="rounded-xl border border-neutral-700 bg-black/50 px-4 py-3 text-sm text-neutral-200">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <GlassCard className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <Landmark className="h-5 w-5 text-accent-soft" aria-hidden /> Cuentas cifradas
          </h2>

          {accounts.length === 0 ? (
            <p className="text-sm text-neutral-400">Aún no tienes cuentas registradas.</p>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {accounts.map((account) => (
                <li key={account.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{account.alias}</p>
                    <p className="font-mono text-sm text-neutral-400">{account.maskedIban}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-semibold tabular-nums text-white">{formatBalance(account.balance)}</p>
                    <button
                      onClick={() => void handleDelete(account.id)}
                      aria-label={`Eliminar ${account.alias}`}
                      className="rounded-lg p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <Plus className="h-5 w-5 text-accent-soft" aria-hidden /> Nueva cuenta
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Alias" required maxLength={60} value={form.alias}
              onChange={(e) => setForm({ ...form, alias: e.target.value })} placeholder="Nómina principal" />
            <Field label="IBAN" required maxLength={40} value={form.iban} autoComplete="off"
              onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="ES91 2100 0418 4502 0005 1332" />
            <Field label="Saldo" required inputMode="decimal" maxLength={16} value={form.balance}
              onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="1500.00"
              hint="Máximo 2 decimales." />
            <Field label="Notas (opcional)" maxLength={500} value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-accent px-4 py-2.5 font-medium text-white shadow-lg shadow-blue-500/20 transition hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar cuenta cifrada'}
            </button>
          </form>
        </GlassCard>
      </div>
    </main>
  );
};
