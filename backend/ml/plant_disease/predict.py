"""
Plant Village CNN inference (39 classes).
Reads JSON from stdin: {"imageBase64": "<base64 without data-uri prefix or full data uri>"}
Writes JSON to stdout for AgroTrack Node integration.
Requires: pip install torch torchvision pillow pandas numpy
Model file: plant_disease_model_1_latest.pt (see README.md in this folder)
"""
from __future__ import annotations

import base64
import json
import os
import sys
from io import BytesIO
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torchvision.transforms.functional as TF
from PIL import Image

from CNN import CNN, idx_to_classes

ROOT = Path(__file__).resolve().parent
MODEL_PATH = Path(os.environ.get("PLANT_DISEASE_MODEL_PATH", ROOT / "plant_disease_model_1_latest.pt"))
DISEASE_CSV = ROOT / "disease_info.csv"
SUPPLEMENT_CSV = ROOT / "supplement_info.csv"

# Below this softmax confidence (%), Node should call Gemini fallback.
DEFAULT_MIN_CONFIDENCE = float(os.environ.get("PLANT_DISEASE_MIN_CONFIDENCE", "55"))


def parse_image_b64(payload: str) -> Image.Image:
    if payload.startswith("data:"):
        payload = payload.split(",", 1)[1]
    raw = base64.b64decode(payload)
    return Image.open(BytesIO(raw)).convert("RGB")


def softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - np.max(x))
    return e / e.sum()


def split_class_label(raw: str) -> tuple[str, str]:
    """Tomato___Late_blight -> (Tomato, Late blight)"""
    if "___" in raw:
        plant, disease = raw.split("___", 1)
        plant = plant.replace("_", " ").strip()
        disease = disease.replace("_", " ").replace(",", ", ").strip()
        if disease.lower() == "healthy":
            return plant, "Healthy"
        return plant, disease
    return raw, "Unknown"


def load_model() -> CNN:
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(
            f"Model weights not found at {MODEL_PATH}. Download plant_disease_model_1_latest.pt "
            "from the Plant_Disease_Detection README Google Drive link."
        )
    model = CNN(39)
    state = torch.load(str(MODEL_PATH), map_location=torch.device("cpu"))
    model.load_state_dict(state)
    model.eval()
    return model


def predict(image: Image.Image, model: CNN, disease_info: pd.DataFrame, supplement_info: pd.DataFrame) -> dict:
    image = image.resize((224, 224))
    tensor = TF.to_tensor(image).view((1, 3, 224, 224))
    with torch.no_grad():
        logits = model(tensor).detach().numpy()[0]

    probs = softmax(logits)
    index = int(np.argmax(probs))
    confidence = float(probs[index] * 100.0)

    top_indices = np.argsort(probs)[::-1][:3]
    top_predictions = [
        {
            "classIndex": int(i),
            "classLabel": idx_to_classes[int(i)],
            "confidence": round(float(probs[i] * 100.0), 2),
        }
        for i in top_indices
    ]

    raw_label = idx_to_classes[index]
    plant_name, disease_name = split_class_label(raw_label)

    row = disease_info.iloc[index]
    supplement_row = supplement_info.iloc[index]

    title = str(row.get("disease_name", disease_name))
    description = str(row.get("description", ""))[:2000]
    prevent = str(row.get("Possible Steps", ""))[:2000]
    supplement_name = str(supplement_row.get("supplement name", "Consult local agronomist"))

    low_confidence = confidence < DEFAULT_MIN_CONFIDENCE
    invalid_class = raw_label == "Background_without_leaves"

    return {
        "success": True,
        "classIndex": index,
        "classLabel": raw_label,
        "plantName": plant_name,
        "disease": "Healthy" if disease_name.lower() == "healthy" else disease_name,
        "displayTitle": title,
        "confidenceScore": round(confidence, 2),
        "topPredictions": top_predictions,
        "description": description,
        "preventiveMeasures": prevent,
        "recommendedFertilizer": f"{supplement_name}. Based on Plant Village CNN training data for {title}.",
        "shouldUseGeminiFallback": low_confidence or invalid_class,
        "fallbackReason": (
            "Low CNN confidence"
            if low_confidence
            else ("Non-plant background detected" if invalid_class else None)
        ),
        "minConfidenceThreshold": DEFAULT_MIN_CONFIDENCE,
    }


def main() -> None:
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            print(json.dumps({"success": False, "error": "Empty stdin"}))
            return
        body = json.loads(raw)
        b64 = body.get("imageBase64") or body.get("photoDataUri")
        if not b64:
            print(json.dumps({"success": False, "error": "imageBase64 required"}))
            return

        disease_info = pd.read_csv(DISEASE_CSV, encoding="latin-1")
        supplement_info = pd.read_csv(SUPPLEMENT_CSV, encoding="latin-1")
        model = load_model()
        image = parse_image_b64(b64)
        result = predict(image, model, disease_info, supplement_info)
        print(json.dumps(result))
    except Exception as exc:  # noqa: BLE001 — surfaced to Node as JSON
        print(json.dumps({"success": False, "error": str(exc)}))


if __name__ == "__main__":
    main()
