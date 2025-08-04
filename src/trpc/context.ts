// src/trpc/context.ts
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';

export const createContext = ({ req, res }: CreateFastifyContextOptions) => {
  return {
    req,
    res,
    user: req.user ?? null,
  };
};

export type Context = ReturnType<typeof createContext>;
