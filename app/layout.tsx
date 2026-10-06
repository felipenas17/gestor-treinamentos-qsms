import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Gestor de Treinamentos Internos - QSMS Offshore',
  description: 'Plataforma de gestão de treinamentos, procedimentos POPs, matriz de conformidade e avaliações de eficácia para operações offshore.',
  openGraph: {
    title: 'Gestor de Treinamentos Internos - QSMS Offshore',
    description: 'Plataforma de gestão de treinamentos, procedimentos POPs, matriz de conformidade e avaliações de eficácia para operações offshore.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gestor de Treinamentos Internos - QSMS Offshore',
    description: 'Plataforma de gestão de treinamentos, procedimentos POPs, matriz de conformidade e avaliações de eficácia para operações offshore.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
