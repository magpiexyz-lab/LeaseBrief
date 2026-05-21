#!/usr/bin/env tsx
// Single-image generator driver. Reads JSON spec from stdin.
import { generateImage } from "../src/lib/image-gen.js";
import { writeFile } from "fs/promises";
import { createHash } from "crypto";

interface Spec {
  type: "hero" | "feature" | "logo" | "og" | "empty-state";
  prompt: string;
  width: number;
  height: number;
  filename: string;
  altText: string;
  colors?: Array<{ r: number; g: number; b: number }>;
  outputDir?: string;
  modelOverride?: string;
  phase?: "explore" | "exploit";
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function main() {
  const raw = await readStdin();
  const spec = JSON.parse(raw) as Spec;
  const outputDir = spec.outputDir ?? ".runs/image-candidates";

  const result = await generateImage({
    type: spec.type,
    prompt: spec.prompt,
    width: spec.width,
    height: spec.height,
    filename: spec.filename,
    altText: spec.altText,
    colors: spec.colors,
    outputDir,
    modelOverride: spec.modelOverride,
  });

  const provenancePath = `${outputDir}/${spec.filename}.provenance.json`;
  const prompt_hash = createHash("sha256")
    .update(spec.prompt)
    .digest("hex")
    .slice(0, 16);
  const provenance = {
    model: result.model,
    prompt: spec.prompt,
    prompt_hash,
    seed: result.seed ?? null,
    phase: spec.phase ?? null,
    generated_at: new Date().toISOString(),
  };
  await writeFile(provenancePath, JSON.stringify(provenance, null, 2));

  console.log(JSON.stringify({ ...result, prompt_hash }));
}

main().catch((err) => {
  console.error("gen-image failed:", err);
  process.exit(1);
});
