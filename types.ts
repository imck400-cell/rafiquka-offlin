
export type Language = 'ar' | 'en';

export interface SchoolProfile {
  ministry: string;
  district: string;
  schoolName: string;
  branch: string;
  year: string;
  semester: string;
  branchManager: string;
  generalManager: string;
  schoolsAndBranches?: Record<string, string[]>;
  customFields?: { label: string, value: string }[];
  // Legacy fields preserved for compatibility
  supervisorName?: string;
  classes?: string;
  qualityOfficer?: string;
  managerName?: string;
  logoImg?: string;
  lastUpdated?: number;
  favoriteEvaluations?: string[];
}

export interface TimetableEntry {
  id: string;
  userId?: string;
  teacherName: string;
  subject: string;
  days: {
    [key: string]: { // Saturday, Sunday...
      [key: string]: string; // p0, p1, p2... value is Class/Section
    }
  };
  notes: string;
}

export interface ExamLog {
  id: string;
  userId?: string;
  studentId: string;
  studentName: string;
  date: string;
  semester: string;
  stage: 'basic' | 'secondary';
  type: 'monthly' | 'final';
  month?: string;
  subjectsData: Record<string, { class: string; grade: string; status: 'tested' | 'not_tested' }>;
}

export interface SubstitutionEntry {
  id: string;
  userId?: string;
  absentTeacher: string;
  replacementTeacher: string;
  period: string;
  class: string;
  date: string;
  paymentStatus: 'pending' | 'paid';
  // Existing specific fields for periods
  p1?: string; p2?: string; p3?: string; p4?: string; p5?: string; p6?: string; p7?: string;
  sig1?: string; sig2?: string; sig3?: string; sig4?: string; sig5?: string; sig6?: string; sig7?: string;
  content1?: string; content2?: string; content3?: string; content4?: string; content5?: string; content6?: string; content7?: string;
  signature?: string;
}

export interface StudentReinforcementLog {
  id: string;
  userId?: string;
  school: string;
  branch: string;
  studentId?: string;
  studentName: string;
  grade: string;
  section: string;
  dateStr: string;
  dayName: string;
  reinforcements: string[];
  otherReinforcement?: string;
  reason: string;
  createdAt: string;
}

export interface MetricDefinition {
  key: string;
  label: string;
  emoji: string;
  color?: string;
  max: number;
}

export interface TeacherFollowUp {
  id: string;
  userId?: string;
  teacherName: string;
  subjectCode: string;
  className: string;
  attendance: number;
  appearance: number;
  preparation: number;
  supervision_queue: number;
  supervision_rest: number;
  supervision_end: number;
  correction_books: number;
  correction_notebooks: number;
  correction_followup: number;
  teaching_aids: number;
  extra_activities: number;
  radio: number;
  creativity: number;
  zero_period: number;
  violations_score: number;
  violations_notes: string[];
  additional_violation_notes?: string;
  reinforcements?: string[];
  order?: number;
  gender?: string;
  unaccreditedMetrics?: string[];
  [key: string]: any;
}

export interface DailyReportContainer {
  id: string;
  userId?: string;
  schoolId?: string;
  dayName: string;
  dateStr: string;
  teachersData: TeacherFollowUp[];
  writer?: string;
  branchManager?: string;
  periodType?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dateFrom?: string;
  dateTo?: string;
  metricMaxGrades?: Record<string, number>;
}

export interface AdminFollowUp {
  id: string;
  employeeName: string;
  gender: string;
  branch: string;
  role: string;
  violations_score: number;
  violations_notes: string[];
  additional_violation_notes?: string;
  order?: number;
  unaccreditedMetrics?: string[];
  executedCounts?: Record<string, number>;
  [key: string]: any;
}

export interface AdminReportContainer {
  id: string;
  userId?: string;
  schoolId?: string;
  dateStr: string;
  followUpType: string;
  writer: string;
  employeesData: AdminFollowUp[];
  reportCount?: number;
  periodName?: string;
}

