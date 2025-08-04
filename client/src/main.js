import { jsx as _jsx } from "react/jsx-runtime";
// import { StrictMode } from 'react';
// import { createRoot } from 'react-dom/client';
// import './index.css';
// import App from './App'; 
// import { trpc } from './utils/trpc';  // your tRPC client
// import { httpBatchLink } from '@trpc/client';
// import { QueryClient } from '@tanstack/react-query';
// // Initialize React Query client
// const queryClient = new QueryClient();
// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <trpc.Provider
//       client={trpc.createClient({
//         links: [
//           httpBatchLink({
//             url: 'http://localhost:3001/trpc',  // your backend tRPC endpoint
//             credentials: 'include',  // to send cookies (for auth)
//           }),
//         ],
//       })}
//       queryClient={queryClient}
//     >
//       <App />
//     </trpc.Provider>
//   </StrictMode>
// );
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App'; // remove the .tsx extension from import
// Remove all tRPC imports and code here
createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(App, {}) }));
