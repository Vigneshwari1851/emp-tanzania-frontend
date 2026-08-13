import api from "@/shared/services/axiosInstance";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Fetch all surveys (admin lists all, employees see active ones)
export const useSurveys = (filters?: { department?: string; status?: string; listTab?: string }) => {
  return useQuery({
    queryKey: ["surveys", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.department && filters.department !== "All Departments") {
        params.append("department", filters.department);
      }
      
      let finalStatus = "";
      if (filters?.listTab === "active") finalStatus = "Active";
      else if (filters?.listTab === "past") finalStatus = "Closed";
      
      if (filters?.status && filters.status !== "All Status") {
        finalStatus = filters.status;
      }
      
      if (finalStatus) {
        params.append("status", finalStatus);
      }
      
      const queryString = params.toString() ? `?${params.toString()}` : "";
      const res = await api.get(`/surveys${queryString}`);
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
  });
};

// Fetch a single survey details with questions and options
export const useSurvey = (id: string | undefined) => {
  return useQuery({
    queryKey: ["survey", id],
    queryFn: async () => {
      const res = await api.get(`/surveys/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
};

// Create a new survey (admin only)
export const useCreateSurvey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      start_date?: string;
      end_date?: string;
      target_department?: string;
      questions: {
        type: string;
        label: string;
        order: number;
        required?: boolean;
        options?: { label: string; value: string; order: number }[];
      }[];
    }) => {
      const res = await api.post("/surveys", data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });
};

// Clone an existing survey
export const useCloneSurvey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/surveys/${id}/clone`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });
};

// Copy (Duplicate) an existing survey
export const useCopySurvey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/surveys/${id}/copy`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });
};

// Update an existing survey (admin only)
export const useUpdateSurvey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: {
      id: string;
      data: {
        title?: string;
        description?: string;
        is_active?: boolean;
        access?: string;
        survey_password?: string | null;
        theme_preset?: string | null;
        theme_config?: string | null;
        start_date?: string;
        end_date?: string;
        target_department?: string;
        questions?: {
          id?: number;
          type: string;
          label: string;
          order: number;
          required?: boolean;
          options?: { id?: number; label: string; value: string; order: number }[];
        }[];
      }
    }) => {
      const res = await api.put(`/surveys/${id}`, data);
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["survey", variables.id] });
    },
  });
};

// Submit a survey response (employee only)
export const useSubmitResponse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      surveyId: string;
      answers: {
        questionId: number;
        valueText?: string;
        valueNumber?: number;
        selectedOptionId?: number;
      }[];
    }) => {
      const res = await api.post("/surveys/responses", data);
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["survey", variables.surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey-responses", variables.surveyId] });
    },
  });
};

// Fetch survey responses for admin analytics dashboard
export const useSurveyResponses = (surveyId: string | undefined) => {
  return useQuery({
    queryKey: ["survey-responses", surveyId],
    queryFn: async () => {
      const res = await api.get(`/surveys/${surveyId}/responses`);
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
    enabled: !!surveyId,
  });
};

// Close a survey campaign (admin only)
export const useCloseSurvey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/surveys/${id}/close`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });
};

// Publish / unpublish a survey (admin only)
export const usePublishSurvey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await api.patch(`/surveys/${id}/publish`, { is_active: isActive });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });
};

// Duplicate a survey (admin only)
export const useDuplicateSurvey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/surveys/${id}/duplicate`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });
};

// Delete a survey (admin only)
export const useDeleteSurvey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/surveys/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });
};

// Log sharing a survey
export const useShareSurvey = () => {
  return useMutation({
    mutationFn: async ({ id, method }: { id: string; method: "link" | "embed" }) => {
      const res = await api.post(`/surveys/${id}/share`, { method });
      return res.data;
    },
  });
};
