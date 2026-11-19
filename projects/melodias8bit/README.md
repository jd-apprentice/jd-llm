# Melodías 8bit

8-bit / chiptune YouTube channel: <https://www.youtube.com/@melodias8bit>

This directory stores the channel content and the pipeline that generates it. Thumbnails and artwork come from models running on the local GPU server, and the music runs there too through `audio.cpp`.

## Pipeline

| Stage | Tool | Status |
| --- | --- | --- |
| Thumbnails and artwork | `stable-diffusion.cpp` + [MOSS-Image-SFT-GGUF](https://huggingface.co/unsloth/MOSS-Image-SFT-GGUF) | In use |
| Music | [Suno](https://suno.com) | In use, not local |
| Local music | [`audio.cpp`](https://github.com/0xShug0/audio.cpp) | Working on the GPU VM |
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

## Audio

Audio generation runs on the GPU VM inside the Proxmox host at `192.168.88.30` (currently `192.168.88.38` over DHCP); the workstation only sends requests. The GPU is the Tesla P40, passed through to that VM, so `audio.cpp` cannot run on the host itself.

Available families, all through `audio.cpp`:

- `ace_step`: ACE-Step 1.5 (Turbo / Base / XL), text + optional lyrics, 50+ languages, `text2music` and edit routes.
- `magenta_realtime_2`: Small 230M / Base 2.4B, instrumental, style prompt or reference audio, 48 kHz stereo, streaming mode.
- `heartmula`, `minimax_music3`, `yue2`: fallbacks to compare.

### Build (on the GPU VM)

Verified on Ubuntu 26.04.1, Tesla P40, driver 580.178.04, CUDA 12.4, GCC 13:

```bash
git clone --recursive --depth 1 --shallow-submodules https://github.com/0xShug0/audio.cpp
cd audio.cpp
CC=gcc-13 CXX=g++-13 scripts/build_linux.sh --deployment-build --backend cuda \
  --cuda-arch 61 --model-set custom --models ace_step,magenta_realtime_2 \
  -j 4 --target audiocpp_cli --target audiocpp_server
```

Binaries land in `build/linux-cuda-release/bin/`. Two flags are not optional: GCC 13 because CUDA 12.4 rejects newer host compilers, and `--cuda-arch 61` because CUDA 13.x dropped Pascal. `--model-set custom` skips the other 140+ families. The whole build takes about 13 minutes on 4 vCPU.

### Models

| Family | File | Size |
| --- | --- | --- |
| `magenta_realtime_2` | `magenta-rt2-small-f16.gguf` | 1.5 GB |
| `ace_step` | `ace-step-1.5-turbo-bf16.gguf` | 10.1 GB |

Both come from `audio-cpp/audio.cpp-gguf` and `audio-cpp/Magenta-RealTime-2-GGUF`. Use the ACE-Step bf16 package: `docs/gguf.md` lists the `q8_0` one as failing planner sampling.

Every take generated so far, with its model, steps, CFG, seed and wall time, is logged in [`assets/audio/drafts/README.md`](assets/audio/drafts/README.md).

Measured on the P40: 10 s with Magenta in 5.2 s of wall time, 60 s with ACE-Step Turbo in 18.7 s including the 10 GB load. CUDA graphs are disabled on Pascal, which is expected.

### CLI on the VM

```bash
# Magenta RealTime 2: 10 s clip from a style prompt
audiocpp_cli --model /models/Magenta-RealTime-2-GGUF/magenta-rt2-small-f16.gguf \
  --family magenta_realtime_2 --task gen --backend cuda \
  --text "8-bit chiptune, nostalgic, instrumental" \
  --request-option duration_sec=10 --out music.wav

# ACE-Step: 60 s instrumental, turbo checkpoint
audiocpp_cli --model /models/ACE-Step1.5-GGUF/turbo/ace-step-1.5-turbo-bf16.gguf \
  --family ace_step --task gen --backend cuda --task-route text2music \
  --text "8-bit chiptune, nostalgic, instrumental, soft square wave lead" \
  --duration-seconds 60 --out chiptune.wav
```

### Server mode

`audiocpp_server` keeps the model resident and exposes it over the LAN:

```json
{
  "host": "0.0.0.0",
  "port": 8090,
  "backend": "cuda",
  "device": 0,
  "lazy_load": true,
  "models": [
    {
      "id": "ace-step",
      "family": "ace_step",
      "path": "/models/ACE-Step1.5-GGUF/turbo/ace-step-1.5-turbo-bf16.gguf",
      "task": "gen"
    }
  ]
}
```

```bash
build/linux-cuda-release/bin/audiocpp_server --config server.json
curl http://192.168.88.38:8090/health
```

Then generate from here:

```bash
curl http://192.168.88.38:8090/v1/tasks/run \
  -H 'Content-Type: application/json' \
  -d '{"model":"ace-step","request":{"text":"8-bit chiptune, nostalgic, instrumental","duration_sec":60}}' \
  | python3 -c 'import json,base64,sys; open("out.wav","wb").write(base64.b64decode(json.load(sys.stdin)["audio"]))'
```

`/v1/tasks/run` returns the WAV as base64 inside `audio`. The `request` object uses the same field names as the model spec, so it is `duration_sec` and `route`, not the CLI spellings. The default config binds `127.0.0.1`, so `host` has to be `0.0.0.0` or the LAN IP for another machine to reach the server.

Duration is advisory on the server path: asking for 30 s returned 46 s and asking for 60 s returned 129 s, because the planner picks the take length. Use the CLI with `--duration-seconds` when the exact length matters.

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
