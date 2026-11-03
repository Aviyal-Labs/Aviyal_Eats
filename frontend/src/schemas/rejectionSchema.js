import { z } from 'zod';
export const rejectionSchema = z.object({ reason: z.string().trim().min(1, 'A rejection reason is required.').max(500, 'Reason must be 500 characters or fewer.') });
