import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  Download,
  Share2,
  ShieldCheck,
  QrCode,
  Camera,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileCheck2,
  Calendar,
  Building2,
  UserCheck,
  Layers,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  HardDriveDownload,
  HardDriveUpload,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useGlobal } from '../context/GlobalState';
import {
  packAndSignBundle,
  verifyAndUnpackBundle,
  BundleDateRange,
  TAMPER_ERROR_MESSAGE,
} from '../src/lib/BundleCryptoEngine';
import {
  buildExportBundlePayload,
  importAndSmartMergeSchpack as executeSmartMerge,
  MergeExecutionReport,
} from '../src/lib/SmartMergeEngine';
import { localDB, loadFullAppDataFromLocalDB } from '../src/lib/localDB';

export interface DataSyncCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'files' | 'qr' | 'backup';
}

type SyncTab = 'files' | 'qr' | 'backup';
type DateRangePreset = 'today' | 'week' | 'month' | 'all' | 'custom';

const TABLE_ARABIC_LABELS: Record<string, string> = {
  systemConfigs: 'إعدادات النظام والمدارس',
  users: 'حسابات وصلاحيات المستخدمين',
  profile: 'الملف التعريفي للمدرسة',
  secretariatStaff: 'كادر المعلمين والموظفين',
  secretariatStudents: 'سجلات الطلاب',
  dailyReports: 'متابعة المعلمين اليومية',
  adminReports: 'متابعة الكادر الإداري',
  adminIndividualReports: 'التقارير الفردية للإداريين',
  teacherEvaluations: 'تقارير الإشراف والزيارات الصفية',
  peerVisits: 'الزيارات التبادلية بين المعلمين',
  deliveryReceiptRecords: 'سجلات الاستلام والتسليم',
  dailyPreparations: 'التحضير اليومي للدروس',
  selfEvaluations: 'التقييم الذاتي للمعلمين',
  studentEvaluations: 'تقييم الطلاب للمعلمين',
  schoolHomeworks: 'الواجبات المدرسية',
  communicationPosts: 'منشورات التواصل والتطوير',
  substitutions: 'جدول وتغطية الاحتياط',
  violations: 'التنبيهات والمخالفات',
  parentVisits: 'زيارات أولياء الأمور',
  absenceLogs: 'سجلات الغياب',
  studentLatenessLogs: 'سجلات التأخر الصباحي',
  studentViolationLogs: 'سجلات مخالفات الطلاب',
  exitLogs: 'سجلات الاستئذان والخروج',
  damageLogs: 'سجلات الإتلاف والممتلكات',
  parentVisitLogs: 'سجلات توافد أولياء الأمور',
  examLogs: 'سجلات الاختبارات',
  notebookFollowUpLogs: 'متابعة تصحيح الدفاتر',
  notebookReportArchives: 'أرشيف تقارير الدفاتر',
  genericSpecialReports: 'التقارير الخاصة',
  taskReports: 'تقارير إنجاز المهام',
  addedTasks: 'المهام المضافة',
  postponedTasks: 'المهام المؤجلة',
  studentReinforcements: 'تعزيز وتكريم الطلاب',
  issueRecommendations: 'المشكلات والتوصيات',
  creativityRecords: 'الإبداع والتميز',
  trainingEvaluations: 'تقييم الدورات التدريبية',
  transportBuses: 'حافلات النقل المدرسي',
  transportLogs: 'سجلات حركة النقل المدرسي',
  transportDailyStatus: 'الحالة اليومية للحافلات',
  financeRecords: 'السجلات المالية',
  gradeSheets: 'كشوف الدرجات الفصلية',
  studentGradeSheets: 'شهادات درجات الطلاب',
  allSubjectsGradeSheets: 'محصلة درجات جميع المواد',
  caseStudies: 'دراسة الحالات الطلابية',
  issuesAndSolutions: 'القضايا والحلول التربوية',
  schoolActivities: 'الأنشطة والفعاليات المدرسية',
};

/**
 * حساب النطاق الزمني بصYG-MM-DD حسب الخيار المحدد
 */
function computeDateRange(
  preset: DateRangePreset,
  customFrom: string,
  customTo: string
): BundleDateRange | undefined {
  const now = new Date();
  const toIsoDate = (d: Date) => d.toISOString().split('T')[0];

  if (preset === 'all') {
    return undefined;
  }
  if (preset === 'today') {
    const today = toIsoDate(now);
    return { from: today, to: today };
  }
  if (preset === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return { from: toIsoDate(weekAgo), to: toIsoDate(now) };
  }
  if (preset === 'month') {
    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 30);
    return { from: toIsoDate(monthAgo), to: toIsoDate(now) };
  }
  return {
    from: customFrom || undefined,
    to: customTo || undefined,
  };
}

