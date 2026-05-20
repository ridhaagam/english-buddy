# Import Examples

These files show the expected format for importing content into EnglishBuddy.
Drop them into the admin import panel to test the pipeline, or use them as
templates for your own content.

---

## Vocabulary / Document import

**Admin → Import Document → drop file**

Accepted formats: `.pdf`, `.docx`, `.txt`

The backend extracts word–definition pairs and auto-generates:
- **Multiple-choice** questions ("What does X mean?")
- **Fill-in-the-blank** questions
- **Match-pairs** questions

### Example files

| File | What it shows |
|---|---|
| `sample-vocabulary.txt` | Plain-text word list — one word per entry, followed by its definition |
| `sample-vocabulary.csv` | Spreadsheet format with columns: `word`, `definition`, `example_sentence`, `cefr_level` |

### Tips for best results

- **One concept per entry.** Each word or phrase should have its own definition on a separate line.
- **Keep definitions concise.** One sentence is ideal. The AI uses the definition as the basis for distractor answers.
- **Include example sentences** where possible — the parser uses them to generate fill-in-the-blank questions.
- **Label CEFR levels** (A1–C2) in the document title or as a column so the admin can set the module difficulty correctly.
- **Group related words** in sections (e.g., "Greetings", "Food", "Numbers") — each section becomes a suggested module title.

---

## Audio / Listening import

**Admin → Import Audio → drop file**

Accepted formats: `.mp3`, `.wav`, `.m4a`

The pipeline:
1. **whisper.cpp** transcribes the audio locally (no cloud, no API key needed)
2. **Qwen2-1.5B** (running in the `worker` container) drafts comprehension questions from the transcript
3. You review and edit the questions, then publish

### Tips for best results

- Use **clear, natural speech** at a moderate pace — fast or heavily accented audio reduces transcription accuracy.
- Keep files **under 10 minutes** per module for best question quality. Longer audio produces more questions but also more noise.
- **Mono audio at 16 kHz** is ideal for whisper.cpp, though stereo and other rates are accepted.
- After transcription, review the generated transcript in the admin panel before publishing — fix any mishearings before the questions are created.

---

## First-time model download

On the first audio import, the `worker` container downloads the whisper.cpp and
Qwen2 GGUF weights (~2 GB total). This happens once and is cached in the
`filedata/` Docker volume. Subsequent imports start immediately.

If the worker is slow or you see a "model loading" status, check:

```bash
docker compose logs worker
```
