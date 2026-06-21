'use client';
import { DAppKitProvider } from '@mysten/dapp-kit-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { dAppKit } from '@/lib/sui';
import './globals.css';
import '@mysten/dapp-kit-react/style.css';

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          <DAppKitProvider dAppKit={dAppKit}>
            {children}
          </DAppKitProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
