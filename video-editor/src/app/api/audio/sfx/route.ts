import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { limit = 30, page = 1, query = {} } = body;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "https://api.example.com"}/sfx`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.SFX_API_KEY || ""}`,
        },
        body: JSON.stringify({
          limit,
          page,
          query,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`SFX API responded with status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching SFX:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { 
        soundEffects: [],
        pagination: { hasMore: false }
      },
      { status: 200 }
    );
  }
}
