import { z } from 'zod';
export const rejectionSchema = z.object({ reason: z.string().trim().min(1, 'A rejection reason is required.').max(2000, 'Reason must be 2000 characters or fewer.') });
