import { z } from 'zod';
export const otpSchema = z.object({ email: z.string().trim().email('Enter a valid email address.'), otp: z.string().regex(/^\d{6}$/, 'Enter the six-digit verification code.') });
