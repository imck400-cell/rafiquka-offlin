import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Plus,
  Trash2,
  Save,
  FileSpreadsheet,
  Share2,
  Calendar,
  User as UserIcon,
  BookOpen,
  CheckCircle,
  Clock,
  Settings,
  X,
  Search,
  Filter,
  Users,
  Award,
  BookMarked,
  Layers,
  Sparkles
} from "lucide-react";
import { useGlobal } from "../context/GlobalState";
import { toast } from "sonner";
import * as XLSX from "xlsx-js-style";
import { DailyPrep } from "../types";

// Fixed 20-option arrays
const CONSTANTS_AR = {
  objectives: [
    "أن يتلو الطالب الآيات الكريمة تلاوة مجودة وفق أحكام التجويد.",
    "أن يفسر الطالب المفردات القرآنية والمعاني الإيمانية المستنبطة.",
    "أن يستنتج الأحكام الفقهية والقيم الإسلامية من النصوص الشرعية.",
    "أن يحلل الطالب النص الأدبي مبيناً مواطن الجمال والبلاغة فيه.",
    "أن يميز بين القواعد النحوية والصرفية في الجمل المعطاة.",
    "أن يطبق خطوات الحل الرياضي للوصول لنتائج دقيقة.",
    "أن يبرهن صحة النظريات الهندسية باستخدام المنطق الرياضي.",
    "أن يشرح الظواهر العلمية (كيميائية/فيزيائية) بناءً على المشاهدة التجريبية.",
    "أن يستنتج العلاقة بين تركيب الخلية ووظائفها الحيوية (أحياء).",
    "أن يحدد المواقع الجغرافية والأحداث التاريخية على الخرائط الزمنية.",
    "أن يحلل أثر الأحداث التاريخية في تشكيل المجتمعات المعاصرة.",
    "أن يصمم خوارزمية برمجية لحل مشكلة تقنية محددة.",
    "أن ينشئ قاعدة بيانات منظمة باستخدام أوامر لغة الاستعلام.",
    "أن يطور الطالب مهارات التعبير والكتابة الإبداعية بلغة عربية فصحى.",
    "أن يصمم تجربة علمية متكاملة داخل المختبر مع تحديد المتغيرات.",
    "أن يقارن بين أنواع الكائنات الحية والأنظمة البيئية المختلفة.",
    "أن يكتشف قوانين الحركة والجاذبية من خلال التطبيقات الحياتية.",
    "أن يطبق قواعد الإملاء وعلامات الترقيم بشكل صحيح.",
    "أن يستخدم أدوات البحث العلمي ومصادر المعلومات بالشكل الأمثل.",
    "أن يكتسب الطالب قيم المواطنة الرقمية وأخلاقيات التعامل مع الذكاء الاصطناعي."
  ],
  warmup: [
    "تلاوة خاشعة لآية مرتبطة بموضوع الدرس لتهيئة النفوس.",
    "عرض فيديو قصير عن عظمة الخالق في الكون (ربطاً بالعلوم والإيمان).",
    "طرح \"سؤال التحدي\" عن لغز لغوي أو إعرابي محفز.",
    "عرض مسألة حياتية واقعية لا تُحل إلا بالمعادلة الرياضية الجديدة.",
    "إجراء تجربة \"الدهشة العلمية\" (تفاعل كيميائي سريع أو ظاهرة فيزيائية).",
    "عرض خريطة تاريخية صماء والطلب من الطلاب توقع مسارات الجيوش.",
    "عرض مشكلة برمجية واقعية والبحث عن حل تقني لها.",
    "استخدام \"صندوق الأسرار\" يحتوي على عينات ملموسة من البيئة.",
    "قصة قصيرة عن حياة عالم أو صحابي أو شخصية تاريخية مؤثرة.",
    "لعبة \"الكلمات المبعثرة\" لتشكيل عنوان الدرس على السبورة الذكية.",
    "مسابقة سريعة لتذكّر المكتسبات السابقة باستعمال لوحات بيضاء.",
    "نشاط جماعي لرسم خريطة ذهنية مبدئية لعنوان الدرس الجديد.",
    "تحدي رياضي ذهني فوري بدون استخدام القلم والورقة.",
    "استعراض خبر صحفي أو حادثة راهنة ترتبط بالمفاهيم الأساسية.",
    "طرح افتراض خيالي: \"ماذا لو اختفت هذه القاعدة أو العنصر؟\"",
    "مقارنة بين صورتين (الماضي والحاضر) لاستنتاج التغير الاجتماعي.",
    "عرض نموذج ثلاثي الأبعاد (3D) لمكونات الحاسوب أو الخلية.",
    "اقتباس ملهم لمفكر أو أديب وبحث دلالاته.",
    "عصف ذهني حول \"ماذا لو اختفت هذه التقنية من حياتنا؟\".",
    "مسابقة سريعة عبر \"كاهوت\" للمعلومات السابقة المرتبطة بالدرس."
  ],
  strategies: [
    "التعلم بالاكتشاف الموجه (خاص بالعلوم والرياضيات).",
    "استراتيجية \"فكر - شارك - زميل\" (Think-Pair-Share).",
    "استراتيجية \"الكرسي الساخن\" للمناقشات الأدبية والتاريخية.",
    "التعلم القائم على المشروعات (Project-Based Learning).",
    "استراتيجية \"خرائط المفاهيم\" الذهنية.",
    "استراتيجية \"الدراما والتمثيل\" (للسيرة النبوية والنصوص الأدبية).",
    "استراتيجية \"الصف المقلوب\" (Flipped Classroom).",
    "استراتيجية \"التلعيب\" (Gamification).",
    "استراتيجية \"الاستقصاء العلمي\" (Inquiry-based learning).",
    "استراتيجية \"الرؤوس المرقمة\" للعمل الجماعي.",
    "استراتيجية العصف الذهني وحل المشكلات.",
    "التعلم باللعب والدمى التفاعلية للتربية الأساسية.",
    "استراتيجية جيغسو (المجموعات المتداخلة).",
    "التعلم القائم على الحالات وال سيناريوهات الواقعية.",
    "استراتيجية خرائط التدفق والتحليل الخوارزمي.",
    "التعلم الذاتي عبر المنصات الرقمية.",
    "استراتيجية \"الأركان التعليمية\" المتخصصة.",
    "المناظرة العلمية بين مؤيد ومعارض لنظرية ما.",
    "استراتيجية \"قبعات التفكير الست\".",
    "التدريس التبادلي لتحليل النصوص المعقدة."
  ],
  assessment: [
    "تسميع غيبي للآيات والأحاديث المقررة.",
    "اختبار \"الدقيقة الواحدة\" لقياس سرعة الاستيعاب.",
    "حل تمارين الكتاب المدرسي وتصحيحها فوراً.",
    "تصميم خريطة معرفية تلخص الدرس.",
    "اختبار رقمي (Google Forms / Kahoot) بنتائج فورية.",
    "ملاحظة أداء الطالب في المعمل (علوم/حاسوب).",
    "تقييم \"تذكرة الخروج\" (Exit Ticket) قبل نهاية الحصة.",
    "إعراب جملة خارجية تطبق القاعدة النحوية.",
    "حل مسألة رياضية \"مستوى عليا\" خارج الكتاب.",
    "عرض تقديمي مبسط من إعداد الطالب حول الدرس.",
    "توجيه سؤال مفتوح ومتابعة ردود أفعال الطلاب وتسجيل الفروقات.",
    "حل تدريبات مسابقة علمية موازية للمقررات.",
    "تصميم ورقة عمل تعاونية ملخصة ومشاركتها مع المعلم.",
    "لعبة تعليمية رقمية لتقييم المفاهيم المصطلحية.",
    "تحليل الطلاب المشترك للأخطاء المرتكبة بالتمارين السابقة.",
    "ملف الإنجاز الرقمي (E-Portfolio) لمتابعة التطور.",
    "التقييم بالأقران (Peer Assessment) وفق معايير محددة.",
    "رسم توضيحي لأجزاء الجهاز أو الدائرة الكهربائية.",
    "كتابة مقال رأي حول قضية اجتماعية أو تاريخية.",
    "تنفيذ كود برمجى بسيط والتأكد من خلوه من الأخطاء."
  ]
};

const CONSTANTS_EN = {
  objectives: [
    "To enable students to scan a text for specific information.",
    "To practice using the \"Present Perfect\" in situational context.",
    "To enhance students' ability to paraphrase complex sentences.",
    "To develop oral fluency through group debates.",
    "To translate technical terms from Arabic to English accurately.",
    "To write a coherent persuasive essay using linking words.",
    "To identify main ideas and supporting details in a reading passage.",
    "To apply phonetic rules to pronounce unfamiliar words correctly.",
    "To use context clues to deduce the meaning of new vocabulary.",
    "To demonstrate comprehension of spoken English in a native audio track.",
    "To construct grammatically correct passive voice sentences.",
    "To synthesize information from multiple sources during a writing task.",
    "To express opinions on social issues fluently and spontaneously.",
    "To employ vocabulary related to modern technology and AI.",
    "To analyze stylistic features and metaphors in literary texts.",
    "To draft and edit an argumentative paragraph with transition markers.",
    "To differentiate between formal and informal English registers.",
    "To listen carefully and extract specific key numbers/dates from reports.",
    "To formulate polite questions and responses in mock dialogs.",
    "To translate short texts while preserving idiomatic expressions."
  ],
  warmup: [
    "Start with a \"Hangman\" game to guess the keywords.",
    "Use \"Picture Description\" to elicit new vocabulary.",
    "Play a short audio clip and ask: \"What did you hear?\".",
    "Flashcards competition for irregular verbs.",
    "A 2-minute \"Think-Pair-Share\" about a daily routine.",
    "Quick tongue-twisters to activate speech and pronunciation.",
    "Word association map centered around the lesson topic.",
    "Show a cryptic quote and ask students to guess the writer's intent.",
    "Spot the differences game between two similar images.",
    "\"Two Truths and One Lie\" situational warm-up.",
    "Quick trivia quiz using English general knowledge questions.",
    "Guess the word using student mime or gestures.",
    "Read a funny short story and ask about its moral.",
    "Quick grammar correction puzzle on the blackboard.",
    "Play a simple spelling bee contest with key vocabulary.",
    "Unscramble the sentences game for a secret message.",
    "Ask \"Would You Rather\" questions to trigger conversation.",
    "Show an interesting short video without sound; ask students to guess the plot.",
    "Fill in the missing letters of 5 key words.",
    "Reflect on a popular English proverb and explain its meaning."
  ],
  strategies: [
    "Communicative Language Teaching (CLT).",
    "Task-Based Learning (TBL).",
    "Total Physical Response (TPR) for vocabulary.",
    "Role-playing real-life English conversations.",
    "Peer-teaching for grammar correction.",
    "The Flipped Classroom model (watching video-lessons beforehand).",
    "Audio-Lingual scaffolding method (listen and repeat).",
    "Concept Mapping of grammatical structures.",
    "Gamified language acquisition contests.",
    "Socratic Questioning for comprehension discussions.",
    "Cooperative jigsaw readings in groups.",
    "Direct instruction with visual aids and projections.",
    "Information Gap activities for dynamic communication.",
    "Reading circles for literary discussions.",
    "Brainstorming clusters for writing preparation.",
    "Error analysis workshops (collaborative editing).",
    "Project-Based English campaigns.",
    "Guided discovery of grammatical rules.",
    "Self-directed digital learning modules.",
    "Reciprocal teaching of reading comprehension strategies."
  ],
  assessment: [
    "Dictation test for the new vocabulary.",
    "Short paragraph writing to assess grammar usage.",
    "Oral interview (30 seconds per student).",
    "Matching synonyms and antonyms exercise.",
    "Correcting common mistakes in a text.",
    "Five-minute listening comprehension quiz structure.",
    "Fill-in-the-blank grammar checking exercises.",
    "Reading aloud rubrics evaluation for intonation and fluency.",
    "Exit Ticket: write three new parsed structures.",
    "Create and perform a 1-minute conversation role-play.",
    "Peer Evaluation of short essay writing drafts.",
    "Vocabulary mapping with visual illustrations.",
    "Creating a summary map of the reading text.",
    "Standard Multiple-Choice grammar testing questions.",
    "Direct translation text test from Arabic to English.",
    "Comprehension check questions regarding the main theme.",
    "E-Portfolio submission evaluation.",
    "Quick presentation showing research results on a topic.",
    "Sentence transformation exercise (Active to Passive, etc.).",
    "Pronunciation checklist testing during reading."
  ]
};

