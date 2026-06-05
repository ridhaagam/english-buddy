import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlusIcon, TrashIcon, XIcon, EditIcon, CheckIcon, KeyboardIcon, PlayIcon, EyeIcon, UsersIcon,
} from "../../../components/ui";
import { api } from "../../../lib/api";
import { useConfirm } from "../../../components/ConfirmDialog";
import "./AdminTyping.css";

export function AdminTyping() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="container adm-page">
      <header style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="serif" style={{ fontSize: 36, margin: "4px 0 6px", letterSpacing: "-0.02em" }}>Typing decks</h1>
          <p style={{ color: "var(--ink-2)", margin: 0 }}>Create vocabulary decks and add words by hand. Pronunciation audio is generated automatically.</p>
        </div>
        <button className="btn accent" style={{ gap: 6 }} onClick={() => setCreateOpen(true)}>
          <PlusIcon size={14} /> New deck
        </button>
      </header>

      <div className="atw-layout">
        <DeckList selectedId={selectedId} onSelect={setSelectedId} />
        {selectedId ? (
          <DeckDetail deckId={selectedId} onDeleted={() => setSelectedId(null)} />
        ) : (
          <div className="card atw-empty">
            <KeyboardIcon size={32} />
            <p style={{ margin: "12px 0 0", color: "var(--ink-3)", fontSize: 14 }}>Select a deck to manage its words</p>
          </div>
        )}
      </div>

      {createOpen && <DeckModal onClose={() => setCreateOpen(false)} onSaved={(id) => { setSelectedId(id); setCreateOpen(false); }} />}
    </div>
  );
}

// ── Deck list ──────────────────────────────────────────────────────────────

function DeckList({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string | null) => void }) {
  const qc = useQueryClient();
  const [confirm, confirmUI] = useConfirm();
  const { data: decks = [], isLoading } = useQuery({ queryKey: ["admin-typing-decks"], queryFn: api.admin.typing.listDecks });

  const del = useMutation({
    mutationFn: (id: string) => api.admin.typing.deleteDeck(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["admin-typing-decks"] });
      if (selectedId === id) onSelect(null);
    },
  });

  if (isLoading) return <div className="card" style={{ padding: 20, color: "var(--ink-3)" }}>Loading…</div>;

  return (
    <>
    {confirmUI}
    <div className="card" style={{ padding: 0, overflow: "hidden", alignSelf: "start" }}>
      {(decks as any[]).length === 0 && (
        <p style={{ padding: 20, color: "var(--ink-3)", fontSize: 13 }}>No decks yet. Create one to get started.</p>
      )}
      {(decks as any[]).map((d: any) => (
        <button key={d.id} onClick={() => onSelect(d.id)} className={`atw-deck-row${selectedId === d.id ? " active" : ""}`}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span className={`atw-dot${d.is_published ? " on" : ""}`} title={d.is_published ? "Published" : "Hidden"} />
              <span className="atw-deck-title">{d.title}</span>
            </div>
            <p className="atw-deck-sub">
              {d.cefr_level && <span className="mono">{d.cefr_level}</span>}
              <span>{d.word_count} word{d.word_count !== 1 ? "s" : ""}</span>
              <span>{d.assigned_count} assigned</span>
            </p>
          </div>
          <span
            className="icon-btn atw-row-del"
            role="button"
            tabIndex={0}
            onClick={async (e) => {
              e.stopPropagation();
              if (await confirm({ title: "Delete deck?", message: `"${d.title}" and all its words will be permanently removed.`, confirmLabel: "Delete", variant: "danger" })) del.mutate(d.id);
            }}
            title="Delete deck"
          >
            <TrashIcon size={13} />
          </span>
        </button>
      ))}
    </div>
    </>
  );
}

// ── Deck detail ────────────────────────────────────────────────────────────

