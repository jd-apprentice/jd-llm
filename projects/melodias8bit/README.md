# Melodías 8bit

8-bit / chiptune YouTube channel: <https://www.youtube.com/@melodias8bit>

This directory stores the channel content and the pipeline that generates it. Thumbnails and artwork come from models running on the local GPU server; the music does not yet.

## Pipeline

| Stage | Tool | Status |
| --- | --- | --- |
| Thumbnails and artwork | `stable-diffusion.cpp` + [MOSS-Image-SFT-GGUF](https://huggingface.co/unsloth/MOSS-Image-SFT-GGUF) | In use |
| Music | [Suno](https://suno.com) | In use, not local |
| Local music | [`audio.cpp`](https://github.com/0xShug0/audio.cpp) | To evaluate on `192.168.88.30` |
| Video | Not defined | Pending |

## Layout

```
projects/melodias8bit/
├── README.md            # this file: pipeline, conventions and catalog
├── videos/
│   └── NN-slug.md       # one entry per video: concept, prompt, seed, status
└── assets/
    ├── thumbnails/      # 1280x720 thumbnails, same slug as the entry
    ├── images/          # random GPU generations and misc art
    ├── audio/           # final tracks
    └── video/           # final render (gitignored, lives on YouTube)
```

`assets/images/` keeps one-off generations that are not tied to a video.

## Image setup

`stable-diffusion.cpp` needs the `master-975` build or newer. MOSS-Image GGUFs carry only the transformer: the VAE and tokenizer come from `unsloth/MOSS-Image-SFT-FP8`, and the text encoder is `Qwen3.5-9B-Q8_0.gguf`.

```bash
hf download unsloth/MOSS-Image-SFT-GGUF MOSS-Image-SFT-UD-Q4_K_XL.gguf --local-dir moss
hf download unsloth/Qwen3.5-9B-GGUF Qwen3.5-9B-Q8_0.gguf --local-dir moss
hf download unsloth/MOSS-Image-SFT-FP8 vae/diffusion_pytorch_model.safetensors tokenizer/tokenizer.json --local-dir moss
```

Quantizations:

| File | Size | LPIPS vs bf16 | Use |
| --- | --- | --- | --- |
| `MOSS-Image-SFT-UD-Q4_K_XL.gguf` | 3.42 GB | 0.213 | Recommended for general use |
| `MOSS-Image-SFT-UD-Q6_K_XL.gguf` | 4.53 GB | 0.106 | Middle ground |
| `MOSS-Image-SFT-Q8_0.gguf` | 5.48 GB | 0.054 | Final thumbnails, if it fits in VRAM |

Generating a 16:9 thumbnail:

```bash
./sd-cli \
  --diffusion-model moss/MOSS-Image-SFT-UD-Q4_K_XL.gguf \
  --llm moss/Qwen3.5-9B-Q8_0.gguf \
  --vae moss/vae/diffusion_pytorch_model.safetensors \
  --tokenizer moss/tokenizer/tokenizer.json \
  --cfg-scale 3.0 --steps 50 \
  -W 1280 -H 720 -s <seed> \
  -p "<prompt from the video entry>" \
  -o assets/thumbnails/<slug>.png
```

## Local audio

Goal: replace Suno with local chiptune generation. `audio.cpp` exposes several music families through its CLI and server:

- `ace_step`: ACE-Step 1.5 (Turbo / Base / XL), text + lyrics, 50+ languages, `text2music` route.
- `magenta_realtime_2`: Small 230M / Base 2.4B, instrumental, style prompt or reference audio, 48 kHz stereo, streaming mode.
- `heartmula`, `minimax_music3`, `yue2`: fallbacks to compare.

### CLI on the server

Audio generation runs on the home server at `192.168.88.30`, not on this machine:

```bash
# ACE-Step: text + duration, no lyrics
audiocpp_cli --task gen --family ace_step --model models/Ace-Step1.5 --backend cuda \
  --task-route text2music --text "8-bit chiptune, nostalgic, instrumental" \
  --duration-seconds 60 --out chiptune.wav

# Magenta RealTime 2: short clip from a style prompt
audiocpp_cli --model Magenta-RealTime-2-GGUF/magenta-rt2-small-f16.gguf \
  --family magenta_realtime_2 --task gen --backend cuda \
  --text "8-bit chiptune" --request-option duration_sec=10 --out music.wav
```

### Server mode

`audiocpp_server` keeps the model resident and exposes it over the LAN, so the workstation only sends requests:

```json
{
  "host": "0.0.0.0",
  "port": 8080,
  "backend": "cuda",
  "device": 0,
  "lazy_load": true,
  "models": [
    {
      "id": "ace-step",
      "family": "ace_step",
      "path": "/models/Ace-Step1.5",
      "task": "gen"
    }
  ]
}
```

```bash
build/bin/audiocpp_server --config server.json
curl http://192.168.88.30:8080/health
```

Then generate from here:

```bash
curl http://192.168.88.30:8080/v1/tasks/run \
  -H 'Content-Type: application/json' \
  -d '{"model":"ace-step","request":{"text":"8-bit chiptune, nostalgic, instrumental","duration_seconds":60}}'
```

The `request` object reuses the CLI fields. The default config binds `127.0.0.1`, so `host` has to be `0.0.0.0` or the LAN IP for another machine to reach the server.

## Conventions

- Thumbnail at 16:9, 1280x720, under 2 MB (YouTube's limit). This is the size YouTube recommends; 1920x1080 adds no visible detail in the feed and its truecolor PNG usually exceeds 2 MB.
- Prompt in English, in this order: subject, action, scene, style, mood, lighting.
- Aspect ratio comes from `-W`/`-H`, not from flags inside the prompt. `--ar 16:9` is Midjourney syntax and `sd-cli` ignores it.
- One fixed seed per series to keep visual consistency across videos.
- File names reuse the entry slug (`01-window-sunset`).

## Videos

| # | Video | Thumbnail | Audio | Music |
| --- | --- | --- | --- | --- |
| 01 | [Sunset by the window](videos/01-window-sunset.md) | ready | pending | slow chiptune + lo-fi |
| 02 | [Arcade room](videos/02-arcade-room.md) | ready | pending | synthwave + chiptune |
| 03 | [90s desk](videos/03-retro-desk.md) | ready | pending | calm chiptune |
| 04 | [Rainy window](videos/04-rainy-window.md) | pending | pending | lo-fi + soft chiptune |
| 05 | [Retro-futuristic train](videos/05-retro-train.md) | pending | pending | vaporwave + chiptune |

## Adding a video

1. Copy the structure of an existing entry into `videos/NN-slug.md`.
2. Generate the thumbnail at 1280x720 and save it as `assets/thumbnails/NN-slug.png`.
3. Drop the final track into `assets/audio/NN-slug.mp3`.
4. Update the video table above and the status field of the entry.
