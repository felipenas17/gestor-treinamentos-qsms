import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'SGI — Sistema de Gestão Integrado | Tiger Rentank',
  description: 'Portal SGI Tiger Rentank — Qualidade, Segurança e Meio Ambiente. ISO 9001 · ISO 45001 · ISO 14001.',
  openGraph: {
    title: 'SGI — Sistema de Gestão Integrado | Tiger Rentank',
    description: 'Portal SGI Tiger Rentank — Qualidade, Segurança e Meio Ambiente. ISO 9001 · ISO 45001 · ISO 14001.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SGI — Sistema de Gestão Integrado | Tiger Rentank',
    description: 'Portal SGI Tiger Rentank — Qualidade, Segurança e Meio Ambiente. ISO 9001 · ISO 45001 · ISO 14001.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
