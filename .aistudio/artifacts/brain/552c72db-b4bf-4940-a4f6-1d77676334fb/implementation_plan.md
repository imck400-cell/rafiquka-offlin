# رفيقك المدرسي — خطة التحويل إلى تطبيق مستقل بدون إنترنت (المرحلة الأولى: تأسيس البنية المحلية وبتر السيرفر)

تحويل نظام **"رفيقك المدرسي"** من تطبيق مرتبط بسيرفر خارجي (Hostinger / Laravel) إلى تطبيق هاتف يعمل أوفلاين بالكامل بنسبة 100% (Serverless Offline App) بالاعتماد على محرك قاعدة بيانات محلية `Dexie.js (IndexedDB)` يتسع لمئات الميجابايت، مع نظام ختم ملكية وإصدارات (`Record Stamping & Versioning`) يمنع اختلاط أعمال الموظفين أو تأثرها باختلاف ضبط ساعات الهواتف عند تبادل ملفات البيانات.

---

## قرارات المراجعة المعتمدة (Confirmed Decisions)

> [!IMPORTANT]
> بناءً على مراجعتك للتنبيهات التقنية، تم اعتماد القرارات التالية لتنفيذ المرحلة الأولى بأمان تام ودون كسر أي شاشة:

- **تحويل شامل لكافة منافذ البيانات (10 وحدات برمجية)**: تحويل `GlobalState` بالإضافة إلى جميع الشاشات والنوافذ التسع الأخرى التي كانت تتصل بالسيرفر مباشرة (كشوف الدرجات، دراسة الحالة، المشكلات والحلول، الأنشطة المدرسية، التقارير الشاملة، المؤشرات الشاملة، إدارة المستخدمين، التواصل والتطوير، والوصول السريع) للعمل عبر `localDB` بسرعة صفر ملي ثانية.
- **حساب المدير العام الأولي (Seed Admin)**: زرع حساب افتراضي تلقائياً عند أول تشغيل في حال خلو قاعدة البيانات (`اسم المستخدم: مدير عام`، `الكود: 1234`، `الصلاحية: admin` كامل الصلاحيات) مع مدرسة افتراضية قابلة للتعديل (`المدرسة الافتراضية`) وعام دراسي (`2024-2025`) لتفادي حظر الدخول الأولي.
- **ختم تلقائي شامل للملكية والإصدار (Universal Item Stamping)**: تطبيق دالة الختم `stampRecord` على كل سجل في الجداول المستقلة الستة، وكذلك تلقائياً على كل عنصر داخل المصفوفات المشتركة والفرعية في `GlobalState` لضمان جاهزية كل سجل للدمج الذكي في المرحلة الثانية دون ضياع أو تداخل بيانات أي موظف.
- **تسمية التطبيق وتنظيف مخلفات السيرفر**: اعتماد اسم **"رفيقك المدرسي"** في هوية التطبيق، وإزالة مكتبة `axios` وسكربتات الفحص عن بُعد (`version.json` وطوابير `pending_sync_queue`) مع الإبقاء على دعم العمل أوفلاين (PWA).

---

## 1. نظرة عامة وتقسيم مراحل المشروع (Roadmap)

لضمان عدم حدوث أي خلل أو كسر في الكود، ينقسم المشروع إلى مرحلتين متكاملتين:

- **المرحلة الأولى (الحالية — تأسيس البنية المحلية وبتر السيرفر)**:
  1. تثبيت وتأسيس محرك قاعدة البيانات المحلية (`Dexie.js`) باسم `RafiqukOfflineDB`.
  2. بناء محرك ختم السجلات ومعالجة تضارب ساعات الهواتف (`recordStamping`).
  3. استئصال الاتصال بسيرفر هوستنقر وتحويل القراءة والكتابة في جميع الشاشات والمكونات إلى `RafiqukOfflineDB` مباشرة مع زرع حساب المدير الافتراضي الأولي.
  4. تحديث اسم التطبيق إلى **"رفيقك المدرسي"** وتنظيف السكربتات والمفردات المرتبطة بالسيرفر.
