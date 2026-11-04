import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const webhookUrl = process.env.NEXT_PUBLIC_CSI_GOOGLE_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "NEXT_PUBLIC_CSI_GOOGLE_WEBHOOK_URL is not configured in .env.local",
        },
        { status: 500 }
      );
    }

    const payload = await req.json();

    // Call Google Apps Script Web App
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script responded with HTTP ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to communicate with CSI Google Webhook",
      },
      { status: 500 }
    );
  }
}
