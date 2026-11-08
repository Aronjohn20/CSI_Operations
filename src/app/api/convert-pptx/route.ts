import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";
import JSZip from "jszip";

const execAsync = promisify(exec);

// Helper to extract the largest slide image from a PPTX buffer using JSZip
async function extractImageFromPptx(buffer: Buffer): Promise<string | null> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const mediaFiles = Object.keys(zip.files).filter(
      (f) => f.startsWith("ppt/media/") && !zip.files[f].dir
    );

    let maxLen = 0;
    let candidateData: string | null = null;
    let candidateExt = "jpeg";

    for (const m of mediaFiles) {
      const lower = m.toLowerCase();
      if (
        lower.endsWith(".png") ||
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".webp")
      ) {
        const data = await zip.files[m].async("base64");
        if (data.length > maxLen) {
          maxLen = data.length;
          candidateExt = lower.endsWith(".png") ? "png" : "jpeg";
          candidateData = data;
        }
      }
    }

    if (candidateData) {
      return `data:image/${candidateExt};base64,${candidateData}`;
    }
    return null;
  } catch (err) {
    console.warn("Server-side PPTX zip image extraction failed:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, items, pptxBase64 } = body;

    const tmpDir = path.join(
      os.tmpdir(),
      `csi_cert_${Date.now()}_${Math.random().toString(36).substring(7)}`
    );

    // Action 1: Generate Preview Image from Slide 1 of a PPTX
    if (action === "preview") {
      if (!pptxBase64) {
        return NextResponse.json(
          { success: false, error: "pptxBase64 required for preview" },
          { status: 400 }
        );
      }

      const pptxBuffer = Buffer.from(pptxBase64, "base64");

      // 1. Try server-side JSZip media extraction (platform independent, works on Vercel)
      const zipImage = await extractImageFromPptx(pptxBuffer);

      // 2. If on Windows, try native PowerPoint COM for exact slide typography rendering
      const isWindows = process.platform === "win32";
      if (isWindows) {
        fs.mkdirSync(tmpDir, { recursive: true });
        const inputPptx = path.join(tmpDir, "template.pptx");
        const outputJpg = path.join(tmpDir, "preview.jpg");
        fs.writeFileSync(inputPptx, pptxBuffer);

        const psScript = `
          try {
            $ppt = New-Object -ComObject PowerPoint.Application
            $pres = $ppt.Presentations.Open('${inputPptx.replace(/'/g, "''")}', -1, 0, 0)
            $slide = $pres.Slides.Item(1)
            $slide.Export('${outputJpg.replace(/'/g, "''")}', "JPG", 1920, 1080)
            $pres.Close()
            $ppt.Quit()
            [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
            Write-Output "SUCCESS"
          } catch {
            Write-Error $_.Exception.Message
            exit 1
          }
        `;

        const psFile = path.join(tmpDir, "preview.ps1");
        fs.writeFileSync(psFile, psScript, "utf8");

        try {
          await execAsync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${psFile}"`);
          if (fs.existsSync(outputJpg)) {
            const jpgBuf = fs.readFileSync(outputJpg);
            const base64Data = `data:image/jpeg;base64,${jpgBuf.toString("base64")}`;
            return NextResponse.json({ success: true, previewImage: base64Data });
          }
        } catch {
          // If Windows COM fails, fall back to zipImage below
        } finally {
          try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        }
      }

      // Return extracted zip background image if COM wasn't used or failed
      if (zipImage) {
        return NextResponse.json({ success: true, previewImage: zipImage });
      }

      return NextResponse.json({
        success: false,
        error: "Could not generate slide preview image from PPTX",
      });
    }

    // Action 2: Batch Convert PPTX files to PDF
    if (action === "batch_convert") {
      if (!items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { success: false, error: "items array required" },
          { status: 400 }
        );
      }

      const isWindows = process.platform === "win32";
      if (!isWindows) {
        // On Linux / Vercel, signal client-side fallback to jsPDF
        return NextResponse.json({
          success: true,
          fallbackToClient: true,
          pdfs: {},
        });
      }

      fs.mkdirSync(tmpDir, { recursive: true });
      const conversionList: { name: string; pptxPath: string; pdfPath: string }[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const safeName = `cert_${i}_${item.name.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
        const pptxPath = path.join(tmpDir, `${safeName}.pptx`);
        const pdfPath = path.join(tmpDir, `${safeName}.pdf`);

        fs.writeFileSync(pptxPath, Buffer.from(item.pptxBase64, "base64"));
        conversionList.push({
          name: item.name,
          pptxPath,
          pdfPath,
        });
      }

      const lines = [
        "try {",
        "  $ppt = New-Object -ComObject PowerPoint.Application",
      ];

      for (const conv of conversionList) {
        lines.push(`  $pres = $ppt.Presentations.Open('${conv.pptxPath.replace(/'/g, "''")}', -1, 0, 0)`);
        lines.push(`  $pres.SaveAs('${conv.pdfPath.replace(/'/g, "''")}', 32)`);
        lines.push(`  $pres.Close()`);
      }

      lines.push("  $ppt.Quit()");
      lines.push("  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null");
      lines.push('  Write-Output "SUCCESS"');
      lines.push("} catch {");
      lines.push("  Write-Error $_.Exception.Message");
      lines.push("  exit 1");
      lines.push("}");

      const psFile = path.join(tmpDir, "convert_batch.ps1");
      fs.writeFileSync(psFile, lines.join("\n"), "utf8");

      try {
        await execAsync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${psFile}"`);

        const results: Record<string, string> = {};
        for (const conv of conversionList) {
          if (fs.existsSync(conv.pdfPath)) {
            const pdfBuf = fs.readFileSync(conv.pdfPath);
            results[conv.name] = pdfBuf.toString("base64");
          }
        }

        return NextResponse.json({
          success: true,
          convertedCount: Object.keys(results).length,
          pdfs: results,
        });
      } catch (err: any) {
        console.warn("Batch PPTX to PDF conversion failed:", err.message);
        return NextResponse.json({
          success: true,
          fallbackToClient: true,
          pdfs: {},
        });
      } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      }
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
