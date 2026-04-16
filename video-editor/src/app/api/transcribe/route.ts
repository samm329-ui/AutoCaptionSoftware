// app/api/transcribe/route.ts
import { NextResponse } from "next/server";
import { API_CONFIG, API_ENDPOINTS } from "@/constants/api";

const getAuthHeader = () => `${API_CONFIG.RENDER.AUTH_PREFIX} ${API_CONFIG.RENDER.ENV_KEY}`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(
      API_ENDPOINTS.TRANSCRIBE.SPEECH_TO_TEXT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [API_CONFIG.RENDER.AUTH_HEADER]: getAuthHeader()
        },
        body: JSON.stringify(body)
      }
    );

    const responseData = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { message: responseData?.message || "Failed convert audio to text" },
        { status: response.status }
      );
    }

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error("Transcribe error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
