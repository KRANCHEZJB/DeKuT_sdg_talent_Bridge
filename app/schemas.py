import uuid
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr


# ─── AUTH ─────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: str = Field(..., max_length=150)
    password: str = Field(..., max_length=128)
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    role: str

class UserLogin(BaseModel):
    email: str = Field(..., max_length=150)
    password: str = Field(..., max_length=128)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)

class UserRead(BaseModel):
    id: uuid.UUID
    email: str = Field(..., max_length=150)
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── STUDENT PROFILE ──────────────────────────────────────────────────────────

class StudentProfileCreate(BaseModel):
    display_name: str
    profile_slug: str
    registration_number: str
    school: str
    course: str
    year_of_study: int
    expected_graduation_year: int
    supervisor_name: str
    bio: Optional[str] = None
    skills: Optional[List[str]] = []

class StudentProfileRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    display_name: str
    profile_slug: str
    registration_number: str
    school: str
    course: str
    year_of_study: int
    expected_graduation_year: int
    supervisor_name: str
    bio: Optional[str] = None
    skills: List[str] = []
    engagement_status: str
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class StudentProfilePublic(BaseModel):
    id: uuid.UUID
    display_name: str
    profile_slug: str
    school: str
    course: str
    year_of_study: int
    bio: Optional[str] = None
    skills: List[str] = []
    engagement_status: str
    is_verified: bool

    class Config:
        from_attributes = True


# ─── NGO PROFILE ──────────────────────────────────────────────────────────────

class NgoProfileCreate(BaseModel):
    organization_name: str
    organization_slug: str
    organization_type: str
    mission_statement: str
    primary_email: str
    website: Optional[str] = None
    country: str
    contact_phone: str

class NgoProfileRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    organization_name: str
    organization_slug: str
    organization_type: str
    mission_statement: str
    primary_email: str
    website: Optional[str] = None
    country: str
    contact_phone: str
    approval_status: str
    is_approved: bool
    rejection_reason: Optional[str] = None
    annual_fee_tier: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── PROJECT ──────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    project_name: str
    project_slug: Optional[str] = None
    description: str
    sdg_focus: str
    skills_required: Optional[List[str]] = []
    location: str
    is_remote: Optional[bool] = True
    duration_weeks: Optional[int] = None
    participation_type: Optional[str] = "individual"
    team_size_min: Optional[int] = 1
    team_size_max: Optional[int] = 1
    technology_level: Optional[str] = "basic"
    requires_funding: Optional[bool] = False
    submission_type: Optional[str] = "link"
    submission_instructions: Optional[str] = None
    physical_review_date: Optional[datetime] = None
    physical_review_location: Optional[str] = None

class ProjectRead(BaseModel):
    id: uuid.UUID
    ngo_id: uuid.UUID
    project_name: str
    project_slug: str
    description: str
    sdg_focus: str
    skills_required: List[str] = []
    location: str
    is_remote: bool
    duration_weeks: Optional[int] = None
    participation_type: str
    team_size_min: int
    team_size_max: int
    technology_level: str
    requires_funding: bool
    project_status: str
    approval_condition: Optional[str] = None
    bootcamp_required: bool
    rejection_reason: Optional[str] = None
    created_at: datetime
    submission_type: str = "link"
    submission_instructions: Optional[str] = None
    physical_review_date: Optional[datetime] = None
    physical_review_location: Optional[str] = None

    class Config:
        from_attributes = True


# ─── APPLICATION ──────────────────────────────────────────────────────────────

class ApplicationRead(BaseModel):
    application_id: uuid.UUID
    project_id: uuid.UUID
    student_id: uuid.UUID
    status: str
    applied_at: datetime
    selected_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    officially_completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ApplicationStatusUpdate(BaseModel):
    status: str


# ─── PERSONAL PROJECT ─────────────────────────────────────────────────────────

