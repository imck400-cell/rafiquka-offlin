import { subjectSkills } from './subjectSkills';
import { TeacherEvaluation } from '../types';

export interface ScoreBlock {
  title: string;
  items: string[];
}

export const shortCriteriaBlocks: ScoreBlock[] = [
  {
    title: 'الكفايات الشخصية وسمات المعلم',
    items: ['يهتم بمظهره الشخصي.', 'يظهر ثقة بنفسه.', 'يتحدث بصوت ولغة سليمة.']
  },
  {
    title: 'الخطة الدرسية',
    items: ['يسير في المنهج وفق الخطة.', 'يقدم خطة درسية مكتملة العناصر (كمي)', 'يربط الخطة الدراسية بموضوع الدرس (نوعي)']
  },
  {
    title: 'إدارة الصف',
    items: ['يحافظ على قواعد الانضباط الصفي.', 'يدير التفاعل الصفي بنجاح', 'يساهم في إيجاد مناخ صفي ملائم.', 'يوزع زمن الحصة على خطوات الدرس (تنفيذ)']
  },
  {
    title: 'الأداء والعرض المباشر للدرس',
    items: ['يهيئ ويمهد للدرس بصورة ملائمة.', 'يظهر إلماما بالمادة العلمية.', 'يراعي الفروق الفردية بين المتعلمين.', 'يربط الدرس بالتطبيقات والبيئة المحيطة.', 'ينمي القيم والأخلاق الحميدة.', 'يفعل دور المتعلمين ويحفزهم.', 'يطرح أسئلة صفية متنوعة', 'يتابع أعمال المتعلمين أثناء الدرس.', 'يغلق الدرس بصورة مناسبة.']
  },
  {
    title: 'السبورة والوسائل والأنشطة التعليمية',
    items: ['يمارس التقييم المعزز للتعلم.', 'يستخدم السبورة بفاعلية.', 'يوظف الوسائط التعليمية بصورة مناسبة.', 'يدير النشاط الصفي بفاعلية.']
  },
  {
    title: 'تحصيل المتعلمين',
    items: ['يفعل سجل الدرجات في الحصة.', 'يقيس استيعاب المتعلمين.', 'يتابع دفاتر المتعلمين بفاعلية.', 'يفعل الواجب المنزلي والتعيينات.', 'يربط تحصيل المتعلمين بمصادر التعلم.']
  },
  {
    title: 'مهارات المادة',
    items: ['ينفذ المهارات الأساسية للمادة.']
  },
  {
    title: 'البيئة الصفية',
    items: ['مشاركة الطلاب وتفاعلهم.', 'التفاعل الإيجابي بين المعلم والطلاب.']
  }
];

