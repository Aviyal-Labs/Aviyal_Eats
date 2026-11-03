import { useEffect, useRef } from 'react';
import { deleteOtpDigit, otpDigits, pasteOtp, updateOtpDigit } from './otpInputModel';

export default function OTPInput({ value = '', onChange, disabled = false, error = false }) {
  const refs = useRef([]);
  const digits = otpDigits(value);
  useEffect(() => { if (!disabled && refs.current.length && !value) refs.current[0]?.focus(); }, [disabled, value]);
  const setValue = (next, focusIndex) => { onChange(next); if (focusIndex !== undefined) requestAnimationFrame(() => refs.current[focusIndex]?.focus()); };
  const handleChange = (index, event) => { const digit = event.target.value.replace(/\D/g, '').slice(-1); setValue(updateOtpDigit(value, index, digit), digit && index < 5 ? index + 1 : undefined); };
  const handleKeyDown = (index, event) => { if (event.key === 'Backspace') { event.preventDefault(); setValue(deleteOtpDigit(value, index), index > 0 && !digits[index] ? index - 1 : index); } else if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); refs.current[index - 1]?.focus(); } else if (event.key === 'ArrowRight' && index < 5) { event.preventDefault(); refs.current[index + 1]?.focus(); } };
  const handlePaste = (event) => { event.preventDefault(); const pasted = pasteOtp(event.clipboardData.getData('text')); if (pasted) setValue(pasted, Math.min(pasted.length, 6) - 1); };
  return <div className="flex gap-2 sm:gap-3" role="group" aria-label="Six-digit verification code">{Array.from({ length: 6 }, (_, index) => <input key={index} ref={(element) => { refs.current[index] = element; }} value={digits[index] || ''} onChange={(event) => handleChange(index, event)} onKeyDown={(event) => handleKeyDown(index, event)} onPaste={handlePaste} disabled={disabled} inputMode="numeric" pattern="[0-9]*" autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength={1} aria-label={`Digit ${index + 1} of 6`} aria-invalid={error} className={`h-12 w-10 rounded-xl border bg-white text-center text-xl font-semibold text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-emerald-100 sm:h-14 sm:w-12 ${error ? 'border-red-300' : 'border-slate-200'}`} />)}</div>;
}
