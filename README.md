# Powerlift Assistant

App móvil para grabar sets, mandarlos al coach por WhatsApp con descripción automática (`W2S2 SQ 3x3*120kg REP 7`) y calcular pesos por RPE. Funciona en **iPhone y Android** desde el mismo código.

---

## 1) Desarrollo local (mientras codeas)

1. Asegúrate de tener **Expo Go** actualizado en tu teléfono (App Store o Play Store).
2. En esta carpeta:
   ```
   npm start
   ```
3. Escaneas el QR con la cámara del iPhone o con Expo Go en Android.
4. Cambios al código → hot reload instantáneo.

> ⚠️ Algunas funciones (cámara, share a WhatsApp, OTA updates) sirven en Expo Go pero su versión completa solo aparece en un **development build** o en producción. Para 95% del desarrollo de pantallas, Expo Go basta.

---

## 2) Conectar tu plan (Google Sheets)

La app trae mi mesociclo de ejemplo bundleado. Para usar el tuyo:

1. Sube tu Excel a Google Drive → clic derecho → **"Abrir con Google Sheets"**.
2. Dentro del Sheet: **Archivo → Compartir → Publicar en la web**.
3. Hoja: **"Meso"** · Formato: **CSV** · Click **Publicar**.
4. Copia la URL larga (`https://docs.google.com/spreadsheets/d/e/.../pub?gid=...&output=csv`).
5. En la app, primer arranque te lleva a la pantalla **Setup** → pega la URL → "Probar conexión" → "Guardar".

Después la app vive del Sheet en vivo. Cache de 6 horas. **Pull-to-refresh** en la pantalla Home para forzar.

Para cambiar la URL después: **Home → ⚙ Ajustes → Cambiar URL**.

---

## 3) Build inicial (para instalar sin Expo Go)

Cuando quieras la app instalada como "una app de verdad" en tu iPhone / Android:

### Una vez (setup de cuenta Expo)
```
npm install -g eas-cli
eas login
eas init   # genera el projectId y lo escribe en app.json
```

### Build para Android
```
eas build --profile preview --platform android
```
Te sale un APK al correo en ~15-20 min. Lo descargas en el teléfono e instalas.

### Build para iPhone
```
eas build --profile preview --platform ios
```

Para iPhone necesitas:
- Cuenta de Apple Developer ($99/año) **si quieres distribuirlo fuera de ti**
- O usar **TestFlight** (gratis hasta 100 usuarios beta)
- Para tu uso personal solo, también puedes hacer un build "internal distribution" — Expo lo firma con un cert temporal y lo instalas sideloaded

> Estos builds son **builds nativos** — quedan instalados como apps normales. No necesitan Expo Go.

---

## 4) OTA Updates (cambios sin recompilar) 🚀

Esta es la magia: una vez que tienes el build inicial instalado, **cambios al código JS se publican en segundos**, sin volver a buildear ni pasar por App Store / Play Store.

### Publicar una actualización

Después de cambiar código:
```
eas update --branch preview --message "agregué cámara frontal"
```

Eso sube el nuevo bundle al CDN de Expo. La app en tu teléfono:
- Al abrirla, checa silenciosamente si hay update → la descarga en segundo plano
- En la pantalla **Ajustes → Buscar actualización** puedes forzar el check
- Después de descargada, al siguiente reinicio se aplica

### Canales

- `development` → builds de desarrollo (con dev menu, debug, etc.)
- `preview` → builds preview / beta tester
- `production` → builds de App Store / Play Store finales

Cada uno tiene su propia rama de updates. Cambias el canal con `--branch`.

### Qué SÍ se puede publicar OTA

- Cambios en cualquier `.js` / `.jsx`
- Imágenes en `assets/`
- Strings, colores, layouts, lógica

### Qué NO se puede publicar OTA (requiere nuevo build nativo)

- Cambios en `app.json` (permisos, plugins, bundle identifier)
- Agregar/quitar paquetes con código nativo (`expo-camera`, `expo-video`, etc.)
- Cambios en `runtimeVersion` (cada cambio fuerza nuevo build)

> Si subes un OTA con runtime distinto, las apps viejas la ignoran — no rompe nada.

---

## 5) Configurar tu coach

**Ajustes → Coach → WhatsApp del coach**. Pones el número con código de país sin '+' (ej: `5214771234567`) y guardas. A partir de ahí el botón "Mandar al coach" en la pantalla post-grabación abre el chat directo después de compartir el video.

---

## Estructura del proyecto

```
src/
├─ data/planMeso.json    ← snapshot del Excel (fallback)
├─ services/
│  ├─ sheets.js          ← fetch + cache desde Google Sheets
│  └─ storage.js         ← AsyncStorage: log de sets, prefs (URL, coach)
├─ utils/
│  ├─ caption.js         ← genera "W2S2 SQ 3x3*120kg REP 7"
│  ├─ rpe.js             ← tabla RTS + cálculo de peso sugerido
│  └─ dates.js           ← qué sesión toca según día de la semana
├─ screens/
│  ├─ SetupScreen.js          ← primera vez: pega URL del Sheet
│  ├─ HomeScreen.js           ← te toca hoy + agenda semanal
│  ├─ SessionScreen.js        ← ejercicios de la sesión + peso/reps
│  ├─ RecordScreen.js         ← cámara con caption overlay + flip cámara
│  ├─ PostRecordScreen.js     ← preview + share a WhatsApp
│  ├─ RpeCalculatorScreen.js  ← calculadora RPE
│  ├─ LogScreen.js            ← historial de sets
│  └─ SettingsScreen.js       ← cambiar URL, coach, buscar update
└─ components/
   ├─ Button.js · Pill.js
```
