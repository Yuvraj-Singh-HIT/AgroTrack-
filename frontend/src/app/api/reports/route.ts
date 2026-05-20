import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  adminConfigErrorMessage,
  hasAdminCredentials,
  shouldUseLocalAuthStore,
} from "@/firebase/server";
import {
  createReportDocument,
  listReportsByOwner,
  type CreateReportInput,
  type ReportType,
} from "@backend/lib/db/reports";

const REPORT_TYPES: ReportType[] = [
  "Climate Risk",
  "Soil Analysis",
  "Profit Planner",
  "Plant Diagnosis",
  "Irrigation",
  "Crop Management",
];

function isReportType(value: string): value is ReportType {
  return (REPORT_TYPES as string[]).includes(value);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!shouldUseLocalAuthStore() && !hasAdminCredentials()) {
      return NextResponse.json({ error: adminConfigErrorMessage() }, { status: 503 });
    }

    const reports = await listReportsByOwner(email, 50);
    return NextResponse.json({ reports });
  } catch (error) {
    console.error("[GET /api/reports]", error);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!shouldUseLocalAuthStore() && !hasAdminCredentials()) {
      return NextResponse.json({ error: adminConfigErrorMessage() }, { status: 503 });
    }

    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const record = body as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const type = typeof record.type === "string" ? record.type : "";

    if (!title || !isReportType(type)) {
      return NextResponse.json({ error: "title and valid type are required" }, { status: 400 });
    }

    const input: CreateReportInput = {
      ownerEmail: email,
      title,
      type,
      content:
        typeof record.content === "object" && record.content !== null
          ? (record.content as Record<string, unknown>)
          : {},
      metadata:
        typeof record.metadata === "object" && record.metadata !== null
          ? (record.metadata as Record<string, unknown>)
          : {},
      status:
        record.status === "pending" ||
        record.status === "processing" ||
        record.status === "completed" ||
        record.status === "failed"
          ? record.status
          : "completed",
    };

    const id = await createReportDocument(input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/reports]", error);
    return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
  }
}
