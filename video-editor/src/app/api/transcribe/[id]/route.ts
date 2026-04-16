import { NextResponse } from "next/server";
import { API_CONFIG } from "@/constants/api";

const getAuthHeader = () => `${API_CONFIG.TRANSCRIBE.AUTH_PREFIX} ${API_CONFIG.TRANSCRIBE.ENV_KEY}`;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: "id parameter is required" }, { status: 400 });
    }

    const response = await fetch(`${API_CONFIG.TRANSCRIBE.BASE_URL}/transcribe/${id}`, {
      headers: { [API_CONFIG.TRANSCRIBE.AUTH_HEADER]: getAuthHeader() }
    });

    const statusData = await response.json();
    if (!response.ok) {
      return NextResponse.json({ message: statusData?.message || "Failed status transcribe" }, { status: response.status });
    }

    return NextResponse.json(statusData, { status: 200 });
  } catch (error: any) {
    console.error("Transcribe status error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