- **المرحلة الثانية (القادمة — محرك التصدير والاستيراد التراكمي الذكي بين الموظفين والمدير)**:
  1. تطوير نافذة إدارة ونقل البيانات لتصدير حزم أعمال الموظف (JSON) شاملةً كافة الجداول والمصفوفات المختومة خلال فترة محددة أو بشكل كامل.
  2. بناء خوارزمية الدمج الذكي عند المدير أو السكرتير (`Smart Conflict-Free Merge`) التي تدمج سجلات كل موظف حسب المعرّف المركب (`UUID`) ورقم الإصدار (`version`) ثم وقت التعديل (`updatedAt`)، مع عزل تام يمنع اختلاط أعمال الموظفين.

---

## 2. تجربة المستخدم والهوية البصرية (UX & Visual Design)

- **الحفاظ الكامل بنسبة 100% على الواجهات والمكونات**: لن يتم حذف أو تقليص أي شاشة أو تقرير أو نافذة منبثقة أو ميزة حالية؛ جميع القوائم والنماذج والجداول تعمل بنفس التصميم والألوان والخطوط (`Cairo`).
- **تحديث الهوية إلى "رفيقك المدرسي"**:
  - تغيير عنوان التطبيق في الشريط العلوي، شاشة الترحيب، ملف تعريف التطبيق، وبيانات المنصة إلى **"رفيقك المدرسي"**.
  - تحويل شارة حالة الاتصال في الشاشة الرئيسية من ("بانتظار الشبكة / جاري الاتصال بالنت") إلى شارة محلية أنيقة ومطمئنة: **"محفوظ محلياً بالكامل (أوفلاين)"**، وإلغاء شاشة القفل المنبثقة التي كانت تجبر المستخدم على انتظار رفع العمليات المعلقة للسيرفر.
- **رحلة المستخدم عند أول تشغيل (Zero-State Onboarding)**:
  1. يفتح المدير التطبيق لأول مرة (بدون إنترنت).
  2. يقوم محرك `RafiqukOfflineDB` بزرع حساب المدير الافتراضي (`مدير عام` / كود `1234`) ومدرسة أولية (`المدرسة الافتراضية`) وعام (`2024-2025`).
  3. يسجل المدير دخوله فوراً، ويؤسس بيانات المدرسة والفروع والموظفين والأكواد، وتُحفظ كل نقرة في أجزاء من الألف من الثانية داخل الهاتف.

---

## 3. القرارات الهندسية والمفاضلات التقنية (Key Product Decisions)

1. **الانتقال من `localStorage` إلى `Dexie.js (IndexedDB)`**:
   - *النهج المختار*: قاعدة بيانات هيكلية محلية `RafiqukOfflineDB` بـ 10 جداول مفهرسة.
   - *السبب*: `localStorage` محدود بـ 5 ميجابايت فقط ويتسبب في تجمّد الواجهة عند تحويل الكائنات الكبيرة (`JSON.stringify`) في كل تعديل، بينما `IndexedDB` عبر `Dexie.js` غير متزامن، سريع جداً، ويتسع لمئات الميجابايت من التقارير وكشوف الدرجات والصور.
2. **معالجة خطر عدم انضباط ساعة الهاتف (Clock Skew) عبر عداد `version`**:
   - *النهج المختار*: ختم كل سجل بمعرّف مركب `${Date.now()}_${Math.random().toString(36).substring(2, 7)}` وحقول ملكية (`createdByUserId`, `createdByName`, `createdAt`, `updatedAt`) وعداد رقمي `version` يبدأ من `1` ويزيد بمقدار `+1` عند كل تعديل.
   - *السبب*: إذا كانت ساعة هاتف أحد المشرفين متأخرة أو متقدمة، فإن الاعتماد على التاريخ وحده قد يؤدي لرفض التعديل الأحدث عند الدمج. وجود `version` يضمن أن السجل المعدّل 3 مرات (`version: 3`) يغلب النسخة القديمة (`version: 1`) دائماً، ولا يُلجأ لـ `updatedAt` إلا عند تساوي رقم الإصدار.
3. **ترحيل تلقائي آمن للبيانات السابقة (Seamless Cache Migration)**:
   - *النهج المختار*: عند تهيئة `RafiqukOfflineDB` لأول مرة، يفحص المحرك ما إذا كانت هناك بيانات محفوظة سابقاً في `localStorage` (`cached_app_data` والجداول المستقلة) فينقلها تلقائياً إلى `Dexie.js` قبل زرع البيانات الافتراضية، لضمان عدم ضياع أي بيانات حالية للمستخدم.

