import apiClient from "./api";

export async function getResources(params = {}) {
  const response = await apiClient.get("/api/resources/", { params });
  return response.data;
}

export async function getResource(id) {
  const response = await apiClient.get(`/api/resources/${id}/`);
  return response.data;
}

export async function createResource(data) {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  const config = isFormData ? { headers: { "Content-Type": "multipart/form-data" } } : {};
  const response = await apiClient.post("/api/resources/", data, config);
  return response.data;
}

export async function updateResource(id, data) {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  const config = isFormData ? { headers: { "Content-Type": "multipart/form-data" } } : {};
  const response = await apiClient.patch(`/api/resources/${id}/`, data, config);
  return response.data;
}

export async function deleteResource(id) {
  await apiClient.delete(`/api/resources/${id}/`);
}
