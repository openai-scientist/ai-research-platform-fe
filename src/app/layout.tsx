import type { ReactNode } from "react";

import type { Metadata, Viewport } from "next";

import Providers from "@/app/providers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_CONFIG } from "@/config/app-config";
import { SITE_URL } from "@/config/site-url";
import { fontVars } from "@/lib/fonts/registry";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { ThemeBootScript } from "@/scripts/theme-boot";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";

import "./globals.css";

// Icons, share images and the manifest come from the file conventions in this folder.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: APP_CONFIG.meta.title,
  description: APP_CONFIG.meta.description,
  applicationName: APP_CONFIG.name,
  openGraph: {
    type: "website",
    siteName: APP_CONFIG.name,
    title: APP_CONFIG.meta.title,
    description: APP_CONFIG.meta.description,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_CONFIG.meta.title,
    description: APP_CONFIG.meta.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { theme_mode, theme_preset, content_layout, navbar_style, sidebar_variant, sidebar_collapsible, font } =
    PREFERENCE_DEFAULTS;
  return (
    <html
      lang="en"
      data-theme-mode={theme_mode}
      data-theme-preset={theme_preset}
      data-content-layout={content_layout}
      data-navbar-style={navbar_style}
      data-sidebar-variant={sidebar_variant}
      data-sidebar-collapsible={sidebar_collapsible}
      data-font={font}
      suppressHydrationWarning
    >
      <body className={`${fontVars} min-h-screen antialiased`} suppressHydrationWarning>
        {/* Applies theme and layout preferences on load to avoid flicker and unnecessary server rerenders. */}
        <ThemeBootScript />
        <Providers>
          <TooltipProvider>
            <PreferencesStoreProvider initialValues={PREFERENCE_DEFAULTS}>
              {children}
              {/* Top centre stays clear of bars pinned to the bottom, such as the settings save bar. */}
              <Toaster position="top-center" closeButton />
            </PreferencesStoreProvider>
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
