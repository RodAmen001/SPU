import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { EnregistreurSW } from '@/components/spu/enregistreur-sw';

export const metadata: Metadata = {
  title: 'SPU v4.5 — Système Parabolique Universel',
  description:
    'Orchestrateur narratif multi-IA : synthèse sourcée de plusieurs intelligences, parabole réelle issue d\'un corpus sourcé, histoire personnalisée. Un mentor, pas un maître.',
  applicationName: 'SPU',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'SPU', statusBarStyle: 'default' },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#FAF6EC',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
        <EnregistreurSW />
      </body>
    </html>
  );
}
