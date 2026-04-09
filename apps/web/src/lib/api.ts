import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('hms_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - handle 401
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('hms_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  register: (data: Record<string, unknown>) =>
    api.post('/auth/register', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

// Patients
export const patientsApi = {
  findAll: (search?: string) =>
    api.get('/patients', { params: { search } }).then((r) => r.data),
  findOne: (id: string) => api.get(`/patients/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/patients', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/patients/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/patients/${id}`).then((r) => r.data),
};

// Appointments
export const appointmentsApi = {
  findAll: (filters?: { doctorId?: string; patientId?: string; date?: string }) =>
    api.get('/appointments', { params: filters }).then((r) => r.data),
  findOne: (id: string) => api.get(`/appointments/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/appointments', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/appointments/${id}`, data).then((r) => r.data),
  cancel: (id: string) => api.delete(`/appointments/${id}`).then((r) => r.data),
};

// EMR
export const emrApi = {
  createVisit: (data: Record<string, unknown>) => api.post('/emr/visits', data).then((r) => r.data),
  getVisit: (id: string) => api.get(`/emr/visits/${id}`).then((r) => r.data),
  addNote: (visitId: string, data: Record<string, unknown>) =>
    api.post(`/emr/visits/${visitId}/notes`, data).then((r) => r.data),
  recordVitals: (visitId: string, data: Record<string, unknown>) =>
    api.post(`/emr/visits/${visitId}/vitals`, data).then((r) => r.data),
  getPatientHistory: (patientId: string) =>
    api.get(`/emr/patients/${patientId}/history`).then((r) => r.data),
};

// Billing
export const billingApi = {
  findAllInvoices: () => api.get('/billing/invoices').then((r) => r.data),
  findOneInvoice: (id: string) => api.get(`/billing/invoices/${id}`).then((r) => r.data),
  createInvoice: (data: Record<string, unknown>) =>
    api.post('/billing/invoices', data).then((r) => r.data),
  processPayment: (data: Record<string, unknown>) =>
    api.post('/billing/payments', data).then((r) => r.data),
  getSummary: () => api.get('/billing/summary').then((r) => r.data),
};

// Pharmacy
export const pharmacyApi = {
  findAllDrugs: () => api.get('/pharmacy/drugs').then((r) => r.data),
  createDrug: (data: Record<string, unknown>) =>
    api.post('/pharmacy/drugs', data).then((r) => r.data),
  findAllPrescriptions: () => api.get('/pharmacy/prescriptions').then((r) => r.data),
  createPrescription: (data: Record<string, unknown>) =>
    api.post('/pharmacy/prescriptions', data).then((r) => r.data),
};

// Laboratory
export const laboratoryApi = {
  findAllTests: () => api.get('/laboratory/tests').then((r) => r.data),
  findAllOrders: () => api.get('/laboratory/orders').then((r) => r.data),
  createOrder: (data: Record<string, unknown>) =>
    api.post('/laboratory/orders', data).then((r) => r.data),
};

// AI
export const aiApi = {
  analyzeSymptoms: (symptoms: string[], patientAge?: number, patientGender?: string) =>
    api.post('/ai/analyze-symptoms', { symptoms, patientAge, patientGender }).then((r) => r.data),
  checkDrugInteractions: (drugs: string[]) =>
    api.post('/ai/drug-interactions', { drugs }).then((r) => r.data),
};

export default api;
