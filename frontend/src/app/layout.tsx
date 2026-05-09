import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Horizon Command — Maritime Crisis Operations',
  description: 'Real-time maritime crisis operations platform for the Strait of Hormuz',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
      </head>
      <body className="ambient-bg grid-overlay min-h-screen">
        {children}
      </body>
    </html>
  );
}
