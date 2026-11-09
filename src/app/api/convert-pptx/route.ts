import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";
import JSZip from "jszip";

const execAsync = promisify(exec);

// On Windows, native PowerPoint COM can be used for exact slide typography rendering.
// On Linux (Vercel), we cleanly signal fallbackToVector so client-side vector certificates render.
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

      const isWindows = process.platform === "win32";
      if (!isWindows) {
        // On Linux / Vercel, signal client-side vector preview
        return NextResponse.json({
          success: true,
          fallbackToVector: true,
        });
      }

      const pptxBuffer = Buffer.from(pptxBase64, "base64");
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
        // Fall through to fallbackToVector
      } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      }

      return NextResponse.json({
        success: true,
        fallbackToVector: true,
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
