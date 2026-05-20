"""Seed script — runs once on first boot, skips if data already exists."""
import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.achievement import Achievement, UserAchievement
from app.models.module import CefrLevel, Module, ModuleStatus, SourceKind, TopicType
from app.models.question import Question, QuestionKind
from app.models.session import Session, SessionAnswer
from app.models.user import User, UserRole


ACHIEVEMENTS = [
    {"id": "week_streak", "title": "Week-long streak", "sub": "7 days in a row", "criteria": {"streak_days": 7}},
    {"id": "centurion", "title": "Centurion", "sub": "100 words learned", "criteria": {"words": 100}},
    {"id": "perfect_set", "title": "Perfect set", "sub": "100% on a module", "criteria": {"score": 100}},
    {"id": "owl_mode", "title": "Owl mode", "sub": "Practice after 10 PM", "criteria": {"hour_ge": 22}},
    {"id": "marathoner", "title": "Marathoner", "sub": "30 day streak", "criteria": {"streak_days": 30}},
]

# ---------------------------------------------------------------------------
# Vocabulary modules — 60 words from vocabulary.pdf split into 6 sets
# ---------------------------------------------------------------------------
VOCAB_MODULES = [
    {
        "title": "Vocabulary · Set 1 — Image Quality",
        "topic": TopicType.vocabulary,
        "level": CefrLevel.B1,
        "status": ModuleStatus.published,
        "questions": [
            {
                "kind": QuestionKind.choice,
                "prompt": 'What does "degradation" mean?',
                "context": "The rain caused severe image degradation in the camera footage.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "An improvement in quality"},
                        {"id": "b", "label": "A decrease in quality"},
                        {"id": "c", "label": "A type of weather condition"},
                        {"id": "d", "label": "A measurement unit"},
                    ],
                    "answer": "b",
                },
                "explain": "Degradation means a loss or reduction in quality.",
            },
            {
                "kind": QuestionKind.fill,
                "prompt": "Choose the word that best completes the sentence.",
                "sentence": "After processing, the image __ was clear and sharp.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "restoration"},
                        {"id": "b", "label": "corruption"},
                        {"id": "c", "label": "noise"},
                        {"id": "d", "label": "overfitting"},
                    ],
                    "answer": "a",
                },
                "explain": "Restoration means bringing something back to its original quality.",
            },
            {
                "kind": QuestionKind.choice,
                "prompt": 'Which word means "the ability to see clearly at a distance"?',
                "payload": {
                    "choices": [
                        {"id": "a", "label": "accuracy"},
                        {"id": "b", "label": "visibility"},
                        {"id": "c", "label": "depth"},
                        {"id": "d", "label": "clarity"},
                    ],
                    "answer": "b",
                },
                "explain": "Visibility refers to how far you can see clearly — reduced by fog or rain.",
            },
            {
                "kind": QuestionKind.fill,
                "prompt": "Select the correct word for the blank.",
                "sentence": "The app tracked a 30-day __ of daily practice sessions.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "benchmark"},
                        {"id": "b", "label": "streak"},
                        {"id": "c", "label": "metric"},
                        {"id": "d", "label": "parameter"},
                    ],
                    "answer": "b",
                },
                "explain": "A streak is an unbroken run of consecutive days or events.",
            },
            {
                "kind": QuestionKind.choice,
                "prompt": 'What is a "raindrop"?',
                "payload": {
                    "choices": [
                        {"id": "a", "label": "A type of cloud formation"},
                        {"id": "b", "label": "A single drop of rain water"},
                        {"id": "c", "label": "A weather forecasting tool"},
                        {"id": "d", "label": "A measurement of rainfall"},
                    ],
                    "answer": "b",
                },
                "explain": "A raindrop is a single droplet of water falling from a cloud.",
            },
            {
                "kind": QuestionKind.match,
                "prompt": "Match each word to its correct meaning.",
                "payload": {
                    "pairs": [
                        {"left": "synthetic", "right": "artificially made"},
                        {"left": "enhancement", "right": "improvement of quality"},
                        {"left": "distortion", "right": "change from true shape"},
                        {"left": "robustness", "right": "ability to handle variation"},
                    ],
                },
                "explain": "These terms describe properties of image processing algorithms.",
            },
        ],
    },
    {
        "title": "Vocabulary · Set 2 — Image Features",
        "topic": TopicType.vocabulary,
        "level": CefrLevel.B1,
        "status": ModuleStatus.published,
        "questions": [
            {
                "kind": QuestionKind.choice,
                "prompt": 'In image processing, what is a "feature"?',
                "context": "The model extracts features from the input image to detect objects.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "A decorative element of a photo"},
                        {"id": "b", "label": "A measurable property used for analysis"},
                        {"id": "c", "label": "A type of image file format"},
                        {"id": "d", "label": "A photography technique"},
                    ],
                    "answer": "b",
                },
                "explain": "In ML/vision, a feature is a measurable property or characteristic extracted from data.",
            },
            {
                "kind": QuestionKind.fill,
                "prompt": "Pick the best word for the gap.",
                "sentence": "The algorithm traces the __ of objects to separate them from the background.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "contour"},
                        {"id": "b", "label": "metric"},
                        {"id": "c", "label": "parameter"},
                        {"id": "d", "label": "fusion"},
                    ],
                    "answer": "a",
                },
                "explain": "A contour is the outline or boundary shape of an object.",
            },
            {
                "kind": QuestionKind.choice,
                "prompt": 'What does "texture" refer to in computer vision?',
                "payload": {
                    "choices": [
                        {"id": "a", "label": "The colour palette of an image"},
                        {"id": "b", "label": "The surface pattern and detail of a region"},
                        {"id": "c", "label": "The resolution of a photo"},
                        {"id": "d", "label": "The brightness level of pixels"},
                    ],
                    "answer": "b",
                },
                "explain": "Texture describes the visual pattern of surface detail in an image region.",
            },
            {
                "kind": QuestionKind.fill,
                "prompt": "Select the correct word.",
                "sentence": "__ segmentation assigns a label to every pixel based on its meaning.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "Synthetic"},
                        {"id": "b", "label": "Semantic"},
                        {"id": "c", "label": "Residual"},
                        {"id": "d", "label": "Latent"},
                    ],
                    "answer": "b",
                },
                "explain": "Semantic relates to meaning — semantic segmentation understands what each pixel represents.",
            },
            {
                "kind": QuestionKind.match,
                "prompt": "Match each word to its meaning.",
                "payload": {
                    "pairs": [
                        {"left": "detection", "right": "finding objects in an image"},
                        {"left": "accuracy", "right": "percentage of correct predictions"},
                        {"left": "inference", "right": "running a trained model on new data"},
                        {"left": "architecture", "right": "structure of a neural network"},
                    ],
                },
                "explain": "These terms are core vocabulary in machine learning and computer vision.",
            },
        ],
    },
    {
        "title": "Vocabulary · Set 3 — Model Training",
        "topic": TopicType.vocabulary,
        "level": CefrLevel.B2,
        "status": ModuleStatus.published,
        "questions": [
            {
                "kind": QuestionKind.choice,
                "prompt": 'What is a "backbone" in deep learning?',
                "context": "The model uses ResNet as its backbone for feature extraction.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "The final output layer of a network"},
                        {"id": "b", "label": "The main feature extraction network"},
                        {"id": "c", "label": "The training dataset"},
                        {"id": "d", "label": "The loss function used"},
                    ],
                    "answer": "b",
                },
                "explain": "A backbone is the primary network that extracts features from input data.",
            },
            {
                "kind": QuestionKind.fill,
                "prompt": "Choose the word that fits best.",
                "sentence": "We compare our results against the __ set by state-of-the-art methods.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "overfitting"},
                        {"id": "b", "label": "benchmark"},
                        {"id": "c", "label": "masking"},
                        {"id": "d", "label": "raindrop"},
                    ],
                    "answer": "b",
                },
                "explain": "A benchmark is a standard reference used for performance comparison.",
            },
            {
                "kind": QuestionKind.choice,
                "prompt": 'What does "optimization" mean in machine learning?',
                "payload": {
                    "choices": [
                        {"id": "a", "label": "Making the dataset larger"},
                        {"id": "b", "label": "Adjusting model weights to minimise loss"},
                        {"id": "c", "label": "Adding more layers to a model"},
                        {"id": "d", "label": "Testing the model on new images"},
                    ],
                    "answer": "b",
                },
                "explain": "Optimization is the process of updating parameters to reduce error.",
            },
            {
                "kind": QuestionKind.fill,
                "prompt": "Pick the correct word.",
                "sentence": "The algorithm aims to __ fine detail while removing noise.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "suppress"},
                        {"id": "b", "label": "distort"},
                        {"id": "c", "label": "preserve"},
                        {"id": "d", "label": "annotate"},
                    ],
                    "answer": "c",
                },
                "explain": "Preserve means to keep or maintain something unchanged.",
            },
            {
                "kind": QuestionKind.match,
                "prompt": "Match each word to its correct meaning.",
                "payload": {
                    "pairs": [
                        {"left": "suppress", "right": "reduce or eliminate"},
                        {"left": "artifact", "right": "unwanted visual defect"},
                        {"left": "haze", "right": "atmospheric blur reducing clarity"},
                        {"left": "depth", "right": "distance from viewer to object"},
                    ],
                },
                "explain": "These describe common issues and measurements in image processing.",
            },
        ],
    },
    {
        "title": "Vocabulary · Set 4 — Data & Evaluation",
        "topic": TopicType.vocabulary,
        "level": CefrLevel.B2,
        "status": ModuleStatus.published,
        "questions": [
            {
                "kind": QuestionKind.choice,
                "prompt": 'What is "occlusion" in computer vision?',
                "context": "Occlusion occurs when one object hides part of another in the image.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "The brightness of an image"},
                        {"id": "b", "label": "When one object blocks another from view"},
                        {"id": "c", "label": "The resolution of a camera"},
                        {"id": "d", "label": "A type of data augmentation"},
                    ],
                    "answer": "b",
                },
                "explain": "Occlusion happens when an object partially or fully hides another.",
            },
            {
                "kind": QuestionKind.fill,
                "prompt": "Select the best word for the blank.",
                "sentence": "Good __ means the model works well on data it has never seen before.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "generalization"},
                        {"id": "b", "label": "overfitting"},
                        {"id": "c", "label": "masking"},
                        {"id": "d", "label": "sharpening"},
                    ],
                    "answer": "a",
                },
                "explain": "Generalization is the model's ability to perform well on unseen data.",
            },
            {
                "kind": QuestionKind.choice,
                "prompt": 'Which word describes a model that is efficient and uses few resources?',
                "payload": {
                    "choices": [
                        {"id": "a", "label": "robust"},
                        {"id": "b", "label": "synthetic"},
                        {"id": "c", "label": "lightweight"},
                        {"id": "d", "label": "semantic"},
                    ],
                    "answer": "c",
                },
                "explain": "Lightweight models have fewer parameters and run efficiently on limited hardware.",
            },
            {
                "kind": QuestionKind.fill,
                "prompt": "Choose the correct word.",
                "sentence": "Researchers label each object in the image during the __ process.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "inference"},
                        {"id": "b", "label": "annotation"},
                        {"id": "c", "label": "reconstruction"},
                        {"id": "d", "label": "localization"},
                    ],
                    "answer": "b",
                },
                "explain": "Annotation is the process of adding labels or tags to data for training.",
            },
            {
                "kind": QuestionKind.match,
                "prompt": "Match each word to its definition.",
                "payload": {
                    "pairs": [
                        {"left": "boundary", "right": "edge between regions"},
                        {"left": "clarity", "right": "sharpness and clearness"},
                        {"left": "convolution", "right": "sliding filter operation"},
                        {"left": "corruption", "right": "damage to data or image"},
                    ],
                },
                "explain": "These are key terms in image processing and computer vision tasks.",
            },
        ],
    },
    {
        "title": "Vocabulary · Set 5 — Processing Techniques",
        "topic": TopicType.vocabulary,
        "level": CefrLevel.B2,
        "status": ModuleStatus.published,
        "questions": [
            {
                "kind": QuestionKind.choice,
                "prompt": 'What does "denoising" mean?',
                "context": "The denoising algorithm removes random grain from the photo.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "Adding noise to make data more realistic"},
                        {"id": "b", "label": "Removing unwanted random variation from an image"},
                        {"id": "c", "label": "Increasing the resolution of an image"},
                        {"id": "d", "label": "Merging two images together"},
                    ],
                    "answer": "b",
                },
                "explain": "Denoising removes random noise to produce a cleaner image.",
            },
            {
                "kind": QuestionKind.fill,
                "prompt": "Pick the best word.",
                "sentence": "We conduct a thorough __ of model performance on the test set.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "reconstruction"},
                        {"id": "b", "label": "masking"},
                        {"id": "c", "label": "evaluation"},
                        {"id": "d", "label": "sharpening"},
                    ],
                    "answer": "c",
                },
                "explain": "Evaluation means assessing the quality or performance of something.",
            },
            {
                "kind": QuestionKind.choice,
                "prompt": 'In an image, the "foreground" is:',
                "payload": {
                    "choices": [
                        {"id": "a", "label": "The area behind the main subject"},
                        {"id": "b", "label": "The part of the scene closest to the viewer"},
                        {"id": "c", "label": "The overall colour of the image"},
                        {"id": "d", "label": "The brightest region of the photo"},
                    ],
                    "answer": "b",
                },
                "explain": "Foreground is the part of the scene that appears closest to the viewer.",
            },
            {
                "kind": QuestionKind.fill,
                "prompt": "Select the correct word.",
                "sentence": "The model combines radar and camera data through sensor __.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "suppression"},
                        {"id": "b", "label": "fusion"},
                        {"id": "c", "label": "segmentation"},
                        {"id": "d", "label": "residual"},
                    ],
                    "answer": "b",
                },
                "explain": "Fusion is the combination of data from multiple sources.",
            },
            {
                "kind": QuestionKind.match,
                "prompt": "Match each word to its meaning.",
                "payload": {
                    "pairs": [
                        {"left": "illumination", "right": "lighting conditions"},
                        {"left": "localization", "right": "finding the position of objects"},
                        {"left": "masking", "right": "hiding selected regions"},
                        {"left": "metric", "right": "measure used to evaluate"},
                    ],
                },
                "explain": "These terms are used in image analysis and model evaluation.",
            },
        ],
    },
    {
        "title": "Vocabulary · Set 6 — Advanced ML Terms",
        "topic": TopicType.vocabulary,
        "level": CefrLevel.C1,
        "status": ModuleStatus.published,
        "questions": [
            {
                "kind": QuestionKind.choice,
                "prompt": 'What is "overfitting"?',
                "context": "The model achieved 99% training accuracy but only 60% on the test set — a sign of overfitting.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "When a model learns training data too well and fails on new data"},
                        {"id": "b", "label": "When a model is too simple to learn the patterns"},
                        {"id": "c", "label": "When training takes too long"},
                        {"id": "d", "label": "When the dataset is too small"},
                    ],
                    "answer": "a",
                },
                "explain": "Overfitting means the model memorises training data rather than generalising.",
            },
            {
                "kind": QuestionKind.fill,
                "prompt": "Choose the best word for the blank.",
                "sentence": "Each __ of the model controls how it responds to different inputs.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "parameter"},
                        {"id": "b", "label": "raindrop"},
                        {"id": "c", "label": "streak"},
                        {"id": "d", "label": "haze"},
                    ],
                    "answer": "a",
                },
                "explain": "Parameters are the learnable weights of a model adjusted during training.",
            },
            {
                "kind": QuestionKind.choice,
                "prompt": 'What does "residual" mean in residual networks (ResNets)?',
                "payload": {
                    "choices": [
                        {"id": "a", "label": "The final output of the network"},
                        {"id": "b", "label": "The shortcut connection that adds input to output"},
                        {"id": "c", "label": "The activation function used"},
                        {"id": "d", "label": "The learning rate schedule"},
                    ],
                    "answer": "b",
                },
                "explain": "Residual connections add the input directly to the layer output, easing gradient flow.",
            },
            {
                "kind": QuestionKind.fill,
                "prompt": "Select the word that fits the context.",
                "sentence": "__ learning reuses knowledge from one task to help with another.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "Adverse"},
                        {"id": "b", "label": "Latent"},
                        {"id": "c", "label": "Transfer"},
                        {"id": "d", "label": "Synthetic"},
                    ],
                    "answer": "c",
                },
                "explain": "Transfer learning applies knowledge gained from one domain to a new task.",
            },
            {
                "kind": QuestionKind.match,
                "prompt": "Match each advanced term to its definition.",
                "payload": {
                    "pairs": [
                        {"left": "noise", "right": "random unwanted signal"},
                        {"left": "preprocessing", "right": "preparing data before training"},
                        {"left": "reconstruction", "right": "rebuilding original from degraded"},
                        {"left": "uncertainty", "right": "lack of confidence in prediction"},
                    ],
                },
                "explain": "These advanced terms are essential in understanding modern ML systems.",
            },
            {
                "kind": QuestionKind.choice,
                "prompt": 'What is a "dataset" in machine learning?',
                "payload": {
                    "choices": [
                        {"id": "a", "label": "A single data point used for testing"},
                        {"id": "b", "label": "A collection of data examples used for training or evaluation"},
                        {"id": "c", "label": "The output predictions of a model"},
                        {"id": "d", "label": "A type of neural network layer"},
                    ],
                    "answer": "b",
                },
                "explain": "A dataset is a structured collection of examples used to train or evaluate a model.",
            },
        ],
    },
]