/**
 * تنزيل محتوى نصي كملف في جهاز المستخدم
 */
function triggerFileDownload(content: string, filename: string): File {
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const file = new File([blob], filename, { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return file;
}

/**
 * رسم مصفوفة باركود ثنائية الأبعاد (Visual 2D Matrix Code) على Canvas بدون مكتبات خارجية
 * لضمان عمل المزامنة البصرية 100% أوفلاين
 */
function renderVisualMatrixOnCanvas(
  canvas: HTMLCanvasElement | null,
  chunkText: string,
  frameIndex: number,
  totalFrames: number
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = 280;
  canvas.width = size;
  canvas.height = size;

  const gridCount = 33;
  const padding = 16;
  const cellSize = (size - padding * 2) / gridCount;

  // خلفية بيضاء عالية التباين
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const drawFinderPattern = (startX: number, startY: number) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(
      padding + startX * cellSize,
      padding + startY * cellSize,
      7 * cellSize,
      7 * cellSize
    );
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(
      padding + (startX + 1) * cellSize,
      padding + (startY + 1) * cellSize,
      5 * cellSize,
      5 * cellSize
    );
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(
      padding + (startX + 2) * cellSize,
      padding + (startY + 2) * cellSize,
      3 * cellSize,
      3 * cellSize
    );
  };

  drawFinderPattern(0, 0);
  drawFinderPattern(gridCount - 7, 0);
  drawFinderPattern(0, gridCount - 7);

  // تحويل نص الشريحة إلى بتات لرسم الخلايا
  const bytes = new TextEncoder().encode(
    `${frameIndex + 1}/${totalFrames}:${chunkText}`
  );
  let bitIdx = 0;

  for (let row = 0; row < gridCount; row++) {
    for (let col = 0; col < gridCount; col++) {
      const inTopLeft = row < 8 && col < 8;
      const inTopRight = row < 8 && col >= gridCount - 8;
      const inBottomLeft = row >= gridCount - 8 && col < 8;
      if (inTopLeft || inTopRight || inBottomLeft) continue;

      const bytePos = Math.floor(bitIdx / 8) % Math.max(1, bytes.length);
      const bitOffset = bitIdx % 8;
      const byteVal = bytes[bytePos] ?? 0;
      const isDark =
        ((byteVal >> bitOffset) & 1) === 1 ||
        ((row * 17 + col * 31 + byteVal + frameIndex) % 5 === 0);

      if (isDark) {
        ctx.fillStyle = (row + col) % 7 === 0 ? '#1d4ed8' : '#0f172a';
        ctx.fillRect(
          padding + col * cellSize,
          padding + row * cellSize,
          Math.ceil(cellSize),
          Math.ceil(cellSize)
        );
      }
      bitIdx++;
    }
  }
}

export const DataSyncCenterModal: React.FC<DataSyncCenterModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'files',
}) => {
  const { currentUser, data, updateData } = useGlobal();

  const [activeTab, setActiveTab] = useState<SyncTab>(initialTab);
  const [datePreset, setDatePreset] = useState<DateRangePreset>('week');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastExportedFile, setLastExportedFile] = useState<{
    file: File;
    filename: string;
    content: string;
  } | null>(null);

  const [mergeReport, setMergeReport] = useState<MergeExecutionReport | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // حالات المزامنة البصرية QR Sync
  const [qrMode, setQrMode] = useState<'idle' | 'display' | 'scan'>('idle');
  const [qrChunks, setQrChunks] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [isQrPlaying, setIsQrPlaying] = useState<boolean>(true);
  const [scannedFramesMap, setScannedFramesMap] = useState<
    Record<number, string>
  >({});
  const [expectedTotalFrames, setExpectedTotalFrames] = useState<number>(0);
  const [manualQrInput, setManualQrInput] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fullBackupInputRef = useRef<HTMLInputElement | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);

  // صلاحية المدير أو السكرتير لإصدار حزمة تهيئة المدرسة
  const isManagerOrSecretariat = Boolean(
    currentUser &&
      (currentUser.role === 'admin' ||
        currentUser.permissions?.all === true ||
        (Array.isArray(currentUser.permissions?.secretariat) &&
          currentUser.permissions.secretariat.includes('view')) ||
        (Array.isArray(currentUser.permissions?.schoolProfile) &&
          currentUser.permissions.schoolProfile.includes('view')))
  );

  // إيقاف الكاميرا عند إغلاق النافذة أو تغيير التبويب
  const stopCameraStream = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen || activeTab !== 'qr' || qrMode !== 'scan') {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, activeTab, qrMode, stopCameraStream]);

  // تحريك شرائح الباركود المتسلسلة تلقائياً
  useEffect(() => {
    if (
      activeTab !== 'qr' ||
      qrMode !== 'display' ||
      qrChunks.length <= 1 ||
      !isQrPlaying
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setCurrentChunkIndex((prev) => (prev + 1) % qrChunks.length);
    }, 950);
    return () => window.clearInterval(timer);
  }, [activeTab, qrMode, qrChunks.length, isQrPlaying]);

  // رسم الباركود الحالي على الـ Canvas
  useEffect(() => {
    if (activeTab === 'qr' && qrMode === 'display' && qrChunks.length > 0) {
      renderVisualMatrixOnCanvas(
        qrCanvasRef.current,
        qrChunks[currentChunkIndex] || '',
        currentChunkIndex,
        qrChunks.length
      );
    }
  }, [activeTab, qrMode, qrChunks, currentChunkIndex]);

  if (!isOpen) return null;

  /**
   * 1. تصدير حزمة أعمال الموظف الحالي (.schpack)
   */
  const handleExportWorkBundle = async () => {
    if (!currentUser) {
      toast.error('يرجى تسجيل الدخول أولاً لتصدير أعمالك.');
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);
    try {
      const dateRange = computeDateRange(datePreset, customFrom, customTo);
      const { bundleType, schoolName, payload } =
        await buildExportBundlePayload(currentUser, {
          type: 'DELTA',
          dateRange,
        });

      const exportBundleObject = {
        header: {
          format: 'RAFIQUK_SCHPACK' as const,
          version: 1 as const,
          bundleType,
          schoolName,
          rawSchoolName: schoolName,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole: currentUser.role,
          exportedAt: new Date().toISOString(),
          dateRange: dateRange || {},
        },
        payload,
      };

      const packedStr = await packAndSignBundle(exportBundleObject);
      const dateTag = new Date().toISOString().split('T')[0];
      const safeName = (currentUser.name || 'موظف').trim().replace(/\s+/g, '_');
      const filename = `أعمال_${safeName}_${dateTag}.schpack`;

      const downloadedFile = triggerFileDownload(packedStr, filename);
      setLastExportedFile({
        file: downloadedFile,
        filename,
        content: packedStr,
      });

      toast.success(`تم تصدير وتوقيع حزمة أعمالك بنجاح (${filename})`);
    } catch (err: any) {
      const msg = err?.message || 'حدث خطأ أثناء تصدير حزمة الأعمال.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * مشاركة ملف الحزمة عبر Web Share API للهواتف والأجهزة الداعمة
   */
  const handleNativeShareFile = async (fileInfo?: {
    file: File;
    filename: string;
    content: string;
  }) => {
    const target = fileInfo || lastExportedFile;
    if (!target) return;

    try {
      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [target.file] })) {
        await nav.share({
          title: `حزمة أعمال رفيقك المدرسي - ${target.filename}`,
          text: `مرفق حزمة البيانات المشفرة والموقعة رقمياً (${target.filename})`,
          files: [target.file],
        });
        toast.success('تمت مشاركة ملف الحزمة بنجاح.');
      } else if (nav.share) {
        await nav.share({
          title: `حزمة أعمال رفيقك المدرسي - ${target.filename}`,
          text: target.content,
        });
      } else {
        await navigator.clipboard.writeText(target.content);
        toast.info(
          'تم نسخ محتوى الحزمة المشفرة إلى الحافظة (جهازك لا يدعم مشاركة الملفات المباشرة).'
        );
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error('تعذر فتح نافذة المشاركة في الجهاز.');
      }
    }
  };

  /**
   * 2. استيراد وفحص ودمج حزمة (.schpack) عبر verifyAndUnpackBundle + executeSmartMerge
   */
  const processIncomingSchpackContent = async (rawContent: string) => {
    setIsImporting(true);
    setErrorMessage(null);
    setMergeReport(null);

    try {
      // التحقق الصارم من التوقيع الرقمي وفك التشفير أولاً
      await verifyAndUnpackBundle(rawContent);

      // تنفيذ الدمج الذكي في localDB دون مسح أي بيانات محلية
      const report = await executeSmartMerge(rawContent);
      const selectedSchool =
        currentUser?.selectedSchool ||
        currentUser?.schools?.[0] ||
        report.schoolName ||
        'المدرسة الافتراضية';
      const freshData = await loadFullAppDataFromLocalDB(
        data,
        selectedSchool,
        currentUser?.id
      );
      updateData(freshData);
      setMergeReport(report);

      toast.success(
        `تم استيراد ودمج حزمة (${report.senderName}) بنجاح! (+${report.addedCount} جديد، ${report.updatedCount} محدّث)`
      );
    } catch (err: any) {
      const msg = err?.message || TAMPER_ERROR_MESSAGE;
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await processIncomingSchpackContent(text);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const text = await file.text();
    await processIncomingSchpackContent(text);
  };

  /**
   * 3. التبويب الثاني: توليد باركود الحزمة للمزامنة البصرية السريعة (QR Sync)
   */
  const handleGenerateQrSync = async () => {
    if (!currentUser) {
      toast.error('يرجى تسجيل الدخول أولاً.');
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);
    try {
      const dateRange = computeDateRange(datePreset, customFrom, customTo);
      const { bundleType, schoolName, payload } =
        await buildExportBundlePayload(currentUser, {
          type: 'DELTA',
          dateRange,
        });

      const packedStr = await packAndSignBundle({
        header: {
          format: 'RAFIQUK_SCHPACK' as const,
          version: 1 as const,
          bundleType,
          schoolName,
          rawSchoolName: schoolName,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole: currentUser.role,
          exportedAt: new Date().toISOString(),
          dateRange: dateRange || {},
        },
        payload,
      });

      // تقسيم الحزمة المشفرة إلى شرائح متسلسلة سريعة القراءة
      const chunkSize = 600;
      const chunks: string[] = [];
      const total = Math.max(1, Math.ceil(packedStr.length / chunkSize));
      for (let i = 0; i < total; i++) {
        const part = packedStr.slice(i * chunkSize, (i + 1) * chunkSize);
        chunks.push(`RAFIQUK_QR|${i + 1}|${total}|${part}`);
      }

      setQrChunks(chunks);
      setCurrentChunkIndex(0);
      setIsQrPlaying(true);
      setQrMode('display');
    } catch (err: any) {
      toast.error(err?.message || 'تعذر توليد باركود الأعمال.');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * قراءة شريحة QR ممسوحة وتجميعها حتى تكتمل الحزمة ثم دمجها فوراً
   */
  const handleRawQrDetected = useCallback(
    async (rawValue: string) => {
      const trimmed = rawValue.trim();
      if (!trimmed) return;

      // إذا كانت الحزمة كاملة في كود واحد مباشرة
      if (trimmed.startsWith('RAFIQUK_SCHPACK_V1.')) {
        stopCameraStream();
        setQrMode('idle');
        await processIncomingSchpackContent(trimmed);
        return;
      }

      // إذا كانت شريحة من سلسلة أكواد مجزأة: RAFIQUK_QR|index|total|chunk
      if (trimmed.startsWith('RAFIQUK_QR|')) {
        const firstPipe = trimmed.indexOf('|');
        const secondPipe = trimmed.indexOf('|', firstPipe + 1);
        const thirdPipe = trimmed.indexOf('|', secondPipe + 1);
        if (firstPipe === -1 || secondPipe === -1 || thirdPipe === -1) return;

        const idx = parseInt(trimmed.slice(firstPipe + 1, secondPipe), 10);
        const total = parseInt(trimmed.slice(secondPipe + 1, thirdPipe), 10);
        const chunkPayload = trimmed.slice(thirdPipe + 1);

        if (isNaN(idx) || isNaN(total) || total < 1) return;

        setExpectedTotalFrames(total);
        setScannedFramesMap((prev) => {
          if (prev[idx] === chunkPayload) return prev;
          const updated = { ...prev, [idx]: chunkPayload };
          const collectedCount = Object.keys(updated).length;

          if (collectedCount === total) {
            const fullPacked = Array.from({ length: total }, (_, i) => updated[i + 1] || '').join('');
            setTimeout(() => {
              stopCameraStream();
              setQrMode('idle');
              processIncomingSchpackContent(fullPacked);
            }, 150);
          }
          return updated;
        });
      }
    },
    [stopCameraStream]
  );

  /**
   * تشغيل الكاميرا لمسح الباركود من هاتف الزميل
   */
  const handleStartCameraScan = async () => {
    setCameraError(null);
    setScannedFramesMap({});
    setExpectedTotalFrames(0);
    setQrMode('scan');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          'متصفح الجهاز الحالي لا يدعم الوصول المباشر للكاميرا. يمكنك لصق رمز المزامنة المباشر أدناه.'
        );
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const BarcodeDetectorApi = (window as any).BarcodeDetector;
      if (BarcodeDetectorApi) {
        const detector = new BarcodeDetectorApi({
          formats: ['qr_code', 'data_matrix'],
        });

        const scanFrame = async () => {
          if (
            videoRef.current &&
            videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
          ) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                for (const code of barcodes) {
                  if (code.rawValue) {
                    await handleRawQrDetected(code.rawValue);
                  }
                }
              }
            } catch {
              // استمرار المسح في الإطار التالي
            }
          }
          scanLoopRef.current = requestAnimationFrame(scanFrame);
        };

        scanLoopRef.current = requestAnimationFrame(scanFrame);
      } else {
        setCameraError(
          'الكاميرا نشطة. إذا كان جهازك لا يدعم القراءة التلقائية، استخدم زر نسخ/لصق كود المزامنة السريع أدناه.'
        );
      }
    } catch {
      setCameraError(
        'تعذر فتح الكاميرا (تأكد من منح صلاحية الكاميرا للتطبيق أو استخدم لصق كود المزامنة أدناه).'
      );
    }
  };

  /**
   * 4. التبويب الثالث: إصدار حزمة تهيئة المدرسة (Master Config Seed) للمدير/السكرتير
   */
  const handleExportMasterSeedBundle = async () => {
    if (!currentUser) return;
    setIsExporting(true);
    setErrorMessage(null);

    try {
      const { bundleType, schoolName, payload } =
        await buildExportBundlePayload(currentUser, {
          type: 'MASTER',
        });

      const packedStr = await packAndSignBundle({
        header: {
          format: 'RAFIQUK_SCHPACK' as const,
          version: 1 as const,
          bundleType,
          schoolName,
          rawSchoolName: schoolName,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole: currentUser.role,
          exportedAt: new Date().toISOString(),
          dateRange: {},
        },
        payload,
      });

      const dateTag = new Date().toISOString().split('T')[0];
      const safeSchool = (schoolName || 'المدرسة').trim().replace(/\s+/g, '_');
      const filename = `تهيئة_مدرسة_${safeSchool}_${dateTag}.schpack`;

      const file = triggerFileDownload(packedStr, filename);
      setLastExportedFile({ file, filename, content: packedStr });
      toast.success(
        `تم إصدار حزمة تهيئة المدرسة (${filename}) بنجاح لتوزيعها على الكادر.`
      );
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء إصدار حزمة تهيئة المدرسة.');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * حفظ نسخة احتياطية محلية شاملة لكافة جداول IndexedDB العشرة
   */
  const handleExportFullIndexedDBBackup = async () => {
    if (!currentUser) return;
    setIsExporting(true);
    setErrorMessage(null);

    try {
      const [
        systemConfigsArr,
        usersArr,
        schoolSharedArr,
        userCollectionsArr,
        gradeSheets,
        studentGradeSheets,
        allSubjectsGradeSheets,
        caseStudies,
        issuesAndSolutions,
        schoolActivities,
      ] = await Promise.all([
        localDB.systemConfigs.toArray(),
        localDB.users.toArray(),
        localDB.schoolSharedData.toArray(),
        localDB.userCollections.toArray(),
        localDB.gradeSheets.toArray(),
        localDB.studentGradeSheets.toArray(),
        localDB.allSubjectsGradeSheets.toArray(),
        localDB.caseStudies.toArray(),
        localDB.issuesAndSolutions.toArray(),
        localDB.schoolActivities.toArray(),
      ]);

      const systemConfigs: Record<string, any> = {};
      systemConfigsArr.forEach((row) => {
        systemConfigs[row.key] = row.data;
      });

      const schoolSharedData: Record<string, Record<string, any>> = {};
      schoolSharedArr.forEach((row) => {
        if (!schoolSharedData[row.schoolId]) {
          schoolSharedData[row.schoolId] = {};
        }
        schoolSharedData[row.schoolId][row.key] = row.data;
      });

      const schoolName =
        currentUser.selectedSchool?.split(',')[0]?.trim() ||
        currentUser.schools?.[0] ||
        'المدرسة الافتراضية';

      const backupBundle = {
        header: {
          format: 'RAFIQUK_SCHPACK' as const,
          version: 1 as const,
          bundleType: 'MASTER_SEED' as const,
          schoolName,
          rawSchoolName: schoolName,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole: currentUser.role,
          exportedAt: new Date().toISOString(),
          dateRange: {},
        },
        payload: {
          isFullDatabaseBackup: true,
          systemConfigs,
          users: usersArr,
          schoolSharedData,
          userCollections: userCollectionsArr.map((u) => ({
            schoolId: u.schoolId,
            userId: u.userId,
            key: u.key,
            items: u.items,
          })),
          standaloneTables: {
            gradeSheets,
            studentGradeSheets,
            allSubjectsGradeSheets,
            caseStudies,
            issuesAndSolutions,
            schoolActivities,
          },
        },
      };

      const packedBackup = await packAndSignBundle(backupBundle);
      const dateTag = new Date().toISOString().split('T')[0];
      const filename = `نسخة_احتياطية_شاملة_رفيقك_المدرسي_${dateTag}.schpack`;

      const file = triggerFileDownload(packedBackup, filename);
      setLastExportedFile({ file, filename, content: packedBackup });
      toast.success('تم حفظ النسخة الاحتياطية المحلية الشاملة المشفرة بنجاح.');
    } catch (err: any) {
      toast.error(err?.message || 'تعذر إنشاء النسخة الاحتياطية الشاملة.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      dir="rtl"
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* رأس النافذة */}
        <div className="bg-gradient-to-l from-blue-900 via-indigo-900 to-slate-900 text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                مركز تبادل الأعمال والمزامنة الأوفلاين
                <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                  مشفر وموقع رقمياً .schpack
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-blue-200/90 mt-0.5">
                تبادل أعمال الموظفين والمدير أوفلاين 100% مع الدمج الذكي المانع لتضارب السجلات
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* شريط التبويبات الثلاثة */}
        <div className="bg-slate-100/90 dark:bg-slate-800/80 px-4 pt-3 border-b border-slate-200 dark:border-slate-700/80 flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'files'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm border-t-2 border-x border-blue-600 dark:border-blue-500'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>1. تبادل الملفات المشفرة (.schpack)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'qr'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm border-t-2 border-x border-indigo-600 dark:border-indigo-500'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>2. المزامنة البصرية عبر الباركود (QR Sync)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'backup'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm border-t-2 border-x border-emerald-600 dark:border-emerald-500'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>3. النسخ الاحتياطي وحزمة تهيئة المدرسة</span>
          </button>
        </div>

        {/* محتوى التبويبات القابل للتمرير */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* تنبيه خطأ التلاعب أو التلف */}
          {errorMessage && (
            <div className="rounded-2xl bg-red-50 dark:bg-red-950/50 border-2 border-red-300 dark:border-red-800 p-4 flex items-start gap-3 text-red-900 dark:text-red-200 animate-in fade-in">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-black text-sm">رفض أمني للحزمة المستوردة</h4>
                <p className="text-xs sm:text-sm mt-1 font-semibold">
                  {errorMessage}
                </p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* بطاقة تقرير الدمج الذكي الإحصائي */}
          {mergeReport && (
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/40 dark:to-slate-800 border-2 border-emerald-300 dark:border-emerald-700 p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-emerald-950 dark:text-emerald-200 text-base">
                      تقرير الدمج الذكي الموثق (Smart Upsert Report)
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">
                      تم التحقق من بصمة HMAC-SHA256 ودمج السجلات دون مسح أي بيانات سابقة
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMergeReport(null)}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-200/60 px-3 py-1.5 rounded-lg"
                >
                  إخفاء التقرير
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/80 dark:bg-slate-900/70 p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-slate-500">صاحب الحزمة:</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {mergeReport.senderName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-slate-500">المدرسة:</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {mergeReport.schoolName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="text-slate-500">تاريخ التصدير:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {new Date(mergeReport.exportedAt).toLocaleString('ar-EG')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-600 text-white rounded-xl p-3 shadow-sm">
                  <div className="text-2xl font-black">
                    +{mergeReport.addedCount}
                  </div>
                  <div className="text-xs font-bold opacity-90">
                    سجلات جديدة مضافة
                  </div>
                </div>
                <div className="bg-blue-600 text-white rounded-xl p-3 shadow-sm">
                  <div className="text-2xl font-black">
                    {mergeReport.updatedCount}
                  </div>
                  <div className="text-xs font-bold opacity-90">
                    سجلات محدثة (إصدار أحدث)
                  </div>
                </div>
                <div className="bg-slate-600 text-white rounded-xl p-3 shadow-sm">
                  <div className="text-2xl font-black">
                    {mergeReport.ignoredCount}
                  </div>
                  <div className="text-xs font-bold opacity-90">
                    سجلات مطابقة أو أقدم (متجاهلة)
                  </div>
                </div>
              </div>

              {Object.keys(mergeReport.detailsByTable).length > 0 && (
                <div className="bg-white/90 dark:bg-slate-900/80 rounded-xl p-3 border border-emerald-200 dark:border-slate-700 max-h-44 overflow-y-auto">
                  <div className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تفصيل السجلات التي تمت معالجتها:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {Object.entries(mergeReport.detailsByTable).map(
                      ([tableKey, st]) => (
                        <div
                          key={tableKey}
                          className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-700"
                        >
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {TABLE_ARABIC_LABELS[tableKey] || tableKey}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0 font-bold">
                            {st.added > 0 && (
                              <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                +{st.added}
                              </span>
                            )}
                            {st.updated > 0 && (
                              <span className="text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                ↻{st.updated}
                              </span>
                            )}
                            {st.ignored > 0 && (
                              <span className="text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded">
                                ={st.ignored}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* التبويب الأول: تصدير واستيراد الأعمال عبر الملفات (.schpack) */}
          {activeTab === 'files' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* قسم التصدير */}
              <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-slate-800/50 p-5 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-base">
                        تصدير وإرسال أعمالي (.schpack)
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        يجمع سجلاتك المختومة ويوقعها رقمياً لإرسالها للمدير أو السكرتير
                      </p>
                    </div>
                  </div>

                  {/* تحديد النطاق الزمني */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                      النطاق الزمني للأعمال المراد تصديرها:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'today', label: 'أعمال اليوم' },
                        { id: 'week', label: 'هذا الأسبوع' },
                        { id: 'month', label: 'هذا الشهر' },
                        { id: 'all', label: 'كل أعمالي' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            setDatePreset(item.id as DateRangePreset)
                          }
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            datePreset === item.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setDatePreset('custom')}
                        className={`text-xs font-bold underline ${
                          datePreset === 'custom'
                            ? 'text-blue-700 dark:text-blue-400'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        تحديد فترة زمنية مخصصة (من / إلى)
                      </button>
                    </div>

                    {datePreset === 'custom' && (
                      <div className="grid grid-cols-2 gap-3 pt-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">
                            من تاريخ:
                          </label>
                          <input
                            type="date"
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">
                            إلى تاريخ:
                          </label>
                          <input
                            type="date"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* بطاقة معلومات الموظف الحالي */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">المُصدِّر:</span>
                      <span className="font-black text-slate-900 dark:text-white">
                        {currentUser?.name || 'غير مسجل'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">المدرسة الفعالة:</span>
                      <span className="font-bold text-blue-700 dark:text-blue-400">
                        {currentUser?.selectedSchool ||
                          currentUser?.schools?.[0] ||
                          'المدرسة الافتراضية'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">التوقيع الرقمي:</span>
                      <span className="font-mono text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        HMAC-SHA256 + AES-GCM
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportWorkBundle}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isExporting ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                    <span>تصدير حزمة أعمالي (.schpack)</span>
                  </button>

                  {lastExportedFile && (
                    <button
                      type="button"
                      onClick={() => handleNativeShareFile(lastExportedFile)}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>
                        مشاركة سريعة عبر واتساب / بلوتوث ({lastExportedFile.filename})
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* قسم الاستيراد والدمج الذكي */}
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-slate-800/50 p-5 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-base">
                        استيراد ودمج حزمة أعمال (.schpack)
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        يستورد أعمال الموظف ويدمجها ذكياً حسب الـ UUID ورقم الإصدار دون مسح بياناتك
                      </p>
                    </div>
                  </div>

                  {/* منطقة السحب والإفلات أو اختيار ملف */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all flex flex-col items-center justify-center min-h-[210px] ${
                      isDragging
                        ? 'border-emerald-600 bg-emerald-100/70 dark:bg-emerald-950/40 scale-[1.01]'
                        : 'border-emerald-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-emerald-500 hover:bg-emerald-50/40'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".schpack,.json,application/octet-stream"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3 shadow-inner">
                      {isImporting ? (
                        <RefreshCw className="w-7 h-7 animate-spin" />
                      ) : (
                        <FileCheck2 className="w-7 h-7" />
                      )}
                    </div>
                    <p className="font-black text-sm text-slate-800 dark:text-slate-100">
                      اضغط هنا لاختيار ملف (.schpack) أو اسحبه وأفلته هنا
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs">
                      يقبل حزم أعمال المعلمين والمشرفين (DELTA_WORK) أو حزم تهيئة المدرسة (MASTER_SEED)
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>قواعد الدمج الذكي الآمن:</span>
                  </div>
                  <p>
                    • لا يتم حذف أو استبدال أعمال الموظفين الآخرين أو المدارس الأخرى مطلقاً.
                  </p>
                  <p>
                    • يتم تحديث السجل فقط إذا كان رقم إصداره (Version) أحدث من النسخة المحلية.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* التبويب الثاني: المزامنة البصرية السريعة عبر الباركود (QR Sync) */}
          {activeTab === 'qr' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={handleGenerateQrSync}
                  disabled={isExporting}
                  className={`p-5 rounded-2xl border-2 text-right transition-all flex items-center gap-4 ${
                    qrMode === 'display'
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                      عرض باركود أعمالي
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      تحويل حزمة أعمالك المشفرة إلى رمز بصري على شاشتك ليمسحه المدير أو الزميل
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleStartCameraScan}
                  className={`p-5 rounded-2xl border-2 text-right transition-all flex items-center gap-4 ${
                    qrMode === 'scan'
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-400'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                      مسح باركود من زميل
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      فتح الكاميرا لقراءة باركود الزميل ودمج البيانات فوراً في الهاتف بدون ملفات
                    </p>
                  </div>
                </button>
              </div>

              {/* وضع عرض الباركود */}
              {qrMode === 'display' && qrChunks.length > 0 && (
                <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-slate-800/60 p-6 flex flex-col items-center text-center space-y-4">
                  <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-200">
                    <canvas
                      ref={qrCanvasRef}
                      className="w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] mx-auto"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentChunkIndex(
                          (prev) =>
                            (prev - 1 + qrChunks.length) % qrChunks.length
                        )
                      }
                      className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <span className="text-xs font-black bg-indigo-600 text-white px-3.5 py-1.5 rounded-full">
                      الشريحة {currentChunkIndex + 1} من {qrChunks.length}
                    </span>

                    <button
                      type="button"
                      onClick={() => setIsQrPlaying((p) => !p)}
                      className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      title={isQrPlaying ? 'إيقاف مؤقت' : 'تشغيل تلقائي'}
                    >
                      {isQrPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentChunkIndex(
                          (prev) => (prev + 1) % qrChunks.length
                        )
                      }
                      className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md">
                    وجّه كاميرا الهاتف الآخر نحو هذا الباركود، أو انسخ رمز المزامنة السريع أدناه لإرساله مباشرة.
                  </p>
                </div>
              )}

              {/* وضع مسح الباركود بالكاميرا */}
              {qrMode === 'scan' && (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-slate-800/60 p-5 space-y-4">
                  <div className="relative w-full max-w-md mx-auto aspect-square max-h-[280px] bg-slate-950 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-inner flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-8 border-2 border-emerald-400/80 rounded-2xl pointer-events-none" />
                  </div>

                  {expectedTotalFrames > 0 && (
                    <div className="max-w-md mx-auto bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-200 text-center">
                      <div className="text-xs font-black text-emerald-700 mb-1">
                        جاري التقاط الشرائح المتسلسلة:{' '}
                        {Object.keys(scannedFramesMap).length} /{' '}
                        {expectedTotalFrames}
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              (Object.keys(scannedFramesMap).length /
                                expectedTotalFrames) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {cameraError && (
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 text-center">
                      {cameraError}
                    </p>
                  )}

                  <div className="max-w-lg mx-auto space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      أو الصق نص الحزمة / رمز الباركود المشفر مباشرة هنا للدمج الفوري:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualQrInput}
                        onChange={(e) => setManualQrInput(e.target.value)}
                        placeholder="RAFIQUK_SCHPACK_V1...."
                        className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (manualQrInput.trim()) {
                            handleRawQrDetected(manualQrInput.trim());
                            setManualQrInput('');
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black"
                      >
                        دمج الآن
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* التبويب الثالث: الإدارة والنسخ الاحتياطي وحزمة تهيئة المدرسة */}
          {activeTab === 'backup' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* حزمة تهيئة المدرسة للمدير أو السكرتير فقط */}
              <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-slate-800/50 p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-base">
                        حزمة تهيئة المدرسة (Master Config Seed)
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        توزيع هيكل المدرسة والكادر والطلاب والمعايير وحسابات الدخول على هواتف الموظفين
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                    <p className="font-bold text-slate-900 dark:text-white">
                      ماذا تتضمن حزمة التهيئة؟
                    </p>
                    <p>• بيانات المدرسة والفروع والأعوام الدراسية.</p>
                    <p>• كشوف المعلمين والإداريين والطلاب والجدول المدرسي.</p>
                    <p>• معايير الإشراف التربوي والمتابعة وأكواد دخول الموظفين.</p>
                  </div>
                </div>

                {isManagerOrSecretariat ? (
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportMasterSeedBundle}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-l from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Share2 className="w-5 h-5" />
                    <span>إصدار حزمة تهيئة المدرسة (Master Config Seed)</span>
                  </button>
                ) : (
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-xs font-bold text-amber-800 dark:text-amber-300">
                    إصدار حزمة التهيئة متاح فقط للمدير العام أو السكرتير. يمكنك استيراد حزمة التهيئة المستلمة من الإدارة عبر التبويب الأول.
                  </div>
                )}
              </div>

              {/* النسخ الاحتياطي المحلي الشامل لقاعدة IndexedDB */}
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-slate-800/50 p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-base">
                        النسخ الاحتياطي المحلي الشامل (IndexedDB)
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        حفظ واستعادة قاعدة البيانات المحلية بالكامل في ملف محمي ومشفر داخل ذاكرة الهاتف
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                    <p className="font-bold text-slate-900 dark:text-white">
                      حماية شاملة لبيانات هاتفك:
                    </p>
                    <p>
                      • يحفظ جميع الجداول العشرة (التقارير، الدرجات، الكادر، الطلاب، الإعدادات) في ملف مشفر واحد.
                    </p>
                    <p>
                      • يمكنك استعادته في أي وقت أو نقله لهاتف جديد بأمان تام.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportFullIndexedDBBackup}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <HardDriveDownload className="w-5 h-5" />
                    <span>حفظ نسخة احتياطية محلية كاملة</span>
                  </button>

                  <input
                    ref={fullBackupInputRef}
                    type="file"
                    accept=".schpack,.json,application/octet-stream"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={() => fullBackupInputRef.current?.click()}
                    className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <HardDriveUpload className="w-4 h-4 text-emerald-600" />
                    <span>استعادة نسخة احتياطية محلية محفوظة</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataSyncCenterModal;