function DeckDetail({ deckId, onDeleted }: { deckId: string; onDeleted: () => void }) {
  const qc = useQueryClient();
  const [confirm, confirmUI] = useConfirm();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [wordModal, setWordModal] = useState<{ mode: "add" } | { mode: "edit"; word: any } | null>(null);

  const { data: deck, isLoading } = useQuery({ queryKey: ["admin-typing-deck", deckId], queryFn: () => api.admin.typing.getDeck(deckId) });

  const togglePublish = useMutation({
    mutationFn: () => api.admin.typing.updateDeck(deckId, { is_published: !deck.is_published }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-typing-deck", deckId] }); qc.invalidateQueries({ queryKey: ["admin-typing-decks"] }); },
  });
  const delDeck = useMutation({
    mutationFn: () => api.admin.typing.deleteDeck(deckId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-typing-decks"] }); onDeleted(); },
  });
  const delWord = useMutation({
    mutationFn: (wid: string) => api.admin.typing.deleteWord(wid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-typing-deck", deckId] }); qc.invalidateQueries({ queryKey: ["admin-typing-decks"] }); },
  });

  function play(url: string) {
    if (!audioRef.current) audioRef.current = new Audio();
    const token = localStorage.getItem("access_token");
    audioRef.current.pause();
    audioRef.current.src = `${url}${token ? `?token=${token}` : ""}`;
    audioRef.current.play().catch(() => {});
  }

  if (isLoading) return <div className="card" style={{ padding: 20, color: "var(--ink-3)" }}>Loading…</div>;
  if (!deck) return null;

  const words: any[] = deck.words ?? [];

  return (
    <>
    {confirmUI}
    <div className="card" style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 className="serif" style={{ margin: 0, fontSize: 22 }}>{deck.title}</h2>
            {deck.cefr_level && <span className="atw-chip">{deck.cefr_level}</span>}
            <span className="atw-chip">{deck.accent === "uk" ? "UK voice" : "US voice"}</span>
          </div>
          {deck.description && <p style={{ margin: "6px 0 0", color: "var(--ink-2)", fontSize: 13 }}>{deck.description}</p>}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn ghost" style={{ gap: 6 }} onClick={() => setAssignOpen(true)}><UsersIcon size={13} /> Assign learners</button>
          <button className="btn ghost" style={{ gap: 6 }} onClick={() => togglePublish.mutate()}>
            {deck.is_published ? <><EyeIcon size={13} /> Published</> : <>Hidden</>}
          </button>
          <button className="btn ghost" style={{ gap: 6 }} onClick={() => setEditOpen(true)}><EditIcon size={13} /> Edit</button>
          <button className="icon-btn" style={{ color: "oklch(0.55 0.16 25)" }} title="Delete deck"
            onClick={async () => { if (await confirm({ title: "Delete deck?", message: `"${deck.title}" and all its words will be permanently removed.`, confirmLabel: "Delete", variant: "danger" })) delDeck.mutate(); }}>
            <TrashIcon size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p className="eyebrow" style={{ margin: 0 }}>Words ({words.length})</p>
        <button className="btn ghost" style={{ gap: 6 }} onClick={() => setWordModal({ mode: "add" })}>
          <PlusIcon size={13} /> Add word
        </button>
      </div>

      {words.length === 0 ? (
        <p style={{ color: "var(--ink-3)", fontSize: 13 }}>No words yet. Add the first one.</p>
      ) : (
        <div className="atw-word-list">
          {words.map((w: any, i: number) => (
            <div key={w.id} className="atw-word">
              <span className="mono atw-word-num">{i + 1}</span>
              <div className="atw-word-main">
                <div className="atw-word-top">
                  <span className="atw-word-text">{w.word}</span>
                  {w.phonetic && <span className="mono atw-word-phon">{w.phonetic}</span>}
                  {w.pos && <span className="atw-word-pos">{w.pos}</span>}
                </div>
                {w.translation && <span className="atw-word-tr">{w.translation}</span>}
              </div>
              <button className="atw-icon" onClick={() => play(w.audio_url)} title="Play pronunciation"><PlayIcon size={13} /></button>
              <button className="atw-icon" onClick={() => setWordModal({ mode: "edit", word: w })} title="Edit"><EditIcon size={13} /></button>
              <button className="atw-icon danger" onClick={async () => { if (await confirm({ title: "Delete word?", message: `"${w.word}" will be removed from this deck.`, confirmLabel: "Delete", variant: "danger" })) delWord.mutate(w.id); }} title="Delete"><XIcon size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {editOpen && <DeckModal deck={deck} onClose={() => setEditOpen(false)} onSaved={() => setEditOpen(false)} />}
      {assignOpen && <AssignLearnersModal deckId={deckId} deckTitle={deck.title} onClose={() => setAssignOpen(false)} />}
      {wordModal && (
        <WordModal
          deckId={deckId}
          word={wordModal.mode === "edit" ? wordModal.word : undefined}
          onClose={() => setWordModal(null)}
        />
      )}
    </div>
    </>
  );
}

// ── Modals ─────────────────────────────────────────────────────────────────

function DeckModal({ deck, onClose, onSaved }: { deck?: any; onClose: () => void; onSaved: (id: string) => void }) {
  const qc = useQueryClient();
  const editing = !!deck;
  const [form, setForm] = useState({
    title: deck?.title ?? "",
    description: deck?.description ?? "",
    cefr_level: deck?.cefr_level ?? "",
    accent: deck?.accent ?? "us",
    is_published: deck?.is_published ?? true,
  });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        cefr_level: form.cefr_level.trim() || undefined,
        accent: form.accent,
        is_published: form.is_published,
      };
      return editing ? api.admin.typing.updateDeck(deck.id, body) : api.admin.typing.createDeck(body);
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["admin-typing-decks"] });
      if (editing) qc.invalidateQueries({ queryKey: ["admin-typing-deck", deck.id] });
      onSaved(editing ? deck.id : res.id);
    },
  });

  return (
    <Modal title={editing ? "Edit deck" : "New deck"} onClose={onClose}>
      <label style={labelStyle}>Deck title</label>
      <input className="input" style={inputStyle} value={form.title} autoFocus
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Everyday Essentials" />
      <label style={labelStyle}>Description</label>
      <textarea className="input" style={{ ...inputStyle, resize: "vertical", minHeight: 64 }} value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="One sentence about this deck…" />
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>CEFR level</label>
          <select className="input" style={inputStyle} value={form.cefr_level} onChange={(e) => setForm((f) => ({ ...f, cefr_level: e.target.value }))}>
            <option value="">—</option>
            {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Accent / voice</label>
          <select className="input" style={inputStyle} value={form.accent} onChange={(e) => setForm((f) => ({ ...f, accent: e.target.value }))}>
            <option value="us">US (Ana)</option>
            <option value="uk">UK (Sonia)</option>
          </select>
        </div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-2)", marginBottom: 14, cursor: "pointer" }}>
        <input type="checkbox" checked={form.is_published} onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))} style={{ accentColor: "var(--accent)" }} />
        Published (visible to learners)
      </label>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!form.title.trim() || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : editing ? "Save" : "Create"}
        </button>
      </div>
      {save.isError && <p style={{ color: "oklch(0.5 0.1 25)", fontSize: 12, marginTop: 6 }}>{String((save.error as any)?.message ?? "Error")}</p>}
    </Modal>
  );
}

