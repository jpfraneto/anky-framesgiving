import { NextResponse } from "next/server";
import { PinataSDK } from "pinata-web3";

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY_URL,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");

    if (!fid) {
      return NextResponse.json(
        { error: "Missing fid parameter" },
        { status: 400 }
      );
    }

    // Generate a unique session ID
    const session_id = crypto.randomUUID();

    // Get a random writing prompt
    const prompts = [
      "Take a breath - what are you grateful for right now?",
      "When you feel grateful, where does that feeling come from?",
      "What lights up inside you when you say thank you?",
      "How does gratitude move through your body?",
      "What small joy are you appreciating in this moment?",
      "Where do you feel thankfulness in your heart?",
      "What simple blessing makes you smile today?",
      "How does being grateful change your perspective?",
      "What unexpected gift are you thankful for?",
      "When you pause to appreciate life, what emerges?",
      "How does gratitude soften your heart?",
      "What beauty around you sparks thankfulness?",
      "Where do you find grace in ordinary moments?",
      "How does appreciation open your awareness?",
      "What fills you with quiet contentment?",
      "When you're still, what gratitude surfaces?",
      "How does thankfulness transform your day?",
      "What gentle joy calls for your appreciation?",
      "Where do you discover unexpected blessings?",
      "How does gratitude illuminate your path?",
      "What simple pleasure brings you peace?",
      "When you're present, what gifts appear?",
      "How does thankfulness expand your heart?",
      "What quiet wonder stirs gratitude in you?",
      "Where do you find abundance in simplicity?",
      "How does appreciation deepen your experience?",
      "What moment of grace touches you now?",
      "When you reflect, what blessings emerge?",
      "How does gratitude connect you to life?",
      "What subtle joy awakens your thanks?",
      "Where do you feel most appreciative?",
      "How does thankfulness ground you here?",
      "What present moment fills you with grace?",
      "When you pause, what gratitude arises?",
      "How does appreciation lighten your spirit?",
      "What simple gift deserves your thanks?",
      "Where do you discover daily blessings?",
      "How does gratitude transform your view?",
      "What gentle peace flows through you now?",
      "When you're open, what joy appears?",
      "How does thankfulness heal your heart?",
      "What quiet blessing surrounds you?",
      "Where do you find unexpected grace?",
      "How does appreciation enrich this moment?",
      "What simple wonder fills you with thanks?",
      "When you breathe, what gratitude flows?",
      "How does thankfulness light your way?",
      "What peaceful joy calls for your grace?",
      "Where do you feel most alive with thanks?",
      "How does gratitude embrace you now?",
    ];
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];

    return NextResponse.json({
      session_id,
      prompt,
    });
  } catch (error) {
    console.error("Error in GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { session_long_string } = await request.json();

    if (!session_long_string) {
      return NextResponse.json(
        { error: "Missing session_long_string" },
        { status: 400 }
      );
    }

    const parsedSession = session_long_string.split("\n");
    const user_id = parsedSession[0];
    const session_id = parsedSession[1];
    // const prompt = parsedSession[2];
    // const starting_timestamp = parsedSession[3];

    const pinataResponse = await pinata.upload.file(
      new File([session_long_string], `${user_id}_${session_id}.txt`, {
        type: "text/plain",
      })
    );

    return NextResponse.json({
      message: "Session data uploaded successfully",
      ipfsHash: pinataResponse.IpfsHash,
    });
  } catch (error) {
    console.error("Error in POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
