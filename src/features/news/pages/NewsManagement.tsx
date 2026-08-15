import { useState, useMemo } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  ArrowLeft,
  BookOpen,
  Building2,
  Globe,
  Tag,
  Sparkles,
  FileText,
  Clock,
  User,
  Newspaper,
  Filter
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ConfirmationDialog } from '@/shared/components/ui/ConfirmationDialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/components/ui/table";
import Select from '@/shared/components/ui/Select';
import { toast } from 'sonner';
import { getNews, deleteNews, type NewsItem } from '../services/news';

const statusBadge: Record<string, string> = {
  draft: 'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  published: 'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  archived: 'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
};

const accessBadge: Record<string, string> = {
  public: 'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-primary/10 text-primary border-primary/20',
  department: 'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
};

export default function NewsManagement() {
  const navigate = useOrgNavigate();
  const queryClient = useQueryClient();
  
  // Filters & State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [accessFilter, setAccessFilter] = useState<'all' | 'public' | 'department'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Delete Dialog state
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: newsItems, isLoading } = useQuery({
    queryKey: ['news'],
    queryFn: () => getNews(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNews,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.success('News item deleted successfully');
      setDeleteId(null);
    },
    onError: () => {
      toast.error('Failed to delete news item');
      setDeleteId(null);
    },
  });

  // Calculate Metrics on the fly
  const metrics = useMemo(() => {
    const items = newsItems ?? [];
    return {
      total: items.length,
      published: items.filter(i => i.status === 'published').length,
      drafts: items.filter(i => i.status === 'draft').length,
      departments: items.filter(i => i.access_type === 'department').length,
    };
  }, [newsItems]);

  // Filter News
  const filtered = useMemo(() => {
    return (newsItems ?? []).filter((item) => {
      const matchesSearch = !search || item.title.toLowerCase().includes(search.toLowerCase()) || item.content.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesAccess = accessFilter === 'all' || item.access_type === accessFilter;
      return matchesSearch && matchesStatus && matchesAccess;
    });
  }, [newsItems, search, statusFilter, accessFilter]);

  const handleDeleteClick = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <PageHeader
        title="Company News Feed Control"
        description="Manage, compose, schedule, and filter announcements and department specific notices."
        icon={<Newspaper className="size-8" />}
        action={
          <Button
            onClick={() => navigate('/news/create')}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-primary-600/10 px-5 py-2.5 rounded-xl transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Compose Article
          </Button>
        }
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Articles', value: metrics.total, icon: BookOpen },
          { title: 'Published', value: metrics.published, icon: Globe },
          { title: 'Drafts', value: metrics.drafts, icon: FileText },
          { title: 'Department Scoped', value: metrics.departments, icon: Building2 },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-card min-h-[112.85px] rounded-lg border border-border/80 p-5 shadow-sm hover:shadow-sm transition-shadow duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-primary shrink-0" />
              </div>
              <div className="my-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {card.value}
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate">
                  {card.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtering Control Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by title or content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 h-10 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm transition-all text-foreground"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`toolbar-filter-btn-with-text relative ${showFilters ? '!bg-primary/10 ring-2 ring-primary/30 !border-primary' : ''}`}
                title="Filters"
              >
                {showFilters ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 18 18"
                    aria-labelledby="CollapseCloseIconTitle"
                    role="graphics-symbol img"
                    fill="none"
                    className="!text-blue-600 dark:!text-blue-400 w-4 h-4"
                  >
                    <title id="CollapseCloseIconTitle">Collapse Close Icon</title>
                    <g>
                      <path
                        clipRule="evenodd"
                        fillRule="evenodd"
                        fill="currentColor"
                        d="M2.09 1.526c.31 0 .562.252.562.563v15.82a.562.562 0 1 1-1.125 0V2.089c0-.311.252-.563.563-.563Zm6.198 5.438c.22.22.22.576 0 .796L6.612 9.436H17.91a.563.563 0 0 1 0 1.125H6.612l1.676 1.677a.562.562 0 1 1-.795.795l-2.637-2.636a.562.562 0 0 1 0-.796l2.637-2.637c.22-.22.576-.22.795 0Z"
                      />
                    </g>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 15"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M15.8,2H6.9C6.7,0.7,5.4-0.2,4,0.1C3,0.3,2.2,1,2,2H0.2C0.1,2,0,2.1,0,2.3v0.5 C0,2.9,0.1,3,0.2,3H2C2.3,4.4,3.6,5.2,5,5c1-0.2,1.8-1,1.9-2h8.8C15.9,3,16,2.9,16,2.8V2.3C16,2.1,15.9,2,15.8,2z M4.5,4 C3.7,4,3,3.3,3,2.5S3.7,1,4.5,1S6,1.7,6,2.5S5.3,4,4.5,4z" />
                    <path d="M15.8,12H8.9C8.7,10.7,7.4,9.8,6,10.1c-1,0.2-1.8,1-1.9,1.9H0.2C0.1,12,0,12.1,0,12.3v0.5 C0,12.9,0.1,13,0.2,13h3.8C4.3,14.4,5.6,15.2,7,15c1-0.2,1.8-1,1.9-1.9h6.8c0.1,0,0.2-0.1,0.2-0.2v-0.5C16,12.1,15.9,12,15.8,12z M6.5,14C5.7,14,5,13.3,5,12.5S5.7,11,6.5,11S7.3,11,7.3,12.5S7.3,14,6.5,14z" />
                    <path d="M0,7.3v0.5C0,7.9,0.1,8,0.2,8h8.8c0.3,1.4,1.6,2.2,2.9,1.9c1-0.2,1.8-1,1.9-1.9h1.8 C15.9,8,16,7.9,16,7.8V7.3C16,7.1,15.9,7,15.8,7h-1.8c-0.3-1.3-1.6-2.2-2.9-1.9C10,5.3,9.2,6,9.1,7H0.2C0.1,7,0,7.1,0,7.3z M10,7.5 C10,6.7,10.7,6,11.5,6S13,6.7,13,7.5S12.3,9,11.5,9S10,8.3,10,7.5z" />
                  </svg>
                )}
                Filter
                {(statusFilter !== 'all' || accessFilter !== 'all') && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-white dark:border-card" />
                )}
              </button>

              {/* Filter Dropdown Card */}
              {showFilters && (
                <div className="absolute right-0 top-full mt-3 w-[400px] bg-white dark:bg-zinc-900 rounded-xl shadow-xl shadow-slate-200/80 dark:shadow-black/45 border border-slate-100 dark:border-zinc-800 z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-5 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[16px] font-bold text-primary tracking-tight">Filters</div>
                        <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
                          {(statusFilter !== 'all' ? 1 : 0) + (accessFilter !== 'all' ? 1 : 0)} Filter Selected
                        </span>
                      </div>
                      <button
                        onClick={() => { setStatusFilter('all'); setAccessFilter('all'); }}
                        disabled={statusFilter === 'all' && accessFilter === 'all'}
                        className={`text-[12px] font-semibold transition-colors ${
                          statusFilter !== 'all' || accessFilter !== 'all'
                            ? 'text-slate-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400'
                            : 'text-slate-300 dark:text-zinc-700 cursor-not-allowed'
                        }`}
                      >
                        Reset all Filters
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Status</span>
                        <Select
                          value={statusFilter}
                          onChange={(v) => setStatusFilter(v as any)}
                          options={[
                            { value: 'all', label: 'All Statuses' },
                            { value: 'published', label: 'Published' },
                            { value: 'draft', label: 'Draft' },
                          ]}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Audience</span>
                        <Select
                          value={accessFilter}
                          onChange={(v) => setAccessFilter(v as any)}
                          options={[
                            { value: 'all', label: 'All Targets' },
                            { value: 'public', label: 'Company Wide' },
                            { value: 'department', label: 'Department Spec.' },
                          ]}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden animate-in fade-in duration-300">
        <div className="p-0">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-20 bg-background/30 rounded-xl">
              <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-3" />
              <p className="text-muted-foreground text-sm font-medium animate-pulse">Fetching records...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl bg-background/20 m-6">
              <Sparkles className="w-8 h-8 text-primary-400 mx-auto mb-3" />
              <p className="font-semibold text-foreground">No matching news articles</p>
              <p className="text-xs mt-1 max-w-sm mx-auto">Try widening your filters or composing a new article.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[800px] border-collapse">
                <TableHeader className="bg-muted border-b border-border">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Cover</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Article Details</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Audience</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Published Date</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Author</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                    <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item: NewsItem) => (
                    <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="px-4 py-3 align-middle">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt=""
                            className="w-16 h-11 rounded-lg object-cover border border-border/80 shadow-sm"
                          />
                        ) : (
                          <div className="w-16 h-11 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center border border-border/70 text-slate-400">
                            <BookOpen className="w-4 h-4" />
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3 align-middle max-w-sm">
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground text-sm truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 leading-normal">{item.content}</p>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3 align-middle">
                        <div className="space-y-1">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${accessBadge[item.access_type]}`}>
                            {item.access_type === 'public' ? 'Company Wide' : 'Department'}
                          </span>
                          {item.access_type === 'department' && item.departments && (
                            <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                              {item.departments.map(d => d.department_name).join(', ')}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3 align-middle text-sm text-foreground whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>

                      <TableCell className="px-4 py-3 align-middle text-sm text-foreground font-medium">
                        {item.author ? (item.author.full_name || item.author.username) : '-'}
                      </TableCell>

                      <TableCell className="px-4 py-3 align-middle">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusBadge[item.status]}`}>
                          {item.status}
                        </span>
                      </TableCell>

                      <TableCell className="px-4 py-3 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/news/edit/${item.id}`)}
                            className="p-1.5 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-all"
                            title="Edit Article"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={(e) => handleDeleteClick(item.id, e)}
                            disabled={deleteMutation.isPending && deleteId === item.id}
                            className="p-1.5 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                            title="Delete Article"
                          >
                            {deleteMutation.isPending && deleteId === item.id ? (
                              <Loader2 className="animate-spin w-3.5 h-3.5" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete News Article"
        description="Are you sure you want to permanently delete this news article? This will remove it from all employee news feeds. This action is irreversible."
        confirmText="Confirm Delete"
        cancelText="Keep Article"
        variant="danger"
      />
    </div>
  );
}

