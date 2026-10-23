## Summary

I passed an **NVIDIA Tesla P40** through to a Proxmox VE VM and ran `llama-server` with **Qwen3.6-35B-A3B**, a 35B-parameter MoE with ~3B active parameters, at **128k context**, with vision (mmproj) and **MTP speculative decoding**.

Key results on this setup:

- Decode is **46.3–46.6 tok/s** at batch 1 with IQ4_XS, versus **14.1–14.2 tok/s** for a dense Qwen3.8-27B IQ2_S — about **3.3x faster** despite the larger total parameter count.
- **MTP speculative decoding** (`--spec-type draft-mtp`) raises generation to **67.7 tok/s (+45%)**, with **66.7% draft acceptance**.
- **128k context + mmproj + KV q8_0 + MTP** loads and generates without OOM at **21,347 MiB / 23,040 MiB VRAM** (~1.7 GB headroom).
- Prompt processing is **~1,100 tok/s**, roughly **4.4x** the dense 27B, so a full 128k prompt takes about **2 minutes** instead of 8–9.
- Flash Attention is effectively neutral on Pascal (~0.7%, within noise), but it is enabled for the quantized KV cache path at 128k.

This is a benchmark/configuration report, not a bug report. Environment details, measurements, and reproduction commands are included below.

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
scsi1: local-lvm:vm-127-disk-2,size=30G
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
| CUDA toolkit | 12.4 |
| Build compiler | `g++-13` |
| llama.cpp | build `970b51ce7` (11827) |
| CUDA arch | `sm_61` |

CUDA 13 dropped `sm_61`, so CUDA 12.4 was required. The driver must remain on the 580 branch for Pascal support.

Build:

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

Repository: `unsloth/Qwen3.6-35B-A3B-MTP-GGUF`

| Property | Value |
|---|---|
| Architecture | `qwen35moe` |
| Parameters | 35.51 B total, ~3 B active per token |
| Native context | 262,144 |
| Layers | 40 |
| Full-attention layers | 10 |
| KV heads | 2 |
| Key/value length | 256 |
| Quant | `UD-IQ4_XS`, 4.25 bpw |
| File on disk | `Qwen3.6-35B-A3B-UD-IQ4_XS.gguf` (16.95 GiB / 18.2 GB) |
| Vision projector | `mmproj-F16.gguf` (~0.9 GB) |
| Speculative decoding | MTP heads, enabled with `--spec-type draft-mtp` |

The file includes the NextN/MTP heads. `llama.cpp` activates them with `--spec-type draft-mtp`; there is no `--mtp` flag.

### Comparison model

The previous model was a dense **Qwen3.8-27B** (`ISTA-DASLab/Qwen3.8-27B-GSQ-RCO-GGUF:IQ2_S`), 27.32B parameters, 8.94 GiB on disk (~9.6 GB), with a ~0.9 GiB mmproj.

| Metric | Qwen3.8-27B dense | **Qwen3.6-35B-A3B MoE** |
|---|---:|---:|
| Decode baseline | 14.12–14.24 tok/s | **46.30–46.62 tok/s** |
| Decode with MTP | 19.12 tok/s | **67.69 tok/s** |
| Prompt processing | 252 tok/s | **~1,100 tok/s** |
| 128k + vision + KV q8_0 VRAM | 18,271 MiB | **21,347 MiB** |

## Baseline benchmark

Command:

```bash
llama-bench \
  -m /models/qwen3.6-35b-a3b/Qwen3.6-35B-A3B-UD-IQ4_XS.gguf \
  -ngl 99 -p 512 -n 128 -r 3 -fa 0,1
```

Results:

| Test | Flash Attention | Tokens/s |
|---|---:|---:|
| pp512 | off | 1115.27 ± 6.34 |
| tg128 | off | 46.30 ± 0.02 |
| pp512 | on | 1106.15 ± 3.97 |
| tg128 | on | 46.62 ± 0.02 |

All layers were offloaded to the GPU (`-ngl 99`). Flash Attention made no meaningful difference; the small delta is within run-to-run noise.

GPU state during the 128k server test:

- VRAM: **21,347 MiB / 23,040 MiB**
- Temperature: **49 °C** during the context test, 53 °C while serving
- ECC: enabled
- PCIe link: Gen3 x8

