# Audio takes log

Every take generated for the channel, with the configuration that produced it. The audio lives in `assets/audio/drafts/`, which is gitignored; this log is what keeps the work reproducible.

The chosen track gets renamed to `assets/audio/NN-slug.mp3` and documented in the matching video entry.

## Naming

```
<series>-<variant>-<style>_<model>-<steps>st[-cfg<N>][-<sampler>]_seed<seed>_<loop|take><seconds>s.mp3
```

- `loop`: already crossfaded for seamless playback.
- `take`: raw length, not looped (server drafts and the short tests).
- `seedunknown`: generated without `--seed`, so the seed was not recorded and the take cannot be reproduced.

## Takes

| File | Model | Steps | CFG | Sampler | Seed | Length | Wall time |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `arcade-A-synthwave_turbo-8st_seed49042438_loop176s.mp3` | turbo | 8 | - | euler | 49042438 | 2:56 | 50 s |
| `arcade-B-chiptune_turbo-8st_seed48632807_loop180s.mp3` | turbo | 8 | - | euler | 48632807 | 3:00 | 52 s |
| `arcade-C-crossover_turbo-8st_seed50680757_loop178s.mp3` | turbo | 8 | - | euler | 50680757 | 2:58 | 79 s |
| `arcade-D-crossover-minor_turbo-8st_seed13422959_loop180s.mp3` | turbo | 8 | - | euler | 13422959 | 3:00 | 93 s |
| `arcade-E-dreamy_turbo-8st_seed61401622_loop153s.mp3` | turbo | 8 | - | euler | 61401622 | 2:33 | 51 s |
| `arcade-E-dreamy_base-32st-cfg5-heun_seed61401622_loop163s.mp3` | base | 32 | 5 | heun | 61401622 | 2:43 | 302 s |
| `arcade-F-dreamy_base-50st-cfg7-heun_seed17434378_loop165s.mp3` | base | 50 | 7 | heun | 17434378 | 2:45 | 577 s |
| `arcade-G-dreamy-structure_base-32st-cfg5-heun_seed42774356_loop203s.mp3` | base | 32 | 5 | heun | 42774356 | 3:23 | 366 s |
| `arcade-H-dreamy-structure_xlsft-q8dit-32st-cfg5-heun_seed42774356_loop201s.mp3` | xl-sft q8dit | 32 | 5 | heun | 42774356 | 3:21 | 742 s |
| `arcade-server-draft_turbo-8st_seed42_take129s.mp3` | turbo | 8 | - | euler | 42 | 2:09 | server |
| `arcade-server-draft_turbo-8st_seed1337_take129s.mp3` | turbo | 8 | - | euler | 1337 | 2:09 | server |
| `arcade-server-draft_turbo-8st_seed2024_take129s.mp3` | turbo | 8 | - | euler | 2024 | 2:09 | server |
| `chiptune-nostalgic_turbo-8st_seed42_loop178s.mp3` | turbo | 8 | - | euler | 42 | 2:58 | - |
| `chiptune-nostalgic_turbo-8st_seed777_loop178s.mp3` | turbo | 8 | - | euler | 777 | 2:58 | - |
| `chiptune-nostalgic_turbo-8st_seedunknown_take60s.mp3` | turbo | 8 | - | euler | unknown | 1:00 | - |
| `chiptune-nostalgic_magenta-rt2-small_seedunknown_take10s.mp3` | magenta-rt2-small | - | - | - | unknown | 0:10 | - |

All takes were generated at 190 s except the two short tests and the server drafts.

## Prompts

**P1, nostalgic chiptune** (short test and the 2:58 loops):

```text
8-bit chiptune, nostalgic, instrumental, soft square wave lead, steady mellow groove, seamless loop, no intro, no outro
```

The 60 s test used only `8-bit chiptune, nostalgic, instrumental, soft square wave lead`.

**P2, arcade variants A to D**:

- A: `80s synthwave, gated reverb drums, analog arpeggio bass, neon lead synth, energetic, driving, instrumental`
- B: `NES-style chiptune battle theme, square lead, triangle bass, noise channel drums, upbeat and driving, instrumental`
- C: `chiptune and synthwave crossover, driving 16th note bass, punchy 16-bit drums, bright arpeggios, arcade cabinet energy, instrumental`
- D: same as C, plus `keyscale=A minor`.

These four used `negative_prompt="slow ambient calm lofi downtempo ballad"` and `bpm` overrides.

