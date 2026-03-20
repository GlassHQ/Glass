import type { Metadata } from 'next'
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
      </body>
    </html>
  )
}
