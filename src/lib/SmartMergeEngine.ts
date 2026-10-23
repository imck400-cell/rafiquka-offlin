import { AuthUser } from '../../types';
import {
  localDB,
  makeSchoolSharedId,
  makeUserCollectionId,
  GLOBAL_CONFIG_KEYS,
} from './localDB';
import {
  normalizeArabicText,
  normalizeSchool,
  hasIntersection,
} from './NormalizationEngine';
import { stampRecord, stampArrayRecords } from './recordStamping';
import {
  BundleDateRange,
  BundlePayloadData,
  BundleType,
  SchpackHeader,
  createSignedEncryptedBundle,
  verifyAndDecryptBundle,
} from './BundleCryptoEngine';

export interface TableMergeStats {
  added: number;
  updated: number;
  ignored: number;
}

export interface MergeExecutionReport {
  bundleType: BundleType;
  senderId: string;
  senderName: string;
  senderRole: string;
  schoolName: string;
  exportedAt: string;
  dateRange: BundleDateRange;
  addedCount: number;
  updatedCount: number;
  ignoredCount: number;
  totalProcessed: number;
  detailsByTable: Record<string, TableMergeStats>;
}

/**
 * مفاتيح البيانات التي تُصدّر ضمن حزمة تهيئة المدرسة (MASTER_SEED) من المدير أو السكرتير
 */
export const MASTER_SEED_SHARED_KEYS = [
  'profile',
  'secretariatStaff',
  'secretariatStudents',
  'customSupervisionCriteria',
  'selfEvaluationTemplates',
  'courseEvaluationSchema_v3',
  'metricsList',
  'adminMetricsList',
  'branchMetrics',
  'adminBranchMetrics',
  'adminFollowUpTypes',
  'adminActivitiesList',
  'adminBranchActivities',
  'adminIndividualReportFields',
  'timetable',
  'transportBuses',
] as const;

/**
 * مفاتيح سجلات الأعمال والتقارير التي تُصدّر ضمن حزمة أعمال الموظف (DELTA_WORK)
 */
export const DELTA_WORK_SHARED_KEYS = [
  'dailyReports',
  'adminReports',
  'adminIndividualReports',
  'teacherEvaluations',
  'peerVisits',
  'deliveryReceiptRecords',
  'dailyPreparations',
  'selfEvaluations',
  'studentEvaluations',
  'schoolHomeworks',
  'communicationPosts',
  'substitutions',
  'violations',
  'parentVisits',
  'teacherFollowUps',
  'studentReports',
  'absenceLogs',
  'studentLatenessLogs',
  'studentViolationLogs',
  'exitLogs',
  'damageLogs',
  'parentVisitLogs',
  'examLogs',
  'notebookFollowUpLogs',
  'notebookReportArchives',
  'genericSpecialReports',
  'taskReports',
  'addedTasks',
  'postponedTasks',
  'studentReinforcements',
  'issueRecommendations',
  'creativityRecords',
  'trainingEvaluations',
  'transportLogs',
  'transportDailyStatus',
  'financeRecords',
] as const;

/**
 * فحص ما إذا كان السجل يقع ضمن النطاق الزمني المحدد (dateRange)
 */
function isRecordWithinDateRange(
  record: Record<string, any>,
  dateRange?: BundleDateRange
): boolean {
  if (!dateRange || (!dateRange.from && !dateRange.to)) return true;

  const rawDate =
    record.date ||
    record.dateStr ||
    record.evaluationDate ||
    record.courseDate ||
    record.publishDate ||
    (typeof record.createdAt === 'string' ? record.createdAt.substring(0, 10) : null) ||
    (typeof record.updatedAt === 'string' ? record.updatedAt.substring(0, 10) : null) ||
    (typeof record.timestamp === 'string' ? record.timestamp.substring(0, 10) : null);

  if (!rawDate || typeof rawDate !== 'string') return true;

  const cleanDate = rawDate.split(' ')[0].trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(cleanDate)) return true;

  const isoDay = cleanDate.substring(0, 10);
  if (dateRange.from && isoDay < dateRange.from) return false;
  if (dateRange.to && isoDay > dateRange.to) return false;

  return true;
}

/**
 * فحص ما إذا كان السجل يخص الموظف المصدر للحزمة (أو أنشأه/عدّله)
 */
