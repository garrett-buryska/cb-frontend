// src/api/client.js

const API_URL = 'http://localhost:8080/api';

// Helper function to extract a specific cookie by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

export const apiClient = async (endpoint, method, { body, ...customConfig } = {}) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Grab the CSRF token from the browser's cookies and attach it
  const csrfToken = getCookie('csrf_token');
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const config = {
    method: method,
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
    // CRITICAL: This sends the HttpOnly session cookie
    credentials: 'include', 
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  // Handle empty responses (like 204 No Content for Deletes)
  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'An error occurred with the API');
  }

  return data;
};