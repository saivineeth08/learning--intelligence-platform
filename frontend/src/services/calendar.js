import api from "./api";

/**
 * Fetch calendar events for the authenticated user within a date range or month/year.
 * @param {Object} params - { start_date, end_date, year, month }
 * @returns {Promise<Object>}
 */
export async function fetchCalendarEvents(params = {}) {
  const response = await api.get("/api/calendar/", { params });
  return response.data;
}
