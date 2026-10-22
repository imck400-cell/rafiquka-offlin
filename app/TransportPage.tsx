import React, { useState, useEffect, useRef, useMemo } from "react";
import { useGlobal } from "../context/GlobalState";
import {
  Briefcase,
  Users,
  Search,
  Plus,
  Trash2,
  Calendar,
  CheckCircle,
  FileSpreadsheet,
  MessageCircle,
  Clock,
  UserCheck,
  Building,
  School,
  FileText,
  AlertTriangle,
  ChevronDown,
  ArrowRight,
  Filter,
  BarChart,
  UserPlus2,
  Check,
  Save,
  Loader2,
  Send,
  Eye,
  History,
  TrendingUp,
  MapPin,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

// Interface declarations
interface SelectedStudent {
  id: string;
  name: string;
  grade: string;
  section: string;
  branch: string;
  school: string;
  guardianPhone?: string;
  guardianInfo?: string;
}

export default function TransportPage() {
  const { data, currentUser, updateData } = useGlobal();

  const isGeneralSupervisor =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;

  // Compute allowed schools and branches based on user configuration
  const allowedSchools = useMemo(() => {
    const rawSchools = (data.availableSchools || []).filter(Boolean);
    if (isGeneralSupervisor) {
      return rawSchools;
    }
    const userSchools = (currentUser?.selectedSchool || "").split(',').map(s => s.trim()).filter(Boolean);
    if (userSchools.length > 0 && !userSchools.includes('all')) {
      return rawSchools.filter(school => userSchools.includes(school));
    }
    return rawSchools;
  }, [data.availableSchools, currentUser?.selectedSchool, isGeneralSupervisor]);

  const defaultSchool = allowedSchools[0] || "";

  const [activeSchool, setActiveSchool] = useState<string>(defaultSchool);

  const allowedBranches = useMemo(() => {
    const rawBranches = (data.schoolBranches?.[activeSchool] || []).filter(Boolean);
    if (isGeneralSupervisor) {
      return rawBranches;
    }
    const currentSelectedBranches = (currentUser?.selectedBranch || "").split(',').map(b => b.trim()).filter(Boolean);
    if (currentSelectedBranches.length > 0 && !currentSelectedBranches.includes('all')) {
      return rawBranches.filter(branch => currentSelectedBranches.includes(branch));
    }
    const permsMap = currentUser?.permissions?.schoolsAndBranches?.[activeSchool] || [];
    if (Array.isArray(permsMap) && permsMap.length > 0) {
      return rawBranches.filter(branch => permsMap.includes(branch));
    }
    return rawBranches;
  }, [data.schoolBranches, activeSchool, currentUser, isGeneralSupervisor]);

  const defaultBranch = allowedBranches[0] || "";

  const [activeBranch, setActiveBranch] = useState<string>(defaultBranch);

  // Sync activeSchool & activeBranch with allowed listings
  useEffect(() => {
    if (allowedSchools.length > 0 && !allowedSchools.includes(activeSchool)) {
      setActiveSchool(allowedSchools[0]);
    }
  }, [allowedSchools, activeSchool]);

  useEffect(() => {
    if (allowedBranches.length > 0 && !allowedBranches.includes(activeBranch)) {
      setActiveBranch(allowedBranches[0]);
    }
  }, [allowedBranches, activeBranch]);

  // Extract transport sub-permissions
  const transportPermissions: string[] = Array.isArray(currentUser?.permissions?.transport)
    ? currentUser.permissions.transport
    : currentUser?.permissions?.transport === true
    ? ["dashboardTab", "configTab", "supervisorCheckTab", "trafficManagerTab"]
    : [];

  const canUseDashboardTab = isGeneralSupervisor || transportPermissions.includes("dashboardTab") || 
    !!(currentUser?.jobTitle && (currentUser.jobTitle.includes("حركة") || currentUser.jobTitle.includes("مواصلات") || currentUser.jobTitle.includes("مشرف") || currentUser.jobTitle.includes("سائق")));
  const canUseConfigTab = isGeneralSupervisor || transportPermissions.includes("configTab") || 
    !!(currentUser?.jobTitle && (currentUser.jobTitle.includes("حركة") || currentUser.jobTitle.includes("مواصلات")));
  const canUseSupervisorCheckTab = isGeneralSupervisor || transportPermissions.includes("supervisorCheckTab") || 
    !!(currentUser?.jobTitle && (currentUser.jobTitle.includes("مشرف") || currentUser.jobTitle.includes("باص")));
  const canUseTrafficManagerTab = isGeneralSupervisor || transportPermissions.includes("trafficManagerTab") || 
    !!(currentUser?.jobTitle && (currentUser.jobTitle.includes("حركة") || currentUser.jobTitle.includes("مواصلات")));

  const hasAnyTransportPerm = isGeneralSupervisor || 
    currentUser?.permissions?.transport === true ||
    (Array.isArray(currentUser?.permissions?.transport) && currentUser.permissions.transport.length > 0) ||
    !!(currentUser?.jobTitle && (currentUser.jobTitle.includes("حركة") || currentUser.jobTitle.includes("مواصلات") || currentUser.jobTitle.includes("مشرف") || currentUser.jobTitle.includes("سائق")));

  // Verify permission: allows write if they have any transport access configuration rights
  const canModifyConfig = hasAnyTransportPerm;

  // Active sub-view tab: 'dashboard' | 'config' | 'supervisorCheck' | 'trafficManager'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'config' | 'supervisorCheck' | 'trafficManager'>('dashboard');

  useEffect(() => {
    if (activeTab === 'dashboard' && !canUseDashboardTab) {
      if (canUseConfigTab) setActiveTab('config');
      else if (canUseSupervisorCheckTab) setActiveTab('supervisorCheck');
      else if (canUseTrafficManagerTab) setActiveTab('trafficManager');
    }
  }, [canUseDashboardTab, canUseConfigTab, canUseSupervisorCheckTab, canUseTrafficManagerTab, activeTab]);

  // Load database items or fallback to empty arrays
  const busesList = data.transportBuses || [];
  const logsList = data.transportLogs || [];
  const dailyStatusList = data.transportDailyStatus || [];

  // Filter lists based on school & branch scope
  const filteredBuses = busesList.filter(
    (b) => b.school === activeSchool && b.branch === activeBranch
  );
  
  const filteredLogs = logsList.filter(
    (l) => l.school === activeSchool && l.branch === activeBranch
  );

  const filteredDailyStatus = dailyStatusList.filter(
    (s) => s.school === activeSchool && s.branch === activeBranch
  );

  // Date filters
  const todayStr = new Date().toISOString().split("T")[0];
  const [currentDate, setCurrentDate] = useState<string>(todayStr);
  const [tripType, setTripType] = useState<'morning' | 'evening'>('morning');

  // Load students for autocomplete from globally synced arrays
  const allStudentsList = useMemo(() => {
    const rawSec = data.secretariatStudents || [];
    const rawRep = data.studentReports || [];

    // Map secretariat students with parsed school/branch
    const secMapped = rawSec.map((s: any) => {
      const extractedSchool = s.school || (s.schoolBranch ? s.schoolBranch.split("-")[0]?.trim() : "");
      const extractedBranch = s.branch || (s.schoolBranch ? s.schoolBranch.split("-")[1]?.trim() : "");
      return {
        ...s,
        school: extractedSchool || "",
        branch: extractedBranch || ""
      };
    });

    // Map report students, if they exist in secretariat, we merge their school/branch
    const repMapped = rawRep.map((s: any) => {
      const matchingSec = secMapped.find((sec) => sec.id === s.id || (sec.name && sec.name.trim() === s.name?.trim()));
      const extractedSchool = s.school || matchingSec?.school || (s.schoolBranch ? s.schoolBranch.split("-")[0]?.trim() : "");
      const extractedBranch = s.branch || matchingSec?.branch || (s.schoolBranch ? s.schoolBranch.split("-")[1]?.trim() : "");
      return {
        ...s,
        school: extractedSchool || "",
        branch: extractedBranch || ""
      };
    });

    const combined = [...secMapped, ...repMapped];
    return combined.reduce((acc, curr) => {
      if (curr.name && !acc.some((s: any) => s.id === curr.id || s.name.trim() === curr.name.trim())) {
        acc.push(curr);
      }
      return acc;
    }, [] as any[]);
  }, [data.secretariatStudents, data.studentReports]);

  // Filter students for autocomplete selection based on user scope/permissions
  const filteredStudentsForSelection = useMemo(() => {
    let list = [...allStudentsList];

    // Filter by the active school & branch on the screen first
    if (activeSchool) {
      list = list.filter((s) => s.school === activeSchool);
    }
    if (activeBranch) {
      list = list.filter((s) => s.branch === activeBranch);
    }

    if (isGeneralSupervisor) {
      return list;
    }

    // Filter by user's assigned school permissions
    const userSchools = (currentUser?.selectedSchool || "").split(',').map(s => s.trim()).filter(Boolean);
    if (userSchools.length > 0 && !userSchools.includes('all')) {
      list = list.filter(s => s.school && userSchools.includes(s.school));
    }

    // Filter by user's assigned branch permissions
    const currentSelectedBranches = (currentUser?.selectedBranch || "").split(',').map(b => b.trim()).filter(Boolean);
    if (currentSelectedBranches.length > 0 && !currentSelectedBranches.includes('all')) {
      list = list.filter(s => s.branch && currentSelectedBranches.includes(s.branch));
    }

    // Filter by user's assigned grades (if any)
    const userGrades = currentUser?.grades || [];
    if (userGrades.length > 0 && !userGrades.includes("all")) {
      list = list.filter((s) => !s.grade || userGrades.includes(s.grade));
    }

    // Filter by user's assigned sections (if any)
    const userSections = currentUser?.sections || [];
    if (userSections.length > 0 && !userSections.includes("all")) {
      list = list.filter((s) => !s.section || userSections.includes(s.section));
    }

    return list;
  }, [allStudentsList, activeSchool, activeBranch, currentUser, isGeneralSupervisor]);

  // Time conversion metrics
  const getArabicDayName = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const dayIndex = date.getDay();
      const arabicDays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      return arabicDays[dayIndex] || "";
    } catch (e) {
      return "";
    }
  };

  // Helper time parsing for lateness checks
  const calculateMinutesDiff = (approved: string, actual: string) => {
    if (!approved || !actual) return 0;
    
    const parseToMinutes = (str: string) => {
      // Extract numbers (H:MM)
      const match = str.match(/(\d{1,2}):(\d{2})/);
      if (!match) return 0;
      let hrs = parseInt(match[1]);
      let mins = parseInt(match[2]);
      
      const isPM = str.includes('مساء') || str.includes('م') || str.toLowerCase().includes('pm');
      const isAM = str.includes('صباح') || str.includes('ص') || str.toLowerCase().includes('am');
      
      if (isPM && hrs < 12) hrs += 12;
      if (isAM && hrs === 12) hrs = 0;
      return hrs * 60 + mins;
    };

    const mApp = parseToMinutes(approved);
    const mAct = parseToMinutes(actual);
    return Math.max(0, mAct - mApp);
  };

  // ----------------------------------------------------
  // Live Dashboard Statistics
  // ----------------------------------------------------
  const todayBusesStatus = filteredDailyStatus.filter((s) => s.date === currentDate);
  const totalBusesToday = filteredBuses.length;
  const activeBusesToday = todayBusesStatus.filter(s => s.driverStatus !== 'absent').length || totalBusesToday;

  // Student absences rate
  const todayLogs = filteredLogs.filter((l) => l.date === currentDate && l.tripType === tripType);
  let totalStudentSeats = 0;
  let totalStudentAbsent = 0;
  
  todayLogs.forEach((log) => {
    log.students.forEach((s) => {
      totalStudentSeats += 1;
      if (s.status !== "present") {
        totalStudentAbsent += 1;
      }
    });
  });

  const studentAbsenceRate = totalStudentSeats > 0 
    ? Math.round((totalStudentAbsent / totalStudentSeats) * 100) 
    : 0;

  // Lateness buses today
  const lateBusesToday = todayBusesStatus.filter((s) => s.driverStatus === 'delayed').length;

  // ----------------------------------------------------
  // Screen 1 State: التحكم بحركة المواصلات (Setup)
  // ----------------------------------------------------
  const [showBusModal, setShowBusModal] = useState(false);
  const [editingBusId, setEditingBusId] = useState<string | null>(null);
  
  // Form fields
  const [busNumber, setBusNumber] = useState("");
  const [busRoute, setBusRoute] = useState("");
  const [busCapacity, setBusCapacity] = useState<number>(25);
  const [driverName, setDriverName] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [approvedTime, setApprovedTime] = useState("07:15 ص");
  const [assignedStudents, setAssignedStudents] = useState<SelectedStudent[]>([]);
  
  // Student autocomplete fields
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  // Transfer student confirmation state
  const [transferConfirm, setTransferConfirm] = useState<{
    student: any;
    prevBus: any;
    currentBusNumber: string;
    onConfirm: () => void;
  } | null>(null);

  // Capacity Warning confirmation state
  const [capacityWarningConfirm, setCapacityWarningConfirm] = useState<{
    student: any;
    onConfirm: () => void;
  } | null>(null);

  // ----------------------------------------------------
  // Screen 2 State: متابعة مشرف الباص (Check attendance)
  // ----------------------------------------------------
  const [selectedBusId, setSelectedBusId] = useState<string>("");
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [archiveSearchQuery, setArchiveSearchQuery] = useState("");
  
  // Master Student Absence Reports
  const [reportDateFrom, setReportDateFrom] = useState(todayStr);
  const [reportDateTo, setReportDateTo] = useState(todayStr);

  // ----------------------------------------------------
  // Screen 3 State: متابعة مسؤول الحركة (Daily verification & Analytics)
  // ----------------------------------------------------
  const [dailyStatusRecords, setDailyStatusRecords] = useState<Record<string, any>>({});
  
  // Custom archive search and popup confirms
  const [saveConfirm, setSaveConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [archiveQuery, setArchiveQuery] = useState("");
  const [selectedArchiveLog, setSelectedArchiveLog] = useState<any | null>(null);

  const lastLoadedAttendanceKey = useRef<string>("");
  const lastLoadedDailyStatusKey = useRef<string>("");

  // Statistical Reporting
  const [statsDateFrom, setStatsDateFrom] = useState(todayStr);
  const [statsDateTo, setStatsDateTo] = useState(todayStr);

  // Users for driver/supervisor list
  const usersList = data.users || [];
  const supervisorsList = useMemo(() => {
    return usersList.filter((u) => {
      const isSupervisor = u.jobTitle?.includes("مشرف") || u.jobTitle?.includes("مصل") || u.role === "user";
      if (!isSupervisor) return false;

      const hasAllAccess = u.role === "admin" || u.permissions?.all === true;
      if (hasAllAccess) return true;

      const hasSchool = Array.isArray(u.schools) && u.schools.includes(activeSchool);
      const branches = u.permissions?.schoolsAndBranches?.[activeSchool] || [];
      const hasBranch = Array.isArray(branches) && branches.includes(activeBranch);

      return hasSchool && hasBranch;
    }).map((u) => u.name);
  }, [usersList, activeSchool, activeBranch]);

  // Compute archived logs filtering
  const archivedLogsFiltered = useMemo(() => {
    return filteredLogs.filter((log) => {
      if (!log.isSaved) return false;
      const query = archiveQuery.trim().toLowerCase();
      if (!query) return true;

      const busAndDayMatches = 
        String(log.busNumber).toLowerCase().includes(query) || 
        String(log.dayName || "").toLowerCase().includes(query) || 
        String(log.date || "").toLowerCase().includes(query);

      if (busAndDayMatches) return true;

      const studentMatches = log.students?.some((st: any) => 
        String(st.name || "").toLowerCase().includes(query)
      );

      return studentMatches;
    });
  }, [filteredLogs, archiveQuery]);

  // ----------------------------------------------------
  // Auto-Save interval for Screen 2 (Attendance) every 30 seconds
  // ----------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'supervisorCheck' || !selectedBusId || attendanceLogs.length === 0) return;

    const interval = setInterval(() => {
      saveAttendance(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab, selectedBusId, attendanceLogs, currentDate, tripType]);

  // Initial selects when school/branch changed
  useEffect(() => {
    if (filteredBuses.length > 0) {
      // Find default bus for logged in supervisor
      const supervisorBus = filteredBuses.find(b => b.supervisorName === currentUser?.name);
      if (supervisorBus) {
        setSelectedBusId(supervisorBus.id);
      } else {
        setSelectedBusId(filteredBuses[0].id);
      }
    } else {
      setSelectedBusId("");
    }
  }, [activeSchool, activeBranch]);

  // Load attendance data when bus / date / trip changes
  useEffect(() => {
    const currentKey = `${selectedBusId}_${currentDate}_${tripType}`;
    
    if (!selectedBusId) {
      setAttendanceLogs([]);
      lastLoadedAttendanceKey.current = "";
      return;
    }
    const bus = filteredBuses.find((b) => b.id === selectedBusId);
    if (!bus) {
      setAttendanceLogs([]);
      lastLoadedAttendanceKey.current = "";
      return;
    }

    // Only set raw attendance logs state if key has changed or if logs are completely empty
    if (lastLoadedAttendanceKey.current !== currentKey || attendanceLogs.length === 0) {
      // Find if log already exists
      const existingLog = filteredLogs.find(
        (l) => l.busId === selectedBusId && l.date === currentDate && l.tripType === tripType
      );

      if (existingLog) {
        // Merge current bus students with existing log to handle newly added or removed students
        const mergedStudents = bus.students.map((st) => {
          const found = existingLog.students?.find((s: any) => s.id === st.id);
          if (found) {
            return {
              ...st,
              status: found.status || 'present',
              notes: found.notes || ''
            };
          }
          return {
            ...st,
            status: 'present',
            notes: ''
          };
        });
        setAttendanceLogs(mergedStudents);
      } else {
        // Prepare fresh check-sheet from assigned students
        const freshCheckSheet = bus.students.map((st) => ({
          id: st.id,
          name: st.name,
          grade: st.grade,
          section: st.section,
          status: 'present', // Default حاضر
          notes: ''
        }));
        setAttendanceLogs(freshCheckSheet);
      }
      lastLoadedAttendanceKey.current = currentKey;
    }
  }, [selectedBusId, currentDate, tripType, logsList, filteredBuses]);

  // Load Today's Daily Movement Status logs for traffic supervisor
  useEffect(() => {
    const currentKey = `${currentDate}_${tripType}_${activeSchool}_${activeBranch}`;
    
    if (lastLoadedDailyStatusKey.current !== currentKey || Object.keys(dailyStatusRecords).length === 0) {
      const recordsMap: Record<string, any> = {};
      filteredBuses.forEach((bus) => {
        const existing = filteredDailyStatus.find((s) => s.busId === bus.id && s.date === currentDate && s.tripType === tripType);
        if (existing) {
          recordsMap[bus.id] = {
            driverStatus: existing.driverStatus,
            actualArrivalTime: existing.actualArrivalTime || bus.approvedTime,
            delayReason: existing.delayReason || "",
            supervisorStatus: existing.supervisorStatus,
            generalNotes: existing.generalNotes || ""
          };
        } else {
          recordsMap[bus.id] = {
            driverStatus: 'present',
            actualArrivalTime: bus.approvedTime,
            delayReason: '',
            supervisorStatus: 'present',
            generalNotes: ''
          };
        }
      });
      setDailyStatusRecords(recordsMap);
      lastLoadedDailyStatusKey.current = currentKey;
    }
  }, [currentDate, tripType, busesList, dailyStatusList, activeSchool, activeBranch]);

  // ----------------------------------------------------
  // Handler functions for Screen 1 (Configuration)
  // ----------------------------------------------------
  const handleSaveBus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!busNumber.trim() || !driverName.trim()) {
      alert("الرجاء تعبئة الحقول الأساسية للباص");
      return;
    }

    const nextBuses = [...busesList];
    const newBusObj = {
      id: editingBusId || `bus_${Date.now()}`,
      busNumber,
      route: busRoute,
      capacity: Number(busCapacity),
      driverName,
      supervisorName,
      approvedTime,
      students: assignedStudents,
      school: activeSchool,
      branch: activeBranch
    };

    if (editingBusId) {
      const idx = nextBuses.findIndex((b) => b.id === editingBusId);
      if (idx !== -1) nextBuses[idx] = newBusObj;
    } else {
      nextBuses.push(newBusObj);
    }

    updateData({ transportBuses: nextBuses });
    setShowBusModal(false);
    resetBusForm();
  };

  const handleEditBus = (bus: any) => {
    setEditingBusId(bus.id);
    setBusNumber(bus.busNumber);
    setBusRoute(bus.route);
    setBusCapacity(bus.capacity);
    setDriverName(bus.driverName);
    setSupervisorName(bus.supervisorName);
    setApprovedTime(bus.approvedTime);
    setAssignedStudents(bus.students || []);
    setShowBusModal(true);
  };

  const handleDeleteBus = (id: string) => {
    if (confirm("هل أنت متأكد من حذف بطاقة هذا الباص نهائياً؟")) {
      const remaining = busesList.filter((b) => b.id !== id);
      updateData({ transportBuses: remaining });
    }
  };

  const resetBusForm = () => {
    setEditingBusId(null);
    setBusNumber("");
    setBusRoute("");
    setBusCapacity(25);
    setDriverName("");
    setSupervisorName("");
    setApprovedTime("07:15 ص");
    setAssignedStudents([]);
    setStudentSearchQuery("");
  };

  const removeStudentFromBus = (stId: string) => {
    setAssignedStudents((prev) => prev.filter((s) => s.id !== stId));
  };

  const findPreviousBusForStudent = (studentId: string) => {
    return (busesList || []).find((b) =>
      b.id !== editingBusId &&
      Array.isArray(b.students) &&
      b.students.some((s: any) => s.id === studentId)
    );
  };

  const performAddStudent = (st: any, prevBus: any) => {
    if (prevBus) {
      const updatedBuses = busesList.map((b) => {
        if (b.id === prevBus.id) {
          return {
            ...b,
            students: (b.students || []).filter((s: any) => s.id !== st.id)
          };
        }
        return b;
      });
      updateData({ transportBuses: updatedBuses });
    }

    setAssignedStudents((prev) => {
      if (prev.some((s) => s.id === st.id)) return prev;
      return [...prev, {
        id: st.id,
        name: st.name,
        grade: st.grade || "",
        section: st.section || "",
        branch: st.branch || activeBranch,
        school: st.school || activeSchool,
        guardianPhone: st.guardianPhone || ""
      }];
    });

    setStudentSearchQuery("");
    setShowStudentDropdown(false);
  };

  const handleSelectStudentToAdd = (st: any) => {
    const prevBus = findPreviousBusForStudent(st.id);

    const checkCapacityAndAdd = () => {
      // Check if current bus has reached capacity (Requirement 4)
      if (assignedStudents.length >= Number(busCapacity)) {
        setCapacityWarningConfirm({
          student: st,
          onConfirm: () => {
            performAddStudent(st, prevBus);
          }
        });
      } else {
        performAddStudent(st, prevBus);
      }
    };

    if (prevBus) {
      // Show student transfer confirm prompt (Requirement 3)
      setTransferConfirm({
        student: st,
        prevBus,
        currentBusNumber: busNumber || "(جديد)",
        onConfirm: () => {
          checkCapacityAndAdd();
        }
      });
    } else {
      checkCapacityAndAdd();
    }
  };

  // ----------------------------------------------------
  // Attendance Toggle handler (Screen 2)
  // Present -> Absent excuse -> Absent no excuse
  // ----------------------------------------------------
  const toggleStudentStatus = (stId: string) => {
    setAttendanceLogs((prev) =>
      prev.map((item) => {
        if (item.id === stId) {
          let nextStatus: 'present' | 'absent_excuse' | 'absent_no_excuse' = 'present';
          if (item.status === 'present') nextStatus = 'absent_excuse';
          else if (item.status === 'absent_excuse') nextStatus = 'absent_no_excuse';
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const handleMarkAllPresent = () => {
    setAttendanceLogs((prev) => prev.map((item) => ({ ...item, status: 'present' })));
  };

  // ----------------------------------------------------
  // Save Attendance to Firebase logs (Screen 2)
  // ----------------------------------------------------
  const saveAttendance = (isAuto = false, force = false) => {
    if (!selectedBusId) return;
    const bus = filteredBuses.find((b) => b.id === selectedBusId);
    if (!bus) return;

    const logId = `${selectedBusId}_${currentDate}_${tripType}`;
    // Check if duplicate for same day and tripType
    const alreadySaved = filteredLogs.some((l) => l.id === logId && l.isSaved);

    const performSave = () => {
      const newLogEntry = {
        id: logId,
        busId: selectedBusId,
        busNumber: bus.busNumber,
        date: currentDate,
        dayName: getArabicDayName(currentDate),
        tripType: tripType,
        school: activeSchool,
        branch: activeBranch,
        supervisorName: bus.supervisorName || currentUser?.name || "مشرف الباص",
        students: attendanceLogs,
        isSaved: true
      };

      const nextLogs = [...logsList];
      const existingIdx = nextLogs.findIndex((l) => l.id === logId);
      
      if (existingIdx !== -1) {
        nextLogs[existingIdx] = newLogEntry;
      } else {
        nextLogs.push(newLogEntry);
      }

      updateData({ transportLogs: nextLogs });

      const timeStr = new Date().toLocaleTimeString('ar-YE');
      setSaveStatus(isAuto ? `💾 تم الحفظ التلقائي: ${timeStr}` : `✅ تم حفظ كشف الطلاب بنجاح في المستندات: ${timeStr}`);
      
      if (!isAuto) {
        setTimeout(() => setSaveStatus(""), 4500);
      }
    };

    if (alreadySaved && !isAuto && !force) {
      setSaveConfirm({
        title: "تأكيد تعديل كشفي الغياب والتحضير",
        message: `لقد قمت بتحضير وحفظ طلاب الباص لهذا اليوم (${currentDate}) والفترة المحددة مسبقاً. هل تريد بالتأكيد تعديل البيانات السابقة وموافقتك على التغيير؟`,
        onConfirm: () => performSave()
      });
    } else {
      performSave();
    }
  };

  // ----------------------------------------------------
  // WhatsApp Notification Message (Screen 2)
  // ----------------------------------------------------
  // Send overall attendance status
  const handleSendBusStatusWhatsApp = (busLog: any) => {
    const presentStudents = busLog.students.filter((s: any) => s.status === 'present');
    const absentExcused = busLog.students.filter((s: any) => s.status === 'absent_excuse');
    const absentNoExcuse = busLog.students.filter((s: any) => s.status === 'absent_no_excuse');

    let msg = `🚌 *تقرير كشف غياب حضور الطلاب اليومي للباص* 🚌\n\n`;
    msg += `🏫 *المدرسة:* ${activeSchool}\n`;
    msg += `🏢 *الفرع:* ${activeBranch}\n`;
    msg += `🔢 *رقم الباص:* ${busLog.busNumber}\n`;
    msg += `📅 *تاريخ اليوم:* ${busLog.dayName} - ${busLog.date}\n`;
    msg += `🕒 *رحلة:* ${busLog.tripType === 'morning' ? 'صباحية ☀️' : 'مسائية 🌙'}\n`;
    msg += `✍️ *محضر مشرف الحافلة:* ${busLog.supervisorName}\n\n`;
    
    msg += `📊 *إحصائية سريعة:*\n`;
    msg += `🟢 عدد الحاضرين: ${presentStudents.length}\n`;
    msg += `🟡 غياب بعذر: ${absentExcused.length}\n`;
    msg += `🔴 غياب غير مبرر: ${absentNoExcuse.length}\n\n`;

    if (absentExcused.length > 0) {
      msg += `⚠️ *الغياب المبرر اليوم 🟡:*\n`;
      absentExcused.forEach((st: any, i: number) => {
        msg += `${i+1} - ${st.name} (${st.grade}/${st.section}) ${st.notes ? `[ملاحظة: ${st.notes}]` : ""}\n`;
      });
      msg += `\n`;
    }

    if (absentNoExcuse.length > 0) {
      msg += `❌ *الغياب غير المبرر اليوم 🔴:*\n`;
      absentNoExcuse.forEach((st: any, i: number) => {
        msg += `${i+1} - ${st.name} (${st.grade}/${st.section}) ${st.notes ? `[ملاحظة: ${st.notes}]` : ""}\n`;
      });
      msg += `\n`;
    }

    msg += `تمنياتنا لجميع الطلاب بالسلامة والتوفيق 🌸\n`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://web.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  // Send WhatsApp directly to unexcused absent guardian phone
  const handleNotifyParentWhatsApp = (stName: string, gradeSection: string, guardianPhone?: string) => {
    if (!guardianPhone) {
      // Try to look up guardianPhone from list
      const matched = allStudentsList.find(s => s.name === stName);
      guardianPhone = matched?.guardianPhone || "";
    }

    if (!guardianPhone) {
      alert("⚠️ تعذر إيجاد رقم ولي أمر الطالب المختار، يرجى كتابته في ملف شؤون الطلاب أولاً.");
      return;
    }

    let msg = `السيد ولي أمر الطالب: *${stName}*\n\n`;
    msg += `نحيطكم علماً بأن ابننا الطالب المقيد بالصف *${gradeSection}* لم يصعد للباص لرحلة اليوم *${getArabicDayName(currentDate)} - ${currentDate}* (${tripType === 'morning' ? 'صباحاً' : 'مساءً'}) دون تبليغ مسبق بالغياب.\n\n`;
    msg += `يرجى التواصل الفوري مع المدرسة للتأكيد وموافاتنا بأسباب الغياب للحفاظ على سلامة ومستوى الطالب.\n\n`;
    msg += `🚌 إدارة حركة المواصلات بمدارسكم 🌸`;

    const cleanPhone = guardianPhone.trim().replace(/\+/g, "").replace(/\s/g, "");
    const encoded = encodeURIComponent(msg);
    window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`, "_blank");
  };

  // ----------------------------------------------------
  // Screen 3: Save Daily Movement Status (Traffic Manager Operations)
  // ----------------------------------------------------
  const handleSaveMovementStatus = (force = false) => {
    // Check if duplicate for same day and tripType
    const existingRecords = filteredBuses.filter((bus) => {
      const recordId = `${bus.id}_${currentDate}_${tripType}`;
      return filteredDailyStatus.some((s) => s.id === recordId);
    });

    const performSave = () => {
      const nextDailyStatus = [...dailyStatusList];

      filteredBuses.forEach((bus) => {
        const rec = dailyStatusRecords[bus.id];
        if (!rec) return;

        const recordId = `${bus.id}_${currentDate}_${tripType}`;
        const recordObj = {
          id: recordId,
          busId: bus.id,
          busNumber: bus.busNumber,
          driverName: bus.driverName,
          supervisorName: bus.supervisorName,
          date: currentDate,
          dayName: getArabicDayName(currentDate),
          tripType: tripType, // Partitioned by morning/evening!
          driverStatus: rec.driverStatus,
          actualArrivalTime: rec.actualArrivalTime,
          delayReason: rec.driverStatus === 'delayed' ? rec.delayReason : "",
          supervisorStatus: rec.supervisorStatus,
          generalNotes: rec.generalNotes,
          school: activeSchool,
          branch: activeBranch
        };

        const idx = nextDailyStatus.findIndex((s) => s.id === recordId);
        if (idx !== -1) {
          nextDailyStatus[idx] = recordObj;
        } else {
          nextDailyStatus.push(recordObj);
        }
      });

      updateData({ transportDailyStatus: nextDailyStatus });
      alert("🟢 تم توثيق وحفظ كشف حركة الحافلات بنجاح لليوم والفترة المحددة!");
    };

    if (existingRecords.length > 0 && !force) {
      setSaveConfirm({
        title: "تأكيد تعديل رصد الأداء للحافلات",
        message: `تم رصد وحفظ الأداء لليوم (${currentDate}) وفترة (${tripType === 'morning' ? 'الذهاب الصباحية' : 'الإياب المسائية'}) مسبقاً. هل توافق على تعديل وتحديث هذه البيانات وحفظ التغيير الجديد؟`,
        onConfirm: () => performSave()
      });
    } else {
      performSave();
    }
  };

  // Overall administrative summary in WhatsApp text
  const handleSendMovementStatusWhatsApp = () => {
    let msg = `🚨 *التقرير اليومي لانتظام حركة الحافلات وسائقيها* 🚨\n\n`;
    msg += `🏫 *المدرسة:* ${activeSchool}\n`;
    msg += `🏢 *الفرع:* ${activeBranch}\n`;
    msg += `📅 *تاريخ اليوم:* ${getArabicDayName(currentDate)} - ${currentDate}\n`;
    msg += `🎛️ *مسؤول وحدة الحركة والمواصلات:* ${currentUser?.name || "المشرف العام"}\n`;
    msg += `━━━━━━━━━━━━━━━━━\n\n`;

    filteredBuses.forEach((bus, i) => {
      const rec = dailyStatusRecords[bus.id] || {};
      msg += `🚌 *حافلة رقم [${bus.busNumber}] ({${bus.route}})*\n`;
      msg += `👨‍✈️ السائق: ${bus.driverName} -> ${rec.driverStatus === 'present' ? '🟢 حاضر وملتزم' : rec.driverStatus === 'delayed' ? `⚠️ متأخر (الوصول actual: ${rec.actualArrivalTime})` : '🔴 غائب'}\n`;
      if (rec.driverStatus === 'delayed' && rec.delayReason) {
        msg += `💡 سبب التأخير: ${rec.delayReason}\n`;
      }
      msg += `👩‍🏫 المشرف: ${bus.supervisorName || "غير محدد"} -> ${rec.supervisorStatus === 'present' ? '🟢 حاضر' : '🔴 غائب'}\n`;
      if (rec.generalNotes) {
        msg += `📝 ملاحظة: ${rec.generalNotes}\n`;
      }
      msg += `\n`;
    });

    msg += `مع تمنايتنا للجميع برحلات آمنة دائمًا 🌿`;
    
    const encoded = encodeURIComponent(msg);
    window.open(`https://web.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  // ----------------------------------------------------
  // Aggregate statistics calculations for advanced analytical tables (Screen 3)
  // Filtering range based on statsDateFrom, statsDateTo
  // Calculates delay minutes and days present/absent
  // ----------------------------------------------------
  const getStatisticalReportRows = () => {
    const reportRows: any[] = [];
    const inRangeDailyStatus = filteredDailyStatus.filter(
      (s) => s.date >= statsDateFrom && s.date <= statsDateTo
    );

    filteredBuses.forEach((bus) => {
      const busStats = inRangeDailyStatus.filter((s) => s.busId === bus.id);

      // Present/Absent drivers
      const driverPresentDays = busStats.filter((s) => s.driverStatus === 'present').length;
      const driverDelayDays = busStats.filter((s) => s.driverStatus === 'delayed').length;
      const driverAbsentDays = busStats.filter((s) => s.driverStatus === 'absent').length;

      // Minutes of lateness calculated
      let totalDelayMinutes = 0;
      busStats.forEach((s) => {
        if (s.driverStatus === 'delayed') {
          const delayMinutes = calculateMinutesDiff(bus.approvedTime, s.actualArrivalTime || bus.approvedTime);
          totalDelayMinutes += delayMinutes;
        }
      });

      // Supervisor attendance counts
      const supervisorPresentDays = busStats.filter((s) => s.supervisorStatus === 'present').length;
      const supervisorAbsentDays = busStats.filter((s) => s.supervisorStatus === 'absent').length;

      reportRows.push({
        driverName: bus.driverName,
        busNumber: bus.busNumber,
        route: bus.route,
        approvedTime: bus.approvedTime,
        driverPresent: driverPresentDays + driverDelayDays,
        driverAbsent: driverAbsentDays,
        driverDelaysCount: driverDelayDays,
        driverDelayMinutesSum: totalDelayMinutes,
        supervisorName: bus.supervisorName,
        supervisorPresent: supervisorPresentDays,
        supervisorAbsent: supervisorAbsentDays
      });
    });

    return reportRows;
  };

  // Student cumulative absences aggregator
  const getStudentAbsenceCumulativeRows = () => {
    const cumulative: Record<string, any> = {};
    const inRangeLogs = filteredLogs.filter(
      (l) => l.date >= reportDateFrom && l.date <= reportDateTo
    );

    inRangeLogs.forEach((log) => {
      log.students.forEach((s: any) => {
        if (s.status !== 'present') {
          if (!cumulative[s.id]) {
            cumulative[s.id] = {
              name: s.name,
              grade: s.grade,
              section: s.section,
              absentExcusedCount: 0,
              absentUnexcusedCount: 0,
              totalAbsences: 0,
              notes: []
            };
          }
          if (s.status === 'absent_excuse') {
            cumulative[s.id].absentExcusedCount += 1;
          } else {
            cumulative[s.id].absentUnexcusedCount += 1;
          }
          cumulative[s.id].totalAbsences += 1;
          if (s.notes) {
            cumulative[s.id].notes.push(`[${log.date}: ${s.notes}]`);
          }
        }
      });
    });

    return Object.values(cumulative);
  };

  // ----------------------------------------------------
  // Output Excel Export (Using xlsx-js-style with official styling standards)
  // ----------------------------------------------------

  const exportStatisticalMovementExcel = () => {
    try {
      const stats = getStatisticalReportRows();

      const wsData: any[] = [];
      
      const rightHeaderString = `الجمهورية اليمنية
وزارة التربية والتعليم والبحث العلمي
مكتب المدير العام وإدارة التعليم
المدرسة: ${activeSchool}
الفرع: ${activeBranch}`;

      const leftHeaderString = `التاريخ الهجري: ....................
التاريخ الميلادي: ${new Date().toLocaleDateString('ar-YE')}
الفترة المحددة: من ${statsDateFrom} إلى ${statsDateTo}
السنة الدراسية: 2024-2025
اسم التقرير: سجل الأداء والمواعيد للحافلات`;

      // Row 0 has merged blocks of strings (Right and Left)
      wsData.push([
        rightHeaderString, "", "", "", "", "", "",
        leftHeaderString, "", "", "", ""
      ]);
      wsData.push(["", "", "", "", "", "", "", "", "", "", "", ""]); // row index 1 (part of merged header block)
      wsData.push(["", "", "", "", "", "", "", "", "", "", "", ""]); // spacer row index 2

      // Title row (row index 3)
      wsData.push(["كشف تقييم انتظام سائقي الحافلات ومشرفيها ومطابقة أوقات الوصول المعتمدة", "", "", "", "", "", "", "", "", "", "", ""]);
      wsData.push(["", "", "", "", "", "", "", "", "", "", "", ""]); // spacer row index 4

      // Table Header definitions
      const tableHeaders = [
        "م",
        "اسم السائق المعتمد",
        "رقم الحافلة",
        "خط السير / خطة خط السير اليومية",
        "الموعد المعتمد",
        "أيام حضور السائق اليومية",
        "أيام غياب السائق اليومية",
        "إجمالي عدد مرات التأخر",
        "مجموع دقائق التأخر الإجمالية",
        "اسم مشرف الباص والطلاب",
        "أيام حضور المشرف",
        "أيام غياب المشرف"
      ];
      wsData.push(tableHeaders);

      // Inject details
      stats.forEach((row, i) => {
        wsData.push([
          i + 1,
          row.driverName,
          row.busNumber,
          row.route,
          row.approvedTime,
          row.driverPresent,
          row.driverAbsent,
          row.driverDelaysCount,
          row.driverDelayMinutesSum,
          row.supervisorName || "غير معين",
          row.supervisorPresent,
          row.supervisorAbsent
        ]);
      });

      // spacer before footer signatures
      wsData.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
      wsData.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
      
      // Footer text row
      wsData.push(["إدارة الأداء التقييمي للحركة", "", "توقيع معد ومسؤول التقرير: ........................", "", "", "", "", "", "", "توقيع مصادقة مدير الفرع: .......................", "", ""]);

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!dir"] = "rtl";

      // Manual column widths
      ws["!cols"] = [
        { wch: 6 },   // #
        { wch: 22 },  // Driver Name
        { wch: 12 },  // Bus Number
        { wch: 25 },  // Route Line
        { wch: 15 },  // Approved Time
        { wch: 16 },  // Driver Attend
        { wch: 16 },  // Driver Absent
        { wch: 16 },  // Delays Count
        { wch: 18 },  // Total Delays Minutes
        { wch: 20 },  // Supervisor Name
        { wch: 16 },  // Supervisor Present
        { wch: 16 }   // Supervisor Absent
      ];

      // Merge titles and metadata rows
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 1, c: 4 } }, // Right header block from row 0, col 0 to row 1, col 4
        { s: { r: 0, c: 7 }, e: { r: 1, c: 11 } }, // Left header block from row 0, col 7 to row 1, col 11
        { s: { r: 3, c: 0 }, e: { r: 3, c: 11 } }, // Title row spanned
      ];

      // Format Style attributes
      for (let R = 0; R < wsData.length; ++R) {
        for (let C = 0; C < wsData[R].length; ++C) {
          const address = XLSX.utils.encode_cell({ c: C, r: R });
          if (!ws[address]) continue;

          let cellStyle: any = {
            font: { name: "Arial", sz: 10 },
            alignment: { vertical: "center", horizontal: "center", wrapText: true },
            border: {
              top: { style: "thin", color: { rgb: "E2E8F0" } },
              bottom: { style: "thin", color: { rgb: "E2E8F0" } },
              left: { style: "thin", color: { rgb: "E2E8F0" } },
              right: { style: "thin", color: { rgb: "E2E8F0" } }
            }
          };

          // Official Yemen ministry header text formats
          if (R < 2) {
            cellStyle.alignment.horizontal = C < 5 ? "right" : "left";
            cellStyle.alignment.vertical = "top";
            cellStyle.font.bold = true;
            cellStyle.font.sz = 10;
            cellStyle.border = {}; // clean
          }
          // Main banner title block
          else if (R === 3) {
            cellStyle.font.bold = true;
            cellStyle.font.sz = 14;
            cellStyle.font.color = { rgb: "1E3A8A" }; // dark blue
            cellStyle.fill = { fgColor: { rgb: "EFF6FF" } }; // soft light blue fill
            cellStyle.border = {
              top: { style: "medium", color: { rgb: "3B82F6" } },
              bottom: { style: "medium", color: { rgb: "3B83F6" } }
            };
          }
          // Database Table Headers styled with medium slate background fill and white text
          else if (R === 5) {
            cellStyle.font.bold = true;
            cellStyle.font.sz = 11;
            cellStyle.font.color = { rgb: "FFFFFF" };
            cellStyle.fill = { fgColor: { rgb: "1F2937" } }; // Dark charcoal charcoal background
            cellStyle.border = {
              top: { style: "medium", color: { rgb: "000000" } },
              bottom: { style: "medium", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "D1D5DB" } },
              right: { style: "thin", color: { rgb: "D1D5DB" } }
            };
          }
          // Data records rows
          else if (R > 5 && R < wsData.length - 3) {
            if ((R - 6) % 2 === 1) {
              cellStyle.fill = { fgColor: { rgb: "F9FAFB" } }; // subtle zebra
            }
          }
          // Bottom Footer elements
          else if (R >= wsData.length - 3) {
            cellStyle.font.bold = true;
            cellStyle.font.sz = 11;
            cellStyle.alignment.horizontal = "right";
            cellStyle.border = {}; // clean
          }

          ws[address].s = cellStyle;
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "تقرير حركة المواصلات");
      XLSX.writeFile(wb, `كشف_مسؤول_الحركة_والمواصلات_${statsDateFrom}_إلى_${statsDateTo}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("⚠️ عذرًا، حدث خطأ أثناء تكوين وتصدير ملف التقرير إلى إكسيل.");
    }
  };

  const exportStudentAbsenceAccumTablesExcel = () => {
    try {
      const absences = getStudentAbsenceCumulativeRows();

      const wsData: any[] = [];
      
      const rightHeaderString = `الجمهورية اليمنية
وزارة التربية والتعليم والبحث العلمي
مكتب المدير العام وإدارة شؤون الطلاب
المدرسة: ${activeSchool}
الفرع: ${activeBranch}`;

      const leftHeaderString = `التاريخ الهجري: ....................
التاريخ الميلادي: ${new Date().toLocaleDateString('ar-YE')}
تاريخ الفلترة: من ${reportDateFrom} إلى ${reportDateTo}
الرحلة المحددة: كافة مسارات الحافلات
نوع التقرير: كشف غياب الطلاب المتكرر بحافلات المدرسة`;

      // Row 0 has merged blocks of strings (Right and Left)
      wsData.push([
        rightHeaderString, "", "", "", leftHeaderString, "", ""
      ]);
      wsData.push(["", "", "", "", "", "", ""]); // row index 1
      wsData.push(["", "", "", "", "", "", ""]); // spacer row index 2

      // Title row (row index 3)
      wsData.push(["التقرير التراكمي الشامل لإحصائيات غياب الطلاب المتكرر بالباص وكافة الملاحظات المرفوعة", "", "", "", "", "", ""]);
      wsData.push(["", "", "", "", "", "", ""]); // spacer row index 4

      // Table Header definitions
      const tableHeaders = [
        "م",
        "اسم الطالب",
        "الصف الدراسي / الشعبة",
        "أيام الغياب المبرر (بعذر)",
        "أيام الغياب غير مبرر (بدون عذر)",
        "مجموع أيام الغياب الكلي",
        "الملاحظات والمبررات المدونة"
      ];
      wsData.push(tableHeaders);

      // Inject details
      absences.forEach((row, i) => {
        wsData.push([
          i + 1,
          row.name,
          `${row.grade} / ${row.section}`,
          row.absentExcusedCount,
          row.absentUnexcusedCount,
          row.totalAbsences,
          row.notes.join(", ") || "لا يوجد"
        ]);
      });

      // spacer before footer signatures
      wsData.push(["", "", "", "", "", "", ""]);
      wsData.push(["", "", "", "", "", "", ""]);
      
      // Footer text row
      wsData.push(["مشرف الحركة والمواصلات: .........................", "", "", "", "مصادقة مدير الفرع والوكلاء: .........................", "", ""]);

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!dir"] = "rtl";

      // Manual column widths
      ws["!cols"] = [
        { wch: 6 },   // #
        { wch: 25 },  // Student Name
        { wch: 20 },  // Grade/Sec
        { wch: 18 },  // excused absent
        { wch: 18 },  // unexcused absent
        { wch: 18 },  // total excuses
        { wch: 45 }   // Notes
      ];

      // Merge titles and metadata rows
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 1, c: 2 } }, // Right header block from row 0 to 1, col 0 to 2
        { s: { r: 0, c: 4 }, e: { r: 1, c: 6 } }, // Left header block from row 0 to 1, col 4 to 6
        { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } }, // Title row spanned
      ];

      // Format Style attributes
      for (let R = 0; R < wsData.length; ++R) {
        for (let C = 0; C < wsData[R].length; ++C) {
          const address = XLSX.utils.encode_cell({ c: C, r: R });
          if (!ws[address]) continue;

          let cellStyle: any = {
            font: { name: "Arial", sz: 10 },
            alignment: { vertical: "center", horizontal: "center", wrapText: true },
            border: {
              top: { style: "thin", color: { rgb: "E2E8F0" } },
              bottom: { style: "thin", color: { rgb: "E2E8F0" } },
              left: { style: "thin", color: { rgb: "E2E8F0" } },
              right: { style: "thin", color: { rgb: "E2E8F0" } }
            }
          };

          // Official Yemen ministry header text formats
          if (R < 2) {
            cellStyle.alignment.horizontal = C < 3 ? "right" : "left";
            cellStyle.alignment.vertical = "top";
            cellStyle.font.bold = true;
            cellStyle.font.sz = 10;
            cellStyle.border = {}; // clean
          }
          // Main banner title block
          else if (R === 3) {
            cellStyle.font.bold = true;
            cellStyle.font.sz = 13;
            cellStyle.font.color = { rgb: "B45309" }; // dark amber
            cellStyle.fill = { fgColor: { rgb: "FEF3C7" } }; // soft light amber fill
            cellStyle.border = {
              top: { style: "medium", color: { rgb: "D97706" } },
              bottom: { style: "medium", color: { rgb: "D97706" } }
            };
          }
          // Database Table Headers styled with medium slate background fill and white text
          else if (R === 5) {
            cellStyle.font.bold = true;
            cellStyle.font.sz = 11;
            cellStyle.font.color = { rgb: "FFFFFF" };
            cellStyle.fill = { fgColor: { rgb: "2E7D32" } }; // Dark green background
            cellStyle.border = {
              top: { style: "medium", color: { rgb: "1B5E20" } },
              bottom: { style: "medium", color: { rgb: "1B5E20" } },
              left: { style: "thin", color: { rgb: "C8E6C9" } },
              right: { style: "thin", color: { rgb: "C8E6C9" } }
            };
          }
          // Data records rows
          else if (R > 5 && R < wsData.length - 3) {
            if ((R - 6) % 2 === 1) {
              cellStyle.fill = { fgColor: { rgb: "F1F8E9" } }; // subtle light green zebra
            }
          }
          // Bottom Footer elements
          else if (R >= wsData.length - 3) {
            cellStyle.font.bold = true;
            cellStyle.font.sz = 11;
            cellStyle.alignment.horizontal = "right";
            cellStyle.border = {}; // clean
          }

          ws[address].s = cellStyle;
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "تقرير غياب طلاب الباص");
      XLSX.writeFile(wb, `تقرير_غياب_طلاب_الباص_${reportDateFrom}_إلى_${reportDateTo}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("⚠️ عذرًا، حدث خطأ تزامني أثناء تصدير غيابات الطلاب التراكمي.");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 font-arabic px-1 sm:px-4 py-3" dir="rtl">
      
      {/* Upper Navigation Card with Permission Filters */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Briefcase size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">مسؤول الحركة والمواصلات الإداري</h1>
              <p className="text-xs text-slate-600 font-semibold mt-1">المنظومة الإلكترونية لإحصاء غيابات الحافلات وضبط حضور السائقين وتقييم الالتزام بالمواعيد المحددة</p>
            </div>
          </div>
        </div>

        {/* Permission Filter selectors */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Schools list */}
          <div className="flex items-center gap-1 bg-slate-50 border p-1.5 rounded-xl flex-1 md:flex-none">
            <School size={16} className="text-blue-500 mr-1" />
            <select
              value={activeSchool}
              onChange={(e) => setActiveSchool(e.target.value)}
              className="text-xs font-bold text-slate-600 bg-transparent outline-none cursor-pointer p-1"
            >
              {allowedSchools.map((sc) => (
                <option key={sc} value={sc}>{sc}</option>
              ))}
            </select>
          </div>

          {/* Branches list */}
          <div className="flex items-center gap-1 bg-slate-50 border p-1.5 rounded-xl flex-1 md:flex-none">
            <Building size={16} className="text-blue-500 mr-1" />
            <select
              value={activeBranch}
              onChange={(e) => setActiveBranch(e.target.value)}
              className="text-xs font-bold text-slate-600 bg-transparent outline-none cursor-pointer p-1"
            >
              {allowedBranches.map((br) => (
                <option key={br} value={br}>{br}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid of smart visual KPIs Indicators dashboards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Live Operating count */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
            <Briefcase size={120} />
          </div>
          <p className="text-sm font-bold opacity-90">إجمالي الحافلات المتحركة والنشطة اليوم 🚌</p>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-4xl font-black">{activeBusesToday}</span>
            <span className="text-sm opacity-80">من أصل {totalBusesToday} حافلات مخصصة للفرع</span>
          </div>
          <p className="text-[10px] font-semibold opacity-70 mt-2">محدث في تاريخ: {currentDate}</p>
        </div>

        {/* Card 2: Student transport absence rate */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
            <Users size={120} />
          </div>
          <p className="text-sm font-bold opacity-90">نسبة غياب الطلاب الإجمالية بالحافلات 📉</p>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-4xl font-black">{studentAbsenceRate}%</span>
            <span className="text-sm opacity-80">الغياب التراكمي لصباح ومساء اليوم</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 bg-white/15 px-2 py-0.5 rounded-lg w-max text-[9px] font-bold">
            <Clock size={10} /> {tripType === 'morning' ? 'الرحلة الصباحية الحالية ☀️' : 'الرحلة المسائية الحالية 🌙'}
          </div>
        </div>

        {/* Card 3: Delayed buses */}
        <div className={lateBusesToday > 0 ? "bg-gradient-to-br from-rose-500 to-red-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden animate-pulse" : "bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden"}>
          <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
            <Clock size={120} />
          </div>
          <p className="text-sm font-bold opacity-90">عدد الحافلات المتأخرة عن وقت التوثيق ⏱️</p>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-4xl font-black">{lateBusesToday}</span>
            <span className="text-sm opacity-80">باصات متأخرة مقارنة برصيد وقتها الرسمي</span>
          </div>
          <p className="text-[10px] font-semibold opacity-70 mt-2">يعزز هذا المؤشر تصديق الإعذار أو توقيع الإنذارات</p>
        </div>
      </div>

      {/* System Tabs selectors */}
      <div className="flex flex-wrap gap-2.5 bg-slate-100 p-2 rounded-2xl w-full">
        {/* Dashboard index */}
        {canUseDashboardTab && (
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all flex-1 text-center justify-center ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
          >
            <BarChart size={16} /> لوحة المؤشرات والتحليل
          </button>
        )}

        {/* Card Setup (Config) */}
        {canUseConfigTab && (
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all flex-1 text-center justify-center ${activeTab === 'config' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
          >
            <UserPlus2 size={16} /> التحكم بحركة المواصلات (تأسيس وتوزيع)
          </button>
        )}

        {/* Supervisor Check attendanceSheet */}
        {canUseSupervisorCheckTab && (
          <button
            onClick={() => setActiveTab('supervisorCheck')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all flex-1 text-center justify-center ${activeTab === 'supervisorCheck' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
          >
            <UserCheck size={16} /> متابعة مشرف الباص (التحضير والتوثيق)
          </button>
        )}

        {/* Traffic controller checker */}
        {canUseTrafficManagerTab && (
          <button
            onClick={() => setActiveTab('trafficManager')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all flex-1 text-center justify-center ${activeTab === 'trafficManager' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
          >
            <Clock size={16} /> متابعة مسؤول الحركة (التوقيع الإداري والتقارير)
          </button>
        )}
      </div>

      {/* Tab Area Renderings */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        
        {/* ---------------------------------------------------- */}
        {/* TAB 1: DASHBOARD VIEW (Interactive stats summary)     */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'dashboard' && canUseDashboardTab && (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <BarChart className="text-blue-600" size={24} />
                  نظرة تحليلية عامة ومطابقة الخرائط اليومية
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">تتبع مؤشرات الحافلات وحالات انتظام الطلاب في الغياب والحضور اليومي</p>
              </div>

              {/* Quick toggles for dates */}
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  className="px-4 py-2 bg-slate-50 border rounded-xl font-bold text-xs outline-none text-slate-700 focus:border-blue-500"
                />

                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setTripType('morning')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${tripType === 'morning' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    صباحية ☀️
                  </button>
                  <button
                    onClick={() => setTripType('evening')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${tripType === 'evening' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    مسائية 🌙
                  </button>
                </div>
              </div>
            </div>

            {/* Quick List of buses live summaries */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-700">حالة خطوط الباصات النشطة اليوم ({getArabicDayName(currentDate)}):</h3>
              
              {filteredBuses.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center space-y-2 text-slate-500 font-semibold">
                  <span>🚌 لا يوجد حافلات مضافة لفرعكم ومدرستكم حالياً.</span>
                  {canModifyConfig && (
                    <button
                      onClick={() => setActiveTab('config')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 mt-2"
                    >
                      بادر بإضافة أول حافلة الآن
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBuses.map((bus) => {
                    // today movement info
                    const movement = todayBusesStatus.find((s) => s.busId === bus.id);
                    // today student attendance info
                    const attLog = filteredLogs.find(
                      (l) => l.busId === bus.id && l.date === currentDate && l.tripType === tripType
                    );

                    const totalSt = bus.students?.length || 0;
                    const presentSt = attLog?.students?.filter((s: any) => s.status === 'present').length || 0;
                    const absentSt = totalSt - presentSt;

                    return (
                      <div key={bus.id} className="border border-slate-100 rounded-2xl p-5 hover:border-blue-300 transition-all hover:shadow-md bg-slate-50 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="px-3 py-1 bg-white border font-black text-xs text-blue-600 rounded-lg">الحافلة #{bus.busNumber}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{bus.approvedTime} ص</span>
                          </div>
                          <div className="mt-3 space-y-1">
                            <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                              <MapPin size={14} className="text-blue-500" />
                              {bus.route}
                            </h4>
                            <p className="text-xs text-slate-500 font-semibold">👨‍✈️ السائق: {bus.driverName}</p>
                            <p className="text-xs text-slate-500 font-semibold">👩‍🏫 المشرف: {bus.supervisorName || "غير معين"}</p>
                          </div>
                        </div>

                        {/* Progress bars of students on bus */}
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold text-slate-600">
                              <span>حضور الطلاب: {presentSt} / {totalSt}</span>
                              <span className="text-blue-600">{totalSt > 0 ? Math.round((presentSt / totalSt) * 100) : 0}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-blue-500 h-full transition-all duration-500" 
                                style={{ width: `${totalSt > 0 ? (presentSt / totalSt) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="flex items-center gap-1">
                              سائق الباص: 
                              {movement?.driverStatus === 'present' ? (
                                <span className="text-emerald-600">حاضر 🟢</span>
                              ) : movement?.driverStatus === 'delayed' ? (
                                <span className="text-amber-500">متأخر 🟡 ({movement.actualArrivalTime})</span>
                              ) : movement?.driverStatus === 'absent' ? (
                                <span className="text-rose-500">غائب  🔴</span>
                              ) : (
                                <span className="text-slate-400">غير موثق 💤</span>
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              المشرف: 
                              {movement?.supervisorStatus === 'present' ? (
                                <span className="text-emerald-600">حاضر 🟢</span>
                              ) : movement?.supervisorStatus === 'absent' ? (
                                <span className="text-rose-500">غائب 🔴</span>
                              ) : (
                                <span className="text-slate-400">غير موثق 💤</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ========================================== */}
            {/* REGISTERED HISTORY ARCHIVE FOR BUSES       */}
            {/* ========================================== */}
            <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs space-y-5 text-right">
              <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3.5 bg-blue-50/50 rounded-2xl">
                    <History className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm">صندوق أرشيف الأعمال والمحاضر اليومية</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">البحث والرجوع لكافة بيانات تحضيرات الحافلات المحفوظة مسبقاً</p>
                  </div>
                </div>

                {/* Search Box */}
                <div className="relative w-full max-w-sm">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="ابحث باسم الطالب، رقم الباص، أو اليوم (السبت، الأحد...)"
                    value={archiveQuery}
                    onChange={(e) => setArchiveQuery(e.target.value)}
                    className="w-full pl-4 pr-10 py-2 bg-slate-50 border rounded-xl font-bold text-xs outline-none focus:border-blue-500 text-slate-700 text-right"
                  />
                </div>
              </div>

              {archivedLogsFiltered.length === 0 ? (
                <div className="py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs font-semibold">
                  <span>💤 لا توجد محاضرات أو بطاقات أرشيفية مطابقة للبحث حالياً.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {archivedLogsFiltered.map((log) => (
                    <div
                      key={log.id}
                      onClick={() => setSelectedArchiveLog(log)}
                      className="bg-slate-50/40 border border-slate-100 hover:border-blue-400 hover:bg-white p-3.5 rounded-2xl flex flex-col justify-between hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-black text-[11px] text-slate-700 group-hover:text-blue-600">🚌 حافلة {log.busNumber}</span>
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black shrink-0 ${log.tripType === 'morning' ? 'bg-amber-50 text-amber-600 border border-amber-150' : 'bg-indigo-50 text-indigo-600 border border-indigo-150'}`}>
                          {log.tripType === 'morning' ? 'صباحي' : 'مسائي'}
                        </span>
                      </div>
                      <div className="mt-3">
                        <p className="text-[10px] font-black text-slate-500">{log.dayName || getArabicDayName(log.date)}</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{log.date}</p>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
                        <span className="text-[8px] font-bold text-slate-400">👥 {log.students?.length || 0} طالباً</span>
                        <span className="text-[8px] text-blue-500 font-black opacity-0 group-hover:opacity-100 transition-all">تفاصيل ←</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: SETUP CONFIG (التحكم بحركة المواصلات)          */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'config' && canUseConfigTab && (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <UserPlus2 className="text-blue-600" size={24} />
                  تأسيس حافلات المدرسة وإسناد المشرفين والسائقين والطلاب
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">تتحكم هذه الشاشة بالبطاقة التعريفية للباص وإسناد قوائم طلابية مخصصة بكل خط سير</p>
              </div>

              {canModifyConfig && (
                <button
                  onClick={() => {
                    resetBusForm();
                    setShowBusModal(true);
                  }}
                  className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-[1.2rem] font-bold text-sm hover:bg-blue-700 transition-all shadow-sm"
                >
                  <Plus size={18} /> تأسيس حافلة جديدة
                </button>
              )}
            </div>

            {/* List of custom configured card design bento-style */}
            {filteredBuses.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed text-slate-500 font-semibold">
                🚌 لا توجد حافلات تم تأسيسها بعد للمدرسة والفرع الحاليين.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredBuses.map((bus) => (
                  <div key={bus.id} className="bg-white border rounded-[2rem] p-6 shadow-sm border-slate-100 hover:shadow-lg transition-all space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="px-3.5 py-1 bg-blue-50 text-blue-700 font-black text-xs rounded-xl border border-blue-100">باص مدرسة رقم: {bus.busNumber}</span>
                        <h3 className="text-lg font-black text-slate-800 mt-2">{bus.route}</h3>
                      </div>
                      <div className="flex gap-1.5">
                        {canModifyConfig && (
                          <>
                            <button
                              onClick={() => handleEditBus(bus)}
                              className="p-2 border rounded-xl text-blue-600 hover:bg-blue-50 transition-colors"
                              title="تعديل"
                            >
                              <FileText size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteBus(bus.id)}
                              className="p-2 border rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                              title="حذف"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl text-xs font-bold text-slate-600">
                      <div>
                        <p className="text-slate-400 font-bold mb-1">اسم السائق</p>
                        <p className="text-slate-800 font-black">{bus.driverName}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold mb-1">المشرف المسؤول</p>
                        <p className="text-slate-800 font-black">{bus.supervisorName || "غير محدد"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold mb-1">زمن وموعد الحضور المعتمد</p>
                        <p className="text-slate-800 font-black text-blue-600">{bus.approvedTime}</p>
                      </div>
                    </div>

                    {/* Students Assigned statistics slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600 px-1">
                        <span>الطلاب المسندين للحافلة ({bus.students?.length || 0} طالباً)</span>
                        <span>السعة المعتمدة: {bus.capacity}</span>
                      </div>
                      
                      {/* Overflow warning */}
                      {bus.students?.length > bus.capacity && (
                        <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-bold animate-pulse">
                          <AlertTriangle size={14} />
                          <span>⚠️ تجاوز السعة الاستيعابية المحددة للباص ({bus.students.length}/{bus.capacity})!</span>
                        </div>
                      )}

                      <div className="max-h-[140px] overflow-y-auto border rounded-2xl p-2.5 text-xs font-bold space-y-1.5 custom-scrollbar bg-slate-50">
                        {(!bus.students || bus.students.length === 0) ? (
                          <p className="text-slate-400 text-center py-4">لم يتم ربط أو إضافة أي طالب بهذا الخط بعد.</p>
                        ) : (
                          bus.students.map((st: any, i: number) => (
                            <div key={st.id || i} className="flex justify-between items-center bg-white px-3 py-1.5 rounded-xl border border-slate-100">
                              <span className="text-slate-700">{i+1} - {st.name}</span>
                              <span className="text-slate-400 text-[10px]">{st.grade} / {st.section}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal for adding/updating Bus Card */}
            <AnimatePresence>
              {showBusModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
                  >
                    {/* Header */}
                    <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
                      <h3 className="text-xl font-black flex items-center gap-2">
                        <Briefcase size={22} />
                        {editingBusId ? "تعديل بطاقة الحافلة الحالية" : "تأسيس وضبط حافلة جديدة"}
                      </h3>
                      <button
                        onClick={() => setShowBusModal(false)}
                        className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                      >
                        إغلاق ✕
                      </button>
                    </div>

                    {/* Scrollable Form */}
                    <form onSubmit={handleSaveBus} className="overflow-y-auto p-6 space-y-6 flex-1 custom-scrollbar">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Bus Number */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600">رقم الباص / الحافلة *</label>
                          <input
                            type="text"
                            required
                            placeholder="مثال: 12"
                            value={busNumber}
                            onChange={(e) => setBusNumber(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:border-blue-500 font-bold text-sm"
                          />
                        </div>

                        {/* Route Line / Residence */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600">خط السير / المناطق السكنية المشمولة</label>
                          <input
                            type="text"
                            placeholder="مثال: حي الروضة - شارع الأربعين"
                            value={busRoute}
                            onChange={(e) => setBusRoute(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:border-blue-500 font-bold text-sm"
                          />
                        </div>

                        {/* Capacity */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600">السعة الاستيعابية القصوى للباص *</label>
                          <input
                            type="number"
                            required
                            min={5}
                            max={100}
                            value={busCapacity}
                            onChange={(e) => setBusCapacity(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:border-blue-500 font-bold text-sm"
                          />
                        </div>

                        {/* Approved Time */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600">موعد وزمن الحضور والانطلاق المعتمد</label>
                          <input
                            type="text"
                            placeholder="مثال: 07:15 ص"
                            value={approvedTime}
                            onChange={(e) => setApprovedTime(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:border-blue-500 font-bold text-sm"
                          />
                        </div>

                        {/* Driver Name */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600">اسم سائق الحافلة بالكامل *</label>
                          <input
                            type="text"
                            required
                            placeholder="مثال: محمد سعيد عبده"
                            value={driverName}
                            onChange={(e) => setDriverName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:border-blue-500 font-bold text-sm"
                          />
                        </div>

                        {/* Supervisor Dropdown */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600">مشرف الباص المسؤول (قائمة المعلمين/الموظفين)</label>
                          <select
                            value={supervisorName}
                            onChange={(e) => setSupervisorName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:border-blue-500 font-bold text-sm cursor-pointer"
                          >
                            <option value="">-- حدد المشرف المالي أو الطلابي للباص --</option>
                            {supervisorsList.map((supName, idx) => (
                              <option key={idx} value={supName}>{supName}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Add Students Block */}
                      <div className="border-t pt-5 space-y-4">
                        <h4 className="font-black text-sm text-slate-700">ربط وإضافة الطلاب المقيدين بهذه الحافلة</h4>
                        
                        {/* Instant Search input */}
                        <div className="relative">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Search className="absolute right-3.5 top-3 text-slate-400" size={18} />
                              <input
                                type="text"
                                placeholder="ابحث باسم الطالب لإضافة لقائمة الباص التفعيلية..."
                                value={studentSearchQuery}
                                onChange={(e) => {
                                  setStudentSearchQuery(e.target.value);
                                  setShowStudentDropdown(e.target.value.length > 0);
                                }}
                                className="w-full pr-11 pl-4 py-3 bg-slate-50 border rounded-xl outline-none focus:border-blue-500 font-bold text-sm"
                              />
                            </div>
                          </div>

                          {/* Autocomplete list dropdown */}
                          {showStudentDropdown && (
                            <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-[180px] overflow-y-auto custom-scrollbar p-2">
                              {filteredStudentsForSelection
                                .filter(st => st.name?.includes(studentSearchQuery))
                                .slice(0, 15)
                                .map((st: any) => {
                                  const isAdded = assignedStudents.some(s => s.id === st.id);
                                  return (
                                    <button
                                      type="button"
                                      key={st.id}
                                      onClick={() => handleSelectStudentToAdd(st)}
                                      className={`w-full text-right p-2.5 rounded-xl text-xs font-bold flex justify-between items-center transition-colors ${isAdded ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'hover:bg-blue-50 text-slate-700'}`}
                                    >
                                      <span>{st.name} ({st.grade || "..."} - {st.section || "..."})</span>
                                      {isAdded ? (
                                        <span className="text-emerald-500 text-[10px]">مسند للباص ✓</span>
                                      ) : (
                                        <span className="text-blue-500 text-[10px]">+ إضافة للخط</span>
                                      )}
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>

                        {/* List Grid table of selected students to add */}
                        <div className="space-y-2">
                          <p className="text-[11px] font-bold text-slate-400">الطلاب الذين تم اختيارهم للباص ({assignedStudents.length}):</p>
                          
                          {/* Overflow text alert */}
                          {assignedStudents.length > busCapacity && (
                            <p className="text-rose-500 text-xs font-black">⚠️ إنذار: الطلاب المختارون حالياً ({assignedStudents.length}) تجاوزوا سعة الباص الاستيعابية المتاحة ({busCapacity})!</p>
                          )}

                          <div className="max-h-[160px] overflow-y-auto border border-slate-100 rounded-2xl bg-slate-50 p-2 space-y-1.5 custom-scrollbar">
                            {assignedStudents.length === 0 ? (
                              <p className="text-slate-400 text-center py-8 text-xs font-bold">لا يوجد طلاب مسندين حالياً. ابدأ بالبحث في الأعلى للربط.</p>
                            ) : (
                              assignedStudents.map((st, i) => (
                                <div key={st.id} className="bg-white flex justify-between items-center px-4 py-2 rounded-xl border border-slate-100 text-xs">
                                  <span className="font-bold text-slate-700">{i+1} - {st.name} ({st.grade} - {st.section})</span>
                                  <button
                                    type="button"
                                    onClick={() => removeStudentFromBus(st.id)}
                                    className="p-1 px-2.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg hover:bg-rose-500 hover:text-white transition-colors"
                                  >
                                    إزالة
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Footer Buttons */}
                      <div className="border-t pt-5 flex justify-end gap-3.5">
                        <button
                          type="button"
                          onClick={() => setShowBusModal(false)}
                          className="px-5 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                        >
                          إلغاء
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          حفظ البطاقة وتثبيتها
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: SUPERVISOR CHECK (متابعة مشرف الباص)            */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'supervisorCheck' && canUseSupervisorCheckTab && (
          <div className="p-6 space-y-6">
            
            {/* Upper Select Panel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              
              {/* Target Bus select selection */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500">حافلات خط السير المتوفرة:</label>
                <select
                  value={selectedBusId}
                  onChange={(e) => setSelectedBusId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border rounded-xl font-black text-xs outline-none text-slate-700 focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- اختر الباص لفتحه تحضيره اليوم --</option>
                  {filteredBuses.map((b) => (
                    <option key={b.id} value={b.id}>باص #{b.busNumber} | {b.route}</option>
                  ))}
                </select>
              </div>

              {/* Date selection */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500">تاريخ المحضر اليومي:</label>
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border rounded-xl font-black text-xs outline-none text-slate-700 focus:border-blue-500"
                />
              </div>

              {/* Trip type selection */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500">نوع الرحلة المراد تتبعها ومطابقتها:</label>
                <select
                  value={tripType}
                  onChange={(e) => setTripType(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-white border rounded-xl font-black text-xs outline-none text-slate-700 focus:border-blue-500 cursor-pointer"
                >
                  <option value="morning">رحلة الذهاب (الصباحية ☀️)</option>
                  <option value="evening">رحلة الإياب (المسائية 🌙)</option>
                </select>
              </div>

              {/* Read only info from bus card selected */}
              {selectedBusId && (
                <div className="bg-blue-50/50 p-3 rounded-2xl flex flex-col justify-center space-y-1 text-[11px] font-bold text-slate-600 border border-blue-50">
                  <span>سائق الحافلة: <strong className="text-blue-700">{filteredBuses.find(b => b.id === selectedBusId)?.driverName}</strong></span>
                  <span>المشرف الفصلي: <strong className="text-blue-700">{filteredBuses.find(b => b.id === selectedBusId)?.supervisorName || "المشرف العام"}</strong></span>
                </div>
              )}

            </div>

            {/* Attendance checklist UI */}
            {!selectedBusId ? (
              <p className="text-center py-12 text-slate-500 font-semibold">الرجاء تشخيص أو اختيار الحافلة المقيدة في الأعلى للبدء بالتحضير والتوثيق والغيابات.</p>
            ) : (
              <div className="space-y-4">
                
                {/* Actions line */}
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleMarkAllPresent}
                      className="px-4 py-2 bg-emerald-50 text-emerald-700 border-2 border-emerald-100 rounded-xl font-bold text-xs hover:bg-emerald-600 hover:text-white transition-all whitespace-nowrap"
                    >
                      ✓ تحضير جماعي (الكل حضور)
                    </button>
                    <button
                      onClick={() => saveAttendance(false)}
                      className="flex items-center gap-1 px-4 py-2 bg-blue-50 text-blue-700 border-2 border-blue-100 rounded-xl font-bold text-xs hover:bg-blue-600 hover:text-white transition-all"
                    >
                      <Save size={14} /> حفظ كشف غيابات الحافلة
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400 font-bold ml-auto block">💾 يحفظ كالمستند تلقائيّاً كل 30 ثانية في السحابة لسهولة الفروع</span>
                </div>

                {saveStatus && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl font-black text-xs text-center animate-pulse">
                    {saveStatus}
                  </div>
                )}

                {/* Main dynamic Students Table checklist of assigned students */}
                <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-inner max-h-[500px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-right border-collapse">
                    <thead className="bg-slate-100 sticky top-0 z-10 border-b">
                      <tr className="text-xs text-slate-600 font-black">
                        <th className="p-3.5 text-center">الرقم</th>
                        <th className="p-3.5">اسم الطالب الكريم</th>
                        <th className="p-3.5 text-center">الصف والشعبة</th>
                        <th className="p-3.5 text-center">حالة الحضور والانتظام بالباص</th>
                        <th className="p-3.5">ملاحظة الغياب أو ولي الأمر</th>
                        <th className="p-3.5 text-center">إجراءات الوالدين</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs font-bold text-slate-700">
                      {attendanceLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">لا يوجد طلاب تم ربطهم مسبقاً بهذا الباص في بطاقات التوزيع الشاملة.</td>
                        </tr>
                      ) : (
                        attendanceLogs.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-center">{idx + 1}</td>
                            <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                            <td className="p-3 text-center">{item.grade} - {item.section}</td>
                            
                            {/* Toggleable button 3-state statuses indicator */}
                            <td className="p-3 text-center">
                              <button
                                onClick={() => toggleStudentStatus(item.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all border w-36 ${
                                  item.status === 'present'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : item.status === 'absent_excuse'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                }`}
                              >
                                {item.status === 'present' && "حاضر 🟢"}
                                {item.status === 'absent_excuse' && "غائب بعذر 🟡"}
                                {item.status === 'absent_no_excuse' && "غائب بدون عذر 🔴"}
                              </button>
                            </td>

                            {/* Notes editable field inline */}
                            <td className="p-3">
                              <input
                                type="text"
                                placeholder="..."
                                value={item.notes}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAttendanceLogs((prev) =>
                                    prev.map((l) => (l.id === item.id ? { ...l, notes: val } : l))
                                  );
                                }}
                                className="w-full px-3 py-1.5 border rounded-lg bg-slate-50/50 focus:border-blue-500 font-semibold text-xs outline-none"
                              />
                            </td>

                            {/* Direct WhatsApp actions to unexcused absences */}
                            <td className="p-3 text-center">
                              {item.status === 'absent_no_excuse' ? (
                                <button
                                  onClick={() => handleNotifyParentWhatsApp(item.name, `${item.grade}/${item.section}`, item.guardianPhone)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 rounded-lg font-black text-[10px] border border-rose-100 transition-all mx-auto"
                                >
                                  <MessageCircle size={12} /> إرسال تنبيه لولي الأمر
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[10px] font-bold">---</span>
                              )}
                            </td>

                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Excel and WhatsApp overall check sheet output */}
                {attendanceLogs.length > 0 && (
                  <div className="bg-slate-50 border p-4 rounded-3xl flex justify-between items-center flex-wrap gap-4">
                    <p className="text-xs text-slate-500 font-semibold">هل ترغب بتعميم كشفي التحضير اليومية للفرع أو أولياء الأمور؟</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSendBusStatusWhatsApp({
                          busNumber: filteredBuses.find(b => b.id === selectedBusId)?.busNumber || "...",
                          dayName: getArabicDayName(currentDate),
                          date: currentDate,
                          tripType: tripType,
                          supervisorName: filteredBuses.find(b => b.id === selectedBusId)?.supervisorName || currentUser?.name || "مشرف الباص",
                          students: attendanceLogs
                        })}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all"
                      >
                        <MessageCircle size={14} /> إرسال التقرير اليومي عبر واتساب
                      </button>
                    </div>
                  </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* ADVANCED SECTIONS: ARCHIVE & MASTER ABSENCES REPORTS  */}
                {/* ---------------------------------------------------- */}
                <div className="border-t pt-6 mt-6 space-y-6">
                  
                  {/* Master Absences Filter block */}
                  <div className="bg-slate-50/50 border p-6 rounded-3xl space-y-4">
                    <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                      <History className="text-amber-500" size={18} />
                      الأرشيف الشامل والبحث التراكمي لغيابات حافلات الطلاب بالفرع
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">ابحث في سجلات الغياب التراكمية لطالب معين أو صدر تقرير التراكميات الإجمالية لجميع الطلاب داخل فترة محددة</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">تاريخ البداية (من):</label>
                        <input
                          type="date"
                          value={reportDateFrom}
                          onChange={(e) => setReportDateFrom(e.target.value)}
                          className="w-full px-3 py-2 bg-white border rounded-xl font-black text-xs outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">تاريخ النهاية (إلى):</label>
                        <input
                          type="date"
                          value={reportDateTo}
                          onChange={(e) => setReportDateTo(e.target.value)}
                          className="w-full px-3 py-2 bg-white border rounded-xl font-black text-xs outline-none"
                        />
                      </div>
                      
                      <div className="flex gap-2 sm:col-span-2">
                        <button
                          onClick={exportStudentAbsenceAccumTablesExcel}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white bg-white rounded-xl font-bold text-xs transition-all"
                        >
                          <FileSpreadsheet size={14} /> تصدير تقرير غيابات الطلاب Excel
                        </button>
                      </div>
                    </div>

                    {/* Output Rendered Aggregated Table for Absent students */}
                    <div className="border rounded-2xl overflow-hidden bg-white max-h-[300px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-right border-collapse">
                        <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] border-b sticky top-0 z-10">
                          <tr>
                            <th className="p-2 text-center">الرقم</th>
                            <th className="p-2">اسم الطالب الغائب</th>
                            <th className="p-2 text-center">الصف</th>
                            <th className="p-2 text-center">غياب مبرر (بعذر)</th>
                            <th className="p-2 text-center">غياب غير مبرر</th>
                            <th className="p-2 text-center">مجموع الأيام الكلية</th>
                            <th className="p-2">سرد الملاحظات المرفقة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-[11px] font-bold text-slate-700">
                          {getStudentAbsenceCumulativeRows().length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-4 text-center text-slate-400">لا يوجد غيابات مرصودة للفرع في التاريخ والفلترة المحددة.</td>
                            </tr>
                          ) : (
                            getStudentAbsenceCumulativeRows().map((row: any, i: number) => (
                              <tr key={row.name + i} className="hover:bg-slate-50">
                                <td className="p-2 text-center">{i+1}</td>
                                <td className="p-2 text-slate-800">{row.name}</td>
                                <td className="p-2 text-center">{row.grade} / {row.section}</td>
                                <td className="p-2 text-center text-amber-600">{row.absentExcusedCount} يوم</td>
                                <td className="p-2 text-center text-rose-600">{row.absentUnexcusedCount} يوم</td>
                                <td className="p-2 text-center text-blue-600">{row.totalAbsences} يوم</td>
                                <td className="p-2 text-slate-400 font-semibold max-w-[200px] truncate" title={row.notes.join(", ")}>{row.notes.join(", ") || "لا يوجد"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                  </div>

                </div>

              </div>
            )}

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 4: TRAFFIC CONTROLLER OPERATIONS (متابعة مسؤول الحركة) */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'trafficManager' && canUseTrafficManagerTab && (
          <div className="p-6 space-y-6">
            
            {/* Header controls */}
            <div className="flex justify-between items-center flex-wrap gap-4 border-b pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Clock className="text-indigo-600" size={24} />
                  قسم الإشراف والمطابقة التفاعلية لمسؤول الحركة والمواصلات
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">يتحكم هذا القسم بمخرجات سائقي الباصات والانتظام الزمني بدقائق الحضور وتقارير الأداء المدمجة</p>
              </div>

              {/* Date controls */}
              <div className="flex gap-2">
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  className="px-4 py-2 bg-slate-50 border rounded-xl font-bold text-xs outline-none text-slate-700"
                />
              </div>
            </div>

            {/* A: DAILY MOVEMENT LOG CARDS GRID */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-sm text-slate-700">التقرير الميداني للانتظام ومطابقة أوقات الوصول اليومية ({getArabicDayName(currentDate)}):</h4>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleSendMovementStatusWhatsApp}
                    className="flex items-center gap-1 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                  >
                    <MessageCircle size={12} /> تعميم كشف مطابقة الحركة عبر واتساب
                  </button>
                  <button
                    onClick={() => handleSaveMovementStatus(false)}
                    className="flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-md"
                  >
                    <Save size={14} /> حفظ ورصد الأداء الزمني اليومي للباصات
                  </button>
                </div>
              </div>

              {filteredBuses.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-xs font-bold">لا يوجد حافلات مضافة لتوثيق حركتها اليوم بنظام مسؤول المواعيد.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredBuses.map((bus) => {
                    const rec = dailyStatusRecords[bus.id] || {
                      driverStatus: 'present',
                      actualArrivalTime: bus.approvedTime,
                      delayReason: '',
                      supervisorStatus: 'present',
                      generalNotes: ''
                    };

                    const handleUpdateRecord = (field: string, value: any) => {
                      setDailyStatusRecords((prev) => ({
                        ...prev,
                        [bus.id]: {
                          ...prev[bus.id],
                          [field]: value
                        }
                      }));
                    };

                    return (
                      <div key={bus.id} className="border border-slate-100 rounded-3xl p-5 hover:border-blue-400 transition-all hover:shadow-lg bg-slate-50/50 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="font-black text-slate-800 text-sm">الباص رقم #[{bus.busNumber}] ({bus.route})</span>
                          <span className="px-3 py-1 bg-white border rounded-xl text-[10px] font-semibold text-slate-400">وقت الانطلاق المعتمد: {bus.approvedTime}</span>
                        </div>

                        {/* Driver status controller */}
                        <div className="space-y-2">
                          <span className="text-[11px] font-black text-slate-500">👨‍✈️ حضور والتزام السائق ({bus.driverName}):</span>
                          <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => handleUpdateRecord('driverStatus', 'present')}
                              className={`py-1.5 rounded-lg text-xs font-black transition-all ${rec.driverStatus === 'present' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                            >
                              حاضر 🟢
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateRecord('driverStatus', 'delayed')}
                              className={`py-1.5 rounded-lg text-xs font-black transition-all ${rec.driverStatus === 'delayed' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                            >
                              متأخر 🟡
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateRecord('driverStatus', 'absent')}
                              className={`py-1.5 rounded-lg text-xs font-black transition-all ${rec.driverStatus === 'absent' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                            >
                              غائب 🔴
                            </button>
                          </div>
                        </div>

                        {/* Interactive Timing & Conditional Delay reason */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400">وقت الوصول الفعلي للحافلة اليوم</span>
                            <input
                              type="text"
                              value={rec.actualArrivalTime}
                              onChange={(e) => handleUpdateRecord('actualArrivalTime', e.target.value)}
                              className="w-full px-3 py-2 bg-white border rounded-xl font-bold text-xs outline-none focus:border-blue-500"
                              placeholder="مثال: 07:35 ص"
                            />
                          </div>

                          {/* Delay reason appears if Driver state is delayed */}
                          {rec.driverStatus === 'delayed' && (
                            <div className="space-y-1 animate-in fade-in slide-in-from-top-1.5 duration-200">
                              <span className="text-[10px] font-black text-rose-500">💡 سبب التأخير الإداري للحافلة اليوم</span>
                              <input
                                type="text"
                                value={rec.delayReason}
                                onChange={(e) => handleUpdateRecord('delayReason', e.target.value)}
                                className="w-full px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl font-bold text-xs outline-none text-rose-700"
                                placeholder="مثال: زحام مروري / عطل طارئ"
                              />
                            </div>
                          )}

                        </div>

                        {/* Supervisor Status toggle */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
                          <div className="space-y-1">
                            <span className="text-[11px] font-black text-slate-500">👩‍🏫 حضور مشرف الطلاب الحافلة ({bus.supervisorName || "المشرف العام"}):</span>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => handleUpdateRecord('supervisorStatus', 'present')}
                                className={`flex-1 py-1 text-xs font-black rounded-lg transition-all ${rec.supervisorStatus === 'present' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600'}`}
                              >
                                حاضر ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateRecord('supervisorStatus', 'absent')}
                                className={`flex-1 py-1 text-xs font-black rounded-lg transition-all ${rec.supervisorStatus === 'absent' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600'}`}
                              >
                                غائب ✗
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-400">أي ملاحظات إدارية عامة ومطالب</span>
                            <input
                              type="text"
                              value={rec.generalNotes}
                              onChange={(e) => handleUpdateRecord('generalNotes', e.target.value)}
                              placeholder="..."
                              className="w-full px-3 py-1.5 bg-white border rounded-lg font-bold text-xs"
                            />
                          </div>

                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* B: ADAVNCED ANALYTICS / STATISTICAL ADMINISTRATIVE REPORTS TABLE */}
            <div className="border-t pt-6 space-y-4">
              <div className="bg-slate-50 border p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                      <BarChart className="text-blue-500" size={18} />
                      مؤشرات وقاعدة البيانات التحليلية لحركة ووصول الحافلات
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 font-semibold">يقارن هذا الجدول الإحصائي مجموع الأيام وأدق دقائق التأخر للباصات المعتمدة</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={exportStatisticalMovementExcel}
                      className="flex items-center gap-1.5 px-4 py-2 border-2 border-emerald-100 bg-white hover:bg-emerald-600 hover:text-white text-emerald-700 rounded-xl font-bold text-xs transition-all"
                    >
                      <FileSpreadsheet size={14} /> تصدير تقرير التوقيع وحركة الحافلات Excel
                    </button>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end bg-white p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">السنة المقيدة والمحددة:</label>
                    <select className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs">
                      <option>سنة 2024-2025</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">تاريخ بداية البحث الزمني (من):</label>
                    <input
                      type="date"
                      value={statsDateFrom}
                      onChange={(e) => setStatsDateFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">تاريخ نهاية البحث الزمني (إلى):</label>
                    <input
                      type="date"
                      value={statsDateTo}
                      onChange={(e) => setStatsDateTo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs"
                    />
                  </div>

                  <div className="bg-blue-50 border p-2 rounded-xl text-[10px] font-bold text-blue-700 text-center">
                    تمت الترجمة اليومية التلقائية إلى الأسماء العربية بدقة
                  </div>
                </div>

                {/* Grid stats table */}
                <div className="border rounded-2xl overflow-hidden bg-white max-h-[350px] overflow-y-auto custom-scrollbar shadow-inner">
                  <table className="w-full text-right border-collapse">
                    <thead className="bg-slate-100 font-black text-[10px] text-slate-600 border-b sticky top-0 z-10">
                      <tr>
                        <th className="p-3 text-center">م</th>
                        <th className="p-3">اسم السائق المعتمد</th>
                        <th className="p-3 text-center">الباص #</th>
                        <th className="p-3">الخط الرئيسي المخصص / خط السير</th>
                        <th className="p-3 text-center">رصيد حضور السائق</th>
                        <th className="p-3 text-center">رصيد غياب السائق</th>
                        <th className="p-3 text-center">تكرار التأخر</th>
                        <th className="p-3 text-center">إجمالي دقائق التأخير</th>
                        <th className="p-3">اسم مشرف الباص والطلاب</th>
                        <th className="p-3 text-center">حضور المشرف</th>
                        <th className="p-3 text-center">غياب المشرف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-[10px] font-bold text-slate-700">
                      {getStatisticalReportRows().length === 0 ? (
                        <tr>
                          <td colSpan={11} className="p-4 text-center text-slate-400">لم يتم رصد أي تقارير زمنية أو حركة حافلات للفرع بالتاريخ المحدد.</td>
                        </tr>
                      ) : (
                        getStatisticalReportRows().map((row, i) => (
                          <tr key={row.driverName + i} className="hover:bg-slate-50">
                            <td className="p-3 text-center">{i + 1}</td>
                            <td className="p-3 text-slate-900 font-semibold">{row.driverName}</td>
                            <td className="p-3 text-center text-blue-600">#{row.busNumber}</td>
                            <td className="p-3 text-slate-600">{row.route}</td>
                            <td className="p-3 text-center text-emerald-600">{row.driverPresent} ي</td>
                            <td className="p-3 text-center text-rose-600">{row.driverAbsent} ي</td>
                            <td className="p-3 text-center text-amber-600">{row.driverDelaysCount} مرة</td>
                            <td className="p-3 text-center text-rose-700">{row.driverDelayMinutesSum} دقيقة</td>
                            <td className="p-3 text-slate-600">{row.supervisorName || "غير معين"}</td>
                            <td className="p-3 text-center text-emerald-600">{row.supervisorPresent} ي</td>
                            <td className="p-3 text-center text-rose-600">{row.supervisorAbsent} ي</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>

      {/* Transfer Student Warning Modal */}
      {transferConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-all" id="transfer-confirm-modal">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-5 text-right">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto">
              <span className="text-xl">⚠️</span>
            </div>
            
            <div className="space-y-2 text-center">
              <h3 className="text-base font-black text-slate-800">تأكيد نقل الطالب بين الحافلات</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-bold">
                الطالب مضاف في الباص رقم (<span className="text-amber-600 font-extrabold">{transferConfirm.prevBus.busNumber}</span>) هل أنت متأكد من نقله إلى هذا الباص برقم (<span className="text-emerald-600 font-extrabold">{transferConfirm.currentBusNumber}</span>)؟
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  transferConfirm.onConfirm();
                  setTransferConfirm(null);
                }}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-2xl transition-all shadow-md shadow-emerald-100"
              >
                نعم، متأكد وأنقله
              </button>
              <button
                type="button"
                onClick={() => setTransferConfirm(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs rounded-2xl transition-all"
              >
                تراجع وإلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Capacity Exceeded Warning Modal */}
      {capacityWarningConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-all" id="capacity-warning-modal">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-5 text-right">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto">
              <span className="text-xl">⚠️</span>
            </div>
            
            <div className="space-y-2 text-center">
              <h3 className="text-base font-black text-rose-700">تنبيه: تجاوز الطاقة الاستيعابية للباص</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-bold">
                إن الباص قد تجاوز الطاقة الاستيعابية فهل أنت متأكد من إضافة المزيد من الطلاب فوق الطاقة الاستيعابية؟
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  capacityWarningConfirm.onConfirm();
                  setCapacityWarningConfirm(null);
                }}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs rounded-2xl transition-all shadow-md shadow-rose-100"
              >
                نعم، أضف الطالب
              </button>
              <button
                type="button"
                onClick={() => setCapacityWarningConfirm(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs rounded-2xl transition-all"
              >
                تراجع وإلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Confirmation Dialog Modal */}
      {saveConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-all text-right" id="save-confirm-modal">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-100 shadow-2xl space-y-5">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto">
              <span className="text-xl">📋</span>
            </div>
            
            <div className="space-y-2 text-center">
              <h3 className="text-base font-black text-slate-800">{saveConfirm.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-bold text-center">
                {saveConfirm.message}
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  saveConfirm.onConfirm();
                  setSaveConfirm(null);
                }}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs rounded-2xl transition-all shadow-md shadow-blue-100"
              >
                تأكيد وموافقة
              </button>
              <button
                type="button"
                onClick={() => setSaveConfirm(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs rounded-2xl transition-all"
              >
                تراجع وإلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Log Detail Popup Modal */}
      {selectedArchiveLog && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-all text-right" id="archive-detail-modal">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-50 p-5 border-b flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => setSelectedArchiveLog(null)}
                className="py-1 px-3 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-all font-bold text-xs"
              >
                ✕ إغلاق
              </button>
              <div className="text-right">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 justify-end">
                  تفاصيل كشف تحضير الحافلة رقم {selectedArchiveLog.busNumber}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">{selectedArchiveLog.dayName} - {selectedArchiveLog.date} ({selectedArchiveLog.tripType === 'morning' ? 'الذهاب صباحاً' : 'الإياب مساءً'})</p>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Stats & Metadata Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50/55 p-3.5 rounded-2xl border border-slate-100 text-right">
                  <p className="text-[10px] text-slate-400 font-extrabold text-right">المشرف المسؤول:</p>
                  <p className="text-xs font-black text-slate-700 mt-1 text-right">{selectedArchiveLog.supervisorName}</p>
                </div>
                <div className="bg-slate-50/55 p-3.5 rounded-2xl border border-slate-100 text-right">
                  <p className="text-[10px] text-slate-400 font-extrabold text-right">عدد الطلاب المقيدين:</p>
                  <p className="text-xs font-black text-slate-700 mt-1 text-right">{selectedArchiveLog.students?.length || 0} طالباً</p>
                </div>
                <div className="bg-slate-50/55 p-3.5 rounded-2xl border border-slate-100 col-span-2 sm:col-span-1 text-right">
                  <p className="text-[10px] text-slate-400 font-extrabold text-right">المؤسسة التعليمية والفرع:</p>
                  <p className="text-xs font-black text-slate-700 mt-1 text-right">{selectedArchiveLog.school} • {selectedArchiveLog.branch}</p>
                </div>
              </div>

              {/* Attendance lists grouped */}
              <div className="space-y-2">
                <h4 className="font-black text-xs text-slate-700 border-r-4 border-blue-500 pr-2 text-right">جدول رصد الغياب والحضور للطلاب</h4>
                
                <div className="border border-slate-100 rounded-2xl overflow-hidden block w-full overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-500 font-extrabold border-b border-slate-100">
                        <th className="p-3 text-right">اسم الطالب</th>
                        <th className="p-3 text-right">الصف والشعبة</th>
                        <th className="p-3 text-right">الحالة اليومية</th>
                        <th className="p-3 text-right">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {selectedArchiveLog.students?.map((student: any) => (
                        <tr key={student.id} className="hover:bg-slate-50/30">
                          <td className="p-3 font-black text-slate-700 text-right">{student.name}</td>
                          <td className="p-3 font-semibold text-slate-500 text-right">{student.grade} - {student.section}</td>
                          <td className="p-3 text-right">
                            {student.status === 'present' ? (
                              <span className="inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100">حاضر 🟢</span>
                            ) : student.status === 'absent_excuse' ? (
                              <span className="inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black bg-amber-50 text-amber-600 border border-amber-100">غائب بعذر 🟡</span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100">غائب بدون عذر 🔴</span>
                            )}
                          </td>
                          <td className="p-3 font-medium text-slate-400 text-right">{student.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t flex gap-2.5 justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedArchiveLog(null)}
                className="py-2 px-5 bg-slate-200 hover:bg-slate-300 text-slate-600 font-extrabold text-xs rounded-xl transition-all"
              >
                تراجع وإغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  const presentStudents = selectedArchiveLog.students?.filter((s: any) => s.status === 'present') || [];
                  const absentExcused = selectedArchiveLog.students?.filter((s: any) => s.status === 'absent_excuse') || [];
                  const absentNoExcuse = selectedArchiveLog.students?.filter((s: any) => s.status === 'absent_no_excuse') || [];

                  let msg = `🚌 *تقرير أرشيف غياب حضور الطلاب اليومي للباص* 🚌\n\n`;
                  msg += `🏫 *المدرسة:* ${selectedArchiveLog.school}\n`;
                  msg += `🏢 *الفرع:* ${selectedArchiveLog.branch}\n`;
                  msg += `🔢 *رقم الباص:* ${selectedArchiveLog.busNumber}\n`;
                  msg += `📅 *تاريخ اليوم:* ${selectedArchiveLog.dayName} - ${selectedArchiveLog.date}\n`;
                  msg += `🕒 *رحلة:* ${selectedArchiveLog.tripType === 'morning' ? 'صباحية ☀️' : 'مسائية 🌙'}\n`;
                  msg += `✍️ *محضر مشرف الحافلة:* ${selectedArchiveLog.supervisorName}\n\n`;
                  
                  msg += `📊 *إحصائية سريعة:*\n`;
                  msg += `🟢 عدد الحاضرين: ${presentStudents.length}\n`;
                  msg += `🟡 غياب بعذر: ${absentExcused.length}\n`;
                  msg += `🔴 غياب بدون عذر: ${absentNoExcuse.length}\n\n`;

                  if (absentExcused.length > 0) {
                    msg += `⚠️ *الغياب المبرر اليوم 🟡:*\n`;
                    absentExcused.forEach((st: any, i: number) => {
                      msg += `${i+1} - ${st.name} (${st.grade}/${st.section}) ${st.notes ? `[ملاحظة: ${st.notes}]` : ""}\n`;
                    });
                    msg += `\n`;
                  }

                  if (absentNoExcuse.length > 0) {
                    msg += `❌ *الغياب غير المبرر اليوم 🔴:*\n`;
                    absentNoExcuse.forEach((st: any, i: number) => {
                      msg += `${i+1} - ${st.name} (${st.grade}/${st.section}) ${st.notes ? `[ملاحظة: ${st.notes}]` : ""}\n`;
                    });
                    msg += `\n`;
                  }

                  msg += `تمنياتنا لجميع الطلاب بالسلامة والتوفيق 🌸\n`;
                  const encoded = encodeURIComponent(msg);
                  window.open(`https://web.whatsapp.com/send?text=${encoded}`, "_blank");
                }}
                className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-sm"
              >
                إرسال التقرير بالواتساب 📱
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