GRAMMAR_MODULES = [
    {
        "title": "Simple present tense",
        "topic": TopicType.grammar,
        "level": CefrLevel.A2,
        "status": ModuleStatus.published,
        "questions": [
            {
                "kind": QuestionKind.choice,
                "prompt": "Which sentence is grammatically correct?",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "The model detect objects."},
                        {"id": "b", "label": "The model detects objects."},
                        {"id": "c", "label": "The model detecting objects."},
                        {"id": "d", "label": "The model are detect objects."},
                    ],
                    "answer": "b",
                },
                "explain": "Third person singular subject takes Verb + s/es → 'detects'.",
            },
            {
                "kind": QuestionKind.choice,
                "prompt": "Form the negative sentence correctly.",
                "context": 'Base sentence: "The model detects small objects."',
                "payload": {
                    "choices": [
                        {"id": "a", "label": "The model not detect small objects."},
                        {"id": "b", "label": "The model don't detects small objects."},
                        {"id": "c", "label": "The model does not detect small objects."},
                        {"id": "d", "label": "The model is not detects small objects."},
                    ],
                    "answer": "c",
                },
                "explain": "Negative: Subject + does not + base verb form.",
            },
            {
                "kind": QuestionKind.fill,
                "prompt": "Choose the correct form of the verb.",
                "sentence": "She __ to improve her English every day.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "practice"},
                        {"id": "b", "label": "practices"},
                        {"id": "c", "label": "practicing"},
                        {"id": "d", "label": "practiced"},
                    ],
                    "answer": "b",
                },
                "explain": "She = third person singular → practices (verb + s).",
            },
        ],
    },
    {
        "title": "Articles: a / an / the",
        "topic": TopicType.grammar,
        "level": CefrLevel.B1,
        "status": ModuleStatus.published,
        "questions": [
            {
                "kind": QuestionKind.choice,
                "prompt": "Which sentence uses the article correctly?",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "She is a engineer."},
                        {"id": "b", "label": "She is an engineer."},
                        {"id": "c", "label": "She is the engineer."},
                        {"id": "d", "label": "She is engineer."},
                    ],
                    "answer": "b",
                },
                "explain": "Use 'an' before words starting with a vowel sound — 'an engineer'.",
            },
            {
                "kind": QuestionKind.fill,
                "prompt": "Select the correct article.",
                "sentence": "I saw __ cat sitting by the window.",
                "payload": {
                    "choices": [
                        {"id": "a", "label": "a"},
                        {"id": "b", "label": "an"},
                        {"id": "c", "label": "the"},
                        {"id": "d", "label": "—"},
                    ],
                    "answer": "a",
                },
                "explain": "'A cat' — indefinite article before a consonant sound.",
            },
        ],
    },
]

