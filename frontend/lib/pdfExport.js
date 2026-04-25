const MODERN_COLOR_FUNCTIONS = /\b(?:oklch|oklab|lch|lab|color)\(/i;
const OKLCH_COLOR = /oklch\(\s*([+-]?(?:\d+|\d*\.\d+)%?)\s+([+-]?(?:\d+|\d*\.\d+)%?)\s+([+-]?(?:\d+|\d*\.\d+)(?:deg|rad|turn)?)\s*(?:\/\s*([^)]+))?\)/gi;

const COLOR_PROPERTIES = [
  "backgroundColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderRightColor",
  "borderTopColor",
  "caretColor",
  "color",
  "columnRuleColor",
  "outlineColor",
  "textDecorationColor",
  "webkitTextFillColor",
  "webkitTextStrokeColor",
];

const SHADOW_PROPERTIES = ["boxShadow", "textShadow"];
const PAGE_BREAK_SELECTOR =
  "article, section, table, thead, tbody, tr, img, svg, canvas, p, li, h1, h2, h3, h4, h5, h6, [class*='rounded'], [class*='shadow'], [class*='grid']";

const FALLBACK_COLORS = {
  backgroundColor: "rgb(255, 255, 255)",
  borderBottomColor: "rgb(229, 231, 235)",
  borderLeftColor: "rgb(229, 231, 235)",
  borderRightColor: "rgb(229, 231, 235)",
  borderTopColor: "rgb(229, 231, 235)",
  color: "rgb(17, 24, 39)",
  default: "rgb(75, 85, 99)",
};

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function parsePercentOrNumber(value, percentScale = 1) {
  const text = String(value).trim();
  const number = Number.parseFloat(text);
  if (Number.isNaN(number)) return 0;
  return text.endsWith("%") ? (number / 100) * percentScale : number;
}

function parseHue(value) {
  const text = String(value).trim();
  const number = Number.parseFloat(text);
  if (Number.isNaN(number)) return 0;
  if (text.endsWith("rad")) return (number * 180) / Math.PI;
  if (text.endsWith("turn")) return number * 360;
  return number;
}

function parseAlpha(value) {
  if (!value) return 1;
  const firstToken = String(value).trim().split(/\s+/)[0];
  if (firstToken.includes("var(")) return 1;
  return clamp(parsePercentOrNumber(firstToken, 1));
}

function linearToSrgb(value) {
  const clamped = clamp(value);
  if (clamped <= 0.0031308) return 12.92 * clamped;
  return 1.055 * clamped ** (1 / 2.4) - 0.055;
}

function oklchToRgb(lightnessValue, chromaValue, hueValue, alphaValue) {
  const lightness = parsePercentOrNumber(lightnessValue, 1);
  const chroma = parsePercentOrNumber(chromaValue, 0.4);
  const hue = (parseHue(hueValue) * Math.PI) / 180;
  const alpha = parseAlpha(alphaValue);

  const a = Math.cos(hue) * chroma;
  const b = Math.sin(hue) * chroma;

  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b;

  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  const red = linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const green = linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const blue = linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);

  const channels = [red, green, blue].map((channel) =>
    Math.round(clamp(channel) * 255),
  );

  if (alpha < 1) {
    return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})`;
  }

  return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`;
}

function replaceOklchColors(value, fallbackColor) {
  if (!value || !MODERN_COLOR_FUNCTIONS.test(value)) return value;

  const converted = value.replace(
    OKLCH_COLOR,
    (_match, lightness, chroma, hue, alpha) =>
      oklchToRgb(lightness, chroma, hue, alpha),
  );

  return MODERN_COLOR_FUNCTIONS.test(converted) ? fallbackColor : converted;
}

function normalizeCanvasColor(value, propertyName) {
  if (!value) return value;

  const fallbackColor =
    FALLBACK_COLORS[propertyName] || FALLBACK_COLORS.default;

  if (value === "transparent" || value === "rgba(0, 0, 0, 0)") {
    return value;
  }

  return replaceOklchColors(value, fallbackColor);
}

function collectColorSnapshot(root) {
  const nodes = [root, ...root.querySelectorAll("*")];

  return nodes.map((node) => {
    const styles = window.getComputedStyle(node);
    const colors = {};

    COLOR_PROPERTIES.forEach((propertyName) => {
      colors[propertyName] = normalizeCanvasColor(
        styles[propertyName],
        propertyName,
      );
    });

    SHADOW_PROPERTIES.forEach((propertyName) => {
      colors[propertyName] = MODERN_COLOR_FUNCTIONS.test(styles[propertyName])
        ? "none"
        : styles[propertyName];
    });

    return colors;
  });
}

