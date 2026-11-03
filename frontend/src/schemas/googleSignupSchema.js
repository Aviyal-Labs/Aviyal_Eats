import { z } from 'zod';

import { phoneSchema } from './phoneSchema.js';

export const googleSignupSchema = z.object({
  mobile: phoneSchema,
  restaurant_name: z.string().trim().min(1, 'Enter the restaurant name.').max(255),
  restaurant_phone: phoneSchema,
  city: z.string().trim().min(1, 'Enter the city.').max(100),
  requested_slug: z.string().trim().min(1, 'Enter a restaurant slug.').max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens.'),
});
