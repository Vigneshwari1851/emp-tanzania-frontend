import axiosInstance from '@/shared/services/axiosInstance';

export interface Team {
  id: number;
  department_id?: number;
  team_name: string;
  description?: string;
  team_lead_id?: number | null;
  team_lead?: { username: string } | null;
  members?: any[];
  members_count?: number;
  branch_id?: number;
  branch_ids?: number[];
}

export const getTeams = async (): Promise<Team[]> => {
  try {
    const response = await axiosInstance.get("/teams");
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch teams" };
  }
};

export const getTeamsByDepartment = async (departmentId: number): Promise<Team[]> => {
  try {
    const response = await axiosInstance.get(`/teams/department/${departmentId}`);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch teams for department" };
  }
};

export const getTeam = async (id: number): Promise<Team> => {
  try {
    const response = await axiosInstance.get(`/teams/${id}`);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch team details" };
  }
};

export const createTeam = async (data: any): Promise<Team> => {
  try {
    const response = await axiosInstance.post("/teams", data);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to create team" };
  }
};

export const updateTeam = async (id: number, data: any): Promise<Team> => {
  try {
    const response = await axiosInstance.put(`/teams/${id}`, data);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to update team" };
  }
};

export const deleteTeam = async (id: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/teams/${id}`);
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to delete team" };
  }
};
