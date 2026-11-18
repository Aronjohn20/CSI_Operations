import { NextResponse } from "next/server";

async function shortenWithBitly(longUrl: string): Promise<string | null> {
  const token = process.env.BITLY_ACCESS_TOKEN;
  if (!token || !longUrl) return null;

  try {
    const bitlyRes = await fetch("https://api-ssl.bitly.com/v4/shorten", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        long_url: longUrl,
        domain: "bit.ly",
      }),
    });

    if (bitlyRes.ok) {
      const bitlyData = await bitlyRes.json();
      if (bitlyData.link) {
        return bitlyData.link;
      }
    } else {
      const errorText = await bitlyRes.text().catch(() => "");
      console.warn("Bitly API responded with status:", bitlyRes.status, errorText);
    }
  } catch (err) {
    console.warn("Bitly shortening failed gracefully:", err);
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const action = payload.action || "";

    // Action: Standalone Bitly URL shortening
    if (action === "shorten_url") {
      const longUrl = payload.longUrl;
      if (!longUrl) {
        return NextResponse.json(
          { success: false, error: "longUrl is required" },
          { status: 400 }
        );
      }
      const bitlyUrl = await shortenWithBitly(longUrl);
      return NextResponse.json({
        success: true,
        bitlyUrl: bitlyUrl || null,
      });
    }

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
        
        // Auto-shorten Registration Form URL if created
        if (action === "create_form" && result.success && result.formUrl) {
          try {
            const bitlyUrl = await shortenWithBitly(result.formUrl);
            if (bitlyUrl) {
              result.bitlyUrl = bitlyUrl;
            }
          } catch (bErr) {
            console.warn("Bitly auto-shorten skipped:", bErr);
          }
        }

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

