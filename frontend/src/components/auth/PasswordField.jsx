import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordField({ label = 'Password', error, id, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const [visible, setVisible] = useState(false);

  return (
    <label htmlFor={inputId} className="grid gap-1.5 text-sm font-medium text-ink">
      <span>{label}</span>
      <span className="relative">
        <input
          {...props}
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-xl border bg-white px-3.5 py-2.75 pr-11 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100 ${error ? 'border-red-300' : 'border-slate-200'}`}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-ink"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {error && <span id={errorId} role="alert" className="text-xs font-normal text-red-600">{error}</span>}
    </label>
  );
}
