export type BundleType = 'DELTA_WORK' | 'MASTER_SEED';

export interface BundleDateRange {
  from?: string;
  to?: string;
}

export interface SchpackHeader {
  format: 'RAFIQUK_SCHPACK';
  version: 1;
  bundleType: BundleType;
  schoolName: string;
  rawSchoolName?: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  exportedAt: string;
  dateRange: BundleDateRange;
  hmacSignature: string;
}

export interface SchpackEnvelope {
  header: SchpackHeader;
  iv: string;
  ciphertext: string;
}

export interface BundlePayloadData {
  systemConfigs?: Record<string, any>;
  users?: Record<string, any>[];
  schoolSharedData?: Record<string, Record<string, any>>;
  userCollections?: Array<{
    schoolId: string;
    userId: string;
    key: string;
    items: any;
  }>;
  standaloneTables?: {
    gradeSheets?: Record<string, any>[];
    studentGradeSheets?: Record<string, any>[];
    allSubjectsGradeSheets?: Record<string, any>[];
    caseStudies?: Record<string, any>[];
    issuesAndSolutions?: Record<string, any>[];
    schoolActivities?: Record<string, any>[];
  };
  [key: string]: any;
}

export interface VerifiedBundleResult<T = any> {
  header: SchpackHeader;
  payload: T;
  data: T;
}

export const TAMPER_ERROR_MESSAGE =
  'الملف تالف أو تم التلاعب بمحتواه خارج النظام';

// مفاتيح اشتقاق قياسية مدمجة للتوقيع الرقمي (HMAC-SHA256) والتشفير (AES-GCM-256) عبر Web Crypto API
const HMAC_SECRET_PHRASE =
  'RAFIQUK_SCHOOL_OFFLINE_HMAC_SHA256_SOVEREIGN_KEY_2025_V1';
const AES_SECRET_PHRASE =
  'RAFIQUK_SCHOOL_OFFLINE_AES_GCM_256_SOVEREIGN_KEY_2025_V1';

/**
 * تطبيع اسم المدرسة محلياً داخل المحرك لضمان استقلالية الملف التامة
 */
function normalizeSchoolNameInternal(school?: string | null): string {
  if (!school) return '';
  let str = String(school).trim();
  str = str
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/^[\s"'\[\]\(\)\{\}«»\-_]+|[\s"'\[\]\(\)\{\}«»\-_]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  str = str.replace(
    /^(?:(?:مدرسه|المدرسه|مدارس|المدارس|مجمع|المجمع|روضه|الروضه|ثانويه|الثانويه)\s+)+/i,
    ''
  );
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * تحويل سلسلة نصية UTF-8 إلى مصفوفة بايتات Uint8Array
 */
function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * تحويل مصفوفة بايتات Uint8Array إلى سلسلة نصية UTF-8
 */
function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * تحويل مصفوفة بايتات Uint8Array إلى Base64 آمن
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}

/**
 * تحويل سلسلة Base64 إلى مصفوفة بايتات Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64.trim());
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * تحويل مصفوفة بايتات إلى سلسلة ست عشرية (Hex)
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * اشتقاق مفتاح AES-GCM بطول 256 بت باستخدام SubtleCrypto القياسية
 */
async function getAesGcmKey(): Promise<CryptoKey> {
  const rawMaterial = utf8ToBytes(AES_SECRET_PHRASE);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    rawMaterial as BufferSource
  );
  return crypto.subtle.importKey(
    'raw',
    digest,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * اشتقاق مفتاح التوقيع الرقمي HMAC-SHA256 باستخدام SubtleCrypto القياسية
 */
async function getHmacSha256Key(): Promise<CryptoKey> {
  const keyBytes = utf8ToBytes(HMAC_SECRET_PHRASE);
  return crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign', 'verify']
  );
}

/**
 * بناء السلسلة القانونية الموحدة للتوقيع الرقمي بحيث تشمل الترويسة ومتجه التهيئة والنص المشفر والنص الأصلي
 */
function buildCanonicalSigningMessage(
  headerWithoutSig: Omit<SchpackHeader, 'hmacSignature'>,
  ivBase64: string,
  ciphertextBase64: string,
  payloadStr: string
): string {
  return JSON.stringify({
    format: headerWithoutSig.format,
    version: headerWithoutSig.version,
    bundleType: headerWithoutSig.bundleType,
    schoolName: headerWithoutSig.schoolName,
    rawSchoolName: headerWithoutSig.rawSchoolName || '',
    senderId: headerWithoutSig.senderId,
    senderName: headerWithoutSig.senderName,
    senderRole: headerWithoutSig.senderRole,
    exportedAt: headerWithoutSig.exportedAt,
    dateRange: {
      from: headerWithoutSig.dateRange?.from || '',
      to: headerWithoutSig.dateRange?.to || '',
    },
    iv: ivBase64,
    ciphertext: ciphertextBase64,
    payloadStr,
  });
}

