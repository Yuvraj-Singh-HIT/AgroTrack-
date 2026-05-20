# Plant Disease CNN (Plant Village)

Integrated from `Plant_Disease_Detection` — **UI/Flask app not used**, only this inference bundle.

## Setup

1. Install Python deps (once):

```bash
pip install torch torchvision pillow pandas numpy
```

2. Download weights (automated):

```powershell
cd backend/ml/plant_disease
pip install gdown
gdown --folder "https://drive.google.com/drive/folders/1ewJWAiduGuld_9oGSrTuLumg9y62qS6A" -O .
```

Or from repo root: `npm run test:ml` (fails until the `.pt` file exists).

Manual download: [Google Drive folder](https://drive.google.com/drive/folders/1ewJWAiduGuld_9oGSrTuLumg9y62qS6A?usp=share_link).

3. Expected path:

```
backend/ml/plant_disease/plant_disease_model_1_latest.pt
```

Or set `PLANT_DISEASE_MODEL_PATH` in `backend/.env`.

4. Verify from repo root:

```powershell
npm run test:ml
```

Or manually:

`test_payload.json` example:

```json
{"imageBase64": "<base64-encoded-jpeg>"}
```

## AgroTrack behavior

- **Primary:** CNN softmax ≥ `PLANT_DISEASE_MIN_CONFIDENCE` (default 55%)
- **Fallback:** Google Gemini when confidence is low, background class, or Python/model unavailable