export interface StudentReport {
  id: string;
  name: string;
  gender: string;
  grade: string;
  section: string;
  address: string;
  workOutside: string;
  healthStatus: string;
  healthDetails: string;
  guardianName: string;
  guardianPhones: string[];
  academicReading: string;
  academicWriting: string;
  academicParticipation: string;
  behaviorLevel: string;
  mainNotes: string[];
  otherNotesText: string;
  guardianEducation: string;
  guardianFollowUp: string;
  guardianCooperation: string;
  notes: string;
  createdAt: string;
  isBlacklisted?: boolean;
  isExcellent?: boolean;
  userId?: string;
  absenceSummary?: string;
  latenessSummary?: string;
  exitSummary?: string;
  violationSummary?: string;
  damageSummary?: string;
  school?: string;
  branch?: string;
}

export interface AbsenceLog {
  id: string;
  userId?: string;
  studentId: string;
  studentName: string;
  grade: string;
  section: string;
  semester: 'الأول' | 'الثاني';
  date: string;
  day: string;
  status: 'expected' | 'recurring' | 'week1' | 'week2' | 'most' | 'disconnected';
  reason: string;
  commStatus: 'تم التواصل' | 'لم يتم التواصل';
  commType: 'هاتف' | 'رسالة sms' | 'رسالة واتس' | 'أخرى';
  commOtherDetail?: string;
  replier: 'الأب' | 'الأم' | 'الجد' | 'الجدة' | 'الأخ' | 'الأخت' | 'العم' | 'الخال' | 'غيرهم';
  replierOther?: string;
  result: 'تم الرد' | 'لم يتم الرد' | string;
  notes: string;
  prevAbsenceCount: number;
}

export interface LatenessLog {
  id: string;
  userId?: string;
  studentId: string;
  studentName: string;
  grade: string;
  section: string;
  semester: 'الأول' | 'الثاني';
  date: string;
  day: string;
  status: 'recurring' | 'frequent' | 'permanent';
  reason: string;
  action: string;
  pledge: string;
  notes: string;
  prevLatenessCount: number;
}

export interface StudentViolationLog {
  id: string;
  userId?: string;
  studentId: string;
  studentName: string;
  grade: string;
  section: string;
  semester: 'الأول' | 'الثاني';
  date: string;
  totalViolations: number;
  behaviorViolations: string[];
  dutiesViolations: string[];
  achievementViolations: string[];
  examsViolations?: string[];
  location?: string;
  directSupervisor?: string;
  directSupervisorJob?: string;
  participants?: string[];
  status: 'blacklist' | 'high' | 'medium' | 'rare';
  action: string;
  pledge: string;
  notes: string;
}

export interface ExitLog {
  id: string;
  userId?: string;
  studentId: string;
  studentName: string;
  grade: string;
  section: string;
  semester: 'الأول' | 'الثاني' | 'الفصلين';
  date: string;
  day: string;
  status: string;
  customStatusItems: string[];
  action: string;
  pledge: string;
  notes: string;
  prevExitCount: number;
}

export interface DamageLog {
  id: string;
  userId?: string;
  studentId: string;
  studentName: string;
  grade: string;
  section: string;
  semester: 'الأول' | 'الثاني' | 'الفصلين';
  date: string;
  day: string;
  description: string;
  participants?: string;
  followUpStatus?: string;
  statusTags: string[];
  action: string;
  pledge: string;
  notes: string;
  prevDamageCount: number;
}

export interface ParentVisitLog {
  id: string;
  userId?: string;
  studentId: string;
  studentName: string;
  visitorName: string;
  grade: string;
  section: string;
  semester: 'الأول' | 'الثاني' | 'الفصلين';
  date: string;
  day: string;
  type: 'visit' | 'communication';
  status: string;
  customStatusItems: string[];
  reason: string;
  recommendations: string;
  actions: string;
  followUpStatus: string[];
  notes: string;
  prevVisitCount: number;
}

export interface GenericSpecialReport {
  id: string;
  userId?: string;
  category: string;
  subCategory: string;
  title: string;
  content: string;
  date: string;
}

export type ExecutionStatus = 'pending' | 'done' | 'failed';

export interface TaskItem {
  id: string;
  category: 'daily' | 'weekly' | 'monthly';
  text: string;
}

export interface TaskRecord {
  id: string;
  taskText: string;
  degree: number;
  maxDegree: number;
  status: ExecutionStatus;
  failReason: string;
  failOtherReason?: string;
  notes: string;
}

