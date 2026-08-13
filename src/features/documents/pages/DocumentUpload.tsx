import React, { useState, useRef, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  Info,
  Plus,
  Save,
  Check,
  X,
  FileText,
  File,
  Eye,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import Select from "@/shared/components/ui/Select";
import { StandardDatePicker } from '@/shared/components/ui/StandardDatePicker';
import { createDocument, updateDocument, getDocument, uploadDocumentFile, getDocuments, type Document } from '@/features/documents/services/documents';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog';

export const DocumentUpload: React.FC = () => {
  const navigate = useOrgNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState('Basic Info');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingDoc, setIsLoadingDoc] = useState(!!editId);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Form State
  const [docName, setDocName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [author, setAuthor] = useState('Sarah Chen');
  const [language, setLanguage] = useState('English');
  
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [accessLevel, setAccessLevel] = useState('Public');
  const [enableDownload, setEnableDownload] = useState(true);
  const [enableComments, setEnableComments] = useState(true);

  const [version, setVersion] = useState('1.0');
  const [versionNotes, setVersionNotes] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);

  const [expiryDate, setExpiryDate] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [notifyOnUpload, setNotifyOnUpload] = useState(true);
  const [notifyDepts, setNotifyDepts] = useState(false);

  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [isCatOpen, setIsCatOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(event.target as Node)) {
        setIsCatOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await getDocuments();
        const cats = Array.from(new Set(data.map((d: Document) => d.category).filter(Boolean)));
        setExistingCategories(cats);
      } catch (err) {
        console.error('Failed to load existing categories', err);
      }
    })();
  }, []);


  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        setIsLoadingDoc(true);
        const doc = await getDocument(Number(editId));
        setDocName(doc.title);
        setDescription(doc.description);
        setCategory(doc.category);
        setAccessLevel(doc.access);
        setVersion(doc.version || '1.0');
        setTags(Array.isArray(doc.tags) ? doc.tags : []);
      } catch (err) {
        toast.error('Failed to load document');
        navigate('/documents');
      } finally {
        setIsLoadingDoc(false);
      }
    })();
  }, [editId]);

  const departmentsList = [
    "Engineering", "Human Resources",
    "Finance", "Marketing",
    "Sales", "Operations",
    "Product", "Legal & Compliance"
  ];

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFilePreviewUrl(null);
    }
  }, [file]);

  const validateUploadedFile = (file: File): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExts = ['pdf', 'jpg', 'jpeg', 'png'];
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    
    const isValidFormat = allowedExts.includes(ext) || allowedTypes.includes(file.type);
    const maxSize = 20 * 1024 * 1024; // 20 MB

    if (!isValidFormat) {
      toast.error("Invalid file type. Please upload a PDF, JPG, JPEG, or PNG file.");
      return false;
    }

    if (file.size > maxSize) {
      toast.error("File size exceeds the maximum limit of 20 MB. Please upload a smaller file.");
      return false;
    }

    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (validateUploadedFile(selected)) {
        setFile(selected);
        if (!docName) setDocName(selected.name.replace(/\.[^/.]+$/, ""));
      } else {
        setFile(null);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (validateUploadedFile(selected)) {
        setFile(selected);
        if (!docName) setDocName(selected.name.replace(/\.[^/.]+$/, ""));
      } else {
        setFile(null);
        e.target.value = ""; // Clear file picker value
      }
    }
  };

  const toggleDept = (dept: string) => {
    if (dept === 'All') {
      if (selectedDepts.length === departmentsList.length) {
        setSelectedDepts([]);
      } else {
        setSelectedDepts([...departmentsList]);
      }
    } else {
      setSelectedDepts(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const tabForCategory = (cat: string): string => {
    return cat.toLowerCase().trim();
  };


  const handleUpload = async () => {
    if (!docName || !category) return;
    if (!editId && !file) return;
    setIsUploading(true);
    try {
      let file_url = '';
      let file_type = '';
      let file_size = 0;

      if (file) {
        const uploadResult = await uploadDocumentFile(file);
        file_url = uploadResult.file_url;
        file_type = uploadResult.file_type;
        file_size = uploadResult.file_size;
      }

      const target_department = selectedDepts.length === 0 || selectedDepts.includes('All') || selectedDepts.length === departmentsList.length
        ? 'All Departments'
        : selectedDepts.join(', ');

      const payload = {
        title: docName,
        description: description || 'New document uploaded.',
        category: category,
        tab: tabForCategory(category),
        file_url,
        file_type,
        file_size,
        is_restricted: accessLevel === 'Restricted',
        tags: tags.length > 0 ? tags : undefined,
        version: version,
        target_department,
      };

      if (editId) {
        await updateDocument(Number(editId), payload);
        toast.success('Document updated successfully');
      } else {
        await createDocument(payload);
        toast.success('Document uploaded successfully');
      }
      navigate('/documents');
    } catch (err) {
      console.error('Upload failed', err);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const tabs = ["Basic Info", "Access & Permissions", "Version Control", "Advanced"];

  return (
    <div className="min-h-full bg-muted/50 p-4 md:p-8 font-sans text-foreground w-full overflow-y-auto">
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-6 rounded-lg border border-border shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowCancelConfirm(true)}
              className="icon-circle-btn"
              title="Back to Document Hub"
            >
              <ArrowLeft />
            </button>
            <h1 className="text-xl font-bold text-foreground">
              {editId ? "Edit Document" : "Add Document"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleUpload}
              className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[150px]"
              disabled={(editId ? false : !file) || !docName || !category || isUploading || isLoadingDoc}
            >
              {isLoadingDoc ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isUploading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : editId ? (
                "Update Document"
              ) : (
                "Upload Document"
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Main Content Area */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* File Upload Box */}
            <div className="bg-card rounded-lg border border-border shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-bold text-foreground mb-1">File Upload</h2>
              <p className="text-sm text-muted-foreground mb-6">{editId ? 'Upload a new file to replace the existing one (optional)' : 'Upload one or multiple files for this document'}</p>

              {!file ? (
                <div 
                  className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    dragActive ? "border-primary bg-primary/5" : "border-slate-300 dark:border-slate-600 bg-muted/50 hover:bg-muted/50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleChange}
                  />
                  <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                  <div className="text-foreground font-semibold text-base mb-1">Drag and drop files here, or click to browse</div>
                  <div className="text-muted-foreground text-xs">Supported formats: PDF, JPG, JPEG, PNG (Max 20MB per file)</div>
                </div>
              ) : (
                <div className="border border-border rounded-lg bg-muted/50 p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                  <div className="absolute top-4 right-4 flex items-center gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    {filePreviewUrl && (
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          window.open(filePreviewUrl, '_blank');
                        }}
                        className="p-2 bg-card border border-border text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-all shadow-sm"
                        title="Preview Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => setFile(null)}
                      className="p-2 bg-card border border-border text-muted-foreground hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all shadow-sm"
                      title="Remove File"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Clean Document Icon Box */}
                  <div className="w-32 h-40 bg-card border border-border shadow-sm rounded-lg mb-6 flex flex-col items-center justify-center relative group-hover:shadow-sm transition-shadow overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary rounded-t-xl"></div>
                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-lg flex items-center justify-center border border-primary/20">
                      <FileText className="w-8 h-8" />
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <h4 className="text-[12px] font-medium text-foreground mb-1 truncate max-w-xs">{file.name}</h4>
                    <p className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                      <span>{formatBytes(file.size)}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                      <span className="uppercase">{file.name.split('.').pop()} Document</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Multi-Tab Form */}
            <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              {/* Tabs */}
              <div className="flex items-center overflow-x-auto border-b border-border bg-muted/50">
                {tabs.map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 min-w-[150px] py-3 px-4 text-sm font-semibold transition-all ${
                      activeTab === tab 
                        ? "text-primary border-b-2 border-primary" 
                        : "text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="p-6 sm:p-8">
                
                {/* BASIC INFO TAB */}
                {activeTab === "Basic Info" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-1">Document Name *</label>
                      <input 
                        type="text" 
                        placeholder="Enter document name"
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:bg-card transition-colors"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">A clear, descriptive name for the document</p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-foreground mb-1">Description *</label>
                      <textarea 
                        placeholder="Provide a detailed description of the document content and purpose"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:bg-card transition-colors resize-none"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">Help others understand what this document contains</p>
                    </div>

                     <div className="relative" ref={catRef}>
                      <label className="block text-sm font-bold text-foreground mb-1">Category *</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Select or type a category"
                          value={category}
                          onChange={(e) => {
                            setCategory(e.target.value);
                            setIsCatOpen(true);
                          }}
                          onFocus={() => setIsCatOpen(true)}
                          className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:bg-card transition-colors pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setIsCatOpen(!isCatOpen)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                        >
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isCatOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      {isCatOpen && (
                        <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto z-50 py-1">
                          {existingCategories.length > 0 ? (
                            <>
                              {existingCategories
                                .filter(cat => !category || cat.toLowerCase().includes(category.toLowerCase()))
                                .map(cat => (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => {
                                      setCategory(cat);
                                      setIsCatOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                                  >
                                    {cat}
                                  </button>
                                ))}
                              {category && !existingCategories.some(c => c.toLowerCase() === category.toLowerCase()) && (
                                <button
                                  type="button"
                                  onClick={() => setIsCatOpen(false)}
                                  className="w-full text-left px-4 py-2.5 text-sm text-primary font-semibold hover:bg-muted/50 transition-colors border-t border-border mt-1"
                                >
                                  + Create category "{category}"
                                </button>
                              )}
                            </>
                          ) : (
                            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                              Type to create a new category
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1.5">Select an existing category or type a new one to create it dynamically</p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-foreground mb-1">Tags</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Add tags (press Enter)"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addTag()}
                          className="w-full bg-muted/50 border border-border rounded-lg pl-4 pr-12 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:bg-card transition-colors"
                        />
                        <button 
                          onClick={addTag}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary hover:bg-primary/80 text-primary-foreground rounded-sm flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {tags.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-muted text-slate-600 dark:text-slate-400 rounded-sm text-xs font-semibold flex items-center gap-1">
                              {tag}
                              <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-foreground mb-1">Author</label>
                        <input 
                          type="text" 
                          value={author}
                          onChange={(e) => setAuthor(e.target.value)}
                          className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:bg-card transition-colors"
                        />
                      </div>
                      <div>
                        <Select
                          value={language}
                          onChange={(val) => setLanguage(val)}
                          label="Language"
                          options={[
                            { value: "English", label: "English" },
                            { value: "Spanish", label: "Spanish" },
                            { value: "French", label: "French" },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ACCESS & PERMISSIONS TAB */}
                {activeTab === "Access & Permissions" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-3">Departments * (Select all that apply)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label 
                          onClick={(e) => { e.preventDefault(); toggleDept('All'); }}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedDepts.length === departmentsList.length ? 'border-primary bg-primary/5 dark:bg-blue-950/30' : 'border-border hover:bg-muted/50'}`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedDepts.length === departmentsList.length ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                            {selectedDepts.length === departmentsList.length && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className="text-sm font-bold text-foreground">All Departments</span>
                        </label>
                        {departmentsList.map(dept => (
                          <label 
                            key={dept} 
                            onClick={(e) => {
                              e.preventDefault(); // Prevent default label behavior since there's no input
                              toggleDept(dept);
                            }}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedDepts.includes(dept) ? 'border-primary bg-primary/5 dark:bg-blue-950/30' : 'border-border hover:bg-muted/50'}`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedDepts.includes(dept) ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                              {selectedDepts.includes(dept) && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <span className="text-sm font-medium text-foreground">{dept}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border">
                      <div>
                        <label className="block text-sm font-bold text-foreground mb-1">Access Level *</label>
                        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
                          <div>
                            <div className="text-sm font-bold text-foreground">Public</div>
                            <div className="text-xs text-muted-foreground">All employees can view and download</div>
                          </div>
                      <Select
                        value={accessLevel}
                        onChange={(val) => setAccessLevel(val)}
                        options={[
                          { value: "Public", label: "Public" },
                          { value: "Restricted", label: "Restricted" },
                          { value: "Private", label: "Private" },
                        ]}
                      />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
                        <div>
                          <div className="text-sm font-bold text-foreground">Enable Download</div>
                          <div className="text-xs text-muted-foreground">Allow users to download this document</div>
                        </div>
                        <button 
                          onClick={() => setEnableDownload(!enableDownload)}
                          className={`w-11 h-6 rounded-full transition-colors relative ${enableDownload ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                          <div className={`w-4 h-4 bg-card rounded-full absolute top-1 transition-transform ${enableDownload ? 'left-6' : 'left-1'}`}></div>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
                        <div>
                          <div className="text-sm font-bold text-foreground">Enable Comments</div>
                          <div className="text-xs text-muted-foreground">Allow users to leave comments and feedback</div>
                        </div>
                        <button 
                          onClick={() => setEnableComments(!enableComments)}
                          className={`w-11 h-6 rounded-full transition-colors relative ${enableComments ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                          <div className={`w-4 h-4 bg-card rounded-full absolute top-1 transition-transform ${enableComments ? 'left-6' : 'left-1'}`}></div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* VERSION CONTROL TAB */}
                {activeTab === "Version Control" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-1">Version Number</label>
                      <input 
                        type="text" 
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:bg-card transition-colors"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">Semantic versioning recommended (e.g., 1.0, 1.1, 2.0)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-foreground mb-1">Version Notes</label>
                      <textarea 
                        placeholder="Describe changes in this version..."
                        value={versionNotes}
                        onChange={(e) => setVersionNotes(e.target.value)}
                        rows={3}
                        className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:bg-card transition-colors resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50 mt-4">
                      <div>
                        <div className="text-sm font-bold text-foreground">Replace Existing Document</div>
                        <div className="text-xs text-muted-foreground">Update an existing document with this new version</div>
                      </div>
                      <button 
                        onClick={() => setReplaceExisting(!replaceExisting)}
                        className={`w-11 h-6 rounded-full transition-colors relative ${replaceExisting ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                      >
                        <div className={`w-4 h-4 bg-card rounded-full absolute top-1 transition-transform ${replaceExisting ? 'left-6' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>
                )}

                {/* ADVANCED TAB */}
                {activeTab === "Advanced" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-1">Expiry Date (Optional)</label>
                      <StandardDatePicker 
                        value={expiryDate}
                        onChange={setExpiryDate}
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">Document will be automatically archived after this date</p>
                    </div>

                    <div className="space-y-4 mt-6">
                      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
                        <div>
                          <div className="text-sm font-bold text-foreground">Require Approval</div>
                          <div className="text-xs text-muted-foreground">Document must be approved before publication</div>
                        </div>
                        <button 
                          onClick={() => setRequireApproval(!requireApproval)}
                          className={`w-11 h-6 rounded-full transition-colors relative ${requireApproval ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                          <div className={`w-4 h-4 bg-card rounded-full absolute top-1 transition-transform ${requireApproval ? 'left-6' : 'left-1'}`}></div>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
                        <div>
                          <div className="text-sm font-bold text-foreground">Notify on Upload</div>
                          <div className="text-xs text-muted-foreground">Send notification to relevant users</div>
                        </div>
                        <button 
                          onClick={() => setNotifyOnUpload(!notifyOnUpload)}
                          className={`w-11 h-6 rounded-full transition-colors relative ${notifyOnUpload ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                          <div className={`w-4 h-4 bg-card rounded-full absolute top-1 transition-transform ${notifyOnUpload ? 'left-6' : 'left-1'}`}></div>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
                        <div>
                          <div className="text-sm font-bold text-foreground">Notify Departments</div>
                          <div className="text-xs text-muted-foreground">Notify all members of selected departments</div>
                        </div>
                        <button 
                          onClick={() => setNotifyDepts(!notifyDepts)}
                          className={`w-11 h-6 rounded-full transition-colors relative ${notifyDepts ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                          <div className={`w-4 h-4 bg-card rounded-full absolute top-1 transition-transform ${notifyDepts ? 'left-6' : 'left-1'}`}></div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            
            {/* Upload Progress */}
            <div className="bg-card rounded-lg border border-border shadow-sm p-6">
              <h3 className="font-bold text-foreground mb-6">{editId ? 'Document Info' : 'Upload Progress'}</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Files Uploaded</span>
                  <span className="font-bold text-foreground">{file ? '1' : '0'}</span>
                </div>
                <div className="h-px bg-muted"></div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Size</span>
                  <span className="font-bold text-foreground">{file ? formatBytes(file.size) : '0 Bytes'}</span>
                </div>
                <div className="h-px bg-muted"></div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Departments</span>
                  <span className="font-bold text-foreground">{selectedDepts.length}</span>
                </div>
                <div className="h-px bg-muted"></div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Access Level</span>
                  <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded">{accessLevel}</span>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-card rounded-lg border border-border shadow-sm p-6">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" /> Quick Tips
              </h3>
              
              <ul className="space-y-3">
                {[
                  "Use descriptive names and tags for better searchability",
                  "Select appropriate departments to ensure visibility",
                  "Add version notes to track document changes",
                  "Set expiry dates for time-sensitive documents",
                  "Use approval workflow for sensitive documents"
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="mt-0.5 leading-tight">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Form Status */}
            <div className="bg-card rounded-lg border border-border shadow-sm p-6">
              <h3 className="font-bold text-foreground mb-4">Form Status</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${docName ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600 bg-card'}`}>
                    {docName && <Check className="w-2 h-2 text-primary-foreground" />}
                  </div>
                  <span className={docName ? "text-foreground" : "text-muted-foreground"}>Document Name</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${file ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600 bg-card'}`}>
                    {file && <Check className="w-2 h-2 text-primary-foreground" />}
                  </div>
                  <span className={file ? "text-foreground" : "text-muted-foreground"}>File Upload</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${category ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600 bg-card'}`}>
                    {category && <Check className="w-2 h-2 text-primary-foreground" />}
                  </div>
                  <span className={category ? "text-foreground" : "text-muted-foreground"}>Category</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${selectedDepts.length > 0 ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600 bg-card'}`}>
                    {selectedDepts.length > 0 && <Check className="w-2 h-2 text-primary-foreground" />}
                  </div>
                  <span className={selectedDepts.length > 0 ? "text-foreground" : "text-muted-foreground"}>Departments</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        title={editId ? "Discard Document Changes?" : "Discard New Document?"}
        message="Are you sure you want to leave? Any unsaved document details and file uploads will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        confirmColor="red"
        onConfirm={() => {
          setShowCancelConfirm(false);
          navigate('/documents');
        }}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
};