export const extCriteriaBlocks: ScoreBlock[] = [
  {
    title: 'متميز في الصفات الشخصية',
    items: ['يظهر بمظهر حسن', 'يحترم مشاعر الآخرين', 'يثق بنفسه']
  },
  {
    title: 'اكتمال الخطة والتحضير (كمي)',
    items: ['توفر البيانات العامة (صف، حصة، عنوان، تاريخ)', 'توفر الأهداف والمحتوى والأساليب الوسائل والتقويم', 'توفر التمهيد والغلق والواجب بشكل مناسب.', 'يحدد أدواراً نشطة للمعلم والمتعلم تتفق مع المحتوى']
  },
  {
    title: 'اتفاق عناصر التحضير مع الدرس (نوعي)',
    items: ['تتفق عناصر التحضير مع المحتوى ومهاراته .', 'الأهداف مصاغة من المستويات العليا والدنيا', 'الأهداف سليمة الصياغة وخالية من الأخطاء الإملائية', 'التقويم مصاغ بطريقة تقيس تحقق الأهداف.']
  },
  {
    title: 'التهيئة والتمهيد مناسبان للدرس',
    items: ['تهيئة بيئية و نفسية(نظافة، نظام، قيام، مجموعات)', 'تهيئة توجيهية وانتقالية من نشاط إلى آخر.', 'تمهيد مشوق ومناسب للدرس ويثير دافعية المتعلم.', 'تمهيد انتقالي من مهارة علمية إلى أخرى.']
  },
  {
    title: 'استخدام السبورة بفاعلية',
    items: ['يكتب البيانات والدرس وينظم السبورة مع التلوين.', 'يكتب عناصر ومهارات الدرس مع الأمثلة والتلوين.', 'يكتب القواعد والأساسيات التي يشرحها.', 'خلو الكتابة من الأخطاء العلمية واللغوية والإملائية']
  },
  {
    title: 'وضوح الشرح بتمكن علمي وتسلسل منطقي للدرس',
    items: [
      'الشرح خالٍ من الأخطاء العلمية الملقاة في الدرس.',
      'الشرح خالٍ من الأخطاء اللغوية الملقاة في الدرس.',
      'يوضح المفاهيم والمصطلحات الواردة في الدرس.',
      'يتدرج من السهل والمعلوم إلى الصعب والمجهول.',
      'التسلسل كامل و مناسب لمحتوى الدرس والمتعلم.',
      'يكثر من الأمثلة التطبيقية لكل مهارة ونشاط .',
      'يصحح أخطاء الطلاب ويوجههم للصواب.',
      'يعتمد على المقارنات لتوضيح الفروق العلمية.',
      'يضع أسئلة متنوعة لإثارة نشاط الطلاب.'
    ]
  },
  {
    title: 'الاستراتيجات ودور المتعلم',
    items: ['تنويع الأساليب بحيث لكل هدف أسلوب نشط.', 'يستخدم طرقاً نشطة مثيرة لانتباه الطلاب.', 'يشرك المتعلم في نشاط الدرس ( فردي، جماعي)', 'يحدد أدواراً للمعلم والمتعلم نشطة تتفق مع المحتوى']
  },
  {
    title: 'مهارات التواصل',
    items: ['يحسن إيصال المعلومة بلغة جسد وتحرك متميز.', 'وضوح الصوت وتنوع نبراته وفق محتوى الدرس.', 'يحسن الاستماع والحوار مع جميع المتعلمين.']
  },
  {
    title: 'ربط الدرس بالقيم وخبرات الطلاب',
    items: ['ربط الدرس بقيمة حياتية من واقع الطلبة', 'ينوع في الأنشطة وفق قدرات الطلبة العقلية.', 'يقدم التغذية الراجعة أثناء تنفيذ الطلاب للمهارات.']
  },
  {
    title: 'الوسائل والمصادر',
    items: ['توفر وسائل مناسبة ومتنوعة وملتزمة بالوقت', 'يتم توظيف الكتاب ومصادر أخرى حسب النشاط.']
  },
  {
    title: 'تفاعل المتعلمين مع الدرس',
    items: ['شارك جميع الطلبة في الدرس.', 'تفاعل جميع المتعلمين مع بعضهم.', 'تفاعل المتعلمين مع المعلم والوسيلة والنشاط .']
  },
  {
    title: 'الإدارة الصفية وقواعد السلوك',
    items: ['إدارة فاعلة منضبطة نشطة وغير خاملة دائماً.', 'يفعل الطالب الخامل من خلال السؤال والمشاركة.', 'تعزيز السلوكيات المرغوبة وتقويم غير المرغوبة.', 'أنهى الحصة وغطى الوقت حسب المخطط له.', 'يستخدم سجل نقاط ودرجات المشاركات الطلابية.', 'يستخدم الفاظاً وأحكاماً تربوية مناسبة لمعالجة سلوك']
  },
  {
    title: 'التقويم والغلق مناسبان ومثيران',
    items: ['تقويم تشخيصي وبنائي وختامي مكتمل .', 'يطرح أسئلة تثير التفكير( عصف، تصنيف، سابرة)', 'يتابع استجابات المتعلمين', 'إغلاق الدرس بملخص أو مراجعة أو أسلوب مختلف']
  },
  {
    title: 'يهتم بالواجبات والتصحيح',
    items: ['تقديم واجبات وتعيينات مناسبة ومتنوعه.', 'يتابع تنفيذ الواجبات من قبل الطلاب.', 'يصحح الدفاتر أولا بأول.', 'يضع إشارات وتغذية راجعة ويصوب الخطأ.']
  }
];

