import api from "./api";

export async function getTasks(params = {}) {
  const response = await api.get("/api/tasks/", { params });
  return Array.isArray(response.data) ? response.data : (response.data?.results ?? response.data);
}

export async function getTask(id) {
  const response = await api.get(`/api/tasks/${id}/`);
  return response.data;
}

export async function createTask(payload) {
  const response = await api.post("/api/tasks/", payload);
  return response.data;
}

export async function updateTask(id, payload) {
  const response = await api.patch(`/api/tasks/${id}/`, payload);
  return response.data;
}

export async function deleteTask(id) {
  await api.delete(`/api/tasks/${id}/`);
}