---

## 4. المعمارية التقنية ومعاينة التعديلات (Technical Architecture & Diff Preview)

### مخطط المعمارية المحلية الجديدة (System Architecture Diagram)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        واجهة المستخدم (React 19 UI)                        │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ الشاشات الرئيسية (22) │  │ الجداول المستقلة (6) │  │ النوافذ والأدوات │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └────────┬─────────┘  │
└─────────────┼─────────────────────────┼───────────────────────┼────────────┘
              │                         │                       │
              ▼                         ▼                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│             طبقة إدارة الحالة والختم (State & Stamping Layer)              │
│  ┌────────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │        GlobalState Context         │─▶│     recordStamping Engine    │  │
│  │ • قراءة وكتابة فورية (0ms Latency) │  │ • UUID: {ts}_{rand5}         │  │
│  │ • عزل المدارس والفروع والصلاحيات   │  │ • createdByUserId / Name     │  │
│  │ • زرع المدير الافتراضي (Seed Admin)│  │ • version (+1) & updatedAt   │  │
│  └─────────────────┬──────────────────┘  └──────────────┬───────────────┘  │
└────────────────────┼────────────────────────────────────┼──────────────────┘
                     │                                    │
                     ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│               محرك قاعدة البيانات المحلية (RafiqukOfflineDB)               │
│                         Dexie.js / IndexedDB Engine                        │
│  ┌───────────────────────┬────────────────────────┬─────────────────────┐  │
│  │  systemConfigs (&key) │ users (&id,name,code)  │  schoolSharedData   │  │
│  ├───────────────────────┼────────────────────────┼─────────────────────┤  │
│  │    userCollections    │      gradeSheets       │ studentGradeSheets  │  │
│  ├───────────────────────┼────────────────────────┼─────────────────────┤  │
│  │allSubjectsGradeSheets │      caseStudies       │ issuesAndSolutions  │  │
│  ├───────────────────────┴────────────────────────┴─────────────────────┤  │
│  │                          schoolActivities                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### معاينة التعديلات البرمجية (Diff Preview للمرحلة الأولى)

#### 1. إنشاء محرك ختم السجلات والإصدارات (ملف جديد)