import {
  normalizeSchool,
  normalizeSubject as engineNormalizeSubject,
  areSubjectsCompatible,
  hasIntersection,
} from '../src/lib/NormalizationEngine';

/**
 * Normalizes a school name or identifier for strict canonical comparison
 * using the central Arabic NormalizationEngine.
 */
export const normalizeSchoolName = (name?: string | null): string => {
  return normalizeSchool(name);
};

/**
 * Checks if two school identifiers or names refer to the exact same school
 * after canonical Arabic normalization.
 */
export const isSameSchool = (schoolA?: string | null, schoolB?: string | null): boolean => {
  if (!schoolA || !schoolB) return false;
  return hasIntersection([schoolA], [schoolB], normalizeSchool);
};

/**
 * Define subject families so supervisors in general disciplines can inspect related sub-disciplines
 */
export const SUBJECT_FAMILY_GROUPS: Record<string, string[]> = {
  'التربية الإسلامية': [
    'التربية الإسلامية', 'تربية إسلامية', 'إسلامية', 'القرآن الكريم', 'قرآن كريم', 'القرآن', 'قرآن',
    'تلاوة', 'تجويد', 'حديث', 'فقه', 'توحيد', 'سيرة', 'عقيدة', 'علوم القرآن'
  ],
  'اللغة العربية': [
    'اللغة العربية', 'لغة عربية', 'عربي', 'نحو', 'إملاء', 'قراءة', 'نصوص', 'أدب', 'بلاغة', 'إنشاء', 'تعبير', 'خط'
  ],
  'العلوم': [
    'العلوم', 'علوم', 'فيزياء', 'كيمياء', 'أحياء', 'جيولوجيا', 'علوم عامة', 'بيئة'
  ],
  'الدراسات الاجتماعية': [
    'الدراسات الاجتماعية', 'دراسات اجتماعية', 'اجتماعيات', 'تاريخ', 'جغرافيا', 'وطنية', 'تربية وطنية'
  ],
  'الرياضيات': [
    'الرياضيات', 'رياضيات', 'جبر', 'هندسة', 'حساب', 'تفاضل وتكامل', 'إحصاء'
  ],
  'اللغة الإنجليزية': [
    'اللغة الإنجليزية', 'لغة إنجليزية', 'إنجليزي', 'English', 'إنقليزي'
  ],
  'الحاسوب': [
    'الحاسوب', 'حاسوب', 'تكنولوجيا المعلومات', 'تقنية المعلومات', 'حاسب آلي', 'الرخصة الدولية', 'كمبيوتر'
  ]
};

/**
 * Normalizes subject names across different spelling variations
 */
export const normalizeSubject = (subj?: string): string => {
  return engineNormalizeSubject(subj);
};

/**
 * Checks if two subject names match, taking into account aliases and subject family groups.
 */
export const matchSubjects = (subjA?: string, subjB?: string): boolean => {
  if (!subjA || !subjB) return false;
  return areSubjectsCompatible(subjA, subjB);
};

/**
 * Retrieves the score of an evaluation item using direct key, trimmed match, or positional mapping.
 * Ensures that if criteria text was edited in Secretariat, the score at that position is preserved with the updated text.
 */