export const TEACHER_LEARNER_ROLES = [
  "المعلم (مقرئ ومصحح) يقابله المتعلم (مستمع ومحاكٍ) يضبط الأداء الصوتي وينصت بوعي.",
  "المعلم (مستنبط ومفسر) يقابله المتعلم (متأمل ومطبق) يربط الأحكام بالأدلة ويستنتج الحكمة منها.",
  "المعلم (مقعّد وموجّه) يقابله المتعلم (محلل ومقيس) يبسط القاعدة الفكرية ويوجه للقياس عليها.",
  "المعلم (مذوق ومحفز) يقابله المتعلم (ناقد ومتذوق) يبرز مواطن الجمال ويحلل الأبعاد الفنية.",
  "المعلم (مدير حوار) يقابله المتعلم (خطيب ومحاور) يدير النقاش ويعبر عن الأفكار بطلاقة.",
  "المعلم (مشرف وموجه إجراءات) يقابله المتعلم (مجرب وملاحظ) يشرف على الخطوات وينفذ التجربة بدقة.",
  "المعلم (مكتشف ومنظم) يقابله المتعلم (مصنف ومستكشف) يربط العناصر ببيئاتها ويدرس الخصائص.",
  "المعلم (مهندس مسألة) يقابله المتعلم (حلّال مشكلات) يطرح التحديات المنطقية ويفكك الرموز للحل.",
  "المعلم (راوٍ وموثق) يقابله المتعلم (محلل أحداث) يربط الوقائع بأسبابها ويستنتج العبر منها.",
  "المعلم (دليل ومفسر رموز) يقابله المتعلم (قارئ ومحدد اتجاهات) يشرح الظواهر ويفسر الإحداثيات.",
  "المعلم (مدرب رقمي) يقابله المتعلم (مبرمج ومنفذ) يشرح آليات العمل الذكي ويصمم الحلول البرمجية.",
  "المعلم (مهندس مدخلات) يقابله المتعلم (مستثمر تقني) يدرب على صياغة الأوامر ويوظفها لإنتاج المعرفة.",
  "المعلم (مرشد قرائي) يقابله المتعلم (قارئ متأمل) يصمم أسئلة الفهم ويستخرج الأفكار الرئيسة.",
  "المعلم (رسّام خطي ومحاكي موازين) يقابله المتعلم (محاكٍ ومدون) يوضح حركات الرسم ويلتزم بالقواعد.",
  "المعلم (مستشار بحثي) يقابله المتعلم (باحث وموثق) يوجه نحو المصادر ويجمع البيانات ويحللها.",
  "المعلم (مدرب ومصمم أنشطة) يقابله المتعلم (ممارس ومتقن) ينفذ النمذجة المهارية ويكرر الأداء للإتقان.",
  "المعلم (مدير مشروع) يقابله المتعلم (مخطط ومشارك تعاوني) يتابع مراحل العمل ويعمل بروح الفريق.",
  "المعلم (قائد نقاش سكراتي) يقابله المتعلم (مفكر ناقد) يطرح أسئلة عميقة ويوازن بين الحجج والآراء.",
  "المعلم (مقيّم ومغذٍ راجع) يقابله المتعلم (مقيّم ذاتي) يقيس الأداء فورياً ويكتشف نقاط القوة والضعف.",
  "المعلم (ملهم ومحفز للابتكار) يقابله المتعلم (مبتكر ومبدع) يهيئ بيئة آمنة للمخاطرة الفكرية وتقديم حلول جديدة.",
  "المعلم (مفسر وموضح دلالات) يقابله المتعلم (مستنتج ومستبصر) يشرح المعاني والسياقات ويستنتج المقاصد والأهداف.",
  "المعلم (مؤصل ومربٍ) يقابله المتعلم (متمثل ومتخلق) يغرس القيم التربوية والسلوكية ويعكسها في تعاملاته.",
  "المعلم (مسمّع ومراجع) يقابله المتعلم (مستذكر ومثبّت) يتابع جودة الحفظ الفوري ويسترجع النصوص بطلاقة.",
  "المعلم (عروضي ومقطع نغمي) يقابله المتعلم (منشد وضابط إيقاع) يوضح البحور الشعرية والتفاعيل ويقطع الأبيات موسيقياً.",
  "المعلم (مثرٍ لغوي) يقابله المتعلم (مكتسب للمفردات) يقدم المترادفات والأضداد ويستخدم الكلمات الجديدة في سياقاتها.",
  "المعلم (مسرحي ومخرج مشهد) يقابله المتعلم (ممثل ومحاكٍ للأدوار) يحول النص الجامد إلى حوار تفاعلي حي.",
  "المعلم (ملخص وباني خرائط) يقابله المتعلم (منظم ومخطط مفاهيمي) يفكك المحتوى الطويل ويربطه in مخططات ذهنية.",
  "المعلم (مثير تساؤلات) يقابله المتعلم (مستفسر وفضولي معرفي) يطرح فجوات معرفية ليدفع الطالب للبحث والسؤال.",
  "المعلم (مدرب إلقاء وضابط نبرة) يقابله المتعلم (متحدث ومؤثر صوتي) يوجه لتلوين الصوت بما يناسب المعنى والموقف.",
  "المعلم (مصمم ألعاب تعليمية) يقابله المتعلم (لاعب نشط ومستمتع) يحول التنافس المعرفي إلى متعة وتعلم تفاعلي.",
  "المعلم (ناقد ومنقح نصوص) يقابله المتعلم (محرر ومصحح ذاتي) يكتشف الأخطاء التعبيرية ويعيد صياغتها بأسلوب أفضل.",
  "المعلم (محلل إحصائي) يقابله المتعلم (جامع وقارئ بيانات) يوجه لقراءة الجداول البيانية واستخراج المؤشرات منها.",
  "المعلم (موجه مهني وحياتي) يقابله المتعلم (مخطط مستقبلي) يربط المعرفة الأكاديمية بالمهارات الحياتية وسوق العمل.",
  "المعلم (مستكشف بدائل) يقابله المتعلم (مفكر مرن) يدرب على إيجاد أكثر من طريقة للوصول لنفس النتيجة.",
  "المعلم (ميسر عصف ذهني) يقابله المتعلم (متدفق الأفكار) يجمع الأفكار دون أحكام مسبقة لتوليد حلول إبداعية.",
  "المعلم (مصحح مفاهيم مغلوطة) يقابله المتعلم (معدل للمسار المعرفي) يعيد بناء الفهم الخاطئ بناءً على أدلة علمية.",
  "المعلم (حكم وموجه مناظرات) يقابله المتعلم (محاجج ومفند) يدير مهارات التناظر ويفند الأدلة بالحجة والبرهان.",
  "المعلم (منمي ذكاء وجداني) يقابله المتعلم (متعاطف وواعٍ بذاته) يعزز مهارات فهم الذات والتحكم بالانفعالات وتفهم الآخرين.",
  "المعلم (ميسر مجموعات مرن) يقابله المتعلم (قائد وتابع تبادلي) يوزع الأدوار داخل الفريق ليتعلم الطالب القيادة والتبعية.",
  "المعلم (مستشرف ومخطط سيناريوهات) يقابله المتعلم (مستشرف للمستقبل) يطرح قضايا مستقبلية ليتوقع الطالب مساراتها وحلولها."
];

const SUBJECT_OPTIONS = [
  "القرآن كريم",
  "التربية الإسلامية",
  "اللغة العربية",
  "اللغة الإنجليزية",
  "الرياضيات",
  "العلوم",
  "الكيمياء",
  "الفيزياء",
  "الأحياء",
  "الاجتماعيات",
  "الحاسوب"
];

const GRADE_OPTIONS = [
  "تمهيدي",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12"
];

const COLORS = [
  "from-blue-50 to-indigo-100 hover:from-blue-100 hover:to-indigo-200 border-blue-200 text-blue-900",
  "from-emerald-50 to-teal-100 hover:from-emerald-100 hover:to-teal-200 border-emerald-200 text-emerald-900",
  "from-indigo-50 to-violet-100 hover:from-indigo-100 hover:to-violet-200 border-indigo-200 text-indigo-900",
  "from-amber-50 to-orange-100 hover:from-amber-100 hover:to-orange-200 border-amber-200 text-amber-900",
  "from-cyan-50 to-blue-100 hover:from-cyan-100 hover:to-blue-200 border-cyan-200 text-cyan-900",
  "from-fuchsia-50 to-pink-100 hover:from-fuchsia-100 hover:to-pink-200 border-fuchsia-200 text-fuchsia-900",
  "from-sky-50 to-blue-100 hover:from-sky-100 hover:to-blue-200 border-sky-200 text-sky-900"
];

