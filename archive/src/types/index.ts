export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'student' | 'ngo' | 'admin' | 'super_admin'
  is_active: boolean
  created_at: string
}

export interface StudentProfile {
  id: string
  user_id: string
  display_name: string
  profile_slug: string
  registration_number: string
  school: string
  course: string
  year_of_study: number
  expected_graduation_year: number
  supervisor_name: string
  bio: string | null
  skills: string[]
  is_verified: boolean
  is_profile_public: boolean
  engagement_status: string
  verified_at: string | null
  created_at: string
}

export interface NgoProfile {
  id: string
  user_id: string
  organization_name: string
  organization_slug: string
  organization_type: string
  mission_statement: string
  primary_email: string
  website: string | null
  country: string
  contact_phone: string | null
  is_approved: boolean
  approval_status: string
  rejection_reason: string | null
  created_at: string
}

export interface Project {
  id: string
  ngo_id: string
  project_name: string
  project_slug: string
  description: string
  sdg_focus: string
  skills_required: string[]
  location: string
  is_remote: boolean
  duration_weeks: number
  participation_type: 'individual' | 'team'
  team_size_min: number
  team_size_max: number
  technology_level: string
  requires_funding: boolean
  project_status: string
  rejection_reason: string | null
  created_at: string
}

export interface Application {
  application_id: string
  project_id: string
  student_id: string
  status: string
  applied_at: string
  selected_at: string | null
}

export interface WorkSubmission {
  id: string
  application_id: string
  description: string
  deliverable_url: string | null
  hours_worked: number | null
  submitted_at: string
  ngo_feedback: string | null
}

export interface PersonalProject {
  id: string
  student_id: string
  title: string
  problem_statement: string
  solution_description: string
  sdg_focus: string
  technologies: string[]
  outcome: string
  evidence_urls: string[]
  is_commercially_sensitive: boolean
  status: string
  ip_reference: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

export interface NotificationSummary {
  notifications: Notification[]
  unread_count: number
}

export interface Certificate {
  id: string
  student_id: string
  project_id: string
  certificate_type: string
  issued_at: string
  certificate_url: string | null
}

export interface AuditLog {
  id: string
  action: string
  target_type: string
  target_id: string
  old_status: string | null
  new_status: string | null
  notes: string | null
  created_at: string
  admin_name: string
  admin_role: string
}

export interface AdminDashboardStats {
  total_students: number
  pending_verification: number
  total_organizations: number
  pending_approval: number
  total_projects: number
  open_projects: number
  total_applications: number
  pending_completions: number
  open_disputes: number
}