export const getEvaluationItemScore = (
  ev: TeacherEvaluation | { scores: Record<string, number>; criteriaBlocksSnapshot?: any },
  item: string,
  blockIdx?: number,
  itemIdx?: number,
  activeBlocks?: Array<{ title: string; items: string[] }>
): number | undefined => {
  if (!ev || !ev.scores || typeof ev.scores !== 'object') return undefined;

  // 1. Direct match by exact item string
  if (ev.scores[item] !== undefined) {
    return ev.scores[item];
  }

  // 2. Trimmed match (ignoring whitespace differences)
  const cleanItem = item.trim();
  for (const [key, val] of Object.entries(ev.scores)) {
    if (key.trim() === cleanItem) {
      return val;
    }
  }

  // 3. Positional / Index match (if blockIdx and itemIdx are provided)
  if (blockIdx !== undefined && itemIdx !== undefined) {
    // If ev has criteriaBlocksSnapshot, check what item was at this position
    const snapshot = (ev as any).criteriaBlocksSnapshot;
    if (snapshot && Array.isArray(snapshot) && snapshot[blockIdx]?.items?.[itemIdx]) {
      const oldItemName = snapshot[blockIdx].items[itemIdx];
      if (ev.scores[oldItemName] !== undefined) {
        return ev.scores[oldItemName];
      }
      if (ev.scores[oldItemName.trim()] !== undefined) {
        return ev.scores[oldItemName.trim()];
      }
    }

    // Check by sequential position in scores dictionary
    const scoreEntries = Object.entries(ev.scores);
    let sequentialIndex = 0;
    if (activeBlocks && Array.isArray(activeBlocks)) {
      for (let b = 0; b < blockIdx; b++) {
        sequentialIndex += (activeBlocks[b]?.items?.length || 0);
      }
      sequentialIndex += itemIdx;
      if (scoreEntries[sequentialIndex] !== undefined) {
        return scoreEntries[sequentialIndex][1];
      }
    }
  }

  return undefined;
};

/**
 * Maps raw scores dictionary to active blocks so when editing or viewing in evaluation forms,
 * scores at edited criteria positions are preserved under the new texts.
 */
export const mapScoresToActiveBlocks = (
  rawScores: Record<string, number> = {},
  activeBlocks: Array<{ title: string; items: string[] }> = [],
  snapshot?: Array<{ title: string; items: string[] }>
): Record<string, number> => {
  const result: Record<string, number> = { ...rawScores };
  if (!activeBlocks || !Array.isArray(activeBlocks)) return result;

  const scoreEntries = Object.entries(rawScores);
  let globalItemIdx = 0;

  activeBlocks.forEach((block, bIdx) => {
    block.items.forEach((item, iIdx) => {
      if (result[item] === undefined && result[item.trim()] === undefined) {
        // Try to get score from snapshot at the same position
        let matchedScore: number | undefined = undefined;
        if (snapshot && snapshot[bIdx]?.items?.[iIdx]) {
          const oldItem = snapshot[bIdx].items[iIdx];
          matchedScore = rawScores[oldItem] ?? rawScores[oldItem.trim()];
        }
        // Fallback: sequential index from rawScores
        if (matchedScore === undefined && scoreEntries[globalItemIdx]) {
          matchedScore = scoreEntries[globalItemIdx][1];
        }
        if (matchedScore !== undefined) {
          result[item] = matchedScore;
        }
      }
      globalItemIdx++;
    });
  });

  return result;
};

