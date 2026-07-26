import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AicoreOps — Panel de Plataforma',
  description: 'Monitoreo y soporte multi-tenant de AicoreMed',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
