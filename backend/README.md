# Borch Gym Training — Video Overlay Backend

Servidor Python (FastAPI + FFmpeg) que quema la viñeta BorchGym DENTRO del video MP4.

## Diseño que aplica

- **Arriba derecha**: pill blanco con "Week: N / total"
- **Abajo izquierda** (stack vertical):
  - Caja negra grande: `{peso} x {reps} @{rpe}`
  - Caja negra mediana: nombre del ejercicio
  - Caja roja BorchGym (#990000): tipo en mayúsculas (TOP SET / BACKDOWN / etc.)

## Endpoints

- `POST /api/process-video` — multipart con `video` + metadata, regresa MP4 procesado
- `GET /health` — checa que el servidor y FFmpeg estén vivos

## Probar local

```bash
cd backend
pip install -r requirements.txt
brew install ffmpeg  # o `apt install ffmpeg` en Linux, `choco install ffmpeg` en Windows
uvicorn main:app --reload --port 8000
```

Test con curl:
```bash
curl -X POST http://localhost:8000/api/process-video \
  -F "video=@test.mp4" \
  -F "weight=140" -F "reps=5" -F "rpe=8" \
  -F "exercise=Sumo Deadlift" -F "tipo=Primary Deadlift" \
  -F "week=3" -F "total_weeks=4" \
  -o output.mp4
```

## Deploy gratis

### Opción A — Render.com (recomendado)

1. Crea cuenta en [render.com](https://render.com)
2. Sube este repo a GitHub
3. En Render → **New** → **Blueprint** → selecciona tu repo
4. Render detecta automáticamente `backend/render.yaml` y arma todo
5. ~5 min después tienes tu URL: `https://borch-gym-video-overlay.onrender.com`
6. Pega esa URL en la app: **Ajustes → Procesamiento de video → URL del backend**

**Free tier de Render:**
- 750 horas/mes gratis (suficiente para esto)
- ⚠️ Se duerme después de 15 min sin uso → primera petición tras dormir tarda ~30 seg
- 512 MB RAM (alcanza para videos hasta ~50 MB)

### Opción B — Railway.app

1. Crea cuenta en [railway.app](https://railway.app) (regalan $5 USD/mes gratis)
2. **New Project** → **Deploy from GitHub** → selecciona el repo
3. Railway detecta `backend/railway.json` automáticamente
4. Get URL en Settings del proyecto

**Railway vs Render:** Railway no se duerme (mejor experiencia) pero gasta los $5 de crédito; Render se duerme pero es gratis siempre.

### Opción C — Fly.io

```bash
cd backend
fly launch --dockerfile Dockerfile --no-deploy
fly deploy
```

Da una URL tipo `borch-gym.fly.dev`. Free tier alcanza 3 VMs pequeñas.

### Opción D — Oracle Cloud Always Free (truly free, más complicado)

Crear cuenta en Oracle Cloud → crear VM Always Free (ARM, 4 cores / 24 GB RAM) → instalar Docker y desplegar manualmente. Gratis literalmente para siempre, sin truco.

## Limitaciones

- El video se procesa en RAM y disco temporal — máximo recomendado: **50 MB / 60 segundos** por video
- Timeout de 180 segundos por petición — videos muy largos pueden cortarse
- Sin autenticación por default (cualquiera con la URL puede usarlo). Para producción, descomenta el bloque de API key en `main.py` y pon `BORCH_API_KEY` como env var.

## Pasos después de deployar

1. Copia la URL del servicio (ej. `https://borch-x.onrender.com`)
2. Abre la app **Borch Gym Training** en el teléfono
3. **Ajustes → Procesamiento de video** → pega la URL → **Guardar backend**
4. Graba un video → toca **Mandar al coach**
5. Verás "Subiendo video al servidor…" → "Listo, abriendo WhatsApp…"
6. WhatsApp se abre con el video que YA TIENE la viñeta quemada + el caption como mensaje