export const getCriteriaBlocksForReport = (
  ev: TeacherEvaluation,
  customSupervisionCriteria: any[] = []
) => {
  // 1. Fetch configuration of custom criteria for this school-branch
  const baseBlocks =
    ev.evaluationType === "short" ? shortCriteriaBlocks : extCriteriaBlocks;

  const computedConfig = customSupervisionCriteria?.find(
    (c: any) =>
      c.school?.trim() === ev.school?.trim() &&
      c.branch?.trim() === ev.branch?.trim()
  );

  let resolvedBlocks = baseBlocks;
  if (computedConfig) {
    if (ev.evaluationType === "short" && computedConfig.shortCriteriaBlocks) {
      resolvedBlocks = computedConfig.shortCriteriaBlocks;
    } else if (
      (ev.evaluationType === "ext" || ev.evaluationType === "subject") &&
      computedConfig.extCriteriaBlocks
    ) {
      resolvedBlocks = computedConfig.extCriteriaBlocks;
    }
  }

  const blocksCopy: Array<{ title: string; items: string[] }> = JSON.parse(
    JSON.stringify(resolvedBlocks)
  );

  if (ev.evaluationType === "subject" && ev.subject && ev.subSubject) {
    const computedSubjectSkills =
      computedConfig?.subjectSkills || subjectSkills;
    const normSubject = normalizeSubject(ev.subject);
    const resolvedSubjectKey = Object.keys(computedSubjectSkills).find(
      (k) => matchSubjects(k, ev.subject) || k === ev.subject
    ) || ev.subject;

    if (
      computedSubjectSkills[resolvedSubjectKey] &&
      computedSubjectSkills[resolvedSubjectKey][ev.subSubject]
    ) {
      const skills = computedSubjectSkills[resolvedSubjectKey][ev.subSubject];
      const newBlock = {
        title: "مهارات المادة والفرع",
        items: skills,
      };

      const insertIndex = blocksCopy.findIndex(
        (b: any) =>
          b.title.includes("السبورة والوسائل") ||
          b.title.includes("الاستراتيجات و")
      );
      if (insertIndex !== -1) {
        blocksCopy.splice(insertIndex, 0, newBlock);
      } else {
        blocksCopy.push(newBlock);
      }
    }
  }

  return blocksCopy;
};

