import type React from "react"
import type { Metadata } from "next"
import { Quicksand } from "next/font/google"
import "./globals.css"

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand",
})

export const metadata: Metadata = {
  title: "Cozy Bites - Jellycat-Inspired Food Ordering",
  description: "A soft, playful, and clean food ordering web page inspired by Jellycat",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={quicksand.variable}>{children}</body>
    </html>
  )
}
