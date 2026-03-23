import { api } from "../api";
import type {
  CreateMission,
  UpdateMission,
  MissionStatus,
  AutonomyLevel,
} from "@paperclipai/shared";

export interface Mission {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  objectives: string[];
  status: MissionStatus;
  autonomyLevel: AutonomyLevel;
  budgetCapUsd?: number;
  budgetSpentUsd?: number; // This would be returned from GET endpoint (calculated)
  digestSchedule: "realtime" | "hourly" | "daily" | "weekly";
  startedAt?: string; // ISO date string
  expiresAt?: string; // ISO date string
  completedAt?: string; // ISO date string  
  createdBy: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface ListMissionsResponse {
  missions: Mission[];
}

export interface GetMissionResponse {
  mission: Mission;
}

export interface CreateMissionRequest extends CreateMission {
  objectives: string[];
}

export interface UpdateMissionRequest extends UpdateMission {
  objectives?: string[];
}

export const missionsApi = {
  /**
   * List missions for a company
   */
  async list(companyId: string): Promise<Mission[]> {
    const response = await api.get<ListMissionsResponse>(`/companies/${companyId}/missions`);
    return response.missions;
  },

  /**
   * Get a specific mission 
   */
  async get(companyId: string, missionId: string): Promise<Mission> {
    const response = await api.get<GetMissionResponse>(`/companies/${companyId}/missions/${missionId}`);
    return response.mission;
  },

  /**
   * Create a new mission
   */
  async create(companyId: string, data: CreateMissionRequest): Promise<Mission> {
    const response = await api.post<GetMissionResponse>(`/companies/${companyId}/missions`, data);
    return response.mission;
  },

  /**
   * Update an existing mission
   */
  async update(companyId: string, missionId: string, data: UpdateMissionRequest): Promise<Mission> {
    const response = await api.patch<GetMissionResponse>(`/companies/${companyId}/missions/${missionId}`, data);
    return response.mission;
  },

  /**
   * Delete a mission (admin only)
   */
  async delete(companyId: string, missionId: string): Promise<void> {
    await api.delete(`/companies/${companyId}/missions/${missionId}`);
  },

  /**
   * Launch a mission (transition from draft to active)
   */
  async launch(companyId: string, missionId: string): Promise<Mission> {
    const response = await api.patch<GetMissionResponse>(`/companies/${companyId}/missions/${missionId}/launch`, {});
    return response.mission;
  },

  /**
   * Pause a mission (active to paused)
   */
  async pause(companyId: string, missionId: string): Promise<Mission> {
    const response = await api.patch<GetMissionResponse>(`/companies/${companyId}/missions/${missionId}/pause`, {});
    return response.mission;
  },

  /**
   * Resume a mission (paused to active)
   */
  async resume(companyId: string, missionId: string): Promise<Mission> {
    const response = await api.patch<GetMissionResponse>(`/companies/${companyId}/missions/${missionId}/resume`, {});
    return response.mission;
  },

  /**
   * Complete a mission (active to completed) 
   */
  async complete(companyId: string, missionId: string): Promise<Mission> {
    const response = await api.patch<GetMissionResponse>(`/companies/${companyId}/missions/${missionId}/complete`, {});
    return response.mission;
  },
};