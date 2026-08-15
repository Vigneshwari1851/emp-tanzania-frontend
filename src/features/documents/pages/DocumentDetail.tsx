import React, { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Download,
  Eye,
  Calendar,
  User,
  Tag,
  Lock,
  Globe,
  Edit,
  Loader2,
  FileDown,
  Trash2,
} from 'lucide-react';
import { getDocument, deleteDocument, type Document, downloadDocumentAction } from '@/features/documents/services/documents';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { usePermissions } from '@/features/rbac/hooks/usePermissions';
import { Permission } from '@/shared/types/rbac';
import { ConfirmationDialog } from '@/shared/components/ui/ConfirmationDialog';

export const DocumentDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useOrgNavigate();
  const { can } = usePermissions();
  const [doc, setDoc] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const canManage = can(Permission.MANAGE_DOCUMENTS);

  useEffect(() => {
    if (!id) return;
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    try {
      setIsLoading(true);
      const data = await getDocument(Number(id));
      setDoc(data);
    } catch (err) {
      toast.error('Failed to load document');
      navigate('/documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!doc) return;
    try {
      setIsDeleting(true);
      await deleteDocument(Number(doc.id));
      toast.success('Document deleted');
      navigate('/documents');
    } catch (err) {
      toast.error('Failed to delete document');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!doc) return null;

  return (
    <>
      <div className="min-h-full bg-muted/50 p-4 md:p-8 font-sans w-full overflow-y-auto">
        <div className="max-w-[1200px] mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/documents')}
              className="icon-circle-btn"
              title="Back to Document Hub"
            >
              <ArrowLeft />
            </button>
            <div className="flex items-center gap-2">
              {canManage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/documents/upload?id=${doc.id}`)}
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                    className="gap-2 text-red-500 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4" /> {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-5 mb-8">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-sm border ${doc.type === 'PDF' ? 'bg-red-50 dark:bg-red-950/30 text-red-500 border-red-100 dark:border-red-900' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-500 border-blue-100 dark:border-blue-900'}`}>
                  <FileText className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-foreground">{doc.title}</h1>
                    {doc.isNew && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">New</span>}
                  </div>
                  <p className="text-muted-foreground">{doc.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                    <FileText className="w-4 h-4" /> Type
                  </div>
                  <p className="text-sm font-bold text-foreground">{doc.type} • {doc.size}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                    <Tag className="w-4 h-4" /> Category
                  </div>
                  <p className="text-sm font-bold text-foreground">{doc.category}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                    {doc.access === 'Public' ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />} Access
                  </div>
                  <p className="text-sm font-bold text-foreground">{doc.access}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                    <Eye className="w-4 h-4" /> Views
                  </div>
                  <p className="text-sm font-bold text-foreground">{doc.views.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                    <Download className="w-4 h-4" /> Downloads
                  </div>
                  <p className="text-sm font-bold text-foreground">{doc.downloads.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                    <Calendar className="w-4 h-4" /> Last Updated
                  </div>
                  <p className="text-sm font-bold text-foreground">{doc.updatedAt}</p>
                </div>
                {doc.uploader && (
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                      <User className="w-4 h-4" /> Uploaded By
                    </div>
                    <p className="text-sm font-bold text-foreground">{doc.uploader.full_name}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-6 border-t border-border">
                <Button
                  variant="primary"
                  size="sm"
                  className="gap-2"
                  onClick={async () => {
                    if (!doc.file_url) {
                      toast.error("No file available for download");
                      return;
                    }
                    downloadDocumentAction(Number(doc.id)).catch(err => {
                      console.error('Failed to log document download:', err);
                    });
                    try {
                      const response = await fetch(`${window.location.origin}${doc.file_url}`);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      const filename = doc.file_url.split('/').pop() || `${doc.title.replace(/\s+/g, '_')}`;
                      link.setAttribute('download', filename);
                      document.body.appendChild(link);
                      link.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(link);
                    } catch (err) {
                      console.error('Failed to download file:', err);
                      window.open(`${window.location.origin}${doc.file_url}`, '_blank');
                    }
                  }}
                >
                  <FileDown className="w-4 h-4" /> Download
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Delete Document?"
        description="Are you sure you want to permanently delete this document? This action cannot be undone."
        onConfirm={handleDelete}
        onClose={() => setShowDeleteConfirm(false)}
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
};
