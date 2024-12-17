import type { Metadata } from "next";

import "~/app/globals.css";
import { Providers } from "~/app/providers";
import { Comic_Neue } from "next/font/google";
import { AnkyProvider } from "~/context/AnkyContext";

const comicSans = Comic_Neue({
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Anky",
  description: "just write. life will do the rest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="upgrade-insecure-requests"
        />
      </head>
      <AnkyProvider>
        <body className={`${comicSans.className} h-full`}>
          <Providers>{children}</Providers>
        </body>
      </AnkyProvider>
    </html>
  );
}