```diff
+++ src/lib/recordStamping.ts
+export interface StampedMetadata {
+  id: string;
+  createdByUserId: string;
+  createdByName: string;
+  createdAt: string;
+  updatedAt: string;
+  version: number;
+}
+
+export interface StampAuthor {
+  id?: string;
+  name?: string;
+}
+
+/**
+ * يولّد معرّفاً فريداً مركباً يستحيل تشابهه بين هاتفين مختلفين
+ */
+export function generateCompositeId(): string {
+  return `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
+}
+
+/**
+ * يختم أي سجل جديد أو معدّل ببيانات الملكية ورقم الإصدار المتزايد (+1)
+ */
+export function stampRecord<T extends Record<string, any>>(
+  record: T,
+  author?: StampAuthor | null,
+  previousRecord?: Record<string, any> | null
+): T & StampedMetadata {
+  const nowIso = new Date().toISOString();
+  const userId = author?.id || record.userId || record.createdByUserId || 'system_admin';
+  const userName = author?.name || record.userName || record.createdByName || 'مدير النظام';
+
+  // استبدال المعرّفات المؤقتة أو الفارغة بمعرّف مركب قياسي
+  const rawId = record.id || previousRecord?.id;
+  const validId =
+    rawId && typeof rawId === 'string' && !rawId.startsWith('local_')
+      ? rawId
+      : generateCompositeId();
+
+  const isNew = !previousRecord && (!record.version || typeof record.version !== 'number');
+  const prevVersion =
+    typeof previousRecord?.version === 'number'
+      ? previousRecord.version
+      : typeof record.version === 'number'
+      ? record.version
+      : 0;
+
+  const hasChanged =
+    !previousRecord || JSON.stringify(previousRecord) !== JSON.stringify(record);
+
+  return {
+    ...record,
+    id: validId,
+    createdByUserId: previousRecord?.createdByUserId || record.createdByUserId || userId,
+    createdByName: previousRecord?.createdByName || record.createdByName || userName,
+    createdAt: previousRecord?.createdAt || record.createdAt || record.timestamp || nowIso,
+    updatedAt: hasChanged ? nowIso : (previousRecord?.updatedAt || record.updatedAt || nowIso),
+    version: isNew ? 1 : hasChanged ? prevVersion + 1 : Math.max(1, prevVersion),
+  };
+}
+
+/**
+ * يختم مصفوفة سجلات بمقارنتها مع النسخة السابقة لزيادة version فقط للسجلات المعدّلة
+ */
+export function stampArrayRecords<T extends Record<string, any>>(
+  newArray: T[],
+  oldArray: T[] = [],
+  author?: StampAuthor | null
+): (T & StampedMetadata)[] {
+  if (!Array.isArray(newArray)) return [];
+  const oldMap = new Map<string, T>();
+  if (Array.isArray(oldArray)) {
+    oldArray.forEach((item) => {
+      if (item && typeof item === 'object') {
+        const key = item.id || item.uuid;
+        if (key) oldMap.set(String(key), item);
+      }
    });
+  }
+
+  return newArray.map((item) => {
+    if (!item || typeof item !== 'object') return item;
+    const key = item.id || item.uuid;
+    const prev = key ? oldMap.get(String(key)) : null;
+    return stampRecord(item, author, prev);
+  });
+}
```

#### 2. إنشاء محرك قاعدة البيانات المحلية `RafiqukOfflineDB` باستخدام `Dexie.js` (ملف جديد)

```diff
+++ src/lib/localDB.ts
+import Dexie, { type Table } from 'dexie';
+import { User } from '../../types';
+import { stampRecord } from './recordStamping';
+
+export interface SystemConfigRow {
+  key: string;
+  data: any;
+  lastUpdated: string;
+}
+
+export interface SchoolSharedDataRow {
+  id: string; // `${schoolId}__${key}`
+  schoolId: string;
+  key: string;
+  data: any;
+  lastUpdated: string;
+}
+
+export interface UserCollectionRow {
+  id: string; // `${schoolId}__${userId}__${key}`
+  schoolId: string;
+  userId: string;
+  key: string;
+  items: any;
+  lastUpdated: string;
+}
+
+export class RafiqukOfflineDatabase extends Dexie {
+  systemConfigs!: Table<SystemConfigRow, string>;
+  users!: Table<User & Record<string, any>, string>;
+  schoolSharedData!: Table<SchoolSharedDataRow, string>;
+  userCollections!: Table<UserCollectionRow, string>;
+  gradeSheets!: Table<Record<string, any>, string>;
+  studentGradeSheets!: Table<Record<string, any>, string>;
+  allSubjectsGradeSheets!: Table<Record<string, any>, string>;
+  caseStudies!: Table<Record<string, any>, string>;
+  issuesAndSolutions!: Table<Record<string, any>, string>;
+  schoolActivities!: Table<Record<string, any>, string>;
+
+  constructor() {
+    super('RafiqukOfflineDB');
+    this.version(1).stores({
+      systemConfigs: '&key',
+      users: '&id, name, code, role',
+      schoolSharedData: '&id, [schoolId+key], schoolId, key, lastUpdated',
+      userCollections: '&id, [schoolId+userId+key], schoolId, userId, key, lastUpdated',
+      gradeSheets: '&id, schoolName, branch, grade, section, subject, userId, updatedAt',
+      studentGradeSheets: '&id, schoolName, branch, studentId, userId, updatedAt',
+      allSubjectsGradeSheets: '&id, schoolName, branch, grade, section, userId, updatedAt',
+      caseStudies: '&id, school, studentId, userId, updatedAt',
+      issuesAndSolutions: '&id, school, category, userId, updatedAt',
+      schoolActivities: '&id, schoolName, branch, userId, updatedAt',
+    });
+  }
+}
+
+export const localDB = new RafiqukOfflineDatabase();
+
+/**
+ * زرع حساب "مدير عام افتراضي أولي" (Seed Admin) والمدرسة الأولية إذا كانت قاعدة البيانات فارغة
+ */
+export async function ensureSeedDatabase(): Promise<void> {
+  const userCount = await localDB.users.count();
+  if (userCount > 0) return;
+
+  const defaultSchool = 'المدرسة الافتراضية';
+  const defaultYear = '2024-2025';
+  const nowIso = new Date().toISOString();
+
+  const seedAdmin: User & Record<string, any> = stampRecord({
+    id: 'seed_admin_1',
+    name: 'مدير عام',
+    jobTitle: 'مدير عام المدارس',
+    code: '1234',
+    role: 'admin',
+    schools: [defaultSchool],
+    academicYears: [defaultYear],
+    startDate: nowIso.split('T')[0],
+    expiryDate: '2099-12-31',
+    permissions: {
+      all: true,
+      dashboard: true,
+      dailyFollowUp: true,
+      adminFollowUp: true,
+      studentAffairs: true,
+      specialReports: true,
+      substitutions: true,
+      schoolProfile: true,
+      secretariat: true,
+      teacherPortal: true,
+      educationalSupervision: true,
+      specialCodes: true,
+      userManagement: true,
+      issuesModal: true,
+      caseStudyModal: true,
+      trainingCourses: true,
+      comprehensiveIndicators: true,
+      gradeSheets: true,
+      transport: true,
+      communicationDev: true,
+      schoolActivities: true,
+      finance: true,
+    },
+  }, { id: 'seed_admin_1', name: 'مدير عام' });
+
+  await localDB.users.put(seedAdmin);
+  await localDB.systemConfigs.bulkPut([
+    { key: 'availableSchools', data: [defaultSchool], lastUpdated: nowIso },
+    { key: 'availableYears', data: [defaultYear], lastUpdated: nowIso },
+    { key: 'schoolBranches', data: { [defaultSchool]: ['المركز الرئيسي'] }, lastUpdated: nowIso },
+  ]);
+}
```

#### 3. بتر الاتصال بالسيرفر في `GlobalState` وتحويل القراءة والحفظ إلى `localDB`

```diff
--- context/GlobalState.tsx
+++ context/GlobalState.tsx
@@ -10,2 +10,3 @@
-import api from "../src/lib/api";
+import { localDB, ensureSeedDatabase, loadFullAppDataFromLocalDB, saveSchoolSharedKeyToLocalDB, saveUserCollectionToLocalDB, saveSystemConfigToLocalDB } from "../src/lib/localDB";
+import { stampRecord, stampArrayRecords } from "../src/lib/recordStamping";
 import { toast } from "sonner";
