import React, { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from 'react-router-dom';
import { 
  ChevronLeft, Save, Plus, Trash2, GripVertical, 
  BookOpen, Users, Settings, Layers, Search,
  ArrowRight, CheckCircle2, AlertCircle, Info,
  Layout, Briefcase, Building2, MapPin, ShieldCheck
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/Tabs';
import { 
  useLearningPath, 
  useCreateLearningPath, 
  useUpdateLearningPath,
  useCourses 
} from '../api/lmsApi';
import { toast } from 'sonner';
import api from '@/shared/services/axiosInstance';

export const LearningPathEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useOrgNavigate();
  const isEdit = !!id;
  const queryClient = null; // We use hooks which handle cache invalidation

  const { data: learningPath, isLoading: isLoadingPath } = useLearningPath(Number(id));
  const { data: allCourses = [], isLoading: isLoadingCourses } = useCourses();
  const createMutation = useCreateLearningPath();
  const updateMutation = useUpdateLearningPath();

  const [activeTab, setActiveTab] = useState('overview');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    auto_assign_rules: {
      department_ids: [] as number[],
      role_ids: [] as number[],
      locations: [] as string[],
    }
  });

  const [selectedCourses, setSelectedCourses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    if (learningPath) {
      setFormData({
        title: learningPath.title || '',
        description: learningPath.description || '',
        thumbnail_url: learningPath.thumbnail_url || '',
        auto_assign_rules: learningPath.auto_assign_rules || {
          department_ids: [],
          role_ids: [],
          locations: [],
        }
      });
      setSelectedCourses(learningPath.courses?.map((c: any) => ({
        id: c.course.id,
        title: c.course.title,
        thumbnail_url: c.course.thumbnail_url,
        order: c.order
      })) || []);
    }
  }, [learningPath]);

  useEffect(() => {
    // Fetch departments and roles for auto-assign
    const fetchMetadata = async () => {
      try {
        const [deptRes, rolesRes] = await Promise.all([
          api.get('/departments'),
          api.get('/roles')
        ]);
        setDepartments(deptRes.data.data || []);
        setRoles(rolesRes.data.data || []);
      } catch (err) {
        console.error("Failed to fetch metadata", err);
      }
    };
    fetchMetadata();
  }, []);

  const handleSave = async () => {
    if (!formData.title) {
      toast.error("Please enter a title for the learning path");
      return;
    }

    const payload = {
      ...formData,
      courses: selectedCourses.map((c, index) => ({
        course_id: c.id,
        order: index
      }))
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: Number(id), data: payload });
        toast.success("Learning path updated successfully");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Learning path created successfully");
      }
      navigate('/lms/learning-paths');
    } catch (err) {
      toast.error("Failed to save learning path");
    }
  };

  const addCourse = (course: any) => {
    if (selectedCourses.find(c => c.id === course.id)) return;
    setSelectedCourses([...selectedCourses, course]);
  };

  const removeCourse = (courseId: number) => {
    setSelectedCourses(selectedCourses.filter(c => c.id !== courseId));
  };

  const toggleRule = (type: 'department_ids' | 'role_ids', id: number) => {
    const current = [...formData.auto_assign_rules[type]];
    const index = current.indexOf(id);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(id);
    }
    setFormData({
      ...formData,
      auto_assign_rules: {
        ...formData.auto_assign_rules,
        [type]: current
      }
    });
  };

  const filteredCourses = allCourses.filter((c: any) => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedCourses.find(sc => sc.id === c.id)
  );

  if (isLoadingPath && isEdit) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-poppins w-full max-w-full mx-auto px-0 py-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/lms/learning-paths')}
            className="rounded-lg hover:bg-muted"
          >
            <ChevronLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-2 text-primary font-black text-[10px]   mb-1">
               <Layers size={14} /> 
               <span>Path Builder</span>
            </div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              {isEdit ? 'Edit Learning Path' : 'Create Learning Path'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/lms/learning-paths')}
            className="border-border text-gray-600 font-bold h-11 px-6 rounded-lg"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="bg-primary hover:bg-primary/95 text-white font-black h-11 px-8 rounded-lg shadow-sm flex items-center gap-2"
          >
            <Save size={18} /> {isEdit ? 'Save Changes' : 'Publish Path'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted p-1.5 rounded-lg border border-border mb-8 flex w-fit">
          <TabsTrigger value="overview" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary font-black text-xs   flex items-center gap-2">
            <Layout size={14} /> Overview
          </TabsTrigger>
          <TabsTrigger value="curriculum" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary font-black text-xs   flex items-center gap-2">
            <BookOpen size={14} /> Curriculum
          </TabsTrigger>
          <TabsTrigger value="assignments" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary font-black text-xs   flex items-center gap-2">
            <Users size={14} /> Assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-lg border-border shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/50 border-b border-border p-6">
                  <CardTitle className="text-lg font-black text-foreground">General Information</CardTitle>
                  <CardDescription className="text-xs font-medium text-muted-foreground mt-1">Define the basic properties of your professional journey</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-foreground  tracking-widest">Path Title</label>
                    <Input 
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="e.g. Senior Leadership Program 2026"
                      className="h-12 rounded-lg border-border focus:ring-primary/10 focus:border-primary font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-foreground  tracking-widest">Description</label>
                    <textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={6}
                      placeholder="Describe what learners will achieve through this path..."
                      className="w-full p-4 bg-card border border-border rounded-lg focus:ring-2 focus:ring-primary/10 focus:border-primary font-medium outline-none transition-all resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="rounded-lg border-border shadow-sm overflow-hidden bg-muted/30">
                <CardHeader className="p-6">
                  <CardTitle className="text-sm font-black text-foreground  tracking-widest">Preview & Stats</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                   <div className="aspect-video bg-card rounded-lg border border-border flex items-center justify-center overflow-hidden">
                      {formData.thumbnail_url ? (
                        <img src={formData.thumbnail_url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-300">
                           <Layout size={32} />
                           <span className="text-[10px] font-black  tracking-widest">No Thumbnail</span>
                        </div>
                      )}
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-card p-4 rounded-lg border border-border">
                         <p className="text-xl font-black text-primary">{selectedCourses.length}</p>
                         <p className="text-[10px] font-bold text-muted-foreground  tracking-widest">Courses</p>
                      </div>
                      <div className="bg-card p-4 rounded-lg border border-border">
                         <p className="text-xl font-black text-primary">--</p>
                         <p className="text-[10px] font-bold text-muted-foreground  tracking-widest">Est. Duration</p>
                      </div>
                   </div>

                   <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3">
                      <Info size={18} className="text-primaryshrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-blue-800 leading-relaxed">
                        Learning paths help organize content into logical sequences, making it easier for employees to follow structured training.
                      </p>
                   </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="curriculum" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="rounded-lg border-border shadow-sm h-fit">
              <CardHeader className="p-6 border-b border-gray-50">
                <CardTitle className="text-lg font-black text-foreground">Path Sequence</CardTitle>
                <CardDescription className="text-xs font-medium text-muted-foreground">The order in which courses must be completed</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                 {selectedCourses.length === 0 ? (
                    <div className="py-12 flex flex-col items-center text-center space-y-3 text-gray-300">
                       <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                          <Plus size={24} />
                       </div>
                       <p className="text-sm font-bold text-muted-foreground  tracking-widest">No courses added yet</p>
                    </div>
                 ) : (
                    <div className="space-y-3">
                       {selectedCourses.map((course, index) => (
                          <div key={course.id} className="flex items-center gap-4 p-4 bg-muted rounded-lg group hover:bg-card hover:shadow-sm border border-transparent hover:border-border transition-all">
                             <div className="w-8 h-8 bg-card rounded-lg flex items-center justify-center text-xs font-black text-primary shadow-sm">
                                {index + 1}
                             </div>
                             <div className="flex-1">
                                <p className="text-sm font-black text-foreground">{course.title}</p>
                                <p className="text-[10px] font-bold text-muted-foreground  tracking-widest mt-0.5">Course</p>
                             </div>
                             <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => removeCourse(course.id)}
                                  className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 size={16} />
                                </Button>
                                <div className="cursor-grab text-gray-300">
                                  <GripVertical size={16} />
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </CardContent>
            </Card>

            <Card className="rounded-lg border-border shadow-sm">
              <CardHeader className="p-6 border-b border-gray-50">
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search courses to add..."
                    className="pl-11 h-11 rounded-lg border-border font-medium"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                 <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredCourses.length === 0 ? (
                       <p className="text-center py-8 text-xs font-bold text-muted-foreground  tracking-widest">No more courses found</p>
                    ) : (
                       filteredCourses.map((course: any) => (
                          <div key={course.id} className="flex items-center justify-between p-4 border border-gray-50 rounded-lg hover:border-primary-100 hover:bg-primary/10/30 transition-all group">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                                   {course.thumbnail_url ? (
                                     <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                   ) : (
                                     <BookOpen size={16} className="text-muted-foreground" />
                                   )}
                                </div>
                                <p className="text-sm font-black text-foreground line-clamp-1">{course.title}</p>
                             </div>
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               onClick={() => addCourse(course)}
                               className="h-8 w-8 text-primary hover:bg-primary-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                                <Plus size={18} />
                             </Button>
                          </div>
                       ))
                    )}
                 </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="rounded-lg border-border shadow-sm overflow-hidden">
               <CardHeader className="p-6 border-b border-gray-50 bg-muted/50">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="w-8 h-8 bg-blue-100 text-primaryrounded-lg flex items-center justify-center">
                        <Building2 size={16} />
                     </div>
                     <CardTitle className="text-lg font-black text-foreground">Department Alignment</CardTitle>
                  </div>
                  <CardDescription className="text-xs font-medium text-muted-foreground">Automatically enroll members from specific departments</CardDescription>
               </CardHeader>
               <CardContent className="p-6">
                  <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                     {departments.map(dept => (
                        <div 
                          key={dept.id} 
                          onClick={() => toggleRule('department_ids', dept.id)}
                          className={`flex items-center justify-between p-4 rounded-lg cursor-pointer border transition-all ${
                            formData.auto_assign_rules.department_ids.includes(dept.id)
                              ? 'bg-primary/10 border-primary-200 ring-2 ring-primary/5'
                              : 'bg-card border-gray-50 hover:border-primary-100'
                          }`}
                        >
                           <div className="flex items-center gap-3">
                              <p className={`text-sm font-black ${
                                formData.auto_assign_rules.department_ids.includes(dept.id) ? 'text-primary' : 'text-foreground'
                              }`}>{dept.department_name}</p>
                           </div>
                           <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                             formData.auto_assign_rules.department_ids.includes(dept.id)
                               ? 'bg-primary border-primary text-white'
                               : 'border-border'
                           }`}>
                              {formData.auto_assign_rules.department_ids.includes(dept.id) && <CheckCircle2 size={12} />}
                           </div>
                        </div>
                     ))}
                  </div>
               </CardContent>
            </Card>

            <Card className="rounded-lg border-border shadow-sm overflow-hidden">
               <CardHeader className="p-6 border-b border-gray-50 bg-muted/50">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                        <Briefcase size={16} />
                     </div>
                     <CardTitle className="text-lg font-black text-foreground">Job Role Targets</CardTitle>
                  </div>
                  <CardDescription className="text-xs font-medium text-muted-foreground">Target employees based on their professional designations</CardDescription>
               </CardHeader>
               <CardContent className="p-6">
                  <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                     {roles.map(role => (
                        <div 
                          key={role.id} 
                          onClick={() => toggleRule('role_ids', role.id)}
                          className={`flex items-center justify-between p-4 rounded-lg cursor-pointer border transition-all ${
                            formData.auto_assign_rules.role_ids.includes(role.id)
                              ? 'bg-purple-50 border-purple-200 ring-2 ring-purple-500/5'
                              : 'bg-card border-gray-50 hover:border-purple-100'
                          }`}
                        >
                           <div className="flex items-center gap-3">
                              <p className={`text-sm font-black ${
                                formData.auto_assign_rules.role_ids.includes(role.id) ? 'text-purple-600' : 'text-foreground'
                              }`}>{role.role_name}</p>
                           </div>
                           <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                             formData.auto_assign_rules.role_ids.includes(role.id)
                               ? 'bg-purple-600 border-purple-600 text-white'
                               : 'border-border'
                           }`}>
                              {formData.auto_assign_rules.role_ids.includes(role.id) && <CheckCircle2 size={12} />}
                           </div>
                        </div>
                     ))}
                  </div>
               </CardContent>
            </Card>
          </div>

          <div className="mt-8 bg-emerald-50 border border-emerald-100 p-6 rounded-lg flex items-start gap-4">
             <div className="w-10 h-10 bg-card text-emerald-600 rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <ShieldCheck size={20} />
             </div>
             <div>
                <p className="text-sm font-black text-emerald-900">Auto-Enrollment Active</p>
                <p className="text-xs font-medium text-emerald-700/80 mt-1 leading-relaxed">
                   When you publish this path, all current and future employees matching the selected criteria will be automatically enrolled. This ensures consistency in training across your organization.
                </p>
             </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
