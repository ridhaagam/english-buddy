// src/data.tsx — vocabulary + question bank, sourced from uploaded PDF
// Domain: image deraining / computer vision vocabulary + Simple Present tense.

type VocabEntry = {
  word: string;
  example: string;
  meaning: string; // Indonesian meaning (from PDF)
};

const VOCAB: VocabEntry[] = [
  { word: "degradation", example: "Rain causes image degradation.", meaning: "penurunan kualitas" },
  { word: "restoration", example: "The model performs image restoration.", meaning: "pemulihan" },
  { word: "visibility", example: "Heavy rain reduces visibility.", meaning: "jarak pandang" },
  { word: "streak", example: "Rain streaks affect detection accuracy.", meaning: "garis hujan" },
  { word: "raindrop", example: "Raindrops distort the windshield image.", meaning: "tetesan hujan" },
  { word: "synthetic", example: "We generated a synthetic dataset.", meaning: "sintetis" },
  { word: "enhancement", example: "Image enhancement improves clarity.", meaning: "peningkatan" },
  { word: "distortion", example: "The deraining method introduces distortion.", meaning: "distorsi" },
  { word: "robustness", example: "YOLO requires robustness under rain.", meaning: "ketahanan" },
  { word: "feature", example: "The network extracts spatial features.", meaning: "fitur" },
  { word: "contour", example: "Edge contour preservation is important.", meaning: "kontur" },
  { word: "texture", example: "Fine texture is often removed.", meaning: "tekstur" },
  { word: "semantic", example: "Semantic information helps detection.", meaning: "semantik" },
  { word: "detection", example: "Object detection performance decreased.", meaning: "deteksi" },
  { word: "accuracy", example: "Accuracy improved after preprocessing.", meaning: "akurasi" },
  { word: "inference", example: "Inference speed is important.", meaning: "inferensi" },
  { word: "architecture", example: "The proposed architecture is lightweight.", meaning: "arsitektur" },
  { word: "benchmark", example: "Rain100H is a common benchmark.", meaning: "benchmark" },
  { word: "preserve", example: "The method preserves object edges.", meaning: "mempertahankan" },
  { word: "suppress", example: "The algorithm suppresses rain streaks.", meaning: "menekan" },
  { word: "haze", example: "Rain often appears with haze.", meaning: "kabut" },
  { word: "occlusion", example: "Raindrops create partial occlusion.", meaning: "penghalang visual" },
  { word: "generalization", example: "The model lacks generalization ability.", meaning: "generalisasi" },
  { word: "lightweight", example: "A lightweight network is preferred.", meaning: "ringan" },
  { word: "annotation", example: "The dataset requires manual annotation.", meaning: "anotasi" },
  { word: "boundary", example: "The object boundary becomes unclear in rain.", meaning: "batas" },
  { word: "clarity", example: "The proposed method improves image clarity.", meaning: "kejelasan" },
  { word: "convolution", example: "Convolution layers extract local features.", meaning: "konvolusi" },
  { word: "denoising", example: "Denoising helps improve image quality.", meaning: "penghilangan noise" },
  { word: "evaluation", example: "Quantitative evaluation was conducted.", meaning: "evaluasi" },
  { word: "foreground", example: "The foreground object remains visible.", meaning: "objek depan" },
  { word: "fusion", example: "Feature fusion improves performance.", meaning: "penggabungan" },
];

// ---- Question types ---------------------------------------------------------
type Choice = { id: string; label: string };

type ChoiceQuestion = {
  id: string;
  kind: "choice";
  category: string;
  prompt: string;
  context?: string;
  choices: Choice[];
  answer: string; // choice id
  explain: string;
};

type FillQuestion = {
  id: string;
  kind: "fill";
  category: string;
  prompt: string;
  // sentence with one __ blank
  sentence: string;
  choices: Choice[];
  answer: string;
  explain: string;
};

type MatchQuestion = {
  id: string;
  kind: "match";
  category: string;
  prompt: string;
  pairs: { left: string; right: string }[]; // user must match
  explain: string;
};

type Question = ChoiceQuestion | FillQuestion | MatchQuestion;

