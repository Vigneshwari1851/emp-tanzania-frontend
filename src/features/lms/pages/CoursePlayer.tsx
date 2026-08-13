import React, { useState } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle, Circle, PlayCircle, FileText, Loader2, Menu, X, Sparkles, Plus, Target, Download, FileJson, MessageSquare, Info, Lock } from 'lucide-react';
import { useCourse, useTrackProgress } from '../api/lmsApi';
import { Button } from '@/shared/components/ui/button';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/Tabs';

export const CoursePlayer: React.FC = () => {
  const { id } = useParams();
  const navigate = useOrgNavigate();
  const { data: course, isLoading } = useCourse(parseInt(id || '0'));
  const trackProgress = useTrackProgress();
  
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeContentIndex, setActiveContentIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, any>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number, passed: boolean, totalPoints: number, earnedPoints: number } | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  // Derive completed contents from course data (assuming backend provides completed status)
  const completedContentIds = new Set<number>(
    course?.modules?.flatMap((m: any) => m.contents.filter((c: any) => c.is_completed).map((c: any) => c.id)) || []
  );

  const currentModule = course?.modules[activeModuleIndex];
  const currentContent = currentModule?.contents[activeContentIndex];

  // Enterprise Heartbeat: Track active learning time
  React.useEffect(() => {
    const timer = setInterval(() => {
      if (!quizSubmitted) setTimeSpent(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [quizSubmitted, currentContent?.id]);

  // Auto-save progress every 60 seconds of active learning
  React.useEffect(() => {
    if (timeSpent > 0 && timeSpent % 60 === 0) {
      saveProgress(false);
    }
  }, [timeSpent]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!course) return <div>Course not found</div>;

  const handleNext = () => {
    if (activeContentIndex < currentModule.contents.length - 1) {
      setActiveContentIndex(activeContentIndex + 1);
    } else if (activeModuleIndex < course.modules.length - 1) {
      setActiveModuleIndex(activeModuleIndex + 1);
      setActiveContentIndex(0);
    } else {
      toast.success('Congratulations! You have completed the course.');
      navigate('/lms/dashboard');
    }
  };

  const handlePrevious = () => {
    if (activeContentIndex > 0) {
      setActiveContentIndex(activeContentIndex - 1);
    } else if (activeModuleIndex > 0) {
      const prevModuleIndex = activeModuleIndex - 1;
      setActiveModuleIndex(prevModuleIndex);
      setActiveContentIndex(course.modules[prevModuleIndex].contents.length - 1);
    }
  };

  const saveProgress = async (showToast = true) => {
    if (!currentContent) return;
    try {
      await trackProgress.mutateAsync({
        contentId: currentContent.id,
        moduleId: currentModule.id,
        completed: true,
        timeSpent: Math.max(timeSpent, 60),
        metadata: quizResult ? JSON.stringify(quizResult) : null
      });
      if (showToast) toast.success('Progress synchronized');
    } catch (error) {
      if (showToast) toast.error('Sync failed');
    }
  };

  const markCompleted = async () => {
    await saveProgress(true);
    setQuizSubmitted(false);
    setQuizResult(null);
    setQuizAnswers({});
    handleNext();
  };

  const handleSubmitQuiz = () => {
    const quizData = JSON.parse(currentContent.content_body || '{"questions": []}');
    const questions = quizData.questions || [];
    let earnedPoints = 0;
    let totalPoints = 0;
    
    questions.forEach((q: any, idx: number) => {
      const qPoints = q.points || 1;
      totalPoints += qPoints;

      if (q.type === 'MULTI') {
        const correctSet = new Set(Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer]);
        const userSet = new Set(Array.isArray(quizAnswers[idx]) ? quizAnswers[idx] : []);
        
        const isCorrect = correctSet.size === userSet.size && [...correctSet].every(val => userSet.has(val));
        if (isCorrect) earnedPoints += qPoints;
      } else {
        if (quizAnswers[idx] === q.correctAnswer) {
          earnedPoints += qPoints;
        }
      }
    });

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 100;
    const passed = score >= (quizData.passingScore || 80);
    
    setQuizResult({ score, passed, totalPoints, earnedPoints });
    setQuizSubmitted(true);
    
    if (passed) {
      toast.success(`Passed! Your score: ${score}%`);
    } else {
      toast.error(`Required: ${quizData.passingScore || 80}%`);
    }
  };

  return (
    <div className="flex h-screen bg-card font-poppins overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#f1f1f1] border-r border-border transform transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border bg-card">
            <h2 className="font-bold text-foreground text-sm leading-tight">{course.title}</h2>
            <div className="mt-4 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500" 
                style={{ width: `${course.progress?.percentage || 0}%` }} 
              />
            </div>
            <p className="mt-1.5 text-[10px] font-bold text-muted-foreground">{course.progress?.percentage || 0}% Completed</p>
          </div>
          
          <div className="flex-1 overflow-y-auto py-2">
            {course.modules.map((module: any, mIdx: number) => (
              <div key={module.id} className="mb-4">
                <h3 className="text-xs font-bold text-foreground px-6 py-3">
                  {module.title}
                </h3>
                <div className="flex flex-col">
                  {module.contents.map((content: any, cIdx: number) => {
                    const isActive = mIdx === activeModuleIndex && cIdx === activeContentIndex;
                    const isCompleted = completedContentIds.has(content.id);
                    
                    // Logic: Is this content locked?
                    // First content is never locked. 
                    // Subsequent contents are locked if the previous one isn't completed.
                    let isLocked = false;
                    if (mIdx > 0 || cIdx > 0) {
                      const prevModuleIndex = cIdx === 0 ? mIdx - 1 : mIdx;
                      const prevContentIndex = cIdx === 0 ? course.modules[prevModuleIndex].contents.length - 1 : cIdx - 1;
                      const prevContent = course.modules[prevModuleIndex].contents[prevContentIndex];
                      if (!completedContentIds.has(prevContent.id)) {
                        isLocked = true;
                      }
                    }

                    return (
                      <button
                        key={content.id}
                        disabled={isLocked && !isActive}
                        onClick={() => { setActiveModuleIndex(mIdx); setActiveContentIndex(cIdx); }}
                        className={`w-full text-left px-6 py-2.5 text-sm transition-all flex items-center justify-between group ${
                          isActive ? 'bg-primary text-white font-medium' : 
                          isLocked ? 'text-muted-foreground cursor-not-allowed' : 
                          'hover:bg-gray-200 text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                           {isLocked ? <Lock size={12} className="opacity-50" /> : isCompleted ? <CheckCircle size={12} className={isActive ? 'text-white' : 'text-emerald-500'} /> : <Circle size={12} className="opacity-30" />}
                           <span className="truncate max-w-[140px]">{content.title}</span>
                        </div>
                        {content.content_type === 'QUIZ' && <FileJson size={12} className="opacity-50" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <div className="h-12 border-b border-border px-6 flex items-center justify-between bg-card sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 hover:bg-muted rounded-lg text-muted-foreground" onClick={() => setSidebarOpen(true)}>
              <Menu size={18} />
            </button>
            <button onClick={() => navigate('/lms/dashboard')} className="text-muted-foreground hover:text-foreground flex items-center gap-1 font-bold text-[11px] group">
               Home
            </button>
            <div className="h-4 w-[1px] bg-gray-200" />
            <span className="text-[11px] font-bold text-muted-foreground truncate max-w-[200px] sm:max-w-md">
              {course.title}
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-card">
          <div className="max-w-5xl mx-auto py-10 px-8">
            <h1 className="text-4xl font-bold text-foreground mb-8">{currentContent?.title}</h1>
            
            <div className="flex items-center justify-between mb-10">
              <Button 
                variant="ghost" 
                className="bg-[#E7E9EB] hover:bg-[#D7D9DB] text-foreground font-medium px-6 py-2 rounded flex items-center gap-2"
                onClick={handlePrevious}
                disabled={activeModuleIndex === 0 && activeContentIndex === 0}
              >
                ❮ Previous
              </Button>
              <Button 
                className="bg-primary hover:bg-primary/95 text-white font-medium px-8 py-2 rounded flex items-center gap-2"
                onClick={markCompleted}
              >
                Next ❯
              </Button>
            </div>

            <div className="aspect-video bg-gray-900 rounded-sm overflow-hidden flex items-center justify-center relative group shadow-sm">
              {currentContent?.content_type === 'VIDEO' ? (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <PlayCircle size={64} className="text-white opacity-50 group-hover:opacity-100 transition-opacity cursor-pointer" />
                </div>
              ) : currentContent?.content_type === 'QUIZ' ? (
                <div className="w-full h-full bg-card p-8 md:p-12 overflow-y-auto">
                   {!quizSubmitted ? (
                      <div className="max-w-2xl mx-auto space-y-12 py-4">
                         <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-foreground leading-tight">Practice Assessment</h3>
                            <p className="text-sm text-muted-foreground">Test your understanding with these questions based on the current module.</p>
                         </div>
                         
                         <div className="space-y-10">
                            {JSON.parse(currentContent.content_body || '{"questions": []}').questions.map((q: any, idx: number) => (
                               <div key={idx} className="space-y-4">
                                  <div className="flex items-start gap-4">
                                     <span className="text-sm font-bold text-primary mt-0.5">{idx + 1}.</span>
                                     <h4 className="text-[12px] font-medium text-foreground leading-relaxed">{q.question}</h4>
                                  </div>
                                  <div className="grid grid-cols-1 gap-2 ml-7">
                                     {q.options.map((opt: string, oIdx: number) => {
                                        const isSelected = q.type === 'MULTI' 
                                          ? Array.isArray(quizAnswers[idx]) && quizAnswers[idx].includes(oIdx)
                                          : quizAnswers[idx] === oIdx;

                                        return (
                                          <button 
                                            key={oIdx}
                                            onClick={() => {
                                              if (q.type === 'MULTI') {
                                                const current = Array.isArray(quizAnswers[idx]) ? quizAnswers[idx] : [];
                                                if (current.includes(oIdx)) {
                                                  setQuizAnswers({ ...quizAnswers, [idx]: current.filter((i: number) => i !== oIdx) });
                                                } else {
                                                  setQuizAnswers({ ...quizAnswers, [idx]: [...current, oIdx] });
                                                }
                                              } else {
                                                setQuizAnswers({ ...quizAnswers, [idx]: oIdx });
                                              }
                                            }}
                                            className={`w-full text-left p-3.5 rounded-lg border transition-all text-sm flex items-center gap-3 ${isSelected ? 'border-primary bg-primary/10/30 text-primary font-medium' : 'border-border bg-card text-gray-600 hover:border-gray-300'}`}
                                          >
                                             <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-primary' : 'border-gray-300'}`}>
                                                {isSelected && <div className="w-2 h-2 bg-primary rounded-full" />}
                                             </div>
                                             {opt}
                                          </button>
                                        );
                                     })}
                                  </div>
                               </div>
                            ))}
                         </div>
                         <div className="pt-6 border-t border-border flex items-center justify-between">
                            <p className="text-xs text-muted-foreground italic">Please answer all questions to proceed.</p>
                            <Button 
                              onClick={handleSubmitQuiz}
                              disabled={Object.keys(quizAnswers).length < JSON.parse(currentContent.content_body || '{"questions": []}').questions.length}
                              className="bg-primary hover:bg-primary/95 text-white font-bold h-10 px-8 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                            >
                               Submit Assessment
                            </Button>
                         </div>
                      </div>
                   ) : (
                      <div className="max-w-2xl mx-auto py-8 space-y-10 animate-in fade-in duration-500">
                         <div className="flex flex-col items-center text-center space-y-4">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${quizResult?.passed ? 'border-emerald-100 text-emerald-500' : 'border-rose-100 text-rose-500'}`}>
                               {quizResult?.passed ? <CheckCircle size={40} /> : <X size={40} />}
                            </div>
                            <div>
                               <h3 className="text-2xl font-bold text-foreground">{quizResult?.passed ? 'Assessment Completed' : 'Review Required'}</h3>
                               <p className="text-base text-muted-foreground mt-1">Your Score: <span className={`font-bold ${quizResult?.passed ? 'text-emerald-600' : 'text-rose-600'}`}>{quizResult?.score}%</span></p>
                               <p className="text-xs text-muted-foreground mt-1">{quizResult?.earnedPoints} of {quizResult?.totalPoints} questions correct</p>
                            </div>
                         </div>

                         <div className="space-y-6 pt-8 border-t border-border">
                            <h4 className="text-[12px] font-medium text-muted-foreground text-center">DETAILED ANALYSIS</h4>
                            <div className="space-y-4">
                               {JSON.parse(currentContent.content_body || '{"questions": []}').questions.map((q: any, idx: number) => {
                                  const isCorrect = q.type === 'MULTI' 
                                    ? Array.isArray(q.correctAnswer) && Array.isArray(quizAnswers[idx]) && q.correctAnswer.length === quizAnswers[idx].length && q.correctAnswer.every((v: any) => quizAnswers[idx].includes(v))
                                    : quizAnswers[idx] === q.correctAnswer;

                                  return (
                                    <div key={idx} className={`p-6 rounded-lg border ${isCorrect ? 'bg-emerald-50/10 border-emerald-100' : 'bg-rose-50/10 border-rose-100'}`}>
                                       <div className="flex items-start gap-4">
                                          <div className={`mt-1 ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                                             {isCorrect ? <CheckCircle size={18} /> : <X size={18} />}
                                          </div>
                                          <div className="space-y-3 flex-1">
                                             <div>
                                                <p className="text-sm font-semibold text-foreground leading-relaxed">{q.question}</p>
                                             </div>
                                             
                                             {q.explanation && (
                                               <div className="p-4 bg-card rounded-lg border border-border shadow-sm relative overflow-hidden">
                                                  <div className={`absolute top-0 left-0 w-1 h-full ${isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                  <p className="text-[10px] font-bold text-muted-foreground mb-1 flex items-center gap-2">
                                                     Explanation
                                                  </p>
                                                  <p className="text-xs font-medium text-gray-600 leading-relaxed">{q.explanation}</p>
                                               </div>
                                             )}
                                          </div>
                                       </div>
                                    </div>
                                  );
                               })}
                            </div>
                         </div>

                         <div className="flex justify-center gap-3">
                            {quizResult?.passed ? (
                               <Button onClick={markCompleted} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-10 h-11 rounded-lg transition-all active:scale-95">Next Lesson</Button>
                            ) : (
                               <Button onClick={() => { setQuizSubmitted(false); setQuizAnswers({}); }} className="bg-gray-900 hover:bg-black text-white font-bold px-10 h-11 rounded-lg transition-all active:scale-95">Try Again</Button>
                            )}
                         </div>
                      </div>
                   )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 text-gray-300">
                  <FileText size={80} />
                  <p className="font-bold text-muted-foreground">Content Preview Not Available</p>
                </div>
              )}
            </div>

            <div className="mt-16">
               <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-12 p-0 gap-8">
                     <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-primary border-b-2 border-transparent rounded-none h-full px-1 text-sm font-bold text-muted-foreground data-[state=active]:text-primary">Overview</TabsTrigger>
                     <TabsTrigger value="resources" className="data-[state=active]:bg-transparent data-[state=active]:border-primary border-b-2 border-transparent rounded-none h-full px-1 text-sm font-bold text-muted-foreground data-[state=active]:text-primary">Resources</TabsTrigger>
                     <TabsTrigger value="transcript" className="data-[state=active]:bg-transparent data-[state=active]:border-primary border-b-2 border-transparent rounded-none h-full px-1 text-sm font-bold text-muted-foreground data-[state=active]:text-primary">Transcript</TabsTrigger>
                     <TabsTrigger value="notes" className="data-[state=active]:bg-transparent data-[state=active]:border-primary border-b-2 border-transparent rounded-none h-full px-1 text-sm font-bold text-muted-foreground data-[state=active]:text-primary">Notes</TabsTrigger>
                  </TabsList>
                  
                  <div className="py-10">
                     <TabsContent value="overview">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                           <div className="lg:col-span-3 prose prose-slate max-w-none">
                              <div className="text-foreground text-lg leading-relaxed space-y-6">
                                {currentContent?.content_type === 'QUIZ' 
                                  ? "This assessment is designed to verify your understanding of the concepts covered in this module. Please answer all questions to complete the section."
                                  : (currentContent?.content_body || "This section covers the core concepts of the module. Follow the instructions and examples provided to build a solid foundation.")
                                }
                              </div>
                           </div>
                           <div className="space-y-8">
                              <div>
                                 <h4 className="text-[12px] font-medium text-[11px] text-muted-foreground mb-4 tracking-widest">Learning Outcomes</h4>
                                 <div className="space-y-3">
                                    {course.learning_objectives ? JSON.parse(course.learning_objectives).map((obj: string, i: number) => (
                                       <div key={i} className="flex gap-2">
                                          <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                          <p className="text-xs font-medium text-gray-600 leading-relaxed">{obj}</p>
                                       </div>
                                    )) : (
                                       <p className="text-xs text-muted-foreground italic">General module learning.</p>
                                    )}
                                 </div>
                              </div>
                              <div className="pt-6 border-t border-border space-y-4">
                                 <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Difficulty</span>
                                    <span className="text-xs font-bold text-foreground">{course.level || 'Beginner'}</span>
                                 </div>
                                 <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Est. Time</span>
                                    <span className="text-xs font-bold text-foreground">{course.duration || '20m'}</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </TabsContent>

                     <TabsContent value="resources">
                        <div className="max-w-3xl space-y-4">
                           {[
                             { name: 'Course Syllabus.pdf', size: '1.2 MB', type: 'PDF' },
                             { name: 'Architecture Diagrams.zip', size: '24.5 MB', type: 'ZIP' },
                             { name: 'Best Practices Guide.docx', size: '840 KB', type: 'DOC' },
                           ].map((file, i) => (
                              <div key={i} className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border hover:border-primary-100 transition-all group">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-card shadow-sm flex items-center justify-center text-primary">
                                       <Download size={20} />
                                    </div>
                                    <div>
                                       <p className="text-sm font-bold text-foreground">{file.name}</p>
                                       <p className="text-[10px] text-muted-foreground font-medium">{file.type} • {file.size}</p>
                                    </div>
                                 </div>
                                 <Button variant="ghost" className="text-primary font-black text-xs opacity-0 group-hover:opacity-100">Download</Button>
                              </div>
                           ))}
                        </div>
                     </TabsContent>

                     <TabsContent value="transcript">
                        <div className="max-w-3xl space-y-6">
                           <div className="p-6 bg-muted rounded-lg border border-border">
                              <p className="text-sm text-gray-600 leading-relaxed italic">
                                 "In this module, we'll dive deep into the architectural patterns used by modern enterprise systems. We will cover microservices, event-driven designs, and the importance of scalability in high-density environments..."
                              </p>
                           </div>
                           <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                              <Info size={14} /> Transcript is auto-generated and may contain minor inaccuracies.
                           </p>
                        </div>
                     </TabsContent>

                     <TabsContent value="notes">
                        <div className="max-w-3xl space-y-6">
                           <textarea 
                              placeholder="Type your notes here... (Auto-saves to your profile)"
                              className="w-full h-40 p-6 bg-muted border border-border rounded-lg text-sm font-medium focus:bg-card focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all resize-none"
                           />
                           <div className="flex justify-end">
                              <Button className="bg-primary text-white font-black px-8 rounded-lg text-xs h-10 shadow-sm">Save Learning Notes</Button>
                           </div>
                        </div>
                     </TabsContent>
                  </div>
               </Tabs>

               <div className="flex items-center justify-between mt-12 pt-12 border-t border-border">
                  <Button 
                    variant="ghost" 
                    className="bg-[#E7E9EB] hover:bg-[#D7D9DB] text-foreground font-medium px-6 py-2 rounded flex items-center gap-2"
                    onClick={handlePrevious}
                    disabled={activeModuleIndex === 0 && activeContentIndex === 0}
                  >
                    ❮ Previous
                  </Button>
                  <Button 
                    className="bg-primary hover:bg-primary/95 text-white font-medium px-8 py-2 rounded flex items-center gap-2 shadow-sm"
                    onClick={markCompleted}
                  >
                    Next ❯
                  </Button>
               </div>
            </div>
          </div>
        </div>

        {/* Slim Footer */}
        <div className="h-10 border-t border-gray-50 px-8 flex items-center justify-center bg-muted/50">
           <p className="text-[10px] text-muted-foreground font-medium">Enterprise Learning Management System • Professional Certification Track</p>
        </div>
      </div>
    </div>
  );
};
