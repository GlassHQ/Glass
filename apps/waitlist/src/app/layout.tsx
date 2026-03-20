import type { Metadata } from 'next'
import '@glass/ui/tokens.css'
import '../index.css'
import { AppLayout } from './AppLayout'

export const metadata: Metadata = {
  title: 'Glass — Join the waitlist',
  description: 'Test suite intelligence. Coming soon.',
  icons: {
    icon: [{ url: '/glass-logo.png', type: 'image/png' }],
    apple: '/glass-logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}
