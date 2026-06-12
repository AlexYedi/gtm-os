import type { Metadata } from 'next'
import { Inter, Lora } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const lora = Lora({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-lora', display: 'swap' })

export const metadata: Metadata = {
  title: 'Alex Yedi — GTM Engineering, in public',
  description: 'A signal pipeline, built in public. The work, live.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body>{children}</body>
    </html>
  )
}