function WordModal({ deckId, word, onClose }: { deckId: string; word?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const editing = !!word;
  const [form, setForm] = useState({
    word: word?.word ?? "",
    phonetic: word?.phonetic ?? "",
    pos: word?.pos ?? "",
    translation: word?.translation ?? "",
    example: word?.example ?? "",
    example_translation: word?.example_translation ?? "",
  });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        word: form.word.trim(),
        phonetic: form.phonetic.trim() || undefined,
        pos: form.pos.trim() || undefined,
        translation: form.translation.trim() || undefined,
        example: form.example.trim() || undefined,
        example_translation: form.example_translation.trim() || undefined,
      };
      return editing ? api.admin.typing.updateWord(word.id, body) : api.admin.typing.addWord(deckId, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-typing-deck", deckId] });
      qc.invalidateQueries({ queryKey: ["admin-typing-decks"] });
      onClose();
    },
  });

  return (
    <Modal title={editing ? "Edit word" : "Add word"} onClose={onClose}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>Word or phrase</label>
          <input className="input" style={inputStyle} value={form.word} autoFocus
            onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))} placeholder="e.g. give up" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Part of speech</label>
          <input className="input" style={inputStyle} value={form.pos}
            onChange={(e) => setForm((f) => ({ ...f, pos: e.target.value }))} placeholder="n. / v. / adj." />
        </div>
      </div>
      <label style={labelStyle}>Phonetic (IPA)</label>
      <input className="input" style={inputStyle} value={form.phonetic}
        onChange={(e) => setForm((f) => ({ ...f, phonetic: e.target.value }))} placeholder="/ɡɪv ʌp/" />
      <label style={labelStyle}>Translation</label>
      <input className="input" style={inputStyle} value={form.translation}
        onChange={(e) => setForm((f) => ({ ...f, translation: e.target.value }))} placeholder="Bahasa Indonesia…" />
      <label style={labelStyle}>Example sentence</label>
      <input className="input" style={inputStyle} value={form.example}
        onChange={(e) => setForm((f) => ({ ...f, example: e.target.value }))} placeholder="Don't give up before you finish." />
      <label style={labelStyle}>Example translation</label>
      <input className="input" style={inputStyle} value={form.example_translation}
        onChange={(e) => setForm((f) => ({ ...f, example_translation: e.target.value }))} placeholder="Jangan menyerah…" />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!form.word.trim() || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : editing ? "Save" : "Add word"}
        </button>
      </div>
      {!editing && <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}><CheckIcon size={11} /> Audio is generated automatically on first play.</p>}
      {save.isError && <p style={{ color: "oklch(0.5 0.1 25)", fontSize: 12, marginTop: 6 }}>{String((save.error as any)?.message ?? "Error")}</p>}
    </Modal>
  );
}

