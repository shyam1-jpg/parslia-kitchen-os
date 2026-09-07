import "./globals.css";
import type { Metadata } from "next";
import Shell from "@/components/Shell";
export const metadata: Metadata = { title: "The Vedanta Way" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en-GB"><body><Shell>{children}</Shell></body></html>);
}
