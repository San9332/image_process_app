import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../trpc/appRouter';
import { httpBatchLink } from '@trpc/client';

// export const trpc = createTRPCReact<AppRouter>();

// export const trpcClient = trpc.createClient({
//   links: [
//     httpBatchLink({
//       url: 'http://localhost:3001/trpc',
//       fetch(url, options) {
//         return fetch(url, {
//           ...options,
//           credentials: 'include',
//         });
//       },
//     }),
//   ],
// });


import React from 'react';

export const trpc = {
  // Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  createClient: () => ({}),
};
