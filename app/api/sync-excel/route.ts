import { NextRequest, NextResponse } from "next/server";
import { CandidateRecord } from "@/lib/types";
import {
  syncCandidatesToSharePoint,
  testSharePointConnection,
  DEFAULT_SHAREPOINT_DB_URL,
} from "@/lib/sharepointSync";

export const dynamic = "force-dynamic";

// GET: Test connection to live SharePoint Excel
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url") || DEFAULT_SHAREPOINT_DB_URL;
    const testResult = await testSharePointConnection(url);
    return NextResponse.json({
      success: true,
      ...testResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// POST: Sync candidate records to live SharePoint Excel
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const records: CandidateRecord[] = body.records || [];
    const sharepointUrl: string =
      body.sharepointUrl ||
      process.env.SHAREPOINT_EXCEL_URL ||
      DEFAULT_SHAREPOINT_DB_URL;
    const webhookUrl: string = body.webhookUrl || process.env.EXCEL_WEBHOOK_URL || "";

    if (!records || records.length === 0) {
      return NextResponse.json({ error: "No records to sync" }, { status: 400 });
    }

    // 1. Direct sync to live SharePoint Excel DB
    let spResult = null;
    let spError: string | null = null;
    try {
      spResult = await syncCandidatesToSharePoint(sharepointUrl, records);
    } catch (err: any) {
      console.error("Direct SharePoint sync error:", err);
      spError = err.message;
    }

    // 2. Optional Webhook Forwarding (if user also configured a webhook)
    let webhookSynced = false;
    if (webhookUrl && webhookUrl.trim()) {
      try {
        const whRes = await fetch(webhookUrl.trim(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "new_candidates_intake",
            timestamp: new Date().toISOString(),
            candidatesCount: records.length,
            records,
          }),
        });
        webhookSynced = whRes.ok;
      } catch (whErr) {
        console.warn("Secondary webhook sync error:", whErr);
      }
    }

    if (spResult && spResult.success) {
      return NextResponse.json({
        success: true,
        directSharepoint: true,
        webhookSynced,
        totalRecords: spResult.totalRecords,
        addedRecords: spResult.addedRecords,
        duplicateRecords: spResult.duplicateRecords,
        sheets: spResult.sheets,
        fileName: spResult.fileName,
        message: `Saved & synced ${spResult.addedRecords} candidate(s) to live SharePoint Excel (${spResult.fileName}) across ${spResult.sheets.length} sheets!`,
      });
    }

    // If SharePoint direct sync failed, report clear details
    if (spError) {
      return NextResponse.json(
        {
          success: false,
          error: `SharePoint Sync Error: ${spError}`,
          webhookSynced,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      directSharepoint: false,
      message: "Candidates processed successfully.",
    });
  } catch (error: any) {
    console.error("Error in /api/sync-excel:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
