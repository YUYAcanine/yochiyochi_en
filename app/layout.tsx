// app/layout.tsx
import "./globals.css";
import type { Viewport } from "next";
import { ChecklistProvider } from "@/components/checklist";
import Script from "next/script";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import ScrollToTop from "@/components/ScrollToTop";
import ViewportZoomGuard from "@/components/ViewportZoomGuard";
import { Suspense } from "react";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en">
      <head>
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', '${gaId}', { send_page_view: false });
              `}
            </Script>
          </>
        )}
      </head>
      <body>
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        <ViewportZoomGuard />
        <ChecklistProvider>{children}</ChecklistProvider>
        {gaId && (
          <Suspense fallback={null}>
            <GoogleAnalytics gaId={gaId} />
          </Suspense>
        )}
      </body>
    </html>
  );
}