export interface TaskReport {
  id: string;
  userId?: string;
  dateStr: string;
  dateHijri: string;
  dayName: string;
  selectedCategories: ('daily' | 'weekly' | 'monthly')[];
  tasks: TaskRecord[];
}

export interface UserPermissions {
  all?: boolean;
  dashboard?: boolean | string[];
  dailyFollowUp?: boolean | string[];
  adminFollowUp?: boolean | string[];
  studentAffairs?: boolean | string[];
  specialReports?: boolean | string[];
  substitutions?: boolean | string[];
  schoolProfile?: boolean | string[];
  secretariat?: boolean | string[];
  teacherPortal?: boolean | string[];
  educationalSupervision?: boolean | string[];
  specialCodes?: boolean | string[];
  userManagement?: boolean | string[];
  managedUserIds?: string[];
  readOnly?: boolean;
  schoolsAndBranches?: Record<string, string[]>;
  issuesModal?: boolean | string[];
  caseStudyModal?: boolean | string[];
  trainingCourses?: boolean | string[];
  comprehensiveIndicators?: boolean | string[];
  comprehensiveIndicatorsUsers?: string[];
  gradeSheets?: boolean | string[];
  transport?: boolean | string[];
  communicationDev?: boolean | string[];
  viewCommunicationDetails?: boolean;
  schoolActivities?: boolean | string[];
  finance?: boolean | string[];
}

export interface User {
  id: string;
  name: string;
  jobTitle?: string;
  grades?: string[];
  sections?: string[];
  subjects?: string[];
  code: string;
  schools: string[];
  academicYears?: string[];
  startDate?: string; // ISO format
  expiryDate: string; // ISO format
  role: 'admin' | 'user';
  permissions?: UserPermissions;
  customSchoolProfiles?: Record<string, Record<string, any>>;
}

export interface AuthUser {
  id: string;
  name: string;
  jobTitle?: string;
  subjects?: string[];
  schools?: string[];
  grades?: string[];
  sections?: string[];
  selectedSchool: string;
  selectedBranch?: string;
  selectedYear?: string;
  role: 'admin' | 'user';
  permissions?: UserPermissions;
  customSchoolProfiles?: Record<string, Record<string, any>>;
}

export interface TrainingEvaluation {
  id: string;
  userId?: string;
  traineeName: string;
  jobTitle: string;
  courseName: string;
  trainerName: string;
  courseDate: string;
  evaluationDate: string;
  answers: Record<string, any>;
  overallRating?: number;
}

export interface SelfEvaluationRow {
  id: string;
  category: string;
  no: string;
  activity: string;
  planned: number | string;
  executed: number | string;
  total: number | string;
  percentage: number | string;
  note: string;
}

export interface SelfEvaluation {
  id: string;
  userId?: string;
  schoolId?: string;
  dateStr: string;
  reportName?: string;
  teacherName: string;
  subject: string;
  grades: string;
  schoolName: string;
  branchName: string;
  rows: SelfEvaluationRow[];
  maxScores?: { planned: number, executed: number };
}

export interface TeacherEvaluation {
  id: string;
  teacherId: string;
  teacherName: string;
  school: string;
  branch: string;
  semester: string;
  academicYear: string;
  date: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluationType: 'short' | 'ext' | 'subject';
  visitType: string;
  subject: string;
  subSubject?: string;
  className: string;
  period?: string;
  lessonName?: string;
  scores: Record<string, number>;
  totalScore: number;
  percentage: number;
  strengths: string;
  improvements: string;
  recommendations: string;
  notes: string;
  employeeComment: string;
  customOptions?: Record<string, string[]>;
  section?: string;
  strategies?: string;
  tools?: string;
  sources?: string;
  programs?: string;
  criteriaBlocksSnapshot?: Array<{ title: string; items: string[] }>;
}

export interface StudentEvaluation {
  id: string;
  userId?: string;
  schoolId: string;
  dateStr: string;
  semester: string;
  teacherName?: string;
  evaluatorRole?: string;
  subjects?: string;
  grades?: string;
  studentId: string; // The ID from secretariatStudents
  studentName: string;
  grade: string;
  section: string;
  criteria: {
    comprehension: { rating: string; details: string };
    homework: { rating: string; details: string };
    participation: { rating: string; details: string };
    behavior: { rating: string; details: string };
    excellence: { rating: string; details: string };
    customAction: { text: string };
  };
}