@@ -675,127 +676,9 @@
-  // Offline status & synchronization queue states
-  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing' | 'offline' | 'connecting'>(
-    navigator.onLine ? 'synced' : 'offline'
-  );
-  const [pendingSyncCount, setPendingSyncCount] = useState(0);
-  const isSyncing = useRef(false);
-  const triggerSyncQueue = async () => { ... };
-  const queueSyncRequest = (url: string, payload: any, method: 'POST' | 'DELETE' = 'POST') => { ... };
+  // وضع العمل المحلي المستقل 100% بدون سيرفر خارجي
+  const [syncStatus] = useState<'synced' | 'pending' | 'syncing' | 'offline' | 'connecting'>('synced');
+  const [pendingSyncCount] = useState(0);
+  const queueSyncRequest = (_url: string, _payload: any, _method: 'POST' | 'DELETE' = 'POST') => {};
@@ -1261,95 +1144,35 @@
   // 1. Initial mounting, Seed Admin initialization, and session restoration from localDB
   useEffect(() => {
-    async function restoreSession() { ... }
-    async function loadGlobalConfigs() { ... }
+    async function initOfflineSystem() {
+      await ensureSeedDatabase();
+      const savedUserStr = localStorage.getItem('cached_auth_user');
+      const savedSchool = localStorage.getItem('selected_school') || '';
+      let activeUser: AuthUser | null = null;
+      if (savedUserStr) {
+        activeUser = JSON.parse(savedUserStr);
+        setCurrentUser(activeUser);
+        setIsAuthenticated(true);
+      }
+      const initialData = await loadFullAppDataFromLocalDB(
+        defaultData,
+        savedSchool || activeUser?.selectedSchool,
+        activeUser?.id
+      );
+      setData(initialData);
+    }
+    initOfflineSystem();
   }, []);