/**
 * 2. دالة generateHMAC(payloadStr: string):
 * توليد بصمة تحقق رقمية آمنة (HMAC-SHA256) بالاعتماد الكلي على Web Crypto API (crypto.subtle)
 */
export async function generateHMAC(payloadStr: string): Promise<string> {
  if (!crypto?.subtle) {
    throw new Error(
      'بيئة المتصفح لا تدعم واجهة التشفير القياسية Web Crypto API.'
    );
  }
  const key = await getHmacSha256Key();
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    utf8ToBytes(payloadStr) as BufferSource
  );
  return bytesToHex(new Uint8Array(signatureBuffer));
}

/**
 * 3. دالة packAndSignBundle(bundleData: any):
 * - تأخذ كائن الحزمة وتحوله إلى نص JSON.
 * - تولد بصمة HMAC-SHA256 للبيانات.
 * - تدمج الترويسة وتشفر المحتوى بخوارزمية AES-GCM-256 بصيغة مشفرة آمنة لا يمكن فتحها أو تعديلها بمحررات النصوص العادية.
 * - ترجع نص الحزمة النهائي المشفر الجاهز للحفظ كامتداد .schpack.
 */
export async function packAndSignBundle(bundleData: any): Promise<string> {
  if (!crypto?.subtle) {
    throw new Error(
      'بيئة المتصفح لا تدعم واجهة التشفير القياسية Web Crypto API.'
    );
  }

  if (!bundleData || typeof bundleData !== 'object') {
    throw new Error('بيانات الحزمة المراد تشفيرها غير صالحة.');
  }

  const metaSource = bundleData.header || bundleData.meta || bundleData;
  const rawSchoolName =
    metaSource.rawSchoolName ||
    metaSource.schoolName ||
    metaSource.school ||
    'المدرسة الافتراضية';
  const normalizedSchool =
    normalizeSchoolNameInternal(rawSchoolName) || 'المدرسه الافتراضيه';

  const bundleType: BundleType =
    metaSource.bundleType === 'MASTER_SEED' || metaSource.type === 'MASTER'
      ? 'MASTER_SEED'
      : 'DELTA_WORK';

  const exportedAt =
    typeof metaSource.exportedAt === 'string' && metaSource.exportedAt
      ? metaSource.exportedAt
      : new Date().toISOString();

  const headerWithoutSig: Omit<SchpackHeader, 'hmacSignature'> = {
    format: 'RAFIQUK_SCHPACK',
    version: 1,
    bundleType,
    schoolName: normalizedSchool,
    rawSchoolName: String(rawSchoolName).trim(),
    senderId: String(metaSource.senderId || metaSource.userId || 'unknown'),
    senderName: String(metaSource.senderName || metaSource.userName || 'مستخدم'),
    senderRole: String(metaSource.senderRole || metaSource.role || 'user'),
    exportedAt,
    dateRange: {
      from: metaSource.dateRange?.from || '',
      to: metaSource.dateRange?.to || '',
    },
  };

  // تحويل كائن الحزمة الكامل إلى نص JSON وتشفيره بواسطة AES-GCM-256
  const payloadStr = JSON.stringify(bundleData);
  const plaintextBytes = utf8ToBytes(payloadStr);
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await getAesGcmKey();

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes as BufferSource },
    aesKey,
    plaintextBytes as BufferSource
  );

  const ivBase64 = bytesToBase64(ivBytes);
  const ciphertextBase64 = bytesToBase64(new Uint8Array(encryptedBuffer));

  // توليد بصمة HMAC-SHA256 تشمل الترويسة + متجه التهيئة + النص المشفر + نص البيانات الأصلي
  const canonicalMessage = buildCanonicalSigningMessage(
    headerWithoutSig,
    ivBase64,
    ciphertextBase64,
    payloadStr
  );
  const hmacSignature = await generateHMAC(canonicalMessage);

  const envelope: SchpackEnvelope = {
    header: {
      ...headerWithoutSig,
      hmacSignature,
    },
    iv: ivBase64,
    ciphertext: ciphertextBase64,
  };

  // تغليف وترميز الحزمة النهائية بصيغة محمية تمنع التعديل النصي المباشر
  const envelopeJson = JSON.stringify(envelope);
  const encodedBody = bytesToBase64(utf8ToBytes(envelopeJson));
  return `RAFIQUK_SCHPACK_V1.${hmacSignature}.${encodedBody}`;
}

/**
 * 4. دالة verifyAndUnpackBundle(packedStr: string):
 * - تفك التشفير والترميز للحزمة.
 * - تعيد حساب بصمة HMAC وتطابقها مع البصمة الأصلية في الترويسة.
 * - إذا تم تغيير حرف واحد أو التلاعب بالبيانات خارج التطبيق، ترمي استثناءً أمنياً واضحاً:
 *   "الملف تالف أو تم التلاعب بمحتواه خارج النظام".
 * - إذا كانت الحزمة سليمة، ترجع كائن البيانات الأصلي بالكامل.
 */
