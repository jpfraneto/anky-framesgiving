import { ImageResponse } from "next/og";

export const alt = "Anky";
export const size = {
  width: 800,
  height: 800,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div tw="h-full w-full flex flex-col justify-center items-center relative">
        <h1 tw="text-6xl">Anky</h1>
      </div>
    ),
    {
      ...size,
    },
  );
}
