import Dexie, { type Table } from 'dexie';
import { AppData, User } from '../../types';
import { stampRecord, stampArrayRecords, StampAuthor } from './recordStamping';

export interface SystemConfigRow {
  key: string;
  data: any;
  lastUpdated: string;
}

export interface SchoolSharedDataRow {
  id: string; // `${schoolId}__${key}`
  schoolId: string;
  key: string;
  data: any;
  lastUpdated: string;
}

export interface UserCollectionRow {
  id: string; // `${schoolId}__${userId}__${key}`
  schoolId: string;
  userId: string;
  key: string;
  items: any;
  lastUpdated: string;
}

export class RafiqukOfflineDatabase extends Dexie {
  systemConfigs!: Table<SystemConfigRow, string>;
  users!: Table<User & Record<string, any>, string>;
  schoolSharedData!: Table<SchoolSharedDataRow, string>;
  userCollections!: Table<UserCollectionRow, string>;
  gradeSheets!: Table<Record<string, any>, string>;
  studentGradeSheets!: Table<Record<string, any>, string>;
  allSubjectsGradeSheets!: Table<Record<string, any>, string>;
  caseStudies!: Table<Record<string, any>, string>;
  issuesAndSolutions!: Table<Record<string, any>, string>;
  schoolActivities!: Table<Record<string, any>, string>;

  constructor() {
    super('RafiqukOfflineDB');

    this.version(1).stores({
      systemConfigs: '&key',
      users: '&id, name, code, role',
      schoolSharedData: '&id, [schoolId+key], schoolId, key, lastUpdated',
      userCollections: '&id, [schoolId+userId+key], schoolId, userId, key, lastUpdated',
      gradeSheets: '&id, schoolName, branch, grade, section, subject, userId, createdByUserId, updatedAt',
      studentGradeSheets: '&id, schoolName, branch, studentId, userId, createdByUserId, updatedAt',
      allSubjectsGradeSheets: '&id, schoolName, branch, grade, section, userId, createdByUserId, updatedAt',
      caseStudies: '&id, school, studentId, userId, createdByUserId, updatedAt',
      issuesAndSolutions: '&id, school, category, userId, createdByUserId, updatedAt',
      schoolActivities: '&id, schoolName, branch, userId, createdByUserId, updatedAt',
    });
  }
}

export const localDB = new RafiqukOfflineDatabase();

export const GLOBAL_CONFIG_KEYS = [
  'availableSchools',
  'availableYears',
  'schoolBranches',
  'aboutSliderImages',
  'aboutExternalLinks',
  'aboutLogoImg',
] as const;

export const USER_CUSTOMIZABLE_KEYS = [
  'taskTemplates',
  'customViolationElements',
  'absenceManualAdditions',
  'absenceExclusions',
  'customEvaluationOptions',
  'quickAccess',
] as const;

export function makeSchoolSharedId(schoolId: string, key: string): string {
  return `${schoolId.trim()}__${key.trim()}`;
}

export function makeUserCollectionId(schoolId: string, userId: string, key: string): string {
  return `${schoolId.trim()}__${userId.trim()}__${key.trim()}`;
}

/**
 * ترحيل البيانات السابقة المحفوظة في localStorage (إن وجدت) إلى RafiqukOfflineDB
 * لضمان عدم ضياع أي بيانات مسجلة مسبقاً عند الترقية للنسخة المحلية المستقلة.
 */
