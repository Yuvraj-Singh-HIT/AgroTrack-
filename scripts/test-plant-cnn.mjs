/**
 * Quick check that Plant Village CNN weights + Python inference work.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mlDir = path.join(__dirname, "../backend/ml/plant_disease");
const modelPath = path.join(mlDir, "plant_disease_model_1_latest.pt");

if (!existsSync(modelPath)) {
  console.error("FAIL: Model not found at", modelPath);
  console.error("Run: cd backend/ml/plant_disease && gdown --folder https://drive.google.com/drive/folders/1ewJWAiduGuld_9oGSrTuLumg9y62qS6A -O .");
  process.exit(1);
}

const python = process.env.PLANT_DISEASE_PYTHON ?? "python";
const script = `
import base64, json, sys
from io import BytesIO
from PIL import Image
img = Image.new("RGB", (224, 224), (34, 139, 34))
buf = BytesIO()
img.save(buf, format="JPEG")
b64 = base64.b64encode(buf.getvalue()).decode()
print(json.dumps({"photoDataUri": "data:image/jpeg;base64," + b64}))
`;

const payload = await new Promise((resolve, reject) => {
  const p = spawn(python, ["-c", script], { stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  p.stdout.on("data", (c) => (out += c));
  p.on("close", (code) => (code === 0 ? resolve(out.trim()) : reject(new Error("python failed"))));
});

const child = spawn(python, [path.join(mlDir, "predict.py")], {
  cwd: mlDir,
  env: { ...process.env, PLANT_DISEASE_MODEL_PATH: modelPath },
  stdio: ["pipe", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
child.stdout.on("data", (c) => (stdout += c));
child.stderr.on("data", (c) => (stderr += c));

child.stdin.write(payload);
child.stdin.end();

child.on("close", (code) => {
  if (code !== 0) {
    console.error("FAIL: predict.py exit", code, stderr);
    process.exit(1);
  }
  try {
    const result = JSON.parse(stdout.trim());
    if (!result.success) {
      console.error("FAIL:", result.error);
      process.exit(1);
    }
    console.log("OK: Plant CNN inference works");
    console.log("  class:", result.classLabel);
    console.log("  confidence:", result.confidenceScore + "%");
    console.log("  gemini fallback:", result.shouldUseGeminiFallback);
  } catch (e) {
    console.error("FAIL: invalid JSON", stdout, stderr);
    process.exit(1);
  }
});
