import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ContractIQ — AI Contract Review for SMBs',
  description: 'Extract key terms from NDAs and MSAs in minutes. Powered by GPT-4o.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-surface">
        {children}
      </body>
    </html>
  )
}
