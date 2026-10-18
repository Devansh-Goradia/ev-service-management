const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Returns Authorization Bearer header using token stored in localStorage.
 */
export function getAuthHeaders() {
  const token = localStorage.getItem('ev_token');
  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

/**
 * Core fetch wrapper with error handling.
 * Automatically attaches auth headers and parses JSON responses.
 */
export async function apiCall(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch {
      // Ignore JSON parse errors for error responses
    }
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// ──────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────

/**
 * Register a new user account.
 * @param {Object} data - { full_name, email, phone, password }
 */
export async function register(data) {
  return apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Log in with email and password.
 * @param {Object} data - { email, password }
 */
export async function login(data) {
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Fetch the currently authenticated user's info.
 */
export async function getMe() {
  return apiCall('/auth/me');
}

// ──────────────────────────────────────────────
// Vehicles
// ──────────────────────────────────────────────

/**
 * Fetch all vehicles for the current user.
 */
export async function getVehicles() {
  return apiCall('/vehicles');
}

/**
 * Create a new vehicle.
 * @param {Object} data - { manufacturer, model, registration_number, purchase_year }
 */
export async function createVehicle(data) {
  return apiCall('/vehicles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing vehicle by ID.
 * @param {string} id - Vehicle UUID
 * @param {Object} data - Fields to update
 */
export async function updateVehicle(id, data) {
  return apiCall(`/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a vehicle by ID.
 * @param {string} id - Vehicle UUID
 */
export async function deleteVehicle(id) {
  return apiCall(`/vehicles/${id}`, {
    method: 'DELETE',
  });
}

// ──────────────────────────────────────────────
// Service Types
// ──────────────────────────────────────────────

/**
 * Fetch all available service types.
 */
export async function getServiceTypes() {
  return apiCall('/service-types');
}

// ──────────────────────────────────────────────
// Service Requests
// ──────────────────────────────────────────────

/**
 * Create a new service request.
 * @param {Object} data - { vehicle_id, service_type_id, preferred_date, description }
 */
export async function createService(data) {
  return apiCall('/services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Fetch all service requests for the current user.
 */
export async function getServices() {
  return apiCall('/services');
}

/**
 * Fetch a single service request by ID.
 * @param {string} id - Service request UUID
 */
export async function getService(id) {
  return apiCall(`/services/${id}`);
}

// ──────────────────────────────────────────────
// Dashboard
// ──────────────────────────────────────────────

/**
 * Fetch summary statistics for the dashboard.
 */
export async function getDashboardStats() {
  return apiCall('/dashboard/stats');
}

// ──────────────────────────────────────────────
// User Profile
// ──────────────────────────────────────────────

/**
 * Fetch the current user's full profile.
 */
export async function getUserProfile() {
  return apiCall('/users/me');
}

/**
 * Update the current user's profile.
 * @param {Object} data - { full_name, phone }
 */
export async function updateUserProfile(data) {
  return apiCall('/users/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ──────────────────────────────────────────────
// Indian EV Database
// ──────────────────────────────────────────────

/**
 * Fetch all Indian EV models with optional manufacturer or body_type filter.
 */
export async function getIndianEVs(params = {}) {
  const query = new URLSearchParams();
  if (params.manufacturer) query.append('manufacturer', params.manufacturer);
  if (params.body_type) query.append('body_type', params.body_type);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiCall(`/indian-evs${qs}`);
}

/**
 * Fetch list of manufacturers and their models.
 */
export async function getIndianEVManufacturers() {
  return apiCall('/indian-evs/manufacturers');
}

/**
 * Fetch DBMS aggregation stats for the Indian EV database.
 */
export async function getIndianEVStats() {
  return apiCall('/indian-evs/stats');
}