class PersonalProjectCreate(BaseModel):
    title: str
    problem_statement: str
    solution_description: str
    sdg_focus: str
    technologies: Optional[List[str]] = []
    outcome: str
    evidence_urls: Optional[List[str]] = []
    is_commercially_sensitive: Optional[bool] = False

class PersonalProjectRead(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    title: str
    problem_statement: str
    solution_description: str
    sdg_focus: str
    technologies: List[str] = []
    outcome: str
    evidence_urls: List[str] = []
    is_commercially_sensitive: bool
    ip_reference: Optional[str] = None
    ip_recorded_at: Optional[datetime] = None
    status: str
    admin_quality_score: Optional[int] = None
    rejection_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PersonalProjectPublic(BaseModel):
    id: uuid.UUID
    title: str
    problem_statement: str
    sdg_focus: str
    technologies: List[str] = []
    ip_reference: Optional[str] = None
    ip_recorded_at: Optional[datetime] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── PROJECT OUTCOME ──────────────────────────────────────────────────────────

class ProjectOutcomeCreate(BaseModel):
    completion_date: date
    deliverables_received: str
    quality_rating: int
    communication_rating: int
    reliability_rating: int
    technical_skill_rating: int
    sdg_commitment_rating: int
    written_review: str
    sdg_impact_achieved: str
    would_work_again: str
    outcome_summary: str
    evidence_urls: Optional[List[str]] = []

class ProjectOutcomeRead(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    completion_date: date
    deliverables_received: str
    quality_rating: int
    communication_rating: int
    reliability_rating: int
    technical_skill_rating: int
    sdg_commitment_rating: int
    written_review: str
    sdg_impact_achieved: str
    would_work_again: str
    outcome_summary: str
    evidence_urls: List[str] = []
    submitted_at: datetime

    class Config:
        from_attributes = True


# ─── STUDENT REFLECTION ───────────────────────────────────────────────────────

class StudentReflectionCreate(BaseModel):
    confirmed: bool
    reflection_text: str
    is_disputed: Optional[bool] = False
    dispute_reason: Optional[str] = None


# ─── REVIEWS ──────────────────────────────────────────────────────────────────

class StudentReviewCreate(BaseModel):
    overall_rating: float
    review_text: str

class NgoReviewCreate(BaseModel):
    clarity_rating: int
    support_rating: int
    fairness_rating: int
    sdg_authenticity_rating: int
    review_text: str


# ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

class NotificationRead(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationSummary(BaseModel):
    notifications: List[NotificationRead]
    unread_count: int


# ─── CERTIFICATES ─────────────────────────────────────────────────────────────

class WorkSubmissionCreate(BaseModel):
    description: str
    deliverable_url: str  # required — must be a link to the work
    hours_worked: Optional[int] = None

class WorkSubmissionRead(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    description: str
    deliverable_url: Optional[str] = None
    hours_worked: Optional[int] = None
    submitted_at: datetime
    ngo_feedback: Optional[str] = None
    class Config:
        from_attributes = True

class CertificateRead(BaseModel):
    id: uuid.UUID
    cert_type: str
    reference_number: str
    pdf_url: Optional[str] = None
    issued_at: datetime
    title: Optional[str] = None
    project_name: Optional[str] = None

    class Config:
        from_attributes = True


# ─── RECOMMENDATION REQUEST ───────────────────────────────────────────────────

class RecommendationRequestCreate(BaseModel):
    purpose: str

class RecommendationRequestRead(BaseModel):
    id: uuid.UUID
    purpose: str
    status: str
    pdf_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── ADMIN ────────────────────────────────────────────────────────────────────

class OrgApprovalAction(BaseModel):
    action: str
    rejection_reason: Optional[str] = None
    condition_text: Optional[str] = None

class ProjectApprovalAction(BaseModel):
    action: str
    rejection_reason: Optional[str] = None
    condition_text: Optional[str] = None

class AdminDashboardStats(BaseModel):
    total_students: int
    pending_verification: int
    total_organizations: int
    pending_approval: int
    total_projects: int
    open_projects: int
    total_applications: int
    pending_completions: int
    open_disputes: int


# ─── ADOPTION ─────────────────────────────────────────────────────────────────

class AdoptionRequestCreate(BaseModel):
    intended_use: str
    deployment_scale: str
    adoption_level: int
    compensation_offered: str

class AdoptionRequestRead(BaseModel):
    id: uuid.UUID
    personal_project_id: uuid.UUID
    ngo_id: uuid.UUID
    intended_use: str
    deployment_scale: str
    adoption_level: int
    compensation_offered: str
    status: str
    admin_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── DISPUTES ─────────────────────────────────────────────────────────────────

class DisputeCreate(BaseModel):
    against_id: uuid.UUID
    application_id: Optional[uuid.UUID] = None
    personal_project_id: Optional[uuid.UUID] = None
    dispute_type: str
    description: str

class DisputeRead(BaseModel):
    id: uuid.UUID
    dispute_type: str
    description: str
    tier: int
    status: str
    resolution_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── FUNDING ──────────────────────────────────────────────────────────────────

class FundingDeclarationCreate(BaseModel):
    funding_purpose: str
    estimated_cost_min: float
    estimated_cost_max: float
    expenditure_cap: float
    reimbursement_committed: bool = True

class ReceiptCreate(BaseModel):
    amount: float
    currency: str = "KES"
    purpose: str
    supplier_name: str
    receipt_date: date
    receipt_image_url: str


# ─── BOOTCAMP ─────────────────────────────────────────────────────────────────

class BootcampCreate(BaseModel):
    project_id: uuid.UUID
    title: str
    description: Optional[str] = None
    skills_taught: Optional[List[str]] = []
    delivery_mode: str
    scheduled_date: date
    duration_hours: Optional[int] = None
    facilitator_names: Optional[str] = None
    max_attendees: int
    prerequisites: Optional[str] = None
    materials_url: Optional[str] = None

class BootcampRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    ngo_id: uuid.UUID
    title: str
    skills_taught: List[str] = []
    delivery_mode: str
    scheduled_date: date
    max_attendees: int
    status: str
    admin_verified: bool
    created_at: datetime
    ngo_name: Optional[str] = None
    project_name: Optional[str] = None

    class Config:
        from_attributes = True

# ─── AWARDS ──────────────────────────────────────────────────────────────────
class AwardCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    track: str
    frequency: str

class AwardCategoryRead(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    track: str
    frequency: str
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class AwardCreate(BaseModel):
    category_id: uuid.UUID
    winner_student_id: uuid.UUID
    application_id: Optional[uuid.UUID] = None
    personal_project_id: Optional[uuid.UUID] = None
    award_period: str
    cash_amount: Optional[float] = 0
    certificate_url: Optional[str] = None

class AwardRead(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    winner_student_id: uuid.UUID
    award_period: str
    cash_amount: Optional[float] = 0
    certificate_url: Optional[str] = None
    issued_at: datetime
    student_name: Optional[str] = None
    category_name: Optional[str] = None
    class Config:
        from_attributes = True

# ─── MESSAGING ────────────────────────────────────────────────────────────────
class MessageThreadCreate(BaseModel):
    project_id: Optional[uuid.UUID] = None
    student_id: uuid.UUID
    ngo_id: uuid.UUID
    purpose: str = "general"

class MessageCreate(BaseModel):
    content: str

class MessageRead(BaseModel):
    id: uuid.UUID
    thread_id: uuid.UUID
    sender_id: uuid.UUID
    sender_role: str
    content: str
    sent_at: datetime
    is_flagged: bool
    class Config:
        from_attributes = True

class MessageThreadRead(BaseModel):
    id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    student_id: uuid.UUID
    ngo_id: uuid.UUID
    opened_by: uuid.UUID
    purpose: str
    status: str
    created_at: datetime
    messages: List[MessageRead] = []
    class Config:
        from_attributes = True
