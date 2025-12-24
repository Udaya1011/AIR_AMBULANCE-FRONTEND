import apiClient from "./apiClient";

export interface DashboardStats {
    active_transfers: number;
    pending_approvals: number;
    available_aircraft: number;
    critical_patients: number;
}

export interface Activity {
    id: string;
    type: string;
    status: string;
    timestamp: string;
    description: string;
}

export const DashboardService = {
    getRecentBookings: async (limit: number = 10) => {
        const response = await apiClient.get(`/api/dashboard/recent-bookings?limit=${limit}`);
        return response;
    },

    getStats: async (): Promise<DashboardStats> => {
        const response = await apiClient.get("/api/dashboard/stats");
        return response;
    },

    getActivities: async (): Promise<{ activities: Activity[] }> => {
        const response = await apiClient.get("/api/dashboard/activity-transfers");
        return response;
    }
};
