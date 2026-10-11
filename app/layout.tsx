import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { HelpChatbotView } from '@/frontend/views/ai/HelpChatbotView'
import './globals.css'
import 'leaflet/dist/leaflet.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'FoodRescue — Donate Surplus Food to Verified NGOs',
  description:
    'FoodRescue connects restaurants, events, and households with nearby verified NGOs to pick up and redistribute surplus food in minutes.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#FFC107',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        <HelpChatbotView aiConfigured={Boolean(process.env.GEMINI_API_KEY)} />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
