import React, { useState } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { 
  Plus, Layers, Search, Filter, MoreVertical, 
  ArrowRight, BookOpen, Clock, Users, ShieldCheck,
  CheckCircle2, AlertCircle, Edit, Trash2, Copy
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useLearningPaths, useDeleteLearningPath } from '../api/lmsApi';
import { toast } from 'sonner';

export const LearningPathList: React.FC = () => {
  const navigate = useOrgNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: learningPaths = [], isLoading } = useLearningPaths();
  const deleteMutation = useDeleteLearningPath();

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this learning path?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Learning path deleted");
      } catch (err) {
        toast.error("Failed to delete learning path");
      }
    }
  };

  const filteredPaths = learningPaths.filter((path: any) => 
    path.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 font-poppins w-full max-w-full mx-auto px-0 py-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center justify-center shrink-0 text-primary">
            <Layers className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Learning Paths</h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">Bundle multiple courses into structured professional journeys</p>
          </div>
        </div>
        <Button 
          onClick={() => navigate('/lms/learning-paths/new')}
          className="bg-primary hover:bg-primary/95 text-white font-black h-11 px-8 rounded-lg shadow-sm flex items-center gap-2"
        >
          <Plus size={18} /> Create Learning Path
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg shadow-sm border border-border">
        <div className="flex-1 w-full relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-muted border border-transparent rounded-lg focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary text-sm font-medium transition-all outline-none border-border" 
            placeholder="Search learning paths..." 
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" className="border-border text-foreground font-bold h-11 px-5 rounded-lg flex items-center gap-2 hover:bg-muted bg-card">
            <Filter size={16} /> Filter
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[280px] bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPaths.map((path: any) => (
            <div key={path.id} className="bg-card rounded-lg border border-border shadow-sm overflow-hidden hover:shadow-sm transition-all group">
               <div className="p-6 space-y-6">
                  <div className="flex items-start justify-between">
                     <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black   ${
                        path.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                     }`}>
                        {path.status || 'PUBLISHED'}
                     </div>
                     <div className="flex items-center gap-1">
                        <button 
                          onClick={() => navigate(`/lms/learning-paths/${path.id}`)}
                          className="p-2 text-gray-300 hover:text-primary transition-colors group"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(path.id)}
                          className="p-2 text-gray-300 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                     </div>
                  </div>
  
                  <div className="space-y-1">
                     <h3 
                        onClick={() => navigate(`/lms/learning-paths/${path.id}`)}
                        className="text-lg font-black text-foreground group-hover:text-white transition-colors cursor-pointer"
                      >
                        {path.title}
                      </h3>
                     <p className="text-xs text-muted-foreground font-bold  tracking-widest">
                       {path.auto_assign_rules?.department_ids?.length > 0 ? 'Targeted' : 'General'} Path
                     </p>
                  </div>
  
                  <div className="grid grid-cols-3 gap-2">
                     <div className="bg-muted p-3 rounded-lg text-center">
                        <p className="text-xs font-black text-foreground">{path.courses?.length || 0}</p>
                        <p className="text-[9px] font-bold text-muted-foreground  tracking-tighter">Courses</p>
                     </div>
                     <div className="bg-muted p-3 rounded-lg text-center">
                        <p className="text-xs font-black text-foreground">{path.duration || '--'}</p>
                        <p className="text-[9px] font-bold text-muted-foreground  tracking-tighter">Length</p>
                     </div>
                     <div className="bg-muted p-3 rounded-lg text-center">
                        <p className="text-xs font-black text-foreground">{path._count?.assignments || 0}</p>
                        <p className="text-[9px] font-bold text-muted-foreground  tracking-tighter">Enrolled</p>
                     </div>
                  </div>
  
                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                     <div className="flex -space-x-2">
                        {[1,2,3].map(i => (
                           <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-primary-100 flex items-center justify-center text-[8px] font-bold text-primary">
                              U{i}
                           </div>
                        ))}
                        <div className="w-7 h-7 rounded-full border-2 border-white bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                           +{(path._count?.assignments || 0) > 3 ? path._count.assignments - 3 : 0}
                        </div>
                     </div>
                     <Button 
                        variant="ghost" 
                        onClick={() => navigate(`/lms/learning-paths/${path.id}`)}
                        className="text-primary font-black text-xs hover:bg-primary/10 px-4 rounded-lg flex items-center gap-2"
                      >
                        Edit Path <ArrowRight size={14} />
                     </Button>
                  </div>
               </div>
            </div>
          ))}
  
          <div 
            onClick={() => navigate('/lms/learning-paths/new')}
            className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-primary-300 hover:bg-primary/10/20 transition-all cursor-pointer group"
          >
             <div className="w-12 h-12 bg-muted text-gray-300 rounded-lg flex items-center justify-center group-hover:bg-card group-hover:text-white shadow-sm transition-all">
                <Plus size={24} />
             </div>
             <div>
                <p className="text-sm font-black text-foreground">New Learning Path</p>
                <p className="text-xs text-muted-foreground font-medium mt-1">Combine existing assets into a journey</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

