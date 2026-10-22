import React, { useState, useEffect, useMemo } from "react";
import { useGlobal } from "../context/GlobalState";
import { Filter, Download, Share2, ArrowRight } from "lucide-react";
import { shortCriteriaBlocks, extCriteriaBlocks, normalizeSubject, matchSubjects, mapScoresToActiveBlocks, getEvaluationItemScore, isSameSchool } from "./evaluationUtils";

interface FinalReportsPageProps {
  onBack: () => void;
  selectedSchool: string;
}

export default function FinalReportsPage({ onBack, selectedSchool }: FinalReportsPageProps) {
  const { data, currentUser, getReportMessageFooter, shareViaWhatsApp } = useGlobal();

  const allBranches = data.schoolBranches?.[selectedSchool] || [];
  const schoolBranches =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true
      ? allBranches
      : currentUser?.permissions?.schoolsAndBranches?.[selectedSchool] || [];

  const [filterBranch, setFilterBranch] = useState("all");
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterEvalType, setFilterEvalType] = useState<"all" | "short" | "ext" | "subject">("all");
  const [filterVisitType, setFilterVisitType] = useState("all");
  const [filterEvaluator, setFilterEvaluator] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all");
  const [useColorVisuals, setUseColorVisuals] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [onlyVisited, setOnlyVisited] = useState(false);
  const [mergeVisits, setMergeVisits] = useState(false);

  const normalizeSemester = (sem?: string): string => {
    if (!sem) return '';
    const s = sem.trim();
    if (s.includes('الأول') || s.includes('1')) return 'الفصل الأول';
    if (s.includes('الثاني') || s.includes('2')) return 'الفصل الثاني';
    if (s.includes('الثالث') || s.includes('3')) return 'الفصل الثالث';
    return s;
  };

  const matchSemester = (evalSem?: string, filterSem?: string): boolean => {
    if (!filterSem || filterSem === 'all' || filterSem === 'الفصلين' || filterSem === 'الكل') return true;
    if (!evalSem) return false;
    return evalSem === filterSem || normalizeSemester(evalSem) === normalizeSemester(filterSem);
  };

  const isSuperAdmin = currentUser?.role === "admin" || currentUser?.permissions?.all === true;

  const evals = useMemo(() => {
    return (data.teacherEvaluations || []).filter((e) => {
      if (!e) return false;
      const eSchool = (e.school || '').trim();
      const targetSchool = (selectedSchool || '').trim();

      if (targetSchool && targetSchool !== 'all' && targetSchool !== 'الكل') {
        const matchSchool = isSameSchool(eSchool, targetSchool);
        if (!matchSchool) return false;
      }
      
      if (!isSuperAdmin) {
        const rawBranches = currentUser?.permissions?.schoolsAndBranches?.[e.school] || currentUser?.permissions?.schoolsAndBranches?.[targetSchool] || [];
        const authorizedBranches = (rawBranches || []).map((b: string) => (b || '').trim());
        if (authorizedBranches.length > 0 && e.branch) {
          const eBranch = e.branch.trim();
          if (!authorizedBranches.includes(eBranch) && !authorizedBranches.includes('all')) {
            return false;
          }
        }

        const supervisorGrades = (currentUser?.grades || []).map((g: string) => (g || '').trim());
        if (supervisorGrades.length > 0 && e.className) {
          const hasGradeOverlap = supervisorGrades.some((g: string) => e.className.includes(g));
          if (!hasGradeOverlap) return false;
        }

        const supervisorSubjects = (currentUser?.subjects || []).map((s: string) => (s || '').trim());
        if (supervisorSubjects.length > 0 && e.subject) {
          const eSub = e.subject.trim();
          if (!supervisorSubjects.some((s: string) => matchSubjects(s, eSub))) {
            return false;
          }
        }
      }
      return true;
    });
  }, [data.teacherEvaluations, selectedSchool, currentUser, isSuperAdmin]);

  const uniqueEvaluators = useMemo(() => {
    return Array.from(
      new Set(
        evals
          .filter((e) => {
            if (filterBranch !== "all" && (e.branch || '').trim() !== filterBranch.trim()) return false;
            return e.evaluatorName;
          })
          .map((e) => e.evaluatorName)
      )
    ).filter(Boolean);
  }, [evals, filterBranch]);

  // Extract unique teachers, subjects from evals
  const uniqueTeachers = useMemo(() => {
    // 1. Get teachers from evaluations that match all other filters (excluding filterTeacher)
    const matchingEvalTeachers = evals
      .filter((e) => {
        if (filterBranch !== "all" && (e.branch || '').trim() !== filterBranch.trim()) return false;
        if (filterSubject !== "all" && !matchSubjects(e.subject, filterSubject)) return false;
        if (filterEvalType !== "all" && e.evaluationType !== filterEvalType) return false;
        if (filterVisitType !== "all" && e.visitType !== filterVisitType) return false;
        if (filterEvaluator !== "all" && (e.evaluatorName || '').trim() !== filterEvaluator.trim()) return false;
        if (!matchSemester(e.semester, filterSemester)) return false;
        if (fromDate && e.date < fromDate) return false;
        if (toDate && e.date > toDate) return false;
        return true;
      })
      .map((e) => e.teacherName);

    // 2. Get teachers from secretariatStaff that match other filters (excluding filterTeacher)
    const matchingStaffTeachers = onlyVisited || filterEvaluator !== "all"
      ? []
      : (data.secretariatStaff || [])
          .filter((s) => {
            const sSchool = (s.school || '').trim();
            const targetSchool = (selectedSchool || '').trim();
            if (targetSchool && targetSchool !== 'all' && !isSameSchool(sSchool, targetSchool)) return false;
            const jobTitles = s.jobTitles || [];
            const isTeacher = jobTitles.includes('معلم مادة') || jobTitles.includes('مربية');
            if (!isTeacher) return false;

            if (filterBranch !== "all" && (s.branch || '').trim() !== filterBranch.trim()) return false;
            if (filterSubject !== "all" && !(s.subjects || []).some((sub: string) => matchSubjects(sub, filterSubject))) return false;
            return true;
          })
          .map((s) => s.name);

    return Array.from(new Set([...matchingEvalTeachers, ...matchingStaffTeachers]));
  }, [evals, data.secretariatStaff, selectedSchool, filterBranch, filterSubject, filterEvalType, filterVisitType, filterSemester, fromDate, toDate, onlyVisited]);

  const uniqueSubjects = useMemo(() => {
    return Array.from(
      new Set(
        evals
          .filter((e) => {
            if (filterBranch !== "all" && (e.branch || '').trim() !== filterBranch.trim()) return false;
            if (filterTeacher !== "all" && (e.teacherName || '').trim() !== filterTeacher.trim()) return false;
            if (filterEvalType !== "all" && e.evaluationType !== filterEvalType) return false;
            if (filterVisitType !== "all" && e.visitType !== filterVisitType) return false;
            if (filterEvaluator !== "all" && (e.evaluatorName || '').trim() !== filterEvaluator.trim()) return false;
            if (!matchSemester(e.semester, filterSemester)) return false;
            if (fromDate && e.date < fromDate) return false;
            if (toDate && e.date > toDate) return false;
            return true;
          })
          .map((e) => e.subject)
      )
    );
  }, [evals, filterBranch, filterTeacher, filterEvalType, filterVisitType, filterSemester, fromDate, toDate]);

  // Filter evaluations
  const filteredEvals = useMemo(() => {
    return evals.filter((e) => {
      if (filterBranch !== "all" && (e.branch || '').trim() !== filterBranch.trim()) return false;
      if (filterTeacher !== "all" && (e.teacherName || '').trim() !== filterTeacher.trim()) return false;
      if (filterSubject !== "all" && !matchSubjects(e.subject, filterSubject)) return false;
      if (filterEvalType !== "all" && filterEvalType !== e.evaluationType) return false;
      if (filterVisitType !== "all" && e.visitType !== filterVisitType) return false;
      if (filterEvaluator !== "all" && (e.evaluatorName || '').trim() !== filterEvaluator.trim()) return false;
      if (!matchSemester(e.semester, filterSemester)) return false;
        
      if (fromDate && e.date < fromDate) return false;
      if (toDate && e.date > toDate) return false;

      return true;
    });
  }, [evals, filterBranch, filterTeacher, filterSubject, filterEvalType, filterVisitType, filterSemester, fromDate, toDate]);

  // Final list to process:
  const finalEvalsToAggregate = useMemo(() => {
    return filteredEvals;
  }, [filteredEvals]);

  // Resolve custom supervision criteria config if exists
  const computedConfig = data.customSupervisionCriteria?.find(
    (c: any) => isSameSchool(c.school, selectedSchool) && (filterBranch === "all" || c.branch === filterBranch)
  ) || data.customSupervisionCriteria?.find(
    (c: any) => isSameSchool(c.school, selectedSchool)
  );

  const activeShortBlocks = computedConfig?.shortCriteriaBlocks || shortCriteriaBlocks;
  const activeExtBlocks = computedConfig?.extCriteriaBlocks || extCriteriaBlocks;

  // Calculate aggregated data
  const aggregatedData = useMemo(() => {
    const agg: Record<string, any> = {};

    if (mergeVisits) {
      finalEvalsToAggregate.forEach((e) => {
        if (!agg[e.teacherId]) {
          agg[e.teacherId] = {
            teacherId: e.teacherId,
            teacherName: e.teacherName,
            subject: e.subject,
            className: e.className,
            semester: e.semester,
            branch: e.branch,
            date: e.date,
            scores: {} as Record<string, { total: number; count: number }>,
            violations: 0,
            notes: new Set<string>()
          };
        }

        const tData = agg[e.teacherId];
        if (e.strengths && e.strengths.trim()) tData.notes.add('قوة: ' + e.strengths.trim());
        if (e.improvements && e.improvements.trim()) tData.notes.add('تحسين: ' + e.improvements.trim());

        // Update with latest metadata if this visit is newer
        if (e.date > tData.date) {
          tData.date = e.date;
          tData.subject = e.subject;
          tData.className = e.className;
          tData.semester = e.semester;
          tData.branch = e.branch;
        }

        const activeBlocks = e.evaluationType === "short" ? activeShortBlocks : activeExtBlocks;
        const mappedScores = mapScoresToActiveBlocks(e.scores, activeBlocks, e.criteriaBlocksSnapshot);
        Object.entries(mappedScores).forEach(([crit, score]) => {
          if (!tData.scores[crit]) tData.scores[crit] = { total: 0, count: 0 };
          tData.scores[crit].total += score;
          tData.scores[crit].count += 1;
        });
      });
    } else {
      finalEvalsToAggregate.forEach((e) => {
        const rowKey = e.id || crypto.randomUUID();
        agg[rowKey] = {
          teacherId: e.teacherId,
          teacherName: e.teacherName,
          subject: e.subject,
          className: e.className,
          semester: e.semester,
          branch: e.branch,
          date: e.date,
          scores: {} as Record<string, { total: number; count: number }>,
          violations: 0,
          notes: new Set<string>()
        };

        const tData = agg[rowKey];
        if (e.strengths && e.strengths.trim()) tData.notes.add('قوة: ' + e.strengths.trim());
        if (e.improvements && e.improvements.trim()) tData.notes.add('تحسين: ' + e.improvements.trim());

        const activeBlocks = e.evaluationType === "short" ? activeShortBlocks : activeExtBlocks;
        const mappedScores = mapScoresToActiveBlocks(e.scores, activeBlocks, e.criteriaBlocksSnapshot);
        Object.entries(mappedScores).forEach(([crit, score]) => {
          tData.scores[crit] = { total: score, count: 1 };
        });
      });
    }

    // Calculate violations from admin reports
    if (data.adminReports) {
      const relevantReports = data.adminReports.filter(r => 
        (!r.schoolId || r.schoolId === selectedSchool)
      );
      relevantReports.forEach(report => {
        report.employeesData?.forEach(emp => {
          const matchedKeys = Object.keys(agg).filter(key => 
            agg[key].teacherName === emp.employeeName
          );
          matchedKeys.forEach(key => {
            if (emp.violations_score) {
              agg[key].violations += emp.violations_score;
            }
          });
        });
      });
    }

    if (!onlyVisited && filterEvaluator === "all") {
      // Add un-evaluated teachers if they match the branch filter
      (data.secretariatStaff || []).forEach((s) => {
        if (s.school !== selectedSchool) return;
        const jobTitles = s.jobTitles || [];
        const isTeacher = jobTitles.includes('معلم مادة') || jobTitles.includes('مربية');
        if (!isTeacher) return;

        let branch = s.branch || '';
        if (filterBranch !== "all" && branch !== filterBranch) return;
        if (filterTeacher !== "all" && s.name !== filterTeacher) return;
        if (filterSubject !== "all" && !(s.subjects || []).includes(filterSubject)) return;

        if (!agg[s.id]) {
          let violations = 0;
          if (data.adminReports) {
            data.adminReports.filter(r => !r.schoolId || r.schoolId === selectedSchool).forEach(report => {
              report.employeesData?.forEach(emp => {
                if (emp.employeeName === s.name && emp.violations_score) {
                  violations += emp.violations_score;
                }
              });
            });
          }

          agg[s.id] = {
            teacherId: s.id,
            teacherName: s.name,
            subject: Array.isArray(s.subjects) && s.subjects.length > 0 ? s.subjects[0] : '',
            className: '',
            semester: filterSemester !== 'all' && filterSemester !== 'الفصلين' ? filterSemester : '',
            branch: branch,
            date: '',
            scores: {},
            violations: violations,
            notes: new Set<string>()
          };
        }
      });
    }

    return agg;
  }, [finalEvalsToAggregate, data.adminReports, data.secretariatStaff, selectedSchool, filterBranch, filterTeacher, filterSemester, filterSubject, mergeVisits, onlyVisited, filterEvaluator]);

  const sortedReportData = useMemo(() => {
    const list = Object.values(aggregatedData);
    if (!mergeVisits) {
      list.sort((a, b) => {
        const dateA = a.date || "";
        const dateB = b.date || "";
        return dateB.localeCompare(dateA);
      });
    } else {
      list.sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'ar'));
    }
    return list;
  }, [aggregatedData, mergeVisits]);

  const getCellColor = (score: number) => {
    if (!useColorVisuals) return "";
    if (score >= 3.5) return "bg-green-100 text-green-800";
    if (score >= 2.5) return "bg-blue-100 text-blue-800";
    if (score >= 1.5) return "bg-yellow-100 text-yellow-800";
    if (score >= 0.5) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getHexColor = (score: number) => {
    if (!useColorVisuals) return "FFFFFFFF";
    if (score >= 3.5) return "FFDCFCE7"; // green-100
    if (score >= 2.5) return "FFDBEAFE"; // blue-100
    if (score >= 1.5) return "FFFEF9C3"; // yellow-100
    if (score >= 0.5) return "FFFFEDD5"; // orange-100
    return "FFFEE2E2"; // red-100
  };

  const criteriaList = useMemo(() => {
    const baseItems =
      filterEvalType === "ext" || filterEvalType === "subject"
        ? activeExtBlocks.flatMap((b) => b.items)
        : filterEvalType === "short"
        ? activeShortBlocks.flatMap((b) => b.items)
        : Array.from(
            new Set([
              ...activeShortBlocks.flatMap((b) => b.items),
              ...activeExtBlocks.flatMap((b) => b.items),
            ])
          );

    // Also include any criteria keys present in the filtered evaluations so legacy scores aren't omitted
    const evaluatedKeys = new Set<string>();
    (finalEvalsToAggregate || []).forEach((e) => {
      if (e.scores && typeof e.scores === "object") {
        Object.keys(e.scores).forEach((k) => {
          if (k && k.trim()) evaluatedKeys.add(k.trim());
        });
      }
    });

    return Array.from(new Set([...baseItems, ...Array.from(evaluatedKeys)]));
  }, [filterEvalType, activeShortBlocks, activeExtBlocks, finalEvalsToAggregate]);

  const renderTable = () => {
    const colSums = criteriaList.map(() => 0);
    const colCounts = criteriaList.map(() => 0);
    let totalSumOfTotals = 0;
    let totalEvaluatedCount = 0;

    sortedReportData.forEach((t) => {
      let teacherTotal = 0;
      let teacherCount = 0;
      criteriaList.forEach((crit, cIdx) => {
        const cellData = t.scores[crit];
        if (cellData) {
          const avg = cellData.total / cellData.count;
          teacherTotal += avg;
          teacherCount++;
          colSums[cIdx] += avg;
          colCounts[cIdx] += 1;
        }
      });
      totalSumOfTotals += teacherTotal;
      totalEvaluatedCount += teacherCount;
    });

    return (
      <div className="overflow-x-auto mt-6">
        <table className="w-full text-sm text-right whitespace-nowrap border-collapse border border-slate-200">
          <thead className="bg-blue-500 font-bold text-white">
            <tr>
              <th className="border border-blue-400 p-2 min-w-[50px]">الرقم</th>
              <th className="border border-blue-400 p-2 min-w-[150px]">اسم المعلم</th>
              <th className="border border-blue-400 p-2">المادة</th>
              <th className="border border-blue-400 p-2">الصف</th>
              <th className="border border-blue-400 p-2">الفصل الدراسي</th>
              <th className="border border-blue-400 p-2">الفرع</th>
              <th className="border border-blue-400 p-2">التاريخ</th>
              {criteriaList.map((crit, idx) => (
                <th key={idx} className="border border-blue-400 p-2 max-w-[150px] whitespace-normal">
                  {crit}
                </th>
              ))}
              <th className="border border-blue-400 p-2 font-black">المجموع</th>
              <th className="border border-blue-400 p-2 font-black">النسبة %</th>
            </tr>
          </thead>
          <tbody>
            {sortedReportData.map((t, idx) => {
              let totalScore = 0;
              let evaluatedCount = 0;

              return (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="border p-2 text-center text-slate-500 font-bold">{idx + 1}</td>
                  <td className="border p-2 font-bold text-slate-800">{t.teacherName}</td>
                  <td className="border p-2 text-slate-600">{t.subject}</td>
                  <td className="border p-2 text-slate-600">{t.className}</td>
                  <td className="border p-2 text-slate-600">{t.semester}</td>
                  <td className="border p-2 text-slate-600">{t.branch}</td>
                  <td className="border p-2 text-slate-600">{t.date || "--"}</td>
                  {criteriaList.map((crit, cIdx) => {
                    const cellData = t.scores[crit];
                    const avg = cellData ? cellData.total / cellData.count : 0;
                    if (cellData) {
                      totalScore += avg;
                      evaluatedCount++;
                    }
                    return (
                      <td
                        key={cIdx}
                        className={`border p-2 text-center font-bold ${getCellColor(avg)}`}
                      >
                        {cellData ? (Number.isInteger(avg) ? avg : avg.toFixed(1)) : "-"}
                      </td>
                    );
                  })}
                  <td className="border p-2 text-center font-black text-blue-700">
                    {Number.isInteger(totalScore) ? totalScore : totalScore.toFixed(1)}
                  </td>
                  <td className="border p-2 text-center font-black text-green-700">
                    {evaluatedCount > 0 ? Math.round((totalScore / (evaluatedCount * 4)) * 100) : 0}%
                  </td>
                </tr>
              );
            })}
            {sortedReportData.length > 0 && (
              <>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                  <td className="border p-2 text-center font-black" colSpan={7}>المجموع</td>
                  {criteriaList.map((crit, cIdx) => {
                    const sum = colSums[cIdx];
                    return (
                      <td key={cIdx} className="border p-2 text-center font-black">
                        {colCounts[cIdx] > 0 ? (Number.isInteger(sum) ? sum : sum.toFixed(1)) : "-"}
                      </td>
                    );
                  })}
                  <td className="border p-2 text-center font-black text-blue-800 bg-blue-50">
                    {Number.isInteger(totalSumOfTotals) ? totalSumOfTotals : totalSumOfTotals.toFixed(1)}
                  </td>
                  <td className="border p-2 text-center font-black text-green-800 bg-green-50">
                    {totalEvaluatedCount > 0 ? Math.round((totalSumOfTotals / (totalEvaluatedCount * 4)) * 100) : 0}%
                  </td>
                </tr>
                <tr className="bg-slate-100 font-bold">
                  <td className="border p-2 text-center font-black" colSpan={7}>النسبة %</td>
                  {criteriaList.map((crit, cIdx) => {
                    const count = colCounts[cIdx];
                    const sum = colSums[cIdx];
                    const percentage = count > 0 ? Math.round((sum / (count * 4)) * 100) : 0;
                    return (
                      <td key={cIdx} className="border p-2 text-center font-black">
                        {count > 0 ? `${percentage}%` : "-"}
                      </td>
                    );
                  })}
                  <td className="border p-2 text-center font-black text-blue-800 bg-blue-50">
                    {totalEvaluatedCount > 0 ? Math.round((totalSumOfTotals / (totalEvaluatedCount * 4)) * 100) : 0}%
                  </td>
                  <td className="border p-2 text-center font-black text-green-800 bg-green-50">
                    {totalEvaluatedCount > 0 ? Math.round((totalSumOfTotals / (totalEvaluatedCount * 4)) * 100) : 0}%
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
        {sortedReportData.length === 0 && (
          <div className="p-8 text-center text-slate-500 font-bold bg-white border border-t-0 border-slate-200">
            لا توجد تقارير مطابقة للخيارات المحددة
          </div>
        )}

        <div className="mt-4 flex items-center justify-between font-bold text-slate-600 bg-slate-50 p-4 border border-slate-200 rounded-xl">
          <div>
            اسم المشرف التربوي: <span className="text-blue-600">{currentUser?.name}</span>
          </div>
          <div>
            إدارة المدرسة: <span className="text-blue-600">{selectedSchool}</span>
          </div>
        </div>
      </div>
    );
  };

  const handleExportExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("التقرير الختامي", { views: [{ rightToLeft: true }] });

      const profile = data.profiles?.[selectedSchool] || data.profile;
      
      // Total columns: 6 fixed + criteriaList.length + 2 totals
      const totalColsCount = 8 + criteriaList.length;

      sheet.mergeCells(1, 1, 6, 3);
      sheet.getCell(1, 1).value = `الجمهـورية اليمنية\n${profile?.ministry || 'وزارة التربية والتعـليم والبحث العلمي'}\nمكتب التربية والتعليم بالأمانة\n${profile?.district || 'مكتب التربية والتعليم بمنطقة شعوب'}\nاسم المدرسة: ${selectedSchool}\nفرع المدرسة: ${filterBranch === 'all' ? 'جميع الفروع' : filterBranch}`;
      sheet.getCell(1, 1).alignment = { wrapText: true, horizontal: "right", vertical: "top" };
      sheet.getCell(1, 1).font = { bold: true, size: 10 };

      // Add English text on the left
      const lastColIndex = totalColsCount > 3 ? totalColsCount - 2 : totalColsCount;
      sheet.mergeCells(1, lastColIndex, 6, totalColsCount);
      sheet.getCell(1, lastColIndex).value = "Republic of Yemen\nMinistry of Education";
      sheet.getCell(1, lastColIndex).alignment = { wrapText: true, horizontal: "left", vertical: "top" };
      sheet.getCell(1, lastColIndex).font = { bold: true, size: 10 };

      // Title and Optional Logo in the Center
      const middleCol = Math.floor(totalColsCount / 2);
      const titleStartCol = Math.max(4, middleCol - 1);
      const titleEndCol = Math.min(lastColIndex - 1, middleCol + 1);

      // Merge and write the Title: "التقارير الختامية للزيارة الصفية"
      sheet.mergeCells(4, titleStartCol, 6, titleEndCol);
      const titleCell = sheet.getCell(4, titleStartCol);
      titleCell.value = "التقارير الختامية للزيارة الصفية";
      titleCell.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
      titleCell.font = { bold: true, name: 'Arial', size: 12, color: { argb: 'FF1E40AF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F7FF' }
      };

      if (profile?.logoImg && profile.logoImg.startsWith('data:image')) {
        try {
          sheet.mergeCells(1, titleStartCol, 3, titleEndCol);
          const imageId = workbook.addImage({
            base64: profile.logoImg.split(',')[1],
            extension: 'png',
          });
          const startColLetter = String.fromCharCode(65 + titleStartCol - 1);
          const endColLetter = String.fromCharCode(65 + titleEndCol - 1);
          sheet.addImage(imageId, `${startColLetter}1:${endColLetter}3`);
        } catch(e) {
          console.error("Error adding logo", e);
        }
      }

      for (let i = 0; i < 5; i++) {
         sheet.addRow([]);
      }

      const headerRow = sheet.addRow([
        "الرقم",
        "اسم المعلم",
        "المادة",
        "الصف",
        "الفصل الدراسي",
        "الفرع",
        "التاريخ",
        ...criteriaList,
        "المجموع",
        "النسبة %"
      ]);

      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.eachCell((cell) => {
         cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } }; // Medium blue header
         cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      });

      let rowIndex = headerRow.number + 1;
      const dataStartRow = rowIndex;
      let grandTotalScores = 0;
      let grandEvalCount = 0;

      const getColLetter = (colIndex: number) => {
        let letter = '';
        while (colIndex > 0) {
          let mod = (colIndex - 1) % 26;
          letter = String.fromCharCode(65 + mod) + letter;
          colIndex = Math.floor((colIndex - mod) / 26);
        }
        return letter;
      };

      sortedReportData.forEach((t, idx) => {
        let totalScore = 0;
        let evaluatedCount = 0;
        
        const rowData = [
          idx + 1,
          t.teacherName,
          t.subject,
          t.className,
          t.semester,
          t.branch,
          t.date || "-",
        ];
        
        const scoreCells: number[] = [];

        criteriaList.forEach((crit) => {
          const cellData = t.scores[crit];
          const avg = cellData ? cellData.total / cellData.count : 0;
          if (cellData) {
            totalScore += avg;
            evaluatedCount++;
          }
          rowData.push(cellData ? (Number.isInteger(avg) ? avg : Number(avg.toFixed(1))) : "-");
          scoreCells.push(avg);
        });

        // Add to grand totals
        grandTotalScores += totalScore;
        grandEvalCount += evaluatedCount;

        const startColLetter = 'H';
        const endColLetter = getColLetter(7 + criteriaList.length);
        const sumFormula = `SUM(${startColLetter}${rowIndex}:${endColLetter}${rowIndex})`;
        const countFormula = `COUNT(${startColLetter}${rowIndex}:${endColLetter}${rowIndex})`;
        const percentFormula = `IFERROR((${sumFormula})/(${countFormula}*4), 0)`;

        rowData.push({ formula: sumFormula, result: Number.isInteger(totalScore) ? totalScore : Number(totalScore.toFixed(1)) });
        rowData.push({ formula: percentFormula, result: evaluatedCount > 0 ? (totalScore / (evaluatedCount * 4)) : 0 });

        const row = sheet.addRow(rowData);
        row.eachCell((cell, colNumber) => {
           cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
           if (colNumber > 7 && colNumber <= 7 + criteriaList.length) {
              const avg = scoreCells[colNumber - 8];
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: getHexColor(avg) } };
           }
           if (colNumber === 7 + criteriaList.length + 2) {
              cell.numFmt = '0%';
           }
        });
        rowIndex++;
      });

      // Calculate column sums and counts for Excel statistics
      const colSums = criteriaList.map(() => 0);
      const colCounts = criteriaList.map(() => 0);
      let totalSumOfTotals = 0;
      let totalEvaluatedCount = 0;

      sortedReportData.forEach((t) => {
        let teacherTotal = 0;
        let teacherCount = 0;
        criteriaList.forEach((crit, cIdx) => {
          const cellData = t.scores[crit];
          if (cellData) {
            const avg = cellData.total / cellData.count;
            teacherTotal += avg;
            teacherCount++;
            colSums[cIdx] += avg;
            colCounts[cIdx] += 1;
          }
        });
        totalSumOfTotals += teacherTotal;
        totalEvaluatedCount += teacherCount;
      });

      if (sortedReportData.length > 0) {
        // "المجموع" Row
        const sumRowData: any[] = [
          "المجموع",
          "", "", "", "", "", ""
        ];
        
        criteriaList.forEach((_, cIdx) => {
          const colLetter = getColLetter(8 + cIdx);
          const sum = colSums[cIdx];
          sumRowData.push({ formula: `SUM(${colLetter}${dataStartRow}:${colLetter}${rowIndex - 1})`, result: colCounts[cIdx] > 0 ? (Number.isInteger(sum) ? sum : Number(sum.toFixed(1))) : "-" });
        });

        const totalColLetter = getColLetter(8 + criteriaList.length);
        sumRowData.push({ formula: `SUM(${totalColLetter}${dataStartRow}:${totalColLetter}${rowIndex - 1})`, result: Number.isInteger(totalSumOfTotals) ? totalSumOfTotals : Number(totalSumOfTotals.toFixed(1)) });

        const allScoresStart = `H${dataStartRow}`;
        const allScoresEnd = `${getColLetter(7 + criteriaList.length)}${rowIndex - 1}`;
        sumRowData.push({ formula: `IFERROR(${totalColLetter}${rowIndex}/(COUNT(${allScoresStart}:${allScoresEnd})*4), 0)`, result: totalEvaluatedCount > 0 ? (totalSumOfTotals / (totalEvaluatedCount * 4)) : 0 });

        const sumRow = sheet.addRow(sumRowData);
        sumRow.font = { bold: true };
        sumRow.eachCell((cell, colNumber) => {
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }; // Light gray background
          if (colNumber === 7 + criteriaList.length + 2) {
             cell.numFmt = '0%';
          }
        });
        sheet.mergeCells(`A${rowIndex}:G${rowIndex}`);
        rowIndex++;

        // "النسبة %" Row
        const percentRowData: any[] = [
          "النسبة %",
          "", "", "", "", "", ""
        ];
        
        criteriaList.forEach((_, cIdx) => {
          const colLetter = getColLetter(8 + cIdx);
          const count = colCounts[cIdx];
          const sum = colSums[cIdx];
          const percentage = count > 0 ? (sum / (count * 4)) : 0;
          percentRowData.push({ formula: `IFERROR(${colLetter}${rowIndex - 1}/(COUNT(${colLetter}${dataStartRow}:${colLetter}${rowIndex - 2})*4), 0)`, result: count > 0 ? percentage : 0 });
        });

        percentRowData.push({ formula: `IFERROR(${totalColLetter}${rowIndex - 1}/(COUNT(${allScoresStart}:${allScoresEnd})*4), 0)`, result: totalEvaluatedCount > 0 ? (totalSumOfTotals / (totalEvaluatedCount * 4)) : 0 });
        percentRowData.push({ formula: `IFERROR(${totalColLetter}${rowIndex - 1}/(COUNT(${allScoresStart}:${allScoresEnd})*4), 0)`, result: totalEvaluatedCount > 0 ? (totalSumOfTotals / (totalEvaluatedCount * 4)) : 0 });
        const percentRow = sheet.addRow(percentRowData);
        percentRow.font = { bold: true };
        percentRow.eachCell((cell, colNumber) => {
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }; // Light gray background
          if (colNumber > 7) {
             cell.numFmt = '0%';
          }
        });
        sheet.mergeCells(`A${rowIndex}:G${rowIndex}`);
        rowIndex++;
      } else {
        // Fallback row if no data is found
        const emptyStatsRow = sheet.addRow([
          "المجموع",
          "", "", "", "", "", "",
          ...criteriaList.map(() => "-"),
          "-",
          "-"
        ]);
        emptyStatsRow.font = { bold: true };
        emptyStatsRow.eachCell((cell) => {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        });
        sheet.mergeCells(`A${rowIndex}:G${rowIndex}`);
        rowIndex++;
      }

      sheet.addRow([]);
      const footerRow = sheet.addRow([]);
      
      // Swapping signatures as per requirement 5: Reporter (compiler) on the right, Manager on the left
      footerRow.getCell(1).value = "مدون التقرير (المشرف):";
      footerRow.getCell(2).value = currentUser?.name || "";
      
      const totalColsCountExport = 9 + criteriaList.length;
      footerRow.getCell(totalColsCountExport > 2 ? totalColsCountExport - 1 : 3).value = "مدير الفرع:";
      footerRow.getCell(totalColsCountExport > 1 ? totalColsCountExport : 4).value = profile?.branchManager || "";

      sheet.columns.forEach((column, i) => {
        const colIdx = i + 1; // 1-based index
        if (colIdx === 2) {
          column.width = 25;
        } else if (colIdx > 7 && colIdx <= 7 + criteriaList.length) {
          column.width = 15;
        } else {
          column.width = 12;
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `التقارير_الختامية_${selectedSchool}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء تصدير الإكسل");
    }
  };

  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [waSelectedTeachers, setWaSelectedTeachers] = useState<string[]>([]);
  const [waSelectedCriteria, setWaSelectedCriteria] = useState<string[]>([]);

  useEffect(() => {
    setWaSelectedTeachers(Object.values(aggregatedData).map(t => t.teacherId || t.teacherName));
    setWaSelectedCriteria(criteriaList);
  }, [aggregatedData, criteriaList]);

  const handleConfirmWhatsapp = () => {
    let msg = `*التقارير الختامية للمشرف التربوي*\n`;
    msg += `المدرسة: ${selectedSchool}\n`;
    msg += `نوع التقييم: ${filterEvalType === 'short' ? 'تقرير مختصر' : filterEvalType === 'ext' ? 'تقرير موسع' : 'تقرير حسب المادة'}\n\n`;

    Object.values(aggregatedData).forEach(t => {
      const tId = t.teacherId || t.teacherName;
      if (!waSelectedTeachers.includes(tId)) return;

      msg += `👤 *المعلم:* ${t.teacherName} | المادة: ${t.subject}\n`;
      let totalScore = 0;
      let evaluatedCount = 0;
      
      criteriaList.forEach(crit => {
        const cellData = t.scores[crit];
        const avg = cellData ? cellData.total / cellData.count : 0;
        if (cellData) {
          totalScore += avg;
          evaluatedCount++;
        }
        
        if (waSelectedCriteria.includes(crit)) {
          let indicator = '🟢';
          if (avg < 1.5) indicator = '🔴';
          else if (avg < 2.5) indicator = '🟠';
          else if (avg < 3.5) indicator = '🟡';
          msg += `${indicator} ${crit}: ${cellData ? (Number.isInteger(avg) ? avg : avg.toFixed(1)) : '-'}\n`;
        }
      });
      msg += `📊 المجموع: ${Number.isInteger(totalScore) ? totalScore : totalScore.toFixed(1)} | النسبة: ${evaluatedCount > 0 ? Math.round((totalScore/(evaluatedCount * 4))*100) : 0}%\n\n`;
    });

    msg += `\n${getReportMessageFooter()}`;
    shareViaWhatsApp(msg);
    setShowWhatsappModal(false);
  };

  const handleWhatsapp = () => {
    setShowWhatsappModal(true);
  };

  return (
    <div className="animate-in fade-in space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-bold"
      >
        <ArrowRight size={20} /> العودة للقائمة
      </button>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <Filter className="text-blue-600" />
          <h2 className="text-xl font-bold text-slate-800">فلترة التقارير الختامية</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schoolBranches.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">الفرع</label>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none"
              >
                <option value="all">جميع الفروع</option>
                {schoolBranches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">نوع التقييم</label>
            <select
              value={filterEvalType}
              onChange={(e) => setFilterEvalType(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none"
            >
              <option value="all">جميع التقييمات</option>
              <option value="short">التقييم المختصر</option>
              <option value="ext">التقييم الموسع</option>
              <option value="subject">التقييم حسب المادة</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">المعلم</label>
            <select
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none"
            >
              <option value="all">جميع المعلمين</option>
              {uniqueTeachers.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">المادة</label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none"
            >
              <option value="all">جميع المواد</option>
              {uniqueSubjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {uniqueEvaluators.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">المشرف التربوي</label>
              <select
                value={filterEvaluator}
                onChange={(e) => setFilterEvaluator(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none"
              >
                <option value="all">جميع المشرفين</option>
                {uniqueEvaluators.map((ev) => (
                  <option key={ev as string} value={ev as string}>{ev as string}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">درجة الزيارات</label>
            <select
              value={filterVisitType}
              onChange={(e) => setFilterVisitType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none"
            >
              <option value="all">جميع الزيارات</option>
              <option value="استطلاعية">استطلاعية</option>
              <option value="تشخيصية">تشخيصية</option>
              <option value="توجيهية">توجيهية</option>
              <option value="تقييمية">تقييمية</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">الفصل الدراسي</label>
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none"
            >
              <option value="all">الأول والثاني</option>
              <option value="الفصل الأول">الفصل الأول</option>
              <option value="الفصل الثاني">الفصل الثاني</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">من تاريخ</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">إلى تاريخ</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-6 pt-6 col-span-full border-t border-slate-100">
            <label className="flex items-center gap-2 font-bold text-slate-700 select-none cursor-pointer">
              <input 
                type="checkbox" 
                checked={onlyVisited}
                onChange={(e) => setOnlyVisited(e.target.checked)}
                className="w-5 h-5 accent-blue-600 rounded"
              />
              <span>من تمت زيارتهم فقط</span>
            </label>

            <label className="flex items-center gap-2 font-bold text-slate-700 select-none cursor-pointer">
              <input 
                type="checkbox" 
                checked={mergeVisits}
                onChange={(e) => setMergeVisits(e.target.checked)}
                className="w-5 h-5 accent-blue-600 rounded"
              />
              <span>دمج الزيارات المتعددة</span>
            </label>

            <label className="flex items-center gap-2 font-bold text-slate-700 select-none cursor-pointer">
              <input 
                type="checkbox" 
                id="colorVisuals"
                checked={useColorVisuals}
                onChange={(e) => setUseColorVisuals(e.target.checked)}
                className="w-5 h-5 accent-blue-600 rounded"
              />
              <span>تلوين الحقول بصرياً (حسب التقييم)</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-800">بيانات التقرير</h3>
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold transition-all text-sm shadow-md"
            >
              <Download size={16} /> تصدير إكسل
            </button>
            <button
              onClick={handleWhatsapp}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold transition-all text-sm shadow-md"
            >
              <Share2 size={16} /> إرسال عبر واتساب
            </button>
          </div>
        </div>
        {renderTable()}
      </div>

      {showWhatsappModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Share2 className="text-green-500" /> إرسال التقارير عبر واتساب
              </h2>
              <button onClick={() => setShowWhatsappModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6 flex flex-col">
              <div className="flex-1 border p-4 rounded-xl border-slate-200 bg-slate-50">
                <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">اختر المعلمين للإرسال</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.values(aggregatedData).map(t => {
                    const tId = t.teacherId || t.teacherName;
                    const checked = waSelectedTeachers.includes(tId);
                    return (
                      <label key={tId} className="flex flex-row-reverse items-center justify-end gap-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                        <span className="font-semibold text-slate-700">{t.teacherName}</span>
                        <input 
                          type="checkbox" 
                          checked={checked} 
                          onChange={(e) => {
                            if (e.target.checked) setWaSelectedTeachers([...waSelectedTeachers, tId]);
                            else setWaSelectedTeachers(waSelectedTeachers.filter(id => id !== tId));
                          }}
                          className="w-5 h-5 accent-green-600 rounded"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 border p-4 rounded-xl border-slate-200 bg-slate-50">
                <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">اختر المعايير المراد تضمينها</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {criteriaList.map(crit => {
                    const checked = waSelectedCriteria.includes(crit);
                    return (
                      <label key={crit} className="flex flex-row-reverse items-center justify-end gap-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                        <span className="font-semibold text-slate-700">{crit}</span>
                        <input 
                          type="checkbox" 
                          checked={checked} 
                          onChange={(e) => {
                            if (e.target.checked) setWaSelectedCriteria([...waSelectedCriteria, crit]);
                            else setWaSelectedCriteria(waSelectedCriteria.filter(c => c !== crit));
                          }}
                          className="w-5 h-5 accent-green-600 rounded"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-4 rounded-b-2xl">
              <button 
                onClick={() => setShowWhatsappModal(false)}
                className="px-6 py-3 rounded-xl font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={handleConfirmWhatsapp}
                className="px-6 py-3 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center gap-2 shadow-lg"
              >
                <Share2 size={20} /> اعتماد وإرسال
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
