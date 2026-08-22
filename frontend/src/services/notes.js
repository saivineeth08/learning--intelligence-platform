import apiClient from "./api";

export async function getNotes(params = {}) {
  const response = await apiClient.get("/api/notes/", { params });
  return response.data;
}

export async function getNote(id) {
  const response = await apiClient.get(`/api/notes/${id}/`);
  return response.data;
}

export async function createNote(data) {
  const response = await apiClient.post("/api/notes/", data);
  return response.data;
}

export async function updateNote(id, data) {
  const response = await apiClient.patch(`/api/notes/${id}/`, data);
  return response.data;
}

export async function deleteNote(id) {
  await apiClient.delete(`/api/notes/${id}/`);
}