SPEAKING_MODULE = {
    "title": "Speaking · self-introduction",
    "topic": TopicType.speaking,
    "level": CefrLevel.A2,
    "status": ModuleStatus.published,
    "questions": [
        {
            "kind": QuestionKind.choice,
            "prompt": "Which greeting is most appropriate for a formal introduction?",
            "payload": {
                "choices": [
                    {"id": "a", "label": "Hey, what's up?"},
                    {"id": "b", "label": "Good morning, my name is..."},
                    {"id": "c", "label": "Yo, I'm..."},
                    {"id": "d", "label": "Wassup everyone"},
                ],
                "answer": "b",
            },
            "explain": "Formal introductions use 'Good morning/afternoon' followed by your name.",
        },
        {
            "kind": QuestionKind.choice,
            "prompt": "How do you politely ask someone to repeat themselves?",
            "payload": {
                "choices": [
                    {"id": "a", "label": "What? Say it again."},
                    {"id": "b", "label": "Could you please repeat that?"},
                    {"id": "c", "label": "Huh?"},
                    {"id": "d", "label": "I didn't catch nothing."},
                ],
                "answer": "b",
            },
            "explain": "'Could you please repeat that?' is polite and natural in formal settings.",
        },
    ],
}

ALL_MODULES = VOCAB_MODULES + GRAMMAR_MODULES + [SPEAKING_MODULE]