export interface DailyPrep {
  id: string;
  schoolName: string;
  branchName: string;
  subject: string;
  grade: string;
  lessonTitle?: string;
  date: string; // "YYYY-MM-DD" style
  teacherName: string;
  teacherId: string;
  objectives: string[];
  warmups: string[];
  strategies: string[];
  roles?: string[];
  assessments: string[];
  content?: string;
  closure?: string;
  homework?: string;
  isEnglishMode: boolean;
  supervisionStatus: "pending" | "Approved" | "Declined";
  scoreObjectives?: number; // 1-4
  scoreWarmups?: number; // 1-4
  scoreStrategies?: number; // 1-4
  scoreRoles?: number; // 1-4
  scoreAssessments?: number; // 1-4
  supervisorNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface AddedTaskItem {
  id: string;
  taskText: string;
  dateFrom: string;
  dateTo: string;
  notes: string;
  status: 'done' | 'in_progress' | 'not_done';
}

export interface AddedTask {
  id: string;
  userId?: string;
  school: string;
  branch: string;
  academicYear: string;
  supervisorName: string;
  supervisorJob: string;
  grade: string;
  section: string;
  dateStr: string;
  tasks: AddedTaskItem[];
  createdAt: string;
}

export interface PostponedTaskItem {
  id: string;
  taskText: string;
  dateFrom: string;
  dateTo: string;
  notes: string;
  status: 'done' | 'in_progress' | 'not_done';
}

export interface PostponedTask {
  id: string;
  userId?: string;
  school: string;
  branch: string;
  academicYear: string;
  supervisorName: string;
  supervisorJob: string;
  grade: string;
  section: string;
  dateStr: string;
  tasks: PostponedTaskItem[];
  createdAt: string;
}

export interface IssueRecommendationItem {
  id: string;
  type: 'issue' | 'recommendation' | 'suggestion';
  content: string;
  dateFrom: string;
  dateTo: string;
  notes: string;
  status: 'solved' | 'in_progress_issue' | 'not_solved' | 'adopted' | 'under_review' | 'implemented_differently';
}

export interface IssueRecommendationReport {
  id: string;
  userId?: string;
  school: string;
  branch: string;
  academicYear: string;
  supervisorName: string;
  supervisorJob: string;
  grade: string;
  section: string;
  dateStr: string;
  items: IssueRecommendationItem[];
  createdAt: string;
}

export interface CreativityRecordItem {
  id: string;
  category: string;
  notes: string;
  evaluation: 1 | 2 | 3 | 4 | null;
  dateStr: string;
  teacherNames?: string[];
}

export interface CreativityRecordReport {
  id: string;
  userId?: string;
  school: string;
  branch: string;
  academicYear: string;
  supervisorName: string;
  supervisorJob: string;
  grade: string;
  section: string;
  dateStr: string;
  items: CreativityRecordItem[];
  createdAt: string;
}

export interface AdminActivity {
  text: string;
  planned: string | number;
  evidence: string;
}

export interface DeliveryReceiptItem {
  id: string;
  teacherName: string;
  school: string;
  branch: string;
  grade: string;
  section: string;
  formCount: string;
  receiveDateStr: string;
  deliveryDateStr: string;
  status: 'delivered' | 'in_progress' | 'not_delivered';
  notes: string;
  actionTaken: string;
}

export interface DeliveryReceiptReport {
  id: string;
  userId?: string;
  reportName: string;
  school: string;
  branch: string;
  academicYear: string;
  supervisorName: string;
  supervisorJob: string;
  grade: string;
  section: string;
  dateStr: string;
  items: DeliveryReceiptItem[];
  createdAt: string;
}

export interface PeerVisit {
  id: string;
  school: string;
  branch: string;
  semester: string;
  academicYear: string;
  visitingTeacherNames: string[];
  visitingSubject: string;
  visitingClass: string;
  visitedTeacherName: string;
  visitedSubject: string;
  visitedClass: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface NotebookFollowUpLog {
  id: string;
  userId: string;
  school: string;
  branch: string;
  semester: "الأول" | "الثاني";
  studentId: string;
  studentName: string;
  grade: string;
  section: string;
  date: string; // YYYY-MM-DD
  dateHijri: string;
  day: string;
  subject: string;
  cleanliness: { rating: string; notes: string };
  completeness: { rating: string; notes: string };
  spellingCorrection: { rating: string; notes: string };
  teacherCorrection: { rating: string; notes: string };
  correctionDate: string; // YYYY-MM-DD
  generalNotes: string;
  createdAt: string;
}

export interface NotebookReportArchive {
  id: string;
  userId: string;
  school: string;
  branch: string;
  date: string; // YYYY-MM-DD
  dateHijri: string;
  day: string;
  semester: "الأول" | "الثاني";
  grade: string;
  section: string;
  createdAt: string;
}

export interface AppData {
  users: User[];
  profile: SchoolProfile;
  profiles?: Record<string, SchoolProfile>;
  deliveryReceiptRecords?: DeliveryReceiptReport[];
  substitutions: SubstitutionEntry[];
  timetable: TimetableEntry[];
  dailyReports: DailyReportContainer[];
  violations: any[];
  parentVisits: any[];
  teacherFollowUps: TeacherFollowUp[];
  maxGrades: Record<string, number>;
  studentReports?: StudentReport[];
  absenceLogs?: AbsenceLog[];
  studentLatenessLogs?: LatenessLog[];
  studentViolationLogs?: StudentViolationLog[];
  exitLogs?: ExitLog[];
  damageLogs?: DamageLog[];
  parentVisitLogs?: ParentVisitLog[];
  examLogs?: ExamLog[];
  selfEvaluations?: SelfEvaluation[];
  studentEvaluations?: StudentEvaluation[];
  dailyPreparations?: DailyPrep[];
  selfEvaluationTemplates?: Record<string, { rows: SelfEvaluationRow[], columns: {id: string, label: string}[] }>;
  customExitItems?: string[];
  customDamageItems?: string[];
  customVisitItems?: string[];
  pinnedExitStudents?: string[];
  pinnedDamageStudents?: string[];
  pinnedVisitStudents?: string[];
  genericSpecialReports?: GenericSpecialReport[];
  secretariatStudents?: any[];
  secretariatStaff?: any[];
  addedTasks?: AddedTask[];
  studentReinforcements?: StudentReinforcementLog[];
  notebookFollowUpLogs?: NotebookFollowUpLog[];
  notebookReportArchives?: NotebookReportArchive[];
  postponedTasks?: PostponedTask[];
  issueRecommendations?: IssueRecommendationReport[];
  creativityRecords?: CreativityRecordReport[];
  customViolationElements?: {
    behavior?: string[];
    duties?: string[];
    achievement?: string[];
    exams?: string[];
  };
  absenceManualAdditions?: Record<string, string[]>;
  absenceExclusions?: Record<string, string[]>;
  customEvaluationOptions?: {
    strategies?: string[];
    tools?: string[];
    sources?: string[];
    programs?: string[];
  };
  customSupervisionCriteria?: {
    id: string;
    school: string;
    branch: string;
    shortCriteriaBlocks?: any[];
    extCriteriaBlocks?: any[];
    subjectSkills?: Record<string, Record<string, string[]>>;
  }[];
  taskTemplates?: TaskItem[];
  taskReports?: TaskReport[];
  metricLabels?: Record<string, string>;
  metricsList?: MetricDefinition[];
  branchMetrics?: Record<string, MetricDefinition[]>;
  adminReports?: AdminReportContainer[];
  adminIndividualReports?: any[];
  courseEvaluationSchema_v3?: any[];
  adminMetricsList?: Record<string, MetricDefinition[]>; // key is followUpType
  adminBranchMetrics?: Record<string, Record<string, MetricDefinition[]>>; // branch -> followUpType -> metrics
  adminFollowUpTypes?: string[];
  adminIndividualReportFields?: string[];
  adminActivitiesList?: Record<string, AdminActivity[]>;
  adminBranchActivities?: Record<string, Record<string, AdminActivity[]>>;
  aboutLogoImg?: string;
  aboutSliderImages?: { id: string; title: string; description: string; image: string; duration: number }[];
  aboutExternalLinks?: { id: string; name: string; url: string }[];
  availableSchools?: string[];
  availableYears?: string[];
  schoolBranches?: Record<string, string[]>;
  trainingEvaluations?: TrainingEvaluation[];
  teacherEvaluations?: TeacherEvaluation[];
  peerVisits?: PeerVisit[];
  transportBuses?: TransportBus[];
  transportLogs?: TransportLog[];
  transportDailyStatus?: TransportDailyStatus[];
  communicationPosts?: CommunicationPost[];
  schoolHomeworks?: SchoolHomework[];
  financeRecords?: FinanceReport[];
}

export interface TransportBus {
  id: string;
  busNumber: string;
  route: string;
  capacity: number;
  driverName: string;
  supervisorName: string;
  approvedTime: string;
  students: {
    id: string;
    name: string;
    grade: string;
    section: string;
    branch: string;
    school: string;
  }[];
  school: string;
  branch: string;
}

export interface TransportLog {
  id: string;
  busId: string;
  busNumber: string;
  date: string;
  dayName: string;
  tripType: 'morning' | 'evening';
  school: string;
  branch: string;
  supervisorName: string;
  students: {
    id: string;
    name: string;
    status: 'present' | 'absent_excuse' | 'absent_no_excuse';
    notes: string;
  }[];
  isSaved?: boolean;
}

export interface TransportDailyStatus {
  id: string;
  busId: string;
  busNumber: string;
  driverName: string;
  supervisorName: string;
  date: string;
  dayName: string;
  tripType?: 'morning' | 'evening';
  driverStatus: 'present' | 'delayed' | 'absent';
  actualArrivalTime?: string;
  delayReason?: string;
  supervisorStatus: 'present' | 'absent';
  generalNotes?: string;
  school: string;
  branch: string;
}

export interface CommunicationPost {
  id: string; 
  type: 'circular' | 'poll'; 
  title: string; 
  content: string; 
  authorId: string; 
  authorName: string; 
  createdAt: string; 
  publishDate?: string; 
  schoolNames: string[]; 
  targetAudience: 'all' | 'specific' | 'draft'; 
  targetUsers?: string[]; 
  targetUserIds?: string[];
  targetDestinations?: string[];
  importanceLevel: 'normal' | 'urgent' | 'critical'; 
  isPinned: boolean; 
  isArchived: boolean; 
 
