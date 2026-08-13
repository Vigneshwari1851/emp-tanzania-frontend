import api from "@/shared/services/axiosInstance";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useCourses = (params: any = {}) => {
  return useQuery({
    queryKey: ["lms-courses", params],
    queryFn: async () => {
      const res = await api.get("/lms/courses", { params });
      return res.data.data;
    },
  });
};

export const useCourse = (id: number) => {
  return useQuery({
    queryKey: ["lms-course", id],
    queryFn: async () => {
      const res = await api.get(`/lms/courses/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
};

export const useCreateCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          if (typeof data[key] === 'object' && data[key] !== null && !(data[key] instanceof File)) {
            formData.append(key, JSON.stringify(data[key]));
          } else {
            formData.append(key, data[key]);
          }
        }
      });
      const res = await api.post("/lms/courses", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-courses"] });
    },
  });
};

export const useUpdateCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          if (typeof data[key] === 'object' && data[key] !== null && !(data[key] instanceof File)) {
            formData.append(key, JSON.stringify(data[key]));
          } else {
            formData.append(key, data[key]);
          }
        }
      });
      const res = await api.put(`/lms/courses/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lms-courses"] });
      queryClient.invalidateQueries({ queryKey: ["lms-course", variables.id] });
    },
  });
};

export const useLearnerDashboard = () => {
  return useQuery({
    queryKey: ["lms-learner-dashboard"],
    queryFn: async () => {
      const res = await api.get("/lms/dashboard");
      return res.data.data;
    },
  });
};

export const useAdminStats = () => {
  return useQuery({
    queryKey: ["lms-admin-stats"],
    queryFn: async () => {
      const res = await api.get("/lms/admin/stats");
      return res.data.data;
    },
  });
};

export const useManagerStats = () => {
  return useQuery({
    queryKey: ["lms-manager-stats"],
    queryFn: async () => {
      const res = await api.get("/lms/manager/stats");
      return res.data.data;
    },
  });
};

export const useTrackProgress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/lms/progress", data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-learner-dashboard"] });
    },
  });
};

export const useDeleteCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/lms/courses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-courses"] });
    },
  });
};

export const useArchiveCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/lms/courses/${id}/archive`);
      return res.data.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["lms-courses"] });
      queryClient.invalidateQueries({ queryKey: ["lms-course", id] });
    },
  });
};

export const useDuplicateCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/lms/courses/${id}/duplicate`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-courses"] });
    },
  });
};

export const useAddModule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, title, description, order }: { courseId: number; title: string; description?: string; order: number }) => {
      const res = await api.post(`/lms/courses/${courseId}/modules`, { title, description, order });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lms-course", variables.courseId] });
    },
  });
};

export const useUpdateModule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, moduleId, ...data }: { courseId: number; moduleId: number; title: string; description?: string; order?: number }) => {
      const res = await api.patch(`/lms/modules/${moduleId}`, data);
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lms-course", variables.courseId] });
    },
  });
};

export const useDeleteModule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, moduleId }: { courseId: number; moduleId: number }) => {
      await api.delete(`/lms/modules/${moduleId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lms-course", variables.courseId] });
    },
  });
};

export const useAddContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ moduleId, courseId, ...data }: { moduleId: number; courseId: number; [key: string]: any }) => {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          if (typeof data[key] === 'object' && data[key] !== null && !(data[key] instanceof File)) {
            formData.append(key, JSON.stringify(data[key]));
          } else {
            formData.append(key, data[key]);
          }
        }
      });
      const res = await api.post(`/lms/modules/${moduleId}/content`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lms-course", variables.courseId] });
    },
  });
};

export const useUpdateContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contentId, courseId, ...data }: { contentId: number; courseId: number; [key: string]: any }) => {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          if (typeof data[key] === 'object' && data[key] !== null && !(data[key] instanceof File)) {
            formData.append(key, JSON.stringify(data[key]));
          } else {
            formData.append(key, data[key]);
          }
        }
      });
      const res = await api.patch(`/lms/content/${contentId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lms-course", variables.courseId] });
    },
  });
};

export const useDeleteContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, contentId }: { courseId: number; contentId: number }) => {
      await api.delete(`/lms/contents/${contentId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lms-course", variables.courseId] });
    },
  });
};

// Learning Paths
export const useLearningPaths = (params: any = {}) => {
  return useQuery({
    queryKey: ["lms-learning-paths", params],
    queryFn: async () => {
      const res = await api.get("/lms/learning-paths", { params });
      return res.data.data;
    },
  });
};

export const useLearningPath = (id: number) => {
  return useQuery({
    queryKey: ["lms-learning-path", id],
    queryFn: async () => {
      const res = await api.get(`/lms/learning-paths/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
};

export const useCreateLearningPath = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/lms/learning-paths", data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-learning-paths"] });
    },
  });
};

export const useUpdateLearningPath = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/lms/learning-paths/${id}`, data);
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lms-learning-paths"] });
      queryClient.invalidateQueries({ queryKey: ["lms-learning-path", variables.id] });
    },
  });
};

export const useDeleteLearningPath = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/lms/learning-paths/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-learning-paths"] });
    },
  });
};
