import apiClient from "./api";

/**
 * Trigger backend text extraction, chunking, and vector indexing for a resource.
 * @param {number} resourceId
 */
export async function indexResource(resourceId) {
  const response = await apiClient.post("/api/ai/documents/index/", {
    resource_id: resourceId,
  });
  return response.data;
}

/**
 * Check if a resource has been processed and indexed into DocumentChunks.
 * @param {number} resourceId
 */
export async function getDocumentIndexStatus(resourceId) {
  const response = await apiClient.get(`/api/ai/documents/${resourceId}/status/`);
  return response.data;
}

/**
 * List all chat sessions for the authenticated user.
 */
export async function listChatSessions() {
  const response = await apiClient.get("/api/ai/chat/sessions/");
  return response.data;
}

/**
 * Create a new chat session.
 * @param {Object} data - { resource_id?: number, title?: string }
 */
export async function createChatSession(data) {
  const response = await apiClient.post("/api/ai/chat/sessions/", data);
  return response.data;
}

/**
 * Get a specific chat session with its message history.
 * @param {number} sessionId
 */
export async function getChatSession(sessionId) {
  const response = await apiClient.get(`/api/ai/chat/sessions/${sessionId}/`);
  return response.data;
}

/**
 * Send a user message in a chat session and receive grounded AI answer.
 * @param {number} sessionId
 * @param {string} message
 */
export async function sendChatMessage(sessionId, message) {
  const response = await apiClient.post(`/api/ai/chat/sessions/${sessionId}/messages/`, {
    message,
  });
  return response.data;
}

/**
 * List all generated quizzes for the user.
 */
export async function listQuizzes() {
  const response = await apiClient.get("/api/ai/quizzes/");
  return response.data;
}

/**
 * Generate a new quiz from a resource or goal.
 * @param {Object} data - { resource_id?: number, goal_id?: number, title?: string, question_count?: number, difficulty?: string }
 */
export async function generateQuiz(data) {
  const response = await apiClient.post("/api/ai/quizzes/generate/", data);
  return response.data;
}

/**
 * Get a specific quiz with all its questions.
 * @param {number} quizId
 */
export async function getQuiz(quizId) {
  const response = await apiClient.get(`/api/ai/quizzes/${quizId}/`);
  return response.data;
}

/**
 * Fetch rule-based learning recommendations for the authenticated user.
 */
export async function getRecommendations() {
  const response = await apiClient.get("/api/ai/recommendations/");
  return response.data;
}
