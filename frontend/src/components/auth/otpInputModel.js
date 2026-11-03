export const OTP_LENGTH = 6;

export function otpDigits(value = '') { return Array.from({ length: OTP_LENGTH }, (_, index) => value[index] || ''); }
export function updateOtpDigit(value, index, input) { const digits = otpDigits(value); digits[index] = input.replace(/\D/g, '').slice(-1); return digits.join(''); }
export function deleteOtpDigit(value, index) { const digits = otpDigits(value); if (digits[index]) digits[index] = ''; else if (index > 0) digits[index - 1] = ''; return digits.join(''); }
export function pasteOtp(value) { return value.replace(/\D/g, '').slice(0, OTP_LENGTH); }
