import { AuthUser, User, UserPermissions } from '../../types';

/**
 * خريطة مجموعات المواد المترابطة لضمان مرونة المطابقة التربوية
 * مع الحفاظ على العزل الصارم بين التخصصات المختلفة
 */
export const NORMALIZED_SUBJECT_FAMILIES: string[][] = [
  [
    'التربيه الاسلاميه',
    'تربيه اسلاميه',
    'اسلاميه',
    'القران الكريم',
    'قران كريم',
    'القران',
    'قران',
    'تلاوه',
    'تجويد',
    'حديث',
    'فقه',
    'توحيد',
    'سيره',
    'عقيده',
    'علوم القران',
  ],
  [
    'اللغه العربيه',
    'لغه عربيه',
    'عربي',
    'نحو',
    'املاء',
    'قراءه',
    'نصوص',
    'ادب',
    'بلاغه',
    'انشاء',
    'تعبير',
    'خط',
  ],
  [
    'العلوم',
    'علوم',
    'فيزياء',
    'كيمياء',
    'احياء',
    'جيولوجيا',
    'علوم عامه',
    'بيئه',
  ],
  [
    'الدراسات الاجتماعيه',
    'دراسات اجتماعيه',
    'اجتماعيات',
    'تاريخ',
    'جغرافيا',
    'وطنيه',
    'تربيه وطنيه',
    'مجتمع',
    'المجتمع',
  ],
  [
    'الرياضيات',
    'رياضيات',
    'جبر',
    'هندسه',
    'الجبر والهندسه',
    'جبر وهندسه',
    'حساب',
    'تفاضل وتكامل',
    'التفاضل والتكامل',
    'احصاء',
  ],
  [
    'اللغه الانجليزيه',
    'لغه انجليزيه',
    'انجليزي',
    'انقليزي',
    'english',
  ],
  [
    'الحاسوب',
    'حاسوب',
    'تكنولوجيا المعلومات',
    'تقنيه المعلومات',
    'حاسب الي',
    'الرخصه الدوليه',
    'كمبيوتر',
  ],
];

/**
 * تحويل الأرقام العربية الشرقية والفارسية (٠-٩ / ۰-۹) إلى أرقام قياسية (0-9)
 */
function convertEasternDigitsToAscii(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * 1. normalizeArabicText(text):
 * تجريد التشكيل والتنوين والمد (التطويل)، توحيد الهمزات (أ، إ، آ، ٱ -> ا)،
 * توحيد التاء المربوطة (ة -> ه)، والألف المقصورة (ى -> ي)، وتوحيد الأرقام والمسافات.
 */
export function normalizeArabicText(text?: string | number | null): string {
  if (text === null || text === undefined) return '';
  let str = String(text).trim();
  if (!str) return '';

  str = convertEasternDigitsToAscii(str);

  // إزالة التشكيل والتنوين وعلامات الضبط والتطويل (الكشيدة)
  str = str.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '');

  // توحيد الهمزات على الألف، التاء المربوطة، والألف المقصورة
  str = str
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');

  // توحيد المسافات المتعددة
  str = str.replace(/\s+/g, ' ').trim().toLowerCase();

  return str;
}

/**
 * 2. normalizeSchool(school):
 * تجريد السوابق المؤسسية (مدرسة|المدرسة|مدارس|المدارس|مجمع|المجمع|روضة|ثانوية)
 * وتطبيق التطبيع النصي القياسي.
 */
