import axios from 'axios'

// ─── AXIOS INSTANCE ───────────────────────────────────────────────────────────
const API = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 15000,
})

// ─── TOKEN HELPERS ────────────────────────────────────────────────────────────
let tokenMemory: string | null = null

export const setToken = (token: string | null) => {
  tokenMemory = token
  if (token) {
    localStorage.setItem('dekut_token', token)
  } else {
    localStorage.removeItem('dekut_token')
  }
}

export const getToken = (): string | null => {
  return tokenMemory || localStorage.getItem('dekut_token')
}

// ─── REQUEST INTERCEPTOR ──────────────────────────────────────────────────────
API.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── RESPONSE INTERCEPTOR ─────────────────────────────────────────────────────
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network error
      showToast('Network error. Please check your connection.', 'error')
      return Promise.reject(error)
    }

    const status = error.response.status

    if (status === 401) {
      setToken(null)
      window.location.href = '/auth'
      return Promise.reject(error)
    }

    if (status === 500) {
      showToast('Server error. Please try again later.', 'error')
      return Promise.reject(error)
    }

    // 400, 403, 404, 422 — let components handle these
    return Promise.reject(error)
  }
)

// ─── TOAST (lightweight — no dependency) ─────────────────────────────────────
type ToastType = 'success' | 'error' | 'info' | 'warning'

export const showToast = (message: string, type: ToastType = 'info') => {
  const colors: Record<ToastType, string> = {
    success: '#10b981',
    error:   '#ef4444',
    info:    '#3b82f6',
    warning: '#f59e0b',
  }

  const toast = document.createElement('div')
  toast.textContent = message
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #1a1a24;
    color: #f1f5f9;
    border: 1px solid ${colors[type]};
    border-left: 4px solid ${colors[type]};
    padding: 14px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-family: Inter, sans-serif;
    z-index: 9999;
    max-width: 380px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    animation: slideIn 0.2s ease;
  `

  const style = document.createElement('style')
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);   opacity: 1; }
    }
  `
  document.head.appendChild(style)
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 4000)
}

