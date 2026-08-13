import React, { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from 'react-router-dom';
import { ChevronLeft, Save, Video, FileText, Layout, Upload, Loader2, PlayCircle, Eye } from 'lucide-react';
import { useCourse, useAddContent, useUpdateContent } from '../api/lmsApi';
import { Button } from '@/shared/components/ui/button';
import { toast } from 'sonner';
import { getAssetUrl } from '@/shared/utils/fileUtils';

export const LessonEditor: React.FC = () => {
  const { courseId, moduleId, lessonId } = useParams();
  const navigate = useOrgNavigate();
  const { data: course, isLoading: loadingCourse } = useCourse(parseInt(courseId!));
  const addContent = useAddContent();
  const updateContent = useUpdateContent();

  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState('VIDEO');
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [contentBody, setContentBody] = useState('');
  const [existingUrl, setExistingUrl] = useState('');

  const isEditing = !!lessonId;

  useEffect(() => {
    if (course && lessonId) {
      const module = course.modules?.find((m: any) => m.id === parseInt(moduleId!));
      const content = module?.contents?.find((c: any) => c.id === parseInt(lessonId));
      if (content) {
        setTitle(content.title);
        setContentType(content.content_type);
        setExistingUrl(content.content_url || '');
        setContentBody(content.content_body || '');
      }
    }
  }, [course, lessonId, moduleId]);

  const handleSave = async () => {
    if (!title) {
      toast.error('Lesson title is required');
      return;
    }

    const data: any = {
      courseId: parseInt(courseId!),
      title,
      content_type: contentType,
    };

    if (contentType === 'TEXT') {
      data.content_body = contentBody;
    } else if (contentFile) {
      data.content_file = contentFile;
    }

    try {
      if (isEditing) {
        await updateContent.mutateAsync({ contentId: parseInt(lessonId), ...data });
        toast.success('Lesson updated successfully');
      } else {
        await addContent.mutateAsync({ moduleId: parseInt(moduleId!), ...data });
        toast.success('Lesson created successfully');
      }
      navigate(`/lms/courses/${courseId}`);
    } catch (error) {
      toast.error('Failed to save lesson');
    }
  };

  if (loadingCourse) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentModule = course?.modules?.find((m: any) => m.id === parseInt(moduleId!));

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
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
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>{course?.title}</span>
                <span className="text-gray-300">/</span>
                <span className="text-primary font-semibold">{currentModule?.title}</span>
              </div>
              <h1 className="text-lg font-semibold text-foreground leading-tight">
                {isEditing ? 'Edit Lesson' : 'Add New Lesson'}
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
              disabled={addContent.isPending || updateContent.isPending}
            >
              {(addContent.isPending || updateContent.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><Save className="w-4 h-4 mr-2" /> {isEditing ? 'Update Lesson' : 'Publish Lesson'}</>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Content Area */}
          <div className="flex-1 space-y-6">
            <div className="bg-card rounded-lg shadow-sm border border-border p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-semibold text-foreground   opacity-60">Lesson Content</h2>
              </div>
              
              {contentType === 'TEXT' ? (
                <div className="space-y-4">
                  <textarea 
                    value={contentBody}
                    onChange={(e) => setContentBody(e.target.value)}
                    placeholder="Start writing your lesson content here... (Markdown supported)"
                    className="w-full min-h-[500px] bg-muted/50 border border-border rounded-lg p-6 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-foreground leading-relaxed resize-none"
                  />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Layout size={14} />
                    <span>Rich text editor with markdown support enabled</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept={contentType === 'VIDEO' ? 'video/*' : '.pdf'}
                      onChange={(e) => setContentFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`min-h-[400px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-4 transition-all ${contentFile ? 'bg-green-50/50 border-green-200' : 'bg-muted/50 border-border group-hover:bg-primary/10/30 group-hover:border-primary-200'}`}>
                      <div className={`w-16 h-16 rounded-lg flex items-center justify-center shadow-sm ${contentFile ? 'bg-card text-green-600' : 'bg-card text-primary'}`}>
                        <Upload size={28} />
                      </div>
                      <div className="text-center px-6">
                        <p className={`text-lg font-semibold mb-1 ${contentFile ? 'text-green-900' : 'text-foreground'}`}>
                          {contentFile ? contentFile.name : `Upload ${contentType === 'VIDEO' ? 'Video' : 'PDF Document'}`}
                        </p>
                        <p className="text-muted-foreground text-sm font-medium">
                          {contentType === 'VIDEO' ? 'MP4, WebM (Max 100MB)' : 'PDF, Docx (Max 20MB)'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {existingUrl && !contentFile && (
                    <div className="bg-card rounded-lg p-6 flex items-center justify-between border border-border shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-muted-foreground border border-border">
                          {contentType === 'VIDEO' ? <PlayCircle size={20} /> : <FileText size={20} />}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground   mb-0.5">Current Asset</p>
                          <p className="text-sm font-semibold text-foreground truncate max-w-md">{existingUrl.split('/').pop()}</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline"
                        size="sm"
                        className="h-9 px-4 border-border text-primary font-semibold"
                        onClick={() => window.open(getAssetUrl(existingUrl), '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-2" /> Preview
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Settings */}
          <div className="w-full lg:w-96 space-y-6">
            <div className="bg-card rounded-lg shadow-sm border border-border p-8 sticky top-24">
              <h3 className="text-base font-semibold text-foreground mb-6 flex items-center gap-2">
                <div className="w-1 h-5 bg-primary rounded-full" />
                Lesson Configuration
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2  ">Lesson Title</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter descriptive title"
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-3  ">Content Type</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { type: 'VIDEO', label: 'Video Lecture', icon: <Video size={16} />, desc: 'MP4, WebM format' },
                      { type: 'PDF', label: 'PDF Document', icon: <FileText size={16} />, desc: 'Reading material' },
                      { type: 'TEXT', label: 'Text Content', icon: <Layout size={16} />, desc: 'Articles, Code' }
                    ].map((item) => (
                      <button
                        key={item.type}
                        onClick={() => { setContentType(item.type); setContentFile(null); }}
                        className={`p-3 rounded-lg flex items-center gap-3 transition-all border text-left ${contentType === item.type ? 'bg-primary/10/50 border-primary-200' : 'bg-card border-border hover:bg-muted'}`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${contentType === item.type ? 'bg-primary text-white shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${contentType === item.type ? 'text-primary-900' : 'text-foreground'}`}>{item.label}</p>
                          <p className="text-[10px] font-medium text-muted-foreground truncate ">{item.desc}</p>
                        </div>
                        {contentType === item.type && (
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-border">
                   <div className="bg-amber-50/50 rounded-lg p-4 border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-700  tracking-widest mb-1">MNC Compliance</p>
                      <p className="text-[10px] font-medium text-amber-800 leading-relaxed">
                        Ensure all media content adheres to company accessibility and branding guidelines before publishing.
                      </p>
                   </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