export function normalizeSchool(school?: string | null): string {
  if (!school) return '';
  let str = String(school).trim();
  // إزالة الأقواس وعلامات التنصيص المحيطة
  str = str.replace(/^[\s"'\[\]\(\)\{\}«»\-_]+|[\s"'\[\]\(\)\{\}«»\-_]+$/g, '');
  str = normalizeArabicText(str);
  // تجريد السوابق في بداية اسم المدرسة (حتى لو تكررت مثل "مدارس مجمع ...")
  str = str.replace(
    /^(?:(?:مدرسه|المدرسه|مدارس|المدارس|مجمع|المجمع|روضه|الروضه|ثانويه|الثانويه)\s+)+/i,
    ''
  );
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * 3. normalizeBranch(branch):
 * تجريد السوابق (فرع|الفرع|مبنى|المبنى|قسم|القسم) وتوحيد النص
 * ليتطابق "فرع الطلاب" مع "الطلاب" و"فرع البنين" مع "بنين".
 */
export function normalizeBranch(branch?: string | null): string {
  if (!branch) return '';
  let str = String(branch).trim();
  str = str.replace(/^[\s"'\[\]\(\)\{\}«»\-_]+|[\s"'\[\]\(\)\{\}«»\-_]+$/g, '');
  str = normalizeArabicText(str);

  if (str === 'all' || str === 'الجميع' || str === 'الكل' || str === 'كل الفروع') {
    return 'all';
  }

  // تجريد سوابق الفرع/المبنى
  str = str.replace(/^(?:(?:فرع|الفرع|مبني|المبني|قسم|القسم)\s+)+/i, '').trim();

  // تجريد "ال" التعريف في بداية اسم الفرع بعد إزالة كلمة فرع (مثلاً: "الطلاب" -> "طلاب"، "البنين" -> "بنين")
  // مع الحفاظ على الكلمات المركبة مثل "المركز الرئيسي" -> "مركز رئيسي"
  str = str
    .split(' ')
    .map((word) => (word.startsWith('ال') && word.length > 3 ? word.slice(2) : word))
    .join(' ');

  return str.replace(/\s+/g, ' ').trim();
}

/**
 * 4. normalizeGrade(grade):
 * توحيد أسماء وأرقام الصفوف ("الصف الأول"، "الأول"، "١" -> "1").
 */
export function normalizeGrade(grade?: string | number | null): string {
  if (grade === null || grade === undefined) return '';
  let str = normalizeArabicText(grade);
  if (!str) return '';

  if (str === 'all' || str === 'الجميع' || str === 'الكل') {
    return 'all';
  }

  // تجريد كلمات "الصف" أو "صف" أو "المرحلة"
  str = str
    .replace(/^(?:(?:الصف|صف|المرحله|مرحله)\s+)+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // فحص التمهيدي / الروضة
  if (
    str.includes('تمهيدي') ||
    str.includes('روضه') ||
    str === 'kg' ||
    str === 'kg1' ||
    str === 'kg2'
  ) {
    return 'تمهيدي';
  }

  // إذا كان يحتوي على رقم صريح (مثل "1"، "10"، "12")
  const numericMatch = str.match(/\b(1[0-2]|[1-9])\b/);
  if (numericMatch) {
    return numericMatch[1];
  }

  // خريطة المسميات اللفظية للصفوف (الترتيب من الأطول للأقصر لمنع التداخل بين "ثاني عشر" و"ثاني")
  const gradeWordMap: Array<[RegExp, string]> = [
    [/^(?:الثاني عشر|ثاني عشر|ثالث ثانوي|الثالث الثانوي|الثالث ثانوي)$/, '12'],
    [/^(?:الحادي عشر|حادي عشر|احدي عشر|ثاني ثانوي|الثاني الثانوي|الثاني ثانوي)$/, '11'],
    [/^(?:العاشر|عاشر|اول ثانوي|الاول الثانوي|الاول ثانوي)$/, '10'],
    [/^(?:التاسع|تاسع|ثالث اعدادي|الثالث الاعدادي|ثالث متوسط|الثالث المتوسط)$/, '9'],
    [/^(?:الثامن|ثامن|ثاني اعدادي|الثاني الاعدادي|ثاني متوسط|الثاني المتوسط)$/, '8'],
    [/^(?:السابع|سابع|اول اعدادي|الاول الاعدادي|اول متوسط|الاول المتوسط)$/, '7'],
    [/^(?:السادس|سادس)(?:\s+ابتدائي|\s+اساسي)?$/, '6'],
    [/^(?:الخامس|خامس)(?:\s+ابتدائي|\s+اساسي)?$/, '5'],
    [/^(?:الرابع|رابع)(?:\s+ابتدائي|\s+اساسي)?$/, '4'],
    [/^(?:الثالث|ثالث)(?:\s+ابتدائي|\s+اساسي)?$/, '3'],
    [/^(?:الثاني|ثاني)(?:\s+ابتدائي|\s+اساسي)?$/, '2'],
    [/^(?:الاول|اول)(?:\s+ابتدائي|\s+اساسي)?$/, '1'],
  ];

  for (const [pattern, normalizedNumber] of gradeWordMap) {
    if (pattern.test(str)) {
      return normalizedNumber;
    }
  }

  return str;
}

/**
 * 5. normalizeSection(section):
 * تجريد كلمة "شعبة" / "فصل" وتوحيد الرموز (مثل "شعبة أ" -> "ا"، "هـ" -> "ه").
 */
export function normalizeSection(section?: string | null): string {
  if (!section) return '';
  let str = String(section).trim();
  str = str.replace(/^[\s"'\[\]\(\)\{\}«»\-_/]+|[\s"'\[\]\(\)\{\}«»\-_/]+$/g, '');
  str = normalizeArabicText(str);

  if (str === 'all' || str === 'الجميع' || str === 'الكل' || str === 'كل الشعب') {
    return 'all';
  }

  str = str
    .replace(/^(?:(?:الشعبه|شعبه|الفصل|فصل|قسم)\s*[:\-]?\s*)+/i, '')
    .trim();

  return str;
}

/**
 * 6. normalizeSubject(subject):
 * تطبيع مسميات المواد لتجاوز الهمزات والفروق النصية والسوابق ("مادة"، "ال").
 */
export function normalizeSubject(subject?: string | null): string {
  if (!subject) return '';
  let str = normalizeArabicText(subject);
  if (!str) return '';

  if (str === 'all' || str === 'الجميع' || str === 'الكل') {
    return 'all';
  }

  // إزالة البادئة "مادة" أو "مقرر"
  str = str.replace(/^(?:(?:ماده|الماده|مقرر|المقرر)\s+)+/i, '').trim();

  // إذا كان الاسم ينتمي لإحدى العائلات القياسية أو يطابقها بدون "ال"، نوحده
  const strippedAl = str
    .split(' ')
    .map((w) => (w.startsWith('ال') && w.length > 3 ? w.slice(2) : w))
    .join(' ');

  // توحيد أشهر الاختلافات الإملائية للمواد نفسها
  const canonicalAliases: Record<string, string> = {
    'قران كريم': 'قران كريم',
    'قران': 'قران كريم',
    'تربيه اسلاميه': 'تربيه اسلاميه',
    'اسلاميه': 'تربيه اسلاميه',
    'لغه عربيه': 'لغه عربيه',
    'عربي': 'لغه عربيه',
    'لغه انجليزيه': 'لغه انجليزيه',
    'انجليزي': 'لغه انجليزيه',
    'انقليزي': 'لغه انجليزيه',
    'english': 'لغه انجليزيه',
    'رياضيات': 'رياضيات',
    'علوم': 'علوم',
    'علوم عامه': 'علوم',
    'دراسات اجتماعيه': 'اجتماعيات',
    'اجتماعيات': 'اجتماعيات',
    'حاسوب': 'حاسوب',
    'حاسب الي': 'حاسوب',
    'كمبيوتر': 'حاسوب',
  };

  if (canonicalAliases[strippedAl]) {
    return canonicalAliases[strippedAl];
  }

  return strippedAl;
}

/**
 * تحويل أي قيمة (مصفوفة أو نص مفصول بفواصل) إلى مصفوفة نصوص نظيفة
 */
export function toNormalizedList(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .flatMap((item) => (typeof item === 'string' ? item.split(/[،,]/) : [String(item ?? '')]))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(/[،,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [String(input).trim()].filter(Boolean);
}

/**
 * فحص ما إذا كانت القائمة تحتوي على رمز الشمول الكامل (all / الجميع / الكل)
 */
export function containsWildcardAll(list: unknown): boolean {
  const arr = toNormalizedList(list);
  return arr.some((item) => {
    const norm = normalizeArabicText(item);
    return (
      norm === 'all' ||
      norm === 'الجميع' ||
      norm === 'الكل' ||
      norm === '*' ||
      norm === 'كل المدارس' ||
      norm === 'كل الفروع' ||
      norm === 'كل الصفوف' ||
      norm === 'كل الشعب' ||
      norm === 'كل المواد'
    );
  });
}

/**
 * فحص تطابق مادتين مع مراعاة الفروع التربوية (مثل مشرف اللغة العربية مع النحو/القراءة، أو مشرف العلوم مع الفيزياء/الكيمياء)
 */
export function areSubjectsCompatible(subjA: string, subjB: string): boolean {
  const normA = normalizeSubject(subjA);
  const normB = normalizeSubject(subjB);
  if (!normA || !normB) return false;
  if (normA === 'all' || normB === 'all') return true;
  if (normA === normB) return true;

  const rawA = normalizeArabicText(subjA);
  const rawB = normalizeArabicText(subjB);
  if (rawA === rawB) return true;

  for (const family of NORMALIZED_SUBJECT_FAMILIES) {
    const normalizedFamily = family.map((f) => normalizeSubject(f));
    const rawFamily = family.map((f) => normalizeArabicText(f));
    const hasA = normalizedFamily.includes(normA) || rawFamily.includes(rawA);
    const hasB = normalizedFamily.includes(normB) || rawFamily.includes(rawB);
    if (hasA && hasB) {
      return true;
    }
  }

  return false;
}

/**
 * 7. hasIntersection(list1, list2, normalizer):
 * فحص التقاطع بين قائمتين مع اعتبار كلمة "all" أو "الجميع" مطابقة للكل.
 */
export function hasIntersection(
  list1: unknown,
  list2: unknown,
  normalizer: (val: string) => string = normalizeArabicText
): boolean {
  const arr1 = toNormalizedList(list1);
  const arr2 = toNormalizedList(list2);

  if (arr1.length === 0 || arr2.length === 0) return false;
  if (containsWildcardAll(arr1) || containsWildcardAll(arr2)) return true;

  const norm1 = arr1.map((item) => normalizer(item)).filter(Boolean);
  const norm2 = arr2.map((item) => normalizer(item)).filter(Boolean);

  if (norm1.includes('all') || norm2.includes('all')) return true;

  // في حال كان المطبع هو normalizeSubject ندعم أيضاً عائلات المواد التربوية
  if (normalizer === normalizeSubject) {
    for (const a of arr1) {
      for (const b of arr2) {
        if (areSubjectsCompatible(a, b)) return true;
      }
    }
  }

  const set2 = new Set(norm2);
  return norm1.some((val) => set2.has(val));
}

/**
 * 8. isAdministrativePosition(jobTitleStr, role, name):
 * فحص واستبعاد المسميات الإدارية البحتة (مدير، سكرتير، وكيل، مشرف دور، مشرف إداري، مختص، إلخ).
 */
export function isAdministrativePosition(
  jobTitleStr?: string | string[] | null,
  role?: string | null,
  name?: string | null
): boolean {
  if (role && normalizeArabicText(role) === 'admin') {
    return true;
  }

  const titles = toNormalizedList(jobTitleStr);
  const combinedTitles = titles.map((t) => normalizeArabicText(t)).join(' | ');
  const normName = normalizeArabicText(name || '');

  // الكلمات المفتاحية الدالة على الكادر التعليمي (المعلمين)
  const teachingKeywords = [
    'معلم',
    'معلمه',
    'مدرس',
    'مدرسه مادة',
    'استاذ',
    'استاذه',
    'مربي صف',
    'مربيه صف',
    'مربي الفصل',
    'هيئه تدريس',
    'تدريس',
  ];

  // المسميات الإدارية البحتة التي يجب استبعادها من قوائم المعلمين للمشرف التربوي
  const purelyAdminKeywords = [
    'مدير',
    'مديره',
    'سكرتير',
    'سكرتيره',
    'السكرتاريه',
    'سكرتاريه',
    'وكيل',
    'وكيله',
    'مشرف دور',
    'مشرفه دور',
    'مشرف اداري',
    'مشرفه اداريه',
    'مشرف عام',
    'مشرفه عامه',
    'مشرف مالي',
    'مشرف حركه',
    'مشرف مواصلات',
    'مشرف باص',
    'مشرف صحي',
    'مشرف اجتماعي',
    'مشرف انشطه',
    'مختص',
    'مختصه',
    'محاسب',
    'محاسبه',
    'امين صندوق',
    'امين مخزن',
    'امينه مخزن',
    'امين مكتبه',
    'شؤون طلاب',
    'شؤون الموظفين',
    'موارد بشريه',
    'علاقات عامه',
    'موظف اداري',
    'اداري',
    'اداريه',
    'حارس',
    'سائق',
    'عامل',
    'عامله',
    'مراسل',
    'مقصف',
  ];

  const hasAdminKeyword = purelyAdminKeywords.some((kw) => combinedTitles.includes(kw));
  const hasTeachingKeyword = teachingKeywords.some((kw) => combinedTitles.includes(kw));

  // إذا كان يحمل مسمى إدارياً بحتاً ولا يحمل مسمى تدريسياً، يُعتبر إدارياً بحتاً
  if (hasAdminKeyword && !hasTeachingKeyword) {
    return true;
  }

  // فحص إضافي في حال كان الاسم نفسه عبارة عن حساب إداري عام (مثل "مدير عام" أو "السكرتارية")
  if (
    !hasTeachingKeyword &&
    (normName === 'مدير عام' ||
      normName === 'المدير العام' ||
      normName === 'السكرتاريه' ||
      normName === 'سكرتير المدرسه')
  ) {
    return true;
  }

  return false;
}

/**
 * استخراج الصف والشعبة من حقل مركب مثل className ("الأول - أ" أو "1 / ب" أو "الصف 2 شعبة ج")
 */
export function parseGradeAndSectionFromClassName(className?: string | null): {
  grade: string;
  section: string;
} {
  if (!className) return { grade: '', section: '' };
  const raw = String(className).trim();
  if (!raw) return { grade: '', section: '' };

  // محاولة التقسيم بواسطة الفواصل الشائعة (- أو / أو | أو ،)
  const parts = raw
    .split(/[\-\/|،,]/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      grade: normalizeGrade(parts[0]),
      section: normalizeSection(parts[1]),
    };
  }

  // في حال كان النص متصلاً مثل "1 أ" أو "الأول أ"
  const norm = normalizeArabicText(raw);
  const matchNumSec = norm.match(/^(\d+|تمهيدي)\s+([^\d\s]+)$/);
  if (matchNumSec) {
    return {
      grade: normalizeGrade(matchNumSec[1]),
      section: normalizeSection(matchNumSec[2]),
    };
  }

  return {
    grade: normalizeGrade(raw),
    section: '',
  };
}

/**
 * استخراج المدارس المصرح بها للمستخدم الحالي
 */
export function getAuthorizedSchoolsForUser(supervisor?: AuthUser | User | null): string[] {
  if (!supervisor) return [];
  const schoolsSet = new Set<string>();

  const authSupervisor = supervisor as AuthUser;
  if (authSupervisor.selectedSchool) {
    toNormalizedList(authSupervisor.selectedSchool).forEach((s) => schoolsSet.add(s));
  }

  if (Array.isArray(supervisor.schools)) {
    supervisor.schools.filter(Boolean).forEach((s) => schoolsSet.add(s));
  }

  const sab = supervisor.permissions?.schoolsAndBranches;
  if (sab && typeof sab === 'object') {
    Object.keys(sab)
      .filter(Boolean)
      .forEach((s) => schoolsSet.add(s));
  }

  return Array.from(schoolsSet);
}

/**
 * استخراج الفروع المصرح بها للمستخدم الحالي في مدرسة معينة (أو بشكل عام)
 */
export function getAuthorizedBranchesForUser(
  supervisor?: AuthUser | User | null,
  targetSchool?: string | null
): string[] {
  if (!supervisor) return [];
  const branchesSet = new Set<string>();

  const authSupervisor = supervisor as AuthUser;
  if (authSupervisor.selectedBranch) {
    toNormalizedList(authSupervisor.selectedBranch).forEach((b) => branchesSet.add(b));
  }

  const sab = supervisor.permissions?.schoolsAndBranches;
  if (sab && typeof sab === 'object') {
    for (const [schKey, brList] of Object.entries(sab)) {
      if (!targetSchool || hasIntersection([schKey], [targetSchool], normalizeSchool)) {
        if (Array.isArray(brList)) {
          brList.filter(Boolean).forEach((b) => branchesSet.add(b));
        }
      }
    }
  }

  return Array.from(branchesSet);
}

export type SupervisorEntityType =
  | 'secretariatStaff'
  | 'teacherEvaluations'
  | 'schoolHomeworks'
  | 'GradeSheets'
  | 'dailyPreparations'
  | 'peerVisits'
  | 'generic';

/**
 * استنتاج نوع الكيان تلقائياً إذا لم يتم تمريره صراحةً
 */
function detectEntityType(entity: Record<string, any>, explicitType?: string): SupervisorEntityType {
  if (explicitType) {
    const clean = explicitType.trim();
    if (
      clean === 'secretariatStaff' ||
      clean === 'teacherEvaluations' ||
      clean === 'schoolHomeworks' ||
      clean === 'GradeSheets' ||
      clean === 'dailyPreparations' ||
      clean === 'peerVisits'
    ) {
      return clean;
    }
  }

  if ('evaluationType' in entity || 'evaluatorId' in entity || 'visitType' in entity) {
    return 'teacherEvaluations';
  }
  if ('targetGrade' in entity && 'targetSection' in entity && 'subjectName' in entity) {
    return 'schoolHomeworks';
  }
  if ('sheetName' in entity && 'cells' in entity) {
    return 'GradeSheets';
  }
  if ('supervisionStatus' in entity && 'objectives' in entity) {
    return 'dailyPreparations';
  }
  if ('visitingTeacherNames' in entity || 'visitedTeacherName' in entity) {
    return 'peerVisits';
  }
  if (
    'jobTitle' in entity ||
    'jobTitles' in entity ||
    (Array.isArray(entity.subjects) && Array.isArray(entity.grades))
  ) {
    return 'secretariatStaff';
  }

  return 'generic';
}

/**
 * 2. دالة الفحص والعزل الصارم isEntityVisibleToSupervisor:
 * تفحص أي سجل أو كادر وتحدد ظهوره للمستخدم الحالي:
 * - إذا كان دور المستخدم admin أو لديه permissions.all === true: يرى كل شيء فوراً.
 * - المدرسة والفرع: مطابقة إلزامية بعد التطبيع.
 * - كادر المعلمين (secretariatStaff): استبعاد الإداريين، واشتراط وجود مواد تدريسية،
 *   واشتراط تقاطع المواد والصفوف والشعب (إذا كانت شعب المعلم فارغة [] أو all تُعتبر مطابقة لكافة الشعب).
 * - التقارير والزيارات وكشوف الدرجات والواجبات (teacherEvaluations, schoolHomeworks, GradeSheets):
 *   اشتراط تطابق الفرع والصف والمادة والشعبة مع اختصاص المشرف.
 */
export function isEntityVisibleToSupervisor(
  entity: Record<string, any> | null | undefined,
  supervisorOrType?: AuthUser | User | SupervisorEntityType | string | null,
  maybeSupervisorOrType?: AuthUser | User | SupervisorEntityType | string | null
): boolean {
  if (!entity || typeof entity !== 'object') return false;

  // دعم مرن لترتيب المعاملات: (entity, supervisor, entityType) أو (entity, entityType, supervisor)
  let supervisor: AuthUser | User | null | undefined = null;
  let explicitType: string | undefined = undefined;

  if (typeof supervisorOrType === 'string') {
    explicitType = supervisorOrType;
    supervisor = maybeSupervisorOrType as AuthUser | User | null | undefined;
  } else {
    supervisor = supervisorOrType as AuthUser | User | null | undefined;
    if (typeof maybeSupervisorOrType === 'string') {
      explicitType = maybeSupervisorOrType;
    }
  }

  if (!supervisor) return false;

  // 1. المدير العام أو من لديه صلاحية شاملة يرى كل شيء فوراً
  if (supervisor.role === 'admin' || supervisor.permissions?.all === true) {
    return true;
  }

  // 2. مطابقة المدرسة (إلزامية بعد التطبيع)
  const entitySchools = toNormalizedList(
    entity.school ?? entity.schoolName ?? entity.schoolId ?? entity.schools ?? entity.schoolNames
  );
  const supervisorSchools = getAuthorizedSchoolsForUser(supervisor);

  if (entitySchools.length > 0 && supervisorSchools.length > 0) {
    if (!hasIntersection(entitySchools, supervisorSchools, normalizeSchool)) {
      return false;
    }
  } else if (entitySchools.length > 0 && supervisorSchools.length === 0) {
    return false;
  }

  // 3. مطابقة الفرع (إلزامية بعد التطبيع)
  const entityBranches = toNormalizedList(entity.branch ?? entity.branchName ?? entity.branches);
  const matchedSchoolForBranch = entitySchools[0] || (supervisor as AuthUser).selectedSchool || '';
  const supervisorBranches = getAuthorizedBranchesForUser(supervisor, matchedSchoolForBranch);

  if (entityBranches.length > 0 && supervisorBranches.length > 0) {
    if (!hasIntersection(entityBranches, supervisorBranches, normalizeBranch)) {
      return false;
    }
  }

  const resolvedType = detectEntityType(entity, explicitType);
  const supervisorSubjects = toNormalizedList(supervisor.subjects);
  const supervisorGrades = toNormalizedList(supervisor.grades);
  const supervisorSections = toNormalizedList(supervisor.sections);

  // 4. فحص كادر المعلمين (secretariatStaff)
  if (resolvedType === 'secretariatStaff') {
    // أ) استبعاد المسميات الإدارية البحتة
    const rawJobTitle = entity.jobTitles ?? entity.jobTitle ?? '';
    if (isAdministrativePosition(rawJobTitle, entity.role, entity.name)) {
      return false;
    }

    // ب) اشتراط وجود مواد تدريسية للمعلم
    const teacherSubjects = toNormalizedList(entity.subjects ?? entity.subject);
    if (teacherSubjects.length === 0) {
      return false;
    }

    // ج) اشتراط تقاطع المواد التدريسية مع مواد المشرف (إذا كان للمشرف مواد محددة)
    if (supervisorSubjects.length > 0) {
      if (!hasIntersection(supervisorSubjects, teacherSubjects, normalizeSubject)) {
        return false;
      }
    }

    // د) اشتراط تقاطع الصفوف مع صفوف المشرف (إذا كان للمشرف صفوف محددة)
    const teacherGrades = toNormalizedList(entity.grades ?? entity.grade);
    if (supervisorGrades.length > 0) {
      if (teacherGrades.length === 0 || !hasIntersection(supervisorGrades, teacherGrades, normalizeGrade)) {
        return false;
      }
    }

    // هـ) اشتراط تقاطع الشعب مع شعب المشرف
    // (إذا كانت شعب المعلم فارغة [] أو all تُعتبر مطابقة لكافة الشعب)
    const teacherSections = toNormalizedList(entity.sections ?? entity.section);
    if (supervisorSections.length > 0 && !containsWildcardAll(supervisorSections)) {
      const teacherMatchesAllSections =
        teacherSections.length === 0 || containsWildcardAll(teacherSections);
      if (
        !teacherMatchesAllSections &&
        !hasIntersection(supervisorSections, teacherSections, normalizeSection)
      ) {
        return false;
      }
    }

    return true;
  }

  // 5. فحص التقارير والزيارات وكشوف الدرجات والواجبات والتحضير والزيارات التبادلية
  if (
    resolvedType === 'teacherEvaluations' ||
    resolvedType === 'schoolHomeworks' ||
    resolvedType === 'GradeSheets' ||
    resolvedType === 'dailyPreparations' ||
    resolvedType === 'peerVisits'
  ) {
    // إذا كان المستخدم هو منشئ السجل نفسه، يُسمح له برؤيته بشرط تطابق المدرسة والفرع
    const creatorId =
      entity.userId || entity.evaluatorId || entity.teacherId || entity.createdByUserId;
    if (creatorId && supervisor.id && String(creatorId) === String(supervisor.id)) {
      return true;
    }

    // استخراج المادة والصف والشعبة من السجل بمختلف مسميات الحقول
    const recordSubjects = toNormalizedList(
      entity.subject ??
        entity.subjectName ??
        entity.visitingSubject ??
        entity.visitedSubject ??
        entity.subjects
    );

    const parsedClass = parseGradeAndSectionFromClassName(
      entity.className ?? entity.visitingClass ?? entity.visitedClass
    );

    const recordGrades = toNormalizedList(
      entity.grade ?? entity.targetGrade ?? entity.grades ?? (parsedClass.grade || undefined)
    );

    const recordSections = toNormalizedList(
      entity.section ?? entity.targetSection ?? entity.sections ?? (parsedClass.section || undefined)
    );

    // تطابق المادة مع اختصاص المشرف
    if (supervisorSubjects.length > 0 && recordSubjects.length > 0) {
      if (!hasIntersection(supervisorSubjects, recordSubjects, normalizeSubject)) {
        return false;
      }
    }

    // تطابق الصف مع اختصاص المشرف
    if (supervisorGrades.length > 0 && recordGrades.length > 0) {
      if (!hasIntersection(supervisorGrades, recordGrades, normalizeGrade)) {
        return false;
      }
    }

    // تطابق الشعبة مع اختصاص المشرف
    if (
      supervisorSections.length > 0 &&
      !containsWildcardAll(supervisorSections) &&
      recordSections.length > 0 &&
      !containsWildcardAll(recordSections)
    ) {
      if (!hasIntersection(supervisorSections, recordSections, normalizeSection)) {
        return false;
      }
    }

    return true;
  }

  // 6. أي سجل عام آخر: يكتفي بمطابقة المدرسة والفرع وتقاطع الصف/الشعبة/المادة إن وُجدت في السجل
  if (supervisorGrades.length > 0 && (entity.grade || entity.targetGrade)) {
    const recGrades = toNormalizedList(entity.grade ?? entity.targetGrade);
    if (recGrades.length > 0 && !hasIntersection(supervisorGrades, recGrades, normalizeGrade)) {
      return false;
    }
  }

  if (
    supervisorSections.length > 0 &&
    !containsWildcardAll(supervisorSections) &&
    (entity.section || entity.targetSection)
  ) {
    const recSections = toNormalizedList(entity.section ?? entity.targetSection);
    if (
      recSections.length > 0 &&
      !containsWildcardAll(recSections) &&
      !hasIntersection(supervisorSections, recSections, normalizeSection)
    ) {
      return false;
    }
  }

  if (supervisorSubjects.length > 0 && (entity.subject || entity.subjectName)) {
    const recSubjects = toNormalizedList(entity.subject ?? entity.subjectName);
    if (recSubjects.length > 0 && !hasIntersection(supervisorSubjects, recSubjects, normalizeSubject)) {
      return false;
    }
  }

  return true;
}

/**
 * خريطة ربط مفاتيح البيانات (AppData & Standalone Tables) بالشاشات/الوحدات الصلاحية المقابلة لها
 * لفحص سياسة القراءة فقط (readOnly) وتجاوزاتها (allowEdits).
 */
export const DATA_KEY_TO_PERMISSION_MODULES: Record<string, (keyof UserPermissions)[]> = {
  secretariatStudents: ['secretariat'],
  secretariatStaff: ['secretariat'],
  timetable: ['secretariat'],
  customSupervisionCriteria: ['secretariat', 'educationalSupervision'],
  dailyReports: ['dailyFollowUp'],
  metricsList: ['dailyFollowUp', 'secretariat'],
  branchMetrics: ['dailyFollowUp', 'secretariat'],
  adminReports: ['adminFollowUp'],
  adminIndividualReports: ['adminFollowUp'],
  adminMetricsList: ['adminFollowUp', 'secretariat'],
  adminBranchMetrics: ['adminFollowUp', 'secretariat'],
  adminActivitiesList: ['adminFollowUp', 'secretariat'],
  adminBranchActivities: ['adminFollowUp', 'secretariat'],
  adminIndividualReportFields: ['adminFollowUp', 'secretariat'],
  adminFollowUpTypes: ['adminFollowUp', 'secretariat'],
  studentReports: ['studentAffairs', 'secretariat'],
  violations: ['studentAffairs'],
  parentVisits: ['studentAffairs'],
  teacherFollowUps: ['teacherPortal', 'dailyFollowUp'],
  selfEvaluations: ['teacherPortal', 'educationalSupervision'],
  selfEvaluationTemplates: ['teacherPortal', 'educationalSupervision'],
  studentEvaluations: ['teacherPortal', 'educationalSupervision'],
  dailyPreparations: ['teacherPortal', 'educationalSupervision'],
  teacherEvaluations: ['educationalSupervision'],
  peerVisits: ['educationalSupervision'],
  deliveryReceiptRecords: ['educationalSupervision', 'specialReports'],
  substitutions: ['substitutions'],
  schoolProfile: ['schoolProfile', 'secretariat'],
  profile: ['schoolProfile', 'secretariat'],
  profiles: ['schoolProfile', 'secretariat'],
  schoolBranches: ['schoolProfile', 'secretariat'],
  availableSchools: ['schoolProfile'],
  availableYears: ['schoolProfile'],
  users: ['userManagement', 'specialCodes'],
  taskReports: ['specialReports', 'dashboard'],
  genericSpecialReports: ['specialReports'],
  addedTasks: ['specialReports', 'educationalSupervision'],
  postponedTasks: ['specialReports', 'educationalSupervision'],
  studentReinforcements: ['specialReports', 'studentAffairs'],
  issueRecommendations: ['specialReports', 'educationalSupervision'],
  creativityRecords: ['specialReports', 'educationalSupervision'],
  absenceLogs: ['specialReports', 'studentAffairs'],
  studentLatenessLogs: ['specialReports', 'studentAffairs'],
  studentViolationLogs: ['specialReports', 'studentAffairs'],
  exitLogs: ['specialReports', 'studentAffairs'],
  damageLogs: ['specialReports', 'studentAffairs'],
  parentVisitLogs: ['specialReports', 'studentAffairs'],
  examLogs: ['specialReports', 'studentAffairs'],
  notebookFollowUpLogs: ['specialReports', 'educationalSupervision'],
  notebookReportArchives: ['specialReports', 'educationalSupervision'],
  transportBuses: ['transport', 'specialReports'],
  transportLogs: ['transport', 'specialReports'],
  transportDailyStatus: ['transport', 'specialReports'],
  financeRecords: ['finance', 'specialReports'],
  communicationPosts: ['communicationDev'],
  schoolHomeworks: ['communicationDev', 'teacherPortal', 'educationalSupervision'],
  schoolActivities: ['schoolActivities', 'specialReports'],
  issues: ['issuesModal'],
  issuesAndSolutions: ['issuesModal'],
  trainingCourses: ['trainingCourses'],
  trainingEvaluations: ['trainingCourses'],
  courseEvaluationSchema_v3: ['trainingCourses'],
  caseStudies: ['caseStudyModal'],
  comprehensiveIndicators: ['comprehensiveIndicators'],
  gradeSheets: ['gradeSheets', 'teacherPortal', 'educationalSupervision'],
  studentGradeSheets: ['gradeSheets', 'teacherPortal', 'educationalSupervision'],
  allSubjectsGradeSheets: ['gradeSheets', 'teacherPortal', 'educationalSupervision'],
  taskTemplates: ['dashboard'],
};

/**
 * 3. تطبيق سياسة القراءة فقط (readOnly) وتجاوزاتها (allowEdits):
 * تتحقق مما إذا كان المستخدم مسموحاً له بالتعديل/الحذف في وحدة أو مفتاح بيانات معين.
 * إذا كان permissions.readOnly === true، يُمنع التعديل والحذف إلا إذا احتوت مصفوفة الشاشة المعنية صراحة على 'allowEdits'.
 */
export function canUserModifyDataKey(
  user?: AuthUser | User | null,
  dataKeyOrModule?: string | string[]
): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.permissions?.all === true) {
    return true;
  }

  const perms = user.permissions;
  if (!perms) return false;

  // إذا لم يكن المستخدم مقيداً بوضع القراءة فقط العام، نتحقق فقط من عدم تعطيل الشاشة بـ 'disable'
  if (!perms.readOnly) {
    if (!dataKeyOrModule) return true;
    const keys = Array.isArray(dataKeyOrModule) ? dataKeyOrModule : [dataKeyOrModule];
    return keys.every((k) => {
      const modules = DATA_KEY_TO_PERMISSION_MODULES[k] || [k as keyof UserPermissions];
      return !modules.every((mod) => {
        const val = perms[mod];
        return Array.isArray(val) && val.includes('disable');
      });
    });
  }

  // المستخدم مقيد بـ permissions.readOnly === true:
  // يُمنع التعديل والحذف إلا إذا احتوت مصفوفة الشاشة المعنية صراحةً على 'allowEdits'
  if (!dataKeyOrModule) return false;

  const keysToCheck = Array.isArray(dataKeyOrModule) ? dataKeyOrModule : [dataKeyOrModule];
  if (keysToCheck.length === 0) return false;

  return keysToCheck.every((key) => {
    const candidateModules = DATA_KEY_TO_PERMISSION_MODULES[key] || [key as keyof UserPermissions];
    return candidateModules.some((modName) => {
      const modPerms = perms[modName];
      return (
        Array.isArray(modPerms) &&
        modPerms.includes('allowEdits') &&
        !modPerms.includes('disable')
      );
    });
  });
}

/**
 * دالة مساعدة تتحقق مما إذا كانت شاشة معينة في وضع "للقراءة فقط" للمستخدم الحالي
 */
export function isModuleReadOnly(
  user?: AuthUser | User | null,
  moduleKey?: keyof UserPermissions | string
): boolean {
  return !canUserModifyDataKey(user, moduleKey);
}
