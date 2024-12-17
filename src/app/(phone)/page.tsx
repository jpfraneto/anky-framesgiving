import { Metadata } from "next";
import App from "../app";

const appUrl = process.env.NEXT_PUBLIC_URL;

const frame = {
  version: "next",
  imageUrl: `https://github.com/jpfraneto/images/blob/main/banner-2-anky.png?raw=true`,
  button: {
    title: "Anky",
    action: {
      type: "launch_frame",
      name: '"write"',
      url: appUrl,
      splashImageUrl: `https://github.com/jpfraneto/images/blob/main/splash222.png?raw=true`,
      splashBackgroundColor: "#000000",
    },
  },
};

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Anky",
    openGraph: {
      title: "Anky",
      description: "tell me who you are",
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

export default function Home() {
  console.log("Home");
  return <App />;
}