export const formatEvaluationToWhatsApp = (ev: TeacherEvaluation, customSupervisionCriteria: any[] = []) => {
  const percentage = ev.percentage;
  let scoreEmoji = "🔴";
  if (percentage >= 90) scoreEmoji = "🟢";
  else if (percentage >= 75) scoreEmoji = "🔵";
  else if (percentage >= 50) scoreEmoji = "🟡";

  let typeLabel = '';
  if (ev.evaluationType === 'short') {
    typeLabel = 'الزيارة الصفية المختصرة';
  } else if (ev.evaluationType === 'ext') {
    typeLabel = 'الزيارة الصفية الموسعة';
  } else {
    typeLabel = 'الزيارة الصفية بحسب المادة';
  }

  let msg = `✨📜 *خلاصة تقييم ${typeLabel}* 📜✨\n\n`;
  msg += `🏫 *المدرسة والفرع:* ${ev.school}ـ فرع ${ev.branch || 'الرئيسي'}\n`;
  msg += `👤 *المعلم:* ${ev.teacherName}\n`;
  msg += `🧑‍🏫 *المشرف التربوي:* ${ev.evaluatorName}\n`;
  msg += `📅 *التاريخ:* ${ev.date}\n`;
  if (ev.period) {
    msg += `⏰ *الحصة:* ${ev.period}\n`;
  }
  msg += `🔍 *نوع الزيارة:* ${ev.visitType || 'استطلاعية'}\n`;
  msg += `📚 *المادة والفرع:* ${ev.subSubject ? `${ev.subject} - ${ev.subSubject}` : ev.subject}\n`;
  msg += `🏢 *الصف والشعبة:* ${ev.className}\n`;
  if (ev.lessonName) {
    msg += `📖 *موضوع الدرس:* ${ev.lessonName}\n`;
  }

  msg += `\n────────────────────\n`;
  msg += `🎯 *مؤشر نسبة الأداء العام:* ${percentage}% ${scoreEmoji}\n`;
  msg += `────────────────────\n\n`;

  // 1. Visit Criteria and evaluation scores
  msg += `*📊 معايير الزيارة ودرجات التقييم:*\n`;
  const activeBlocks = getCriteriaBlocksForReport(ev, customSupervisionCriteria);
  activeBlocks.forEach((block: any) => {
    msg += `\n*🔹 ${block.title}:*\n`;
    block.items.forEach((item: string) => {
      const score = ev.scores[item];
      let indicator = '⚪';
      if (score === 0) indicator = '🔴';
      else if (score === 1) indicator = '🟠';
      else if (score === 2) indicator = '🟡';
      else if (score === 3) indicator = '🔵';
      else if (score === 4) indicator = '🟢';

      msg += `${indicator} ${item} (${score !== undefined ? score + ' / 4' : '-'})\n`;
    });
  });

  msg += `\n────────────────────\n\n`;

  // 2. Strategies, Sources, Tools/Means
  const getOptStr = (val: any) => {
    if (Array.isArray(val)) {
      return val.filter(s => s.trim()).join('، ');
    }
    if (typeof val === 'string') {
      return val.split('\n').filter(s => s.trim()).join('، ');
    }
    return '';
  };

  const strategiesStr = getOptStr(ev.customOptions?.strategies);
  const sourcesStr = getOptStr(ev.customOptions?.sources);
  const toolsStr = getOptStr(ev.customOptions?.tools);
  const programsStr = getOptStr(ev.customOptions?.programs);

  msg += `*🎯 أهم الاستراتيجيات المنفذة:* ${strategiesStr || '🔹 لا يوجد'}\n`;
  msg += `*📚 أهم المصادر المستخدمة:* ${sourcesStr || '🔹 لا يوجد'}\n`;
  msg += `*🛠️ أهم الوسائل المستخدمة:* ${toolsStr || '🔹 لا يوجد'}\n`;
  if (programsStr) {
    msg += `*⚙️ البرامج المنفذة:* ${programsStr}\n`;
  }
  msg += `\n`;

  // 3. Positives, Improvements, Recommendations
  msg += `*💪 أهم الإيجابيات:*\n${ev.strengths ? `✅ ${ev.strengths.split('\n').join('\n✅ ')}` : '🔹 لا يوجد'}\n\n`;
  msg += `*📈 ملاحظات التحسن والتطوير:*\n${ev.improvements ? `⚠️ ${ev.improvements.split('\n').join('\n⚠️ ')}` : '🔹 لا يوجد'}\n\n`;
  msg += `*💡 التوصيات الإجرائية المحددة:*\n${ev.recommendations ? `📌 ${ev.recommendations.split('\n').join('\n📌 ')}` : '🔹 لا يوجد'}\n\n`;

  // 4. Auto Comment
  let autoComment = '';
  if (percentage >= 0 && percentage <= 40) {
    autoComment = 'تم الاطلاع على التقرير كاملاً بما في ذلك جميع الإيجابيات والملاحظات والتوصيات، وأتعهد بالمتابعة لكل ما ذكر';
  } else if (percentage >= 41 && percentage <= 80) {
    autoComment = 'تم الاطلاع على التقرير كاملاً بما في ذلك جميع الإيجابيات والملاحظات والتوصيات، وسأعمل على الأخذ بكافة ما تم ذكره.';
  } else if (percentage >= 81 && percentage <= 100) {
    autoComment = 'تم الاطلاع على التقرير كاملاً بما في ذلك جميع الإيجابيات والملاحظات والتوصيات، وسأعمل على الاستمرار في الصدارة و الأخذ بكافة ما تم ذكره.';
  }

  msg += `*💬 التعليق التلقائي للموظف:*\n📝 ${ev.employeeComment || autoComment}\n\n`;

  // 5. Customary footer
  let targetDate = new Date();
  if (ev.date) {
    const parts = ev.date.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      targetDate = new Date(year, month, day);
    } else {
      const fallback = new Date(ev.date);
      if (!isNaN(fallback.getTime())) {
        targetDate = fallback;
      }
    }
  }
  const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const dayName = days[targetDate.getDay()];
  const day = targetDate.getDate();
  const month = targetDate.getMonth() + 1;
  const year = targetDate.getFullYear();
  const dateText = `${dayName} ${day}/${month}/${year}`;

  const schoolLabel = ev.school ? (ev.school.startsWith("مدارس") ? ev.school : `مدارس ${ev.school}`) : '';
  const branchLabel = ev.branch ? (ev.branch.startsWith("فرع") || ev.branch === "المركز الرئيسي" ? ev.branch : `فرع ${ev.branch}`) : '';
  const footer = [dateText, schoolLabel, branchLabel].filter(Boolean).join(" - ");

  msg += `📱 _${footer}_`;
  return msg;
};
