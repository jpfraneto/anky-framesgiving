import type { Metadata } from "next";

import "~/app/globals.css";
import { Providers } from "~/app/providers";
import { Comic_Neue } from "next/font/google";
import { AnkyProvider } from "~/context/AnkyContext";
import { Slide, ToastContainer } from "react-toastify";

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
        <body className={`${comicSans.className} h-full fixed`}>
          <Providers>{children}</Providers>
          <ToastContainer
            position="bottom-center"
            theme="light"
            autoClose={2000}
            hideProgressBar={true}
            newestOnTop={false}
            closeButton={false}
            closeOnClick
            pauseOnHover
            transition={Slide}
            style={{ bottom: "100px" }}
          />
        </body>
      </AnkyProvider>
    </html>
  );
}
