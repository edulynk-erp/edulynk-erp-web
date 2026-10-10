import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { connection } from 'next/server';
import { brandingCss } from '@/config/branding';
import { getBranding } from '@/server/branding';
import '@fontsource-variable/inter';
import '@/styles/globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const { displayName } = await getBranding();
  return {
    title: { default: displayName, template: `%s · ${displayName}` },
    description: 'Institution ERP.',
    robots: { index: false, follow: false },
  };
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Every page must render per request so Next.js can stamp the proxy's CSP nonce on its scripts.
  await connection();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const branding = await getBranding();
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <style nonce={nonce}>{brandingCss(branding)}</style>
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
