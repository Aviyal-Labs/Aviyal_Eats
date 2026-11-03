import { z } from 'zod';

export const phoneSchema = z.string().trim()
  .transform((value) => value.replace(/[\s().-]/g, ''))
  .refine((value) => /^\+[1-9]\d{7,14}$/.test(value), 'Use an international phone number, including the country code.');
