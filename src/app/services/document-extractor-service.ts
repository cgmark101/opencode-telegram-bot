import { config } from "../../config.js";
import { logger } from "../../utils/logger.js";

const REQUEST_TIMEOUT_MS = 60_000;

export interface DocExtractorResult {
  text: string;
}

export function isDocExtractorConfigured(): boolean {
  return Boolean(config.docExtractor.apiUrl && config.docExtractor.apiKey);
}

export async function extractDocument(
  fileBuffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<DocExtractorResult> {
  if (!isDocExtractorConfigured()) {
    throw new Error(
      "Document extractor is not configured: DOC_EXTRACTOR_URL and DOC_EXTRACTOR_API_KEY are required",
    );
  }

  const url = config.docExtractor.apiUrl!;

  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(fileBuffer)]), filename);

  logger.debug(
    `[DocExtractor] Sending extraction request: url=${url}, mime=${mimeType}, filename=${filename}, size=${fileBuffer.length} bytes`,
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.docExtractor.apiKey}`,
      },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Document extractor API returned HTTP ${response.status}: ${errorBody || response.statusText}`,
      );
    }

    const data = (await response.json()) as { text?: string };

    if (typeof data.text !== "string") {
      throw new Error("Document extractor API response does not contain a text field");
    }

    return { text: data.text };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Document extractor request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
