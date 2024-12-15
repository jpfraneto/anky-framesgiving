import type { Metadata } from "next";

import "~/app/globals.css";
import { Providers } from "~/app/providers";
import { Comic_Neue } from "next/font/google";
import BottomNav from "~/components/BottomNav";

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
  console.log("RootLayout");
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="upgrade-insecure-requests"
        />
      </head>
      <body className={`${comicSans.className} h-full`}>
        <Providers>{children}</Providers>
        <BottomNav />
      </body>
    </html>
  );
}
