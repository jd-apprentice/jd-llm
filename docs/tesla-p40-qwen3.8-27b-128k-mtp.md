# Qwen3.8-27B at 128k context on Tesla P40 (passthrough VM + MTP)

Tested 2026-10-22 on Proxmox VE 9.2.11 / Ubuntu 26.04.1 / Tesla P40 / llama.cpp build `970b51ce7` (11827).

Summary:

- 128k context fits: **~18.3 GB / 23 GB VRAM** with q8_0 KV cache (f16 KV also fits at ~21.7 GB).
- MTP speculative decoding (`--spec-type draft-mtp`) improves generation from **~14.2 tok/s to ~19.1 tok/s (+35%)**.
- Baseline decode is memory-bandwidth-bound at **~39% of the P40's theoretical peak**.
- Prompt processing is ~250 tok/s, so a full 128k prompt takes several minutes to ingest.

## Environment

### Host

| Item | Value |
|---|---|
| OS | Proxmox VE 9.2.11 |
| Kernel | 7.0.14-15-pve |
| CPU | AMD Ryzen 5 3400G (8 threads) |
| GPU | NVIDIA Tesla P40 24 GB (GP102, Pascal, `10de:1b38`) |
| Guest | VM 127, Ubuntu 26.04.1 LTS |
| Guest IP | 192.168.88.27 |

### Passthrough / VM configuration

Relevant VM 127 settings:

```ini
bios: ovmf
machine: q35
cpu: host
hostpci0: 0000:10:00,pcie=1
efidisk0: local-lvm:vm-127-disk-0,efitype=4m,size=4M
memory: 8192
scsi0: local-lvm:vm-127-disk-1,discard=on,size=40G,ssd=1
scsi1: local-lvm:vm-127-disk-1,size=20G
```

The P40 exposes a **32 GB BAR1**, so `q35` + OVMF + `pcie=1` is required; a legacy `i440fx` VM cannot map it correctly.

Host VFIO persistence:

`/etc/modprobe.d/vfio.conf`

```ini
options vfio-pci ids=10de:1b38
softdep nvidia pre: vfio-pci
```

`/etc/modprobe.d/blacklist-nvidia-passthrough.conf`

```ini
blacklist nvidia
blacklist nvidia_drm
blacklist nvidia_modeset
```

`/etc/modules-load.d/vfio-pci.conf`

```ini
vfio-pci
```

Then:

```bash
update-initramfs -u
```

> Note: the host had not been rebooted after writing these files, so cold-boot persistence was not validated in this session. The running configuration worked with the VM started after the passthrough setup.

### Guest software

| Item | Value |
|---|---|
| NVIDIA driver | 580.x (last branch supporting Pascal) |
| CUDA toolkit | 12.4 (CUDA 13 dropped `sm_61`, so CUDA 12.x is required) |
| Build compiler | `g++-13` |
| llama.cpp | build `970b51ce7` (11827) |
| CUDA arch | `sm_61` |

