# Servicio de Doblaje con IA

Un servicio web que dobla automáticamente archivos de audio/video a otros idiomas usando inteligencia artificial.

**🚀 Demo**: https://ai-voice-bot-rose.vercel.app

[한국어](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | **Español**

---

## Funcionalidades

- **Pipeline de doblaje automático**: Reconocimiento de voz (STT) → Traducción → Síntesis de voz (TTS), totalmente automatizado
- **Soporte multilingüe**: Doblaje mutuo entre coreano, inglés, japonés y español
- **Múltiples formatos**: Soporta archivos de audio/video (MP3, WAV, MP4, WebM, etc.) hasta 100MB
- **Comparación de video lado a lado**: Al subir un video, el original y el doblado se reproducen simultáneamente para comparar
- **Descarga de video doblado**: Combina el video original con el audio doblado en MP4 usando ffmpeg.wasm en el navegador
- **Sincronización automática**: Calcula y ajusta automáticamente el playbackRate del audio doblado para coincidir con la duración del video original
- **Login con Google**: Autenticación Google OAuth con control de acceso por lista blanca
- **Arrastrar y soltar**: Soporte para subir archivos mediante drag & drop
- **Progreso paso a paso**: Animación en tiempo real para cada etapa (Subida → STT → Traducción → TTS)

---

## Stack Tecnológico

| Categoría | Tecnología |
|-----------|------------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS |
| Autenticación | NextAuth.js v4 + Google OAuth |
| Base de datos | Turso (libSQL) — Gestión de lista blanca |
| Almacenamiento | Vercel Blob |
| Reconocimiento de voz (STT) | ElevenLabs Scribe v1 |
| Traducción | Google Cloud Translation API v2 |
| Síntesis de voz (TTS) | ElevenLabs Multilingual v2 |
| Procesamiento de video | ffmpeg.wasm (lado del navegador) |
| Despliegue | Vercel |

---

## Cómo Funciona

```
Subir archivo (audio/video)
        ↓
ElevenLabs Scribe v1 — Reconocimiento de voz (STT)
        ↓
Google Cloud Translation API — Traducción
        ↓
ElevenLabs Multilingual v2 — Generación del doblaje (TTS)
        ↓
Resultado
  ├── Audio: Reproducción y descarga en MP3
  └── Video: Comparación lado a lado + descarga en MP4
```

---

## Instalación Local

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/hyosikkk/ai-voice-bot.git
cd ai-voice-bot
npm install
```

### 2. Configurar variables de entorno

Crear un archivo `.env.local` con los siguientes campos:

```env
# ElevenLabs (https://elevenlabs.io)
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=        # Tu Voice ID desde My Voices

# Google Translate (https://console.cloud.google.com)
GOOGLE_TRANSLATE_API_KEY=   # Activa Cloud Translation API, 500.000 chars/mes gratis

# Turso DB (https://turso.tech)
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# Google OAuth (https://console.cloud.google.com)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# NextAuth
NEXTAUTH_SECRET=            # Genera con: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Vercel Blob (https://vercel.com/dashboard → Storage)
BLOB_READ_WRITE_TOKEN=
```

### 3. Registrar lista blanca

Agrega los emails permitidos al array `INITIAL_WHITELIST` en `lib/db.ts`. Se registran automáticamente al iniciar el servidor por primera vez.

### 4. Ejecutar servidor de desarrollo

```bash
npm run dev
```

Visita [http://localhost:3000](http://localhost:3000)

> Solo las cuentas de Google registradas en la lista blanca pueden iniciar sesión.

---

## URL del Servicio

**https://ai-voice-bot-rose.vercel.app**

> Inicia sesión con una cuenta de Google. Solo los usuarios en la lista blanca pueden acceder.

---

## Mejoras Futuras

| Función | Descripción |
|---------|-------------|
| **Sincronización labial (Lip Sync)** | Regeneración con IA de los movimientos de boca para coincidir con el audio doblado (Wav2Lip, HeyGen, etc.) |
| **Separación de música/voz** | Separar la voz del hablante de la música de fondo, doblar solo la voz manteniendo la música original |
| **Doblaje multi-hablante** | Detectar y distinguir múltiples hablantes, asignar voces diferentes a cada uno |
| **Clonación de voz** | Preservar el tono y emoción del hablante original en la voz doblada |
| **Sincronización de subtítulos** | Insertar subtítulos basados en timestamps del STT/traducción en el video |
| **Ajuste fino de sincronización** | Ajuste por segmento de habla (actualmente usa ratio de duración total) |
| **Más idiomas** | Añadir soporte para francés, alemán, chino, árabe, etc. |

---

## Desarrollado con Claude Code (Agente de IA)

Este proyecto fue desarrollado usando **Claude Code** (el agente de programación IA de Anthropic).

### Tareas gestionadas por el agente

- **Diseño de arquitectura**: Estructura Next.js App Router y pipeline de doblaje
- **Integraciones de API**: ElevenLabs STT/TTS, Google Translate, NextAuth, Turso DB
- **Desarrollo UI**: Diseño glassmorphism oscuro, animación de onda de sonido, reproductor de comparación de video
- **Procesamiento de video**: Combinación de video + audio en el navegador con ffmpeg.wasm
- **Lógica de sincronización**: Cálculo y ajuste automático de playbackRate
- **Depuración**: Análisis inmediato de causa raíz y correcciones desde logs de error
- **Configuración de despliegue**: Setup en Vercel, auto-deploy con GitHub

### Consejos para usar agentes de IA

1. **Pega los logs de error directamente** — los mensajes reales llevan a soluciones más rápidas que las explicaciones largas
2. **Sé específico** — `"crea una ruta POST /api/dub que reciba archivos via FormData"` en vez de `"crea una API"`
3. **Una función a la vez** — pedir múltiples funciones simultáneamente puede causar conflictos
4. **Revisa siempre el código** — especialmente el código de autenticación y seguridad
5. **Protege la información sensible** — nunca pegues el contenido de `.env.local` en el chat
