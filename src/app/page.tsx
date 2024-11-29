import { Metadata } from "next";
import App from "./app";

const appUrl = process.env.NEXT_PUBLIC_URL;

const frame = {
  version: "next",
  imageUrl: `https://github.com/jpfraneto/images/blob/main/splash222.png?raw=true`,
  button: {
    title: "Launch Frame",
    action: {
      type: "launch_frame",
      name: "Anky",
      url: appUrl,
      splashImageUrl: `https://github.com/jpfraneto/images/blob/main/splash222.png?raw=true`,
      splashBackgroundColor: "#f7f7f7",
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
  return <App />;
}