function doesRecordBelongToSender(
  record: Record<string, any>,
  sender: AuthUser
): boolean {
  if (!record || typeof record !== 'object') return false;

  const senderId = String(sender.id || '').trim();
  const normSenderName = normalizeArabicText(sender.name);

  const idCandidates = [
    record.createdByUserId,
    record.userId,
    record.evaluatorId,
    record.teacherId,
    record.authorId,
  ]
    .filter(Boolean)
    .map((v) => String(v).trim());

  if (senderId && idCandidates.includes(senderId)) {
    return true;
  }

  const nameCandidates = [
    record.createdByName,
    record.userName,
    record.evaluatorName,
    record.teacherName,
    record.authorName,
    record.writer,
    record.supervisorName,
  ]
    .filter(Boolean)
    .map((v) => normalizeArabicText(v));

  if (normSenderName && nameCandidates.includes(normSenderName)) {
    return true;
  }

  // إذا كان المدير العام هو من يصدر حزمة DELTA، يمكنه تصدير سجلات المدرسة المختارة
  if (sender.role === 'admin' || sender.permissions?.all === true) {
    return true;
  }

  return false;
}

/**
 * مقارنة سجلين لتحديد ما إذا كان السجل الوارد أحدث من السجل المحلي:
 * 1. نقارن حقل version أولاً (لمنع تضارب ساعات الهواتف).
 * 2. إذا تساوى version، نقارن حقل updatedAt / timestamp.
 */
export function isIncomingRecordNewer(
  incoming: Record<string, any>,
  existing: Record<string, any>
): boolean {
  const incVer = typeof incoming.version === 'number' ? incoming.version : 1;
  const extVer = typeof existing.version === 'number' ? existing.version : 1;

  if (incVer > extVer) return true;
  if (incVer < extVer) return false;

  const incTime =
    incoming.updatedAt || incoming.timestamp || incoming.createdAt || '';
  const extTime =
    existing.updatedAt || existing.timestamp || existing.createdAt || '';

  if (incTime && extTime && incTime !== extTime) {
    return String(incTime) > String(extTime);
  }

  // إذا تساوى الإصدار والتوقيت ولكن تغير المحتوى، نتحقق مما إذا كان هناك اختلاف
  return JSON.stringify(incoming) !== JSON.stringify(existing);
}

/**
 * خوارزمية الدمج الذكي لقائمة سجلات (Upsert by id/uuid + version + updatedAt)
 * دون مسح أي سجل محلي آخر.
 */
export function smartMergeRecordArray(
  localArray: Record<string, any>[],
  incomingArray: Record<string, any>[],
  stats: TableMergeStats,
  fallbackIdentityFn?: (item: Record<string, any>) => string | null
): Record<string, any>[] {
  const safeLocal = Array.isArray(localArray) ? [...localArray] : [];
  const safeIncoming = Array.isArray(incomingArray) ? incomingArray : [];

  if (safeIncoming.length === 0) return safeLocal;

  const idToIndexMap = new Map<string, number>();
  const fallbackToIndexMap = new Map<string, number>();

  safeLocal.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const itemId = item.id || item.uuid;
    if (itemId) {
      idToIndexMap.set(String(itemId), index);
    }
    if (fallbackIdentityFn) {
      const fbKey = fallbackIdentityFn(item);
      if (fbKey) {
        fallbackToIndexMap.set(fbKey, index);
      }
    }
  });

  for (const incomingItem of safeIncoming) {
    if (!incomingItem || typeof incomingItem !== 'object') continue;

    const incId = incomingItem.id || incomingItem.uuid;
    let matchedIndex: number | undefined = incId
      ? idToIndexMap.get(String(incId))
      : undefined;

    if (matchedIndex === undefined && fallbackIdentityFn) {
      const fbKey = fallbackIdentityFn(incomingItem);
      if (fbKey) {
        matchedIndex = fallbackToIndexMap.get(fbKey);
      }
    }

    if (matchedIndex === undefined) {
      // سجل جديد غير موجود محلياً -> يُضاف فوراً
      const stampedNew = incId ? incomingItem : stampRecord(incomingItem);
      const newIdx = safeLocal.length;
      safeLocal.push(stampedNew);
      if (stampedNew.id) {
        idToIndexMap.set(String(stampedNew.id), newIdx);
      }
      if (fallbackIdentityFn) {
        const fbKey = fallbackIdentityFn(stampedNew);
        if (fbKey) fallbackToIndexMap.set(fbKey, newIdx);
      }
      stats.added++;
    } else {
      // سجل موجود محلياً -> نفحص version ثم updatedAt
      const existingItem = safeLocal[matchedIndex];
      if (isIncomingRecordNewer(incomingItem, existingItem)) {
        safeLocal[matchedIndex] = {
          ...existingItem,
          ...incomingItem,
          id: existingItem.id || incomingItem.id,
        };
        stats.updated++;
      } else {
        stats.ignored++;
      }
    }
  }

  return safeLocal;
}

