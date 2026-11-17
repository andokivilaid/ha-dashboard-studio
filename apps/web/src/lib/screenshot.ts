"use client";

/**
 * Captures the rendered dashboard as a PNG data URL so a vision model can
 * look at it.
 *
 * `modern-screenshot` serialises the live DOM into an SVG foreignObject and
 * rasterises it in-browser. That runs anywhere the app does — including
 * Vercel's serverless runtime, where a headless browser is not available —
 * and it captures exactly the pixels the user is looking at, HACS web
 * components included.
 */
export async function captureElement(
  element: HTMLElement,
  opts: { scale?: number; maxWidth?: number; background?: string } = {},
): Promise<string> {
  const { domToPng } = await import("modern-screenshot");
  const scale = opts.scale ?? 1;
  return domToPng(element, {
    scale,
    quality: 0.92,
    backgroundColor: opts.background,
    // Webfonts are already loaded in the page; re-embedding them is slow and
    // occasionally trips CORS on the font files.
    font: false,
    filter: (node) => {
      if (!(node instanceof Element)) return true;
      // Skip the builder's own selection outlines.
      return !node.classList?.contains("hs-no-capture");
    },
  });
}

/** Rough byte size of a data URL, for keeping requests under provider limits. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((base64.length * 3) / 4);
}
