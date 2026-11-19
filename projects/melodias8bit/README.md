# Melodías 8bit

Canal de YouTube de música 8-bit / chiptune: <https://www.youtube.com/@melodias8bit>

Este directorio guarda el contenido del canal y la pipeline para generarlo. Las miniaturas y las ilustraciones salen de modelos que corren localmente en la Tesla P40; la música todavía no.

## Pipeline

| Etapa | Herramienta | Estado |
| --- | --- | --- |
| Miniaturas e ilustraciones | `stable-diffusion.cpp` + [MOSS-Image-SFT-GGUF](https://huggingface.co/unsloth/MOSS-Image-SFT-GGUF) | En uso |
| Música | [Suno](https://suno.com) | En uso, no local |
| Música local | [`audio.cpp`](https://github.com/0xShug0/audio.cpp) | A evaluar |
| Video | Por definir | Pendiente |

## Estructura

```
projects/melodias8bit/
├── README.md            # este archivo: pipeline, convenciones y catálogo
├── videos/
│   └── NN-slug.md       # una ficha por video: concepto, prompt, seed, estado
└── assets/
    ├── thumbnails/      # miniaturas 1280x720, mismo slug que la ficha
    ├── audio/           # pistas finales
    └── video/           # render final (gitignored, vive en YouTube)
```

## Setup de imágenes

`stable-diffusion.cpp` necesita el build `master-975` o superior. Solo el transformer viene en los GGUF de MOSS-Image: el VAE y el tokenizer salen de `unsloth/MOSS-Image-SFT-FP8`, y el text encoder es `Qwen3.5-9B-Q8_0.gguf`.

```bash
hf download unsloth/MOSS-Image-SFT-GGUF MOSS-Image-SFT-UD-Q4_K_XL.gguf --local-dir moss
hf download unsloth/Qwen3.5-9B-GGUF Qwen3.5-9B-Q8_0.gguf --local-dir moss
hf download unsloth/MOSS-Image-SFT-FP8 vae/diffusion_pytorch_model.safetensors tokenizer/tokenizer.json --local-dir moss
```

Cuantizaciones:

| Archivo | Tamaño | LPIPS vs bf16 | Uso |
| --- | --- | --- | --- |
| `MOSS-Image-SFT-UD-Q4_K_XL.gguf` | 3.42 GB | 0.213 | Recomendada para uso general |
| `MOSS-Image-SFT-UD-Q6_K_XL.gguf` | 4.53 GB | 0.106 | Punto medio |
| `MOSS-Image-SFT-Q8_0.gguf` | 5.48 GB | 0.054 | Miniaturas finales, si entra en VRAM |

Generación de una miniatura 16:9:

```bash
./sd-cli \
  --diffusion-model moss/MOSS-Image-SFT-UD-Q4_K_XL.gguf \
  --llm moss/Qwen3.5-9B-Q8_0.gguf \
  --vae moss/vae/diffusion_pytorch_model.safetensors \
  --tokenizer moss/tokenizer/tokenizer.json \
  --cfg-scale 3.0 --steps 50 \
  -W 1280 -H 720 -s <seed> \
  -p "<prompt de la ficha del video>" \
  -o assets/thumbnails/<slug>.png
```

## Audio local

Objetivo: reemplazar Suno por generación local de chiptune. `audio.cpp` expone varias familias de música vía CLI y server:

- `ace_step`: ACE-Step 1.5 (Turbo / Base / XL), texto + letras, 50+ idiomas, ruta `text2music`.
- `magenta_realtime_2`: Small 230M / Base 2.4B, instrumental, prompt de estilo o audio de referencia, 48 kHz estéreo, modo streaming.
- `heartmula`, `minimax_music3`, `yue2`: alternativas a comparar.

```bash
# ACE-Step: texto + duración, sin letras
audiocpp_cli --task gen --family ace_step --model models/Ace-Step1.5 --backend cuda \
  --task-route text2music --text "8-bit chiptune, nostalgic, instrumental" \
  --duration-seconds 60 --out chiptune.wav

# Magenta RealTime 2: clip corto por prompt de estilo
audiocpp_cli --model Magenta-RealTime-2-GGUF/magenta-rt2-small-f16.gguf \
  --family magenta_realtime_2 --task gen --backend cuda \
  --text "8-bit chiptune" --request-option duration_sec=10 --out music.wav
```

## Convenciones

- Miniatura 16:9 a 1280x720.
- Prompt en inglés, en este orden: sujeto, acción, escena, estilo, mood, iluminación.
- El aspecto se controla con `-W`/`-H`, no con flags de aspect ratio en el prompt. `--ar 16:9` es sintaxis de Midjourney y `sd-cli` la ignora.
- Un seed fijo por serie para mantener coherencia visual entre videos.
- Nombres de archivo con el mismo slug que la ficha (`01-window-sunset`).

## Videos

| # | Video | Miniatura | Audio | Música |
| --- | --- | --- | --- | --- |
| 01 | [Atardecer en la ventana](videos/01-window-sunset.md) | pendiente | pendiente | chiptune lento + lo-fi |
| 02 | [Sala arcade](videos/02-arcade-room.md) | pendiente | pendiente | synthwave + chiptune |
| 03 | [Escritorio años 90](videos/03-retro-desk.md) | pendiente | pendiente | chiptune tranquilo |
| 04 | [Lluvia en la ventana](videos/04-rainy-window.md) | pendiente | pendiente | lo-fi + chiptune suave |
| 05 | [Tren retro-futurista](videos/05-retro-train.md) | pendiente | pendiente | vaporwave + chiptune |

## Cómo agregar un video

1. Copiar la estructura de una ficha existente en `videos/NN-slug.md`.
2. Generar la miniatura y guardarla en `assets/thumbnails/NN-slug.png`.
3. Sumar la pista final en `assets/audio/NN-slug.mp3`.
4. Actualizar la tabla de videos de este README y la columna de estado de la ficha.