function collectPageBreakOffsets(root, scale) {
  const rootRect = root.getBoundingClientRect();
  const offsets = [0, Math.ceil(root.scrollHeight * scale)];

  root.querySelectorAll(PAGE_BREAK_SELECTOR).forEach((node) => {
    const rect = node.getBoundingClientRect();
    if (!rect.height) return;

    const bottom = Math.round((rect.bottom - rootRect.top) * scale);
    if (bottom > 0) offsets.push(bottom);
  });

  return [...new Set(offsets)].sort((a, b) => a - b);
}

function isMostlyBlankRow(imageData, y) {
  const { data, width } = imageData;
  const sampleStep = 8;
  let visiblePixels = 0;
  let markedPixels = 0;

  for (let x = 0; x < width; x += sampleStep) {
    const index = (y * width + x) * 4;
    const alpha = data[index + 3];
    if (alpha < 12) continue;

    visiblePixels += 1;

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const isWhite = red > 246 && green > 246 && blue > 246;

    if (!isWhite) markedPixels += 1;
  }

  if (visiblePixels === 0) return true;
  return markedPixels / visiblePixels < 0.01;
}

function findDomPageBreak(pageBreakOffsets, startY, targetY, maxSliceHeight) {
  const minSliceHeight = Math.floor(maxSliceHeight * 0.62);
  const minY = startY + minSliceHeight;
  let cleanBreak = null;

  for (const offset of pageBreakOffsets) {
    if (offset <= minY) continue;
    if (offset >= targetY) break;
    cleanBreak = offset;
  }

  return cleanBreak;
}

function findCleanPageBreak(
  imageData,
  pageBreakOffsets,
  startY,
  targetY,
  maxSliceHeight,
) {
  const domBreak = findDomPageBreak(
    pageBreakOffsets,
    startY,
    targetY,
    maxSliceHeight,
  );

  if (domBreak) return domBreak;

  const minSliceHeight = Math.floor(maxSliceHeight * 0.72);
  const minY = Math.min(targetY - 1, startY + minSliceHeight);
  const searchStart = Math.max(minY, targetY - Math.floor(maxSliceHeight * 0.22));
  const blankRunNeeded = 10;
  let blankRun = 0;

  for (let y = targetY; y >= searchStart; y -= 1) {
    if (isMostlyBlankRow(imageData, y)) {
      blankRun += 1;
      if (blankRun >= blankRunNeeded) {
        return y + Math.floor(blankRunNeeded / 2);
      }
    } else {
      blankRun = 0;
    }
  }

  return targetY;
}

function addCanvasToPdfPages(pdf, canvas, layout) {
  const { margin, printableWidth, printableHeight, pageBreakOffsets } = layout;
  const maxSliceHeight = Math.floor(
    (printableHeight * canvas.width) / printableWidth,
  );
  const imageData = canvas
    .getContext("2d", { willReadFrequently: true })
    .getImageData(0, 0, canvas.width, canvas.height);
  const pageCanvas = document.createElement("canvas");
  const pageContext = pageCanvas.getContext("2d");

  pageCanvas.width = canvas.width;

  let startY = 0;
  let pageIndex = 0;

  while (startY < canvas.height) {
    const remainingHeight = canvas.height - startY;
    const targetY = Math.min(canvas.height, startY + maxSliceHeight);
    const endY =
      remainingHeight <= maxSliceHeight
        ? canvas.height
        : findCleanPageBreak(
            imageData,
            pageBreakOffsets,
            startY,
            targetY,
            maxSliceHeight,
          );
    const sliceHeight = Math.max(1, endY - startY);

    pageCanvas.height = sliceHeight;
    pageContext.fillStyle = "#ffffff";
    pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    pageContext.drawImage(
      canvas,
      0,
      startY,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight,
    );

    if (pageIndex > 0) pdf.addPage();

    const pageImage = pageCanvas.toDataURL("image/png");
    const pageImageHeight = (sliceHeight * printableWidth) / canvas.width;
    pdf.addImage(
      pageImage,
      "PNG",
      margin,
      margin,
      printableWidth,
      pageImageHeight,
    );

    startY = endY;
    pageIndex += 1;
  }
}

