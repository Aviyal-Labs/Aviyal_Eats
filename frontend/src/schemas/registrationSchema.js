import { z } from 'zod';
import { phoneSchema } from './phoneSchema.js';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const registrationSchema = z.object({
  owner_full_name: z.string().trim().min(2, 'Enter your full name.').max(150, 'Name must be 150 characters or fewer.'),
  email: z.string().trim().email('Enter a valid email address.').max(254, 'Email must be 254 characters or fewer.'),
  mobile: phoneSchema,
  password: z.string().min(8, 'Password must be at least 8 characters.').regex(/[a-z]/, 'Include at least one lowercase letter.').regex(/[A-Z]/, 'Include at least one uppercase letter.').regex(/\d/, 'Include at least one number.').regex(/[^A-Za-z0-9]/, 'Include at least one special character.'),
  confirm_password: z.string().min(1, 'Confirm your password.'),
  restaurant_name: z.string().trim().min(2, 'Enter your restaurant name.').max(200, 'Restaurant name must be 200 characters or fewer.'),
  restaurant_phone: phoneSchema,
  city: z.string().trim().min(2, 'Enter your city.').max(100, 'City must be 100 characters or fewer.'),
  slug: z.string().trim().min(1, 'Enter a restaurant slug.').max(100, 'Slug must be 100 characters or fewer.').refine((value) => slugPattern.test(value), 'Use lowercase letters, numbers, and single hyphens only.'),
}).refine((values) => values.password === values.confirm_password, { path: ['confirm_password'], message: 'Passwords do not match.' });