/**
 * خوارزمية دمج مصفوفات متابعة المعلمين اليومية (dailyReports):
 * تطبق آلية الدمج التراكمي لتقييمات اليوم الواحد بين المشرفين باعتماد أعلى درجة مسجلة
 * لكل معيار (Math.max) ودمج الملاحظات والتعزيزات دون فقدان أي بيانات.
 */
export function smartMergeDailyReportsArray(
  localReports: Record<string, any>[],
  incomingReports: Record<string, any>[],
  stats: TableMergeStats
): Record<string, any>[] {
  // أولاً: دمج السجلات حسب المعرّف id
  const mergedById = smartMergeRecordArray(localReports, incomingReports, stats);

  // ثانياً: الدمج التراكمي لتقارير اليوم الواحد (periodType === 'daily') لنفس التاريخ dateStr
  const dailyByDate = new Map<string, Record<string, any>[]>();
  mergedById.forEach((rep) => {
    if (!rep || typeof rep !== 'object') return;
    if ((rep.periodType || 'daily') === 'daily' && rep.dateStr) {
      const list = dailyByDate.get(rep.dateStr) || [];
      list.push(rep);
      dailyByDate.set(rep.dateStr, list);
    }
  });

  for (const [, group] of dailyByDate.entries()) {
    if (group.length <= 1) continue;

    const maxScoresByTeacher: Record<string, Record<string, number>> = {};
    const notesByTeacher: Record<string, Set<string>> = {};
    const reinforcementsByTeacher: Record<string, Set<string>> = {};
    const unaccreditedByTeacher: Record<string, Set<string>> = {};
    const extraNotesByTeacher: Record<string, Set<string>> = {};

    for (const rep of group) {
      const teachersData = Array.isArray(rep.teachersData) ? rep.teachersData : [];
      for (const t of teachersData) {
        if (!t || !t.teacherName) continue;
        const normName = normalizeArabicText(t.teacherName);
        if (!normName) continue;

        if (!maxScoresByTeacher[normName]) maxScoresByTeacher[normName] = {};
        if (!notesByTeacher[normName]) notesByTeacher[normName] = new Set();
        if (!reinforcementsByTeacher[normName]) reinforcementsByTeacher[normName] = new Set();
        if (!unaccreditedByTeacher[normName]) unaccreditedByTeacher[normName] = new Set();
        if (!extraNotesByTeacher[normName]) extraNotesByTeacher[normName] = new Set();

        for (const [k, val] of Object.entries(t)) {
          if (typeof val === 'number' && k !== 'order') {
            maxScoresByTeacher[normName][k] = Math.max(
              maxScoresByTeacher[normName][k] ?? 0,
              val
            );
          }
        }

        if (Array.isArray(t.violations_notes)) {
          t.violations_notes.forEach((n: string) => {
            if (n && n.trim()) notesByTeacher[normName].add(n.trim());
          });
        }
        if (Array.isArray(t.reinforcements)) {
          t.reinforcements.forEach((r: string) => {
            if (r && r.trim()) reinforcementsByTeacher[normName].add(r.trim());
          });
        }
        if (Array.isArray(t.unaccreditedMetrics)) {
          t.unaccreditedMetrics.forEach((m: string) => {
            if (m && m.trim()) unaccreditedByTeacher[normName].add(m.trim());
          });
        }
        if (
          typeof t.additional_violation_notes === 'string' &&
          t.additional_violation_notes.trim()
        ) {
          extraNotesByTeacher[normName].add(t.additional_violation_notes.trim());
        }
      }
    }

    // تحديث جميع تقارير ذلك اليوم بالحصيلة التراكمية المدمجة
    for (const rep of group) {
      if (!Array.isArray(rep.teachersData)) continue;
      rep.teachersData = rep.teachersData.map((t: any) => {
        if (!t || !t.teacherName) return t;
        const normName = normalizeArabicText(t.teacherName);
        if (!normName || !maxScoresByTeacher[normName]) return t;

        const mergedTeacher = { ...t };
        for (const [metricKey, maxVal] of Object.entries(maxScoresByTeacher[normName])) {
          mergedTeacher[metricKey] = maxVal;
        }
        if (notesByTeacher[normName].size > 0) {
          mergedTeacher.violations_notes = Array.from(notesByTeacher[normName]);
        }
        if (reinforcementsByTeacher[normName].size > 0) {
          mergedTeacher.reinforcements = Array.from(reinforcementsByTeacher[normName]);
        }
        if (unaccreditedByTeacher[normName].size > 0) {
          mergedTeacher.unaccreditedMetrics = Array.from(unaccreditedByTeacher[normName]);
        }
        if (extraNotesByTeacher[normName].size > 0) {
          mergedTeacher.additional_violation_notes = Array.from(
            extraNotesByTeacher[normName]
          ).join(' | ');
        }
        return mergedTeacher;
      });
    }
  }

  return mergedById;
}

