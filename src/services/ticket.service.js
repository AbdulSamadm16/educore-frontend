import apiClient from './api';

export const ticketService = {
  /**
   * Create a new ticket (supports file attachments via FormData)
   * @param {FormData} formData - Must contain: subject, description, issueType, priority, scope, attachments[]
   */
  createTicket: async (formData) => {
    const response = await apiClient.post('/tickets', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Get tickets list with pagination and filters
   * @param {Object} params - { page, limit, status, priority, scope, category, search }
   */
  getTickets: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const response = await apiClient.get('/tickets', { params: cleanParams });
    return response.data;
  },

  /**
   * Get ticket details by ID
   * @param {String} id 
   */
  getTicketById: async (id) => {
    const response = await apiClient.get(`/tickets/${id}`);
    return response.data;
  },

  /**
   * Add a message/reply to a ticket
   * @param {String} id 
   * @param {FormData} formData - Must contain: message, isInternalNote, attachments[]
   */
  addTicketMessage: async (id, formData) => {
    const response = await apiClient.post(`/tickets/${id}/reply`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Update ticket status
   * @param {String} id 
   * @param {String} status 
   */
  updateTicketStatus: async (id, status) => {
    const response = await apiClient.patch(`/tickets/${id}/status`, { status });
    return response.data;
  },

  /**
   * Assign ticket to an agent
   * @param {String} id 
   * @param {String|null} assigneeId 
   */
  assignTicket: async (id, assigneeId) => {
    const response = await apiClient.post(`/tickets/${id}/assign`, { assigneeId });
    return response.data;
  },

  /**
   * Escalate ticket
   * @param {String} id 
   * @param {String} notes 
   */
  escalateTicket: async (id, notes = '') => {
    const response = await apiClient.post(`/tickets/${id}/escalate`, { notes });
    return response.data;
  },

  /**
   * Submit feedback for resolved/closed ticket
   * @param {String} id 
   * @param {Number} rating 
   * @param {String} comment 
   */
  submitFeedback: async (id, rating, comment = '') => {
    const response = await apiClient.post(`/tickets/${id}/feedback`, { rating, comment });
    return response.data;
  },

  /**
   * Get ticket audit logs
   * @param {String} id 
   */
  getAuditLogs: async (id) => {
    const response = await apiClient.get(`/tickets/${id}/audit-logs`);
    return response.data;
  },
};
