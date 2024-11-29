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
    const userEthereumAddress = searchParams.get("userEthereumAddress");

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
      "who is grateful for this breath?",
      "what remains when gratitude dissolves?",
      "where does thankfulness arise from?",
      "in whose heart does gratitude dwell?",
      "what is the source of this feeling of appreciation?",
      "who experiences this moment of grace?",
      "where do grateful thoughts emerge from?",
      "who witnesses this abundance?",
      "what is aware of this blessing?",
      "in what does gratitude appear?",
      "who feels this thankfulness?",
      "where is the seat of appreciation?",
      "what knows this moment of grace?",
      "who observes these grateful thoughts?",
      "where does this feeling of abundance reside?",
      "what is the nature of gratitude itself?",
      "who experiences this contentment?",
      "where does appreciation dissolve into?",
      "what remains when thankfulness subsides?",
      "who is aware of this blessing?",
      "where does this grace originate?",
      "what witnesses this moment of thanks?",
      "who knows this feeling of abundance?",
      "where is the source of this appreciation?",
      "what beholds this gratitude?",
      "who experiences this peace?",
      "where does thankfulness rest?",
      "what is prior to gratitude?",
      "who witnesses this contentment?",
      "where does this blessing dissolve?",
      "what is the essence of appreciation?",
      "who beholds this moment of grace?",
      "where does gratitude merge into?",
      "what remains in pure thankfulness?",
      "who is the knower of this blessing?",
      "where does this peace originate?",
      "what is aware of this abundance?",
      "who experiences this grace?",
      "where does appreciation return to?",
      "what witnesses this contentment?",
      "who beholds this moment of thanks?",
      "where is the root of gratitude?",
      "what knows this peace?",
      "who observes this blessing?",
      "where does thankfulness merge?",
      "what is the source of this grace?",
      "who witnesses this abundance?",
      "where does contentment dissolve?",
      "what beholds this appreciation?",
      "who remains when gratitude subsides?",
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