/**
 * بناء حمولة حزمة أعمال الموظف (DELTA_WORK) أو حزمة تهيئة المدرسة (MASTER_SEED) من localDB
 */
export async function buildExportBundlePayload(
  currentUser: AuthUser,
  options: {
    type: 'DELTA' | 'MASTER';
    dateRange?: BundleDateRange;
    targetSchool?: string;
  }
): Promise<{
  bundleType: BundleType;
  schoolName: string;
  payload: BundlePayloadData;
}> {
  const bundleType: BundleType =
    options.type === 'MASTER' ? 'MASTER_SEED' : 'DELTA_WORK';

  const rawSchool =
    options.targetSchool ||
    currentUser.selectedSchool?.split(',')[0]?.trim() ||
    currentUser.schools?.[0] ||
    'المدرسة الافتراضية';

  const targetSchools =
    rawSchool === 'all'
      ? (await localDB.systemConfigs.get('availableSchools'))?.data || ['المدرسة الافتراضية']
      : rawSchool.split(',').map((s) => s.trim()).filter(Boolean);

  const primarySchoolName = targetSchools[0] || 'المدرسة الافتراضية';

  const payload: BundlePayloadData = {
    systemConfigs: {},
    users: [],
    schoolSharedData: {},
    userCollections: [],
    standaloneTables: {},
  };

  if (bundleType === 'MASTER_SEED') {
    // 1. الإعدادات العامة للمدرسة والفروع والأعوام
    const allConfigs = await localDB.systemConfigs.toArray();
    for (const cfg of allConfigs) {
      if (GLOBAL_CONFIG_KEYS.includes(cfg.key as any)) {
        payload.systemConfigs![cfg.key] = cfg.data;
      }
    }

    // 2. المستخدمون المصرح لهم في المدرسة
    const allUsers = await localDB.users.toArray();
    payload.users = allUsers.filter(
      (u) =>
        u.role === 'admin' ||
        u.permissions?.all === true ||
        hasIntersection(u.schools, targetSchools, normalizeSchool)
    );

    // 3. بيانات التهيئة المشتركة للمدرسة (الكادر، الطلاب، الملف التعريفي، المعايير، الجدول، الباصات)
    const allShared = await localDB.schoolSharedData.toArray();
    for (const row of allShared) {
      if (!hasIntersection([row.schoolId], targetSchools, normalizeSchool)) continue;
      if (!MASTER_SEED_SHARED_KEYS.includes(row.key as any)) continue;

      if (!payload.schoolSharedData![row.schoolId]) {
        payload.schoolSharedData![row.schoolId] = {};
      }
      payload.schoolSharedData![row.schoolId][row.key] = row.data;
    }
  } else {
    // حزمة أعمال الموظف (DELTA_WORK):
    // 1. السجلات المشتركة التي أنشأها الموظف ضمن الفترة الزمنية المحددة
    const allShared = await localDB.schoolSharedData.toArray();
    for (const row of allShared) {
      if (!hasIntersection([row.schoolId], targetSchools, normalizeSchool)) continue;
      if (!DELTA_WORK_SHARED_KEYS.includes(row.key as any)) continue;
      if (!Array.isArray(row.data)) continue;

      const filteredItems = row.data.filter(
        (item: any) =>
          doesRecordBelongToSender(item, currentUser) &&
          isRecordWithinDateRange(item, options.dateRange)
      );

      if (filteredItems.length > 0) {
        if (!payload.schoolSharedData![row.schoolId]) {
          payload.schoolSharedData![row.schoolId] = {};
        }
        payload.schoolSharedData![row.schoolId][row.key] = stampArrayRecords(
          filteredItems,
          filteredItems,
          { id: currentUser.id, name: currentUser.name }
        );
      }
    }

    // 2. مجموعات المستخدم الخاصة (userCollections)
    const allUserCols = await localDB.userCollections
      .where('userId')
      .equals(currentUser.id)
      .toArray();

    for (const uCol of allUserCols) {
      if (!hasIntersection([uCol.schoolId], targetSchools, normalizeSchool)) continue;
      const items = Array.isArray(uCol.items)
        ? uCol.items.filter((item: any) =>
            isRecordWithinDateRange(item, options.dateRange)
          )
        : uCol.items;

      payload.userCollections!.push({
        schoolId: uCol.schoolId,
        userId: uCol.userId,
        key: uCol.key,
        items,
      });
    }

    // 3. الجداول المستقلة الستة (GradeSheets, StudentGradeSheets, AllSubjectsGradeSheets, CaseStudies, Issues, SchoolActivities)
    const filterStandalone = (rows: Record<string, any>[]) =>
      rows.filter((r) => {
        const rSchool = r.schoolName || r.school || '';
        if (rSchool && !hasIntersection([rSchool], targetSchools, normalizeSchool)) {
          return false;
        }
        return (
          doesRecordBelongToSender(r, currentUser) &&
          isRecordWithinDateRange(r, options.dateRange)
        );
      });

    const [
      gradeSheets,
      studentGradeSheets,
      allSubjectsGradeSheets,
      caseStudies,
      issuesAndSolutions,
      schoolActivities,
    ] = await Promise.all([
      localDB.gradeSheets.toArray(),
      localDB.studentGradeSheets.toArray(),
      localDB.allSubjectsGradeSheets.toArray(),
      localDB.caseStudies.toArray(),
      localDB.issuesAndSolutions.toArray(),
      localDB.schoolActivities.toArray(),
    ]);

    payload.standaloneTables = {
      gradeSheets: filterStandalone(gradeSheets),
      studentGradeSheets: filterStandalone(studentGradeSheets),
      allSubjectsGradeSheets: filterStandalone(allSubjectsGradeSheets),
      caseStudies: filterStandalone(caseStudies),
      issuesAndSolutions: filterStandalone(issuesAndSolutions),
      schoolActivities: filterStandalone(schoolActivities),
    };
  }

  return {
    bundleType,
    schoolName: primarySchoolName,
    payload,
  };
}

