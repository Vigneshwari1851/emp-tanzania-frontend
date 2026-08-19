import React, { useState, useMemo, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import {
  Search,
  BookOpen,
  FileText,
  Download,
  Eye,
  Star,
  Filter,
  ChevronDown,
  Book,
  Scale,
  Monitor,
  Calendar,
  Briefcase,
  X,
  FileDown,
  FileCheck2,
  Plus,
  LayoutGrid,
  List,
  Loader2,
  Edit,
  Trash2,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { 
  getDocuments, 
  deleteDocument, 
  type Document, 
  downloadDocumentAction, 
  starDocumentAction 
} from '@/features/documents/services/documents';
import { usePermissions } from '@/features/rbac/hooks/usePermissions';
import { useAuth } from '@/shared/context/AuthContext';
import { Permission } from '@/shared/types/rbac';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/shared/components/ui/ConfirmationDialog';

const TAB_DEFS: Record<string, { label: string; icon: any }> = {
  learning: { label: "Learning Docs", icon: BookOpen },
  conduct: { label: "Conduct & Workplace", icon: Scale },
  operational: { label: "Operational & IT", icon: Monitor },
  leave: { label: "Leave Policies", icon: Calendar },
  statutory: { label: "Statutory & Onboarding", icon: Briefcase },
};

const getTagsArray = (tagsVal: any): string[] => {
  if (!tagsVal) return [];
  if (Array.isArray(tagsVal)) return tagsVal;
  if (typeof tagsVal === 'string') {
    try {
      const parsed = JSON.parse(tagsVal);
      if (Array.isArray(parsed)) return parsed as string[];
    } catch {
      return tagsVal.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
};

const formatTagLabel = (tag: string) => {
  if (!tag) return '';
  return tag.charAt(0).toUpperCase() + tag.slice(1);
};


export const DocumentHub: React.FC = () => {
  const navigate = useOrgNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isSelfView = localStorage.getItem('sidebar_view_mode') === 'self' || location.state?.selfView === true;
  const rawRole = Array.isArray(user?.role) ? (user?.role[0] || '') : (user?.role || '');
  const normalizedRole = (typeof rawRole === 'string' ? rawRole : '').toUpperCase().replace(/[\s_]+/g, '');
  const isEmployee = normalizedRole === 'EMPLOYEE' || normalizedRole === 'USER';
  const { can } = usePermissions();
  const canManage = can(Permission.MANAGE_DOCUMENTS) && !isSelfView;
  const [docs, setDocs] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [starredIds, setStarredIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('empxp_starred_docs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('empxp_starred_docs', JSON.stringify(starredIds));
  }, [starredIds]);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      setIsLoading(true);
      const data = await getDocuments();
      setDocs(data);
    } catch (err) {
      console.error('Failed to fetch documents', err);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useState("all");
  const [activeTag, setActiveTag] = useState("All");
  const [isTagsDropdownOpen, setIsTagsDropdownOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [accessFilter, setAccessFilter] = useState<"All Access" | "Public" | "Restricted" | "Starred Only">("All Access");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal State
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [deleteDocTarget, setDeleteDocTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDownload = async (doc: Document) => {
    if (!doc.file_url) {
      toast.error("No file available for download");
      return;
    }
    
    setIsDownloading(doc.id);
    
    // Call backend to log the download action
    downloadDocumentAction(Number(doc.id)).catch(err => {
      console.error('Failed to log document download:', err);
    });

    try {
      const response = await fetch(`${window.location.origin}${doc.file_url}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Get the filename from the path or default to document title
      const filename = doc.file_url.split('/').pop() || `${doc.title.replace(/\s+/g, '_')}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download file:', err);
      // Fallback: open in new tab
      window.open(`${window.location.origin}${doc.file_url}`, '_blank');
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDeleteDoc = async () => {
    if (!deleteDocTarget) return;
    try {
      setIsDeleting(true);
      await deleteDocument(Number(deleteDocTarget));
      setDocs(prev => prev.filter(d => d.id !== deleteDocTarget));
      toast.success('Document deleted');
    } catch (err) {
      toast.error('Failed to delete document');
    } finally {
      setIsDeleting(false);
      setDeleteDocTarget(null);
    }
  };

  const toggleStar = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    setStarredIds(prev => {
      const isStarred = prev.includes(docId);
      
      // Call backend to log the star/unstar action
      starDocumentAction(Number(docId), !isStarred).catch(err => {
        console.error('Failed to log document star action:', err);
      });
      
      return isStarred ? prev.filter(id => id !== docId) : [...prev, docId];
    });
  };

  const dynamicTabs = useMemo(() => {
    const list = [{ id: "all", label: "All Documents", icon: FileText }];
    
    // Get all unique tab values from documents
    const presentTabs = new Set(docs.map(d => d.tab).filter(Boolean));
    
    // Add known categories in their predefined order if they are present in the documents
    Object.keys(TAB_DEFS).forEach(catId => {
      // Find if we have a matching tab (case-insensitive)
      const matchingTab = Array.from(presentTabs).find(t => t.toLowerCase() === catId);
      if (matchingTab) {
        list.push({ id: catId, label: TAB_DEFS[catId].label, icon: TAB_DEFS[catId].icon });
        presentTabs.delete(matchingTab);
      }
    });
    
    // Append any other custom tabs that are present
    presentTabs.forEach(tab => {
      const lower = tab.toLowerCase();
      if (lower === 'all') return;
      const label = tab.split(/[\s_-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      list.push({
        id: lower,
        label: label, // Display capitalized
        icon: FileText
      });
    });
    
    return list;
  }, [docs]);

  // Ensure active tab is reset to "all" if the current active tab disappears
  useEffect(() => {
    const tabExists = dynamicTabs.some(t => t.id === activeTab);
    if (!tabExists) {
      setActiveTab("all");
    }
  }, [dynamicTabs, activeTab]);

  const dynamicTags = useMemo(() => {
    const tagsSet = new Set<string>();
    
    // Extract tags from documents matching the current tab
    const relevantDocs = docs.filter(doc => 
      activeTab === "all" || (doc.tab && doc.tab.toLowerCase() === activeTab)
    );

    relevantDocs.forEach(doc => {
      const tagsList = getTagsArray(doc.tags);
      tagsList.forEach(tag => {
        if (tag) tagsSet.add(tag.trim());
      });
    });

    return ["All", ...Array.from(tagsSet)];
  }, [docs, activeTab]);

  const visibleTags = useMemo(() => {
    return dynamicTags.slice(0, 4);
  }, [dynamicTags]);

  const hiddenTags = useMemo(() => {
    return dynamicTags.slice(4);
  }, [dynamicTags]);

  const isHiddenTagActive = useMemo(() => {
    return hiddenTags.some(t => t.toLowerCase() === activeTag.toLowerCase());
  }, [hiddenTags, activeTag]);

  const docsWithStarred = useMemo(() =>
    docs.map(doc => ({ ...doc, isStarred: starredIds.map(String).includes(String(doc.id)) })),
    [docs, starredIds]
  );

  const filteredDocs = useMemo(() => {
    return docsWithStarred.filter(doc => {
      if (activeTab !== "all" && (!doc.tab || doc.tab.toLowerCase() !== activeTab)) return false;
      
      // Filter by tag if selected
      if (activeTag !== "All") {
        const tagsList = getTagsArray(doc.tags);
        const hasTag = tagsList.some(tag => tag.toLowerCase().trim() === activeTag.toLowerCase());
        if (!hasTag) return false;
      }

      if (accessFilter !== "All Access") {
        if (accessFilter === "Starred Only" && !doc.isStarred) return false;
        if (accessFilter === "Public" && doc.access !== "Public") return false;
        if (accessFilter === "Restricted" && doc.access !== "Restricted") return false;
      }
      
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const tagsList = getTagsArray(doc.tags);
        const matchesTags = tagsList.some((tag: string) => tag.toLowerCase().includes(query));
        
        const titleMatch = doc.title ? doc.title.toLowerCase().includes(query) : false;
        const descMatch = doc.description ? doc.description.toLowerCase().includes(query) : false;
        const catMatch = doc.category ? doc.category.toLowerCase().includes(query) : false;

        if (!titleMatch && !descMatch && !catMatch && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  }, [activeTab, activeTag, accessFilter, searchQuery, docsWithStarred]);

  const hasActiveFilters = useMemo(() => {
    return accessFilter !== "All Access" || searchQuery.trim() !== "" || activeTag !== "All";
  }, [accessFilter, searchQuery, activeTag]);

  const handleClearFilters = () => {
    setAccessFilter("All Access");
    setSearchQuery("");
    setActiveTag("All");
  };

  return (
    <div className="space-y-4 w-full min-w-0 font-sans text-foreground animate-in fade-in duration-300">
      <div>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex items-center justify-center shrink-0 text-primary">
              <BookOpen className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Document Hub</h1>
              <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">Official policies, guides, and statutory documents · {filteredDocs.length} documents</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all shadow-sm"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 bg-card border hover:border-slate-300 dark:hover:border-slate-600 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all shadow-sm ${
                  accessFilter !== "All Access"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20" 
                    : "border-border text-foreground"
                }`}
              >
                <Filter className="w-4 h-4 text-primary" />
                <span>
                  {accessFilter}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
              </button>

              {isFilterOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsFilterOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-sm overflow-hidden z-20">
                    {(["All Access", "Public", "Restricted", "Starred Only"] as const).map(option => (
                      <button
                        key={option}
                        onClick={() => { setAccessFilter(option); setIsFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${accessFilter === option
                          ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-l-2 border-blue-500 font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-muted/50 font-medium"
                          }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
            {!isSelfView && !isEmployee && (
              <button
                onClick={() => navigate('/documents/upload')}
                className="px-4 py-2.5 bg-primary hover:bg-primary/70 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm shadow-blue-500/20 transition-all active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Upload Document
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide border-b border-border">
          {dynamicTabs.map(tab => {
            // Calculate document count for each tab
            const count = tab.id === "all"
              ? docs.length
              : docs.filter(d => d.tab && d.tab.toLowerCase() === tab.id).length;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setActiveTag("All");
                }}
                className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id
                  ? "text-primary border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
                  }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} />
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold" : "bg-muted text-muted-foreground"}
                  }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tags / Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
          <div className={`flex items-center gap-2 pb-2 flex-1 min-w-0 ${isTagsDropdownOpen ? 'overflow-visible' : 'overflow-x-auto scrollbar-hide'}`}>
            {visibleTags.map(tag => (
              <button
                key={tag}
                onClick={() => {
                  setActiveTag(tag);
                  setIsTagsDropdownOpen(false);
                }}
                className={`px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-all whitespace-nowrap ${activeTag.toLowerCase() === tag.toLowerCase()
                  ? "border-blue-600 bg-primary text-white shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-blue-600/50 hover:text-foreground shadow-sm"
                  }`}
              >
                {tag === "All" ? "All Tags" : formatTagLabel(tag)}
              </button>
            ))}

            {hiddenTags.length > 0 && (
              <div className="relative overflow-visible">
                <button
                  onClick={() => setIsTagsDropdownOpen(!isTagsDropdownOpen)}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-all whitespace-nowrap flex items-center gap-1.5 ${isHiddenTagActive
                    ? "border-blue-600 bg-primary text-white shadow-sm font-bold"
                    : "border-border bg-card text-muted-foreground hover:border-blue-600/50 hover:text-foreground shadow-sm"
                    }`}
                >
                  {isHiddenTagActive ? formatTagLabel(activeTag) : "More..."}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {isTagsDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsTagsDropdownOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-1.5 z-20 max-h-60 overflow-y-auto scrollbar-thin">
                      {hiddenTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => {
                            setActiveTag(tag);
                            setIsTagsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${activeTag.toLowerCase() === tag.toLowerCase()
                            ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-l-2 border-blue-500 font-bold"
                            : "text-slate-600 dark:text-slate-400 hover:bg-muted/50 font-medium"
                            }`}
                        >
                          {formatTagLabel(tag)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center bg-card border border-border rounded-lg p-1 shadow-sm hidden sm:flex shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-sm transition-colors ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-slate-600 dark:hover:text-slate-300'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-sm transition-colors ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-slate-600 dark:hover:text-slate-300'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Grid / List */}
        <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4' : 'flex flex-col gap-3 pt-4'}`}>
          {isLoading ? (
            <div className="col-span-full flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredDocs.length > 0 ? filteredDocs.map(doc => (
            viewMode === 'grid' ? (
              <div
                key={doc.id}
                className="group bg-card border border-border hover:border-blue-300 dark:hover:border-blue-700 rounded-lg p-4 transition-all duration-300 hover:shadow-sm shadow-sm flex flex-col relative overflow-hidden min-h-[290px]"
              >

                <div className="flex justify-between items-start mb-3.5">
                  <div className="flex items-center gap-2.5 shrink-0">
                    <FileText className={`w-6 h-6 shrink-0 ${doc.type === "PDF" ? "text-red-500" : "text-blue-500"}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.isNew && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider shadow-sm">New</span>}
                    {doc.isUpdated && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 uppercase tracking-wider shadow-sm">Updated</span>}
                    <button
                      className="p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 group/star transition-colors"
                      onClick={(e) => toggleStar(e, doc.id)}
                    >
                      <Star className={`w-4 h-4 transition-colors ${doc.isStarred ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600 group-hover/star:text-amber-300"}`} />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-foreground leading-tight mb-1.5 group-hover:text-primary transition-colors truncate" title={doc.title}>
                  {doc.title}
                </h3>

                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-2.5">
                  {doc.description}
                </p>

                {getTagsArray(doc.tags).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {getTagsArray(doc.tags).map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-primary text-[10px] font-semibold rounded-sm">
                        {formatTagLabel(tag)}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2.5 mb-4">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <div className={`w-1.5 h-1.5 rounded-full ${doc.access === 'Public' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]'}`}></div>
                    {doc.access}
                  </div>
                </div>

                <div className="mt-auto mb-3">
                  <span className="px-2 py-0.5 bg-muted text-slate-600 dark:text-slate-400 text-[9px] font-bold rounded-sm uppercase tracking-wider border border-border w-max">
                    {doc.category}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3.5 border-t border-border">
                  <div className="flex flex-col gap-1 text-[10px] font-medium text-muted-foreground">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                    Updated {doc.updatedAt}
                  </div>
                  <div className="flex items-center gap-1 font-bold uppercase tracking-wider text-[10px]">
                    <span className={doc.type === "PDF" ? "text-red-500" : "text-blue-500"}>{doc.type}</span>
                    <span className="text-slate-300 dark:text-slate-600 font-normal">•</span>
                    <span className="text-slate-500 dark:text-slate-400">{doc.size}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="mini-icon-btn"
                      title="Preview"
                    >
                      <Eye />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={isDownloading === doc.id}
                      className="mini-icon-btn"
                      title="Download"
                    >
                      {isDownloading === doc.id ? (
                        <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block"></span>
                      ) : (
                        <Download />
                      )}
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={() => navigate(`/documents/upload?id=${doc.id}`)}
                          className="mini-icon-btn"
                          title="Edit"
                        >
                          <Edit />
                        </button>
                        <button
                          onClick={() => setDeleteDocTarget(doc.id)}
                          className="mini-icon-btn-reject"
                          title="Delete"
                        >
                          <Trash2 />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={doc.id}
                className="group bg-card border border-border hover:border-blue-300 dark:hover:border-blue-700 rounded-lg p-4 transition-all duration-300 hover:shadow-sm shadow-sm flex items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <FileText className={`w-6 h-6 shrink-0 ${doc.type === "PDF" ? "text-red-500" : "text-blue-500"}`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {doc.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className={`font-bold ${doc.type === "PDF" ? "text-red-500" : "text-blue-500"}`}>{doc.type}</span>
                      <span>•</span>
                      <span>{doc.size}</span>
                      <span>•</span>
                      <span className="truncate">{doc.category}</span>
                      <span>•</span>
                      <span>Updated {doc.updatedAt}</span>
                      {getTagsArray(doc.tags).length > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex flex-wrap items-center gap-1.5">
                            {getTagsArray(doc.tags).map((tag: string) => (
                              <span key={tag} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-primary text-[9px] font-semibold rounded-sm">
                                {formatTagLabel(tag)}
                              </span>
                            ))}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden md:flex items-center gap-3 w-24">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <div className={`w-2 h-2 rounded-full ${doc.access === 'Public' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                      {doc.access}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="mini-icon-btn"
                      title="Preview"
                    >
                      <Eye />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={isDownloading === doc.id}
                      className="mini-icon-btn"
                      title="Download"
                    >
                      {isDownloading === doc.id ? (
                        <span className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin inline-block"></span>
                      ) : (
                        <Download />
                      )}
                    </button>
                    <button
                      onClick={(e) => toggleStar(e, doc.id)}
                      className="p-2 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 group/star transition-colors"
                    >
                      <Star className={`w-4 h-4 transition-colors ${doc.isStarred ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600 group-hover/star:text-amber-300"}`} />
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={() => navigate(`/documents/upload?id=${doc.id}`)}
                          className="mini-icon-btn"
                          title="Edit"
                        >
                          <Edit />
                        </button>
                        <button
                          onClick={() => setDeleteDocTarget(doc.id)}
                          className="mini-icon-btn-reject"
                          title="Delete"
                        >
                          <Trash2 />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          )) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-card border border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">No documents found</h3>
              <p className="text-muted-foreground text-sm max-w-sm">We couldn't find any documents matching your current filters. Try adjusting your search or category selections.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("all");
                  setActiveTag("All");
                  setAccessFilter("All Access");
                  setStarredOnly(false);
                }}
                className="mt-6 px-4 py-2 bg-card border border-border text-foreground hover:text-primary hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg font-semibold text-sm transition-all shadow-sm"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card rounded-lg shadow-sm w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border bg-muted/50">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-sm border bg-card ${previewDoc.type === "PDF" ? "text-red-500 border-red-100 dark:border-red-900" : "text-blue-500 border-blue-100 dark:border-blue-900"
                  }`}>
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground leading-tight">{previewDoc.title}</h2>
                  <div className="flex items-center gap-3 mt-1.5 text-xs font-semibold text-muted-foreground">
                    <span className="uppercase tracking-wider">{previewDoc.type} • {previewDoc.size}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                    <span>Updated {previewDoc.updatedAt}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="icon-circle-btn"
              >
                <X />
              </button>
            </div>

            {/* Modal Body - Actual Document Viewer */}
            <div className="flex-1 overflow-y-auto bg-muted p-4 flex justify-center items-center">
              {previewDoc.file_url ? (
                previewDoc.file_url.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={`${window.location.origin}${previewDoc.file_url}`}
                    className="w-full min-h-[600px] border-0 rounded-lg shadow-sm bg-white"
                    title={previewDoc.title}
                  />
                ) : (
                  // For images (jpg, jpeg, png, etc.)
                  /\.(jpg|jpeg|png|gif|webp)$/i.test(previewDoc.file_url) ? (
                    <div className="bg-card p-4 rounded-lg border border-border max-w-full max-h-[70vh] overflow-auto flex items-center justify-center">
                      <img
                        src={`${window.location.origin}${previewDoc.file_url}`}
                        alt={previewDoc.title}
                        className="max-w-full max-h-[65vh] object-contain rounded-md"
                      />
                    </div>
                  ) : (
                    // Fallback iframe for other types (doc, docx, etc.)
                    <iframe
                      src={`${window.location.origin}${previewDoc.file_url}`}
                      className="w-full min-h-[600px] border-0 rounded-lg shadow-sm bg-white"
                      title={previewDoc.title}
                    />
                  )
                )
              ) : (
                <div className="bg-card w-full max-w-3xl min-h-[400px] mx-auto shadow-sm border border-border p-8 sm:p-14 text-center flex flex-col justify-center items-center">
                  <p className="text-muted-foreground mb-4">No file preview available for this document.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-border bg-card flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <FileCheck2 className="w-5 h-5 text-emerald-500" />
                Verified Document
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-muted hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleDownload(previewDoc);
                    setPreviewDoc(null);
                  }}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/70 shadow-sm shadow-primary/20 rounded-lg flex items-center gap-2 transition-all active:scale-95"
                >
                  <FileDown className="w-4 h-4" /> Download File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={deleteDocTarget !== null}
        title="Delete Document?"
        description="Are you sure you want to permanently delete this document? This action cannot be undone."
        onConfirm={handleDeleteDoc}
        onClose={() => setDeleteDocTarget(null)}
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};
