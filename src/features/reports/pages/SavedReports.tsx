import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, Download, Trash2, Search, FileText, ChevronLeft, ChevronRight, Eye, ChevronDown, X, Play
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Button } from '@/shared/components/ui/button';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/components/ui/table";
import { toast } from 'sonner';
import { maskSensitiveValue } from '../utils/masking';
import { useAuth } from '@/shared/context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

interface SavedReportInstance {
  id: string;
  title: string;
  template_id?: string;
  module: string;
  created_by: string;
  columns: string[];
  data_snapshot: any[];
  total_records: number;
  created_at: string;
  description?: string;
}

const MODULE_LABELS: Record<string, string> = {
  employees: 'Employee Directory',
  leaves: 'Leave Records',
  exits: 'Exit Management',
  assets: 'Asset Management',
  loans: 'Loans and Advances',
  reimbursements: 'Reimbursements',
  payroll: 'Payroll'
};

export const SavedReports: React.FC = () => {
  const { user } = useAuth();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();

  const [savedInstances, setSavedInstances] = useState<SavedReportInstance[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedInstance, setSelectedInstance] = useState<SavedReportInstance | null>(null);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Pagination for main list
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Load instances on mount
  useEffect(() => {
    const data = localStorage.getItem('emp_xp_saved_reports_snapshots');
    if (data) {
      try {
        setSavedInstances(JSON.parse(data));
      } catch (e) {
        console.error('Failed to parse saved reports snapshots', e);
      }
    }
  }, []);

  // Save/sync helper
  const saveInstances = (updated: SavedReportInstance[]) => {
    setSavedInstances(updated);
    localStorage.setItem('emp_xp_saved_reports_snapshots', JSON.stringify(updated));
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this saved report snapshot?")) {
      const updated = savedInstances.filter(x => x.id !== id);
      saveInstances(updated);
      toast.success("Saved report snapshot deleted.");
      if (selectedInstance?.id === id) {
        setPreviewOpen(false);
      }
    }
  };

  // Close dropdown helper
  useEffect(() => {
    const handleClose = () => setOpenDropdownId(null);
    document.addEventListener('click', handleClose);
    return () => document.removeEventListener('click', handleClose);
  }, []);

  // Filtered instances
  const filteredInstances = savedInstances.filter(inst => {
    const query = searchTerm.toLowerCase();
    return (
      inst.title.toLowerCase().includes(query) ||
      (inst.description || '').toLowerCase().includes(query) ||
      inst.created_by.toLowerCase().includes(query) ||
      (MODULE_LABELS[inst.module] || inst.module).toLowerCase().includes(query)
    );
  });

  // Paginated instances
  const totalPages = Math.ceil(filteredInstances.length / itemsPerPage);
  const paginatedInstances = filteredInstances.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Apply PII masking to a whole row/dataset
  const getMaskedDataset = (instance: SavedReportInstance) => {
    return instance.data_snapshot.map(row => {
      const maskedRow: Record<string, any> = {};
      instance.columns.forEach(col => {
        const val = getNestedValue(row, col);
        // Apply masking
        maskedRow[col] = maskSensitiveValue(val, col);
      });
      return maskedRow;
    });
  };

  // Helper to extract nested values
  const getNestedValue = (obj: any, path: string): any => {
    if (!obj) return '';
    return path.split('.').reduce((acc, part) => {
      return acc && acc[part] !== undefined ? acc[part] : undefined;
    }, obj);
  };

  // EXPORT ENGINE FUNCTIONS
  const handleExportCSV = (instance: SavedReportInstance) => {
    const maskedData = getMaskedDataset(instance);
    const headers = instance.columns;

    const rows = maskedData.map(row =>
      headers.map(h => {
        const val = row[h];
        return String(val !== undefined && val !== null ? val : '').replace(/"/g, '""');
      })
    );

    const csvContent = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${instance.title.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    link.click();
    toast.success("CSV report exported (PII Masked) successfully.");
  };

  const handleExportExcel = (instance: SavedReportInstance) => {
    const maskedData = getMaskedDataset(instance);
    
    // Map headers to user-friendly column names
    const dataRows = maskedData.map(row => {
      const formattedRow: Record<string, any> = {};
      instance.columns.forEach(col => {
        formattedRow[col] = row[col];
      });
      return formattedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report snapshot");
    XLSX.writeFile(workbook, `${instance.title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
    toast.success("Excel report exported (PII Masked) successfully.");
  };

  const handleExportPDF = (instance: SavedReportInstance) => {
    const maskedData = getMaskedDataset(instance);
    const doc = new jsPDF('landscape');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text(instance.title, 14, 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated by ${instance.created_by} on ${instance.created_at}`, 14, 20);

    const columns = instance.columns;
    let y = 30;
    const colWidth = 260 / Math.max(columns.length, 1);

    // Draw Headers
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 260, 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    columns.forEach((col, i) => {
      doc.text(col, 16 + (i * colWidth), y + 6);
    });

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);

    maskedData.forEach((row) => {
      if (y > 185) {
        doc.addPage();
        y = 15;
      }
      doc.rect(14, y, 260, 7);
      columns.forEach((col, i) => {
        const val = row[col];
        const txt = val !== undefined && val !== null ? String(val) : '';
        const truncated = txt.length > 20 ? txt.substring(0, 18) + '..' : txt;
        doc.text(truncated, 16 + (i * colWidth), y + 5);
      });
      y += 7;
    });

    doc.save(`${instance.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    toast.success("PDF exported (PII Masked) successfully.");
  };

  const handleExportWord = (instance: SavedReportInstance) => {
    const maskedData = getMaskedDataset(instance);
    const headers = instance.columns;

    let tableHTML = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>`;
    tableHTML += `<head><meta charset='utf-8'></head><body><h2>${instance.title}</h2><p>Generated by ${instance.created_by} on ${instance.created_at}</p><table border="1" style="border-collapse: collapse; width: 100%;"><thead><tr style="background: #f1f5f9;">`;
    headers.forEach(h => {
      tableHTML += `<th style="padding: 6px; font-size: 11px; font-weight: bold;">${h}</th>`;
    });
    tableHTML += `</tr></thead><tbody>`;
    maskedData.forEach(row => {
      tableHTML += `<tr>`;
      headers.forEach(h => {
        tableHTML += `<td style="padding: 5px; font-size: 11px;">${row[h] !== undefined && row[h] !== null ? row[h] : '-'}</td>`;
      });
      tableHTML += `</tr>`;
    });
    tableHTML += `</tbody></table></body></html>`;

    const blob = new Blob(['\ufeff', tableHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${instance.title.replace(/\s+/g, '_')}_${Date.now()}.doc`;
    link.click();
    toast.success("Word report exported (PII Masked) successfully.");
  };

  const handleOpenPreview = (instance: SavedReportInstance) => {
    setSelectedInstance(instance);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-4 w-full min-w-0 font-sans text-foreground animate-in fade-in duration-300">
      <PageHeader
        title="Saved Reports Snapshot Library"
        icon={<FileSpreadsheet className="size-8" />}
      />

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search saved reports by title, author, module..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
          />
        </div>

        <Button
          onClick={() => navigate(`/${orgSlug || user?.orgSlug || 'org'}/report-builder`)}
          className="bg-primary hover:bg-primary/80 text-white font-bold text-xs shadow-sm h-9"
        >
          <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Go to Report Builder
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px] border-collapse">
            <TableHeader className="bg-muted/50 border-b border-border">
              <TableRow>
                <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Report Title</TableHead>
                <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Module Type</TableHead>
                <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generated By</TableHead>
                <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created Date</TableHead>
                <TableHead className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Rows</TableHead>
                <TableHead className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInstances.length > 0 ? (
                paginatedInstances.map((inst) => (
                  <TableRow key={inst.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="px-6 py-4">
                      <div>
                        <span className="font-bold text-xs text-foreground block">{inst.title}</span>
                        {inst.description && <span className="text-[10px] text-muted-foreground block truncate max-w-[250px]">{inst.description}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-xs font-semibold text-muted-foreground capitalize">
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-primary rounded-full">
                        {MODULE_LABELS[inst.module] || inst.module}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-xs font-medium text-foreground">{inst.created_by}</TableCell>
                    <TableCell className="px-6 py-4 text-xs text-muted-foreground">{inst.created_at}</TableCell>
                    <TableCell className="px-6 py-4 text-xs font-bold text-foreground tabular-nums">{inst.total_records}</TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2 relative">
                        <Button
                          onClick={() => handleOpenPreview(inst)}
                          variant="outline"
                          className="h-7 text-[10px] px-2.5 font-bold border-border hover:bg-muted/50"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View Snapshot
                        </Button>

                        <div className="relative">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(openDropdownId === inst.id ? null : inst.id);
                            }}
                            variant="outline"
                            className="h-7 text-[10px] px-2 font-bold border-border hover:bg-muted/50"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" /> Export <ChevronDown className="w-3 h-3 ml-0.5" />
                          </Button>

                          {openDropdownId === inst.id && (
                            <div className="absolute right-0 mt-1 w-44 bg-card border border-border shadow-lg rounded-lg py-1 z-50 text-left animate-in fade-in duration-100">
                              <button
                                onClick={() => handleExportExcel(inst)}
                                className="w-full text-left px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 flex items-center gap-2"
                              >
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Excel (.xlsx)
                              </button>
                              <button
                                onClick={() => handleExportPDF(inst)}
                                className="w-full text-left px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 border-t border-border/50 flex items-center gap-2"
                              >
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span> PDF (.pdf)
                              </button>
                              <button
                                onClick={() => handleExportCSV(inst)}
                                className="w-full text-left px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 border-t border-border/50 flex items-center gap-2"
                              >
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span> CSV (.csv)
                              </button>
                              <button
                                onClick={() => handleExportWord(inst)}
                                className="w-full text-left px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 border-t border-border/50 flex items-center gap-2"
                              >
                                <span className="w-2 h-2 rounded-full bg-primary"></span> Word (.docx)
                              </button>
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={(e) => handleDelete(inst.id, e)}
                          variant="ghost"
                          className="h-7 text-[10px] px-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground font-medium italic">
                    No saved report snapshots found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-border flex items-center justify-between bg-muted/20">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredInstances.length)} of {filteredInstances.length} snapshots
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-[10px] font-bold border border-border rounded-lg bg-card hover:bg-muted/50 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs font-semibold text-muted-foreground">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-[10px] font-bold border border-border rounded-lg bg-card hover:bg-muted/50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Snapshot Preview Modal */}
      {previewOpen && selectedInstance && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-border/50 flex justify-between items-center bg-muted/25">
              <div>
                <h3 className="font-bold text-sm text-foreground uppercase">Snapshot Preview: {selectedInstance.title}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Generated by {selectedInstance.created_by} on {selectedInstance.created_at} &bull; Total {selectedInstance.total_records} rows
                </p>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="p-1 hover:bg-muted/80 rounded text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="rounded-lg border border-border bg-card overflow-x-auto">
                <Table className="min-w-[600px] border-collapse">
                  <TableHeader className="bg-muted/50 border-b border-border">
                    <TableRow>
                      {selectedInstance.columns.map(col => (
                        <TableHead key={col} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInstance.data_snapshot.slice(0, 100).map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/10 transition-colors">
                        {selectedInstance.columns.map(col => {
                          const rawVal = getNestedValue(row, col);
                          // Apply PII masking to emails, phones, numbers in UI preview as well
                          const maskedVal = maskSensitiveValue(rawVal, col);
                          return (
                            <TableCell key={col} className="px-4 py-2.5 text-xs text-foreground font-medium align-top">
                              {maskedVal !== undefined && maskedVal !== null ? String(maskedVal) : '-'}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {selectedInstance.total_records > 100 && (
                <p className="text-[10px] text-muted-foreground font-medium italic mt-2 text-center">
                  Showing first 100 records in preview. Export to download the full dataset.
                </p>
              )}
            </div>

            <div className="p-4 border-t border-border/50 bg-muted/20 flex justify-end gap-2">
              <Button
                onClick={() => setPreviewOpen(false)}
                className="h-9 text-xs bg-slate-100 hover:bg-slate-200 border-border text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedReports;