export const DailyPreparationView = ({ onBack }: { onBack: () => void }) => {
  const { data, currentUser, updateData, getReportMessageFooter, shareViaWhatsApp } = useGlobal();

  // Mode: menu, new_prep, archive
  const [viewMode, setViewMode] = useState<"menu" | "new_prep" | "archive">("menu");

  // Load and cache constant options offline-first
  useEffect(() => {
    try {
      if (!localStorage.getItem("constants_daily_prep_loaded")) {
        localStorage.setItem("constants_daily_prep_loaded", "true");
        localStorage.setItem("constants_ar_objs", JSON.stringify(CONSTANTS_AR.objectives));
        localStorage.setItem("constants_ar_warm", JSON.stringify(CONSTANTS_AR.warmup));
        localStorage.setItem("constants_ar_strat", JSON.stringify(CONSTANTS_AR.strategies));
        localStorage.setItem("constants_ar_assess", JSON.stringify(CONSTANTS_AR.assessment));
        localStorage.setItem("constants_en_objs", JSON.stringify(CONSTANTS_EN.objectives));
        localStorage.setItem("constants_en_warm", JSON.stringify(CONSTANTS_EN.warmup));
        localStorage.setItem("constants_en_strat", JSON.stringify(CONSTANTS_EN.strategies));
        localStorage.setItem("constants_en_assess", JSON.stringify(CONSTANTS_EN.assessment));
      }
    } catch (e) {
      console.error("Local storage not enabled", e);
    }
  }, []);

  // Is general supervisor/admin
  const isSuperAdmin = useMemo(() => {
    return currentUser?.role === "admin" || currentUser?.permissions?.all === true;
  }, [currentUser]);

  // Extract from state
  const preparations = useMemo(() => {
    return (data as any).dailyPreparations || [];
  }, [data]);

  const userStaffProfile = useMemo(() => {
    if (isSuperAdmin) {
      return null;
    }
    return data.secretariatStaff?.find(
      (s: any) => s.name?.trim().toLowerCase() === currentUser?.name?.trim().toLowerCase()
    );
  }, [data.secretariatStaff, currentUser, isSuperAdmin]);

  const allowedSchools = useMemo(() => {
    if (isSuperAdmin) {
      return data.availableSchools || [];
    }
    if (userStaffProfile?.school) {
      return [userStaffProfile.school];
    }
    return currentUser?.schools || [];
  }, [data.availableSchools, currentUser, isSuperAdmin, userStaffProfile]);

  const allowedBranchesMap = useMemo(() => {
    const schoolBranchesMap = data.schoolBranches || {};
    if (isSuperAdmin) {
      return schoolBranchesMap;
    }
    const result: Record<string, string[]> = {};
    allowedSchools.forEach((school) => {
      const branches = schoolBranchesMap[school] || [];
      if (userStaffProfile?.branch) {
        result[school] = branches.filter((b: string) => b === userStaffProfile.branch);
      } else {
        const authBranches = currentUser?.permissions?.schoolsAndBranches?.[school] || [];
        if (authBranches.length > 0) {
          result[school] = branches.filter((b) => authBranches.includes(b));
        } else {
          result[school] = branches;
        }
      }
    });
    return result;
  }, [data.schoolBranches, allowedSchools, currentUser, isSuperAdmin, userStaffProfile]);

  const getAllowedBranchesForSchool = (schoolName: string): string[] => {
    return allowedBranchesMap[schoolName] || [];
  };

  const availableSchools = allowedSchools;

  const allowedSubjects = useMemo(() => {
    if (isSuperAdmin) {
      return SUBJECT_OPTIONS;
    }
    if (userStaffProfile?.subjects && userStaffProfile.subjects.length > 0) {
      return userStaffProfile.subjects;
    }
    if (currentUser?.subjects && currentUser.subjects.length > 0) {
      return currentUser.subjects;
    }
    return SUBJECT_OPTIONS;
  }, [currentUser, isSuperAdmin, userStaffProfile]);

  const allowedGrades = useMemo(() => {
    if (userStaffProfile?.grades && userStaffProfile.grades.length > 0) {
      return userStaffProfile.grades;
    }
    if (currentUser?.grades && currentUser.grades.length > 0) {
      return currentUser.grades;
    }
    if (isSuperAdmin) {
      return GRADE_OPTIONS;
    }
    return GRADE_OPTIONS;
  }, [currentUser, isSuperAdmin, userStaffProfile]);

  // --- SUB-PERMISSIONS ---
  const teacherPortalPerms = currentUser?.permissions?.teacherPortal;
  const hasNewPrep = isSuperAdmin || teacherPortalPerms === true || (Array.isArray(teacherPortalPerms) && teacherPortalPerms.includes("newPrep"));
  const hasArchivePrep = isSuperAdmin || teacherPortalPerms === true || (Array.isArray(teacherPortalPerms) && teacherPortalPerms.includes("archivePrep"));
  const hasPrepStats = isSuperAdmin || teacherPortalPerms === true || (Array.isArray(teacherPortalPerms) && teacherPortalPerms.includes("prepStats"));
  const hasViewTeachersPrep = useMemo(() => {
    if (isSuperAdmin) return true;
    if (teacherPortalPerms === true || (Array.isArray(teacherPortalPerms) && teacherPortalPerms.includes("viewTeachersPrep"))) {
      return true;
    }
    if (!currentUser) return false;
    const title = currentUser.jobTitle || "";
    const allowedTitles = [
      "مدير عام",
      "المدير العام",
      "مدير فرع",
      "مدير الفرع",
      "مشرف تربوي",
      "المشرف التربوي",
      "مشرف إداري",
      "المشرف الإداري",
      "مشرف عام",
      "المشرف العام",
      "نائب المشرف العام",
      "سكرتارية",
      "إدارة الجودة"
    ];
    return allowedTitles.some(t => title.includes(t));
  }, [currentUser, isSuperAdmin, teacherPortalPerms]);

  const hasControlSupervisionPanel = isSuperAdmin || teacherPortalPerms === true || (Array.isArray(teacherPortalPerms) && teacherPortalPerms.includes("controlSupervisionPanel"));

  // --- ARCHIVE STATES & FILTERS ---
  const [archSchool, setArchSchool] = useState<string>("الكل");
  const [archBranch, setArchBranch] = useState<string>("الكل");
  const [archSubject, setArchSubject] = useState<string>("الكل");
  const [archGrade, setArchGrade] = useState<string>("الكل");
  const [archDateFrom, setArchDateFrom] = useState<string>("");
  const [archDateTo, setArchDateTo] = useState<string>("");
  const [archTeacher, setArchTeacher] = useState<string>("الكل");

  // Applied filter states
  const [appliedSchool, setAppliedSchool] = useState<string>("الكل");
  const [appliedBranch, setAppliedBranch] = useState<string>("الكل");
  const [appliedSubject, setAppliedSubject] = useState<string>("الكل");
  const [appliedGrade, setAppliedGrade] = useState<string>("الكل");
  const [appliedTeacher, setAppliedTeacher] = useState<string>("الكل");
  const [appliedDateFrom, setAppliedDateFrom] = useState<string>("");
  const [appliedDateTo, setAppliedDateTo] = useState<string>("");

  // Archive view layout style: cards or table or stats
  const [archiveViewStyle, setArchiveViewStyle] = useState<"cards" | "table" | "stats">("cards");

  // Dynamic branch list in filters
  const archiveBranchesList = useMemo(() => {
    if (archSchool === "الكل") {
      const allBranchesSet = new Set<string>();
      availableSchools.forEach((s) => {
        getAllowedBranchesForSchool(s).forEach((b) => allBranchesSet.add(b));
      });
      return ["الكل", ...Array.from(allBranchesSet)];
    }
    return ["الكل", ...getAllowedBranchesForSchool(archSchool)];
  }, [archSchool, availableSchools, allowedBranchesMap, currentUser]);

  const prepTeachers = useMemo(() => {
    const teachersMap = new Map<string, { name: string; schools?: string[]; branch?: string; grades?: string[] }>();
    preparations.forEach((p: DailyPrep) => {
      if (p.teacherName && !teachersMap.has(p.teacherName.trim().toLowerCase())) {
        teachersMap.set(p.teacherName.trim().toLowerCase(), {
          name: p.teacherName,
          schools: [p.schoolName],
          branch: p.branchName,
          grades: [p.grade]
        });
      } else if (p.teacherName) {
        const existing = teachersMap.get(p.teacherName.trim().toLowerCase())!;
        if (existing.schools && !existing.schools.includes(p.schoolName)) {
          existing.schools.push(p.schoolName);
        }
        if (existing.grades && !existing.grades.includes(p.grade)) {
          existing.grades.push(p.grade);
        }
      }
    });
    return Array.from(teachersMap.values());
  }, [preparations]);

  // Filtered teachers list (retrieved from data.users where jobTitle starts with or contains teacher)
  const teacherUsers = useMemo(() => {
    const listFromUsers = data.users.filter((u) => {
      const rawTitle = u.jobTitle || "";
      const jobTitles = rawTitle.split(",").map((j) => j.trim());
      const isTeacherJob =
        jobTitles.includes("معلم") ||
        jobTitles.includes("معلمة") ||
        jobTitles.includes("مربية") ||
        jobTitles.includes("مدرس") ||
        jobTitles.includes("مدرسة") ||
        jobTitles.includes("أستاذ") ||
        jobTitles.includes("أستاذة") ||
        jobTitles.includes("معلم مادة") ||
        rawTitle.includes("معلم") ||
        rawTitle.includes("معلمة") ||
        rawTitle.includes("مربية") ||
        rawTitle.includes("مدرس") ||
        rawTitle.includes("مدرسة") ||
        rawTitle.includes("أستاذ") ||
        rawTitle.includes("أستاذة");
      return isTeacherJob;
    });

    // Merge with prepTeachers to make sure we don't miss any teacher who has preparations
    const mergedList = [...listFromUsers];
    prepTeachers.forEach((pt) => {
      const exists = listFromUsers.some(
        (u) => u.name?.trim().toLowerCase() === pt.name?.trim().toLowerCase()
      );
      if (!exists) {
        mergedList.push({
          id: pt.name, // fallback id
          name: pt.name,
          schools: pt.schools || [],
          branch: pt.branch,
          grades: pt.grades || [],
          role: "user",
          code: ""
        } as any);
      }
    });

    return mergedList;
  }, [data.users, prepTeachers]);

  // Filtered teachers for dropdown (limited by shared school, branch, grade with currentUser if any)
  const availableArchiveTeachers = useMemo(() => {
    let list = teacherUsers;
    
    // Only show teachers who share school and branches with current user if NOT admin or supervisor
    if (!isSuperAdmin && !hasViewTeachersPrep && currentUser) {
      const userSchools = currentUser.schools || [];
      const userGrades = currentUser.grades || [];
      list = list.filter((u) => {
        // Shared school check
        const hasSharedSchool = userSchools.length === 0 || (u.schools || []).some((s) => userSchools.includes(s));
        // Shared grade check
        const hasSharedGrade = userGrades.length === 0 || userGrades.includes("all") || (u.grades || []).some((g) => userGrades.includes(g));

        // Under user school/branch check
        let hasSharedBranch = true;
        u.schools?.forEach((s) => {
          const authBranches = currentUser.permissions?.schoolsAndBranches?.[s] || [];
          if (authBranches.length > 0) {
            const hasBranchMatch = authBranches.includes((u as any).branch || "");
            if (!hasBranchMatch) hasSharedBranch = false;
          }
        });

        // Also, match selected school/branch if custom filtered
        return hasSharedSchool && hasSharedGrade && hasSharedBranch;
      });
    }

    // Secondary filter based on current dropdown choices
    if (archSchool !== "الكل") {
      list = list.filter((u) => u.schools?.includes(archSchool));
    }
    if (archBranch !== "الكل") {
      list = list.filter((u) => (u as any).branch === archBranch);
    }
    if (archGrade !== "الكل") {
      list = list.filter((u) => u.grades?.includes(archGrade));
    }

    return list;
  }, [teacherUsers, isSuperAdmin, hasViewTeachersPrep, currentUser, archSchool, archBranch, archGrade]);

  const availableArchiveTeachersFiltered = useMemo(() => {
    if (isSuperAdmin || hasViewTeachersPrep) {
      return availableArchiveTeachers;
    }
    // Default to only showing the current user
    return availableArchiveTeachers.filter(
      (t) => t.name?.trim().toLowerCase() === currentUser?.name?.trim().toLowerCase()
    );
  }, [availableArchiveTeachers, hasViewTeachersPrep, currentUser, isSuperAdmin]);

  const appliedArchiveTeachers = useMemo(() => {
    let list = teacherUsers;
    
    // Only show teachers who share school and branches with current user if NOT admin or supervisor
    if (!isSuperAdmin && !hasViewTeachersPrep && currentUser) {
      const userSchools = currentUser.schools || [];
      const userGrades = currentUser.grades || [];
      list = list.filter((u) => {
        // Shared school check
        const hasSharedSchool = userSchools.length === 0 || (u.schools || []).some((s) => userSchools.includes(s));
        // Shared grade check
        const hasSharedGrade = userGrades.length === 0 || userGrades.includes("all") || (u.grades || []).some((g) => userGrades.includes(g));

        // Under user school/branch check
        let hasSharedBranch = true;
        u.schools?.forEach((s) => {
          const authBranches = currentUser.permissions?.schoolsAndBranches?.[s] || [];
          if (authBranches.length > 0) {
            const hasBranchMatch = authBranches.includes((u as any).branch || "");
            if (!hasBranchMatch) hasSharedBranch = false;
          }
        });

        // Also, match selected school/branch if custom filtered
        return hasSharedSchool && hasSharedGrade && hasSharedBranch;
      });
    }

    // Secondary filter based on current applied selections
    if (appliedSchool !== "الكل") {
      list = list.filter((u) => u.schools?.includes(appliedSchool));
    }
    if (appliedBranch !== "الكل") {
      list = list.filter((u) => (u as any).branch === appliedBranch);
    }
    if (appliedGrade !== "الكل") {
      list = list.filter((u) => u.grades?.includes(appliedGrade));
    }

    if (!isSuperAdmin && !hasViewTeachersPrep) {
      // Default to only showing the current user if they don't have viewTeachersPrep
      list = list.filter(
        (t) => t.name?.trim().toLowerCase() === currentUser?.name?.trim().toLowerCase()
      );
    }

    return list;
  }, [teacherUsers, isSuperAdmin, hasViewTeachersPrep, currentUser, appliedSchool, appliedBranch, appliedGrade]);

  const availableFormTeachers = useMemo(() => {
    return currentUser ? [currentUser as any] : [];
  }, [currentUser]);

  // Dynamic lists narrow-down calculation
  const filteredArchivePreps = useMemo(() => {
    return preparations.filter((p: DailyPrep) => {
      // School
      if (appliedSchool !== "الكل" && p.schoolName !== appliedSchool) return false;
      // Branch
      if (appliedBranch !== "الكل" && p.branchName !== appliedBranch) return false;
      // Subject
      if (appliedSubject !== "الكل" && p.subject !== appliedSubject) return false;
      // Grade
      if (appliedGrade !== "الكل" && p.grade !== appliedGrade) return false;
      // Date from/to
      if (appliedDateFrom && p.date < appliedDateFrom) return false;
      if (appliedDateTo && p.date > appliedDateTo) return false;
      // Teacher name
      if (appliedTeacher !== "الكل" && p.teacherName !== appliedTeacher) return false;

      // Access restriction: restrict by viewTeachersPrep permission
      if (!isSuperAdmin && currentUser && !hasViewTeachersPrep) {
        // If they don't have viewTeachersPrep, they can ONLY see their own preparations
        if (p.teacherId !== currentUser.id && p.teacherName !== currentUser.name) return false;
      }

      return true;
    });
  }, [preparations, appliedSchool, appliedBranch, appliedSubject, appliedGrade, appliedDateFrom, appliedDateTo, appliedTeacher, isSuperAdmin, hasViewTeachersPrep, currentUser]);

  const handleApplyFilters = () => {
    setAppliedSchool(archSchool);
    setAppliedBranch(archBranch);
    setAppliedSubject(archSubject);
    setAppliedGrade(archGrade);
    setAppliedTeacher(archTeacher);
    setAppliedDateFrom(archDateFrom);
    setAppliedDateTo(archDateTo);
    toast.success(isEnglishMode ? "Filters applied!" : "تم تطبيق الفلاتر بنجاح!");
  };

  const handleResetFilters = () => {
    setArchSchool("الكل");
    setArchBranch("الكل");
    setArchSubject("الكل");
    setArchGrade("الكل");
    setArchDateFrom("");
    setArchDateTo("");
    setArchTeacher("الكل");

    setAppliedSchool("الكل");
    setAppliedBranch("الكل");
    setAppliedSubject("الكل");
    setAppliedGrade("الكل");
    setAppliedDateFrom("");
    setAppliedDateTo("");
    setAppliedTeacher("الكل");
    toast.success(isEnglishMode ? "Filters reset!" : "تم تصفير أدوات التصفية والبحث في الارشيف");
  };

  // Dedicated view preparation dialog details
  const [selectedPreviewPrep, setSelectedPreviewPrep] = useState<DailyPrep | null>(null);

  // Auto-focus logic: hide "الكل" options if there's only 1 choice and auto-assign
  useEffect(() => {
    if (!currentUser) return;
    if (!hasViewTeachersPrep) {
      if (availableSchools.length === 1 && archSchool === "الكل") {
        setArchSchool(availableSchools[0]);
        setAppliedSchool(availableSchools[0]);
      }
      const activeBranches = archiveBranchesList.filter((b) => b !== "الكل");
      if (activeBranches.length === 1 && archBranch === "الكل") {
        setArchBranch(activeBranches[0]);
        setAppliedBranch(activeBranches[0]);
      }
      if (allowedSubjects.length === 1 && archSubject === "الكل") {
        setArchSubject(allowedSubjects[0]);
        setAppliedSubject(allowedSubjects[0]);
      }
      if (allowedGrades.length === 1 && archGrade === "الكل") {
        setArchGrade(allowedGrades[0]);
        setAppliedGrade(allowedGrades[0]);
      }
      const uniqueTeachers = Array.from(new Set(availableArchiveTeachersFiltered.map((t) => t.name))).filter(Boolean);
      if (uniqueTeachers.length === 1 && archTeacher === "الكل") {
        setArchTeacher(uniqueTeachers[0]);
        setAppliedTeacher(uniqueTeachers[0]);
      }
    }
  }, [
    hasViewTeachersPrep,
    availableSchools,
    archiveBranchesList,
    allowedSubjects,
    allowedGrades,
    availableArchiveTeachersFiltered,
    currentUser
  ]);

  // Statistics range calculation
  const totalStatsDays = useMemo(() => {
    const dateFrom = appliedDateFrom || new Date().toISOString().substring(0, 10);
    const dateTo = appliedDateTo || new Date().toISOString().substring(0, 10);
    return Math.max(1, Math.floor((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }, [appliedDateFrom, appliedDateTo]);

  // Statistics Rows Calculation
  const statsRows = useMemo(() => {
    const rows: {
      index: number;
      teacherName: string;
      grade: string;
      status: "prepared" | "not_prepared" | "mixed";
      prepCount: number;
      totalDays: number;
    }[] = [];

    let idx = 1;

    appliedArchiveTeachers.forEach((t) => {
      let gradesToCheck: string[] = [];
      if (appliedGrade !== "الكل") {
        gradesToCheck = [appliedGrade];
      } else {
        const gradesSet = new Set<string>();
        if (t.grades && t.grades.length > 0) {
          t.grades.forEach(g => gradesSet.add(g));
        }
        preparations.forEach((p: DailyPrep) => {
          if (p.teacherName?.trim().toLowerCase() === t.name?.trim().toLowerCase()) {
            gradesSet.add(p.grade);
          }
        });
        gradesToCheck = Array.from(gradesSet);
        if (gradesToCheck.length === 0) {
          gradesToCheck = ["-"];
        }
      }

      gradesToCheck.forEach((g) => {
        const rowPreps = preparations.filter((p: DailyPrep) => {
          if (p.teacherName?.trim().toLowerCase() !== t.name?.trim().toLowerCase()) return false;
          if (g !== "-" && p.grade !== g) return false;
          if (appliedSchool !== "الكل" && p.schoolName !== appliedSchool) return false;
          if (appliedBranch !== "الكل" && p.branchName !== appliedBranch) return false;
          if (appliedSubject !== "الكل" && p.subject !== appliedSubject) return false;
          if (appliedDateFrom && p.date < appliedDateFrom) return false;
          if (appliedDateTo && p.date > appliedDateTo) return false;
          return true;
        });

        const prepCount = rowPreps.length;
        const preparedDates = new Set(rowPreps.map(p => p.date));
        const preparedDaysCount = preparedDates.size;

        let status: "prepared" | "not_prepared" | "mixed" = "not_prepared";
        if (preparedDaysCount === 0) {
          status = "not_prepared";
        } else if (preparedDaysCount === totalStatsDays) {
          status = "prepared";
        } else {
          status = "mixed";
        }

        rows.push({
          index: idx++,
          teacherName: t.name,
          grade: g,
          status,
          prepCount,
          totalDays: totalStatsDays
        });
      });
    });

    return rows;
  }, [appliedArchiveTeachers, preparations, appliedSchool, appliedBranch, appliedSubject, appliedGrade, appliedDateFrom, appliedDateTo, totalStatsDays]);

  const handleExportStatsExcel = () => {
    const dataRows = [
      ["تقرير إحصائيات التحضير اليومي"],
      [`المدرسة: ${appliedSchool}`, `الفرع: ${appliedBranch}`],
      [`المادة: ${appliedSubject}`, `الصف: ${appliedGrade}`],
      [`الفترة من: ${appliedDateFrom || "غير محدد"}`, `إلى: ${appliedDateTo || "غير محدد"}`],
      [],
      ["م", "اسم المعلم", "الصف", "حالة التحضير", "عدد التحضير", "عدد الأيام"]
    ];

    statsRows.forEach((r) => {
      let statusStr = "";
      if (r.status === "prepared") statusStr = "تم التحضير";
      else if (r.status === "not_prepared") statusStr = "لم يتم التحضير";
      else statusStr = "تم التحضير جزئياً (مختلط)";

      dataRows.push([
        r.index.toString(),
        r.teacherName,
        r.grade,
        statusStr,
        r.prepCount.toString(),
        r.totalDays.toString()
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(dataRows);
    ws["!cols"] = [{ wch: 6 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "إحصائيات التحضير");
    
    XLSX.writeFile(wb, `إحصائيات_التحضير_${new Date().toISOString().substring(0, 10)}.xlsx`);
    toast.success("تم تصدير إحصائيات التحضير لملف إكسل بنجاح!");
  };

  const handleExportStatsWhatsApp = () => {
    let msg = `*📊 تقرير إحصائيات التحضير اليومي التعليمي 📊*\n\n`;
    msg += `🏫 *المدرسة:* ${appliedSchool}\n`;
    msg += `🌿 *الفرع:* ${appliedBranch}\n`;
    msg += `📖 *المادة:* ${appliedSubject} | *الصف:* ${appliedGrade}\n`;
    msg += `📅 *الفترة:* من ${appliedDateFrom || "بداية الأرشيف"} إلى ${appliedDateTo || "اليوم"}\n`;
    msg += `🗓️ *عدد الأيام الإجمالي في النطاق:* ${totalStatsDays} يوم\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    statsRows.forEach((r) => {
      let statusEmoji = "❌";
      let statusStr = "لم يتم التحضير";
      if (r.status === "prepared") {
        statusEmoji = "✅";
        statusStr = "تم التحضير كاملاً";
      } else if (r.status === "mixed") {
        statusEmoji = "⚠️";
        statusStr = "تم التحضير جزئياً";
      }

      msg += `${r.index}. 👨‍🏫 *${r.teacherName}* | الصف: *${r.grade}*\n`;
      msg += `   ${statusEmoji} *الحالة:* ${statusStr}\n`;
      msg += `   📈 *العدد المنجز:* ${r.prepCount} تحضير\n`;
      msg += `   -------------------------------------\n`;
    });

    msg += `\n*تم التوليد تلقائياً بواسطة نظام المعاون التربوي الذكي* 🚀`;

    msg += `\n${getReportMessageFooter()}`;
    shareViaWhatsApp(msg);
  };

  const PreparationStatsTable = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500">
            <span>إحصائيات تفصيلية مبنية على الفلاتر المطبقة حالياً في النطاق المحدد.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportStatsExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-md flex items-center gap-1.5 transition-all animate-pulse"
            >
              <FileSpreadsheet size={15} />
              <span>تصدير إكسل</span>
            </button>
            <button
              onClick={handleExportStatsWhatsApp}
              className="bg-green-600 hover:bg-green-700 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <Share2 size={15} />
              <span>إرسال واتساب</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500">
                  <th className="px-6 py-4 w-12 text-center">م</th>
                  <th className="px-6 py-4">اسم المعلم</th>
                  <th className="px-6 py-4">الصف</th>
                  <th className="px-6 py-4">حالة التحضير</th>
                  <th className="px-6 py-4 text-center">عدد التحضير</th>
                  <th className="px-6 py-4 text-center">عدد الأيام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {statsRows.map((row) => (
                  <tr key={`${row.teacherName}-${row.grade}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-center text-slate-400">{row.index}</td>
                    <td className="px-6 py-4 font-black text-slate-900">{row.teacherName}</td>
                    <td className="px-6 py-4">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                        {row.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {row.status === "prepared" ? (
                        <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-200 flex items-center gap-1.5 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          <span>تم التحضير</span>
                        </span>
                      ) : row.status === "not_prepared" ? (
                        <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black border border-rose-200 flex items-center gap-1.5 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                          <span>لم يتم التحضير</span>
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1 w-fit bg-amber-50/55 border border-amber-200 rounded-xl p-1 px-2.5">
                          <span className="text-emerald-700 font-extrabold text-[10px]">تم التحضير</span>
                          <div className="border-t border-amber-200 my-0.5" />
                          <span className="text-rose-700 font-extrabold text-[10px]">لم يتم التحضير</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-black text-slate-900">{row.prepCount}</td>
                    <td className="px-6 py-4 text-center text-slate-500">{row.totalDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // --- NEW WORK DOCUMENT FORM STATES ---
  const [formSchool, setFormSchool] = useState<string>("");
  const [formBranch, setFormBranch] = useState<string>("");
  const [formSubject, setFormSubject] = useState<string>("");
  const [formGrade, setFormGrade] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [formTeacher, setFormTeacher] = useState<string>("");
  const [formTeacherId, setFormTeacherId] = useState<string>("");

  // Three new optional inputs
  const [formContent, setFormContent] = useState<string>("");
  const [formClosure, setFormClosure] = useState<string>("");
  const [formHomework, setFormHomework] = useState<string>("");

  // Lists inside the custom edit form
  const [formObjectives, setFormObjectives] = useState<string[]>([]);
  const [formWarmups, setFormWarmups] = useState<string[]>([]);
  const [formStrategies, setFormStrategies] = useState<string[]>([]);
  const [formAssessments, setFormAssessments] = useState<string[]>([]);

  // Constants inputs
  const [customObjectiveText, setCustomObjectiveText] = useState<string>("");
  const [customWarmupText, setCustomWarmupText] = useState<string>("");
  const [customStrategyText, setCustomStrategyText] = useState<string>("");
  const [customRoleText, setCustomRoleText] = useState<string>("");
  const [customAssessmentText, setCustomAssessmentText] = useState<string>("");

  const [formLessonTitle, setFormLessonTitle] = useState<string>("");
  const [formRoles, setFormRoles] = useState<string[]>([]);

  const [activeTabSection, setActiveTabSection] = useState<"objectives" | "warmups" | "strategies" | "roles" | "content" | "assessments" | "closure" | "homework">("objectives");

  // Language Mode toggle trigger
  const [isEnglishMode, setIsEnglishMode] = useState<boolean>(false);

  // Automatically switch English mode when Subject is English
  useEffect(() => {
    if (formSubject === "اللغة الإنجليزية") {
      setIsEnglishMode(true);
    } else {
      setIsEnglishMode(false);
    }
  }, [formSubject]);

  // Setup default values of school, branch, teacher when entering New Prep form
  const handleOpenNewPrep = () => {
    const defaultSchool = availableSchools[0] || "";
    const defaultBranches = defaultSchool ? getAllowedBranchesForSchool(defaultSchool) : [];
    const defaultBranch = defaultBranches[0] || "";
    
    setFormSchool(defaultSchool);
    setFormBranch(defaultBranch);
    setFormSubject(allowedSubjects[0] || SUBJECT_OPTIONS[0]);
    setFormGrade(allowedGrades[0] || GRADE_OPTIONS[1]);
    setFormDate(new Date().toISOString().substring(0, 10));

    // Default teacher identity is current user if they are a teacher
    const isTeacher =
      currentUser?.jobTitle?.includes("معلم") ||
      currentUser?.jobTitle?.includes("مربية") ||
      currentUser?.jobTitle?.includes("معلم مادة");

    if (currentUser && isTeacher) {
      setFormTeacher(currentUser.name || "");
      setFormTeacherId(currentUser.id || "");
    } else {
      // Take first matching teacher or current user (e.g. for super admin or non-teacher supervisor)
      const t = availableFormTeachers[0];
      setFormTeacher(t?.name || currentUser?.name || "");
      setFormTeacherId(t?.id || currentUser?.id || "");
    }

    // Reset components list
    setFormObjectives([]);
    setFormWarmups([]);
    setFormStrategies([]);
    setFormAssessments([]);
    setCustomObjectiveText("");
    setCustomWarmupText("");
    setCustomStrategyText("");
    setCustomAssessmentText("");

    // Reset new fields
    setFormContent("");
    setFormClosure("");
    setFormHomework("");
    setFormLessonTitle("");
    setFormRoles([]);
    setCustomRoleText("");

    setViewMode("new_prep");
  };

  // Delete preparation
  const handleDeletePrep = async (prepId: string) => {
    if (!window.confirm(isEnglishMode ? "Are you sure you want to delete this preparation?" : "هل أنت متأكد من رغبتك في حذف هذا التحضير نهائياً؟")) {
      return;
    }
    const updated = preparations.filter((p: DailyPrep) => p.id !== prepId);
    try {
      await updateData({ dailyPreparations: updated } as any);
      toast.success(isEnglishMode ? "Preparation deleted successfully!" : "تم حذف التحضير بنجاح!");
      if (selectedPreviewPrep?.id === prepId) {
        setSelectedPreviewPrep(null);
      }
    } catch {
      toast.error(isEnglishMode ? "Error saving changes to server" : "حدث خطأ أثناء حفظ التعديلات");
    }
  };

  // Submit and save preparation
  const handleSavePreparation = async () => {
    if (!formSchool || !formBranch || !formSubject || !formGrade || !formTeacher) {
      toast.error(isEnglishMode ? "Please fill all general information" : "يرجى ملئ كافة البيانات العامة أولاً");
      return;
    }

    if (
      formObjectives.length === 0 &&
      formWarmups.length === 0 &&
      formStrategies.length === 0 &&
      formAssessments.length === 0 &&
      !formContent.trim() &&
      !formClosure.trim() &&
      !formHomework.trim()
    ) {
      toast.error(isEnglishMode ? "Please plan at least one class objective or component" : "يرجى تخطيط هدف سلوكي أو مكون واحد على الأقل في التدريس");
      return;
    }

    const newPrepItem: DailyPrep = {
      id: "prep_" + Date.now(),
      schoolName: formSchool,
      branchName: formBranch,
      subject: formSubject,
      grade: formGrade,
      lessonTitle: formLessonTitle,
      date: formDate,
      teacherName: formTeacher,
      teacherId: formTeacherId || currentUser?.id || "guest",
      objectives: formObjectives,
      warmups: formWarmups,
      strategies: formStrategies,
      roles: formRoles,
      assessments: formAssessments,
      content: formContent,
      closure: formClosure,
      homework: formHomework,
      isEnglishMode,
      supervisionStatus: "pending"
    };

    const existingPreps = (data as any).dailyPreparations || [];
    const updatedPreps = [newPrepItem, ...existingPreps];

    try {
      await updateData({ dailyPreparations: updatedPreps } as any);
      toast.success(isEnglishMode ? "Preparation saved and synchronized successfully!" : "تم حفظ وتزامن التحضير اليومي بنجاح!");
      setViewMode("menu");
    } catch {
      toast.error(isEnglishMode ? "Error synchronizing with server" : "حدث خطأ أثناء مزامنة البيانات السحابية");
    }
  };

  // Excel exporter
  const handleExportPrepExcel = (prep: DailyPrep) => {
    const wb = XLSX.utils.book_new();
    
    // Row configurations of preparation details
    const dataRows = [
      ["وثيقة التحضير التربوي الرقمي الذكي"],
      [`المدرسة: ${prep.schoolName}`, `الفرع: ${prep.branchName}`],
      [`المادة: ${prep.subject}`, `الصف: ${prep.grade}`],
      [`عنوان الدرس: ${prep.lessonTitle || "بدون عنوان"}`, `التاريخ: ${prep.date}`],
      [`المعلم: ${prep.teacherName}`],
      [],
      ["1. الأهداف السلوكية (Behavioral Objectives)"],
      ...prep.objectives.map((o, idx) => [`  * (${idx + 1}) - ${o}`]),
      [],
      ["2. التمهيد وإثارة الدافعية (Warm-up)"],
      ...prep.warmups.map((w, idx) => [`  * (${idx + 1}) - ${w}`]),
      [],
      ["3. استراتيجيات التدريس (Teaching Strategies)"],
      ...prep.strategies.map((s, idx) => [`  * (${idx + 1}) - ${s}`]),
      [],
      ["4. دور المعلم ودور المتعلم (Teacher/Learner Roles)"],
      ...(prep.roles || []).map((r, idx) => [`  * (${idx + 1}) - ${r}`]),
      [],
      ["5. المحتوى (Content)"],
      [prep.content || ""],
      [],
      ["6. التقويم والتقييم (Assessment)"],
      ...prep.assessments.map((a, idx) => [`  * (${idx + 1}) - ${a}`]),
      [],
      ["7. الغلق (Closure)"],
      [prep.closure || ""],
      [],
      ["8. الواجب (Homework)"],
      [prep.homework || ""],
      [],
      ["حالة الاعتماد التوجيهي:"],
      [`الوضع: ${prep.supervisionStatus === "Approved" ? "معتمد ومقفل" : "قيد المراجعة"}`],
      [`تقييم الأهداف السلوكية: ${prep.scoreObjectives || "-"}`],
      [`تقييم التمهيد: ${prep.scoreWarmups || "-"}`],
      [`تقييم استراتيجيات التدريس: ${prep.scoreStrategies || "-"}`],
      [`تقييم دور المعلم والمتعلم: ${prep.scoreRoles || "-"}`],
      [`تقييم التقويم والتقييم: ${prep.scoreAssessments || "-"}`],
      [`ملاحظات الموجه: ${prep.supervisorNotes || "لا يوجد"}`]
    ];

    const ws = XLSX.utils.aoa_to_sheet(dataRows);

    // Apply basic styles
    ws["!cols"] = [{ wch: 45 }, { wch: 30 }];
    
    XLSX.utils.book_append_sheet(wb, ws, "التحضير اليومي");
    XLSX.writeFile(wb, `تحضير_${prep.teacherName}_${prep.subject}_${prep.date}.xlsx`);
    toast.success("تم تصدير ملف الاكسل بنجاح!");
  };

  // WhatsApp Exporter containing professional emojis
  const handleExportWhatsApp = (prep: DailyPrep) => {
    let msg = `*📚 وثيقة التحضير التربوي الرقمي الذكي 📚*\n\n`;
    msg += `🏫 *المدرسة:* ${prep.schoolName}\n`;
    msg += `🌿 *الفرع:* ${prep.branchName}\n`;
    msg += `📖 *المادة:* ${prep.subject} | *الصف:* ${prep.grade}\n`;
    if (prep.lessonTitle) {
      msg += `✏️ *عنوان الدرس:* ${prep.lessonTitle}\n`;
    }
    msg += `📆 *التاريخ:* ${prep.date}\n`;
    msg += `👨‍🏫 *المعلم:* ${prep.teacherName}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    msg += `*🎯 1. الأهداف السلوكية (Objectives):*\n`;
    if (prep.objectives.length > 0) {
      prep.objectives.forEach((o, i) => {
        msg += `${i + 1}. ${o}\n`;
      });
    } else {
      msg += `_(لم تحدد)_\n`;
    }
    msg += `\n`;

    msg += `*🔥 2. التمهيد وإثارة الدافعية (Warm-up):*\n`;
    if (prep.warmups.length > 0) {
      prep.warmups.forEach((w, i) => {
        msg += `🔹 ${w}\n`;
      });
    } else {
      msg += `_(لم يحدد)_\n`;
    }
    msg += `\n`;

    msg += `*💡 3. استراتيجيات التدريس (Strategies):*\n`;
    if (prep.strategies.length > 0) {
      prep.strategies.forEach((s, i) => {
        msg += `⚙️ ${s}\n`;
      });
    } else {
      msg += `_(لم تحدد)_\n`;
    }
    msg += `\n`;

    msg += `*👥 4. دور المعلم ودور المتعلم (Teacher & Learner Roles):*\n`;
    if (prep.roles && prep.roles.length > 0) {
      prep.roles.forEach((r, i) => {
        msg += `🔸 ${r}\n`;
      });
    } else {
      msg += `_(لم تحدد)_\n`;
    }
    msg += `\n`;

    // Content
    msg += `*📖 5. المحتوى (Content):*\n`;
    msg += `${prep.content || "_(لم يحدد)_"}\n\n`;

    msg += `*📝 6. التقويم (Assessment):*\n`;
    if (prep.assessments.length > 0) {
      prep.assessments.forEach((a, i) => {
        msg += `✔️ ${a}\n`;
      });
    } else {
      msg += `_(لم يحدد)_\n`;
    }
    msg += `\n`;

    // Closure
    msg += `*🚪 7. الغلق (Closure):*\n`;
    msg += `${prep.closure || "_(لم يحدد)_"}\n\n`;

    // Homework
    msg += `*🏠 8. الواجب (Homework):*\n`;
    msg += `${prep.homework || "_(لم يحدد)_"}\n\n`;

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📋 *حالة التقييم التوجيهي:* ${prep.supervisionStatus === "Approved" ? "✅ معتمد ومقفل" : "⏳ قيد الانتظار"}\n`;
    if (prep.supervisionStatus === "Approved") {
      msg += `📊 تقييم البنود: أهداف (${prep.scoreObjectives || "-"}), تمهيد (${prep.scoreWarmups || "-"}), استراتيجيات (${prep.scoreStrategies || "-"}), دور المعلم والمتعلم (${prep.scoreRoles || "-"}), تقويم (${prep.scoreAssessments || "-"})\n`;
    }
    if (prep.supervisorNotes) {
      msg += `💬 *ملاحظات التوجيه المرفقة:* ${prep.supervisorNotes}\n`;
    }

    msg += `\n${getReportMessageFooter(prep.date)}`;
    shareViaWhatsApp(msg);
  };

  // --- SUPERVISOR GRADING FUNCTIONS ---
  const [supScoreObj, setSupScoreObj] = useState<number>(4);
  const [supScoreWarm, setSupScoreWarm] = useState<number>(4);
  const [supScoreStrat, setSupScoreStrat] = useState<number>(4);
  const [supScoreRoles, setSupScoreRoles] = useState<number>(4);
  const [supScoreAssess, setSupScoreAssess] = useState<number>(4);
  const [supNotes, setSupNotes] = useState<string>("");

  // Populate supervisor controls if prep selected the archive preview
  useEffect(() => {
    if (selectedPreviewPrep) {
      setSupScoreObj(selectedPreviewPrep.scoreObjectives || 4);
      setSupScoreWarm(selectedPreviewPrep.scoreWarmups || 4);
      setSupScoreStrat(selectedPreviewPrep.scoreStrategies || 4);
      setSupScoreRoles(selectedPreviewPrep.scoreRoles || 4);
      setSupScoreAssess(selectedPreviewPrep.scoreAssessments || 4);
      setSupNotes(selectedPreviewPrep.supervisorNotes || "");
    }
  }, [selectedPreviewPrep]);

  const saveSupervisorEdits = async (
    obj: number,
    warm: number,
    strat: number,
    roles: number,
    assess: number,
    notes: string,
    approved: boolean = false
  ) => {
    if (!selectedPreviewPrep) return;

    const updatedPrep = {
      ...selectedPreviewPrep,
      scoreObjectives: obj,
      scoreWarmups: warm,
      scoreStrategies: strat,
      scoreRoles: roles,
      scoreAssessments: assess,
      supervisorNotes: notes,
      ...(approved ? {
        supervisionStatus: "Approved" as const,
        approvedBy: currentUser?.name || "الموجه التربوي",
        approvedAt: new Date().toISOString().substring(0, 10)
      } : {})
    };

    setSelectedPreviewPrep(updatedPrep);

    const updatedList = preparations.map((p: DailyPrep) => {
      if (p.id === selectedPreviewPrep.id) {
        return updatedPrep;
      }
      return p;
    });

    try {
      await updateData({ dailyPreparations: updatedList } as any);
    } catch (e) {
      console.error("Failed to auto-save supervisor edits", e);
    }
  };

  const handleApplyGeneralScore = (score: number) => {
    setSupScoreObj(score);
    setSupScoreWarm(score);
    setSupScoreStrat(score);
    setSupScoreRoles(score);
    setSupScoreAssess(score);
    toast.success("تم منح التقييم العام لكافة البنود بنجاح!");
    saveSupervisorEdits(score, score, score, score, score, supNotes);
  };

  const handleApprovePrep = async () => {
    if (!selectedPreviewPrep) return;
    await saveSupervisorEdits(supScoreObj, supScoreWarm, supScoreStrat, supScoreRoles, supScoreAssess, supNotes, true);
    toast.success("تم اعتماد وتوقيع وثيقة التحضير، وتأمينها ضد التعديل!");
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-arabic pb-16">
      
      {/* Title Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (viewMode === "menu") {
                  onBack();
                } else {
                  setViewMode("menu");
                }
              }}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
            >
              <ArrowRight size={22} />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <BookMarked size={22} className="text-indigo-600" />
                <span>التحضير اليومي التعليمي الرقمي</span>
              </h1>
              <p className="text-xs font-bold text-slate-400 mt-0.5">
                تخطيط الدروس اليومي بمواصفات وزارة التربية بأمانة العاصمة
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="bg-indigo-50 text-indigo-700 text-xs font-extrabold px-3 py-1.5 rounded-full border border-indigo-100">
              {currentUser?.name}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        
        {/* VIEW 1: MAIN MENU */}
        {viewMode === "menu" && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Ambient visual welcome card */}
            <div className="bg-gradient-to-tr from-indigo-700 via-indigo-600 to-blue-600 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
              <div className="relative z-10 max-w-2xl">
                <span className="bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-black tracking-widest uppercase rounded-full border border-white/20 mb-4 inline-block">
                  الإصدار الثاني المطور
                </span>
                <h2 className="text-4xl font-black leading-tight">
                  نظام التحضير التربوي الرقمي الذكي
                </h2>
                <p className="mt-4 text-white/90 font-bold leading-relaxed text-sm">
                  تنظيم وتخطيط الدروس اليومية والمهارات الدراسية تلاوة وتفسيراً وعلوماً ولغة إنجليزية مع واجهة مشرف توجيهية مرنة.
                </p>
              </div>
            </div>

            {/* Core Interaction selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              
              {/* Box 1: New prep */}
              {hasNewPrep && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -4 }}
                  onClick={handleOpenNewPrep}
                  className="bg-white border-2 border-indigo-100 shadow-lg p-8 rounded-[2rem] hover:border-indigo-500 transition-all flex flex-col items-start text-right relative overflow-hidden group"
                >
                  <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Plus size={36} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mt-6">
                    تحضير يومي جديد
                  </h3>
                  <p className="text-slate-500 font-bold text-sm mt-3">
                    تخطيط مفردات الدرس اليومي، صياغة الأهداف السلوكية، استخدام استراتيجيات التعلم التشاركي، والتقييم والتقويم الفوري.
                  </p>
                  <div className="absolute bottom-6 left-6 text-indigo-400 group-hover:text-indigo-600 transition-colors">
                    <ArrowRight size={24} className="rotate-180" />
                  </div>
                </motion.button>
              )}

              {/* Box 2: Preparation archive */}
              {hasArchivePrep && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -4 }}
                  onClick={() => setViewMode("archive")}
                  className="bg-white border-2 border-slate-200/60 shadow-lg p-8 rounded-[2rem] hover:border-blue-500 transition-all flex flex-col items-start text-right relative overflow-hidden group"
                >
                  <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Clock size={36} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mt-6">
                    ارشيف التحضير اليومي
                  </h3>
                  <p className="text-slate-500 font-bold text-sm mt-3">
                    تصفح وتحليل كافة خطط التحضير السابقة والبحث بمختلف الواجهات، المادة، الصف، اسم المعلم، وحالات التقييم التوجيهي.
                  </p>
                  <div className="absolute bottom-6 left-6 text-blue-400 group-hover:text-blue-600 transition-colors">
                    <ArrowRight size={24} className="rotate-180" />
                  </div>
                </motion.button>
              )}

            </div>
          </div>
        )}

        {/* VIEW 2: ARCHIVE ARCHIVE SCREEN */}
        {viewMode === "archive" && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Section description */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Clock size={24} className="text-blue-500" />
                  <span>ارشيف التحضير اليومي التعليمي</span>
                </h2>
                <p className="text-slate-400 font-bold text-xs mt-1">
                  تصفح فوري والبحث بمرشحات المادة، المدرسة، المعلمين الفعليين، ومعاينة تقارير المشرف
                </p>
              </div>

              <button
                onClick={() => setViewMode("menu")}
                className="bg-slate-100 hover:bg-slate-200 font-extrabold text-xs text-slate-600 px-4 py-2 rounded-xl"
              >
                العودة للقائمة الرئيسية
              </button>
            </div>

            {/* Filter Control Box */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              
              <div className="flex items-center gap-2 text-blue-600 font-black text-sm pb-2 border-b border-slate-100">
                <Filter size={18} />
                <span>محركات البحث وتقليص النتائج (مستمر ومتزامن):</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                
                {/* 1. School select based on perm */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">اسم المدرسة:</label>
                  <select
                    value={archSchool}
                    onChange={(e) => {
                      setArchSchool(e.target.value);
                      setArchBranch("الكل");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-blue-500 focus:bg-white outline-none"
                  >
                    {(!hasViewTeachersPrep && availableSchools.length === 1) ? null : (
                      <option value="الكل">جميع المدارس المرخصة</option>
                    )}
                    {availableSchools.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Branch select based on school selection */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">الفرع:</label>
                  <select
                    value={archBranch}
                    onChange={(e) => setArchBranch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-blue-500 focus:bg-white outline-none"
                  >
                    {archiveBranchesList.map((b) => {
                      if (b === "الكل" && !hasViewTeachersPrep && archiveBranchesList.filter(x => x !== "الكل").length === 1) {
                        return null;
                      }
                      return (
                        <option key={b} value={b}>
                          {b === "الكل" ? "جميع الفروع والاقسام" : b}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 3. Subject option */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">المادة الدراسيّة:</label>
                  <select
                    value={archSubject}
                    onChange={(e) => setArchSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-blue-500 focus:bg-white outline-none"
                  >
                    {(!hasViewTeachersPrep && allowedSubjects.length === 1) ? null : (
                      <option value="الكل">جميع المواد الدراسية</option>
                    )}
                    {allowedSubjects.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Grade option */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">الصف:</label>
                  <select
                    value={archGrade}
                    onChange={(e) => setArchGrade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-blue-500 focus:bg-white outline-none"
                  >
                    {(!hasViewTeachersPrep && allowedGrades.length === 1) ? null : (
                      <option value="الكل">جميع الصفوف والمستويات</option>
                    )}
                    {allowedGrades.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Teacher filter */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">اسم المعلم:</label>
                  <select
                    value={archTeacher}
                    onChange={(e) => setArchTeacher(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-blue-500 focus:bg-white outline-none"
                  >
                    {(!hasViewTeachersPrep && Array.from(new Set(availableArchiveTeachersFiltered.map((t) => t.name))).length === 1) ? null : (
                      <option value="الكل">جميع المعلمين ومعلمي المواد</option>
                    )}
                    {/* Unique names extracted from available archive teachers */}
                    {Array.from(new Set(availableArchiveTeachersFiltered.map((t) => t.name))).map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* 6. Date Range: from */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">التاريخ (من):</label>
                  <input
                    type="date"
                    value={archDateFrom}
                    onChange={(e) => setArchDateFrom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-blue-500 focus:bg-white outline-none"
                  />
                </div>

                {/* 7. Date Range: to */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">التاريخ (إلى):</label>
                  <input
                    type="date"
                    value={archDateTo}
                    onChange={(e) => setArchDateTo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-blue-500 focus:bg-white outline-none"
                  />
                </div>

                {/* Apply and reset action buttons */}
                <div className="flex items-end gap-2">
                  <button
                    onClick={handleApplyFilters}
                    className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2 px-3 rounded-xl transition-all shadow-sm"
                  >
                    موافق
                  </button>
                  <button
                    onClick={handleResetFilters}
                    className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-2 px-3 rounded-xl transition-all"
                  >
                    تصفير التصفية
                  </button>
                </div>

              </div>
            </div>

            {/* Preparation display list on beautiful colored rectangles/cards */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="text-sm font-black text-slate-605">
                  {isEnglishMode 
                    ? `Filtered preparations list (${filteredArchivePreps.length} document(s)):`
                    : `قائمة وثائق التحضير المنقاة والمقلصة (${filteredArchivePreps.length} وثيقة):`}
                </div>
                <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setArchiveViewStyle("cards")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                      archiveViewStyle === "cards"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    {isEnglishMode ? "🎴 Cards" : "🎴 بطاقات"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchiveViewStyle("table")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                      archiveViewStyle === "table"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    {isEnglishMode ? "📊 Table" : "📊 جدول"}
                  </button>
                  {hasPrepStats && (
                    <button
                      type="button"
                      onClick={() => setArchiveViewStyle("stats")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                        archiveViewStyle === "stats"
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-800"
                      }`}
                    >
                      {isEnglishMode ? "📊 Statistics" : "📊 الإحصائيات"}
                    </button>
                  )}
                </div>
              </div>

              {archiveViewStyle === "stats" ? (
                <PreparationStatsTable />
              ) : filteredArchivePreps.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold text-sm shadow-sm">
                  {isEnglishMode 
                    ? "No matching preparation plans found in archive."
                    : "لا يوجد خطط تحضير مطابقة للمواصفات الحالية في الارشيف، انقر على 'تحضير يومي جديد' لرفع خطة أولى."}
                </div>
              ) : archiveViewStyle === "table" ? (
                <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500">
                          <th className="px-6 py-4">{isEnglishMode ? "Teacher" : "المعلم"}</th>
                          <th className="px-6 py-4">{isEnglishMode ? "Subject" : "المادة"}</th>
                          <th className="px-6 py-4">{isEnglishMode ? "Grade" : "الصف"}</th>
                          <th className="px-6 py-4">{isEnglishMode ? "School" : "المدرسة"}</th>
                          <th className="px-6 py-4">{isEnglishMode ? "Branch" : "الفرع"}</th>
                          <th className="px-6 py-4">{isEnglishMode ? "Date" : "التاريخ"}</th>
                          <th className="px-6 py-4">{isEnglishMode ? "Status" : "الحالة"}</th>
                          <th className="px-6 py-4">{isEnglishMode ? "Supervisor Notes" : "ملاحظات الموجه"}</th>
                          <th className="px-6 py-4 text-center">{isEnglishMode ? "Actions" : "الإجراءات"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                        {filteredArchivePreps.map((prep: DailyPrep) => (
                          <tr key={prep.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-black text-slate-900">{prep.teacherName}</td>
                            <td className="px-6 py-4">
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                                {prep.subject}
                              </span>
                            </td>
                            <td className="px-6 py-4">{prep.grade}</td>
                            <td className="px-6 py-4">{prep.schoolName}</td>
                            <td className="px-6 py-4">{prep.branchName}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{prep.date}</td>
                            <td className="px-6 py-4">
                              {prep.supervisionStatus === "Approved" ? (
                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-black border border-emerald-200 flex items-center gap-1 w-fit">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                  {isEnglishMode ? "Approved" : "معتمد"}
                                </span>
                              ) : (
                                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-black border border-amber-200 flex items-center gap-1 w-fit">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                                  {isEnglishMode ? "Pending" : "قيد الانتظار"}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 max-w-[200px] truncate" title={prep.supervisorNotes || ""}>
                              {prep.supervisorNotes || "-"}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setSelectedPreviewPrep(prep)}
                                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-extrabold px-3 py-1.5 rounded-lg transition-all"
                                >
                                  {isEnglishMode ? "View Prep" : "عرض التحضير"}
                                </button>
                                <button
                                  onClick={() => handleDeletePrep(prep.id)}
                                  className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-all"
                                  title={isEnglishMode ? "Delete" : "حذف"}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredArchivePreps.map((prep: DailyPrep, index: number) => {
                    const colorSchemeClass = COLORS[index % COLORS.length];
                    const countObjectives = prep.objectives.length;
                    
                    return (
                      <motion.div
                        key={prep.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className={`bg-gradient-to-br ${colorSchemeClass} border-2 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden`}
                      >
                        <div>
                          {/* Top Tag and Approval Badge */}
                          <div className="flex items-center justify-between gap-2 mb-4">
                            <span className="bg-white/70 px-2.5 py-1 text-[10px] font-black uppercase rounded-full tracking-wider">
                              📚 {prep.subject}
                            </span>

                            {prep.supervisionStatus === "Approved" ? (
                              <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                <CheckCircle size={10} />
                                <span>معتمد</span>
                              </span>
                            ) : (
                              <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                <Clock size={10} />
                                <span>قيد الانتظار</span>
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-black leading-tight text-slate-900 truncate">
                            {prep.teacherName}
                          </h3>

                          {/* Detail components list */}
                          <div className="space-y-2 mt-4 text-xs font-bold text-slate-600">
                            <div className="flex items-center gap-2">
                              <Calendar size={13} className="opacity-70" />
                              <span>التاريخ: {prep.date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Layers size={13} className="opacity-70" />
                              <span>الصف: {prep.grade}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Settings size={13} className="opacity-70" />
                              <span>الفرع: {prep.branchName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BookOpen size={13} className="opacity-70" />
                              <span>عدد الأهداف والمكونات: {countObjectives} هدف مصاغ</span>
                            </div>
                            {prep.supervisorNotes && (
                              <div className="mt-2 pt-2 border-t border-slate-900/5 text-emerald-800 font-bold">
                                <span className="block text-[10px] text-slate-405">ملاحظات الموجه:</span>
                                <p className="line-clamp-2 leading-relaxed text-[11px] mt-0.5">
                                  {prep.supervisorNotes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card bottom button action */}
                        <div className="pt-6 border-t border-slate-900/5 mt-4 flex items-center justify-between gap-2">
                          <button
                            onClick={() => setSelectedPreviewPrep(prep)}
                            className="bg-white hover:bg-slate-50 border border-slate-300 font-black text-xs text-slate-800 px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all flex-1 text-center"
                          >
                            عرض التحضير
                          </button>
                          <button
                            onClick={() => handleDeletePrep(prep.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 p-2.5 rounded-xl border border-red-100 transition-colors"
                            title={isEnglishMode ? "Delete" : "حذف"}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: NEW PREP FORM */}
        {viewMode === "new_prep" && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Header info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Plus size={24} className="text-indigo-650" />
                  <span>تخطيط وصياغة تحضير مدرسي جديد</span>
                </h2>
                <p className="text-slate-400 font-bold text-xs mt-1">
                  قم بملء البيانات ثم أضف البنود المناسبة من القوائم السريعة (تتضمن 20 خياراً لكل حقل)
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Language Manual Translation override button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsEnglishMode(!isEnglishMode);
                    toast.info(
                      !isEnglishMode
                        ? "English UI Mode activated manually"
                        : "تم تفعيل الواجهة العربية يدوياً"
                    );
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl"
                >
                  English Mode: {isEnglishMode ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => setViewMode("menu")}
                  className="bg-slate-100 hover:bg-slate-200 font-extrabold text-xs text-slate-600 px-4 py-2 rounded-xl"
                >
                  {isEnglishMode ? "Cancel" : "إلغاء وتراجع"}
                </button>
              </div>
            </div>

            {/* General form data card */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-6">
              <div className="text-base font-black text-indigo-700 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Sparkles size={18} />
                <span>{isEnglishMode ? "1. General Information" : "1. البيانات الأساسية للدرس:"}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* School Name select list */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">
                    {isEnglishMode ? "School name *" : "اسم المدرسة *:"}
                  </label>
                  <select
                    value={formSchool}
                    onChange={(e) => {
                      setFormSchool(e.target.value);
                      const bList = getAllowedBranchesForSchool(e.target.value);
                      setFormBranch(bList[0] || "");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none"
                  >
                    <option value="">{isEnglishMode ? "-- Select School --" : "-- اختر المدرسة المستهدفة --"}</option>
                    {availableSchools.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Branch Name select list dropdown */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">
                    {isEnglishMode ? "School Branch *" : "الفرع والقسم *:"}
                  </label>
                  <select
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none"
                  >
                    <option value="">{isEnglishMode ? "-- Select Branch --" : "-- حدد الفرع --"}</option>
                    {formSchool && getAllowedBranchesForSchool(formSchool).map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Subject selection */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">
                    {isEnglishMode ? "School Subject *" : "المادة الدراسيّة *:"}
                  </label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none"
                  >
                    {allowedSubjects.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                {/* Grade list dropdown selections */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">
                    {isEnglishMode ? "Grade / Level *" : "الصف الدراسي *:"}
                  </label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none"
                  >
                    {allowedGrades.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Lesson Title input */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">
                    {isEnglishMode ? "Lesson Title *" : "عنوان الدرس *:"}
                  </label>
                  <input
                    type="text"
                    value={formLessonTitle}
                    onChange={(e) => setFormLessonTitle(e.target.value)}
                    placeholder={isEnglishMode ? "Enter lesson title" : "اكتب عنوان الدرس هنا..."}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none"
                  />
                </div>

                {/* Date specification */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">
                    {isEnglishMode ? "Date *" : "تاريخ التحضير *:"}
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none"
                  />
                </div>

                {/* Teacher select list or static username if purely logged in teacher */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">
                    {isEnglishMode ? "Teacher name *" : "اسم المعلم المنفذ *:"}
                  </label>
                  <select
                    value={formTeacher}
                    onChange={(e) => {
                      const targetUserObj = data.users.find((u) => u.name === e.target.value);
                      setFormTeacher(e.target.value);
                      setFormTeacherId(targetUserObj?.id || "");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none"
                  >
                    {!formTeacher && <option value="">-- اختر من الكادر التعليمي --</option>}
                    {availableFormTeachers.map((tu) => (
                      <option key={tu.id} value={tu.name}>{tu.name}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* Smart Option selections interface layout */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-6">
              
              <div className="text-base font-black text-indigo-700 flex items-center gap-2 pb-3 border-b border-slate-100">
                <BookOpen size={18} />
                <span>
                  {isEnglishMode 
                    ? "2. Digital Educational Lesson Preparation Elements (Offline-First lists):"
                    : "2. صياغة وتوليد عناصر جودة التحضير والتخطيط الفعلي:"}
                </span>
              </div>

              {/* Element Navigation Selector tabs */}
              <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTabSection("objectives")}
                  className={`py-3 px-4 font-black text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors ${
                    activeTabSection === "objectives"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {isEnglishMode ? "🎯 1. Behavioral Objectives" : "🎯 1. الأهداف السلوكية"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabSection("warmups")}
                  className={`py-3 px-4 font-black text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors ${
                    activeTabSection === "warmups"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {isEnglishMode ? "🔥 2. Warm-up" : "🔥 2. التمهيد وإثارة الدافعية"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabSection("strategies")}
                  className={`py-3 px-4 font-black text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors ${
                    activeTabSection === "strategies"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {isEnglishMode ? "💡 3. Teaching Strategies" : "💡 3. استراتيجيات التدريس"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabSection("roles")}
                  className={`py-3 px-4 font-black text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors ${
                    activeTabSection === "roles"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {isEnglishMode ? "👥 4. Teacher & Learner Roles" : "👥 4. دور المعلم ودور المتعلم"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabSection("content")}
                  className={`py-3 px-4 font-black text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors ${
                    activeTabSection === "content"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {isEnglishMode ? "📖 5. Content" : "📖 5. المحتوى"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabSection("assessments")}
                  className={`py-3 px-4 font-black text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors ${
                    activeTabSection === "assessments"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {isEnglishMode ? "📝 6. Assessment" : "📝 6. التقويم والتقييم"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabSection("closure")}
                  className={`py-3 px-4 font-black text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors ${
                    activeTabSection === "closure"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {isEnglishMode ? "🚪 7. Closure" : "🚪 7. الغلق"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabSection("homework")}
                  className={`py-3 px-4 font-black text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors ${
                    activeTabSection === "homework"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {isEnglishMode ? "🏠 8. Homework" : "🏠 8. الواجب"}
                </button>
              </div>

              {/* Dynamic container showing cached items or single textarea */}
              {activeTabSection === "content" || activeTabSection === "closure" || activeTabSection === "homework" ? (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/50 space-y-4 text-right">
                  <label className="block text-sm font-black text-slate-700">
                    {activeTabSection === "content" && (isEnglishMode ? "Lesson Content (Type or paste text):" : "محتوى الدرس (اكتب أو الصق أي نص):")}
                    {activeTabSection === "closure" && (isEnglishMode ? "Lesson Closure (Type or paste text):" : "غلق الدرس (اكتب أو الصق أي نص):")}
                    {activeTabSection === "homework" && (isEnglishMode ? "Homework (Type or paste text):" : "الواجب المنزلي (اكتب أو الصق أي نص):")}
                  </label>
                  <textarea
                    rows={8}
                    value={
                      activeTabSection === "content"
                        ? formContent
                        : activeTabSection === "closure"
                        ? formClosure
                        : formHomework
                    }
                    onChange={(e) => {
                      if (activeTabSection === "content") setFormContent(e.target.value);
                      else if (activeTabSection === "closure") setFormClosure(e.target.value);
                      else setFormHomework(e.target.value);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-bold focus:border-indigo-500 outline-none"
                    placeholder={
                      isEnglishMode
                        ? "Type or paste the contents here..."
                        : "اكتب أو الصق المحتوى هنا..."
                    }
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                  
                  {/* COLUMN 1: Rapid 20 Option additions list */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/50 space-y-4">
                    <div className="text-xs font-black text-slate-500 uppercase flex items-center justify-between">
                      <span>
                        {isEnglishMode ? "Quick Choose (20 Professional options)" : "بنود خيارات الإنجاز التربوي (20 بنداً احترافياً)"}
                      </span>
                      <span className="bg-indigo-100 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                        Offline-First list
                      </span>
                    </div>

                    <div className="max-h-72 overflow-y-auto pr-1 space-y-2.5">
                      {/* Render corresponding items */}
                      {activeTabSection === "objectives" &&
                        (isEnglishMode ? CONSTANTS_EN.objectives : CONSTANTS_AR.objectives).map((opt, id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              if (!formObjectives.includes(opt)) {
                                setFormObjectives([...formObjectives, opt]);
                                toast.success(isEnglishMode ? "Added to Objectives" : "تمت الإضافة لقائمة الأهداف");
                              } else {
                                toast.error(isEnglishMode ? "Objective already added" : "مضاف مسبقاً");
                              }
                            }}
                            className="w-full text-right text-xs font-bold leading-relaxed p-2.5 bg-white hover:bg-indigo-50 border border-slate-200/80 rounded-xl text-slate-700 transition-all flex items-start gap-2.5"
                          >
                            <span className="text-indigo-400 font-black shrink-0">{id + 1}.</span>
                            <span className="text-slate-700 text-right">{opt}</span>
                          </button>
                        ))}

                      {activeTabSection === "warmups" &&
                        (isEnglishMode ? CONSTANTS_EN.warmup : CONSTANTS_AR.warmup).map((opt, id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              if (!formWarmups.includes(opt)) {
                                setFormWarmups([...formWarmups, opt]);
                                toast.success(isEnglishMode ? "Added to Warm-ups" : "تمت الإضافة للتمهيد والدافعية");
                              } else {
                                toast.error(isEnglishMode ? "Warm-up already added" : "مضاف مسبقاً");
                              }
                            }}
                            className="w-full text-right text-xs font-bold leading-relaxed p-2.5 bg-white hover:bg-indigo-50 border border-slate-200/80 rounded-xl text-slate-700 transition-all flex items-start gap-2.5"
                          >
                            <span className="text-indigo-400 font-black shrink-0">{id + 1}.</span>
                            <span className="text-slate-700 text-right">{opt}</span>
                          </button>
                        ))}

                      {activeTabSection === "strategies" &&
                        (isEnglishMode ? CONSTANTS_EN.strategies : CONSTANTS_AR.strategies).map((opt, id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              if (!formStrategies.includes(opt)) {
                                setFormStrategies([...formStrategies, opt]);
                                toast.success(isEnglishMode ? "Added to Strategies" : "تمت الإضافة لاستراتيجيات التدريس");
                              } else {
                                toast.error(isEnglishMode ? "Strategy already added" : "مضاف مسبقاً");
                              }
                            }}
                            className="w-full text-right text-xs font-bold leading-relaxed p-2.5 bg-white hover:bg-indigo-50 border border-slate-200/80 rounded-xl text-slate-700 transition-all flex items-start gap-2.5"
                          >
                            <span className="text-indigo-400 font-black shrink-0">{id + 1}.</span>
                            <span className="text-slate-700 text-right">{opt}</span>
                          </button>
                        ))}

                      {activeTabSection === "roles" &&
                        TEACHER_LEARNER_ROLES.map((opt, id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              if (!formRoles.includes(opt)) {
                                setFormRoles([...formRoles, opt]);
                                toast.success(isEnglishMode ? "Added to Roles" : "تمت الإضافة لدور المعلم والمتعلم");
                              } else {
                                toast.error(isEnglishMode ? "Role already added" : "مضاف مسبقاً");
                              }
                            }}
                            className="w-full text-right text-xs font-bold leading-relaxed p-2.5 bg-white hover:bg-indigo-50 border border-slate-200/80 rounded-xl text-slate-700 transition-all flex items-start gap-2.5"
                          >
                            <span className="text-indigo-400 font-black shrink-0">{id + 1}.</span>
                            <span className="text-slate-700 text-right">{opt}</span>
                          </button>
                        ))}

                      {activeTabSection === "assessments" &&
                        (isEnglishMode ? CONSTANTS_EN.assessment : CONSTANTS_AR.assessment).map((opt, id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              if (!formAssessments.includes(opt)) {
                                setFormAssessments([...formAssessments, opt]);
                                toast.success(isEnglishMode ? "Added to Assessments" : "تمت الإضافة للتقويم والتقييم");
                              } else {
                                toast.error(isEnglishMode ? "Assessment model already added" : "مضاف مسبقاً");
                              }
                            }}
                            className="w-full text-right text-xs font-bold leading-relaxed p-2.5 bg-white hover:bg-indigo-50 border border-slate-200/80 rounded-xl text-slate-700 transition-all flex items-start gap-2.5"
                          >
                            <span className="text-indigo-400 font-black shrink-0">{id + 1}.</span>
                            <span className="text-slate-700 text-right">{opt}</span>
                          </button>
                        ))}
                    </div>

                    {/* Manual addition custom input */}
                    <div className="pt-4 border-t border-slate-200/60 flex gap-2">
                      <input
                        type="text"
                        placeholder={
                          isEnglishMode
                            ? "Or write customized item..."
                            : "أو اكتب تكييفك الخاص يدوياً..."
                        }
                        value={
                          activeTabSection === "objectives"
                            ? customObjectiveText
                            : activeTabSection === "warmups"
                            ? customWarmupText
                            : activeTabSection === "strategies"
                            ? customStrategyText
                            : activeTabSection === "roles"
                            ? customRoleText
                            : customAssessmentText
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (activeTabSection === "objectives") setCustomObjectiveText(val);
                          else if (activeTabSection === "warmups") setCustomWarmupText(val);
                          else if (activeTabSection === "strategies") setCustomStrategyText(val);
                          else if (activeTabSection === "roles") setCustomRoleText(val);
                          else setCustomAssessmentText(val);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-indigo-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (activeTabSection === "objectives") {
                            if (!customObjectiveText) return;
                            setFormObjectives([...formObjectives, customObjectiveText]);
                            setCustomObjectiveText("");
                          } else if (activeTabSection === "warmups") {
                            if (!customWarmupText) return;
                            setFormWarmups([...formWarmups, customWarmupText]);
                            setCustomWarmupText("");
                          } else if (activeTabSection === "strategies") {
                            if (!customStrategyText) return;
                            setFormStrategies([...formStrategies, customStrategyText]);
                            setCustomStrategyText("");
                          } else if (activeTabSection === "roles") {
                            if (!customRoleText) return;
                            setFormRoles([...formRoles, customRoleText]);
                            setCustomRoleText("");
                          } else {
                            if (!customAssessmentText) return;
                            setFormAssessments([...formAssessments, customAssessmentText]);
                            setCustomAssessmentText("");
                          }
                          toast.success(isEnglishMode ? "Custom item added" : "تمت إضافة البند المخصص بنجاح");
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-3.5 py-2 rounded-xl"
                      >
                        {isEnglishMode ? "Add" : "إضافة"}
                      </button>
                    </div>
                  </div>

                  {/* COLUMN 2: Displaying active choices and deletion */}
                  <div className="border border-slate-200 p-6 rounded-2xl relative">
                    
                    <div className="text-xs font-black text-slate-500 pb-2 border-b border-slate-100 flex items-center justify-between">
                      <span>{isEnglishMode ? "Active Planning Output List" : "مخرجات خطة التحضير الحالية المعتمدة:"}</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[10px] text-slate-700 font-extrabold font-mono">
                        {activeTabSection === "objectives" && `${formObjectives.length} Objective(s)`}
                        {activeTabSection === "warmups" && `${formWarmups.length} Warm-up(s)`}
                        {activeTabSection === "strategies" && `${formStrategies.length} Strategy(s)`}
                        {activeTabSection === "roles" && `${formRoles.length} Role(s)`}
                        {activeTabSection === "assessments" && `${formAssessments.length} Assessment(s)`}
                      </span>
                    </div>

                    <div className="max-h-80 overflow-y-auto mt-4 space-y-3">
                      {/* Objectives list */}
                      {activeTabSection === "objectives" && (
                        formObjectives.length === 0 ? (
                          <div className="text-slate-400 font-bold text-xs py-8 text-center bg-slate-50 rounded-xl border border-dashed">
                            {isEnglishMode ? "No objectives planned yet" : "لم يتم إدراج أي أهداف سلوكية حتى الآن لمجرد النقر فوق أي خيار متاح يميناً..."}
                          </div>
                        ) : (
                          formObjectives.map((o, idx) => (
                            <div key={idx} className="flex items-start justify-between gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                              <span className="text-xs font-bold text-slate-800 leading-relaxed">{o}</span>
                              <button
                                type="button"
                                onClick={() => setFormObjectives(formObjectives.filter((item) => item !== o))}
                                className="text-red-500 hover:text-red-700 shrink-0 mt-0.5 p-1 hover:bg-red-50 rounded-md transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))
                        )
                      )}

                      {activeTabSection === "warmups" && (
                        formWarmups.length === 0 ? (
                          <div className="text-slate-400 font-bold text-xs py-8 text-center bg-slate-50 rounded-xl border border-dashed">
                            {isEnglishMode ? "No warm-up activities planned" : "لا توجد تفاصيل تمهيد موضوعية مضافة.. انقر فوق التمهيد المقترح على اليمين لإضافته"}
                          </div>
                        ) : (
                          formWarmups.map((w, idx) => (
                            <div key={idx} className="flex items-start justify-between gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                              <span className="text-xs font-bold text-slate-800 leading-relaxed">{w}</span>
                              <button
                                type="button"
                                onClick={() => setFormWarmups(formWarmups.filter((item) => item !== w))}
                                className="text-red-500 hover:text-red-700 shrink-0 mt-0.5 p-1 hover:bg-red-50 rounded-md transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))
                        )
                      )}

                      {activeTabSection === "strategies" && (
                        formStrategies.length === 0 ? (
                          <div className="text-slate-400 font-bold text-xs py-8 text-center bg-slate-50 rounded-xl border border-dashed">
                            {isEnglishMode ? "No teaching strategies planned" : "لم تحدد أي استراتيجيات تدريس في التخطيط حتى الآن"}
                          </div>
                        ) : (
                          formStrategies.map((s, idx) => (
                            <div key={idx} className="flex items-start justify-between gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                              <span className="text-xs font-bold text-slate-800 leading-relaxed">{s}</span>
                              <button
                                type="button"
                                onClick={() => setFormStrategies(formStrategies.filter((item) => item !== s))}
                                className="text-red-500 hover:text-red-700 shrink-0 mt-0.5 p-1 hover:bg-red-50 rounded-md transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))
                        )
                      )}

                      {activeTabSection === "roles" && (
                        formRoles.length === 0 ? (
                          <div className="text-slate-400 font-bold text-xs py-8 text-center bg-slate-50 rounded-xl border border-dashed">
                            {isEnglishMode ? "No roles planned yet" : "لم يتم إدراج أي أدوار للمعلم والمتعلم حتى الآن"}
                          </div>
                        ) : (
                          formRoles.map((r, idx) => (
                            <div key={idx} className="flex items-start justify-between gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                              <span className="text-xs font-bold text-slate-800 leading-relaxed">{r}</span>
                              <button
                                type="button"
                                onClick={() => setFormRoles(formRoles.filter((item) => item !== r))}
                                className="text-red-500 hover:text-red-700 shrink-0 mt-0.5 p-1 hover:bg-red-50 rounded-md transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))
                        )
                      )}

                      {activeTabSection === "assessments" && (
                        formAssessments.length === 0 ? (
                          <div className="text-slate-400 font-bold text-xs py-8 text-center bg-slate-50 rounded-xl border border-dashed">
                            {isEnglishMode ? "No assessment models planned" : "لا يوجد أدوات تقييم مستهدفة مصاغة"}
                          </div>
                        ) : (
                          formAssessments.map((a, idx) => (
                            <div key={idx} className="flex items-start justify-between gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                              <span className="text-xs font-bold text-slate-800 leading-relaxed">{a}</span>
                              <button
                                type="button"
                                onClick={() => setFormAssessments(formAssessments.filter((item) => item !== a))}
                                className="text-red-500 hover:text-red-700 shrink-0 mt-0.5 p-1 hover:bg-red-50 rounded-md transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))
                        )
                      )}
                    </div>

                  </div>

                </div>
              )}

            </div>

            {/* Form actions save block */}
            <div className="flex items-center justify-end gap-3 pb-8">
              <button
                type="button"
                onClick={() => setViewMode("menu")}
                className="bg-slate-200 hover:bg-slate-300 font-extrabold text-xs text-slate-700 px-6 py-3.5 rounded-xl transition-all"
              >
                {isEnglishMode ? "Discard" : "إلغاء وتراجع"}
              </button>
              
              <button
                type="button"
                onClick={handleSavePreparation}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-8 py-3.5 rounded-xl shadow-lg flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <Save size={16} />
                <span>{isEnglishMode ? "Save & Sync Preparation" : "حفظ ومزامنة وثيقة التحضير"}</span>
              </button>
            </div>

          </div>
        )}

      </main>

      {/* DETAILED VIEW MODAL WITH SUPERVISOR AUDITING CONTROLS */}
      <AnimatePresence>
        {selectedPreviewPrep && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              
              {/* Modal block header */}
              <div className="bg-slate-900 p-6 text-white flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 p-2 rounded-xl text-white">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black leading-tight">
                      معاينة وثيقة التحضير التربوي: {selectedPreviewPrep.subject}
                    </h3>
                    <p className="text-slate-400 font-bold text-[11px] mt-0.5">
                      خطة المعلم: {selectedPreviewPrep.teacherName} | التاريخ: {selectedPreviewPrep.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleExportWhatsApp(selectedPreviewPrep)}
                    title="تصدير واتس اب"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-black text-white rounded-xl border border-white/15 transition-all shadow-sm"
                  >
                    <Share2 size={14} />
                    <span>تصدير واتساب</span>
                  </button>
                  <button
                    onClick={() => handleExportPrepExcel(selectedPreviewPrep)}
                    title="تصدير اكسل"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white rounded-xl transition-all shadow-sm"
                  >
                    <FileSpreadsheet size={14} />
                    <span>تصدير أكسل</span>
                  </button>
                  <button
                    onClick={() => setSelectedPreviewPrep(null)}
                    className="p-2 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal core content */}
              <div className="p-8 space-y-8 text-right">

                {/* Meta blocks container */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold text-slate-600">
                  <div className="col-span-2 md:col-span-4 border-b border-slate-200 pb-2 mb-2">
                    <span className="block text-slate-400 font-black mb-1 text-slate-500 font-extrabold">عنوان الدرس:</span>
                    <span className="text-slate-900 font-black text-sm">{selectedPreviewPrep.lessonTitle || "بدون عنوان"}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-black mb-1">المدرسة:</span>
                    <span className="text-slate-800 font-extrabold">{selectedPreviewPrep.schoolName}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-black mb-1">الفرع / القسم:</span>
                    <span className="text-slate-800 font-extrabold">{selectedPreviewPrep.branchName}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-black mb-1">الصف والمستوى:</span>
                    <span className="text-slate-800 font-extrabold">{selectedPreviewPrep.grade}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-black mb-1">حالة وثيقة التحضير:</span>
                    {selectedPreviewPrep.supervisionStatus === "Approved" ? (
                      <span className="text-emerald-600 font-black">معتمد ومؤمن ضد التعديل</span>
                    ) : (
                      <span className="text-amber-600 font-black">قيد الانتظار</span>
                    )}
                  </div>
                </div>

                {/* Components list */}
                <div className="space-y-6">
                  
                  {/* Objectives */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-indigo-700 flex items-center gap-1.5 bg-slate-100 p-2 rounded-lg">
                      <span>🎯</span>
                      <span>1. الأهداف السلوكية للدرس (Objectives):</span>
                    </h4>
                    <div className="mr-4 space-y-1.5">
                      {selectedPreviewPrep.objectives.length === 0 ? (
                        <p className="text-slate-400 text-xs italic">لا يوجد أهداف محددة</p>
                      ) : (
                        selectedPreviewPrep.objectives.map((o, index) => (
                          <div key={index} className="text-xs font-bold text-slate-700 leading-relaxed flex items-start gap-2">
                            <span className="text-indigo-500 font-extrabold shrink-0">* ({index+1})</span>
                            <span>{o}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Warmups */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-indigo-700 flex items-center gap-1.5 bg-slate-100 p-2 rounded-lg">
                      <span>🔥</span>
                      <span>2. التمهيد ومحور الدافعية (Warm-up):</span>
                    </h4>
                    <div className="mr-4 space-y-1.5">
                      {selectedPreviewPrep.warmups.length === 0 ? (
                        <p className="text-slate-400 text-xs italic">لا يوجد بنود تمهيد</p>
                      ) : (
                        selectedPreviewPrep.warmups.map((w, index) => (
                          <div key={index} className="text-xs font-bold text-slate-700 leading-relaxed flex items-start gap-2">
                            <span className="text-indigo-500 font-extrabold shrink-0">* ({index+1})</span>
                            <span>{w}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Strategies */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-indigo-700 flex items-center gap-1.5 bg-slate-100 p-2 rounded-lg">
                      <span>💡</span>
                      <span>3. استراتيجيات التدريس الملحقة (Strategies):</span>
                    </h4>
                    <div className="mr-4 space-y-1.5">
                      {selectedPreviewPrep.strategies.length === 0 ? (
                        <p className="text-slate-400 text-xs italic">لا يوجد استراتيجيات محددة</p>
                      ) : (
                        selectedPreviewPrep.strategies.map((s, index) => (
                          <div key={index} className="text-xs font-bold text-slate-700 leading-relaxed flex items-start gap-2">
                            <span className="text-indigo-500 font-extrabold shrink-0">* ({index+1})</span>
                            <span>{s}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Roles */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-indigo-700 flex items-center gap-1.5 bg-slate-100 p-2 rounded-lg">
                      <span>👥</span>
                      <span>4. دور المعلم ودور المتعلم (Teacher & Learner Roles):</span>
                    </h4>
                    <div className="mr-4 space-y-1.5">
                      {!selectedPreviewPrep.roles || selectedPreviewPrep.roles.length === 0 ? (
                        <p className="text-slate-400 text-xs italic">لا يوجد أدوار محددة</p>
                      ) : (
                        selectedPreviewPrep.roles.map((r, index) => (
                          <div key={index} className="text-xs font-bold text-slate-700 leading-relaxed flex items-start gap-2">
                            <span className="text-indigo-500 font-extrabold shrink-0">* ({index+1})</span>
                            <span>{r}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-indigo-700 flex items-center gap-1.5 bg-slate-100 p-2 rounded-lg">
                      <span>📖</span>
                      <span>5. المحتوى (Content):</span>
                    </h4>
                    <div className="mr-4 text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {selectedPreviewPrep.content || <p className="text-slate-400 text-xs italic">لا يوجد محتوى</p>}
                    </div>
                  </div>

                  {/* Assessments */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-indigo-700 flex items-center gap-1.5 bg-slate-100 p-2 rounded-lg">
                      <span>📝</span>
                      <span>6. التقويم وأدوات قياس الاستجابة (Assessment):</span>
                    </h4>
                    <div className="mr-4 space-y-1.5">
                      {selectedPreviewPrep.assessments.length === 0 ? (
                        <p className="text-slate-400 text-xs italic">لا يوجد تفاصيل تقويمية</p>
                      ) : (
                        selectedPreviewPrep.assessments.map((a, index) => (
                          <div key={index} className="text-xs font-bold text-slate-700 leading-relaxed flex items-start gap-2">
                            <span className="text-indigo-500 font-extrabold shrink-0">* ({index+1})</span>
                            <span>{a}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Closure */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-indigo-700 flex items-center gap-1.5 bg-slate-100 p-2 rounded-lg">
                      <span>🚪</span>
                      <span>7. الغلق (Closure):</span>
                    </h4>
                    <div className="mr-4 text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {selectedPreviewPrep.closure || <p className="text-slate-400 text-xs italic">لا يوجد غلق</p>}
                    </div>
                  </div>

                  {/* Homework */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-indigo-700 flex items-center gap-1.5 bg-slate-100 p-2 rounded-lg">
                      <span>🏠</span>
                      <span>8. الواجب (Homework):</span>
                    </h4>
                    <div className="mr-4 text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {selectedPreviewPrep.homework || <p className="text-slate-400 text-xs italic">لا يوجد واجب</p>}
                    </div>
                  </div>

                </div>

                {/* UNIFIED SUPERVISOR PANEL - ALWAYS DISPLAYED AT THE BOTTOM */}
                <div className="bg-slate-50 border border-slate-300 rounded-2xl p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2 text-indigo-800 font-black text-sm">
                      <Settings size={18} />
                      <span>منصة المشرف التوجيهي التربوي للتقييم والتوقيع والاعتماد:</span>
                    </div>
                    {selectedPreviewPrep.supervisionStatus === "Approved" && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-250">
                        معتمد بواسطة: {selectedPreviewPrep.approvedBy} | بتاريخ: {selectedPreviewPrep.approvedAt}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {/* 1. Score Objectives */}
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-1.5">الأهداف السلوكية:</label>
                      <select
                        disabled={!hasControlSupervisionPanel}
                        value={supScoreObj}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSupScoreObj(val);
                          saveSupervisorEdits(val, supScoreWarm, supScoreStrat, supScoreRoles, supScoreAssess, supNotes);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        <option value={4}>ممتاز (4)</option>
                        <option value={3}>جيد جداً (3)</option>
                        <option value={2}>مقبول (2)</option>
                        <option value={1}>ضعيف (1)</option>
                      </select>
                    </div>

                    {/* 2. Score Warmup */}
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-1.5">التمهيد والدافعية:</label>
                      <select
                        disabled={!hasControlSupervisionPanel}
                        value={supScoreWarm}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSupScoreWarm(val);
                          saveSupervisorEdits(supScoreObj, val, supScoreStrat, supScoreRoles, supScoreAssess, supNotes);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        <option value={4}>ممتاز (4)</option>
                        <option value={3}>جيد جداً (3)</option>
                        <option value={2}>مقبول (2)</option>
                        <option value={1}>ضعيف (1)</option>
                      </select>
                    </div>

                    {/* 3. Score Strategy */}
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-1.5">استراتيجيات التدريس:</label>
                      <select
                        disabled={!hasControlSupervisionPanel}
                        value={supScoreStrat}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSupScoreStrat(val);
                          saveSupervisorEdits(supScoreObj, supScoreWarm, val, supScoreRoles, supScoreAssess, supNotes);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        <option value={4}>ممتاز (4)</option>
                        <option value={3}>جيد جداً (3)</option>
                        <option value={2}>مقبول (2)</option>
                        <option value={1}>ضعيف (1)</option>
                      </select>
                    </div>

                    {/* 4. Score Roles */}
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-1.5">دور المعلم والمتعلم:</label>
                      <select
                        disabled={!hasControlSupervisionPanel}
                        value={supScoreRoles}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSupScoreRoles(val);
                          saveSupervisorEdits(supScoreObj, supScoreWarm, supScoreStrat, val, supScoreAssess, supNotes);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        <option value={4}>ممتاز (4)</option>
                        <option value={3}>جيد جداً (3)</option>
                        <option value={2}>مقبول (2)</option>
                        <option value={1}>ضعيف (1)</option>
                      </select>
                    </div>

                    {/* 5. Score Assessment */}
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-1.5">التقويم والقياس:</label>
                      <select
                        disabled={!hasControlSupervisionPanel}
                        value={supScoreAssess}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSupScoreAssess(val);
                          saveSupervisorEdits(supScoreObj, supScoreWarm, supScoreStrat, supScoreRoles, val, supNotes);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        <option value={4}>ممتاز (4)</option>
                        <option value={3}>جيد جداً (3)</option>
                        <option value={2}>مقبول (2)</option>
                        <option value={1}>ضعيف (1)</option>
                      </select>
                    </div>
                  </div>

                  {/* General Score quick controls */}
                  {hasControlSupervisionPanel && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500">التعبئة الذكية السريعة:</span>
                      {[4, 3, 2, 1].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleApplyGeneralScore(s)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] px-2.5 py-1 rounded-md border border-indigo-150"
                        >
                          {s === 4 ? "ممتاز عام" : s === 3 ? "جيد جداً عام" : s === 2 ? "مقبول عام" : "ضعيف عام"}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Notes input */}
                  <div>
                    <label className="block text-xs font-black text-slate-500 mb-1.5">ملاحظات وقيم توجيهية نهائية:</label>
                    <textarea
                      disabled={!hasControlSupervisionPanel}
                      rows={2}
                      value={supNotes}
                      onChange={(e) => setSupNotes(e.target.value)}
                      onBlur={() => {
                        if (hasControlSupervisionPanel) {
                          saveSupervisorEdits(supScoreObj, supScoreWarm, supScoreStrat, supScoreRoles, supScoreAssess, supNotes);
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                      placeholder={hasControlSupervisionPanel ? "اكتب التقييم والنصائح التربوية لتحسين الأثر التعليمي" : "لا توجد ملاحظات توجيهية مرصودة حالياً"}
                    />
                  </div>

                  {/* Approve button and signature */}
                  {hasControlSupervisionPanel && selectedPreviewPrep.supervisionStatus !== "Approved" && (
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={handleApprovePrep}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-6 py-3 rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
                      >
                        <CheckCircle size={15} />
                        <span>توقيع واعتماد وثيقة التحضير</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
