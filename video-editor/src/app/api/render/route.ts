import { NextResponse } from "next/server";
import { API_CONFIG, API_ENDPOINTS } from "@/constants/api";

const getAuthHeader = (config: typeof API_CONFIG.RENDER) => 
  `${config.AUTH_PREFIX} ${config.ENV_KEY}`;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const projectResponse = await fetch(
      API_ENDPOINTS.RENDER.CREATE_PROJECT(),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [API_CONFIG.RENDER.AUTH_HEADER]: getAuthHeader(API_CONFIG.RENDER)
        },
        body: JSON.stringify(body)
      }
    );

    if (!projectResponse.ok) {
      const projectError = await projectResponse.json();
      return NextResponse.json(
        { message: projectError?.message || "Failed to create project" },
        { status: projectResponse.status }
      );
    }

    const projectData = await projectResponse.json();
    const projectId = projectData.project.id;
    console.log("Project created:", projectId);

    const exportResponse = await fetch(
      API_ENDPOINTS.RENDER.CREATE_EXPORT(projectId),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [API_CONFIG.RENDER.AUTH_HEADER]: getAuthHeader(API_CONFIG.RENDER)
        }
      }
    );

    if (!exportResponse.ok) {
      const exportError = await exportResponse.json();
      return NextResponse.json(
        { message: exportError?.message || "Failed to initialize export" },
        { status: exportResponse.status }
      );
    }

    const exportData = await exportResponse.json();
    return NextResponse.json(exportData, { status: 200 });
  } catch (error) {
    console.error("Render POST error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ message: "id parameter is required" }, { status: 400 });
    }

    const response = await fetch(API_ENDPOINTS.RENDER.GET_RENDER_STATUS(id), {
      headers: {
        [API_CONFIG.TRANSCRIBE.AUTH_HEADER]: getAuthHeader(API_CONFIG.TRANSCRIBE)
      }
    });

    if (!response.ok) {
      return NextResponse.json({ message: "Failed to fetch export status" }, { status: response.status });
    }

    const statusData = await response.json();
    return NextResponse.json(statusData, { status: 200 });
  } catch (error) {
    console.error("Render GET error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
