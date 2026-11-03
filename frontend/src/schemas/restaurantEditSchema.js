import { z } from 'zod';
import { phoneSchema } from './phoneSchema.js';

export const restaurantEditSchema = z.object({
  name: z.string().trim().min(1, 'Enter the restaurant name.').max(200),
  phone: phoneSchema,
  city: z.string().trim().min(1, 'Enter the city.').max(100),
});
