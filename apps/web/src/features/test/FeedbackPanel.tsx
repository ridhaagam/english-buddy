import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon } from "../../components/ui";
import "./FeedbackPanel.css";

export type FeedbackPanelProps = {
  correctId: string;
  chosenId: string | null;
  userText?: string;       // typed text for dictation questions (not in choices)
  isCorrect: boolean;
  explain: string | null;
  choices: Array<{ id: string; label: string }>;
  isLast: boolean;
  finishing: boolean;
  onContinue: () => void;
};

// ─── Explain section parser ────────────────────────────────────────────────────
// Handles the AI-generated format:
//   ✅ BENAR: "word" Indonesian sentence. English sentence.
//   ❌ SALAH: "word" Indonesian sentence. English sentence.
type ExplainSection = {
  choiceLabel: string;         // The quoted word after BENAR/SALAH
  type: "correct" | "wrong";
  en: string;
  id: string;
};

const ID_MARKERS = [
  "setelah","kita","selalu","menggunakan","kata","kerja","untuk","orang","adalah",
  "bentuk","tidak","bisa","dalam","kalimat","secara","tata","bahasa","dengan","yang",
  "dan","juga","atau","pada","dari","digunakan","langsung","biasa","tunggal","jamak",
  "pernyataan","subjek","predikat","ini","itu","bukan","jika","maka","hanya","saat",
  "sedang","sudah","telah","akan","pola","contoh","benar","salah","penggunaan",
];

function looksIndonesian(s: string): boolean {
  const lower = s.toLowerCase();
  return ID_MARKERS.some((w) => new RegExp(`\\b${w}\\b`).test(lower));
}

function splitBilingual(text: string): { en: string; id: string } {
  // Split on sentence boundaries
  const raw = text.replace(/\s+/g, " ").trim();
  const sentences = raw.split(/(?<=[.!?])\s+/).filter((s) => s.length > 4);
  if (sentences.length === 0) return { en: raw, id: raw };

  const idBag: string[] = [];
  const enBag: string[] = [];
  sentences.forEach((s) => {
    (looksIndonesian(s) ? idBag : enBag).push(s.trim());
  });

  const id = idBag.join(" ");
  const en = enBag.join(" ");
  // If detection failed entirely, return full text for both
  if (!id && !en) return { en: raw, id: raw };
  return { en: en || raw, id: id || raw };
}

function parseExplainSections(raw: string): ExplainSection[] {
  const sections: ExplainSection[] = [];
  // Regex: captures marker, type, quoted word, and everything until the next marker or end
  const RE = /[✅❌]\s*(BENAR|SALAH)\s*:\s*"([^"]+)"\s*([\s\S]*?)(?=(?:\s*[✅❌]|$))/g;
  let m: RegExpExecArray | null;
  // Append sentinel so last section is captured
  while ((m = RE.exec(raw + " ✅ END: \"__sentinel__\" x")) !== null) {
    const [, type, word, body] = m;
    if (word === "__sentinel__") break;
    const clean = body.replace(/\s+/g, " ").trim();
    const { en, id } = splitBilingual(clean);
    sections.push({
      choiceLabel: word.trim(),
      type: type === "BENAR" ? "correct" : "wrong",
      en,
      id,
    });
  }
  return sections;
}

// ─── ChoiceExplainCard ─────────────────────────────────────────────────────────
function ChoiceExplainCard({
  letter,
  label,
  status,          // "correct" | "wrong" | "neutral"
  section,         // may be null if explain not available
  lang,
  defaultOpen,
}: {
  letter: string;
  label: string;
  status: "correct" | "wrong" | "neutral";
  section: ExplainSection | null;
  lang: "en" | "id";
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Animate max-height
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (open) {
      el.style.maxHeight = el.scrollHeight + "px";
    } else {
      el.style.maxHeight = "0px";
    }
  }, [open, lang]);

  const text = section ? (lang === "en" ? section.en : section.id) : null;
  const canExpand = !!text;

  return (
    <div
      className={`fp-cc fp-cc-${status}${open ? " fp-cc-open" : ""}`}
      onClick={canExpand ? () => setOpen((v) => !v) : undefined}
      role={canExpand ? "button" : undefined}
      aria-expanded={canExpand ? open : undefined}
    >
      <div className="fp-cc-head">
        <span className="fp-cc-letter">{letter}</span>
        <span className="fp-cc-label">{label}</span>
        <span className="fp-cc-mark" aria-hidden>
          {status === "correct" ? "✓" : status === "wrong" ? "✗" : canExpand ? "›" : ""}
        </span>
      </div>
      {canExpand && (
        <div className="fp-cc-body" ref={bodyRef} style={{ maxHeight: defaultOpen ? undefined : "0px", overflow: "hidden", transition: "max-height 0.3s ease" }}>
          <p className="fp-cc-text">{text}</p>
        </div>
      )}
    </div>
  );
}