/**
 * توليد وتشفير حزمة (.schpack) كاملة جاهزة للحفظ أو الإرسال
 */
export async function generateEncryptedSchpackString(
  currentUser: AuthUser,
  options: {
    type: 'DELTA' | 'MASTER';
    dateRange?: BundleDateRange;
    targetSchool?: string;
  }
): Promise<{
  content: string;
  filename: string;
  bundleType: BundleType;
  schoolName: string;
}> {
  const { bundleType, schoolName, payload } = await buildExportBundlePayload(
    currentUser,
    options
  );

  const encryptedContent = await createSignedEncryptedBundle(
    {
      bundleType,
      schoolName,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      dateRange: options.dateRange,
    },
    payload
  );

  const dateTag = new Date().toISOString().split('T')[0];
  const safeSender = (currentUser.name || 'user').replace(/\s+/g, '_');
  const safeSchool = (schoolName || 'school').replace(/\s+/g, '_');
  const prefix = bundleType === 'MASTER_SEED' ? 'تهيئة_مدرسة' : 'أعمال';
  const filename = `${prefix}_${safeSender}_${safeSchool}_${dateTag}.schpack`;

  return {
    content: encryptedContent,
    filename,
    bundleType,
    schoolName,
  };
}

/**
 * محرك الدمج الذكي في قاعدة البيانات المحلية (Smart Upsert into localDB):
 * - يتحقق أولاً من التوقيع الرقمي وفك التشفير عبر verifyAndDecryptBundle.
 * - يمنع مسح أي جدول محلي.
 * - يعزل بيانات كل مدرسة داخل مدرستها المطابقة.
 * - يدمج السجلات حسب (id / version / updatedAt) ويدمج متابعات المعلمين اليومية تراكمياً.
 * - يُرجع تقريراً إحصائياً مفصلاً (المضافة، المحدثة، المتجاهلة).
 */