Build (see also `README.md` → Server setup for the repo's canonical flags):

```bash
cmake -B build \
  -DGGML_CUDA=ON \
  -DLLAMA_OPENSSL=ON \
  -DCMAKE_CUDA_ARCHITECTURES=61
cmake --build build -j4
```

`llama.cpp` detected the card as:

```text
Device 0: Tesla P40, compute capability 6.1, VMM: yes, VRAM: 22905 MiB
```

## Model

Repository: `ISTA-DASLab/Qwen3.8-27B-GSQ-RCO-GGUF:IQ2_S`

| Property | Value |
|---|---|
| Architecture | `qwen35` (hybrid attention/SSM) |
| Parameters | 27.32 B |
| Native context | 262,144 |
| Layers | 65 |
| Full-attention interval | 1 in 4 (~16 full-attention layers) |
| KV heads | 4 |
| Key/value length | 256 |
| File on disk | `Qwen3.8-27B-GSQ-RCO-IQ2_S-mtp.gguf` |
| File size / metadata | 8.94 GiB, reported as `IQ3_XXS - 3.0625 bpw` |
| Vision projector | `mmproj-Qwen3.8-27B-BF16.gguf` (~0.9 GiB) |

The `-mtp` file is the variant containing the NextN/MTP heads. `llama.cpp` supports it through `--spec-type draft-mtp`.

## Baseline benchmark

Command:

```bash
llama-bench -m Qwen3.8-27B-GSQ-RCO-IQ2_S-mtp.gguf \
  -ngl 99 -p 512 -n 128 -r 3 -fa 0,1
```

Results:

| Test | Flash Attention | Tokens/s |
|---|---:|---:|
| pp512 | off | 252.51 ± 0.07 |
| tg128 | off | 14.12 ± 0.06 |
| pp512 | on | 251.48 ± 0.13 |
| tg128 | on | 14.24 ± 0.01 |

Flash Attention made no meaningful difference here. All 65 layers were offloaded to the GPU.

GPU state during the benchmark:

- SM clock: ~1303 MHz (max 1531 MHz)
- Memory clock: 3615 MHz
- Power: 250 W (at the 250 W limit)
- Temperature: ~85 °C
- ECC: enabled
- PCIe link: Gen3 x8

The temperature and below-max SM clock suggest some thermal/power throttling under sustained load. Better cooling may improve sustained throughput.

## Why is decode only ~14 tok/s?

At batch size 1, every generated token requires reading essentially all model weights once:

- Weights: 8.94 GiB ≈ 9.6 GB
- 14.2 tok/s × 9.6 GB ≈ **136 GB/s effective bandwidth**
- Tesla P40 peak memory bandwidth: ~346 GB/s
- Effective utilization: **~39%**

The theoretical bandwidth ceiling is:

```text
346 GB/s / 9.6 GB/token ≈ 36 tok/s
```

The gap comes from:

- Pascal has no tensor cores, and FP16 throughput is 1/64 of FP32.
- Quantized GEMV at batch 1 does not fully saturate memory.
- Dequantization overhead for a ~3 bpw mixed quant.
- Possible thermal throttling at 85 °C.

This is normal for a dense ~27B model on a P40.

## MTP speculative decoding

The repository ships an `-mtp` GGUF with NextN/MTP heads. Activating it:

```bash
llama-server \
  -hf ISTA-DASLab/Qwen3.8-27B-GSQ-RCO-GGUF:IQ2_S \
  --spec-type draft-mtp \
  -ngl 99 -c 16384 --jinja
```

The log confirms:

```text
common_speculative_init_result: creating MTP draft context against the target model '...IQ2_S-mtp.gguf'
```

Measured generation:

| Configuration | Generation speed |
|---|---:|
| Baseline (`llama-bench`, tg128) | 14.12–14.24 tok/s |
| MTP, 256 generated tokens | **19.12 tok/s** |
| MTP, short 32-token runs | 20.6–20.8 tok/s |

Net gain: roughly **+35%** for realistic generations. Short runs read higher due to warmup/measurement overhead.

## 128k context

KV cache per token is small because the model is hybrid: only every 4th layer uses full attention.

```text
full-attention layers ≈ 65 / 4 ≈ 16
KV per token = 16 layers × 4 KV heads × 256 dim × 2 (K+V) × 2 bytes
             ≈ 64 KiB/token
131,072 tokens × 64 KiB ≈ 8 GiB (f16)
```

Measured VRAM with 128k context, MTP, and mmproj loaded:

| KV cache | VRAM used | Headroom |
|---|---:|---:|
| f16 | 21,659 MiB / 23,040 MiB | ~1.4 GB |
| q8_0 | **18,271 MiB / 23,040 MiB** | **~4.8 GB** |

Both configurations loaded successfully and generated without OOM. q8_0 KV is recommended for 128k to keep useful headroom; f16 is viable but tight.

The model's native 256k context does not fit comfortably on a 24 GB P40, even with q8_0 KV.

Prompt processing for a full 128k prompt is the practical bottleneck:

```text
131,072 tokens / ~250 tok/s ≈ 8–9 minutes
```

## Server command

```bash
cd ~/llama.cpp

MM=$(find ~/.cache/huggingface -name 'mmproj-*.gguf' | head -1)

nohup setsid ./build/bin/llama-server \
  -hf ISTA-DASLab/Qwen3.8-27B-GSQ-RCO-GGUF:IQ2_S \
  --mmproj "$MM" \
  --spec-type draft-mtp \
  -ngl 99 \
  -c 131072 \
  -fa on \
  -ctk q8_0 -ctv q8_0 \
  --host 0.0.0.0 \
  --port 8080 \
  --jinja \
  >/models/server.log 2>&1 </dev/null &
```

Server endpoints (replace with your guest IP):

- Web UI: `http://192.168.88.27:8080`
- OpenAI-compatible API: `http://192.168.88.27:8080/v1/chat/completions`

Operational notes:

- Add `--api-key "..."` before exposing the server to a LAN.
- Drop `--mmproj "$MM"` if vision is not needed.
- Drop `-ctk q8_0 -ctv q8_0` for f16 KV; VRAM rises to ~21.7 GB.
- Check the listener with `ss -ltnp | grep 8080`.
- Stop the server with `pkill -x llama-server` (prefer `-x` over `-f` so the invoking shell is not matched).

To benchmark whatever is loaded here with this repo's script:

```bash
./scripts/bench.sh --server http://192.168.88.27:8080 --gpu-label "Tesla P40" --output BENCHMARKS.md
```

Note: `bench.sh` results go to `BENCHMARKS.md` (strict format, validated by the pre-commit hook). This report uses `llama-bench` + manual VRAM measurements, so it lives here instead.

## Other optimization options

| Option | Expected effect |
|---|---|
| MTP (`--spec-type draft-mtp`) | **+35% measured** |
| Smaller quant (e.g. ~2.3 bpw) | ~10–20% faster, lower quality |
| `-np` / continuous batching | Higher aggregate throughput for concurrent clients; no single-stream gain |
| KV q8_0 | Frees ~3.4 GB at 128k; negligible speed effect |
| ECC off | ~3% bandwidth and +1.5 GB VRAM, requires reboot |
| Better cooling | May restore sustained clocks (85 °C observed) |
| `GGML_CUDA_FORCE_MMQ` rebuild | Potential gain on Pascal, not tested |

## Gotchas

1. **BAR1 / machine type**: the P40's 32 GB BAR1 requires `q35` + OVMF + `pcie=1`.
2. **CUDA version**: use CUDA 12.x; CUDA 13 no longer supports `sm_61`.
3. **Driver branch**: use 580.x; newer branches drop Pascal.
4. **`-hf` and MTP**: `-hf` may resolve to the `-mtp` GGUF, but speculative decoding is only active with `--spec-type draft-mtp`.
5. **HF cache**: the default `~/.cache/huggingface` location needs ~10 GB free for the model plus space for mmproj.
6. **Killing the server**: `pkill -f llama-server` can match the calling shell; use `pkill -x llama-server`.
7. **Long prompts**: 128k context fits in VRAM, but ingesting 128k tokens still takes minutes at P40 prompt-processing speed.