async function migrateLegacyLocalStorageIfNeeded(): Promise<void> {
  const migrationFlag = localStorage.getItem('rafiquk_dexie_migrated_v1');
  if (migrationFlag === 'true') return;

  try {
    const nowIso = new Date().toISOString();

    // 1. ترحيل cached_app_data
    const cachedAppStr = localStorage.getItem('cached_app_data');
    if (cachedAppStr) {
      const parsed = JSON.parse(cachedAppStr);
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.users) && parsed.users.length > 0) {
          const stampedUsers = parsed.users.map((u: any) =>
            stampRecord(
              {
                ...u,
                jobTitle: u.jobTitle || u.job_title || '',
                academicYears: u.academicYears || u.academic_years || ['2024-2025'],
                startDate: u.startDate || u.start_date || nowIso.split('T')[0],
                expiryDate: u.expiryDate || u.expiry_date || '2099-12-31',
              },
              { id: u.id || 'seed_admin_1', name: u.name || 'مدير عام' }
            )
          );
          await localDB.users.bulkPut(stampedUsers);
        }

        for (const gKey of GLOBAL_CONFIG_KEYS) {
          if (parsed[gKey] !== undefined) {
            await localDB.systemConfigs.put({
              key: gKey,
              data: parsed[gKey],
              lastUpdated: nowIso,
            });
          }
        }

        const schools: string[] =
          Array.isArray(parsed.availableSchools) && parsed.availableSchools.length > 0
            ? parsed.availableSchools
            : ['المدرسة الافتراضية'];

        if (parsed.profiles && typeof parsed.profiles === 'object') {
          for (const [sch, profData] of Object.entries(parsed.profiles)) {
            await localDB.schoolSharedData.put({
              id: makeSchoolSharedId(sch, 'profile'),
              schoolId: sch,
              key: 'profile',
              data: profData,
              lastUpdated: nowIso,
            });
          }
        }

        const ignoredTopKeys = new Set([
          'users',
          'profiles',
          ...GLOBAL_CONFIG_KEYS,
        ]);

        for (const [k, val] of Object.entries(parsed)) {
          if (ignoredTopKeys.has(k) || val === undefined) continue;
          for (const sch of schools) {
            await localDB.schoolSharedData.put({
              id: makeSchoolSharedId(sch, k),
              schoolId: sch,
              key: k,
              data: Array.isArray(val) ? stampArrayRecords(val, []) : val,
              lastUpdated: nowIso,
            });
          }
        }
      }
    }

    // 2. ترحيل الجداول المستقلة من localStorage
    const standaloneMappings: Array<{ storageKey: string; table: Table<Record<string, any>, string> }> = [
      { storageKey: 'cached_standalone_GradeSheets', table: localDB.gradeSheets },
      { storageKey: 'cached_standalone_StudentGradeSheets', table: localDB.studentGradeSheets },
      { storageKey: 'cached_standalone_AllSubjectsGradeSheets', table: localDB.allSubjectsGradeSheets },
      { storageKey: 'cached_standalone_CaseStudies', table: localDB.caseStudies },
      { storageKey: 'cached_standalone_issuesAndSolutions_log', table: localDB.issuesAndSolutions },
      { storageKey: 'cached_SchoolActivities', table: localDB.schoolActivities },
    ];

    for (const { storageKey, table } of standaloneMappings) {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr) && arr.length > 0) {
            const stampedArr = stampArrayRecords(arr, []);
            await table.bulkPut(stampedArr);
          }
        } catch (err) {
          console.warn(`Failed migrating standalone table ${storageKey}:`, err);
        }
      }
    }

    // تنظيف طوابير المزامنة القديمة الخاصة بالسيرفر
    localStorage.removeItem('pending_sync_queue');
    localStorage.removeItem('sw_update_ready');
    localStorage.setItem('rafiquk_dexie_migrated_v1', 'true');
  } catch (error) {
    console.error('Legacy localStorage migration error:', error);
  }
}

/**
 * يزرع حساب "مدير عام افتراضي أولي" (Seed Admin) والمدرسة الافتراضية
 * تلقائياً إذا كانت قاعدة البيانات فارغة عند أول تشغيل للتطبيق.
 */
export async function ensureSeedDatabase(): Promise<void> {
  await migrateLegacyLocalStorageIfNeeded();

  const existingUsersCount = await localDB.users.count();
  if (existingUsersCount > 0) {
    // التأكد من وجود مدرسة وعام دراسي واحد على الأقل حتى لو وُجد مستخدمون
    const schoolsRow = await localDB.systemConfigs.get('availableSchools');
    if (!schoolsRow || !Array.isArray(schoolsRow.data) || schoolsRow.data.length === 0) {
      await localDB.systemConfigs.put({
        key: 'availableSchools',
        data: ['المدرسة الافتراضية'],
        lastUpdated: new Date().toISOString(),
      });
    }
    const yearsRow = await localDB.systemConfigs.get('availableYears');
    if (!yearsRow || !Array.isArray(yearsRow.data) || yearsRow.data.length === 0) {
      await localDB.systemConfigs.put({
        key: 'availableYears',
        data: ['2024-2025'],
        lastUpdated: new Date().toISOString(),
      });
    }
    return;
  }

  const defaultSchool = 'المدرسة الافتراضية';
  const defaultBranch = 'المركز الرئيسي';
  const defaultYear = '2024-2025';
  const nowIso = new Date().toISOString();

  const seedAdmin = stampRecord(
    {
      id: 'seed_admin_1',
      name: 'مدير عام',
      jobTitle: 'مدير عام المدارس',
      code: '1234',
      role: 'admin' as const,
      schools: [defaultSchool],
      academicYears: [defaultYear],
      grades: [],
      sections: [],
      subjects: [],
      startDate: nowIso.split('T')[0],
      expiryDate: '2099-12-31',
      permissions: {
        all: true,
        dashboard: true,
        dailyFollowUp: true,
        adminFollowUp: true,
        studentAffairs: true,
        specialReports: true,
        substitutions: true,
        schoolProfile: true,
        secretariat: true,
        teacherPortal: true,
        educationalSupervision: true,
        specialCodes: true,
        userManagement: true,
        schoolsAndBranches: {
          [defaultSchool]: [defaultBranch],
        },
        issuesModal: true,
        caseStudyModal: true,
        trainingCourses: true,
        comprehensiveIndicators: true,
        gradeSheets: true,
        transport: true,
        communicationDev: true,
        viewCommunicationDetails: true,
        schoolActivities: true,
        finance: true,
      },
    },
    { id: 'seed_admin_1', name: 'مدير عام' }
  );

  await localDB.users.put(seedAdmin);

  await localDB.systemConfigs.bulkPut([
    {
      key: 'availableSchools',
      data: [defaultSchool],
      lastUpdated: nowIso,
    },
    {
      key: 'availableYears',
      data: [defaultYear],
      lastUpdated: nowIso,
    },
    {
      key: 'schoolBranches',
      data: { [defaultSchool]: [defaultBranch] },
      lastUpdated: nowIso,
    },
  ]);

  const initialSchoolProfile = {
    [defaultBranch]: {
      ministry: 'وزارة التربية والتعليم',
      district: '',
      schoolName: defaultSchool,
      branch: defaultBranch,
      year: defaultYear,
      semester: 'الأول',
      branchManager: '',
      generalManager: 'مدير عام',
      customFields: [],
    },
    lastUpdated: Date.now(),
  };

  await localDB.schoolSharedData.put({
    id: makeSchoolSharedId(defaultSchool, 'profile'),
    schoolId: defaultSchool,
    key: 'profile',
    data: initialSchoolProfile,
    lastUpdated: nowIso,
  });
}

