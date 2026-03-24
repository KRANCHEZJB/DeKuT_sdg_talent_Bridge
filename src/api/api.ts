import axios from 'axios';

const API = axios.create({
  baseURL: 'http://127.0.0.1:8000',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const register = (data: object) => API.post('/auth/register', data);
export const login = (data: object) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');

// Student
export const createStudentProfile = (data: object) => API.post('/student/profile', data);
export const getStudentProfile = () => API.get('/student/profile');
export const getStudentApplications = () => API.get('/student/applications');

// NGO
export const createNgoProfile = (data: object) => API.post('/ngo/profile', data);
export const getNgoProfile = () => API.get('/ngo/profile');

// Projects
export const getProjects = () => API.get('/projects/');
export const getProject = (id: string) => API.get(`/projects/${id}`);
export const createProject = (data: object) => API.post('/projects/', data);
export const updateProjectStatus = (id: string, status: string) => API.patch(`/projects/${id}?status=${status}`);

// Applications
export const applyToProject = (projectId: string) => API.post(`/projects/${projectId}/apply`);
export const getApplications = (projectId: string) => API.get(`/projects/${projectId}/applications`);
export const updateApplicationStatus = (projectId: string, applicationId: string, status: string) =>
  API.patch(`/projects/${projectId}/applications/${applicationId}?status=${status}`);