The card stays much cooler with the MoE than with the dense 27B, which sat at ~85 °C during its benchmark.

## Why the MoE is ~3.3x faster

At batch size 1, dense decode reads essentially all weights for every token:

- Qwen3.8-27B: 8.94 GiB ≈ 9.6 GB/token
- 14.2 tok/s × 9.6 GB ≈ **136 GB/s effective bandwidth**
- P40 peak: ~346 GB/s
- Utilization: **~39%**

The theoretical bandwidth ceiling for that dense model is:

```text
346 GB/s / 9.6 GB/token ≈ 36 tok/s
```

The MoE changes the equation. Only ~3B parameters are active per token:

```text
3 B × 4.25 bits / 8 ≈ 1.6 GB of active weights per token
46.3 tok/s × 1.6 GB ≈ 74 GB/s effective bandwidth
```

So the MoE is no longer purely bandwidth-bound at ~21% of peak. Kernel overhead, routing, attention, and synchronization dominate instead. The remaining headroom is exactly what MTP exploits: it verifies several speculative tokens per weight read, raising tokens per second without changing the model size.

The P40 still has no tensor cores and FP16 throughput is 1/64 of FP32, but that matters much less for a 3B-active MoE at batch 1.

## MTP speculative decoding

Activating MTP:

```bash
llama-server \
  -m /models/qwen3.6-35b-a3b/Qwen3.6-35B-A3B-UD-IQ4_XS.gguf \
  --spec-type draft-mtp \
  -ngl 99 -c 16384 --jinja
```

The log confirms:

```text
common_speculative_init_result: creating MTP draft context against the target model
```

Measured generation, 256 tokens, temperature 0:

| Configuration | Generation speed |
|---|---:|
| Baseline (`llama-bench`, tg128) | 46.30–46.62 tok/s |
| MTP, 256 generated tokens | **67.69 tok/s** |
| MTP draft acceptance | **66.7%** (170/255), mean accepted length 3.00 |

Net gain: roughly **+45%**. The dense 27B went from 14.2 to 19.1 tok/s (+35%) with the same mechanism, so MTP helps both, but the MoE starts from a much better baseline.

## 128k context

KV cache per token for the MoE:

```text
10 full-attention layers × 2 KV heads × 256 dim × 2 (K+V) × 2 bytes
≈ 20 KiB/token (f16)
≈ 10 KiB/token (q8_0)

131,072 tokens × 10 KiB ≈ 1.25 GiB (q8_0)
```

Measured VRAM with 128k context, mmproj, MTP, and q8_0 KV:

| Configuration | VRAM used | Headroom |
|---|---:|---:|
| Qwen3.6-35B-A3B, 128k, mmproj, MTP, KV q8_0 | **21,347 MiB / 23,040 MiB** | **~1.7 GB** |

The server loaded successfully with `n_ctx_slot = 131072` and generated without OOM. A short generation at 128k measured **66.3 tok/s**, consistent with the 67.7 tok/s result at 4k.

For comparison, the dense 27B at 128k used 18,271 MiB with q8_0 KV. The MoE uses more VRAM because its weights are larger (18.2 GB vs 9.6 GB), but it still fits with useful headroom.

The MoE's native 256k context was not tested. With q8_0 KV, 256k would add another ~1.25 GiB plus larger compute buffers, leaving very little headroom on a 24 GB card; 128k is the practical limit with vision and MTP enabled.

Prompt processing for a full 128k prompt:

```text
131,072 tokens / ~1,100 tok/s ≈ 2 minutes
```

That is a major improvement over the dense 27B (~8–9 minutes at ~250 tok/s).

## Final server command

```bash
cd /home/ubuntu/llama.cpp

nohup setsid ./build/bin/llama-server \
  -m /models/qwen3.6-35b-a3b/Qwen3.6-35B-A3B-UD-IQ4_XS.gguf \
  --mmproj /models/qwen3.6-35b-a3b/mmproj-F16.gguf \
  --spec-type draft-mtp \
  -ngl 99 \
  -c 131072 \
  -fa on \
  -ctk q8_0 -ctv q8_0 \
  --host 0.0.0.0 \
  --port 8080 \
  --jinja \
  > "$HOME/llama-server.log" 2>&1 </dev/null &
```

Server endpoints:

- Web UI: `http://192.168.88.27:8080`
- OpenAI-compatible API: `http://192.168.88.27:8080/v1/chat/completions`

This exact configuration was started on `0.0.0.0:8080` and verified from the LAN: `/health` returned `{"status":"ok"}` and a short completion measured **66.8 tok/s**.

Optional hardening/operational notes:

- Add `--api-key "..."` before exposing the server beyond a trusted LAN.
- For vision grounding tasks, add `--image-min-tokens 1024`; llama.cpp warns that Qwen-VL models need at least 1024 image tokens for correct grounding.
- Drop `--mmproj` if vision is not needed; this frees ~0.9 GB.
- Drop `-ctk q8_0 -ctv q8_0` for f16 KV; at 128k this adds ~1.25 GB and is tight but may fit. Not tested with the MoE.
- Check the listener with `ss -ltnp | grep 8080`.
- Stop the server with `pkill -x llama-server` (prefer `-x` over `-f` so the invoking shell is not matched).

## Other optimization options

| Option | Expected effect |
|---|---|
| MTP (`--spec-type draft-mtp`) | **+45% measured** (46.3 → 67.7 tok/s) |
| MoE instead of dense | **3.3x decode, 4.4x prompt** vs the 27B dense model |
| IQ4_XS instead of Q4_K_M | IQ4_XS (18.2 GB) fits 128k + mmproj; Q4_K_M (~22.7 GB) does not leave room |
| KV q8_0 | Saves ~1.25 GB at 128k vs f16; negligible speed effect |
| Flash Attention | ~0.7%, within noise on Pascal |
| ECC off | ~3% bandwidth and +1.5 GB VRAM, requires reboot |
| Better cooling | May restore sustained clocks on long dense workloads |
| `GGML_CUDA_FORCE_MMQ` rebuild | Potential gain on Pascal, not tested |
| Smaller quant | Not needed; IQ4_XS is the sweet spot for 24 GB |

## Gotchas

1. **BAR1 / machine type**: the P40's 32 GB BAR1 requires `q35` + OVMF + `pcie=1`.
2. **CUDA version**: use CUDA 12.x; CUDA 13 no longer supports `sm_61`.
3. **Driver branch**: use 580.x; newer branches drop Pascal.
4. **MTP flag**: the option is `--spec-type draft-mtp`; there is no `--mtp`.
5. **Disk space**: the IQ4_XS model is 18.2 GB and the mmproj is 0.9 GB. Keep at least 20 GB free.
6. **Do not use Q4_K_M for 128k**: at ~22.7 GB it leaves no room for mmproj, KV cache, and compute buffers.
7. **128k VRAM**: q8_0 KV + mmproj + MTP uses 21.3 GB of 23 GB. Monitor with `nvidia-smi`.
8. **Killing the server**: `pkill -f llama-server` can match the calling shell; use `pkill -x llama-server`.
9. **Long prompts**: 128k fits in VRAM, but ingesting a full 128k prompt still takes ~2 minutes on a P40.

## Reproduction checklist

1. Enable VFIO for `10de:1b38` and bind the card to `vfio-pci`.
2. Create a `q35` + OVMF VM with `hostpci0: 0000:10:00,pcie=1` and `cpu: host`.
3. Install NVIDIA 580.x and CUDA 12.4 in the guest.
4. Build llama.cpp with `-DGGML_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES=61`.
5. Download the model and vision projector:

```bash
mkdir -p /models/qwen3.6-35b-a3b
cd /models/qwen3.6-35b-a3b

curl -L --fail -O \
  https://huggingface.co/unsloth/Qwen3.6-35B-A3B-MTP-GGUF/resolve/main/Qwen3.6-35B-A3B-UD-IQ4_XS.gguf

curl -L --fail -O \
  https://huggingface.co/unsloth/Qwen3.6-35B-A3B-MTP-GGUF/resolve/main/mmproj-F16.gguf
```

6. Run `llama-server` with `--spec-type draft-mtp`, `-c 131072`, `-fa on`, and `-ctk q8_0 -ctv q8_0`.
7. Benchmark with `llama-bench -ngl 99 -p 512 -n 128 -r 3 -fa 0,1`.

---

*Tested 2026-10-22 on Proxmox VE 9.2.11 / Ubuntu 26.04.1 / Tesla P40 / llama.cpp build 970b51ce7.*
