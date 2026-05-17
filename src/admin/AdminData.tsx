// src/admin/AdminData.tsx — mocked admin-side data
// Exposes window.ADMIN_DATA with modules, recordings, reports, helpers.

type AdminModule = {
  id: string;
  title: string;
  topic: "Vocabulary" | "Grammar" | "Listening" | "Speaking" | "Writing";
  level: "A2" | "B1" | "B2" | "C1";
  status: "published" | "draft" | "archived";
  questions: AdminQuestion[];
  updatedAt: string;
  attempts: number;
  avgScore: number; // %
};

type AdminQuestion = {
  id: string;
  kind: "choice" | "fill" | "match";
  prompt: string;
  // for choice/fill:
  sentence?: string;
  context?: string;
  choices?: { id: string; label: string }[];
  answer?: string;
  // for match:
  pairs?: { left: string; right: string }[];
  explain?: string;
};

const ADMIN_MODULES: AdminModule[] = [
  {
    id: "m-vocab-1",
    title: "Everyday vocabulary · Set 1",
    topic: "Vocabulary",
    level: "A2",
    status: "published",
    updatedAt: "Today · 09:18",
    attempts: 412,
    avgScore: 87,
    questions: [
      {
        id: "q1",
        kind: "choice",
        prompt: "What does \"reduce\" mean here?",
        context: "Heavy rain reduces visibility.",
        choices: [
          { id: "a", label: "Make larger" },
          { id: "b", label: "Make smaller / lessen" },
          { id: "c", label: "Repeat" },
          { id: "d", label: "Reflect" },
        ],
        answer: "b",
        explain: "To reduce = to make smaller in size, amount, or degree.",
      },
      {
        id: "q2",
        kind: "fill",
        prompt: "Choose the best word.",
        sentence: "The teacher gave us a clear __ to follow.",
        choices: [
          { id: "a", label: "explanation" },
          { id: "b", label: "weather" },
          { id: "c", label: "machine" },
          { id: "d", label: "ladder" },
        ],
        answer: "a",
        explain: "An explanation is a statement that makes something clear.",
      },
    ],
  },
  {
    id: "m-grammar-sp",
    title: "Simple present tense",
    topic: "Grammar",
    level: "A2",
    status: "published",
    updatedAt: "Yesterday",
    attempts: 287,
    avgScore: 91,
    questions: [
      {
        id: "q1",
        kind: "choice",
        prompt: "Which sentence is grammatically correct?",
        choices: [
          { id: "a", label: "The model detect objects." },
          { id: "b", label: "The model detects objects." },
          { id: "c", label: "The model detecting objects." },
          { id: "d", label: "The model are detect objects." },
        ],
        answer: "b",
        explain: "Third person singular takes Verb + s/es → detects.",
      },
    ],
  },
  {
    id: "m-listen-news",
    title: "Listening · short news clips",
    topic: "Listening",
    level: "B1",
    status: "published",
    updatedAt: "2 days ago",
    attempts: 148,
    avgScore: 81,
    questions: [],
  },
  {
    id: "m-articles",
    title: "Articles: a / an / the",
    topic: "Grammar",
    level: "B1",
    status: "draft",
    updatedAt: "4 days ago",
    attempts: 0,
    avgScore: 0,
    questions: [],
  },
  {
    id: "m-vocab-rd",
    title: "Image deraining · technical terms",
    topic: "Vocabulary",
    level: "C1",
    status: "draft",
    updatedAt: "Last week",
    attempts: 0,
    avgScore: 0,
    questions: [],
  },
  {
    id: "m-speaking-intro",
    title: "Speaking · self-introduction",
    topic: "Speaking",
    level: "A2",
    status: "published",
    updatedAt: "Last week",
    attempts: 96,
    avgScore: 68,
    questions: [],
  },
];

type AdminRecording = {
  id: string;
  user: { name: string; email: string };
  moduleId: string;
  moduleTitle: string;
  topic: string;
  score: number;
  duration: string;
  flagged: boolean;
  takenAt: string;
  hue: string;
};

