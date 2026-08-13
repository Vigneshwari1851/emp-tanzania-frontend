import { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Loader2,
  Globe,
  Building2,
  ImageIcon,
  X,
  Eye,
  EyeOff,
  Sparkles,
  Clock,
  User,
  Tag,
  ThumbsUp,
  Flame,
  Bookmark,
  FileText,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/Badge';
import Select from '@/shared/components/ui/Select';
import { toast } from 'sonner';
import axiosInstance from '@/shared/services/axiosInstance';
import { getNewsItem, createNews, updateNews, type NewsFormData } from '../services/news';
import { getDepartments } from '@/features/organization/services/departments';
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog';

export default function NewsForm() {
  const { id } = useParams();
  const navigate = useOrgNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  // Editor states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [accessType, setAccessType] = useState<'public' | 'department'>('public');
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Live preview tab: 'card' or 'detail'
  const [previewMode, setPreviewMode] = useState<'card' | 'detail'>('card');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
  });

  const { data: existingItem, isLoading: isFetching } = useQuery({
    queryKey: ['news', id],
    queryFn: () => getNewsItem(Number(id)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingItem) {
      setTitle(existingItem.title);
      setContent(existingItem.content);
      setAccessType(existingItem.access_type);
      setDepartmentIds((existingItem.department_ids ?? []).map(String));
      setStatus(existingItem.status === 'published' ? 'published' : 'draft');
      setImage(existingItem.image ?? null);
    }
  }, [existingItem]);

  const mutation = useMutation({
    mutationFn: (data: NewsFormData) =>
      isEdit ? updateNews(Number(id), data) : createNews(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.success(isEdit ? 'News item updated successfully' : 'News item published successfully');
      navigate('/news/manage');
    },
    onError: () => toast.error(isEdit ? 'Failed to update news item' : 'Failed to create news item'),
  });

  const uploadImage = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axiosInstance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImage(res.data.url);
      toast.success('Cover image uploaded successfully');
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    mutation.mutate({
      title: title.trim(),
      content: content.trim(),
      image,
      access_type: accessType,
      department_ids: accessType === 'department' ? departmentIds.map(Number) : undefined,
      status,
    });
  };

  if (isEdit && isFetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-3" />
        <p className="text-muted-foreground text-sm font-medium animate-pulse">Loading draft content...</p>
      </div>
    );
  }

  const departmentOptions = (departments ?? []).map((d) => ({
    value: String(d.id),
    label: d.department_name,
  }));

  // Resolve matching department names for preview
  const selectedDepartmentNames = (departments ?? [])
    .filter((d) => departmentIds.includes(String(d.id)))
    .map((d) => d.department_name);

  // Compute reading time preview
  const previewReadingTime = content.trim() ? Math.ceil(content.trim().split(/\s+/).length / 200) : 1;

  return (
    <>
      <div className="min-h-full bg-muted/50 p-4 md:p-8 font-sans text-foreground w-full overflow-y-auto">
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-6 rounded-lg border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="icon-circle-btn animate-in fade-in-50 duration-200"
              title="Back"
            >
              <ArrowLeft />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {isEdit ? 'Edit Announcement' : 'Compose News'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEdit ? 'Update the content, media, and audience criteria' : 'Write and configure a new announcement'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-border hover:bg-muted font-semibold px-5 py-2.5 h-10"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel
            </Button>
            
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-primary-600/10 px-5 rounded-xl transition-all duration-200 h-10"
            >
              {mutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEdit ? 'Update Item' : 'Publish to Feed'}
            </Button>
          </div>
        </div>

        {/* Main Workspace grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Side: Writing and Configurations Panel */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Article Contents */}
            <Card className="border border-border/80 bg-card shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b border-border/60 pb-2 mb-2">
                  <FileText className="w-4 h-4 text-primary-500" />
                  Article Contents
                </h3>
                
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Annual Company Offsite 2026 - Registration Open!"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Content</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share updates, links, guidelines, and stories here..."
                    rows={10}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors resize-y min-h-[220px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Media cover upload */}
            <Card className="border border-border/80 bg-card shadow-sm">
              <CardContent className="p-6 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b border-border/60 pb-2 mb-2">
                  <ImageIcon className="w-4 h-4 text-primary-500" />
                  Featured Banner Image
                </h3>
                
                {image ? (
                  <div className="relative rounded-xl overflow-hidden border border-border shadow-sm">
                    <img src={image} alt="Cover Preview" className="w-full max-h-48 object-cover" />
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="absolute top-2.5 right-2.5 p-1.5 bg-black/60 hover:bg-black/80 rounded-xl text-white transition-colors border border-white/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border hover:border-primary-500/50 hover:bg-primary-50/5 dark:hover:bg-primary-950/5 rounded-xl cursor-pointer transition-all duration-300">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    {uploading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-primary-600 mb-2" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                    )}
                    <p className="text-sm font-semibold text-foreground">
                      {uploading ? 'Processing Image...' : 'Click to Upload cover image'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG or WebP (Max size 2MB)</p>
                  </label>
                )}
              </CardContent>
            </Card>

            {/* Configuration Card */}
            <Card className="border border-border/80 bg-card shadow-sm">
              <CardContent className="p-6 space-y-5">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b border-border/60 pb-2 mb-2">
                  <LayoutGrid className="w-4 h-4 text-primary-500" />
                  Audience & Lifecycle Settings
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Visibility */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Visibility Scope</label>
                    <Select
                      options={[
                        { value: 'public', label: 'Company Wide' },
                        { value: 'department', label: 'Selected Departments' },
                      ]}
                      value={accessType}
                      onChange={(v) => {
                        setAccessType(v as 'public' | 'department');
                        if (v === 'public') setDepartmentIds([]);
                      }}
                      placeholder="Select visibility"
                    />
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1.5">
                      {accessType === 'public' ? (
                        <><Globe className="w-3.5 h-3.5 text-primary-500" /> Public to everyone</>
                      ) : (
                        <><Building2 className="w-3.5 h-3.5 text-primary-500" /> Restricted audience</>
                      )}
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Publish Status</label>
                    <Select
                      options={[
                        { value: 'draft', label: 'Draft / Hidden' },
                        { value: 'published', label: 'Published / Live' },
                      ]}
                      value={status}
                      onChange={(v) => setStatus(v as 'draft' | 'published')}
                      placeholder="Select status"
                    />
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1.5">
                      {status === 'draft' ? (
                        <><EyeOff className="w-3.5 h-3.5 text-amber-500" /> Hidden from employees</>
                      ) : (
                        <><Eye className="w-3.5 h-3.5 text-emerald-500" /> Visible on feeds</>
                      )}
                    </p>
                  </div>
                </div>

                {/* Department Checkboxes */}
                {accessType === 'department' && (
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Departments</label>
                    <div className="max-h-40 overflow-y-auto space-y-0.5 bg-muted/40 rounded-xl border border-border/80 p-2 custom-scrollbar">
                      {departmentOptions.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">No departments available</p>
                      ) : (
                        departmentOptions.map((opt) => (
                          <label
                            key={opt.value}
                            className="flex items-center gap-2.5 cursor-pointer hover:bg-muted/70 rounded-lg px-2.5 py-2 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={departmentIds.includes(opt.value)}
                              onChange={() => {
                                setDepartmentIds((prev) =>
                                  prev.includes(opt.value)
                                    ? prev.filter((v) => v !== opt.value)
                                    : [...prev, opt.value]
                                );
                              }}
                              className="rounded border-border text-primary-600 focus:ring-primary-500/35 h-4 w-4"
                            />
                            <span className="text-xs font-semibold text-foreground">{opt.label}</span>
                          </label>
                        ))
                      )}
                    </div>
                    {departmentIds.length > 0 && (
                      <p className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 mt-1">
                        {departmentIds.length} target departments selected
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side: Real-time Live Preview Panel */}
          <div className="space-y-6">
            <Card className="border border-border/80 bg-card shadow-sm overflow-hidden flex flex-col">
              <CardHeader className="pb-4 border-b border-border/60 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Live Feed Rendering
                </CardTitle>

                {/* Toggle Modes */}
                <div className="flex gap-1 bg-muted p-0.5 rounded-lg border border-border/40">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('card')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      previewMode === 'card'
                        ? 'bg-white dark:bg-zinc-800 text-primary-600 dark:text-primary-400 shadow-sm border border-border/40'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Card view
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('detail')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      previewMode === 'detail'
                        ? 'bg-white dark:bg-zinc-800 text-primary-600 dark:text-primary-400 shadow-sm border border-border/40'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Full view
                  </button>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 bg-muted/15 flex items-start justify-center">
                <div className="w-full max-w-lg space-y-6">
                  
                  {previewMode === 'card' ? (
                    /* Card View Render */
                    <Card className="group overflow-hidden border-border bg-card shadow-lg rounded-2xl flex flex-col justify-between select-none">
                      <div>
                        {image ? (
                          <div className="relative h-44 overflow-hidden bg-zinc-100">
                            <img
                              src={image}
                              alt="Cover uploader preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-3 left-3 flex gap-1.5">
                              {accessType === 'public' ? (
                                <Badge className="bg-primary text-white border-0 text-[10px] py-0.5 px-2 rounded-lg">
                                  Public
                                </Badge>
                              ) : (
                                <Badge className="bg-purple-600 text-white border-0 text-[10px] py-0.5 px-2 rounded-lg">
                                  Dept
                                </Badge>
                              )}
                              {status === 'draft' && (
                                <Badge className="bg-amber-500 text-white border-0 text-[10px] py-0.5 px-2 rounded-lg">
                                  Draft
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="h-40 bg-gradient-to-br from-primary-50/50 to-primary-100/30 dark:from-zinc-800/40 dark:to-zinc-950/20 flex flex-col items-center justify-center border-b border-border/80 text-muted-foreground">
                            <ImageIcon className="w-8 h-8 mb-1.5 text-zinc-300 dark:text-zinc-700" />
                            <span className="text-xs">No cover image uploaded</span>
                          </div>
                        )}

                        <div className="p-6">
                          <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {previewReadingTime} min read
                            </span>
                          </div>

                          <h3 className="text-base font-extrabold text-foreground line-clamp-2 leading-snug mb-2.5">
                            {title.trim() || 'Untitled Announcement'}
                          </h3>

                          {accessType === 'department' && selectedDepartmentNames.length > 0 && (
                            <div className="flex items-center gap-1.5 mb-3">
                              <Tag className="w-3.5 h-3.5 text-primary-500" />
                              <div className="flex flex-wrap gap-1">
                                {selectedDepartmentNames.map((name, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-300 text-[9px] font-semibold rounded-full border border-primary-100/50 dark:border-primary-900/30"
                                  >
                                    {name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                            {content.trim() || 'Add content in the editor to see it here...'}
                          </p>
                        </div>
                      </div>

                      <div className="p-6 pt-0 mt-auto border-t border-border/50">
                        <div className="flex items-center justify-between pt-3.5 mt-0.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-xs">
                              EP
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-foreground">Author (You)</span>
                              <span className="text-[8px] text-muted-foreground">Today</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-muted-foreground opacity-60">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span className="text-[9px]">Like</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    /* Full Detail Page render */
                    <div className="bg-card border border-border shadow-lg rounded-2xl p-6 space-y-5 select-none w-full animate-in fade-in duration-300">
                      {image && (
                        <div className="relative rounded-xl overflow-hidden h-44 shadow-sm border border-border/80">
                          <img src={image} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent"></div>
                          <div className="absolute bottom-3 left-4 text-white">
                            <div className="flex gap-2">
                              {accessType === 'public' ? (
                                <Badge className="bg-primary text-white border-0 text-[10px] py-0.5 px-2.5 rounded-lg">
                                  Company Wide
                                </Badge>
                              ) : (
                                <Badge className="bg-purple-600 text-white border-0 text-[10px] py-0.5 px-2.5 rounded-lg">
                                  Department
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3.5">
                        <h1 className="text-xl font-extrabold text-foreground leading-tight">
                          {title.trim() || 'Untitled Announcement'}
                        </h1>

                        <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-muted/40 border border-border/60">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                              EP
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-foreground">Author (You)</h4>
                              <p className="text-[9px] text-muted-foreground">Today</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground bg-background px-2.5 py-1 rounded-lg border border-border/85">
                            <Clock className="w-3.5 h-3.5 text-primary-500" />
                            <span>{previewReadingTime} min read</span>
                          </div>
                        </div>
                      </div>

                      {accessType === 'department' && selectedDepartmentNames.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-primary-500" />
                          <span className="text-[10px] text-muted-foreground font-semibold">Visible to:</span>
                          <div className="flex flex-wrap gap-1">
                            {selectedDepartmentNames.map((name, idx) => (
                              <Badge
                                key={idx}
                                className="bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-300 border border-primary-100/50 dark:border-primary-900/30 text-[9px] font-semibold"
                              >
                                {name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-sm text-foreground/90 border-t border-border/60 pt-4 leading-relaxed space-y-3 max-h-56 overflow-y-auto custom-scrollbar">
                        {(content.trim() || 'Add announcement contents in the text box to review formatting...').split('\n').map((para, idx) => (
                          para.trim() && (
                            <p key={idx} className="text-zinc-700 dark:text-zinc-300 text-xs">
                              {para}
                            </p>
                          )
                        ))}
                      </div>

                      <div className="border-t border-border/60 pt-4 flex items-center justify-between mt-6 opacity-60">
                        <div className="flex gap-2">
                          <button className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-lg text-[10px] font-semibold">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>Like</span>
                          </button>
                          <button className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-lg text-[10px] font-semibold">
                            <Flame className="w-3.5 h-3.5" />
                            <span>Clap</span>
                          </button>
                        </div>
                        <button className="p-1 bg-muted rounded-lg">
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      open={showCancelConfirm}
      title={isEdit ? "Discard Article Changes?" : "Discard New Article?"}
      message="Are you sure you want to leave? Any unsaved article content and settings will be lost."
      confirmLabel="Discard"
      cancelLabel="Keep Editing"
      confirmColor="red"
      onConfirm={() => {
        setShowCancelConfirm(false);
        navigate('/news/manage');
      }}
      onCancel={() => setShowCancelConfirm(false)}
    />
    </>
  );
}
