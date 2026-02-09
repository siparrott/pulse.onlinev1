import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navigation } from '@/components/navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pulse.Online - Publishing System',
  description: 'Internal governed publishing system for multi-channel content management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 antialiased`}>
        <div className="flex min-h-screen">
          <Navigation />
          <main className="flex-1 pl-64">
            <div className="p-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