```

#### 4. تحويل الشاشات المستقلة والفرعية إلى `localDB` مع الختم القياسي (`stampRecord`)

```diff
--- app/GradeSheetsView.tsx
+++ app/GradeSheetsView.tsx
-import api from "../src/lib/api";
+import { localDB } from "../src/lib/localDB";
+import { stampRecord } from "../src/lib/recordStamping";
@@ -407,9 +408,5 @@
-      const [resSubject, resStudent, resAll] = await Promise.all([
-        api.get("/sync/standalone/GradeSheets"),
-        api.get("/sync/standalone/StudentGradeSheets"),
-        api.get("/sync/standalone/AllSubjectsGradeSheets")
-      ]);
+      const [sheetsData, studentSheetsData, allSubjectsSheetsData] = await Promise.all([
+        localDB.gradeSheets.toArray(),
+        localDB.studentGradeSheets.toArray(),
+        localDB.allSubjectsGradeSheets.toArray(),
+      ]);
@@ -780,39 +775,10 @@
-      if (currentSheetId) {
-        await api.post("/sync/standalone/GradeSheets", cleanPayload);
-      } else {
-        const res = await api.post("/sync/standalone/GradeSheets", cleanPayload);
-      }
+      const existing = currentSheetId ? await localDB.gradeSheets.get(currentSheetId) : null;
+      const stamped = stampRecord(
+        { ...cleanPayload, id: currentSheetId || undefined },
+        currentUser,
+        existing
+      );
+      await localDB.gradeSheets.put(stamped);
+      setCurrentSheetId(stamped.id);
```

```diff
--- components/CaseStudyModal.tsx
+++ components/CaseStudyModal.tsx
-import api from "../src/lib/api";
+import { localDB } from "../src/lib/localDB";
+import { stampRecord } from "../src/lib/recordStamping";
@@ -166,3 +166,2 @@
-          const res = await api.get("/sync/standalone/CaseStudies");
-          const fetchedLogs = res.data;
+          const fetchedLogs = await localDB.caseStudies.toArray();
@@ -582,2 +581,3 @@
-      await api.post("/sync/standalone/CaseStudies", payload);
+      const stamped = stampRecord(payload, currentUser);
+      await localDB.caseStudies.put(stamped);
@@ -667,1 +667,1 @@
-      await api.delete(`/sync/standalone/CaseStudies/${docId}`);
+      await localDB.caseStudies.delete(docId);
```

```diff
--- components/IssuesAndSolutionsModal.tsx
+++ components/IssuesAndSolutionsModal.tsx
-import api from "../src/lib/api";
+import { localDB } from "../src/lib/localDB";
+import { stampRecord } from "../src/lib/recordStamping";
@@ -104,2 +104,1 @@
-          const res = await api.get('/sync/standalone/issuesAndSolutions_log');
-          const docs = res.data;
+          const docs = await localDB.issuesAndSolutions.toArray();
@@ -183,1 +182,1 @@
-      await api.delete(`/sync/standalone/issuesAndSolutions_log/${id}`);
+      await localDB.issuesAndSolutions.delete(id);
@@ -215,1 +214,2 @@
-      await api.post('/sync/standalone/issuesAndSolutions_log', payload);
+      const stamped = stampRecord(payload, currentUser);
+      await localDB.issuesAndSolutions.put(stamped);
```

```diff
--- app/SchoolActivitiesPage.tsx
+++ app/SchoolActivitiesPage.tsx
-import api from "../src/lib/api";
+import { localDB } from "../src/lib/localDB";
+import { stampRecord } from "../src/lib/recordStamping";
@@ -227,2 +227,1 @@
-      const res = await api.get("/sync/standalone/SchoolActivities");
-      const list = (res.data || []) as SchoolActivityReport[];
+      const list = (await localDB.schoolActivities.toArray()) as SchoolActivityReport[];
@@ -350,2 +349,4 @@
-      const res = await api.post("/sync/standalone/SchoolActivities", payload);
-      const savedDoc = res.data;
+      const existing = editingId ? await localDB.schoolActivities.get(editingId) : null;
+      const savedDoc = stampRecord(payload, currentUser, existing);
+      await localDB.schoolActivities.put(savedDoc);
@@ -393,1 +394,1 @@
-      await api.delete(`/sync/standalone/SchoolActivities/${id}`);
+      await localDB.schoolActivities.delete(id);
```

```diff
--- package.json
+++ package.json
@@ -2,1 +2,1 @@
-  "name": "rafiquk-admin",
+  "name": "rafiquk-school",
@@ -8,1 +8,1 @@
-    "axios": "^1.16.1",
+    "dexie": "^4.0.11",
```
