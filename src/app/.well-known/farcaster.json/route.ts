export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL;

  const config = {
    accountAssociation: {
      header:
        "eyJmaWQiOjE2MDk4LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4YUIyMERlOGY1QTRmOGUxNDdCYWFDOUQxZjZlMjM2ODYxNDg1NTE2QSJ9",
      payload: "eyJkb21haW4iOiJmcmFtZXNnaXZpbmcuYW5reS5ib3QifQ",
      signature:
        "MHg4NmFkZjY2NjcwYzc3MzAyZjFiMDhlOGU1ZWMxMzAxZmU0MjNlOTE0NTA1MjI3MWQ0OWYwM2I4OWRhMmRmNTgwNmYyOWYzODViZmFmNzcyZDk1NmIxZWVjNGJjMWM2ODM5N2E2NDNiODRhYjg4NTk0OTFiNGRhNTAwNzYwNTRhMzFj",
    },
    frame: {
      name: "Anky",
      version: "next",
      iconUrl:
        "https://github.com/jpfraneto/images/blob/main/anky_v0.png?raw=true",
      imageUrl:
        "https://github.com/jpfraneto/images/blob/main/banner-2-anky.png?raw=true",
      homeUrl: "https://framesgiving.anky.bot",
      splashImageUrl:
        "https://github.com/jpfraneto/images/blob/main/anky_v0.png?raw=true",
      splashBackgroundColor: "#9D00FF",
      webhookUrl: "https://farcaster.anky.bot/farcaster-webhook",
    },
  };

  return Response.json(config);
}