// hand-authored question bank using vocab + grammar from the PDF
const QUESTIONS: Question[] = [
  {
    id: "q1",
    kind: "choice",
    category: "Vocabulary · Meaning",
    prompt: "What does the word \u201Cdegradation\u201D mean in this sentence?",
    context: "Rain causes image degradation.",
    choices: [
      { id: "a", label: "An improvement in quality" },
      { id: "b", label: "A decrease in quality" },
      { id: "c", label: "A type of weather" },
      { id: "d", label: "A measurement unit" },
    ],
    answer: "b",
    explain:
      "Degradation means a loss or decrease in quality \u2014 the opposite of enhancement or restoration.",
  },
  {
    id: "q2",
    kind: "fill",
    category: "Vocabulary · Fill in the blank",
    prompt: "Choose the word that best completes the sentence.",
    sentence: "Heavy rain reduces __ on the highway.",
    choices: [
      { id: "a", label: "accuracy" },
      { id: "b", label: "visibility" },
      { id: "c", label: "annotation" },
      { id: "d", label: "convolution" },
    ],
    answer: "b",
    explain:
      "\u201CVisibility\u201D (jarak pandang) is the distance you can clearly see \u2014 rain reduces it.",
  },
  {
    id: "q3",
    kind: "choice",
    category: "Grammar · Simple Present",
    prompt: "Which sentence is grammatically correct?",
    choices: [
      { id: "a", label: "The model detect objects." },
      { id: "b", label: "The model detects objects." },
      { id: "c", label: "The model detecting objects." },
      { id: "d", label: "The model are detect objects." },
    ],
    answer: "b",
    explain:
      "Simple Present with a singular third-person subject (\u201Cthe model\u201D) takes Verb + s/es \u2192 detects.",
  },
  {
    id: "q4",
    kind: "fill",
    category: "Vocabulary · Fill in the blank",
    prompt: "Pick the best word for the gap.",
    sentence: "The algorithm __ rain streaks from the image.",
    choices: [
      { id: "a", label: "preserves" },
      { id: "b", label: "suppresses" },
      { id: "c", label: "introduces" },
      { id: "d", label: "annotates" },
    ],
    answer: "b",
    explain:
      "Deraining methods aim to suppress (menekan / remove) rain streaks while preserving the rest of the image.",
  },
  {
    id: "q5",
    kind: "match",
    category: "Vocabulary · Match",
    prompt: "Match each English word with its Indonesian meaning.",
    pairs: [
      { left: "raindrop", right: "tetesan hujan" },
      { left: "haze", right: "kabut" },
      { left: "boundary", right: "batas" },
      { left: "lightweight", right: "ringan" },
    ],
    explain:
      "These four are taken directly from the vocabulary list \u2014 they describe rain phenomena and image properties.",
  },
  {
    id: "q6",
    kind: "choice",
    category: "Grammar · Simple Present",
    prompt: "Form the negative sentence correctly.",
    context: "Base sentence: \u201CThe model detects small objects.\u201D",
    choices: [
      { id: "a", label: "The model not detect small objects." },
      { id: "b", label: "The model don\u2019t detects small objects." },
      { id: "c", label: "The model does not detect small objects." },
      { id: "d", label: "The model is not detects small objects." },
    ],
    answer: "c",
    explain:
      "Negative: Subject + do/does not + Verb 1. With \u201Cthe model\u201D (he/she/it) we use \u201Cdoes not\u201D + the base verb.",
  },
  {
    id: "q7",
    kind: "fill",
    category: "Vocabulary · Fill in the blank",
    prompt: "Complete the sentence with the right technical term.",
    sentence: "We trained the network on a __ dataset because real rain data is scarce.",
    choices: [
      { id: "a", label: "synthetic" },
      { id: "b", label: "robust" },
      { id: "c", label: "semantic" },
      { id: "d", label: "residual" },
    ],
    answer: "a",
    explain:
      "Synthetic (sintetis) data is artificially generated \u2014 commonly used when real samples are limited.",
  },
  {
    id: "q8",
    kind: "choice",
    category: "Vocabulary · Meaning",
    prompt: "Which definition matches \u201Crobustness\u201D?",
    choices: [
      { id: "a", label: "Speed of computation" },
      { id: "b", label: "Ability to resist degradation under hard conditions" },
      { id: "c", label: "Number of model parameters" },
      { id: "d", label: "A type of image filter" },
    ],
    answer: "b",
    explain:
      "Robustness (ketahanan) is the model\u2019s ability to keep performing well under noisy or adverse conditions.",
  },
];

// expose globally for other Babel script scopes
(window as any).LUMEN_DATA = { VOCAB, QUESTIONS };