// اسم بديل للتوافق مع كافة الاستدعاءات
export const ensureSeedData = ensureSeedDatabase;

/**
 * حفظ إعداد عام في جدول systemConfigs
 */
export async function saveSystemConfigToLocalDB(key: string, data: any): Promise<void> {
  await localDB.systemConfigs.put({
    key,
    data,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * حفظ بيانات مشتركة لمدرسة محددة في جدول schoolSharedData
 */
export async function saveSchoolSharedKeyToLocalDB(
  schoolId: string,
  key: string,
  data: any,
  author?: StampAuthor | null
): Promise<void> {
  if (!schoolId || !key) return;
  const rowId = makeSchoolSharedId(schoolId, key);
  const existingRow = await localDB.schoolSharedData.get(rowId);

  let finalData = data;
  if (Array.isArray(data)) {
    const oldArray = Array.isArray(existingRow?.data) ? existingRow.data : [];
    finalData = stampArrayRecords(data, oldArray, author);
  }

  await localDB.schoolSharedData.put({
    id: rowId,
    schoolId: schoolId.trim(),
    key: key.trim(),
    data: finalData,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * حفظ مجموعة بيانات خاصة بمستخدم داخل مدرسة في جدول userCollections
 */
export async function saveUserCollectionToLocalDB(
  schoolId: string,
  userId: string,
  key: string,
  items: any,
  author?: StampAuthor | null
): Promise<void> {
  if (!schoolId || !userId || !key) return;
  const rowId = makeUserCollectionId(schoolId, userId, key);
  const existingRow = await localDB.userCollections.get(rowId);

  let finalItems = items;
  if (Array.isArray(items)) {
    const oldArray = Array.isArray(existingRow?.items) ? existingRow.items : [];
    finalItems = stampArrayRecords(items, oldArray, author || { id: userId });
  }

  await localDB.userCollections.put({
    id: rowId,
    schoolId: schoolId.trim(),
    userId: userId.trim(),
    key: key.trim(),
    items: finalItems,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * قراءة مجموعة بيانات خاصة بمستخدم داخل مدرسة من جدول userCollections
 */
export async function getUserCollectionFromLocalDB(
  schoolId: string,
  userId: string,
  key: string
): Promise<any> {
  if (!schoolId || !userId || !key) return undefined;
  const row = await localDB.userCollections.get(makeUserCollectionId(schoolId, userId, key));
  return row?.items;
}

/**
 * تحميل كافة البيانات (العامة + المستخدمين + بيانات المدارس + بيانات المستخدم) من RafiqukOfflineDB
 * لبناء كائن AppData المتكامل بسرعة فائقة (0ms Network Latency).
 */
export async function loadFullAppDataFromLocalDB(
  defaultData: AppData,
  selectedSchool?: string,
  userId?: string
): Promise<AppData> {
  await ensureSeedDatabase();

  const result: AppData = {
    ...defaultData,
    profiles: { ...(defaultData.profiles || {}) },
  };

  // 1. قراءة الإعدادات العامة (systemConfigs)
  const allConfigs = await localDB.systemConfigs.toArray();
  for (const cfg of allConfigs) {
    if (cfg && cfg.key) {
      (result as any)[cfg.key] = cfg.data;
    }
  }

  // 2. قراءة جميع المستخدمين (users)
  const allUsers = await localDB.users.toArray();
  result.users = allUsers.map((u: any) => ({
    ...u,
    jobTitle: u.jobTitle || u.job_title || '',
    academicYears: u.academicYears || u.academic_years || result.availableYears || ['2024-2025'],
    startDate: u.startDate || u.start_date || '',
    expiryDate: u.expiryDate || u.expiry_date || '2099-12-31',
  }));

  // 3. تحديد المدارس المطلوب تحميل بياناتها
  const requestedSchools = (selectedSchool || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const targetSchools =
    requestedSchools.length === 0 || requestedSchools.includes('all')
      ? result.availableSchools && result.availableSchools.length > 0
        ? result.availableSchools
        : ['المدرسة الافتراضية']
      : requestedSchools;

  // تحميل ملفات تعريف جميع المدارس في result.profiles
  const allSharedRows = await localDB.schoolSharedData.toArray();
  for (const row of allSharedRows) {
    if (row.key === 'profile' && row.schoolId) {
      result.profiles = {
        ...(result.profiles || {}),
        [row.schoolId]: row.data,
      };
    }
  }

  // 4. دمج البيانات المشتركة للمدارس المحددة (schoolSharedData)
  const targetSchoolSet = new Set(targetSchools.map((s) => s.trim()));
  const relevantSharedRows = allSharedRows.filter((r) =>
    targetSchoolSet.has(r.schoolId.trim())
  );

  // تجميع حسب المفتاح لدمج المصفوفات عبر عدة مدارس إن كان المستخدم مشرفاً على أكثر من مدرسة
  const groupedByKey = new Map<string, SchoolSharedDataRow[]>();
  for (const row of relevantSharedRows) {
    if (row.key === 'users' || GLOBAL_CONFIG_KEYS.includes(row.key as any)) continue;
    const list = groupedByKey.get(row.key) || [];
    list.push(row);
    groupedByKey.set(row.key, list);
  }

  for (const [key, rows] of groupedByKey.entries()) {
    if (key === 'profile') {
      const primarySchool = targetSchools[0];
      const primaryProfileRow = rows.find((r) => r.schoolId === primarySchool) || rows[0];
      if (primaryProfileRow?.data) {
        (result as any).profile = primaryProfileRow.data;
      }
      continue;
    }

    // إذا كانت البيانات مصفوفة، ندمج العناصر مع منع التكرار بالمعرّف id
    if (rows.some((r) => Array.isArray(r.data))) {
      const mergedMap = new Map<string, any>();
      const unkeyedItems: any[] = [];
      for (const r of rows) {
        if (!Array.isArray(r.data)) continue;
        for (const item of r.data) {
          if (item && typeof item === 'object') {
            const itemId = item.id || item.uuid;
            if (itemId) {
              const existing = mergedMap.get(String(itemId));
              if (!existing || (item.version || 1) >= (existing.version || 1)) {
                mergedMap.set(String(itemId), item);
              }
            } else {
              unkeyedItems.push(item);
            }
          } else {
            unkeyedItems.push(item);
          }
        }
      }
      (result as any)[key] = [...Array.from(mergedMap.values()), ...unkeyedItems];
    } else {
      // كائن إعدادات (مثل metricsList أو adminMetricsList)
      const latestRow = [...rows].sort((a, b) =>
        (b.lastUpdated || '').localeCompare(a.lastUpdated || '')
      )[0];
      if (latestRow) {
        (result as any)[key] = latestRow.data;
      }
    }
  }

  // 5. قراءة مجموعات المستخدم الخاصة (userCollections) ودمجها
  if (userId) {
    const userRows = await localDB.userCollections
      .where('userId')
      .equals(userId)
      .toArray();

    for (const uRow of userRows) {
      if (!targetSchoolSet.has(uRow.schoolId.trim())) continue;
      const k = uRow.key;
      if (k === 'quickAccess') continue;

      if (USER_CUSTOMIZABLE_KEYS.includes(k as any)) {
        (result as any)[k] = uRow.items;
      } else if (Array.isArray(uRow.items)) {
        const currentArr = Array.isArray((result as any)[k]) ? (result as any)[k] : [];
        const map = new Map<string, any>();
        for (const item of currentArr) {
          if (item?.id) map.set(String(item.id), item);
        }
        for (const item of uRow.items) {
          if (item?.id) {
            const prev = map.get(String(item.id));
            if (!prev || (item.version || 1) >= (prev.version || 1)) {
              map.set(String(item.id), item);
            }
          }
        }
        (result as any)[k] = Array.from(map.values());
      }
    }
  }

  return result;
}
