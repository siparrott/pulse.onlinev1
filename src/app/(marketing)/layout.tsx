import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AxixOS - Governed Publishing System',
  description: 'Internal governed publishing system for multi-channel content management',
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
