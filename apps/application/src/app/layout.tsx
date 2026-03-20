import type { Metadata } from 'next'
import { Databuddy } from '@databuddy/sdk/react'
import '../index.css'

export const metadata: Metadata = {
  title: 'Glass — Application',
  description: 'Glass application',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <div className="application-shell">{children}</div>
        <Databuddy clientId="e5cb7775-b6f4-4586-9720-bdf6207a8302" />
      </body>
    </html>
  )
}
