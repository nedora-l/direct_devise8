/**
 * OCR.space API utility
 * Direct fallback when ventilation agent is not available
 */

export interface OCRSpaceResult {
  ParsedResults?: Array<{
    TextOverlay?: any
    FileParseExitCode?: number
    ParsedText?: string
    ErrorMessage?: string
    ErrorDetails?: string
  }>
  IsErroredOnProcessing?: boolean
  ErrorMessage?: string[]
  ProcessingTimeInMilliseconds?: string
}

/**
 * Extract text from PDF/image using OCR.space
 */
export async function extractWithOCRSpace(
  base64Content: string,
  mimeType: string,
  fileName?: string
): Promise<string> {
  const ocrSpaceKey = process.env.OCR_SPACE_KEY
  if (!ocrSpaceKey) {
    throw new Error("OCR_SPACE_KEY not configured")
  }

  const fileType = mimeType.includes("pdf") ? "PDF" : mimeType.includes("png") ? "PNG" : "JPG"
  
  const body = new URLSearchParams({
    base64Image: `data:${mimeType};base64,${base64Content}`,
    language: "fre",
    isOverlayRequired: "false",
    isTable: "true",
    OCREngine: "2",
    scale: "true",
    fileType,
  })

  if (fileName) {
    body.append("filetype", fileType)
  }

  try {
    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: ocrSpaceKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    })

    if (!response.ok) {
      throw new Error(`OCR.space API error: ${response.status} ${response.statusText}`)
    }

    const data: OCRSpaceResult = await response.json()

    if (data.IsErroredOnProcessing) {
      const errorMsg = Array.isArray(data.ErrorMessage)
        ? data.ErrorMessage.join(", ")
        : String(data.ErrorMessage || "OCR processing error")
      throw new Error(`OCR.space error: ${errorMsg}`)
    }

    if (!data.ParsedResults || data.ParsedResults.length === 0) {
      throw new Error("OCR.space: No parsed results")
    }

    // Extract text from all pages
    const texts = data.ParsedResults
      .map((result) => result.ParsedText || "")
      .filter((text) => text.trim().length > 0)

    if (texts.length === 0) {
      throw new Error("OCR.space: No text extracted")
    }

    return texts.join("\n\n")
  } catch (error) {
    console.error("[ocr-space] Extraction error:", error)
    throw error instanceof Error ? error : new Error("OCR.space extraction failed")
  }
}






