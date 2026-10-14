# API setup and compatibility

Last checked against official provider documentation on **2026-10-14**. The implementation described here is `master` at [3cccc36](https://github.com/sohzm/cheating-daddy/tree/3cccc36f5ed63d7116e4bf93566899871e0199dc). These are source and documentation checks; live-account compatibility has not been tested for this guide.

## Choose a mode

BYOK means bring your own API keys. The Home screen offers BYOK and Local AI:

| Configuration          | Required keys   | Speech and answers                                                                                     | Analyze Screen                                  |
| ---------------------- | --------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| BYOK, Gemini only      | Gemini          | Gemini Live receives audio and typed text; answers are displayed from output transcription             | Gemini HTTP image request                       |
| BYOK, Gemini plus Groq | Gemini and Groq | Gemini Live transcribes audio; Groq generates answers from text. Typed messages also go to Gemini Live | Groq image request                              |
| Local AI               | None            | Native whisper.cpp transcription and llama.cpp responses                                               | Local vision model and its multimodal projector |

**A Groq key alone cannot start a BYOK session in this implementation.** Groq speech transcription is not wired into this path. Adding a Groq key also routes screenshots to Groq; a failed Groq request does not automatically fall back to Gemini.

Routing is implemented in [gemini.js](../src/utils/gemini.js), [renderer.js](../src/utils/renderer.js), and [MainView.js](../src/components/views/MainView.js). Local inference is implemented in [localai.js](../src/utils/localai.js). BYOK sends captured content to the services listed above; Local AI downloads its runners and models before inference can run locally.

## Setup

1. For BYOK, create a [Gemini API key in Google AI Studio](https://aistudio.google.com/apikey). On Home, expand **Transcription** and enter the key and a Live-compatible model ID.
2. To use Groq for answers and screenshots, create a [Groq API key](https://console.groq.com/keys). Expand **AI responses** and enter the key, **Groq Model**, and **Groq Image Model**. The image model must accept image inputs. Leave the Groq key empty to use Gemini for answers and screenshots.
3. Check the compatibility table below before using the saved/default model IDs. End the current session and start a new one after changing the Live model.
4. For Local AI, choose Local AI and a language model plus a Whisper model. Initial setup downloads native runners, the language model, its projector, and Whisper weights. The bundled runner mapping supports macOS arm64/x64 and Windows x64; Linux has no bundled runner mapping.

The Live model field does **not** change the Gemini screenshot model. That model is chosen separately by `getAvailableModel()` in [storage.js](../src/storage.js).

## Shipped models and current provider status

These are the defaults in the referenced source, not a list of models verified to work with every account:

| Path                                  | Shipped model IDs                                                         | Official status as of 2026-10-14                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Gemini Live                           | `gemini-3.1-flash-live-preview`                                           | Shutdown scheduled for November 17, 2026; Google recommends `gemini-3.8-live`                                                                 |
| Gemini screenshots without a Groq key | `gemini-2.5-flash`, then `gemini-2.5-flash-lite`, based on local counters | Access is limited to prior active users. Google lists no shutdown date; new projects should use `gemini-3.8-flash` or `gemini-3.5-flash-lite` |
| Groq text and screenshots             | `qwen/qwen3.6-27b`                                                        | Shut down September 14, 2026 for free/developer usage; replacement: `qwen/qwen3.8-27b`. Committed-spend enterprise contracts are exempt       |

Sources: [Gemini deprecations](https://ai.google.dev/gemini-api/docs/deprecations), [Groq deprecations](https://console.groq.com/docs/deprecations), and the shipped [configuration and screenshot model selection](../src/storage.js).

Groq currently documents [Qwen 3.8 27B](https://console.groq.com/docs/model/qwen/qwen3.8-27b) as a preview model with text and image inputs. Its ID can be entered in both Groq fields, subject to account access and limits; this guide does not claim an end-to-end test.

For Gemini Live migration, review Google's [Gemini 3.8 Live migration notes](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live) and [Live API capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities). A model replacement can require setup and response-handling changes. Updating this document or the Live model field alone does not migrate the separate Gemini screenshot path.

## Request reference

The API calls are concentrated in [gemini.js](../src/utils/gemini.js):

- **Gemini Live:** `GoogleGenAI.live.connect()` uses `v1alpha`, the configured Live model, `responseModalities: [Modality.AUDIO]`, input/output audio transcription, and context-window compression. The app displays output transcription when Groq is absent. Audio is sent with `audio/pcm;rate=24000`; see Google's [audio-format requirements](https://ai.google.dev/gemini-api/docs/live-api/capabilities#audio-formats).
- **Gemini screenshots:** `models.generateContentStream()` sends a base64 JPEG as `inlineData` with the prompt, using `getAvailableModel()` rather than the Live model.
- **Groq text and screenshots:** `POST https://api.groq.com/openai/v1/chat/completions` uses Bearer authentication, `stream: true`, and `max_completion_tokens: 16384`. Screenshots are sent as `image_url` content with a `data:image/jpeg;base64,...` URL. The model comes from `groqModel` or `groqImageModel` respectively.

Reasoning options depend on the Groq model. The current helper sends `reasoning_format: 'hidden'` for Qwen and adds `reasoning_effort: 'none'` when **Disable thinking** is selected. For GPT-OSS, it sends `include_reasoning: false`, which hides reasoning rather than disabling it. Check [Groq's reasoning parameter documentation](https://console.groq.com/docs/reasoning) before changing these fields or models.

## Troubleshooting

| Symptom                                         | What to check                                                                                                                                                     |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Groq key entered but BYOK cannot start          | Gemini is still required for the Live session and transcription                                                                                                   |
| `401` / `403`                                   | Verify the key belongs to the provider receiving the request and that the project has permission to use the model                                                 |
| `404`, model unavailable, or unsupported method | Check the exact model ID, account access, API version, and whether the model supports Live or HTTP generation. A valid HTTP model is not necessarily a Live model |
| Live session closes during setup                | Inspect the sanitized provider error and compare the model's supported setup fields/tools with the Live API guide                                                 |
| Groq `413`                                      | Read the full error body and check request size; see [Groq error codes](https://console.groq.com/docs/errors)                                                     |
| `429` or quota exhaustion                       | Check actual project/organization limits and retry timing in the provider console. The app's local counters do not grant or measure the provider's full quota     |
| No Groq final answer                            | Check completion-token limits and model-specific reasoning settings; hiding reasoning does not guarantee fewer reasoning tokens                                   |

Rate-limit references: [Gemini](https://ai.google.dev/gemini-api/docs/rate-limits) and [Groq](https://console.groq.com/docs/rate-limits). Avoid treating the source's fixed daily counters or token budget as a current free-tier allowance.

When reporting a problem, include the app version, OS, mode, model ID, failing operation, status code, and redacted error text. Remove API keys, authorization headers, private transcripts, and screenshots before sharing logs.

## Maintaining this guide

When updating an integration, check official model lifecycle, input modalities, and request fields first. Review stored defaults in `src/storage.js`, Home defaults in `src/components/views/MainView.js`, and request/response handling in `src/utils/gemini.js` together. Test Live audio, typed messages, and Analyze Screen separately; success on one route does not verify the others. Update the date and source revision here when rechecking the guide.
