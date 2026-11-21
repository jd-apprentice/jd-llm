# LinkedIn: melodias-studio

Estado: borrador. No se publica automáticamente. Revisar los links y elegir una de las dos versiones.

## Versión principal

El primer video de mi canal de música 8-bit lo hice a mano: Suno para el track, stable-diffusion.cpp con MOSS-Image para la miniatura y Qwen para los prompts.

El siguiente ya no lo hago a mano: lo genera mi propio estudio local.

Armé melodias-studio, un TUI en Rust que corre contra tres servicios en mi casa: llama.cpp, stable-diffusion.cpp y audio.cpp con ACE-Step.

Una corrida hace todo esto:

- un LLM convierte el vibe en un prompt visual
- sd-server genera 3 miniaturas candidatas
- yt-dlp baja una referencia y ffmpeg se queda con el minuto más energético
- ACE-Step graba 3 borradores de 60 s
- un juez multimodal opcional y un score determinístico eligen el par
- ACE-Step graba la toma final de 3:30
- ffmpeg masteriza a -15 LUFS y Remotion arma el video 1080p

Todo en una Tesla P40 de 2016, con CUDA 12.8 y sm_61. Sin APIs de pago en el camino crítico.

El código: https://github.com/melodias8bit/melodias-studio
El canal: https://www.youtube.com/@melodias8bit
El lab: https://github.com/jd-apprentice/jd-llm

#LocalLLM #Rust #GenerativeAI #Chiptune #8BitMusic #Homelab #StableDiffusion #AudioIA

## Versión corta

El primer video de mi canal 8-bit lo hice a mano con Suno y stable-diffusion.cpp. El siguiente ya no: lo genera un TUI en Rust contra modelos locales en una Tesla P40, con miniaturas, borradores, toma final, master a -15 LUFS y video 1080p.

Código: https://github.com/melodias8bit/melodias-studio
Canal: https://www.youtube.com/@melodias8bit

#LocalLLM #Rust #Chiptune #Homelab

## Notas de publicación

- Adjuntar una imagen: la miniatura del video 02 (está en el repo del canal) o una captura del TUI de melodias-studio.
- Si buscás más alcance, mover los tres links al primer comentario y dejar solo el del estudio en el cuerpo.
- El post asume que la persona sabe qué es un LLM local. La primera línea funciona como gancho; no agregar contexto antes.
- Evitar em dashes y mantener el tono en primera persona. El detalle técnico va en el blog, no en LinkedIn.
