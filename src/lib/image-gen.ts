import { fal } from "@fal-ai/client";
import { writeFile, mkdir } from "fs/promises";
import { readFile } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import sharp from "sharp";

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 2000;
const PUBLIC_IMAGES_DIR = join(process.cwd(), "public", "images");
const MAX_DIMENSION = 1920;

const FALLBACK_MODEL = "fal-ai/flux-2-pro";

// --- Model Configuration ---

export type ImageType = "hero" | "feature" | "logo" | "og" | "mockup" | "empty-state";

interface ModelConfig {
  modelId: string;
  defaultParams: Record<string, unknown>;
  outputFormat: "jpeg" | "png" | "webp" | "svg";
}

const MODEL_CONFIGS: Record<ImageType, ModelConfig> = {
  hero: {
    modelId: "fal-ai/flux-2-pro",
    defaultParams: { output_format: "jpeg", safety_tolerance: "2" },
    outputFormat: "jpeg",
  },
  feature: {
    modelId: "fal-ai/recraft/v4/pro/text-to-image",
    defaultParams: {},
    outputFormat: "webp",
  },
  logo: {
    modelId: "fal-ai/recraft/v4/pro/text-to-vector",
    defaultParams: {},
    outputFormat: "svg",
  },
  og: {
    modelId: "fal-ai/gpt-image-2",
    defaultParams: { quality: "high", output_format: "png" },
    outputFormat: "png",
  },
  mockup: {
    modelId: "fal-ai/gpt-image-2",
    defaultParams: { quality: "high", output_format: "png" },
    outputFormat: "png",
  },
  "empty-state": {
    modelId: "fal-ai/recraft/v4/pro/text-to-image",
    defaultParams: {},
    outputFormat: "webp",
  },
};

// --- Types ---

export interface GenerateImageOptions {
  type: ImageType;
  prompt: string;
  width: number;
  height: number;
  filename: string;
  altText: string;
  colors?: Array<{ r: number; g: number; b: number }>;
  outputDir?: string;
  modelOverride?: string;
}

export interface ImageResult {
  path: string;
  publicPath: string;
  altText: string;
  fallback: boolean;
  model: string;
  seed?: number | null;
}

// --- Internal ---

function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  if (process.env.FAL_KEY) return false;
  try {
    const keyPath = join(homedir(), ".fal", "key");
    const key = readFileSync(keyPath, "utf-8").trim();
    if (key && !key.startsWith("placeholder")) {
      process.env.FAL_KEY = key;
      return false;
    }
  } catch {
    /* ~/.fal/key not readable */
  }
  return true;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDir(dir: string = PUBLIC_IMAGES_DIR): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

interface CallModelResult {
  url: string;
  seed: number | null;
}

async function callModel(
  modelId: string,
  input: Record<string, unknown>
): Promise<CallModelResult> {
  const result = await fal.subscribe(modelId, { input });
  const data = result.data as {
    images?: { url: string }[];
    seed?: number;
  };
  const url = data.images?.[0]?.url;
  if (!url) throw new Error(`No image URL from ${modelId}`);
  return { url, seed: typeof data.seed === "number" ? data.seed : null };
}

async function downloadAndCapToFile(
  url: string,
  filePath: string
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());

  // For SVG, write directly without sharp (vector — no raster cap).
  if (filePath.toLowerCase().endsWith(".svg")) {
    await writeFile(filePath, buffer);
    return;
  }

  // For raster, pass buffer through sharp with cap, then write.
  // This avoids the Windows file-lock issue (sharp keeps input open until pipeline closes).
  const capped = await sharp(buffer)
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();
  await writeFile(filePath, capped);
}

// --- Public API ---

export async function generateImage(
  options: GenerateImageOptions
): Promise<ImageResult> {
  const {
    type,
    prompt,
    width,
    height,
    filename,
    altText,
    colors,
    outputDir,
    modelOverride,
  } = options;
  const config = MODEL_CONFIGS[type];
  const targetDir = outputDir ?? PUBLIC_IMAGES_DIR;
  const filePath = join(targetDir, filename);
  const publicPath = outputDir
    ? `${outputDir}/${filename}`
    : `/images/${filename}`;

  await ensureDir(targetDir);

  if (isDemoMode()) {
    return generateSvgPlaceholder({ width, height, filename, altText });
  }

  const primaryModel = modelOverride ?? config.modelId;

  const input: Record<string, unknown> = {
    prompt,
    ...config.defaultParams,
  };

  const alignedW = Math.round(width / 16) * 16;
  const alignedH = Math.round(height / 16) * 16;
  input.image_size = { width: alignedW, height: alignedH };

  if (colors && primaryModel.includes("recraft")) {
    input.colors = colors;
  }

  if (primaryModel.includes("text-to-vector")) {
    input.background_color = null;
  }

  const modelsToTry =
    primaryModel === FALLBACK_MODEL
      ? [primaryModel]
      : [primaryModel, FALLBACK_MODEL];

  for (const modelId of modelsToTry) {
    const modelInput =
      modelId === FALLBACK_MODEL && modelId !== primaryModel
        ? {
            prompt,
            image_size: { width: alignedW, height: alignedH },
            output_format: "jpeg",
            safety_tolerance: "2",
          }
        : input;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { url: imageUrl, seed } = await callModel(modelId, modelInput);
        await downloadAndCapToFile(imageUrl, filePath);
        return {
          path: filePath,
          publicPath,
          altText,
          fallback: false,
          model: modelId,
          seed,
        };
      } catch (error) {
        const msg = (error as Error).message ?? String(error);
        const status = (error as { status?: number }).status;
        try {
          const errLine =
            JSON.stringify({
              slot: filename,
              model: modelId,
              http_status: status ?? null,
              error_body: msg.slice(0, 500),
              attempted_at: new Date().toISOString(),
            }) + "\n";
          await writeFile(".runs/fal-api-errors.jsonl", errLine, {
            flag: "a",
          });
        } catch {
          /* best-effort log */
        }
        if (attempt < MAX_RETRIES) {
          await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
        } else if (modelId !== FALLBACK_MODEL) {
          console.warn(
            `${modelId} failed for ${filename}, trying fallback...`
          );
          break;
        }
      }
    }
  }

  console.warn(`All models failed for ${filename}, using SVG placeholder`);
  return generateSvgPlaceholder({ width, height, filename, altText });
}

export async function generateSvgPlaceholder(options: {
  width: number;
  height: number;
  filename: string;
  altText: string;
  outputDir?: string;
}): Promise<ImageResult> {
  const { width, height, filename, altText, outputDir } = options;
  const svgFilename = filename.replace(/\.\w+$/, ".svg");
  const targetDir = outputDir ?? PUBLIC_IMAGES_DIR;
  const filePath = join(targetDir, svgFilename);
  const publicPath = outputDir
    ? `${outputDir}/${svgFilename}`
    : `/images/${svgFilename}`;

  await ensureDir(targetDir);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a2238;stop-opacity:0.10"/>
      <stop offset="100%" style="stop-color:#c89855;stop-opacity:0.18"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="#f7f4ec"/>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <circle cx="${width * 0.3}" cy="${height * 0.4}" r="${Math.min(width, height) * 0.15}" fill="#1a2238" opacity="0.08"/>
  <circle cx="${width * 0.7}" cy="${height * 0.6}" r="${Math.min(width, height) * 0.2}" fill="#c89855" opacity="0.12"/>
</svg>`;

  await writeFile(filePath, svg, "utf-8");
  return {
    path: filePath,
    publicPath,
    altText,
    fallback: true,
    model: "svg-placeholder",
  };
}