// ─── FeedbackPanel ─────────────────────────────────────────────────────────────
export function FeedbackPanel({
  correctId,
  chosenId,
  userText,
  isCorrect,
  explain,
  choices,
  isLast,
  finishing,
  onContinue,
}: FeedbackPanelProps) {
  const [visible, setVisible] = useState(false);
  const [lang, setLang] = useState<"en" | "id">("id");

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Parse explain into per-choice sections
  const sections = explain ? parseExplainSections(explain) : [];
  // Build a map: lowercased-choice-label → section
  const sectionMap = new Map<string, ExplainSection>(
    sections.map((s) => [s.choiceLabel.toLowerCase(), s])
  );

  const correctChoice = choices.find((c) => c.id === correctId);
  const chosenChoice = choices.find((c) => c.id === chosenId);
  const correctLetter = String.fromCharCode(65 + choices.findIndex((c) => c.id === correctId));

  // Fallback: if no structured sections found (simple bilingual explain),
  // show it under the correct choice
  const hasSections = sections.length > 0;
  let fallbackSection: ExplainSection | null = null;
  if (!hasSections && explain && correctChoice) {
    const { en, id } = splitBilingual(explain);
    fallbackSection = { choiceLabel: correctChoice.label, type: "correct", en, id };
  }

  return (
    <div className={`fp-overlay${visible ? " fp-visible" : ""}`}>
      <div
        className={`fp-sheet${isCorrect ? " fp-correct" : " fp-wrong"}${
          visible ? " fp-sheet-in" : ""
        }`}
      >
        {/* ── Handle ── */}
        <div className="fp-handle" />

        {/* ── Verdict ── */}
        <div className="fp-verdict">
          <div className="fp-verdict-icon" aria-hidden>
            {isCorrect ? "✓" : "✗"}
          </div>
          <div className="fp-verdict-text">
            <span className="fp-verdict-word">{isCorrect ? "BENAR" : "SALAH"}</span>
            <span className="fp-verdict-sub">
              {isCorrect
                ? `Jawaban kamu: ${userText ?? chosenChoice?.label ?? ""}`
                : `Jawaban benar: ${choices.length > 0 ? (correctChoice?.label ?? "") : correctId}`}
            </span>
          </div>
          {isCorrect && <div className="fp-xp-badge">+10 XP</div>}
        </div>

        {/* ── Language toggle ── */}
        {(hasSections || fallbackSection) && (
          <div className="fp-lang-toggle">
            <button
              className={`fp-lang-btn${lang === "id" ? " active" : ""}`}
              onClick={() => setLang("id")}
            >
              🇮🇩 Bahasa
            </button>
            <button
              className={`fp-lang-btn${lang === "en" ? " active" : ""}`}
              onClick={() => setLang("en")}
            >
              🇬🇧 English
            </button>
          </div>
        )}

        {/* ── Interactive choice cards ── */}
        <div className="fp-choice-cards">
          {choices.map((c, i) => {
            const letter = String.fromCharCode(65 + i);
            const isThisCorrect = c.id === correctId;
            const isThisChosen = c.id === chosenId;
            const status: "correct" | "wrong" | "neutral" = isThisCorrect
              ? "correct"
              : isThisChosen
              ? "wrong"
              : "neutral";

            // Find explanation for this choice
            let section: ExplainSection | null =
              sectionMap.get(c.label.trim().toLowerCase()) ?? null;

            // Try partial match if exact key not found (model may vary casing/spacing)
            if (!section && hasSections) {
              for (const [k, v] of sectionMap) {
                if (c.label.toLowerCase().includes(k) || k.includes(c.label.toLowerCase())) {
                  section = v;
                  break;
                }
              }
            }

            // Fallback section only on correct choice when no structured data
            if (!section && fallbackSection && isThisCorrect) {
              section = fallbackSection;
            }

            // Auto-open correct choice always; auto-open wrong choice if user picked it
            const defaultOpen = isThisCorrect || (!isCorrect && isThisChosen);

            return (
              <ChoiceExplainCard
                key={c.id}
                letter={letter}
                label={c.label}
                status={status}
                section={section}
                lang={lang}
                defaultOpen={defaultOpen}
              />
            );
          })}
        </div>

        {/* ── Continue ── */}
        <button
          className="fp-cta"
          onClick={onContinue}
          disabled={finishing}
          aria-busy={finishing}
        >
          {isLast
            ? finishing
              ? "Menghitung nilai…"
              : "Lihat skor saya"
            : "Lanjut"}
          <ArrowRightIcon size={16} />
        </button>
      </div>
    </div>
  );
}
