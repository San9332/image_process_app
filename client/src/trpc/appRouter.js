import { initTRPC } from '@trpc/server';
import { z } from 'zod';
const t = initTRPC.context().meta().create();
export const appRouter = t.router({
    loginGoogle: t.procedure
        .meta({ openapi: { method: 'GET', path: '/login/google', protect: false } })
        .query(() => {
        return { url: 'https://accounts.google.com/o/oauth2/v2/auth?...' };
    }),
    // Example image upload endpoint
    uploadImage: t.procedure
        .meta({ openapi: { method: 'POST', path: '/upload', protect: true } })
        .input(z.object({ fileName: z.string() }))
        .mutation(({ input, ctx }) => {
        // simulate storage logic here
        return { success: true, path: `gs://bucket/${input.fileName}` };
    }),
});
