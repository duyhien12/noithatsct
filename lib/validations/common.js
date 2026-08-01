import { z } from 'zod';

export const str = z.string().trim();
export const optStr = z.string().trim().optional().default('');
export const optFloat = z.number().optional().default(0);
export const optInt = z.number().int().optional().default(0);
export const optDate = z.string().datetime({ offset: true }).optional().nullable().transform(v => v ? new Date(v) : null)
    .or(z.string().optional().nullable().transform(v => {
        if (!v) return null;
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    }));
export const cuid = z.string().cuid().optional().nullable();

// For PATCH/update schemas only: a field omitted from the request must stay omitted from the
// parsed output, so it doesn't get spread into a Prisma `data` object and overwrite the existing
// value. optStr/optDate use .default()/unconditional transforms, which are correct for create
// schemas but silently reset every un-sent field to '' / null on partial updates.
export const optStrPatch = z.string().trim().optional();
export const optDatePatch = z.string().datetime({ offset: true }).optional().nullable().transform(v => v === undefined ? undefined : (v ? new Date(v) : null))
    .or(z.string().optional().nullable().transform(v => {
        if (v === undefined) return undefined;
        if (!v) return null;
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    }));
