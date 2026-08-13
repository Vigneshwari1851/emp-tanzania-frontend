import React, { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from 'react-router-dom';
import { ChevronLeft, Save, Layout, Loader2 } from 'lucide-react';
import { useCourse, useAddModule, useUpdateModule } from '../api/lmsApi';
import { Button } from '@/shared/components/ui/button';
import { toast } from 'sonner';

export const ModuleEditor: React.FC = () => {
  const { courseId, moduleId } = useParams();
  const navigate = useOrgNavigate();
  const { data: course, isLoading: loadingCourse } = useCourse(parseInt(courseId!));
  const addModule = useAddModule();
  const updateModule = useUpdateModule();

  const [title, setTitle] = useState('');
  
  const isEditing = !!moduleId;

  useEffect(() => {
    if (course && moduleId) {
      const module = course.modules?.find((m: any) => m.id === parseInt(moduleId));
      if (module) {
        setTitle(module.title);
      }
    }
  }, [course, moduleId]);

  const handleSave = async () => {
    if (!title) {
      toast.error('Module title is required');
      return;
    }

    try {
      if (isEditing) {
        await updateModule.mutateAsync({ courseId: parseInt(courseId!), moduleId: parseInt(moduleId), title });
        toast.success('Module updated successfully');
      } else {
        await addModule.mutateAsync({ 
          courseId: parseInt(courseId!), 
          title,
          order: (course?.modules?.length || 0) + 1
        });
        toast.success('Module created successfully');
      }
      navigate(`/lms/courses/${courseId}`);
    } catch (error) {
      toast.error('Failed to save module');
    }
  };

  if (loadingCourse) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-card">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header Area */}
      <div className="bg-card border-b border-border sticky top-0 z-30">
        <div className="w-full px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/lms/courses/${courseId}`)}
              className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-muted"
            >
              <ChevronLeft size={18} />
            </Button>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">
                {course?.title}
              </p>
              <h1 className="text-lg font-semibold text-foreground leading-tight">
                {isEditing ? 'Edit Module' : 'Create New Module'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              className="px-5 text-gray-600"
              onClick={() => navigate(`/lms/courses/${courseId}`)}
            >
              Cancel
            </Button>
            <Button 
              size="sm"
              className="bg-primary hover:bg-primary/95 text-white px-6 font-semibold"
              onClick={handleSave}
              disabled={addModule.isPending || updateModule.isPending}
            >
              {(addModule.isPending || updateModule.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><Save className="w-4 h-4 mr-2" /> {isEditing ? 'Save Changes' : 'Create Module'}</>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full px-8 py-12">
        <div className="bg-card rounded-lg p-10 shadow-sm border border-border max-w-4xl mx-auto">
          <div className="flex items-start gap-6 mb-10 pb-10 border-b border-gray-50">
             <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary-100 shadow-sm">
                <Layout size={28} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Module Information</h2>
                <p className="text-sm text-muted-foreground font-medium">Define the core focus and name of this learning module.</p>
             </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground ml-1">Module Title</label>
              <input 
                type="text" 
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Introduction to Project Management"
                className="w-full px-5 py-4 bg-muted/50 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary font-semibold text-foreground transition-all placeholder:text-gray-300 text-lg"
              />
              <p className="text-xs text-muted-foreground ml-1 font-medium italic mt-2">
                Use a clear, concise title that describes the learning outcome for this specific section.
              </p>
            </div>
            
            <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="p-5 rounded-lg bg-blue-50/50 border border-blue-100">
                  <p className="text-xs font-bold text-blue-700 mb-1   opacity-60">Design Goal</p>
                  <p className="text-xs text-blue-800 font-medium leading-relaxed">MNC standards recommend defining specific learning objectives for each module to improve learner outcomes.</p>
               </div>
               <div className="p-5 rounded-lg bg-amber-50/50 border border-amber-100">
                  <p className="text-xs font-bold text-amber-700 mb-1   opacity-60">Focus Tip</p>
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">Keep each module focused on a single core topic. Break down complex subjects into multiple smaller modules.</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
