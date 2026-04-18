import { NextResponse } from "next/server";
import { getVideoInfo } from "@/lib/ytdlp";
import { isValidHttpUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const url = body?.url?.trim();

    if (!isValidHttpUrl(url)) {
      return NextResponse.json(
        { error: "Please enter a valid video URL." },
        { status: 400 }
      );
    }

    const videoInfo = await getVideoInfo(url);

    return NextResponse.json(videoInfo);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We couldn't fetch that video right now.",
      },
      { status: 500 }
    );
  }
}
