import type { Metadata } from "next"
import "./globals.css"
import { AppProviders } from "./providers"

export const metadata: Metadata = {
  applicationName: "Builders Operations",
  title: {
    default: "Builders Operations",
    template: "%s | Builders Operations",
  },
  description: "Internal flooring operations, inventory, importing, template, and work-order management.",
  robots: {
    index: false,
    follow: false,
  },
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
