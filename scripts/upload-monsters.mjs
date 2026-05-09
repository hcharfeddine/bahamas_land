#!/usr/bin/env node
/**
 * Upload compressed GLB monsters to Supabase Storage.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_KEY=<service_role_key> \
 *   node scripts/upload-monsters.mjs
 *
 * The script uploads every .glb from monsters-compressed/ (or monsters/ if
 * compressed folder is empty) into a public Supabase Storage bucket named
 * "monsters". It skips files that are already uploaded and unchanged.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = "monsters";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌  Missing required env vars. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.");
  console.error("\n    Example:");
  console.error("    SUPABASE_URL=https://xxxxx.supabase.co \\");
  console.error("    SUPABASE_SERVICE_KEY=eyJhbGci... \\");
  console.error("    node scripts/upload-monsters.mjs\n");
  console.error("    The service_role key is at:");
  console.error("    Supabase Dashboard → Project Settings → API → service_role (secret)\n");
  process.exit(1);
}

// Load @supabase/supabase-js from the bahamas-land package (already installed)
const supabasePkg = path.join(ROOT, "artifacts/bahamas-land/node_modules/@supabase/supabase-js");
const { createClient } = await import(supabasePkg);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error(`Failed to create bucket: ${error.message}`);
    console.log(`✅  Created public bucket "${BUCKET}"`);
  } else {
    // Ensure bucket is public
    const { error } = await supabase.storage.updateBucket(BUCKET, { public: true });
    if (error) console.warn(`⚠️  Could not verify bucket is public: ${error.message}`);
    console.log(`✅  Bucket "${BUCKET}" already exists`);
  }
}

async function getExistingFiles() {
  const existing = new Set();
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 1000, offset });
    if (error) break;
    if (!data || data.length === 0) break;
    for (const f of data) existing.add(f.name);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return existing;
}

async function uploadFile(filePath, fileName, existing) {
  const stat = fs.statSync(filePath);
  const sizeMB = (stat.size / 1024 / 1024).toFixed(1);

  if (existing.has(fileName)) {
    console.log(`⏭️  Skip (already exists): ${fileName}`);
    return;
  }

  console.log(`⬆️  Uploading ${fileName} (${sizeMB} MB)...`);
  const buffer = fs.readFileSync(filePath);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType: "model/gltf-binary",
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    if (error.message?.includes("already exists")) {
      console.log(`⏭️  Skip (already exists): ${fileName}`);
    } else {
      console.error(`❌  Failed to upload ${fileName}: ${error.message}`);
    }
  } else {
    console.log(`✅  Uploaded: ${fileName} (${sizeMB} MB)`);
  }
}

async function main() {
  // Prefer compressed folder, fall back to raw monsters/
  const compressedDir = path.join(ROOT, "monsters-compressed");
  const rawDir = path.join(ROOT, "monsters");
  const sourceDir = fs.existsSync(compressedDir) && fs.readdirSync(compressedDir).some((f) => f.endsWith(".glb"))
    ? compressedDir
    : rawDir;

  console.log(`\n📁  Source: ${sourceDir}`);
  const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith(".glb"));
  if (files.length === 0) {
    console.error("❌  No .glb files found in", sourceDir);
    process.exit(1);
  }

  console.log(`📊  Found ${files.length} GLB files to upload`);
  console.log(`🔗  Supabase: ${SUPABASE_URL}\n`);

  await ensureBucket();
  const existing = await getExistingFiles();
  console.log(`📋  ${existing.size} files already in bucket\n`);

  for (const file of files.sort()) {
    await uploadFile(path.join(sourceDir, file), file, existing);
  }

  const publicBase = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
  console.log(`\n🎉  Upload complete!`);
  console.log(`\n📌  Confirm these env vars are set in Vercel / Render:`);
  console.log(`    VITE_SUPABASE_URL=${SUPABASE_URL}`);
  console.log(`    VITE_SUPABASE_ANON_KEY=<your_anon_key>`);
  console.log(`\n    Test a GLB URL in your browser:`);
  console.log(`    ${publicBase}/adult_dragon.glb`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
