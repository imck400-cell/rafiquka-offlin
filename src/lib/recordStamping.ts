export interface StampedMetadata {
  id: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface StampAuthor {
  id?: string;
  name?: string;
}

/**
 * يولّد معرّفاً فريداً مركباً بالصيغة القياسية:
 * {Date.now()}_{Math.random().toString(36).substring(2, 7)}
 * لضمان استحالة تشابه معرّفين بين هاتفين مختلفين.
 */
export function generateCompositeId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * يتحقق مما إذا كان المعرّف صالحاً ودائماً (وليس معرّفاً مؤقتاً قديماً أو فارغاً)
 */
export function isValidRecordId(id: unknown): id is string {
  return (
    typeof id === 'string' &&
    id.trim().length > 0 &&
    !id.startsWith('local_') &&
    !id.startsWith('temp_')
  );
}

/**
 * يقارن بين سجلين مع تجاهل حقول التوقيت والإصدار لمعرفة ما إذا تغير المحتوى الفعلي
 */
function hasRecordContentChanged(
  prev: Record<string, any>,
  next: Record<string, any>
): boolean {
  const ignoreKeys = new Set([
    'updatedAt',
    'version',
    'lastUpdated',
  ]);

  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of allKeys) {
    if (ignoreKeys.has(key)) continue;
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
      return true;
    }
  }
  return false;
}

/**
 * يختم أي سجل جديد أو معدّل قبل حفظه في localDB:
 * - id: معرّف فريد مركب {Date.now()}_{random5} إذا لم يكن موجوداً
 * - createdByUserId: معرّف المستخدم المنشئ
 * - createdByName: اسم المستخدم المنشئ
 * - createdAt: وقت الإنشاء
 * - updatedAt: وقت آخر تعديل
 * - version: عداد رقمي يبدأ من 1 ويزيد بمقدار +1 عند كل تعديل لنفس السجل
 */
export function stampRecord<T extends Record<string, any>>(
  record: T,
  author?: StampAuthor | null,
  previousRecord?: Record<string, any> | null
): T & StampedMetadata {
  const nowIso = new Date().toISOString();

  const resolvedUserId =
    author?.id ||
    record.createdByUserId ||
    record.userId ||
    record.authorId ||
    record.evaluatorId ||
    record.teacherId ||
    previousRecord?.createdByUserId ||
    previousRecord?.userId ||
    'seed_admin_1';

  const resolvedUserName =
    author?.name ||
    record.createdByName ||
    record.userName ||
    record.authorName ||
    record.evaluatorName ||
    record.writer ||
    record.supervisorName ||
    previousRecord?.createdByName ||
    previousRecord?.userName ||
    'مدير عام';

  const candidateId = record.id ?? record.uuid ?? previousRecord?.id ?? previousRecord?.uuid;
  const finalId = isValidRecordId(candidateId) ? candidateId : generateCompositeId();

  const existingVersion =
    typeof previousRecord?.version === 'number'
      ? previousRecord.version
      : typeof record.version === 'number'
      ? record.version
      : 0;

  const isBrandNew = !previousRecord && existingVersion === 0;
  const contentChanged = previousRecord
    ? hasRecordContentChanged(previousRecord, record)
    : true;

  const nextVersion = isBrandNew
    ? 1
    : contentChanged
    ? existingVersion + 1
    : Math.max(1, existingVersion);

  const createdAt =
    previousRecord?.createdAt ||
    record.createdAt ||
    record.timestamp ||
    nowIso;

  const updatedAt =
    isBrandNew || contentChanged
      ? nowIso
      : previousRecord?.updatedAt || record.updatedAt || nowIso;

  return {
    ...record,
    id: finalId,
    createdByUserId:
      previousRecord?.createdByUserId || record.createdByUserId || resolvedUserId,
    createdByName:
      previousRecord?.createdByName || record.createdByName || resolvedUserName,
    createdAt,
    updatedAt,
    version: nextVersion,
  };
}

/**
 * يختم مصفوفة كاملة من السجلات بمقارنتها مع المصفوفة السابقة
 * بحيث تزداد قيمة version بمقدار +1 فقط للعناصر التي تم تعديلها فعلياً
 */
export function stampArrayRecords<T extends Record<string, any>>(
  newArray: T[],
  oldArray: T[] = [],
  author?: StampAuthor | null
): (T & StampedMetadata)[] {
  if (!Array.isArray(newArray)) return [];

  const oldMap = new Map<string, Record<string, any>>();
  if (Array.isArray(oldArray)) {
    for (const item of oldArray) {
      if (item && typeof item === 'object') {
        const itemKey = item.id || item.uuid;
        if (itemKey) {
          oldMap.set(String(itemKey), item);
        }
      }
    }
  }

  return newArray.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return item as T & StampedMetadata;
    }
    const itemKey = item.id || item.uuid;
    const prevItem = itemKey ? oldMap.get(String(itemKey)) || null : null;
    return stampRecord(item, author, prevItem);
  });
}
