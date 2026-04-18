import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { downloadVideo } from "@/lib/ytdlp";
import { getMimeType, isValidHttpUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const url = body?.url?.trim();
    const formatId = body?.format_id?.trim();
    const extension = body?.ext?.trim();

    if (!isValidHttpUrl(url)) {
      return NextResponse.json(
        { error: "Please enter a valid video URL." },
        { status: 400 }
      );
    }

    if (!formatId) {
      return NextResponse.json(
        { error: "Please select a format before downloading." },
        { status: 400 }
      );
    }

    const download = await downloadVideo(url, formatId, extension);
    const fileStats = await stat(download.filePath);
    const stream = download.createStream();

    stream.on("close", () => {
      download.cleanup().catch(() => {});
    });

    stream.on("error", () => {
      download.cleanup().catch(() => {});
    });

    return new Response(Readable.toWeb(stream), {
      headers: {
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
          download.fileName
        )}`,
        "Content-Length": fileStats.size.toString(),
        "Content-Type": getMimeType(extension),
        "Cache-Control": "no-store",
      },
    });
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
