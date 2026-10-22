import React, { useState, useEffect } from 'react';
import { Save, Plus, ArrowRight, Trash2, Settings, ListChecks, X } from 'lucide-react';
import { useGlobal } from '../context/GlobalState';
import { shortCriteriaBlocks as defaultShort, extCriteriaBlocks as defaultExt } from './evaluationUtils';
import { subjectSkills as defaultSubject } from './subjectSkills';

export function SupervisionCriteriaControl({ onClose }: { onClose: () => void }) {
  const { data, currentUser, updateData } = useGlobal();
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [activeArea, setActiveArea] = useState<'short' | 'ext' | 'subject' | null>(null);
  const [selectedSubjectBranch, setSelectedSubjectBranch] = useState<{subject:string, branch:string} | null>(null);

  // Local state for the forms editing
  const [editShort, setEditShort] = useState(JSON.parse(JSON.stringify(defaultShort)));
  const [editExt, setEditExt] = useState(JSON.parse(JSON.stringify(defaultExt)));
  const [editSubjectSkills, setEditSubjectSkills] = useState(JSON.parse(JSON.stringify(defaultSubject)));

  // Load from existing config if exactly one school/branch combination is selected and a match exists
  useEffect(() => {
    if (selectedSchools.length === 1 && selectedBranches.length === 1) {
      const config = data.customSupervisionCriteria?.find(
        (c: any) => c.school === selectedSchools[0] && c.branch === selectedBranches[0]
      );
      if (config) {
        if (config.shortCriteriaBlocks) setEditShort(JSON.parse(JSON.stringify(config.shortCriteriaBlocks)));
        if (config.extCriteriaBlocks) setEditExt(JSON.parse(JSON.stringify(config.extCriteriaBlocks)));
        if (config.subjectSkills) setEditSubjectSkills(JSON.parse(JSON.stringify(config.subjectSkills)));
        return;
      }
    }
    // Default fallback if not found or multiple selected
    setEditShort(JSON.parse(JSON.stringify(defaultShort)));
    setEditExt(JSON.parse(JSON.stringify(defaultExt)));
    setEditSubjectSkills(JSON.parse(JSON.stringify(defaultSubject)));
  }, [selectedSchools, selectedBranches, data.customSupervisionCriteria]);

  const availableSchools = currentUser?.schools.includes('all') ? data.availableSchools : currentUser?.schools;

  const getAvailableBranches = () => {
    let allBranches: string[] = [];

    selectedSchools.forEach(school => {
      if (currentUser?.permissions?.all) {
        const branches = data.schoolBranches?.[school];
        if (Array.isArray(branches) && branches.length > 0) {
          allBranches.push(...branches);
        } else {
          allBranches.push('بنين', 'بنات');
        }
      } else {
        const branchesForSchool = currentUser?.permissions?.schoolsAndBranches?.[school];
        if (Array.isArray(branchesForSchool) && branchesForSchool.length > 0) {
          allBranches.push(...branchesForSchool);
        }
      }
    });

    return [...new Set(allBranches)];
  };

  useEffect(() => {
    const validBranches = getAvailableBranches();
    if (selectedBranches.some(b => !validBranches.includes(b))) {
      setSelectedBranches(selectedBranches.filter(b => validBranches.includes(b)));
    }
  }, [selectedSchools, data.schoolBranches, currentUser?.permissions]);
  
  const handleSaveAndBroadcast = () => {
    if (selectedSchools.length === 0 || selectedBranches.length === 0) {
      alert('يجب اختيار مدرسة وفرع واحد على الأقل');
      return;
    }

    const currentConfigs = data.customSupervisionCriteria || [];
    let newConfigs = [...currentConfigs];

    selectedSchools.forEach(school => {
      selectedBranches.forEach(branch => {
        const id = `${school}_${branch}`;
        const existingIdx = newConfigs.findIndex((c: any) => c.id === id);
        
        const updatedConfig = {
          id,
          school,
          branch,
          shortCriteriaBlocks: editShort,
          extCriteriaBlocks: editExt,
          subjectSkills: editSubjectSkills
        };

        if (existingIdx >= 0) {
          newConfigs[existingIdx] = updatedConfig;
        } else {
          newConfigs.push(updatedConfig);
        }
      });
    });

    updateData({ customSupervisionCriteria: newConfigs }, selectedSchools);
    alert('تم تغيير وتعميم المعايير بنجاح!');
    onClose();
  };


  const SchoolBranchSelection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-200">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-3">المدارس المستهدفة</label>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {availableSchools?.map((school, idx) => (
            <label key={`school-${school}-${idx}`} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={selectedSchools.includes(school)}
                onChange={(e) => {
                  if (e.target.checked) setSelectedSchools([...selectedSchools, school]);
                  else setSelectedSchools(selectedSchools.filter(s => s !== school));
                }}
                className="w-5 h-5 text-indigo-600 rounded"
              />
              <span className="font-semibold text-slate-700">{school}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-3">الفروع المستهدفة</label>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {getAvailableBranches().map((branch, idx) => {
            return (
              <label key={`branch-${branch}-${idx}`} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedBranches.includes(branch)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedBranches([...selectedBranches, branch]);
                    else setSelectedBranches(selectedBranches.filter(b => b !== branch));
                  }}
                  className="w-5 h-5 text-indigo-600 rounded"
                />
                <span className="font-semibold text-slate-700">{branch}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderBlocksEditor = (blocks: any[], setBlocks: (b: any[]) => void) => (
    <div className="space-y-6">
      {blocks.map((block, bIdx) => (
        <div key={bIdx} className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
            <input 
              type="text" 
              value={block.title}
              onChange={(e) => {
                const newB = [...blocks];
                newB[bIdx].title = e.target.value;
                setBlocks(newB);
              }}
              className="font-bold text-lg text-slate-800 bg-white border border-slate-300 rounded px-3 py-1 w-2/3"
            />
            <button 
              onClick={() => {
                const newB = [...blocks];
                newB.splice(bIdx, 1);
                setBlocks(newB);
              }}
              className="text-red-500 hover:text-red-700 p-2"
            >
              <Trash2 size={20} />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {block.items.map((item: string, iIdx: number) => (
              <div key={iIdx} className="flex items-center gap-3">
                <input 
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newB = [...blocks];
                    newB[bIdx].items[iIdx] = e.target.value;
                    setBlocks(newB);
                  }}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded p-2 text-slate-700"
                />
                <button 
                  onClick={() => {
                    const newB = [...blocks];
                    newB[bIdx].items.splice(iIdx, 1);
                    setBlocks(newB);
                  }}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <button 
              onClick={() => {
                const newB = [...blocks];
                newB[bIdx].items.push('معيار جديد');
                setBlocks(newB);
              }}
              className="flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 mt-2 px-2 py-1 rounded hover:bg-indigo-50"
            >
              <Plus size={18} /> إضافة معيار
            </button>
          </div>
        </div>
      ))}
      <button 
        onClick={() => {
          const newB = [...blocks];
          newB.push({ title: 'مجال جديد', items: ['معيار جديد'] });
          setBlocks(newB);
        }}
        className="w-full py-4 border-2 border-dashed border-indigo-300 rounded-2xl text-indigo-600 font-black hover:bg-indigo-50 hover:border-indigo-500 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={24} /> إضافة مجال تقييم كامل
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-cairo" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-indigo-700 to-indigo-500 p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4 text-white">
            <div className="bg-white/20 p-3 rounded-2xl">
              <Settings size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black">التحكم بمعايير الإشراف التربوي</h2>
              <p className="text-indigo-100 font-medium opacity-90">إدارة شاملة لمعايير التقييم وتعميمها</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-slate-50 flex flex-col gap-8">
          
          <SchoolBranchSelection />

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b-2 border-indigo-100 pb-4">
              <ListChecks className="text-indigo-600" /> مجال الزيارات المستهدف بالتعديل
            </h3>
            
            <div className="flex flex-wrap gap-4 mb-8">
              {[
                { id: 'short', label: 'تقييم مختصر', icon: <ArrowRight size={18} /> },
                { id: 'ext', label: 'تقييم موسع', icon: <ArrowRight size={18} /> },
                { id: 'subject', label: 'تقييم حسب المادة', icon: <ArrowRight size={18} /> },
              ].map(area => (
                <button
                  key={area.id}
                  onClick={() => {
                    setActiveArea(area.id as any);
                    setSelectedSubjectBranch(null);
                  }}
                  className={`flex-1 min-w-[200px] py-4 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-3 border-2 ${
                    activeArea === area.id 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm ring-2 ring-indigo-600/20' 
                      : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  {area.label} {activeArea === area.id && area.icon}
                </button>
              ))}
            </div>

            {activeArea === 'subject' && (
              <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="text-lg font-bold text-slate-800 mb-4">اختر مادة وفرع لتعديل معاييرها</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(editSubjectSkills).map(([subj, branches]: [string, any]) => (
                    <div key={subj} className="bg-white p-4 rounded-xl border border-slate-200">
                      <div className="font-bold text-slate-700 mb-3 border-b pb-2">{subj}</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(branches).map(br => (
                          <button
                            key={br}
                            onClick={() => setSelectedSubjectBranch({subject: subj, branch: br})}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                              selectedSubjectBranch?.subject === subj && selectedSubjectBranch?.branch === br
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {br}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              {activeArea === 'short' && renderBlocksEditor(editShort, setEditShort)}
              {activeArea === 'ext' && renderBlocksEditor(editExt, setEditExt)}
              
              {activeArea === 'subject' && selectedSubjectBranch && (
                <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-3">
                    <span className="font-black text-lg text-indigo-700">{selectedSubjectBranch.subject}</span>
                    <ArrowRight className="text-slate-400" size={16} />
                    <span className="font-bold text-slate-600">{selectedSubjectBranch.branch}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {editSubjectSkills[selectedSubjectBranch.subject][selectedSubjectBranch.branch].map((item: string, iIdx: number) => (
                      <div key={iIdx} className="flex items-center gap-3">
                        <input 
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const newSkills = { ...editSubjectSkills };
                            newSkills[selectedSubjectBranch.subject][selectedSubjectBranch.branch][iIdx] = e.target.value;
                            setEditSubjectSkills(newSkills);
                          }}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded p-2 text-slate-700"
                        />
                        <button 
                          onClick={() => {
                            const newSkills = { ...editSubjectSkills };
                            newSkills[selectedSubjectBranch.subject][selectedSubjectBranch.branch].splice(iIdx, 1);
                            setEditSubjectSkills(newSkills);
                          }}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const newSkills = { ...editSubjectSkills };
                        newSkills[selectedSubjectBranch.subject][selectedSubjectBranch.branch].push('معيار جديد');
                        setEditSubjectSkills(newSkills);
                      }}
                      className="flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 mt-4 px-2 py-1 rounded hover:bg-indigo-50"
                    >
                      <Plus size={18} /> إضافة معيار للمادة والفرع
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-white border-t border-slate-200 p-6 shrink-0 flex justify-end">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              إلغاء التعديلات
            </button>
            <button 
              onClick={handleSaveAndBroadcast}
              className="px-8 py-3 rounded-xl font-black bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center gap-2"
            >
              <Save size={20} />
              تغيير وتعميم المعايير
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}