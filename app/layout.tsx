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
            <header className="chrome-scope h-14 bg-chrome text-chrome-text flex items-center justify-between px-4 border-b border-chrome-border shrink-0">
              <Link href="/" className="font-space-grotesk font-bold text-xl tracking-tight text-chrome-text flex items-center gap-2">
                EDIS
              </Link>
              <div className="text-sm text-chrome-text-muted">
                {user.email} <span className="uppercase text-xs ml-2 bg-chrome-raised text-chrome-text px-1.5 py-0.5 rounded-sm">{user.role}</span>
              </div>
            </header>
            <div className="flex flex-1 overflow-hidden">
              <nav className="chrome-scope w-64 border-r border-chrome-border bg-chrome shrink-0 flex flex-col justify-between">
                <div className="p-4 space-y-1">
                  {/* Rendered from lib/labels, so the sidebar cannot disagree
                      with a page heading about what a role can see. UX only —
                      the backend answers 404 regardless. */}
                  {navigationFor(user.role).map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="block px-3 py-2 text-sm text-chrome-text hover:bg-chrome-hover rounded-sm font-medium"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
                <div className="p-4 border-t border-chrome-border">
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