export async function buildPdfFromElement(element) {
  if (!element) {
    throw new Error("No element provided for PDF generation");
  }

  const [{ jsPDF }, html2canvasModule] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const html2canvas = html2canvasModule.default;
  const captureScale = 2;
  const captureWidth = Math.max(element.scrollWidth, element.clientWidth);
  const captureHeight = Math.max(element.scrollHeight, element.clientHeight);
  const exportId = `pdf-export-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
  const previousExportId = element.getAttribute("data-pdf-export-id");
  const colorSnapshot = collectColorSnapshot(element);
  const pageBreakOffsets = collectPageBreakOffsets(element, captureScale);

  element.setAttribute("data-pdf-export-id", exportId);

  const baseOptions = {
    backgroundColor: "#ffffff",
    scale: captureScale,
    useCORS: true,
    scrollY: -window.scrollY,
    logging: false,
    width: captureWidth,
    height: captureHeight,
    windowWidth: captureWidth,
    windowHeight: captureHeight,
    foreignObjectRendering: false,
    onclone: (doc) => {
      doc.querySelectorAll('[data-export="exclude"]').forEach((node) => {
        node.remove();
      });

      doc.querySelectorAll("style").forEach((styleTag) => {
        if (styleTag.textContent && styleTag.textContent.includes("oklch(")) {
          styleTag.textContent = replaceOklchColors(
            styleTag.textContent,
            FALLBACK_COLORS.default,
          );
        }
      });

      doc.querySelectorAll("[style]").forEach((node) => {
        const inlineStyle = node.getAttribute("style");
        if (inlineStyle && inlineStyle.includes("oklch(")) {
          node.setAttribute(
            "style",
            replaceOklchColors(inlineStyle, FALLBACK_COLORS.default),
          );
        }
      });

      const clonedRoot = doc.querySelector(
        `[data-pdf-export-id="${exportId}"]`,
      );

      if (clonedRoot) {
        clonedRoot.style.overflow = "visible";

        clonedRoot.querySelectorAll(".overflow-x-auto").forEach((node) => {
          node.style.overflow = "visible";
          node.style.maxWidth = "none";
        });

        clonedRoot.querySelectorAll("table").forEach((table) => {
          table.style.width = "100%";
          table.style.tableLayout = "auto";
        });

        [clonedRoot, ...clonedRoot.querySelectorAll("*")].forEach(
          (node, index) => {
            const colors = colorSnapshot[index];
            if (!colors) return;

            Object.entries(colors).forEach(([propertyName, value]) => {
              if (value) node.style[propertyName] = value;
            });
          },
        );
      }
    },
  };

  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  const shouldSuppressOklchLog = (args) => {
    const text = args
      .map((arg) => (typeof arg === "string" ? arg : ""))
      .join(" ")
      .toLowerCase();
    return (
      text.includes("unsupported color function") && text.includes("oklch")
    );
  };

  console.error = (...args) => {
    if (shouldSuppressOklchLog(args)) return;
    originalConsoleError(...args);
  };

  console.warn = (...args) => {
    if (shouldSuppressOklchLog(args)) return;
    originalConsoleWarn(...args);
  };

  let canvas;
  try {
    canvas = await html2canvas(element, baseOptions);
  } finally {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    if (previousExportId === null) {
      element.removeAttribute("data-pdf-export-id");
    } else {
      element.setAttribute("data-pdf-export-id", previousExportId);
    }
  }

  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;

  addCanvasToPdfPages(pdf, canvas, {
    margin,
    printableWidth,
    printableHeight,
    pageBreakOffsets,
  });

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);

  return { pdf, blob, url };
}

export async function generatePDF(_data, layoutConfig = {}) {
  const { element, filename } = layoutConfig;
  const result = await buildPdfFromElement(element);

  if (filename) {
    result.pdf.save(filename);
  }

  return result;
}

export async function captureElementAsImage(element) {
  if (!element) return "";

  const html2canvasModule = await import("html2canvas");
  const html2canvas = html2canvasModule.default;
  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
  });

  return canvas.toDataURL("image/png");
}

export async function captureChartImages(chartRefs) {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const [pie, bar] = await Promise.all([
    captureElementAsImage(chartRefs.pie?.current),
    captureElementAsImage(chartRefs.bar?.current),
  ]);

  return { pie, bar };
}