export async function verifyAndUnpackBundle<T = any>(
  packedStr: string
): Promise<T> {
  try {
    if (!packedStr || typeof packedStr !== 'string') {
      throw new Error(TAMPER_ERROR_MESSAGE);
    }

    const trimmed = packedStr.trim();
    let envelope: SchpackEnvelope;

    if (trimmed.startsWith('RAFIQUK_SCHPACK_V1.')) {
      const parts = trimmed.split('.');
      if (parts.length !== 3) {
        throw new Error(TAMPER_ERROR_MESSAGE);
      }
      const outerSignature = parts[1];
      const encodedBody = parts[2];
      const decodedJson = bytesToUtf8(base64ToBytes(encodedBody));
      envelope = JSON.parse(decodedJson) as SchpackEnvelope;

      if (
        !envelope?.header ||
        envelope.header.hmacSignature !== outerSignature
      ) {
        throw new Error(TAMPER_ERROR_MESSAGE);
      }
    } else if (trimmed.startsWith('{')) {
      envelope = JSON.parse(trimmed) as SchpackEnvelope;
    } else {
      throw new Error(TAMPER_ERROR_MESSAGE);
    }

    if (
      !envelope ||
      typeof envelope !== 'object' ||
      !envelope.header ||
      envelope.header.format !== 'RAFIQUK_SCHPACK' ||
      envelope.header.version !== 1 ||
      (envelope.header.bundleType !== 'DELTA_WORK' &&
        envelope.header.bundleType !== 'MASTER_SEED') ||
      !envelope.header.hmacSignature ||
      !envelope.iv ||
      !envelope.ciphertext
    ) {
      throw new Error(TAMPER_ERROR_MESSAGE);
    }

    // فك تشفير AES-GCM-256 (يرمي استثناءً تلقائياً أيضاً إذا تم العبث بـ Authentication Tag)
    const ivBytes = base64ToBytes(envelope.iv);
    const ciphertextBytes = base64ToBytes(envelope.ciphertext);
    const aesKey = await getAesGcmKey();

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes as BufferSource },
      aesKey,
      ciphertextBytes as BufferSource
    );

    const decryptedPayloadStr = bytesToUtf8(new Uint8Array(decryptedBuffer));

    // إعادة حساب بصمة HMAC-SHA256 ومطابقتها مع البصمة الأصلية في الترويسة
    const canonicalMessage = buildCanonicalSigningMessage(
      envelope.header,
      envelope.iv,
      envelope.ciphertext,
      decryptedPayloadStr
    );
    const computedHmac = await generateHMAC(canonicalMessage);

    if (computedHmac !== envelope.header.hmacSignature) {
      throw new Error(TAMPER_ERROR_MESSAGE);
    }

    const originalData = JSON.parse(decryptedPayloadStr);
    if (!originalData || typeof originalData !== 'object') {
      throw new Error(TAMPER_ERROR_MESSAGE);
    }

    // إرفاق الترويسة الموثقة مع الكائن المسترجع في حال لم تكن مضمنة بداخله
    if (!originalData.header) {
      Object.defineProperty(originalData, 'header', {
        value: envelope.header,
        enumerable: false,
        configurable: true,
        writable: true,
      });
    }

    return originalData as T;
  } catch (err: any) {
    if (err?.message === TAMPER_ERROR_MESSAGE) {
      throw err;
    }
    throw new Error(TAMPER_ERROR_MESSAGE);
  }
}

/**
 * دوال مساعدة متوافقة مع واجهات الدمج الذكي (تعتمد كلياً على generateHMAC و packAndSignBundle و verifyAndUnpackBundle)
 */
export const computeHmacSha256Signature = generateHMAC;

export async function createSignedEncryptedBundle(
  meta: {
    bundleType: BundleType;
    schoolName: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    dateRange?: BundleDateRange;
  },
  payload: BundlePayloadData
): Promise<string> {
  return packAndSignBundle({
    header: {
      format: 'RAFIQUK_SCHPACK',
      version: 1,
      bundleType: meta.bundleType,
      schoolName: normalizeSchoolNameInternal(meta.schoolName) || 'المدرسه الافتراضيه',
      rawSchoolName: meta.schoolName?.trim() || 'المدرسة الافتراضية',
      senderId: meta.senderId,
      senderName: meta.senderName,
      senderRole: meta.senderRole,
      exportedAt: new Date().toISOString(),
      dateRange: {
        from: meta.dateRange?.from || '',
        to: meta.dateRange?.to || '',
      },
    },
    payload,
  });
}

export async function verifyAndDecryptBundle(
  rawBundleContent: string
): Promise<VerifiedBundleResult<BundlePayloadData>> {
  const unpacked = await verifyAndUnpackBundle<any>(rawBundleContent);
  const header: SchpackHeader = unpacked.header;
  const payload: BundlePayloadData = unpacked.payload ?? unpacked;
  return {
    header,
    payload,
    data: payload,
  };
}