  // --- حقول خاصة بالمهام الإدارية ---
  isAdministrativeTask?: boolean; 
  taskDeadline?: string; 
  taskCompletionRate?: number; 
 
  // --- حقول خاصة بالاستطلاعات (Polls) ---
  options?: { id: string, text: string, votes: string[] }[]; 
  allowMultipleChoice?: boolean; 
  isAnonymous?: boolean; 
  expirationDate?: string; 
  showResultsImmediately?: boolean; 
  allowOtherOption?: boolean; 
  otherVotes?: { userId: string, text: string }[]; 
     
  // --- المرفقات المشتركة والقوالب ---
  templateType?: 'meeting' | 'absence' | 'congratulations' | 'internal'; 
  attachedFiles?: { name: string, url: string }[]; 
  attachedImages?: string[]; 
  externalLink?: string; 
     
  // --- تتبع القراءة والتذكير ---
  readBy?: string[]; 
  remindedUsers?: string[]; 

  // --- تتبع المشاهدات وتأكيد الاطلاع ---
  views?: { userId: string; userName: string; viewedAt: string }[];
  acknowledgments?: { userId: string; userName: string; acknowledgedAt: string }[];
}

export interface SchoolHomework {
  id: string; 
  teacherId: string; 
  teacherName: string; 
  subjectId: string; 
  subjectName: string; 
  targetGrade: string; 
  targetSection: string; 
  date: string; 
  periodNumber: number; 
  title: string; 
  description: string; 
  dueDate: string; 
  isArchived: boolean; 
  attachments?: { name: string, url: string }[]; 
  whatsappStatus: {
    sent: boolean; 
    sentAt?: string; 
    sentBy?: string; 
  };
  createdAt: string;
}

export interface FinanceReport {
  id: string;
  userId: string;
  school: string;
  branch: string;
  grade: string;
  section: string;
  dateStr: string;
  messageText: string;
  items: FinanceStudentItem[];
  createdAt: string;
}

export interface FinanceStudentItem {
  id: string;
  studentId: string;
  studentName: string;
  guardianName: string;
  phone: string;
  paidAmount: string;
  requestedAmount: string;
}


