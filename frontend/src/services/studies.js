import api from "./api";

export async function getStudySessions(params = {}) {
  const response = await api.get("/api/studies/", { params });
  return response.data;
}

export async function getStudySession(id) {
  const response = await api.get(`/api/studies/${id}/`);
  return response.data;
}

export async function createStudySession(payload) {
  const response = await api.post("/api/studies/", payload);
  return response.data;
}

export async function updateStudySession(id, payload) {
  const response = await api.patch(`/api/studies/${id}/`, payload);
  return response.data;
}

export async function deleteStudySession(id) {
  await api.delete(`/api/studies/${id}/`);
}
