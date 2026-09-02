import api from "./api";

export async function getGoals(params = {}) {
  const response = await api.get("/api/goals/", { params });
  return Array.isArray(response.data) ? response.data : (response.data?.results ?? response.data);
}

export async function getGoal(id) {
  const response = await api.get(`/api/goals/${id}/`);
  return response.data;
}

export async function createGoal(payload) {
  const response = await api.post("/api/goals/", payload);
  return response.data;
}

export async function updateGoal(id, payload) {
  const response = await api.patch(`/api/goals/${id}/`, payload);
  return response.data;
}

export async function deleteGoal(id) {
  await api.delete(`/api/goals/${id}/`);
}