export async function importAndSmartMergeSchpack(
  rawBundleContent: string
): Promise<MergeExecutionReport> {
  // 1. فحص التوقيع الرقمي وفك التشفير (يرمي خطأ أمنياً صريحاً إذا تم التلاعب بحرف واحد)
  const { header, payload } = await verifyAndDecryptBundle(rawBundleContent);

  const detailsByTable: Record<string, TableMergeStats> = {};
  const getStatsBucket = (tableName: string): TableMergeStats => {
    if (!detailsByTable[tableName]) {
      detailsByTable[tableName] = { added: 0, updated: 0, ignored: 0 };
    }
    return detailsByTable[tableName];
  };

  const nowIso = new Date().toISOString();

  // 2. تحديد اسم المدرسة المحلي المطابق للمدرسة الواردة في الحزمة (عزل المدارس)
  const localSchoolsCfg = await localDB.systemConfigs.get('availableSchools');
  const localAvailableSchools: string[] = Array.isArray(localSchoolsCfg?.data)
    ? [...localSchoolsCfg.data]
    : ['المدرسة الافتراضية'];

  const resolveCanonicalLocalSchoolName = (incomingSchool: string): string => {
    const matched = localAvailableSchools.find((s) =>
      hasIntersection([s], [incomingSchool], normalizeSchool)
    );
    return matched || incomingSchool.trim() || 'المدرسة الافتراضية';
  };

  // 3. دمج الإعدادات العامة (systemConfigs) إن وُجدت في حزمة MASTER_SEED
  if (payload.systemConfigs && typeof payload.systemConfigs === 'object') {
    const cfgStats = getStatsBucket('systemConfigs');
    for (const [cfgKey, incVal] of Object.entries(payload.systemConfigs)) {
      if (incVal === undefined) continue;
      const existingCfg = await localDB.systemConfigs.get(cfgKey);

      if (!existingCfg) {
        await localDB.systemConfigs.put({
          key: cfgKey,
          data: incVal,
          lastUpdated: nowIso,
        });
        cfgStats.added++;
      } else if (cfgKey === 'availableSchools' && Array.isArray(incVal)) {
        const mergedSchools = [...(Array.isArray(existingCfg.data) ? existingCfg.data : [])];
        let changed = false;
        for (const s of incVal) {
          if (s && !hasIntersection(mergedSchools, [s], normalizeSchool)) {
            mergedSchools.push(s);
            localAvailableSchools.push(s);
            changed = true;
          }
        }
        if (changed) {
          await localDB.systemConfigs.put({
            key: cfgKey,
            data: mergedSchools,
            lastUpdated: nowIso,
          });
          cfgStats.updated++;
        } else {
          cfgStats.ignored++;
        }
      } else if (cfgKey === 'availableYears' && Array.isArray(incVal)) {
        const existingYears = Array.isArray(existingCfg.data) ? existingCfg.data : [];
        const mergedYears = Array.from(new Set([...existingYears, ...incVal]));
        if (mergedYears.length !== existingYears.length) {
          await localDB.systemConfigs.put({
            key: cfgKey,
            data: mergedYears,
            lastUpdated: nowIso,
          });
          cfgStats.updated++;
        } else {
          cfgStats.ignored++;
        }
      } else if (
        cfgKey === 'schoolBranches' &&
        incVal &&
        typeof incVal === 'object'
      ) {
        const mergedBranches = { ...(existingCfg.data || {}) };
        let changed = false;
        for (const [sch, brList] of Object.entries(incVal)) {
          const targetSch = resolveCanonicalLocalSchoolName(sch);
          const prevList = Array.isArray(mergedBranches[targetSch])
            ? mergedBranches[targetSch]
            : [];
          const nextList = Array.from(
            new Set([...prevList, ...(Array.isArray(brList) ? brList : [])])
          );
          if (nextList.length !== prevList.length) {
            mergedBranches[targetSch] = nextList;
            changed = true;
          }
        }
        if (changed) {
          await localDB.systemConfigs.put({
            key: cfgKey,
            data: mergedBranches,
            lastUpdated: nowIso,
          });
          cfgStats.updated++;
        } else {
          cfgStats.ignored++;
        }
      } else if (Array.isArray(incVal) && Array.isArray(existingCfg.data)) {
        const mergedArr = smartMergeRecordArray(existingCfg.data, incVal, cfgStats);
        await localDB.systemConfigs.put({
          key: cfgKey,
          data: mergedArr,
          lastUpdated: nowIso,
        });
      }
    }
  }

  // 4. دمج المستخدمين (users) دون مسح أي مستخدم محلي آخر
  if (Array.isArray(payload.users) && payload.users.length > 0) {
    const userStats = getStatsBucket('users');
    const existingUsers = await localDB.users.toArray();
    const mergedUsers = smartMergeRecordArray(
      existingUsers,
      payload.users,
      userStats,
      (u) => (u.name && u.code ? `${normalizeArabicText(u.name)}__${String(u.code).trim()}` : null)
    );
    await localDB.users.bulkPut(mergedUsers as any[]);
  }

  // 5. دمج البيانات المشتركة للمدارس (schoolSharedData) مع العزل التام لكل مدرسة
  if (payload.schoolSharedData && typeof payload.schoolSharedData === 'object') {
    for (const [incomingSchoolKey, schoolDataMap] of Object.entries(
      payload.schoolSharedData
    )) {
      if (!schoolDataMap || typeof schoolDataMap !== 'object') continue;

      // التأكد من أن المدرسة الواردة تطابق مدرسة ترويسة الحزمة (منع تسرب مدارس أخرى)
      if (
        header.schoolName &&
        !hasIntersection([incomingSchoolKey], [header.schoolName, header.rawSchoolName || ''], normalizeSchool)
      ) {
        continue;
      }

      const targetSchoolId = resolveCanonicalLocalSchoolName(incomingSchoolKey);

      // إذا لم تكن المدرسة مسجلة في availableSchools، نضيفها تلقائياً
      if (!hasIntersection(localAvailableSchools, [targetSchoolId], normalizeSchool)) {
        localAvailableSchools.push(targetSchoolId);
        await localDB.systemConfigs.put({
          key: 'availableSchools',
          data: localAvailableSchools,
          lastUpdated: nowIso,
        });
      }

      for (const [dataKey, incomingValue] of Object.entries(schoolDataMap)) {
        if (incomingValue === undefined) continue;
        const bucket = getStatsBucket(dataKey);
        const rowId = makeSchoolSharedId(targetSchoolId, dataKey);
        const existingRow = await localDB.schoolSharedData.get(rowId);

        if (dataKey === 'dailyReports' && Array.isArray(incomingValue)) {
          const localArr = Array.isArray(existingRow?.data) ? existingRow.data : [];
          const mergedDaily = smartMergeDailyReportsArray(localArr, incomingValue, bucket);
          await localDB.schoolSharedData.put({
            id: rowId,
            schoolId: targetSchoolId,
            key: dataKey,
            data: mergedDaily,
            lastUpdated: nowIso,
          });
        } else if (
          (dataKey === 'secretariatStaff' || dataKey === 'secretariatStudents') &&
          Array.isArray(incomingValue)
        ) {
          const localArr = Array.isArray(existingRow?.data) ? existingRow.data : [];
          const mergedRoster = smartMergeRecordArray(
            localArr,
            incomingValue,
            bucket,
            (item) =>
              item.name
                ? `${normalizeArabicText(item.name)}__${normalizeSchool(item.school || targetSchoolId)}__${normalizeArabicText(item.branch || '')}`
                : null
          );
          await localDB.schoolSharedData.put({
            id: rowId,
            schoolId: targetSchoolId,
            key: dataKey,
            data: mergedRoster,
            lastUpdated: nowIso,
          });
        } else if (Array.isArray(incomingValue)) {
          const localArr = Array.isArray(existingRow?.data) ? existingRow.data : [];
          const mergedArr = smartMergeRecordArray(localArr, incomingValue, bucket);
          await localDB.schoolSharedData.put({
            id: rowId,
            schoolId: targetSchoolId,
            key: dataKey,
            data: mergedArr,
            lastUpdated: nowIso,
          });
        } else if (
          dataKey === 'profile' &&
          incomingValue &&
          typeof incomingValue === 'object'
        ) {
          if (!existingRow) {
            await localDB.schoolSharedData.put({
              id: rowId,
              schoolId: targetSchoolId,
              key: dataKey,
              data: incomingValue,
              lastUpdated: nowIso,
            });
            bucket.added++;
          } else {
            const mergedProfile = {
              ...(existingRow.data || {}),
              ...incomingValue,
              lastUpdated: Date.now(),
            };
            await localDB.schoolSharedData.put({
              id: rowId,
              schoolId: targetSchoolId,
              key: dataKey,
              data: mergedProfile,
              lastUpdated: nowIso,
            });
            bucket.updated++;
          }
        } else {
          // كائن إعدادات (مثل metricsList أو adminMetricsList)
          if (!existingRow) {
            await localDB.schoolSharedData.put({
              id: rowId,
              schoolId: targetSchoolId,
              key: dataKey,
              data: incomingValue,
              lastUpdated: nowIso,
            });
            bucket.added++;
          } else if (JSON.stringify(existingRow.data) !== JSON.stringify(incomingValue)) {
            await localDB.schoolSharedData.put({
              id: rowId,
              schoolId: targetSchoolId,
              key: dataKey,
              data: incomingValue,
              lastUpdated: nowIso,
            });
            bucket.updated++;
          } else {
            bucket.ignored++;
          }
        }
      }
    }
  }

  // 6. دمج مجموعات المستخدمين الخاصة (userCollections)
  if (Array.isArray(payload.userCollections) && payload.userCollections.length > 0) {
    for (const incomingCol of payload.userCollections) {
      if (!incomingCol || !incomingCol.schoolId || !incomingCol.userId || !incomingCol.key) {
        continue;
      }
      const targetSchoolId = resolveCanonicalLocalSchoolName(incomingCol.schoolId);
      const rowId = makeUserCollectionId(targetSchoolId, incomingCol.userId, incomingCol.key);
      const existingRow = await localDB.userCollections.get(rowId);
      const bucket = getStatsBucket(`user_${incomingCol.key}`);

      if (Array.isArray(incomingCol.items)) {
        const localItems = Array.isArray(existingRow?.items) ? existingRow.items : [];
        const mergedItems =
          incomingCol.key === 'dailyReports'
            ? smartMergeDailyReportsArray(localItems, incomingCol.items, bucket)
            : smartMergeRecordArray(localItems, incomingCol.items, bucket);

        await localDB.userCollections.put({
          id: rowId,
          schoolId: targetSchoolId,
          userId: incomingCol.userId,
          key: incomingCol.key,
          items: mergedItems,
          lastUpdated: nowIso,
        });
      } else if (!existingRow) {
        await localDB.userCollections.put({
          id: rowId,
          schoolId: targetSchoolId,
          userId: incomingCol.userId,
          key: incomingCol.key,
          items: incomingCol.items,
          lastUpdated: nowIso,
        });
        bucket.added++;
      } else {
        await localDB.userCollections.put({
          id: rowId,
          schoolId: targetSchoolId,
          userId: incomingCol.userId,
          key: incomingCol.key,
          items: incomingCol.items,
          lastUpdated: nowIso,
        });
        bucket.updated++;
      }
    }
  }

  // 7. دمج الجداول المستقلة الستة (GradeSheets, StudentGradeSheets, AllSubjectsGradeSheets, CaseStudies, Issues, SchoolActivities)
  if (payload.standaloneTables && typeof payload.standaloneTables === 'object') {
    const standaloneConfigs: Array<{
      name: keyof NonNullable<BundlePayloadData['standaloneTables']>;
      table: typeof localDB.gradeSheets;
    }> = [
      { name: 'gradeSheets', table: localDB.gradeSheets },
      { name: 'studentGradeSheets', table: localDB.studentGradeSheets },
      { name: 'allSubjectsGradeSheets', table: localDB.allSubjectsGradeSheets },
      { name: 'caseStudies', table: localDB.caseStudies },
      { name: 'issuesAndSolutions', table: localDB.issuesAndSolutions },
      { name: 'schoolActivities', table: localDB.schoolActivities },
    ];

    for (const { name, table } of standaloneConfigs) {
      const incomingRows = payload.standaloneTables[name];
      if (!Array.isArray(incomingRows) || incomingRows.length === 0) continue;

      const bucket = getStatsBucket(name);
      const localRows = await table.toArray();
      const localMap = new Map<string, Record<string, any>>();
      for (const r of localRows) {
        const rId = r.id || r.uuid;
        if (rId) localMap.set(String(rId), r);
      }

      const rowsToUpsert: Record<string, any>[] = [];

      for (const incRow of incomingRows) {
        if (!incRow || typeof incRow !== 'object') continue;

        // عزل المدارس للسجلات المستقلة
        const recSchool = incRow.schoolName || incRow.school || '';
        if (
          recSchool &&
          header.schoolName &&
          !hasIntersection([recSchool], [header.schoolName, header.rawSchoolName || ''], normalizeSchool)
        ) {
          bucket.ignored++;
          continue;
        }

        const canonicalSchool = recSchool
          ? resolveCanonicalLocalSchoolName(recSchool)
          : resolveCanonicalLocalSchoolName(header.rawSchoolName || header.schoolName);

        const normalizedRow: Record<string, any> = {
          ...incRow,
          ...(incRow.schoolName !== undefined ? { schoolName: canonicalSchool } : {}),
          ...(incRow.school !== undefined ? { school: canonicalSchool } : {}),
        };

        const rowId = normalizedRow.id || normalizedRow.uuid;
        if (!rowId) {
          const stamped = stampRecord(normalizedRow);
          rowsToUpsert.push(stamped);
          localMap.set(stamped.id, stamped);
          bucket.added++;
          continue;
        }

        const existing = localMap.get(String(rowId));
        if (!existing) {
          const withId = { ...normalizedRow, id: String(rowId) };
          rowsToUpsert.push(withId);
          localMap.set(String(rowId), withId);
          bucket.added++;
        } else if (isIncomingRecordNewer(normalizedRow, existing)) {
          const updated = {
            ...existing,
            ...normalizedRow,
            id: String(rowId),
          };
          rowsToUpsert.push(updated);
          localMap.set(String(rowId), updated);
          bucket.updated++;
        } else {
          bucket.ignored++;
        }
      }

      if (rowsToUpsert.length > 0) {
        await table.bulkPut(rowsToUpsert);
      }
    }
  }

  // 8. تجميع الإحصائيات النهائية لتقرير نتائج الاستيراد
  let addedCount = 0;
  let updatedCount = 0;
  let ignoredCount = 0;

  for (const stat of Object.values(detailsByTable)) {
    addedCount += stat.added;
    updatedCount += stat.updated;
    ignoredCount += stat.ignored;
  }

  return {
    bundleType: header.bundleType,
    senderId: header.senderId,
    senderName: header.senderName,
    senderRole: header.senderRole,
    schoolName: header.rawSchoolName || header.schoolName,
    exportedAt: header.exportedAt,
    dateRange: header.dateRange,
    addedCount,
    updatedCount,
    ignoredCount,
    totalProcessed: addedCount + updatedCount + ignoredCount,
    detailsByTable,
  };
}
