import { NextResponse } from "next/server";
import { isValidHttpUrl } from "@/lib/utils";

export const runtime = "edge"; // Can be edge since we're just making HTTP requests

export async function POST(request) {
  try {
    const body = await request.json();
    const url = body?.url?.trim();
    const isAudioOnly = body?.isAudioOnly === true;
    const vQuality = body?.vQuality || "720"; // 144, 240, 360, 480, 720, 1080, max

    if (!isValidHttpUrl(url)) {
      return NextResponse.json(
        { error: "Please enter a valid video URL." },
        { status: 400 }
      );
    }

    const cobaltUrl = process.env.COBALT_API_URL || "https://api.cobalt.tools/api/json";

    const response = await fetch(cobaltUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        vCodec: "h264",
        vQuality,
        isAudioOnly,
        // Optional params you can expose later
        // isNoTTWatermark: true,
      }),
    });

    if (!response.ok) {
      // Handle rate limits or other HTTP errors
      if (response.status === 429) {
        throw new Error("Rate limited by Cobalt API. Please try again later.");
      }
      throw new Error(`Failed to contact Cobalt API: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === "error") {
      let errorMessage = "The video could not be downloaded.";
      const text = data.text?.toLowerCase() || "";
      if (text.includes("private")) errorMessage = "This video is private and cannot be downloaded.";
      else if (text.includes("not found")) errorMessage = "The video could not be found or is unavailable.";
      else if (text.includes("age")) errorMessage = "This video is age-restricted.";
      else errorMessage = data.text || errorMessage;
      
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // picker indicates multiple files (like an imgur gallery), we'll just return error for simplicity or grab the first
    if (data.status === "picker") {
      if (data.picker && data.picker.length > 0) {
        return NextResponse.json({ url: data.picker[0].url });
      }
      return NextResponse.json({ error: "Unsupported media picker format." }, { status: 400 });
    }

    // redirect or stream will provide a direct download URL
    if (data.status === "redirect" || data.status === "stream") {
      return NextResponse.json({ url: data.url });
    }

    return NextResponse.json({ error: "Unknown response from Cobalt." }, { status: 500 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The download could not be completed.",
      },
      { status: 500 }
    );
  }
}