**P3, long description** (E and F), passed verbatim:

```text
A nostalgic and cheerful retro arcade soundtrack blending dreamy synthwave with playful 8-bit chiptune melodies. Bright pixel-inspired arpeggios, catchy vintage video game sounds, warm analog synthesizers, deep smooth synth bass, punchy retro drum machine beats and atmospheric neon pads. Create a cozy yet energetic 1990s arcade atmosphere, like spending a late evening playing classic video games surrounded by colorful neon lights. Relaxing enough for studying, coding and focusing, but melodic and upbeat enough to bring back childhood gaming memories. Seamless instrumental composition, evolving melodies, polished production, no vocals, no lyrics.
```

**P4, server drafts**:

```text
synthwave and chiptune fusion, mid tempo, retro arcade at night, driving analog bassline, bright square wave lead, punchy 16-bit drums, neon energy, instrumental, no vocals
```

**P5, P3 plus structure** (G):

```text
Structure: a short atmospheric intro of pads and arpeggio before the drums enter, then the full groove, and a proper outro that resolves and settles back to the opening chord instead of cutting off.
```

Appended to P3, generated at 210 s instead of 190 s so the intro and outro fit without eating the loop length.

## Reproduce a take

```bash
# turbo, 8 steps (drafts)
audiocpp_cli --model /models/ACE-Step1.5-GGUF/turbo/ace-step-1.5-turbo-bf16.gguf \
  --family ace_step --task gen --backend cuda --task-route text2music \
  --text "<prompt>" --duration-seconds 190 --seed <seed> --out take.wav

# base, full quality
audiocpp_cli --model /models/ACE-Step1.5-GGUF/base/ace-step-1.5-base-bf16.gguf \
  --family ace_step --task gen --backend cuda --task-route text2music \
  --text "<prompt>" --duration-seconds 190 --seed <seed> \
  --request-option num_inference_steps=50 \
  --request-option guidance_scale=7 \
  --request-option sampler_mode=heun \
  --out take.wav
```

## Loop assembly

Every ACE-Step take ends with a fade-out, and long descriptions add an intro build-up. The loop script does:

1. Detect tempo by folding the onset envelope over candidate periods (70 to 180 BPM). A and F land at 123.75 BPM, bar of 1.939 s.
2. Start on a bar line after the intro, end on a bar line.
3. Among the bar-aligned lengths between 150 s and 190 s, keep the one whose end spectrum best matches the start spectrum.
4. Crossfade 50 ms at the seam and normalize the peak to -1 dBFS.

Takes A to D and the two nostalgic loops still carry the old 2 s crossfade, which smears the rhythm and makes the seam sound like a repeat. Everything from E onward uses the bar-aligned cut.

G is a third variant, for when the take has an intentional intro and outro: keep both ends, trim the trailing silence and crossfade the last 3 s of the outro into the first 3 s of the intro. Both edges are sparse, so the blend reads as a breath instead of a jump. H uses the same recipe.

## Samplers and checkpoints

- `sampler_mode` only accepts `euler` and `heun`. `heun` runs two evaluations per step, so it costs roughly twice the time and usually gives cleaner edges. `euler` is the fast path.
- `turbo` and `xl-turbo` are guidance-distilled: `num_inference_steps` caps at 8 and `guidance_scale` is ignored.
- `base` and `xl-sft` take the CFG path, so steps and CFG matter.
- Wall time, same prompt and seed at 32 steps, CFG 5, `heun`: base 366 s, xl-sft q8dit 742 s. A 190 s take at 50 steps and CFG 7 on base took 577 s, so the quality budget is linear in steps.

## Findings

- `bpm` and `keyscale` request options are ignored by the planner (`used_request_metadata 0` in the trace). Tempo and mood have to go in the text.
- Turbo is capped at 8 steps and ignores `guidance_scale`, so extra steps only cost time.
- Over the server API, `duration_sec` is advisory: asking for 60 s returned 129 s. The CLI respects `--duration-seconds` exactly.
- Wall time on the P40 scales with steps times CFG: 8 steps in 51 s, 32 steps with CFG 5 in 302 s, 50 steps with CFG 7 in 577 s.
- Takes generated from a caption without intro language start immediately at full energy, which is why the loop has no breathing room at the edges. Asking for structure in the prompt works: G opens 4 dB quieter than the groove and closes with a 3 s fade.
