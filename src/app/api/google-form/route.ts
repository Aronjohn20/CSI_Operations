import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const action = payload.action || "";

    // Route feedback actions to feedback webhook (or master fallback), and registration actions to master webhook (or feedback fallback)
    const isFeedbackAction = action.includes("feedback");
    const webhookUrl = isFeedbackAction
      ? (process.env.NEXT_PUBLIC_CSI_FEEDBACK_WEBHOOK_URL || process.env.NEXT_PUBLIC_CSI_GOOGLE_WEBHOOK_URL)
      : (process.env.NEXT_PUBLIC_CSI_GOOGLE_WEBHOOK_URL || process.env.NEXT_PUBLIC_CSI_FEEDBACK_WEBHOOK_URL);

    if (!webhookUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Neither NEXT_PUBLIC_CSI_FEEDBACK_WEBHOOK_URL nor NEXT_PUBLIC_CSI_GOOGLE_WEBHOOK_URL is configured in .env.local",
        },
        { status: 500 }
      );
    }

    // Call Google Apps Script Web App with automatic retry for cold starts / transient timeouts
    let lastError: any = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 28000); // 28s timeout

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          redirect: "follow",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Google Apps Script responded with HTTP ${response.status}`);
        }

        const result = await response.json();
        return NextResponse.json(result);
      } catch (err: any) {
        lastError = err;
        if (attempt === 1) {
          // Wait 800ms before second attempt if cold start or network glitch
          await new Promise((res) => setTimeout(res, 800));
        }
      }
    }

    throw lastError || new Error("Failed to communicate with CSI Google Webhook after retrying.");
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

