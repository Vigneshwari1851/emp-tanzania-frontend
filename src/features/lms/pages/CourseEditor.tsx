import React, { useState, useEffect, useRef } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import api from "@/shared/services/axiosInstance";
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { ChevronLeft, Save, Plus, Trash2, Video, FileText, Layout, Loader2, Upload, X, ImageIcon, Eye, BookOpen, Settings, PlayCircle, Sparkles, MonitorPlay, ChevronRight, Edit, TrendingUp, Clock, Award, Target, Radio, Copy, Building2, GripVertical } from 'lucide-react';
import { useCourse, useCreateCourse, useUpdateCourse, useDeleteCourse, useAddModule, useUpdateModule, useDeleteModule, useAddContent, useUpdateContent, useDeleteContent, useArchiveCourse, useDuplicateCourse } from '../api/lmsApi';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/Tabs";
import { toast } from 'sonner';
import { getAssetUrl } from '@/shared/utils/fileUtils';
import Select from "@/shared/components/ui/Select";

export const CourseEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useOrgNavigate();
  const isEditing = !!id;
  
  const { data: course, isLoading, refetch } = useCourse(parseInt(id || '0'));
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();
  const addModule = useAddModule();
  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();
  const addContent = useAddContent();
  const updateContent = useUpdateContent();
  const deleteContent = useDeleteContent();
  const archiveCourse = useArchiveCourse();
  const duplicateCourseMutation = useDuplicateCourse();
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [localModules, setLocalModules] = useState<any[]>([]);
  const [expandedLessonId, setExpandedLessonId] = useState<number | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseStatus, setCourseStatus] = useState('DRAFT');
  const [courseLevel, setCourseLevel] = useState('BEGINNER');
  const [courseType, setCourseType] = useState('TECHNICAL');
  const [courseDuration, setCourseDuration] = useState('');
  const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDesc, setModuleDesc] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState('VIDEO');
  const [lessonFile, setLessonFile] = useState<File | null>(null);
  const [lessonBody, setLessonBody] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingDuration, setMeetingDuration] = useState(60);
  const [meetingPlatform, setMeetingPlatform] = useState('ZOOM');
  const [lessonExistingUrl, setLessonExistingUrl] = useState('');
  const [curriculumType, setCurriculumType] = useState('VIDEO');
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [passingScore, setPassingScore] = useState(80);
  const [quizMaxAttempts, setQuizMaxAttempts] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [addingLessonToModuleId, setAddingLessonToModuleId] = useState<number | null>(null);
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'CONTENT' | 'SETTINGS' | 'ASSIGNMENTS'>('CONTENT');
  const [autoAssignRules, setAutoAssignRules] = useState<any>({
    department_ids: [],
    role_ids: [],
    locations: []
  });
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const toggleModule = (modId: number) => {
    const next = new Set(expandedModuleIds);
    if (next.has(modId)) next.delete(modId);
    else next.add(modId);
    setExpandedModuleIds(next);
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
    confirmText?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    if (course) {
      setCourseTitle(course.title);
      setCourseDescription(course.description || '');
      setCourseStatus(course.status);
      setCourseLevel(course.level || 'BEGINNER');
      setCourseType(course.course_type || 'TECHNICAL');
      setCourseDuration(course.duration || '');
      setLearningObjectives(course.learning_objectives ? JSON.parse(course.learning_objectives) : []);
      setThumbnailUrl(course.thumbnail_url || '');
      setCurriculumType(course.curriculum_type || 'VIDEO');
      setLocalModules(course.modules || []);
      if (course.auto_assign_rules) {
        try {
          setAutoAssignRules(typeof course.auto_assign_rules === 'string' ? JSON.parse(course.auto_assign_rules) : course.auto_assign_rules);
        } catch (e) { console.error("Error parsing auto-assign rules", e); }
      }
    }
  }, [course]);
  
  useEffect(() => {
    setLessonType(curriculumType);
  }, [curriculumType]);

  useEffect(() => {
    // Fetch departments and roles
    const fetchMetadata = async () => {
      try {
        const [deptRes, rolesRes] = await Promise.all([
          api.get('/departments'),
          api.get('/roles')
        ]);
        setDepartments(deptRes.data.data || []);
        setRoles(rolesRes.data.data || []);
      } catch (err) {
        console.error("Failed to fetch metadata", err);
      }
    };
    fetchMetadata();
  }, []);

  const confirmDelete = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      variant: 'danger',
      confirmText: 'Confirm Delete',
      onConfirm
    });
  };

  const handleStartEditLesson = (modId: number, lesson: any) => {
    setExpandedLessonId(lesson.id);
    setLessonTitle(lesson.title || '');
    setLessonType(lesson.content_type || 'VIDEO');
    setLessonExistingUrl(lesson.content_url || '');
    setLessonBody(lesson.content_body || '');
    setLessonFile(null);
    if (lesson.content_type === 'QUIZ' && lesson.content_body) {
      try {
        const parsed = JSON.parse(lesson.content_body);
        setQuizQuestions(parsed.questions || []);
        setPassingScore(parsed.passingScore || 80);
        setQuizMaxAttempts(parsed.maxAttempts || 0);
      } catch (e) {
        setQuizQuestions([]);
      }
    }
    if (lesson.content_type === 'LIVE_CLASS') {
      const config = lesson.meeting_config ? (typeof lesson.meeting_config === 'string' ? JSON.parse(lesson.meeting_config) : lesson.meeting_config) : {};
      setLessonBody(config.link || '');
      setMeetingDate(config.start_time || '');
      setMeetingDuration(config.duration || 60);
      setMeetingPlatform(config.platform || 'ZOOM');
    }
  };

  const executeSaveCourse = async () => {
    setConfirmModal(p => ({ ...p, isOpen: false }));
    const data: any = { 
      title: courseTitle, 
      description: courseDescription, 
      status: courseStatus,
      level: courseLevel,
      course_type: courseType,
      duration: courseDuration,
      learning_objectives: learningObjectives,
      curriculum_type: curriculumType,
      auto_assign_rules: autoAssignRules,
      modules: localModules 
    };
    if (thumbnailFile) data.thumbnail = thumbnailFile;
    else if (thumbnailUrl === '') data.thumbnail_url = null;

    try {
      if (isEditing) {
        await updateCourse.mutateAsync({ id: parseInt(id!), data });
        toast.success('Course updated');
      } else {
        const newC = await createCourse.mutateAsync(data);
        toast.success('Course created with curriculum');
        navigate(`/lms/courses/${newC.id}`);
      }
    } catch (e) { toast.error('Save failed'); }
  };

  const handleSaveCourse = () => {
    if (!courseTitle) return toast.error('Course title required');
    
    if (courseStatus === 'PUBLISHED') {
      setConfirmModal({
        isOpen: true,
        title: 'Publish Course?',
        message: 'Are you sure you want to publish this course? It will be immediately visible to all learners.',
        variant: 'primary',
        confirmText: 'Confirm & Publish',
        onConfirm: executeSaveCourse
      });
    } else {
      executeSaveCourse();
    }
  };

  const handleSaveLesson = async (lessonId?: number) => {
    if (!lessonTitle) return toast.error('Title required');
    const data: any = { 
      title: lessonTitle, 
      content_type: lessonType, 
      courseId: parseInt(id!) 
    };

    if (lessonType === 'TEXT') {
      data.content_body = lessonBody;
    } else if (lessonType === 'QUIZ') {
      data.content_body = JSON.stringify({
        questions: quizQuestions,
        passingScore,
        maxAttempts: quizMaxAttempts
      });
    } else if (lessonType === 'LIVE_CLASS') {
       data.meeting_config = JSON.stringify({
         link: lessonBody,
         platform: meetingPlatform,
         start_time: meetingDate || new Date().toISOString(),
         duration: meetingDuration
       });
    }

    if (lessonFile) data.content_file = lessonFile;

    try {
      if (lessonId) {
        await updateContent.mutateAsync({ courseId: parseInt(id!), contentId: lessonId, data });
        toast.success('Lesson updated');
      } else {
        const module = localModules.find((m: any) => m.id === addingLessonToModuleId);
        data.order = (module?.contents?.length || 0) + 1;
        await addContent.mutateAsync({ courseId: parseInt(id!), moduleId: addingLessonToModuleId!, data });
        toast.success('Lesson added');
      }
      refetch();
      setExpandedLessonId(null);
      setAddingLessonToModuleId(null);
      setLessonTitle('');
      setLessonBody('');
      setLessonFile(null);
      setQuizQuestions([]);
    } catch (e) { toast.error('Failed to save lesson'); }
  };

  const handleArchive = async () => {
    if (!id) return;
    try {
      await archiveCourse.mutateAsync(parseInt(id));
      toast.success('Course archived');
    } catch (err) {
      toast.error('Failed to archive course');
    }
  };

  const handleDuplicate = async () => {
    if (!id) return;
    try {
      const newC = await duplicateCourseMutation.mutateAsync(parseInt(id));
      toast.success('Course duplicated');
      navigate(`/lms/courses/${newC.id}`);
    } catch (err) {
      toast.error('Failed to duplicate course');
    }
  };

  const toggleAutoAssignRule = (type: 'department_ids' | 'role_ids', ruleId: number) => {
    const current = [...autoAssignRules[type]];
    const index = current.indexOf(ruleId);
    if (index > -1) current.splice(index, 1);
    else current.push(ruleId);
    setAutoAssignRules({ ...autoAssignRules, [type]: current });
  };

  const handleQuickAddModule = async () => {
    if (!moduleTitle.trim()) {
      setIsAddingModule(false);
      return;
    }
    
    if (!isEditing) {
      const newMod = { 
        id: Date.now(),
        title: moduleTitle, 
        description: moduleDesc,
        order: localModules.length + 1, 
        contents: [] 
      };
      setLocalModules([...localModules, newMod]);
      setModuleTitle('');
      setModuleDesc('');
      setIsAddingModule(false);
      return;
    }

    try {
      await addModule.mutateAsync({ 
        courseId: parseInt(id!), 
        title: moduleTitle, 
        description: moduleDesc,
        order: (localModules.length || 0) + 1 
      });
      toast.success('Section added');
      setModuleTitle('');
      setModuleDesc('');
      setIsAddingModule(false);
      refetch();
    } catch (e) { toast.error('Failed to add section'); }
  };

  const handleQuickAddLesson = async (moduleId: number) => {
    if (!lessonTitle.trim()) {
      setAddingLessonToModuleId(null);
      return;
    }

    if (!isEditing) {
      setLocalModules(localModules.map(m => {
        if (m.id === moduleId) {
          return {
            ...m,
            contents: [...(m.contents || []), {
              id: Date.now(),
              title: lessonTitle,
              content_type: curriculumType,
              order: (m.contents?.length || 0) + 1
            }]
          };
        }
        return m;
      }));
      setLessonTitle('');
      setAddingLessonToModuleId(null);
      return;
    }

    const module = localModules.find((m: any) => m.id === moduleId);
    const order = (module?.contents?.length || 0) + 1;

    try {
      await addContent.mutateAsync({ 
        moduleId, 
        courseId: parseInt(id!),
        title: lessonTitle,
        content_type: curriculumType,
        order
      });
      toast.success(`${curriculumType} added to section`);
      setLessonTitle('');
      setAddingLessonToModuleId(null);
      refetch();
    } catch (e) { toast.error('Failed to add content'); }
  };

  const handleRenameModule = async (moduleId: number) => {
    if (!moduleTitle.trim()) {
      setEditingModuleId(null);
      return;
    }

    if (!isEditing) {
      setLocalModules(localModules.map(m => m.id === moduleId ? { ...m, title: moduleTitle } : m));
      setEditingModuleId(null);
      return;
    }

    try {
      await updateModule.mutateAsync({ 
        courseId: parseInt(id!), 
        moduleId, 
        title: moduleTitle,
        description: moduleDesc
      });
      toast.success('Section renamed');
      setEditingModuleId(null);
      refetch();
    } catch (e) { toast.error('Failed to rename section'); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('File size too large (max 2MB)');
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setThumbnailUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setThumbnailUrl('');
    setThumbnailFile(null);
  };

  const handleDeleteModule = async (moduleId: number) => {
    if (!isEditing) {
      setLocalModules(localModules.filter(m => m.id !== moduleId));
      toast.success('Module removed from draft');
      return;
    }

    try {
      await deleteModule.mutateAsync({ courseId: parseInt(id!), moduleId });
      toast.success('Module deleted');
      refetch();
    } catch (error) { toast.error('Failed to delete module'); }
  };

  const handleDeleteContent = async (moduleId: number, contentId: number) => {
    if (!isEditing) {
      setLocalModules(localModules.map(m => {
        if (m.id === moduleId) {
          return { ...m, contents: m.contents.filter((c: any) => c.id !== contentId) };
        }
        return m;
      }));
      toast.success('Lesson removed');
      setExpandedLessonId(null);
      return;
    }

    try {
      await deleteContent.mutateAsync({ courseId: parseInt(id!), contentId });
      toast.success('Lesson deleted');
      refetch();
      setExpandedLessonId(null);
    } catch (error) { toast.error('Failed to delete lesson'); }
  };

  const renderInlineLessonEditor = (lessonId: number) => (
    <div className="w-full space-y-6 animate-in fade-in zoom-in duration-500">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
              {lessonType === 'VIDEO' ? <MonitorPlay size={20} /> : lessonType === 'QUIZ' ? <Sparkles size={20} /> : <FileText size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Configure Content</h2>
              <p className="text-xs text-muted-foreground font-medium">Add high-quality media and assessments.</p>
            </div>
          </div>

          <div className="flex bg-muted p-1 rounded-lg border border-border shadow-inner">
              {[
                 { type: 'VIDEO', label: 'Video', icon: <Video size={12} /> },
                 { type: 'PDF', label: 'PDF', icon: <FileText size={12} /> },
                 { type: 'PPT', label: 'Slides', icon: <MonitorPlay size={12} /> },
                 { type: 'LIVE_CLASS', label: 'Live', icon: <Radio size={12} /> },
                 { type: 'TEXT', label: 'Text', icon: <Layout size={12} /> },
                 { type: 'QUIZ', label: 'Quiz', icon: <Sparkles size={12} /> }
              ].map(item => (
                <button 
                  key={item.type}
                  onClick={() => { setLessonType(item.type); setLessonFile(null); }}
                  className={`flex items-center gap-2.5 px-6 py-2.5 rounded-lg transition-all font-black text-[10px]  tracking-widest border-2 ${lessonType === item.type ? 'bg-card text-primary shadow-sm shadow-primary-100 border-white' : 'text-muted-foreground border-transparent hover:bg-card/50 hover:text-gray-600'}`}
                >
                  <span className={`${lessonType === item.type ? 'text-primary' : 'text-gray-300'}`}>{item.icon}</span> {item.label}
                </button>
              ))}
          </div>
       </div>

       <div className="space-y-6 pt-6 border-t border-gray-50">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground  ">Lesson Title</label>
            <input 
              type="text" 
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="e.g. Master the Foundations"
              className="w-full h-11 px-4 bg-muted/50 border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground  ">Learning Content</label>
            <div className="min-h-[350px] rounded-lg bg-muted border border-border overflow-hidden relative shadow-inner">
              {lessonType === 'TEXT' ? (
                  <textarea 
                    value={lessonBody}
                    onChange={(e) => setLessonBody(e.target.value)}
                    placeholder="Type your educational content here..."
                    className="w-full h-full min-h-[350px] p-6 outline-none font-medium text-sm text-foreground leading-relaxed resize-none bg-card"
                  />
              ) : lessonType === 'QUIZ' ? (
                  <div className="p-6 space-y-8 bg-card min-h-[400px]">
                     <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-8 gap-6">
                        <div className="space-y-1">
                           <h4 className="text-[12px] font-medium text-foreground tracking-tight">Assessment Designer</h4>
                           <p className="text-[10px] text-muted-foreground font-bold  tracking-widest">Create high-impact knowledge checks</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-6 bg-muted/80 p-4 rounded-lg border border-border">
                           <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-muted-foreground  tracking-widest">Passing Grade</label>
                              <div className="flex items-center gap-2">
                                 <input 
                                   type="number" 
                                   value={passingScore} 
                                   onChange={(e) => setPassingScore(parseInt(e.target.value))}
                                   className="w-20 h-9 px-3 bg-card border border-border rounded-lg text-sm font-black text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-center"
                                 />
                                 <span className="text-xs font-black text-muted-foreground">%</span>
                              </div>
                           </div>
                           <div className="w-px h-10 bg-gray-200" />
                           <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-muted-foreground  tracking-widest">Retry Policy</label>
                              <div className="flex items-center gap-2">
                                 <input 
                                   type="number" 
                                   value={quizMaxAttempts} 
                                   onChange={(e) => setQuizMaxAttempts(parseInt(e.target.value))}
                                   className="w-20 h-9 px-3 bg-card border border-border rounded-lg text-sm font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-center"
                                 />
                                 <span className="text-xs font-black text-muted-foreground">Limit</span>
                              </div>
                           </div>
                           <div className="w-px h-10 bg-gray-200" />
                           <div className="text-right px-2">
                              <p className="text-[9px] font-black text-muted-foreground  tracking-widest mb-1">Total Weight</p>
                              <p className="text-sm font-black text-foreground">{quizQuestions.length} Items</p>
                           </div>
                        </div>
                     </div>

                    <div className="space-y-10">
                       {quizQuestions.map((q, qIdx) => (
                          <div key={qIdx} className="relative p-8 rounded-lg bg-card border border-border shadow-sm shadow-gray-200/20 space-y-6 animate-in slide-in-from-bottom-4 duration-500 group">
                             <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-4">
                                   <div className="flex items-center gap-4">
                                      <GripVertical size={14} className="text-gray-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all -ml-1" />
                                      <GripVertical size={14} className="text-gray-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all -ml-1" />
                                      <span className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center text-xs font-black shadow-sm shadow-gray-900/20">{qIdx + 1}</span>
                                      <div className="flex gap-2">
                                        {['SINGLE', 'MULTI', 'TF'].map(type => (
                                          <button 
                                            key={type}
                                            onClick={() => {
                                              const newQ = [...quizQuestions];
                                              newQ[qIdx].type = type;
                                              if (type === 'TF') {
                                                newQ[qIdx].options = ['True', 'False'];
                                                newQ[qIdx].correctAnswer = 0;
                                              } else if (type === 'MULTI') {
                                                newQ[qIdx].correctAnswer = [0];
                                              } else {
                                                newQ[qIdx].correctAnswer = 0;
                                              }
                                              setQuizQuestions(newQ);
                                            }}
                                            className={`px-3 py-1 rounded-lg text-[9px] font-black  tracking-widest transition-all ${q.type === type ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-primary/95'}`}
                                          >
                                            {type === 'TF' ? 'T/F' : type}
                                          </button>
                                        ))}
                                      </div>
                                   </div>
                                   <input 
                                     className="w-full h-14 px-6 bg-muted/50 border border-border rounded-lg outline-none text-lg font-bold text-foreground placeholder:text-gray-200 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all leading-tight"
                                     placeholder="Enter your question here..."
                                     value={q.question}
                                     onChange={(e) => {
                                       const newQ = [...quizQuestions];
                                       newQ[qIdx].question = e.target.value;
                                       setQuizQuestions(newQ);
                                     }}
                                   />
                                </div>
                                <button 
                                  onClick={() => setQuizQuestions(quizQuestions.filter((_, i) => i !== qIdx))}
                                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={18} />
                                </button>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {q.options.map((opt: string, oIdx: number) => {
                                   const isCorrect = q.type === 'MULTI' 
                                     ? Array.isArray(q.correctAnswer) && q.correctAnswer.includes(oIdx)
                                     : q.correctAnswer === oIdx;

                                   return (
                                     <div key={oIdx} className={`group/opt flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${isCorrect ? 'bg-emerald-50/50 border-emerald-500 shadow-sm shadow-emerald-500/10' : 'bg-card border-border hover:border-gray-300'}`}>
                                        <button 
                                          onClick={() => {
                                            const newQ = [...quizQuestions];
                                            if (q.type === 'MULTI') {
                                              const current = Array.isArray(newQ[qIdx].correctAnswer) ? newQ[qIdx].correctAnswer : [newQ[qIdx].correctAnswer];
                                              if (current.includes(oIdx)) {
                                                newQ[qIdx].correctAnswer = current.filter((i: number) => i !== oIdx);
                                              } else {
                                                newQ[qIdx].correctAnswer = [...current, oIdx];
                                              }
                                            } else {
                                              newQ[qIdx].correctAnswer = oIdx;
                                            }
                                            setQuizQuestions(newQ);
                                          }}
                                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isCorrect ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border group-hover/opt:border-primary-300'}`}
                                        >
                                          {isCorrect && (q.type === 'MULTI' ? <Plus size={14} className="rotate-45" /> : <div className="w-2 h-2 bg-card rounded-full" />)}
                                        </button>
                                        <input 
                                          className={`bg-transparent border-none outline-none text-sm font-medium w-full focus:ring-0 ${isCorrect ? 'text-emerald-900' : 'text-gray-600'}`}
                                          placeholder={`Option ${oIdx + 1}`}
                                          value={opt}
                                          disabled={q.type === 'TF'}
                                          onChange={(e) => {
                                            const newQ = [...quizQuestions];
                                            newQ[qIdx].options[oIdx] = e.target.value;
                                            setQuizQuestions(newQ);
                                          }}
                                        />
                                     </div>
                                   );
                                })}
                                {q.type !== 'TF' && q.options.length < 6 && (
                                  <button 
                                    onClick={() => {
                                      const newQ = [...quizQuestions];
                                      newQ[qIdx].options.push('');
                                      setQuizQuestions(newQ);
                                    }}
                                    className="p-4 rounded-lg border-2 border-dashed border-border text-[10px] font-black text-muted-foreground  tracking-widest hover:border-primary-200 hover:bg-primary/10/20 hover:text-primary transition-all flex items-center justify-center gap-2"
                                  >
                                    <Plus size={14} /> Add Option
                                  </button>
                                )}
                             </div>

                             <div className="pt-6 border-t border-gray-50 flex flex-col md:flex-row gap-6">
                                <div className="flex-1 space-y-2">
                                   <label className="text-[11px] font-semibold text-muted-foreground   flex items-center gap-2">
                                      <Sparkles size={12} className="text-primary-400" /> Correct Answer Explanation
                                   </label>
                                   <textarea 
                                     placeholder="Explain why this is correct (shown to learners after completion)..."
                                     className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all resize-none min-h-[80px]"
                                     value={q.explanation || ''}
                                     onChange={(e) => {
                                       const newQ = [...quizQuestions];
                                       newQ[qIdx].explanation = e.target.value;
                                       setQuizQuestions(newQ);
                                     }}
                                   />
                                </div>
                                <div className="w-full md:w-32 space-y-2">
                                   <label className="text-[11px] font-semibold text-muted-foreground  ">Points</label>
                                   <div className="flex items-center gap-2">
                                      <input 
                                        type="number"
                                        className="w-full h-11 px-4 bg-muted/50 border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                                        value={q.points || 1}
                                        onChange={(e) => {
                                          const newQ = [...quizQuestions];
                                          newQ[qIdx].points = parseInt(e.target.value);
                                          setQuizQuestions(newQ);
                                        }}
                                      />
                                   </div>
                                </div>
                             </div>
                          </div>
                       ))}

                       <div className="flex gap-4">
                          <Button 
                            variant="ghost" 
                            onClick={() => setQuizQuestions([...quizQuestions, { question: '', options: ['', '', '', ''], correctAnswer: 0, type: 'SINGLE', explanation: '', points: 1 }])}
                            className="flex-1 border-2 border-dashed border-border rounded-lg py-12 text-muted-foreground font-black text-xs hover:border-primary-300 hover:bg-primary/10/30 hover:text-primary transition-all flex flex-col items-center gap-3 group"
                          >
                             <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-gray-300 group-hover:bg-primary group-hover:text-white group-hover:shadow-sm transition-all">
                               <Plus size={24} />
                             </div>
                             <div className="text-center">
                                <p className="text-sm font-black text-foreground mb-1">Add Knowledge Check</p>
                                <p className="text-[10px] font-bold text-muted-foreground ">Multiple Choice or True/False</p>
                             </div>
                          </Button>
                       </div>
                    </div>
                  </div>
              ) : (
                   <div className="h-full min-h-[350px] flex flex-col">
                    {lessonType === 'LIVE_CLASS' ? (
                      <div className="space-y-4 p-6 bg-primary/10/50 rounded-lg border border-primary-100 animate-in zoom-in-95 duration-300">
                         <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
                               <Radio size={20} className="animate-pulse" />
                            </div>
                            <div>
                               <h4 className="text-[12px] font-medium text-primary-900 tracking-tight">Live Session Configuration</h4>
                               <p className="text-[9px] font-bold text-primary-400 ">Sync with Zoom, Teams, or Google Meet</p>
                            </div>
                         </div>
                         <div className="space-y-2">
                             <label className="text-[11px] font-semibold text-muted-foreground  ">Meeting URL</label>
                             <input 
                               value={lessonBody}
                               onChange={(e) => setLessonBody(e.target.value)}
                               placeholder="https://zoom.us/j/..."
                               className="w-full px-4 py-3 bg-card border-2 border-primary-100 rounded-lg focus:border-primary outline-none transition-all text-xs font-bold"
                             />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-muted-foreground  ">Schedule Date</label>
                                <input 
                                  type="datetime-local" 
                                  value={meetingDate}
                                  onChange={(e) => setMeetingDate(e.target.value)}
                                  className="w-full px-4 py-3 bg-card border-2 border-primary-100 rounded-lg text-[10px] font-bold outline-none" 
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-muted-foreground  ">Duration (Mins)</label>
                                <input 
                                  type="number" 
                                  value={meetingDuration}
                                  onChange={(e) => setMeetingDuration(parseInt(e.target.value))}
                                  className="w-full px-4 py-3 bg-card border-2 border-primary-100 rounded-lg text-[10px] font-bold outline-none" 
                                />
                             </div>
                          </div>
                      </div>
                    ) : (
                      <div className="relative flex-1 group">
                       <input 
                         type="file" 
                         accept={lessonType === 'VIDEO' ? 'video/*' : lessonType === 'PDF' ? '.pdf' : lessonType === 'PPT' ? '.ppt,.pptx' : '*'} 
                         onChange={(e) => setLessonFile(e.target.files?.[0] || null)} 
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                       />
                      <div className={`h-full min-h-[300px] flex flex-col items-center justify-center gap-3 transition-all ${lessonFile ? 'bg-green-50/20' : 'bg-transparent group-hover:bg-primary/10/10'}`}>
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-sm transition-all ${lessonFile ? 'bg-card text-green-600' : 'bg-card text-primary'}`}>
                            <Upload size={24} />
                        </div>
                        <div className="text-center p-4">
                             <p className={`text-sm font-bold ${lessonFile ? 'text-green-900' : 'text-foreground'}`}>
                               {lessonFile ? lessonFile.name : `Securely upload ${lessonType} Asset`}
                             </p>
                            <p className="text-[10px] font-medium text-muted-foreground mt-1 italic">Drag and drop file here</p>
                        </div>
                      </div>
                    </div>
                   )}

                    {lessonExistingUrl && !lessonFile && (
                      <div className="bg-gray-900 text-white px-5 py-3 flex items-center justify-between border-t border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-card/10 rounded flex items-center justify-center">
                              {lessonType === 'VIDEO' ? <PlayCircle size={16} className="text-primary-400" /> : <FileText size={16} className="text-amber-400" />}
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-white/40 ">Current Asset</p>
                              <p className="text-[11px] font-semibold truncate max-w-xs">{lessonExistingUrl.split('/').pop()}</p>
                            </div>
                        </div>
                        <Button variant="ghost" onClick={() => window.open(getAssetUrl(lessonExistingUrl), '_blank')} className="text-white hover:bg-card/10 font-bold border border-white/10 px-4 h-8 rounded text-[10px]">Preview</Button>
                      </div>
                    )}
                  </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end pt-8 border-t border-border gap-3">
              <Button variant="outline" onClick={() => setExpandedLessonId(null)} className="font-bold h-11 px-8 text-xs rounded-lg">Discard Changes</Button>
             <Button 
               onClick={() => handleSaveLesson(lessonId)} 
               className="bg-primary hover:bg-primary/95 text-white font-black h-11 px-10 rounded-lg shadow-sm shadow-primary-100 flex items-center gap-2 text-xs transition-all active:scale-95" 
               disabled={addContent.isPending || updateContent.isPending}
             >
               {(addContent.isPending || updateContent.isPending) ? <Loader2 className="animate-spin" /> : <><Save size={16} /> Save Content Changes</>}
             </Button>
          </div>
       </div>
    </div>
  );

  const renderSettings = () => (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
            <Settings size={20} />
          </div>
          <div>
             <h2 className="text-xl font-medium text-foreground">Course Intelligence</h2>
             <p className="text-sm text-muted-foreground font-medium">Define metadata that helps employees choose the right training.</p>
           </div>
         </div>
 
         <div className="relative flex w-64 bg-primary rounded-full p-1 h-10 shadow-inner group overflow-hidden border border-primary-700/30">
            {/* Sliding Background */}
            <div
              className="absolute top-1 bottom-1 rounded-full bg-card transition-all duration-300 ease-in-out shadow-sm"
              style={{
                width: 'calc(50% - 4px)',
                left: courseStatus === 'DRAFT' ? '4px' : 'calc(50%)'
              }}
            />

            <button
              type="button"
              onClick={() => setCourseStatus('DRAFT')}
              className={`flex-1 relative z-10 font-black text-[10px]  tracking-widest h-full rounded-full transition-colors duration-300 ${
                courseStatus === 'DRAFT' ? 'text-primary' : 'text-white hover:text-white/80'
              }`}
            >
              DRAFT
            </button>

            <button
              type="button"
              onClick={() => setCourseStatus('PUBLISHED')}
              className={`flex-1 relative z-10 font-black text-[10px]  tracking-widest h-full rounded-full transition-colors duration-300 ${
                courseStatus === 'PUBLISHED' ? 'text-primary' : 'text-white hover:text-white/80'
              }`}
            >
              PUBLISHED
            </button>
          </div>
       </div>
 
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
         <div className="lg:col-span-8 space-y-8">
           {/* Primary Identity Section */}
           <div className="bg-card rounded-lg border border-border p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                 <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Edit size={16} />
                 </div>
                 <h3 className="text-base font-black text-foreground  tracking-tight">Identity & Vision</h3>
              </div>
 
              <div className="space-y-6">
                 <div className="space-y-1.5">
                   <label className="text-[11px] font-semibold text-muted-foreground  ">Course Title <span className="text-red-500">*</span></label>
                   <input 
                     type="text" 
                     value={courseTitle}
                     onChange={(e) => setCourseTitle(e.target.value)}
                     placeholder="e.g. Master Class: Strategic Leadership"
                     className="w-full h-11 px-4 bg-muted/50 border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                   />
                 </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select value={courseType} onChange={(val) => setCourseType(val)} label="Discipline" options={[{ value: "ONBOARDING", label: "ONBOARDING" }, { value: "COMPLIANCE", label: "COMPLIANCE" }, { value: "TECHNICAL", label: "TECHNICAL" }, { value: "SOFT_SKILLS", label: "SOFT SKILLS" }]} />

                    <Select value={courseLevel} onChange={(val) => setCourseLevel(val)} label="Level" options={[{ value: "BEGINNER", label: "BEGINNER" }, { value: "INTERMEDIATE", label: "INTERMEDIATE" }, { value: "ADVANCED", label: "ADVANCED" }]} />

                    <Select value={curriculumType} onChange={(val) => setCurriculumType(val)} label="Format" options={[{ value: "VIDEO", label: "Video Class" }, { value: "PDF", label: "PDF Guide" }, { value: "PPT", label: "Presentation" }, { value: "TEXT", label: "Rich Text" }]} />

                    <Select value={courseDuration} onChange={(val) => setCourseDuration(val)} placeholder="Select Duration" label="Duration" options={[{ value: "30 Mins", label: "30 Mins" }, { value: "1 Hour", label: "1 Hour" }, { value: "2 Hours", label: "2 Hours" }, { value: "4 Hours", label: "4 Hours" }, { value: "8 Hours", label: "8 Hours" }, { value: "12 Hours", label: "12 Hours" }, { value: "24 Hours", label: "24 Hours" }, { value: "40 Hours", label: "40 Hours" }]} />
                 </div>

                 <div className="space-y-1.5 pt-6 border-t border-gray-50">
                   <label className="text-[11px] font-semibold text-muted-foreground  ">Strategic Value & Description</label>
                   <textarea 
                     value={courseDescription}
                     onChange={(e) => setCourseDescription(e.target.value)}
                     placeholder="Describe the ROI and skills gained from this course..."
                     className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all resize-none min-h-[120px]"
                   />
                 </div>
              </div>
           </div>
 
           {/* Learning Objectives Section */}
           <div className="bg-card rounded-lg border border-border p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                       <Target size={16} />
                    </div>
                    <h3 className="text-base font-black text-foreground  tracking-tight">Key Learning Outcomes</h3>
                 </div>
                 <Button 
                   variant="ghost" 
                   onClick={() => setLearningObjectives([...learningObjectives, ''])}
                   className="text-emerald-600 hover:bg-emerald-50 font-black text-[10px]  tracking-widest"
                 >
                    <Plus size={14} className="mr-2" /> Add Objective
                 </Button>
              </div>
 
              <div className="space-y-4">
                 {learningObjectives.map((obj, idx) => (
                    <div key={idx} className="flex gap-3 group">
                       <input 
                         type="text"
                         value={obj}
                         onChange={(e) => {
                           const next = [...learningObjectives];
                           next[idx] = e.target.value;
                           setLearningObjectives(next);
                         }}
                         placeholder="e.g. Understand core principles of change management"
                         className="flex-1 h-11 px-4 bg-muted/50 border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                       />
                       <button 
                         onClick={() => setLearningObjectives(learningObjectives.filter((_, i) => i !== idx))}
                         className="p-3 text-gray-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                       >
                          <Trash2 size={18} />
                       </button>
                    </div>
                 ))}
                 {learningObjectives.length === 0 && (
                    <p className="text-center py-6 text-muted-foreground text-xs italic font-medium">No objectives added yet. Add a few to guide the learners.</p>
                 )}
              </div>
           </div>
         </div>
 
         <div className="lg:col-span-4 space-y-8">
           {/* Visual Section */}
           <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4">
             <label className="text-[11px] font-semibold text-muted-foreground   block">Course Cover Art</label>
             <div className="relative group rounded-lg overflow-hidden bg-muted border-2 border-dashed border-border aspect-[4/3] flex flex-col items-center justify-center transition-all hover:border-primary-300 hover:bg-primary/10/20">
               <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
               {thumbnailUrl ? (
                 <>
                   <img src={getAssetUrl(thumbnailUrl)} alt="Preview" className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                     <Button onClick={handleRemoveImage} variant="ghost" className="bg-card text-foreground hover:bg-primary/95 font-black h-10 px-6 rounded-lg text-xs">Update Artwork</Button>
                   </div>
                 </>
               ) : (
                 <div className="flex flex-col items-center gap-3 text-muted-foreground p-6 text-center">
                   <div className="w-12 h-12 rounded-lg bg-card shadow-sm flex items-center justify-center text-primary">
                      <ImageIcon size={24} />
                   </div>
                   <div>
                     <p className="text-xs font-black text-foreground">Upload Visuals</p>
                     <p className="text-[10px] font-bold mt-1 text-muted-foreground">High Resolution Recommended</p>
                   </div>
                 </div>
               )}
             </div>
           </div>
         </div>
       </div>
     </div>
   );

const renderOverview = () => (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <h3 className="text-lg font-black text-foreground tracking-tight leading-none">Curriculum Structure</h3>
                <Button 
                  onClick={() => setIsAddingModule(true)}
                  variant="outline"
                  className="border-primary-100 bg-primary/10/50 hover:bg-primary-100/50 text-primary font-bold flex items-center gap-2 h-10 px-5 rounded-lg shadow-sm text-xs w-full sm:w-auto justify-center"
                >
                   <Plus size={16} /> Add Section
                </Button>
             </div>

             <div className="space-y-3">
                 {localModules.map((mod: any, idx: number) => (
                   <div key={mod.id} className="bg-card rounded-lg border border-border overflow-hidden shadow-sm hover:shadow-sm transition-all">
                      <div 
                        className="px-6 py-5 flex items-center justify-between bg-card cursor-pointer group"
                        onClick={() => toggleModule(mod.id)}
                      >
                         <div className="flex items-center gap-3 flex-1">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black shadow-sm transition-all ${expandedModuleIds.has(mod.id) ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                {String(idx + 1).padStart(2, '0')}
                             </div>
                            {editingModuleId === mod.id ? (
                               <div className="flex flex-col flex-1 gap-2">
                                 <input 
                                   autoFocus
                                   className="w-full h-11 px-4 bg-card border border-border rounded-lg text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                                   value={moduleTitle}
                                   placeholder="Section Title"
                                   onClick={(e) => e.stopPropagation()}
                                   onChange={(e) => setModuleTitle(e.target.value)}
                                 />
                                 <textarea 
                                   className="w-full px-4 py-3 bg-card border border-border rounded-lg text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all resize-none min-h-[80px]"
                                   value={moduleDesc}
                                   placeholder="Section Description (Provide context for this module...)"
                                   onClick={(e) => e.stopPropagation()}
                                   onChange={(e) => setModuleDesc(e.target.value)}
                                   onKeyDown={(e) => {
                                     if (e.key === 'Enter' && e.ctrlKey) handleRenameModule(mod.id);
                                     if (e.key === 'Escape') setEditingModuleId(null);
                                   }}
                                 />
                                 <div className="flex gap-2">
                                   <Button size="sm" className="h-7 text-[10px] font-bold" onClick={(e) => { e.stopPropagation(); handleRenameModule(mod.id); }}>Save Changes</Button>
                                    <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold" onClick={(e) => { e.stopPropagation(); setEditingModuleId(null); }}>Cancel</Button>
                                 </div>
                               </div>
                            ) : (
                                <div className="flex items-center gap-3 flex-1">
                                  <GripVertical size={16} className="text-gray-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all" />
                                 <h4 className="text-[12px] font-medium text-foreground group-hover:text-white transition-colors">
                                   {mod.title}
                                 </h4>
                                 <div className="flex items-center gap-1 transition-all">
                                   <Button 
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setEditingModuleId(mod.id);
                                       setModuleTitle(mod.title);
                                       setModuleDesc(mod.description || '');
                                     }} 
                                     variant="ghost" 
                                     className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-card rounded-lg shadow-sm border border-border"
                                   >
                                      <Edit size={12} />
                                   </Button>
                                   <Button 
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       confirmDelete('Delete Section', 'Remove this section and all its contents?', () => handleDeleteModule(mod.id));
                                     }} 
                                     variant="ghost" 
                                     className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg shadow-sm border border-border transition-all active:scale-90"
                                   >
                                      <Trash2 size={14} />
                                   </Button>
                                 </div>
                               </div>
                            )}
                         </div>
                         <div className="flex items-center gap-2">
                           <div className="w-px h-5 bg-gray-200 mx-1" />
                           <ChevronRight 
                             size={20} 
                             className={`text-muted-foreground transition-transform duration-300 ${expandedModuleIds.has(mod.id) ? 'rotate-90' : ''}`} 
                           />
                         </div>
                      </div>

                      {expandedModuleIds.has(mod.id) && (
                        <div className="pb-4 animate-in slide-in-from-top-2 duration-300">
                           <div className="mx-6 p-1 bg-muted/50 rounded-lg border border-border space-y-1">
                           {mod.contents?.map((content: any) => (
                             <div key={content.id} className="space-y-1">
                               <div className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${expandedLessonId === content.id ? 'bg-primary text-white shadow-sm shadow-primary-200' : 'bg-transparent hover:bg-card border border-transparent hover:border-border hover:shadow-sm group'}`}>
                                  <div className="flex items-center gap-4">
                                     <GripVertical size={14} className="text-gray-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all -ml-1" />
                                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${expandedLessonId === content.id ? 'bg-card/20 text-white' : 'bg-muted text-muted-foreground group-hover:bg-card group-hover:text-white group-hover:shadow-sm'}`}>
                                        {content.content_type === 'VIDEO' ? <MonitorPlay size={18} /> : content.content_type === 'QUIZ' ? <Sparkles size={18} /> : <FileText size={18} />}
                                     </div>
                                     <div className="flex flex-col">
                                        <span className={`text-sm font-bold transition-colors ${expandedLessonId === content.id ? 'text-white' : 'text-foreground group-hover:text-foreground'}`}>{content.title}</span>
                                        <span className={`text-[9px] font-black  tracking-widest ${expandedLessonId === content.id ? 'text-primary-200' : 'text-muted-foreground'}`}>{content.content_type}</span>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      onClick={() => expandedLessonId === content.id ? setExpandedLessonId(null) : handleStartEditLesson(mod.id, content)} 
                                      variant="ghost" 
                                      className={`h-9 px-4 flex items-center gap-2 rounded-lg transition-all ${expandedLessonId === content.id ? 'bg-card/20 text-white border-white/20 hover:bg-card/30' : 'text-muted-foreground hover:text-primary hover:bg-card border-transparent hover:border-primary-50 shadow-none'}`}
                                    >
                                       <span className="text-[10px] font-black  tracking-widest">{expandedLessonId === content.id ? 'Close' : 'Edit Content'}</span>
                                       <ChevronRight size={14} className={`transition-transform duration-300 ${expandedLessonId === content.id ? 'rotate-90' : ''}`} />
                                    </Button>
                                    <Button 
                                      onClick={() => confirmDelete('Delete Lesson', 'Remove this lesson?', () => handleDeleteContent(mod.id, content.id))} 
                                      variant="ghost" 
                                      className={`h-9 w-9 p-0 rounded-lg transition-all ${expandedLessonId === content.id ? 'text-white/40 hover:text-white hover:bg-card/10' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}
                                    >
                                       <Trash2 size={14} />
                                    </Button>
                                  </div>
                               </div>

                               {expandedLessonId === content.id && (
                                 <div className="p-6 bg-card border-2 border-primary-500/20 rounded-lg mt-2 mb-4 shadow-sm shadow-primary-900/10 ring-4 ring-primary/5 animate-in slide-in-from-top-4 duration-500 overflow-hidden relative">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                    {renderInlineLessonEditor(content.id)}
                                 </div>
                               )}
                             </div>
                           ))}
                           
                           {addingLessonToModuleId === mod.id ? (
                             <div className="p-2 bg-card rounded-lg border border-border shadow-sm animate-in zoom-in-95 duration-200 mx-2 mt-2">
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
                                      <Plus size={20} />
                                   </div>
                                   <input 
                                     autoFocus
                                     className="flex-1 h-11 px-4 bg-muted/50 border border-border rounded-lg outline-none text-sm font-medium text-foreground focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                                     placeholder="Enter content title..."
                                     value={lessonTitle}
                                     onChange={(e) => setLessonTitle(e.target.value)}
                                     onKeyDown={(e) => {
                                       if (e.key === 'Enter') handleQuickAddLesson(mod.id);
                                       if (e.key === 'Escape') setAddingLessonToModuleId(null);
                                     }}
                                     onBlur={() => {
                                        if (!lessonTitle) setAddingLessonToModuleId(null);
                                     }}
                                   />
                                </div>
                             </div>
                           ) : (
                             <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 mt-2 p-2 border-t border-border/50 w-full">
                               {[
                                 { type: 'VIDEO', label: 'Video', icon: <MonitorPlay size={14} />, color: 'text-primary', hover: 'hover:bg-primary' },
                                 { type: 'TEXT', label: 'Reading', icon: <FileText size={14} />, color: 'text-blue-600', hover: 'hover:bg-primary' },
                                 { type: 'QUIZ', label: 'Quiz', icon: <Sparkles size={14} />, color: 'text-emerald-600', hover: 'hover:bg-emerald-600' },
                                 { type: 'LIVE_CLASS', label: 'Live', icon: <Radio size={14} />, color: 'text-rose-600', hover: 'hover:bg-rose-600' }
                               ].map((btn) => (
                                 <button 
                                   key={btn.type}
                                   onClick={async () => {
                                     if (!isEditing) {
                                       setLocalModules(localModules.map(m => m.id === mod.id ? {
                                         ...m, 
                                         contents: [...(m.contents || []), { 
                                           id: Date.now(), 
                                           title: `New ${btn.label}`, 
                                           content_type: btn.type, 
                                           order: (m.contents?.length || 0) + 1 
                                         }]
                                       } : m));
                                     } else {
                                       await addContent.mutateAsync({ 
                                         moduleId: mod.id, 
                                         courseId: parseInt(id!), 
                                         title: `New ${btn.label}`, 
                                         content_type: btn.type,
                                         order: (mod.contents?.length || 0) + 1
                                       });
                                       refetch();
                                     }
                                   }}
                                   className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider ${btn.color} ${btn.hover} hover:text-white transition-all border border-border hover:border-transparent`}
                                 >
                                   {btn.icon} {btn.label}
                                 </button>
                               ))}
                               </div>
                            )}
                         </div>
                      </div>
                   )}
                   </div>
                 ))}
             </div>

                 {isAddingModule && (
                   <div className="p-4 sm:p-8 bg-primary/10/30 border border-primary-100 rounded-[32px] animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm shadow-primary-200">
                            <Plus size={24} />
                         </div>
                         <div>
                            <h4 className="text-[12px] font-medium text-primary-900 tracking-tight">Architect New Section</h4>
                            <p className="text-[10px] font-bold text-primary-400 tracking-widest uppercase">Structural curriculum planning</p>
                         </div>
                      </div>
                      
                      <div className="space-y-4">
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-primary-900/40 tracking-widest uppercase">Section Nomenclature</label>
                            <input 
                              autoFocus
                              className="w-full h-14 px-6 bg-card border border-primary-100 rounded-lg outline-none text-base font-bold text-foreground focus:ring-4 focus:ring-primary/5 transition-all shadow-sm"
                              placeholder="e.g. Phase 1: Core Fundamentals"
                              value={moduleTitle}
                              onChange={(e) => setModuleTitle(e.target.value)}
                            />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-primary-900/40 tracking-widest uppercase">Strategic Overview</label>
                            <textarea 
                              className="w-full px-6 py-4 bg-card border border-primary-100 rounded-lg text-sm font-medium focus:ring-4 focus:ring-primary/5 transition-all resize-none min-h-[100px] outline-none shadow-sm"
                              placeholder="Describe the learning outcomes for this phase..."
                              value={moduleDesc}
                              onChange={(e) => setModuleDesc(e.target.value)}
                            />
                         </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2 w-full">
                        <Button variant="outline" className="rounded-lg h-11 px-8 font-bold w-full sm:w-auto" onClick={() => setIsAddingModule(false)}>Cancel Planning</Button>
                        <Button className="bg-primary text-white font-black h-11 px-10 rounded-lg shadow-sm shadow-primary-200 flex items-center justify-center gap-2 w-full sm:w-auto" onClick={handleQuickAddModule}>
                           <Save size={16} /> Finalize Section
                        </Button>
                      </div>
                   </div>
                 )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="py-2 space-y-6">
                 <h4 className="text-[12px] font-medium text-[11px] text-muted-foreground tracking-widest">Course Metrics</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-card rounded-lg border border-border text-center shadow-sm">
                       <p className="text-[10px] font-medium text-muted-foreground ">Sections</p>
                       <p className="text-xl font-bold text-foreground mt-1">{localModules.length || 0}</p>
                    </div>
                    <div className="p-4 bg-card rounded-lg border border-border text-center shadow-sm">
                       <p className="text-[10px] font-medium text-muted-foreground ">Lessons</p>
                       <p className="text-xl font-bold text-foreground mt-1">
                          {localModules.reduce((acc: number, m: any) => acc + (m.contents?.length || 0), 0) || 0}
                       </p>
                    </div>
                 </div>
                 <div className="pt-4 border-t border-border space-y-3">
                    <div className="flex items-center justify-between text-xs">
                       <span className="text-muted-foreground font-medium">Status</span>
                       <span className={`font-bold ${courseStatus === 'PUBLISHED' ? 'text-green-600' : 'text-amber-600'}`}>{courseStatus}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                       <span className="text-muted-foreground font-medium">Updated</span>
                       <span className="text-foreground font-bold">Just now</span>
                    </div>
                 </div>
              </div>
         </div>
       </div>
    </div>
   );

  if (isLoading && isEditing) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="max-w-full mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/lms/courses')}
              className="p-3 bg-card border border-border rounded-lg text-muted-foreground hover:text-primary hover:border-primary-100 transition-all shadow-sm group"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black text-primary   mb-1">
                <Sparkles size={12} />
                <span>Course Architect</span>
              </div>
              <h1 className="text-3xl font-black text-foreground tracking-tight leading-none">
                {isEditing ? courseTitle || 'Edit Course' : 'Create New Experience'}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isEditing && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleDuplicate}
                  disabled={duplicateCourseMutation.isPending}
                  className="rounded-lg border-border font-bold text-gray-600 hover:bg-muted flex items-center gap-2 h-11 px-5"
                >
                  <Copy size={16} /> Duplicate
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/lms/courses/${id}/player`)}
                  className="rounded-lg border-primary-100 bg-primary/10 text-primary font-bold hover:bg-primary-100 flex items-center gap-2 h-11 px-5 shadow-sm"
                >
                  <Eye size={18} /> Preview
                </Button>
                {courseStatus !== 'ARCHIVED' && (
                  <Button 
                    variant="outline" 
                    onClick={handleArchive}
                    disabled={archiveCourse.isPending}
                    className="rounded-lg border-border font-bold text-amber-600 hover:bg-amber-50 hover:border-amber-100 flex items-center gap-2 h-11 px-5"
                  >
                    <Trash2 size={16} /> Archive
                  </Button>
                )}
              </>
            )}
            <Button 
              onClick={handleSaveCourse} 
              disabled={createCourse.isPending || updateCourse.isPending}
              className="bg-primary hover:bg-primary/95 text-white px-8 h-11 rounded-lg font-black shadow-sm shadow-primary-100 flex items-center gap-2 transition-all active:scale-95"
            >
              <Save size={18} /> {isEditing ? 'Sync Changes' : 'Launch Course'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="settings" className="space-y-8">
          <div className="w-full overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <TabsList className="bg-muted/50 p-1 rounded-lg border border-border/50 w-max min-w-full justify-start h-auto flex-nowrap">
              <TabsTrigger value="settings" className="px-8 py-3 rounded-lg text-xs font-black whitespace-nowrap data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center gap-2.5">
                <Settings size={16} /> Configuration
              </TabsTrigger>
              <TabsTrigger value="curriculum" className="px-8 py-3 rounded-lg text-xs font-black whitespace-nowrap data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center gap-2.5">
                <BookOpen size={16} /> Curriculum
              </TabsTrigger>
              <TabsTrigger value="assignments" className="px-8 py-3 rounded-lg text-xs font-black whitespace-nowrap data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center gap-2.5">
                <Target size={16} /> Auto Assignment
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="settings" className="mt-0 outline-none">
            {renderSettings()}
          </TabsContent>

          <TabsContent value="curriculum" className="mt-0 outline-none">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground tracking-tight ">Content Curriculum</h2>
                  <p className="text-sm text-muted-foreground font-medium">Architect your course structure with drag-and-drop ease.</p>
                </div>
              </div>
            </div>
            {renderOverview()}
          </TabsContent>

          <TabsContent value="assignments" className="mt-0 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="bg-card rounded-[32px] border border-border shadow-sm overflow-hidden h-fit">
                  <div className="p-8 border-b border-gray-50 bg-muted/30">
                     <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-primary text-white rounded-lg flex items-center justify-center shadow-sm shadow-primary-100">
                              <Building2 size={24} />
                           </div>
                           <div>
                              <h4 className="text-[12px] font-medium text-foreground tracking-tight leading-none">Departmental Logic</h4>
                              <p className="text-[10px] font-bold text-muted-foreground mt-1 tracking-widest uppercase">Automated Enrollment Strategy</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-2xl font-black text-primary leading-none">{autoAssignRules.department_ids.length}</p>
                           <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Active Rules</p>
                        </div>
                     </div>
                  </div>
                  <div className="p-8">
                     <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {departments.map(dept => (
                           <div 
                             key={dept.id} 
                             onClick={() => toggleAutoAssignRule('department_ids', dept.id)}
                             className={`flex items-center justify-between p-5 rounded-lg cursor-pointer border-2 transition-all group ${
                               autoAssignRules.department_ids.includes(dept.id)
                                 ? 'bg-primary/10 border-primary shadow-sm shadow-primary-500/5'
                                 : 'bg-card border-border hover:border-primary-100'
                             }`}
                           >
                              <div className="flex items-center gap-4">
                                 <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                                   autoAssignRules.department_ids.includes(dept.id) ? 'bg-primary text-white' : 'bg-muted text-muted-foreground group-hover:bg-primary-100 group-hover:text-white'
                                 }`}>
                                    <Building2 size={18} />
                                 </div>
                                 <p className={`text-sm font-black ${
                                   autoAssignRules.department_ids.includes(dept.id) ? 'text-primary-900' : 'text-foreground'
                                 }`}>{dept.department_name}</p>
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                autoAssignRules.department_ids.includes(dept.id)
                                  ? 'bg-primary border-primary text-white shadow-sm'
                                  : 'border-border group-hover:border-primary-300'
                              }`}>
                                 {autoAssignRules.department_ids.includes(dept.id) && <Plus size={14} className="rotate-45" />}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="bg-card rounded-[32px] border border-border shadow-sm overflow-hidden h-fit">
                  <div className="p-8 border-b border-gray-50 bg-muted/30">
                     <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-purple-600 text-white rounded-lg flex items-center justify-center shadow-sm shadow-purple-100">
                              <Target size={24} />
                           </div>
                           <div>
                              <h4 className="text-[12px] font-medium text-foreground tracking-tight leading-none">Job Function Targeting</h4>
                              <p className="text-[10px] font-bold text-muted-foreground mt-1 tracking-widest uppercase">Precision Role Assignments</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-2xl font-black text-purple-600 leading-none">{autoAssignRules.role_ids.length}</p>
                           <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Active Roles</p>
                        </div>
                     </div>
                  </div>
                  <div className="p-8">
                     <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {roles.map(role => (
                           <div 
                             key={role.id} 
                             onClick={() => toggleAutoAssignRule('role_ids', role.id)}
                             className={`flex items-center justify-between p-5 rounded-lg cursor-pointer border-2 transition-all group ${
                               autoAssignRules.role_ids.includes(role.id)
                                 ? 'bg-purple-50 border-purple-600 shadow-sm shadow-purple-500/5'
                                 : 'bg-card border-border hover:border-purple-100'
                             }`}
                           >
                              <div className="flex items-center gap-4">
                                 <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                                   autoAssignRules.role_ids.includes(role.id) ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground group-hover:bg-purple-100 group-hover:text-purple-600'
                                 }`}>
                                    <Target size={18} />
                                 </div>
                                 <p className={`text-sm font-black ${
                                   autoAssignRules.role_ids.includes(role.id) ? 'text-purple-900' : 'text-foreground'
                                 }`}>{role.role_name}</p>
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                autoAssignRules.role_ids.includes(role.id)
                                  ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                                  : 'border-border group-hover:border-purple-300'
                              }`}>
                                 {autoAssignRules.role_ids.includes(role.id) && <Plus size={14} className="rotate-45" />}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Global Modals */}
      {confirmModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-sm">
           <div className="bg-card rounded-lg p-8 w-full max-w-md shadow-sm border border-border animate-in zoom-in duration-200">
              <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-6 shadow-sm ${confirmModal.variant === 'danger' ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'}`}>
                 {confirmModal.variant === 'danger' ? <Trash2 size={28} /> : <Save size={28} />}
              </div>
              <h3 className="text-2xl font-black text-foreground mb-2">{confirmModal.title}</h3>
              <p className="text-muted-foreground text-sm font-medium leading-relaxed mb-8">{confirmModal.message}</p>
              <div className="flex justify-end gap-3">
                 <Button variant="outline" className="rounded-lg h-12 px-6 font-bold text-muted-foreground border-border hover:bg-muted" onClick={() => setConfirmModal(p => ({ ...p, isOpen: false }))}>Cancel Action</Button>
                 <Button 
                   className={`rounded-lg h-12 px-8 font-black shadow-sm transition-all active:scale-95 text-white ${confirmModal.variant === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-primary hover:bg-primary/95 shadow-primary-100'}`} 
                   onClick={confirmModal.onConfirm}
                 >
                   {confirmModal.confirmText || 'Confirm'}
                 </Button>
              </div>
           </div>
        </div>,
        document.body
      )}
    </div>
  );
};

