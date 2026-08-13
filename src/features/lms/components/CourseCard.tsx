import React from 'react';
import { BookOpen, Clock, Users, PlayCircle, CheckCircle, Layers, TrendingUp, Sparkles, Award, Download } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { getAssetUrl } from '@/shared/utils/fileUtils';

interface CourseCardProps {
  course: any;
  isLearner?: boolean;
  assignedCourseIds?: Set<number>;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, isLearner = false, assignedCourseIds }) => {
  const navigate = useOrgNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60';
      case 'DRAFT': return 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60';
      case 'ARCHIVED': return 'bg-muted text-foreground border border-border';
      default: return 'bg-muted text-foreground border border-border';
    }
  };

  return (
    <Card className="rounded-lg overflow-hidden hover:shadow-sm transition-all duration-300 border-border flex flex-col h-full group">
      <div className="relative aspect-video overflow-hidden bg-muted">
        {course.thumbnail_url ? (
          <img 
            src={getAssetUrl(course.thumbnail_url)} 
            alt={course.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary-200">
            <BookOpen size={48} />
          </div>
        )}
        
        {/* Quality Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2 pointer-events-none">
          {course.level && (
            <div className="px-2.5 py-1 rounded-lg bg-card/95 backdrop-blur-md border border-border shadow-sm flex items-center gap-1.5 transition-transform group-hover:scale-105">
              <TrendingUp size={10} className="text-primary" />
              <span className="text-[9px] font-black text-foreground">{course.level}</span>
            </div>
          )}
          {course.duration && (
            <div className="px-2.5 py-1 rounded-lg bg-card/95 backdrop-blur-md border border-border shadow-sm flex items-center gap-1.5 transition-transform group-hover:scale-105">
              <Clock size={10} className="text-amber-500" />
              <span className="text-[9px] font-black text-foreground">{course.duration}</span>
            </div>
          )}
        </div>

        {!isLearner && (
          <div className="absolute top-3 right-3">
            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black shadow-sm ${getStatusColor(course.status)}`}>
              {course.status}
            </span>
          </div>
        )}

        {isLearner && course.progress?.percentage === 100 && (
          <div className="absolute inset-0 bg-emerald-600/10 backdrop-blur-[2px] flex items-center justify-center">
             <div className="bg-card/90 p-2 rounded-lg shadow-sm border border-border flex items-center gap-2 animate-in zoom-in duration-300">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-100">
                   <Award size={18} />
                </div>
                <span className="text-[10px] font-black text-foreground pr-2">Certified</span>
             </div>
          </div>
        )}
      </div>
      
      <CardContent className=" px-3 pb-2 flex-1 flex flex-col">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground line-clamp-1 mb-2 group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2 mb-3 h-10">
            {course.description || "No description provided."}
          </p>
          
          {isLearner && course.progress && (
            <div className="mb-3">
              <div className="flex justify-between text-[10px] font-medium text-muted-foreground mb-1">
                <span>Course Progress</span>
                <span>{Math.round(course.progress.percentage)}%</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500" 
                  style={{ width: `${course.progress.percentage}%` }} 
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 bg-muted p-2 rounded-lg">
              <Layers size={14} className="text-primary-500" />
              <span>{course._count?.modules || course.modules?.length || 0} Sections</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 bg-muted p-2 rounded-lg">
              <BookOpen size={14} className="text-primary-500" />
              <span>{course.modules?.reduce((acc: number, m: any) => acc + (m._count?.contents || m.contents?.length || 0), 0) || 0} Lessons</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            {isLearner && course.progress?.percentage === 100 ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // In a real app, this would trigger a certificate download
                  console.log('Downloading certificate for course:', course.id);
                  alert('Downloading Certificate...');
                }}
                className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 hover:bg-emerald-200 transition-colors shadow-sm"
                title="Download Certificate"
              >
                <Download size={14} />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary text-xs font-bold">
                {course.instructor?.details?.first_name?.charAt(0) || 'I'}
              </div>
            )}
            <span className="text-xs font-semibold text-foreground">
              {course.instructor?.details?.first_name} {course.instructor?.details?.last_name}
            </span>
          </div>
          
          <Button 
            variant="primary" 
            size="sm" 
            className={`rounded-lg px-5 font-black text-[10px] flex items-center gap-2 shadow-sm transition-all active:scale-95 ${
              isLearner && course.progress?.percentage === 100 
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' 
                : 'bg-primary hover:bg-primary/95 shadow-primary-100'
            }`}
            onClick={() => navigate(isLearner ? `/lms/player/${course.id}` : `/lms/courses/${course.id}`)}
          >
            {isLearner ? (
              course.progress?.percentage === 100 ? (
                <><Award size={14} /> RE-LEARN</>
              ) : assignedCourseIds?.has(course.id) ? (
                <><PlayCircle size={14} /> Resume</>
              ) : (
                <><Sparkles size={14} /> Enroll</>
              )
            ) : (
              'Manage'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