const ADMIN_RECORDINGS: AdminRecording[] = [
  { id: "r1", user: { name: "Naufal Faza", email: "naufal@englishbuddy.app" }, moduleId: "m-vocab-1", moduleTitle: "Everyday vocabulary · Set 1", topic: "Vocabulary", score: 92, duration: "8m 42s", flagged: false, takenAt: "Today · 09:14", hue: "158" },
  { id: "r2", user: { name: "Aisha Putri", email: "aisha@englishbuddy.app" }, moduleId: "m-grammar-sp", moduleTitle: "Simple present tense", topic: "Grammar", score: 100, duration: "9m 11s", flagged: false, takenAt: "Today · 08:02", hue: "65" },
  { id: "r3", user: { name: "Daniel Tan", email: "daniel@englishbuddy.app" }, moduleId: "m-listen-news", moduleTitle: "Listening · short news clips", topic: "Listening", score: 64, duration: "11m 03s", flagged: true, takenAt: "Today · 07:38", hue: "220" },
  { id: "r4", user: { name: "Sherly Agam", email: "sherly@englishbuddy.app" }, moduleId: "m-speaking-intro", moduleTitle: "Speaking · self-introduction", topic: "Speaking", score: 72, duration: "6m 20s", flagged: false, takenAt: "Yesterday · 19:55", hue: "25" },
  { id: "r5", user: { name: "Rama Saputra", email: "rama@englishbuddy.app" }, moduleId: "m-vocab-1", moduleTitle: "Everyday vocabulary · Set 1", topic: "Vocabulary", score: 88, duration: "8m 14s", flagged: false, takenAt: "Yesterday · 18:30", hue: "158" },
  { id: "r6", user: { name: "Mei Lin", email: "mei@englishbuddy.app" }, moduleId: "m-grammar-sp", moduleTitle: "Simple present tense", topic: "Grammar", score: 49, duration: "7m 41s", flagged: true, takenAt: "Yesterday · 14:12", hue: "65" },
  { id: "r7", user: { name: "Joshua Pratama", email: "josh@englishbuddy.app" }, moduleId: "m-listen-news", moduleTitle: "Listening · short news clips", topic: "Listening", score: 82, duration: "10m 50s", flagged: false, takenAt: "Yesterday · 11:00", hue: "220" },
  { id: "r8", user: { name: "Larissa Wong", email: "larissa@englishbuddy.app" }, moduleId: "m-vocab-1", moduleTitle: "Everyday vocabulary · Set 1", topic: "Vocabulary", score: 95, duration: "8m 02s", flagged: false, takenAt: "Tue · 21:14", hue: "158" },
];

// 30-day daily activity (active users)
const REPORT_DAILY = Array.from({ length: 30 }, (_, i) => ({
  day: i,
  users: Math.round(80 + Math.sin(i / 3) * 22 + (i % 7 === 0 ? -25 : 0) + Math.random() * 12),
  sessions: Math.round(110 + Math.sin(i / 2.5) * 35 + Math.random() * 14),
}));

const REPORT_TOPIC_MIX = [
  { topic: "Vocabulary", value: 0.36 },
  { topic: "Grammar", value: 0.28 },
  { topic: "Listening", value: 0.16 },
  { topic: "Speaking", value: 0.13 },
  { topic: "Writing", value: 0.07 },
];

const REPORT_ACCURACY = [
  { band: "0–49%", value: 4 },
  { band: "50–69%", value: 11 },
  { band: "70–79%", value: 18 },
  { band: "80–89%", value: 34 },
  { band: "90–100%", value: 27 },
];

const REPORT_KPI = [
  { label: "Active users (7d)", value: "1,284", delta: "+12.4%" },
  { label: "Sessions today", value: "187", delta: "+8.1%" },
  { label: "Avg accuracy", value: "82%", delta: "+1.6%" },
  { label: "Modules published", value: String(ADMIN_MODULES.filter((m) => m.status === "published").length), delta: "+2" },
];

(window as any).ADMIN_DATA = {
  ADMIN_MODULES,
  ADMIN_RECORDINGS,
  REPORT_DAILY,
  REPORT_TOPIC_MIX,
  REPORT_ACCURACY,
  REPORT_KPI,
};
