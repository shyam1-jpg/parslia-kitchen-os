import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Book · The Vedanta" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en-GB"><body>{children}</body></html>;
}
