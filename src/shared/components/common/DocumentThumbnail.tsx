import React from 'react';
import { 
  FileText, 
  FileBox, 
  Image as ImageIcon, 
  FileArchive, 
  FileEdit, 
  FileMinus
} from 'lucide-react';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';

interface DocumentThumbnailProps {
  label: string;
  sublabel?: string;
  filePath: string | null | undefined;
}

export const DocumentThumbnail: React.FC<DocumentThumbnailProps> = ({ 
  label, 
  filePath
}) => {
  const fullUrl = getProfilePictureUrl(filePath);
  
  const getFileExtension = (path: string | null | undefined): string => {
    if (!path) return '';
    const parts = path.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  };

  const extension = getFileExtension(filePath);
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
  const isPdf = extension === 'pdf';
  const isDoc = ['doc', 'docx'].includes(extension);
  const isArchive = ['zip', 'rar', '7z'].includes(extension);

  const getIcon = () => {
    if (isPdf) return <FileText className="w-8 h-8 text-rose-500" />;
    if (isDoc) return <FileEdit className="w-8 h-8 text-blue-500" />;
    if (isArchive) return <FileArchive className="w-8 h-8 text-amber-500" />;
    if (isImage) return <ImageIcon className="w-8 h-8 text-primary-500" />;
    return <FileBox className="w-8 h-8 text-muted-foreground" />;
  };

  if (!filePath) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-dashed border-border opacity-60">
        <div className="w-12 h-12 bg-card rounded-lg flex items-center justify-center border border-border shadow-sm">
          <FileMinus className="w-6 h-6 text-gray-300" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Not Uploaded</p>
        </div>
      </div>
    );
  }

  return (
    <a 
      href={fullUrl || '#'} 
      target="_blank" 
      rel="noopener noreferrer"
      className=" group relative flex flex-col items-center p-1 bg-muted/30 rounded-lg border border-border hover:border-primary-200 hover:bg-card hover:shadow-sm transition-all duration-300 overflow-hidden text-center w-[70px]"
    >
      {/* Icon Area - Even more compact */}
      <div className="w-8 h-8 mb-1 bg-card rounded-sm flex items-center justify-center border border-border shadow-sm shrink-0 overflow-hidden group-hover:scale-105 transition-transform relative">
        {isImage && fullUrl ? (
          <img 
            src={fullUrl} 
            alt={label} 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="flex items-center justify-center"><svg class="w-5 h-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>';
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center scale-75">
            {getIcon()}
          </div>
        )}
      </div>

      {/* Text Details - Minimal labels */} 
      <div className="w-full min-w-0">
        <h4 className="text-[12px] font-medium text-[8px] text-foreground truncate px-0.5 leading-tight mb-0.5" title={label}>{label}</h4>
        <div className="flex flex-col items-center">
          <span className="text-[7px] px-1 bg-gray-200/50 text-muted-foreground rounded font-mono uppercase tracking-tighter leading-none">
            {extension || 'FILE'}
          </span>
        </div>
      </div>
    </a>
  );
};
