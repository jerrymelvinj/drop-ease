export async function generateFileThumbnail(file: File): Promise<string> {
  const isPdf = file.name.toLowerCase().endsWith(".pdf");

  if (isPdf && typeof window !== "undefined") {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      const page = await pdfDoc.getPage(1);

      const scale = 0.6;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");

      if (context) {
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        return canvas.toDataURL("image/jpeg", 0.75);
      }
    } catch (err) {
      console.warn(`Could not render PDF canvas thumbnail for ${file.name}:`, err);
    }
  }

  // Fallback SVG data-URI showing document header preview
  const title = file.name.replace(/\.[^/.]+$/, "").slice(0, 24);
  const ext = file.name.split(".").pop()?.toUpperCase() || "DOC";
  const badgeColor = ext === "PDF" ? "#DC2626" : "#2563EB";

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400" fill="#FFFFFF">
    <rect width="300" height="400" rx="12" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="2"/>
    <rect x="24" y="24" width="48" height="20" rx="4" fill="${badgeColor}"/>
    <text x="48" y="38" fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">${ext}</text>
    <rect x="24" y="58" width="180" height="14" rx="3" fill="#1F2937"/>
    <rect x="24" y="80" width="120" height="10" rx="2" fill="#6B7280"/>
    <line x1="24" y1="105" x2="276" y2="105" stroke="#E5E7EB" stroke-width="1.5"/>
    <rect x="24" y="125" width="252" height="8" rx="2" fill="#E5E7EB"/>
    <rect x="24" y="142" width="230" height="8" rx="2" fill="#E5E7EB"/>
    <rect x="24" y="159" width="190" height="8" rx="2" fill="#E5E7EB"/>
    <rect x="24" y="185" width="100" height="10" rx="2" fill="#9CA3AF"/>
    <rect x="24" y="205" width="252" height="7" rx="2" fill="#E5E7EB"/>
    <rect x="24" y="219" width="240" height="7" rx="2" fill="#E5E7EB"/>
    <rect x="24" y="233" width="200" height="7" rx="2" fill="#E5E7EB"/>
    <rect x="24" y="260" width="120" height="10" rx="2" fill="#9CA3AF"/>
    <rect x="24" y="280" width="252" height="7" rx="2" fill="#E5E7EB"/>
    <rect x="24" y="294" width="220" height="7" rx="2" fill="#E5E7EB"/>
    <text x="150" y="365" fill="#6B7280" font-family="sans-serif" font-size="12" text-anchor="middle">${title}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
