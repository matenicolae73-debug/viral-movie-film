import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata={title:"ViralMovie AI — AI Movie Studio",description:"Turn one idea into a complete AI movie."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}