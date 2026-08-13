import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Trash2, Eye, Edit3, Save, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  label?: string;
  onFilesChange: (files: (File | string)[]) => void;
  files: (File | string)[];
  maxSizeMB?: number;
  allowedFormats?: string[];
  multiple?: boolean;
  error?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  dropzoneClassName?: string;
  onPreview?: (file: File | string, title: string) => void;
  showViewEdit?: boolean;
}

interface ModalPreviewState {
  url: string;
  isImage: boolean;
  name: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  onFilesChange,
  files,
  maxSizeMB = 20,
  allowedFormats = ['PDF', 'JPG', 'JPEG', 'PNG'],
  multiple = false,
  error,
  id,
  required = false,
  disabled = false,
  className = "",
  dropzoneClassName = "",
  onPreview,
  showViewEdit = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  const [isEditingInline, setIsEditingInline] = useState<number | null>(null);
  const [tempEditFile, setTempEditFile] = useState<File | string | null>(null);
  const [modalPreview, setModalPreview] = useState<ModalPreviewState | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalPreview(null);
      }
    };
    if (modalPreview) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalPreview]);

  const validateFileObject = (file: File): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedLower = allowedFormats.map(f => f.toLowerCase());
    
    const isValidFormat = allowedLower.includes(ext) || 
      (allowedLower.includes('pdf') && file.type === 'application/pdf') ||
      ((allowedLower.includes('jpg') || allowedLower.includes('jpeg')) && file.type === 'image/jpeg') ||
      (allowedLower.includes('png') && file.type === 'image/png');

    const maxSize = maxSizeMB * 1024 * 1024;
    const isValidSize = file.size <= maxSize;

    if (!isValidFormat) {
      toast.error("Invalid file type. Please upload a PDF, JPG, JPEG, or PNG file.");
      return false;
    }

    if (!isValidSize) {
      toast.error("File size exceeds the maximum limit of 20 MB. Please upload a smaller file.");
      return false;
    }

    return true;
  };

  const handleFileAction = (newFiles: FileList | null) => {
    if (!newFiles) return;
    
    const fileArray = Array.from(newFiles);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      if (validateFileObject(file)) {
        validFiles.push(file);
      } else {
        if (inputRef.current) inputRef.current.value = "";
        if (inlineInputRef.current) inlineInputRef.current.value = "";
        return;
      }
    }

    if (multiple) {
      onFilesChange([...files, ...validFiles]);
    } else if (validFiles.length > 0) {
      onFilesChange([validFiles[0]]);
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
    if (isEditingInline === index) {
      setIsEditingInline(null);
      setTempEditFile(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileAction(e.dataTransfer.files);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const getFilePreview = (file: any) => {
    if (!file) return { isImage: false, url: '', name: 'Empty', size: '0' };
    
    // Handle string URLs or Data URLs
    if (typeof file === 'string') {
      const isImage = file.match(/\.(jpg|jpeg|png|gif|webp)$/i) || file.startsWith('data:image/');
      return {
        isImage,
        url: file,
        name: file.startsWith('data:image/') ? 'Uploaded Document' : (file.split('/').pop() || 'Existing File'),
        size: 'Saved'
      };
    }
    
    // Handle API objects that might have url/fileUrl but aren't strings
    const url = file.url || file.fileUrl || "";
    if (url && typeof url === 'string' && !file.type) {
       const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
       return {
          isImage,
          url,
          name: file.name || url.split('/').pop() || 'Existing File',
          size: file.size ? formatSize(file.size) : 'Existing'
       };
    }

    // Handle File objects or File-like objects
    return {
      isImage: typeof file.type === 'string' && file.type.startsWith('image/'),
      url: file instanceof File ? URL.createObjectURL(file) : (file.url || file.fileUrl || ""),
      name: file.name || 'Unknown',
      size: typeof file.size === 'number' ? formatSize(file.size) : '0'
    };
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {label && (
        <label className={`block text-sm font-semibold text-foreground ${disabled ? 'opacity-50' : ''}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {(!multiple && files.length === 0 || multiple) && (
        <div
          id={id}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`relative border-2 border-dashed rounded-lg p-5 transition-all flex flex-col items-center justify-center gap-2.5 outline-none focus:ring-4 ${error ? 'focus:ring-red-300/20 border-red-300' : 'focus:ring-blue-400/20 border-border focus:border-blue-400'}
            ${isDragging && !disabled ? 'border-blue-500 bg-blue-50/20 scale-[1.01]' : ''}
            ${!isDragging && !error ? 'bg-card hover:bg-muted/50' : ''}
            ${error ? 'bg-red-50/10' : ''}
            ${disabled ? 'cursor-not-allowed opacity-60 bg-muted' : 'cursor-pointer'}
            ${dropzoneClassName}
          `}
          onDragOver={disabled ? undefined : handleDragOver}
          onDragLeave={disabled ? undefined : handleDragLeave}
          onDrop={disabled ? undefined : handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            multiple={multiple}
            accept={allowedFormats.map(f => `.${f.toLowerCase()}`).join(',')}
            onChange={(e) => handleFileAction(e.target.files)}
          />
          
          <Upload className="w-8 h-8 text-muted-foreground group-hover:text-blue-800 transition-colors" />
          
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-blue-800">
              Click to add <span className="text-gray-600 font-normal">or drop here.</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {allowedFormats.join(', ')} files only. Max. {maxSizeMB} MB each.
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 font-medium animate-in slide-in-from-top-1">
          {error}
        </p>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="grid gap-3">
            {files.map((file, idx) => {
              const preview = getFilePreview(file);
              
              if (isEditingInline === idx) {
                const tempPreview = tempEditFile ? getFilePreview(tempEditFile) : null;
                return (
                  <div key={idx} className="border border-amber-200 rounded-lg p-4 bg-amber-50/10 dark:bg-amber-950/10 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0 border border-border flex items-center justify-center">
                        {tempPreview?.isImage ? (
                          <img 
                            src={tempPreview.url} 
                            alt="Temp Preview" 
                            className="w-full h-full object-cover" 
                          />
                        ) : tempPreview ? (
                          <FileText className="w-8 h-8 text-muted-foreground" />
                        ) : (
                          <div className="text-xs text-muted-foreground">No File</div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-bold text-foreground truncate">{tempPreview?.name || "No file selected"}</p>
                        <button
                          type="button"
                          onClick={() => inlineInputRef.current?.click()}
                          className="px-3 py-1.5 text-xs font-bold text-primary border border-primary/20 hover:bg-primary/5 rounded transition-all"
                        >
                          Choose New File
                        </button>
                        <input
                          ref={inlineInputRef}
                          type="file"
                          className="hidden"
                          accept={allowedFormats.map(f => `.${f.toLowerCase()}`).join(',')}
                          onChange={(e) => {
                            const selected = e.target.files?.[0];
                            if (selected) {
                              if (validateFileObject(selected)) {
                                setTempEditFile(selected);
                              } else {
                                if (inlineInputRef.current) inlineInputRef.current.value = "";
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-border">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingInline(null);
                          setTempEditFile(null);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted border border-border rounded flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (tempEditFile) {
                            const updatedFiles = [...files];
                            updatedFiles[idx] = tempEditFile;
                            onFilesChange(updatedFiles);
                          }
                          setIsEditingInline(null);
                          setTempEditFile(null);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/80 rounded flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={idx} className="space-y-2">
                  <div 
                    onClick={() => {
                      if (onPreview) {
                        onPreview(file, preview.name);
                      } else if (showViewEdit) {
                        setModalPreview({
                          url: preview.url,
                          isImage: !!preview.isImage,
                          name: preview.name
                        });
                      }
                    }}
                    className={`flex items-center gap-4 p-3 bg-card border border-border rounded-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 ${(onPreview || showViewEdit) ? 'cursor-pointer hover:border-blue-300 hover:shadow-sm active:scale-[0.99] group/file' : 'hover:shadow-sm'}`}
                  >
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 group-hover/file:bg-blue-50 transition-colors">
                      {preview.isImage ? (
                        <img 
                          src={preview.url} 
                          alt="Preview" 
                          className="w-full h-full object-cover group-hover/file:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{preview.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        {formatDate(new Date())} <span className="w-1 h-1 bg-gray-300 rounded-full"></span> {preview.size}
                      </p>
                    </div>

                    {showViewEdit && (
                      <>
                        <button
                          type="button"
                          title="View Document"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onPreview) {
                              onPreview(file, preview.name);
                            } else {
                              setModalPreview({
                                url: preview.url,
                                isImage: !!preview.isImage,
                                name: preview.name
                              });
                            }
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200/80 bg-white text-gray-600 hover:border-primary hover:bg-primary/5 hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-primary dark:hover:bg-primary/20 dark:hover:text-primary-foreground transition-all"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        <button
                          type="button"
                          disabled={disabled}
                          title="Edit / Replace Document"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingInline(idx);
                            setTempEditFile(file);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200/80 bg-white text-gray-600 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-amber-500 dark:hover:bg-amber-950/40 dark:hover:text-amber-400 transition-all"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      disabled={disabled}
                      title="Delete Document"
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200/80 bg-white text-gray-600 hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Preview */}
      {modalPreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setModalPreview(null)}
        >
          <div 
            className="relative bg-card border border-border rounded-lg max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground truncate">{modalPreview.name || "Document Preview"}</h3>
              <button 
                type="button"
                onClick={() => setModalPreview(null)}
                className="p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-muted/10">
              {modalPreview.isImage ? (
                <img 
                  src={modalPreview.url} 
                  alt="Preview" 
                  className="max-w-full max-h-[60vh] object-contain rounded border border-border shadow-sm"
                />
              ) : (
                <div className="text-center p-8">
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-semibold text-foreground mb-4">{modalPreview.name}</p>
                  <a 
                    href={modalPreview.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded text-xs font-bold transition-all inline-block"
                  >
                    Open in New Tab
                  </a>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-3 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setModalPreview(null)}
                className="px-4 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-bold rounded transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
