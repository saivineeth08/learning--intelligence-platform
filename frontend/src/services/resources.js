import apiClient from "./api";

export async function getResources(params = {}) {
  const response = await apiClient.get("/api/resources/", { params });
  return Array.isArray(response.data) ? response.data : (response.data?.results ?? response.data);
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

export async function viewResource(id) {
  const response = await apiClient.get(`/api/resources/${id}/view/`, {
    responseType: "blob",
  });
  const contentType = response.headers["content-type"] || "application/pdf";
  const blob = new Blob([response.data], { type: contentType });
  const fileUrl = window.URL.createObjectURL(blob);
  window.open(fileUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60000);
  return fileUrl;
}

export async function downloadResource(id, filename = "downloaded-file") {
  const response = await apiClient.get(`/api/resources/${id}/download/`, {
    responseType: "blob",
  });
  const blob = new Blob([response.data]);
  const fileUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = fileUrl;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60000);
}

