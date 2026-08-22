import apiClient from "./api";

/**
 * Search across goals, tasks, resources, and notes.
 * @param {string} query — search term (min 2 characters)
 * @param {string} [type] — optional comma-separated type filter: goal,task,resource,note
 */
export async function search(query, type = "") {
  const params = { q: query };
  if (type) params.type = type;
  const response = await apiClient.get("/api/search/", { params });
  return response.data;
}
