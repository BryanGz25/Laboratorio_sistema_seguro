import { InputHTMLAttributes, ReactNode } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
}

export const Field = ({ label, hint, id, ...inputProps }: FieldProps) => {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label htmlFor={inputId} className="block space-y-1.5">
      <span className="text-sm font-medium text-neutral-300">{label}</span>
      <input
        id={inputId}
        className="w-full rounded-xl border border-neutral-700 bg-black/40 px-4 py-2.5 text-white placeholder:text-neutral-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        {...inputProps}
      />
      {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
    </label>
  );
};
