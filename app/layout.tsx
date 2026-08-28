import type { Metadata } from "next";
import { Space_Grotesk, Sora } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { navigationFor } from "@/lib/labels";
import { SignOutButton } from "./components/sign-out-button";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EDIS",
  description: "Enterprise Document Intelligence System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className="h-full">
      <body
        className={`${spaceGrotesk.variable} ${sora.variable} antialiased bg-canvas text-text h-full overflow-hidden`}
      >
        {!user ? (
          <main className="h-full overflow-y-auto">{children}</main>
        ) : (
          <div className="flex h-full flex-col">
            <header className="h-14 bg-structure flex items-center justify-between px-4 border-b border-border shrink-0">
              <Link href="/" className="font-space-grotesk font-bold text-xl tracking-tight text-accent flex items-center gap-2">
                EDIS
              </Link>
              <div className="text-sm text-text-muted">
                {user.email} <span className="uppercase text-xs ml-2 bg-border px-1.5 py-0.5">{user.role}</span>
              </div>
            </header>
            <div className="flex flex-1 overflow-hidden">
              <nav className="w-64 border-r border-border bg-structure/50 shrink-0 flex flex-col justify-between">
                <div className="p-4 space-y-1">
                  {/* Rendered from lib/labels, so the sidebar cannot disagree
                      with a page heading about what a role can see. UX only —
                      the backend answers 404 regardless. */}
                  {navigationFor(user.role).map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="block px-3 py-2 text-sm text-text hover:bg-canvas font-medium"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
                <div className="p-4 border-t border-border">
                  <SignOutButton />
                </div>
              </nav>
              <main className="flex-1 overflow-y-auto bg-canvas relative p-6">
                {children}
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
