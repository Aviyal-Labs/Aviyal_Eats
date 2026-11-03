import { z } from 'zod';

const password = z.string().min(8, 'Password must be at least 8 characters.').regex(/[a-z]/, 'Include at least one lowercase letter.').regex(/[A-Z]/, 'Include at least one uppercase letter.').regex(/\d/, 'Include at least one number.').regex(/[^A-Za-z0-9]/, 'Include at least one special character.');

export const passwordResetRequestSchema = z.object({ email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.') });
export const passwordResetSchema = z.object({ email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'), otp: z.string().regex(/^\d{6}$/, 'Enter the six-digit reset code.'), new_password: password, confirm_password: z.string().min(1, 'Confirm your password.') }).refine((values) => values.new_password === values.confirm_password, { path: ['confirm_password'], message: 'Passwords do not match.' });
