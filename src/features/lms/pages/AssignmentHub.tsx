import React, { useState } from 'react';
import { 
  Users, Building2, UserPlus, Calendar, ShieldCheck, 
  Search, Filter, CheckCircle2, AlertCircle, ArrowRight,
  BookOpen, Layers, Send, Trash2, Edit
} from 'lucide-react';
import { useCourses, useLearningPaths } from '../api/lmsApi';
import { getDepartments } from '@/features/organization/services/departments';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { useEmployees } from '@/features/employees/hooks/useEmployees';
import { StandardDatePicker } from '@/shared/components/ui/StandardDatePicker';

export const AssignmentHub: React.FC = () => {
  const [selectedSource, setSelectedSource] = useState<'COURSE' | 'PATH'>('COURSE');
  const [selectedTarget, setSelectedTarget] = useState<'INDIVIDUAL' | 'TEAM' | 'DEPARTMENT'>('INDIVIDUAL');
  const [step, setStep] = useState(1);
  
  const { data: courses } = useCourses();
  const { data: learningPaths = [] } = useLearningPaths();
  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: getDepartments });
  const { employees, isLoading: loadingEmployees } = useEmployees();

  // Selected items state
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedTargetIds, setSelectedTargetIds] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  const handleAssign = () => {
    // API call would go here
    console.log('Assigning...', { selectedItemId, selectedTargetIds, dueDate, priority, type: selectedSource });
    setStep(3); // Success step
  };

  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <h3 className="text-lg font-bold text-foreground">Step 1: Select Training Content</h3>
        <p className="text-xs text-muted-foreground font-medium">Choose a course or learning path to assign.</p>
      </div>

      <div className="flex gap-4 p-1 bg-muted rounded-lg w-fit">
        <button 
          onClick={() => { setSelectedSource('COURSE'); setSelectedItemId(null); }}
          className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${selectedSource === 'COURSE' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-gray-600'}`}
        >
          <div className="flex items-center gap-2"><BookOpen size={14} /> Individual Course</div>
        </button>
        <button 
          onClick={() => { setSelectedSource('PATH'); setSelectedItemId(null); }}
          className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${selectedSource === 'PATH' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-gray-600'}`}
        >
          <div className="flex items-center gap-2"><Layers size={14} /> Learning Path</div>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(selectedSource === 'COURSE' ? courses : learningPaths)?.map((item: any) => (
          <div 
            key={item.id}
            onClick={() => setSelectedItemId(item.id)}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedItemId === item.id ? 'border-primary bg-primary/10/50' : 'border-border bg-card hover:border-border shadow-sm'}`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">{item.title}</p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {selectedSource === 'COURSE' ? `${item.modules_count || 0} Modules` : `${item.courses?.length || 0} Courses`}
                </p>
              </div>
              {selectedItemId === item.id && <CheckCircle2 size={16} className="text-primary" />}
            </div>
          </div>
        ))}
      </div>

      {selectedItemId && (
        <div className="flex justify-end pt-4">
          <Button onClick={() => setStep(2)} className="bg-primary hover:bg-primary/95 font-bold px-8 rounded-lg flex items-center gap-2 group">
            Continue to Targets <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Step 2: Define Audience & Schedule</h3>
          <p className="text-xs text-muted-foreground font-medium">Select who will receive this training.</p>
        </div>
        <Button variant="ghost" onClick={() => setStep(1)} className="text-muted-foreground font-bold text-xs hover:text-gray-600">Back to Step 1</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex gap-4 p-1 bg-muted rounded-lg w-fit">
            {[
              { id: 'INDIVIDUAL', label: 'Individuals', icon: <Users size={14} /> },
              { id: 'TEAM', label: 'Teams', icon: <ShieldCheck size={14} /> },
              { id: 'DEPARTMENT', label: 'Departments', icon: <Building2 size={14} /> },
            ].map(t => (
              <button 
                key={t.id}
                onClick={() => setSelectedTarget(t.id as any)}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${selectedTarget === t.id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-gray-600'}`}
              >
                <div className="flex items-center gap-2">{t.icon} {t.label}</div>
              </button>
            ))}
          </div>

          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
             <div className="p-4 border-b border-gray-50 bg-muted/50">
                <div className="relative">
                   <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                   <input 
                      type="text" 
                      placeholder={`Search ${selectedTarget.toLowerCase()}s...`}
                      className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                   />
                </div>
             </div>
              <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                {selectedTarget === 'DEPARTMENT' && (departments || []).map((item: any) => (
                   <div 
                     key={item.id}
                     onClick={() => {
                        setSelectedTargetIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
                     }}
                     className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${selectedTargetIds.includes(item.id) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                   >
                      <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedTargetIds.includes(item.id) ? 'bg-card text-primary shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                            <Building2 size={14} />
                         </div>
                         <span className="text-xs font-bold">{item.department_name}</span>
                      </div>
                      {selectedTargetIds.includes(item.id) && <CheckCircle2 size={16} />}
                   </div>
                ))}

                {selectedTarget === 'INDIVIDUAL' && (employees || []).map((item: any) => (
                   <div 
                     key={item.id}
                     onClick={() => {
                        setSelectedTargetIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
                     }}
                     className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${selectedTargetIds.includes(item.id) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                   >
                      <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] ${selectedTargetIds.includes(item.id) ? 'bg-card text-primary shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                            {(item.first_name?.[0] || 'U')}{(item.last_name?.[0] || 'U')}
                         </div>
                         <div className="flex flex-col">
                            <span className="text-xs font-bold">{item.first_name || 'Unknown'} {item.last_name || 'User'}</span>
                            <span className="text-[10px] text-muted-foreground font-medium">{item.department?.department_name || 'General'}</span>
                         </div>
                      </div>
                      {selectedTargetIds.includes(item.id) && <CheckCircle2 size={16} />}
                   </div>
                ))}

                {selectedTarget === 'TEAM' && (
                   <div className="p-8 text-center text-muted-foreground">
                      <ShieldCheck size={32} className="mx-auto mb-2 opacity-20" />
                      <p className="text-[10px] font-bold  tracking-widest">Connect HRMS Team Service to view active groups</p>
                   </div>
                )}
             </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
           <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-5">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-muted-foreground  tracking-widest">Assignment Deadline</label>
                  <div className="relative">
                     <StandardDatePicker 
                       value={dueDate}
                       onChange={setDueDate}
                     />
                  </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-muted-foreground  tracking-widest">Priority Level</label>
                 <div className="flex gap-2">
                    {['LOW', 'MEDIUM', 'URGENT'].map(p => (
                       <button 
                         key={p}
                         onClick={() => setPriority(p)}
                         className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${priority === p ? 'bg-primary text-white shadow-sm scale-105' : 'bg-muted text-muted-foreground hover:bg-muted'}`}
                       >
                         {p}
                       </button>
                    ))}
                 </div>
              </div>

              <div className="pt-4 border-t border-gray-50">
                 <Button 
                   disabled={selectedTargetIds.length === 0}
                   onClick={handleAssign}
                   className="w-full bg-primary hover:bg-primary/95 font-black h-11 rounded-lg shadow-sm shadow-primary-100 flex items-center justify-center gap-2"
                 >
                   <Send size={16} /> Deploy Training
                 </Button>
              </div>
           </div>
           
           <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex gap-3">
              <AlertCircle size={16} className="text-amber-500 shrink-0" />
              <p className="text-[10px] font-medium text-amber-700 leading-relaxed">
                 Automated reminders will be sent to <strong>{selectedTargetIds.length}</strong> recipients 3 days before the deadline.
              </p>
           </div>
        </div>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="py-20 flex flex-col items-center justify-center space-y-6 animate-in zoom-in duration-500">
       <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center shadow-sm shadow-emerald-100">
          <ShieldCheck size={40} />
       </div>
       <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-foreground">Assignment Deployed!</h2>
          <p className="text-sm text-muted-foreground font-medium max-w-sm">Training assets have been successfully assigned and notifications are being dispatched.</p>
       </div>
       <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep(1)} className="rounded-lg font-bold px-6 h-10 border-border">Assign More</Button>
          <Button onClick={() => window.location.href = '/lms/dashboard'} className="bg-gray-900 hover:bg-black text-white rounded-lg font-bold px-6 h-10 shadow-sm">Go to Analytics</Button>
       </div>
    </div>
  );

  return (
    <div className="space-y-4 font-poppins w-full max-w-full mx-auto px-0 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center justify-center shrink-0 text-primary">
            <UserPlus className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Assignment Hub</h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">Automate and manage organization-wide training delivery</p>
          </div>
        </div>
      </div>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderSuccess()}
    </div>
  );
};