async def seed():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "admin@example.com"))
        if result.scalar_one_or_none():
            print("✓ Already seeded, skipping.")
            return

        print("Seeding database...")

        owner = User(
            email="admin@example.com",
            display_name="Admin",
            password_hash=hash_password("admin123"),
            role=UserRole.owner,
            streak=0,
            xp_total=0,
        )
        db.add(owner)

        learner = User(
            email="student@example.com",
            display_name="Student",
            password_hash=hash_password("student123"),
            role=UserRole.learner,
            streak=3,
            xp_total=450,
        )
        db.add(learner)
        await db.flush()

        for a in ACHIEVEMENTS:
            db.add(Achievement(**a))
        await db.flush()

        db.add(UserAchievement(user_id=owner.id, achievement_id="week_streak", progress_pct=100.0))

        seeded_modules = []
        for mdata in ALL_MODULES:
            m = Module(
                title=mdata["title"],
                topic=mdata["topic"],
                cefr_level=mdata["level"],
                status=mdata["status"],
                created_by=owner.id,
                source_kind=SourceKind.manual,
            )
            db.add(m)
            await db.flush()

            for i, qdata in enumerate(mdata.get("questions", [])):
                q = Question(
                    module_id=m.id,
                    position=i,
                    kind=qdata["kind"],
                    prompt=qdata["prompt"],
                    context=qdata.get("context"),
                    sentence=qdata.get("sentence"),
                    payload=qdata["payload"],
                    explain=qdata.get("explain"),
                )
                db.add(q)

            seeded_modules.append(m)
            await db.flush()

        published = [m for m in seeded_modules if m.status == ModuleStatus.published]
        for i, m in enumerate(published[:3]):
            from datetime import datetime, timedelta, timezone
            qs_r = await db.execute(
                select(Question).where(Question.module_id == m.id).order_by(Question.position)
            )
            questions = qs_r.scalars().all()
            if not questions:
                continue

            session = Session(
                user_id=learner.id,
                module_id=m.id,
                started_at=datetime.now(timezone.utc) - timedelta(days=i),
                finished_at=datetime.now(timezone.utc) - timedelta(days=i) + timedelta(minutes=30),
                score_pct=round((len(questions) - 1) / len(questions) * 100),
                correct_count=len(questions) - 1,
                total=len(questions),
                xp_earned=(len(questions) - 1) * 40 + len(questions) * 10,
            )
            db.add(session)
            await db.flush()

            for q in questions:
                correct_answer = q.payload.get("answer", "")
                db.add(SessionAnswer(
                    session_id=session.id,
                    question_id=q.id,
                    selection={"choice": correct_answer},
                    is_correct=True,
                    time_spent_ms=12000,
                ))

        await db.commit()
        print("✓ Database seeded successfully.")
        print("  Admin:   admin@example.com / admin123")
        print("  Student: student@example.com / student123")


if __name__ == "__main__":
    asyncio.run(seed())