// ─── 422 ERROR MAPPER ─────────────────────────────────────────────────────────
export const extract422Errors = (error: any): Record<string, string> => {
  if (error.response?.status !== 422) return {}
  const detail = error.response.data.detail
  if (!Array.isArray(detail)) return {}
  const fieldErrors: Record<string, string> = {}
  detail.forEach((err: any) => {
    const field = err.loc[err.loc.length - 1]
    fieldErrors[field] = err.msg
  })
  return fieldErrors
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const register = (data: object) => API.post('/auth/register', data)
export const login    = (data: object) => API.post('/auth/login', data)
export const getMe    = ()             => API.get('/auth/me')

// ─── STUDENT ──────────────────────────────────────────────────────────────────
export const createStudentProfile = (data: object) =>
  API.post('/students/profile', data)
export const getStudentProfile = () =>
  API.get('/students/profile')
export const getMyApplications = (signal?: AbortSignal) =>
  API.get('/applications/mine', { signal })
export const getMyCertificates = (signal?: AbortSignal) =>
  API.get('/certificates', { signal })
export const getMyLetterRequests = (signal?: AbortSignal) =>
  API.get('/letters/mine', { signal })
export const requestLetter = (data: object) =>
  API.post('/letters/request', data)

// ─── PERSONAL PROJECTS ────────────────────────────────────────────────────────
export const submitPersonalProject = (data: object) =>
  API.post('/personal-projects', data)
export const getMyPersonalProjects = (signal?: AbortSignal) =>
  API.get('/personal-projects/mine', { signal })
export const getPersonalProjectsShowcase = (signal?: AbortSignal) =>
  API.get('/personal-projects', { signal })

// ─── NGO ──────────────────────────────────────────────────────────────────────
export const createNgoProfile = (data: object) =>
  API.post('/organizations/profile', data)
export const getNgoProfile = () =>
  API.get('/organizations/profile')
export const getMyProjects = (signal?: AbortSignal) =>
  API.get('/projects/mine', { signal })
export const getProjectApplications = (projectId: string, signal?: AbortSignal) =>
  API.get(`/projects/${projectId}/applications`, { signal })
export const updateApplicationStatus = (applicationId: string, data: object) =>
  API.patch(`/applications/${applicationId}/status`, data)

// ─── PROJECTS ─────────────────────────────────────────────────────────────────
export const getProjects = (params?: {
  skill?: string
  type?: string
  limit?: number
  offset?: number
  signal?: AbortSignal
}) => {
  const { signal, ...rest } = params || {}
  return API.get('/projects', { params: rest, signal })
}
export const getProject    = (id: string) => API.get(`/projects/${id}`)
export const createProject = (data: object) => API.post('/projects', data)
export const applyToProject = (projectId: string) =>
  API.post(`/projects/${projectId}/apply`)

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export const getNotifications = (signal?: AbortSignal) =>
  API.get('/notifications', { signal })
export const markNotificationRead = (id: string) =>
  API.patch(`/notifications/${id}/read`)
export const markAllNotificationsRead = () =>
  API.patch('/notifications/read-all')

// ─── SDGs ─────────────────────────────────────────────────────────────────────
export const getSdgs = () => API.get('/sdgs')

// ─── ADMIN ────────────────────────────────────────────────────────────────────
export const getAdminDashboard    = (signal?: AbortSignal) =>
  API.get('/admin/dashboard', { signal })
export const getAdminImpact       = (signal?: AbortSignal) =>
  API.get('/admin/impact', { signal })
export const getAuditLog          = (signal?: AbortSignal) =>
  API.get('/admin/audit-log', { signal })
export const getStudentQueue      = (signal?: AbortSignal) =>
  API.get('/admin/queues/students', { signal })
export const getOrgQueue          = (signal?: AbortSignal) =>
  API.get('/admin/queues/organizations', { signal })
export const getProjectQueue      = (signal?: AbortSignal) =>
  API.get('/admin/queues/projects', { signal })
export const getIpQueue           = (signal?: AbortSignal) =>
  API.get('/admin/queues/personal-projects', { signal })
export const verifyStudent        = (studentId: string) =>
  API.patch(`/students/${studentId}/verify`)
export const bulkVerifyStudents   = (studentIds: string[]) =>
  API.patch('/students/bulk-verify', studentIds)
export const approveOrganization  = (orgId: string, data: object) =>
  API.patch(`/organizations/${orgId}/approval`, data)
export const approveProject       = (projectId: string, data: object) =>
  API.patch(`/projects/${projectId}/approval`, data)
export const recordIp             = (projectId: string) =>
  API.patch(`/personal-projects/${projectId}/record-ip`)
export const approveShowcase      = (projectId: string) =>
  API.patch(`/personal-projects/${projectId}/approve-showcase`)
export const rejectPersonalProject = (projectId: string, reason: string) =>
  API.patch(`/personal-projects/${projectId}/reject?reason=${encodeURIComponent(reason)}`)
export const listStudents         = (signal?: AbortSignal) =>
  API.get('/students', { signal })
export const listOrganizations    = (signal?: AbortSignal) =>
  API.get('/organizations', { signal })

export default API
// ─── MESSAGING ────────────────────────────────────────────────────────────────
export const getMyThreads = (signal?: AbortSignal) =>
  API.get('/messages/threads', { signal })
export const getThread = (threadId: string) =>
  API.get(`/messages/threads/${threadId}`)
export const createThread = (data: object) =>
  API.post('/messages/threads', data)
export const sendMessage = (threadId: string, data: object) =>
  API.post(`/messages/threads/${threadId}/messages`, data)
export const closeThread = (threadId: string) =>
  API.patch(`/messages/threads/${threadId}/close`)
// ─── DISPUTES ─────────────────────────────────────────────────────────────────
export const raiseDispute = (data: object) =>
  API.post('/disputes', data)
export const getMyDisputes = () =>
  API.get('/disputes/mine')
export const getAllDisputes = () =>
  API.get('/disputes')
export const resolveDispute = (disputeId: string, resolution_notes: string) =>
  API.patch(`/disputes/${disputeId}/resolve`, null, { params: { resolution_notes } })
// ─── RECOMMENDATION LETTERS — ADMIN ───────────────────────────────────────────
export const getAllLetterRequests = () =>
  API.get('/letters/all')
export const reviewLetterRequest = (letterId: string, action: string, pdf_url?: string) =>
  API.patch(`/letters/${letterId}/review`, null, { params: { action, pdf_url } })
// ─── BOOTCAMPS ────────────────────────────────────────────────────────────────
export const createBootcamp = (data: object) =>
  API.post('/bootcamps', data)
export const getBootcamps = () =>
  API.get('/bootcamps')
export const getAllBootcamps = () =>
  API.get('/bootcamps/all')
export const verifyBootcamp = (bootcampId: string) =>
  API.patch(`/bootcamps/${bootcampId}/verify`)

// ─── AWARDS ───────────────────────────────────────────────────────────────────
export const getAwardCategories = () =>
  API.get('/awards/categories')
export const createAwardCategory = (data: object) =>
  API.post('/awards/categories', data)
export const issueAward = (data: object) =>
  API.post('/awards', data)
export const getAwards = () =>
  API.get('/awards')
export const submitStudentReview = (application_id: string, data: object) =>
  API.post(`/reviews/ngo-reviews-student?application_id=${application_id}`, data)
export const submitNgoReview = (application_id: string, data: object) =>
  API.post(`/reviews/student-reviews-ngo?application_id=${application_id}`, data)
export const getMyStudentReviews = () =>
  API.get('/reviews/my-student-reviews')

export const getPendingCertificates = (signal?: AbortSignal) =>
  API.get('/admin/pending-certificates', { signal })
export const issueCertificate = (applicationId: string) =>
  API.patch(`/applications/${applicationId}/approve-completion`)
export const submitWork = (applicationId: string, data: object) =>
  API.post(`/applications/${applicationId}/submit-work`, data)
export const getSubmission = (applicationId: string) =>
  API.get(`/applications/${applicationId}/submission`)
export const reviewSubmission = (applicationId: string, action: string, feedback: string) =>
  API.patch(`/applications/${applicationId}/review-submission?action=${action}&feedback=${encodeURIComponent(feedback)}`)
// ─── ADMIN — USER MANAGEMENT ──────────────────────────────────────────────────
export const getUserAuditLog = (userId: string) =>
  API.get(`/admin/users/${userId}/audit-log`)
export const cancelDeletion = (userId: string) =>
  API.patch(`/admin/users/${userId}/cancel-deletion`)
export const purgeUser = (userId: string) =>
  API.delete(`/admin/users/${userId}/purge`)
export const processScheduledDeletions = () =>
  API.post('/admin/users/process-deletions')

export const suspendUser    = (userId: string) =>
  API.patch(`/admin/users/${userId}/suspend`)
export const banUser        = (userId: string) =>
  API.patch(`/admin/users/${userId}/ban`)
export const reactivateUser = (userId: string) =>
  API.patch(`/admin/users/${userId}/reactivate`)

// ─── ADMIN — PROJECT MANAGEMENT ───────────────────────────────────────────────
export const adminCloseProject = (projectId: string) =>
  API.patch(`/admin/projects/${projectId}/close`)

// ─── NGO — PROJECT MANAGEMENT ─────────────────────────────────────────────────
export const ngoCloseProject = (projectId: string) =>
  API.patch(`/ngo/projects/${projectId}/close`)

// ─── STUDENT — APPLICATION MANAGEMENT ────────────────────────────────────────
export const withdrawApplication = (applicationId: string) =>
  API.patch(`/applications/${applicationId}/withdraw`)

