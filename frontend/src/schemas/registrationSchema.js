import { z } from 'zod';

const compactPhone = (value) => value.replace(/[\s().-]/g, '');
const indianMobile = /^\+91[6-9]\d{9}$/;
const e164Phone = /^\+[1-9]\d{7,14}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const registrationSchema = z.object({
  owner_full_name: z.string().trim().min(2, 'Enter your full name.').max(150, 'Name must be 150 characters or fewer.'),
  email: z.string().trim().email('Enter a valid email address.').max(254, 'Email must be 254 characters or fewer.'),
  mobile: z.string().trim().transform(compactPhone).refine((value) => indianMobile.test(value), 'Enter an Indian mobile number in +91XXXXXXXXXX format.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').regex(/[a-z]/, 'Include at least one lowercase letter.').regex(/[A-Z]/, 'Include at least one uppercase letter.').regex(/\d/, 'Include at least one number.').regex(/[^A-Za-z0-9]/, 'Include at least one special character.'),
  confirm_password: z.string().min(1, 'Confirm your password.'),
  restaurant_name: z.string().trim().min(2, 'Enter your restaurant name.').max(200, 'Restaurant name must be 200 characters or fewer.'),
  restaurant_phone: z.string().trim().transform(compactPhone).refine((value) => e164Phone.test(value), 'Use an international phone format, for example +914842000000.'),
  city: z.string().trim().min(2, 'Enter your city.').max(100, 'City must be 100 characters or fewer.'),
  slug: z.string().trim().min(1, 'Enter a restaurant slug.').max(100, 'Slug must be 100 characters or fewer.').refine((value) => slugPattern.test(value), 'Use lowercase letters, numbers, and single hyphens only.'),
}).refine((values) => values.password === values.confirm_password, { path: ['confirm_password'], message: 'Passwords do not match.' });