function AssignLearnersModal({ deckId, deckTitle, onClose }: { deckId: string; deckTitle: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-typing-assignments", deckId],
    queryFn: () => api.admin.typing.getAssignments(deckId),
  });

  const learners: any[] = data?.learners ?? [];
  // Initialise selection from the server's "assigned" flags once loaded.
  const sel = selected ?? new Set<string>(learners.filter((l) => l.assigned).map((l) => l.id));

  const save = useMutation({
    mutationFn: () => api.admin.typing.setAssignments(deckId, Array.from(sel)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-typing-assignments", deckId] });
      qc.invalidateQueries({ queryKey: ["admin-typing-decks"] });
      onClose();
    },
  });

  function toggle(id: string) {
    const n = new Set(sel);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  }

  const filtered = learners.filter((l) =>
    !search || l.display_name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal title="Assign learners" onClose={onClose}>
      <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "0 0 12px" }}>
        Pick who can practise <strong>{deckTitle}</strong>. Unchecked learners can't see it.
      </p>
      <input className="input" style={{ ...inputStyle, marginBottom: 10 }} placeholder="Search learners…" value={search}
        onChange={(e) => setSearch(e.target.value)} autoFocus />
      {isLoading ? (
        <p style={{ color: "var(--ink-3)", fontSize: 13 }}>Loading…</p>
      ) : learners.length === 0 ? (
        <p style={{ color: "var(--ink-3)", fontSize: 13 }}>No learner accounts yet.</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--ink-3)", fontSize: 13 }}>No learners match.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
          {filtered.map((l) => (
            <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: "var(--r-sm)", background: sel.has(l.id) ? "var(--accent-soft)" : "var(--bg-2)", border: `1px solid ${sel.has(l.id) ? "var(--accent)" : "var(--line-2)"}`, cursor: "pointer" }}>
              <input type="checkbox" checked={sel.has(l.id)} onChange={() => toggle(l.id)} style={{ accentColor: "var(--accent)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{l.display_name}</span>
                <span style={{ marginLeft: 8, fontSize: 11, color: "var(--ink-3)" }}>{l.email}</span>
              </div>
              {sel.has(l.id) && <CheckIcon size={12} />}
            </label>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{sel.size} selected</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn accent" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 400, display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-xl)", padding: "28px 24px", width: "100%", maxWidth: 480, boxShadow: "var(--shadow-md)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>{title}</h3>
          <button className="icon-btn" onClick={onClose}><XIcon size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 5 };
const inputStyle: React.CSSProperties = { width: "100%", marginBottom: 14, boxSizing: "border-box" };
