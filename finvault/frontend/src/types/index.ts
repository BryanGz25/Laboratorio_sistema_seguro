export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  provider: 'local' | 'google';
  maskedPhone: string | null;
  createdAt: string;
}

export interface Account {
  id: string;
  alias: string;
  maskedIban: string;
  balance: string;
  hasNotes: boolean;
  createdAt: string;
}

export interface CreateAccountPayload {
  alias: string;
  iban: string;
  balance: string;
  notes?: string;
}
