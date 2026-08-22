import apiClient from "./api";

export async function getDashboardSummary() {
  const response = await apiClient.get("/api/analytics/dashboard/");
  return response.data;
}

export async function getStudyTimeAnalytics(days = 7) {
  const response = await apiClient.get("/api/analytics/study-time/", {
    params: { days },
  });
  return response.data;
}

export async function getGoalAnalytics() {
  const response = await apiClient.get("/api/analytics/goals/");
  return response.data;
}

export async function getTaskAnalytics() {
  const response = await apiClient.get("/api/analytics/tasks/");
  return response.data;
}
