import uuid
from sqlalchemy import (
    Column, String, Boolean, Integer, Text,
    ForeignKey, ARRAY, Numeric, Date, TIMESTAMP
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base


# ─── USERS ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email           = Column(String(255), nullable=False, unique=True)
    hashed_password = Column(String(255), nullable=False)
    first_name      = Column(String(100), nullable=False)
    last_name       = Column(String(100), nullable=False)
    role            = Column(String(20),  nullable=False)
    last_login      = Column(TIMESTAMP(timezone=True), nullable=True)
    status          = Column(String(20),  nullable=False, server_default="active")
    deletion_scheduled_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at      = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False, foreign_keys="StudentProfile.user_id")
    ngo_profile     = relationship("NgoProfile",     back_populates="user", uselist=False, foreign_keys="NgoProfile.user_id")
    notifications   = relationship("Notification",   back_populates="user")


# ─── STUDENT PROFILE ──────────────────────────────────────────────────────────

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id                       = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id                  = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    display_name             = Column(String(150), nullable=False)
    profile_slug             = Column(String(150), nullable=False, unique=True)
    registration_number      = Column(String(50),  nullable=False, unique=True)
    school                   = Column(String(150), nullable=False)
    course                   = Column(String(150), nullable=False)
    year_of_study            = Column(Integer,     nullable=False)
    expected_graduation_year = Column(Integer,     nullable=False)
    supervisor_name          = Column(String(150), nullable=False)
    bio                      = Column(Text,        nullable=True)
    skills                   = Column(ARRAY(Text), nullable=False, server_default="{}")
    engagement_status        = Column(String(25),  nullable=False, server_default="pending_verification")
    is_verified              = Column(Boolean,     nullable=False, server_default="false")
    verified_by              = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at              = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at               = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    user                    = relationship("User", back_populates="student_profile", foreign_keys=[user_id])
    applications            = relationship("Application", back_populates="student")
    personal_projects       = relationship("PersonalProject", back_populates="student")
    certificates            = relationship("Certificate", back_populates="student")
    recommendation_requests = relationship("RecommendationRequest", back_populates="student")


# ─── NGO PROFILE ──────────────────────────────────────────────────────────────

class NgoProfile(Base):
    __tablename__ = "ngo_profiles"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id           = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    organization_name = Column(String(255), nullable=False)
    organization_slug = Column(String(255), nullable=False, unique=True)
    organization_type = Column(String(50),  nullable=False)
    mission_statement = Column(Text,        nullable=False)
    primary_email     = Column(String(255), nullable=False)
    website           = Column(String(255), nullable=True)
    country           = Column(String(100), nullable=False)
    contact_phone     = Column(String(50),  nullable=False)
    approval_status   = Column(String(25),  nullable=False, server_default="pending")
    is_approved       = Column(Boolean,     nullable=False, server_default="false")
    approved_by       = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at       = Column(TIMESTAMP(timezone=True), nullable=True)
    rejection_reason  = Column(Text,        nullable=True)
    annual_fee_tier   = Column(String(30),  nullable=True)
    created_at        = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    user     = relationship("User", back_populates="ngo_profile", foreign_keys=[user_id])
    projects = relationship("Project", back_populates="ngo")


# ─── PROJECT ──────────────────────────────────────────────────────────────────

class Project(Base):
    __tablename__ = "projects"

    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ngo_id             = Column(UUID(as_uuid=True), ForeignKey("ngo_profiles.id", ondelete="CASCADE"), nullable=False)
    project_name       = Column(String(255), nullable=False)
    project_slug       = Column(String(255), nullable=False, unique=True)
    description        = Column(Text,        nullable=False)
    sdg_focus          = Column(String(255), nullable=False)
    skills_required    = Column(ARRAY(Text), nullable=False, server_default="{}")
    location           = Column(String(150), nullable=False)
    is_remote          = Column(Boolean,     nullable=False, server_default="true")
    duration_weeks     = Column(Integer,     nullable=True)
    participation_type = Column(String(20),  nullable=False, server_default="individual")
    team_size_min      = Column(Integer,     nullable=False, server_default="1")
    team_size_max      = Column(Integer,     nullable=False, server_default="1")
    technology_level   = Column(String(20),  nullable=False, server_default="basic")
    requires_funding   = Column(Boolean,     nullable=False, server_default="false")
    project_status     = Column(String(30),  nullable=False, server_default="pending_approval")
    approval_condition = Column(Text,        nullable=True)
    bootcamp_required  = Column(Boolean,     nullable=False, server_default="false")
    approved_by        = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at        = Column(TIMESTAMP(timezone=True), nullable=True)
    rejection_reason   = Column(Text,        nullable=True)
    created_at                = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    submission_type           = Column(String(30),  nullable=False, server_default="link")
    submission_instructions   = Column(Text,        nullable=True)
    physical_review_date      = Column(TIMESTAMP(timezone=True), nullable=True)
    physical_review_location  = Column(String(255), nullable=True)

    # Relationships
    ngo                 = relationship("NgoProfile", back_populates="projects")
    applications        = relationship("Application", back_populates="project")
    bootcamps           = relationship("Bootcamp", back_populates="project")
    funding_declaration = relationship("ProjectFundingDeclaration", back_populates="project", uselist=False)


# ─── APPLICATION ──────────────────────────────────────────────────────────────

class Application(Base):
    __tablename__ = "applications"

    application_id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id              = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    student_id              = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    status                  = Column(String(30), nullable=False, server_default="applied")
    applied_at              = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    selected_at             = Column(TIMESTAMP(timezone=True), nullable=True)
    completed_at            = Column(TIMESTAMP(timezone=True), nullable=True)
    officially_completed_at = Column(TIMESTAMP(timezone=True), nullable=True)

    # Relationships
    project        = relationship("Project", back_populates="applications")
    student        = relationship("StudentProfile", back_populates="applications")
    team_members   = relationship("ApplicationTeamMember", back_populates="application")
    outcome        = relationship("ProjectOutcome", back_populates="application", uselist=False)
    reflection     = relationship("StudentReflection", back_populates="application", uselist=False)
    score          = relationship("ProjectScore", back_populates="application", uselist=False)
    student_review = relationship("StudentReview", back_populates="application", uselist=False)
    ngo_review     = relationship("NgoReview", back_populates="application", uselist=False)
    receipts       = relationship("StudentReceipt", back_populates="application")
    reimbursement  = relationship("ReimbursementObligation", back_populates="application", uselist=False)


# ─── APPLICATION TEAM MEMBERS ─────────────────────────────────────────────────

class ApplicationTeamMember(Base):
    __tablename__ = "application_team_members"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.application_id", ondelete="CASCADE"), nullable=False)
    student_id     = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    role           = Column(String(20), nullable=False, server_default="member")
    joined_at      = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    status         = Column(String(20), nullable=False, server_default="active")
    withdrawn_at   = Column(TIMESTAMP(timezone=True), nullable=True)

    # Relationships
    application = relationship("Application", back_populates="team_members")


# ─── PERSONAL PROJECT ─────────────────────────────────────────────────────────

class PersonalProject(Base):
    __tablename__ = "personal_projects"

    id                        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id                = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    title                     = Column(String(255), nullable=False)
    problem_statement         = Column(Text,        nullable=False)
    solution_description      = Column(Text,        nullable=False)
    sdg_focus                 = Column(String(255), nullable=False)
    technologies              = Column(ARRAY(Text), nullable=False, server_default="{}")
    outcome                   = Column(Text,        nullable=False)
    evidence_urls             = Column(ARRAY(Text), nullable=False, server_default="{}")
    is_commercially_sensitive = Column(Boolean,     nullable=False, server_default="false")
    ip_reference              = Column(String(50),  nullable=True,  unique=True)
    ip_recorded_at            = Column(TIMESTAMP(timezone=True), nullable=True)
    ip_recorded_by            = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status                    = Column(String(30),  nullable=False, server_default="draft")
    admin_quality_score       = Column(Integer,     nullable=True)
    rejection_reason          = Column(Text,        nullable=True)
    created_at                = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    student           = relationship("StudentProfile", back_populates="personal_projects")
    team_members      = relationship("PersonalProjectTeamMember", back_populates="personal_project")
    adoption_requests = relationship("AdoptionRequest", back_populates="personal_project")
    score             = relationship("ProjectScore", back_populates="personal_project", uselist=False)


# ─── PERSONAL PROJECT TEAM MEMBERS ───────────────────────────────────────────

class PersonalProjectTeamMember(Base):
    __tablename__ = "personal_project_team_members"

    id                   = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    personal_project_id  = Column(UUID(as_uuid=True), ForeignKey("personal_projects.id", ondelete="CASCADE"), nullable=False)
    student_id           = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    role                 = Column(String(20), nullable=False, server_default="member")
    ownership_percentage = Column(Integer,   nullable=False)
    joined_at            = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    status               = Column(String(20), nullable=False, server_default="active")
    partial_credit_pct   = Column(Integer,   nullable=True, server_default="0")
    withdrawn_at         = Column(TIMESTAMP(timezone=True), nullable=True)

    # Relationships
    personal_project = relationship("PersonalProject", back_populates="team_members")


# ─── BOOTCAMP ─────────────────────────────────────────────────────────────────

class Bootcamp(Base):
    __tablename__ = "bootcamps"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id        = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    ngo_id            = Column(UUID(as_uuid=True), ForeignKey("ngo_profiles.id", ondelete="CASCADE"), nullable=False)
    title             = Column(String(255), nullable=False)
    description       = Column(Text,        nullable=True)
    skills_taught     = Column(ARRAY(Text), nullable=False, server_default="{}")
    delivery_mode     = Column(String(20),  nullable=False)
    scheduled_date    = Column(Date,        nullable=False)
    duration_hours    = Column(Integer,     nullable=True)
    facilitator_names = Column(Text,        nullable=True)
    max_attendees     = Column(Integer,     nullable=False)
    prerequisites     = Column(Text,        nullable=True)
    materials_url     = Column(Text,        nullable=True)
    status            = Column(String(25),  nullable=False, server_default="pending_approval")
    admin_verified    = Column(Boolean,     nullable=False, server_default="false")
    verified_by       = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at        = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    project    = relationship("Project", back_populates="bootcamps")
    attendance = relationship("BootcampAttendance", back_populates="bootcamp")


# ─── BOOTCAMP ATTENDANCE ──────────────────────────────────────────────────────

class BootcampAttendance(Base):
    __tablename__ = "bootcamp_attendance"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bootcamp_id       = Column(UUID(as_uuid=True), ForeignKey("bootcamps.id", ondelete="CASCADE"), nullable=False)
    student_id        = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    registered_at     = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    attended          = Column(Boolean, nullable=False, server_default="false")
    marked_by_ngo     = Column(Boolean, nullable=False, server_default="false")
    verified_by_admin = Column(Boolean, nullable=False, server_default="false")
    cert_issued       = Column(Boolean, nullable=False, server_default="false")

    # Relationships
    bootcamp = relationship("Bootcamp", back_populates="attendance")


# ─── PROJECT OUTCOME ──────────────────────────────────────────────────────────

class ProjectOutcome(Base):
    __tablename__ = "project_outcomes"

    id                     = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id         = Column(UUID(as_uuid=True), ForeignKey("applications.application_id", ondelete="CASCADE"), nullable=False, unique=True)
    completion_date        = Column(Date,    nullable=False)
    deliverables_received  = Column(Text,    nullable=False)
    quality_rating         = Column(Integer, nullable=False)
    communication_rating   = Column(Integer, nullable=False)
    reliability_rating     = Column(Integer, nullable=False)
    technical_skill_rating = Column(Integer, nullable=False)
    sdg_commitment_rating  = Column(Integer, nullable=False)
    written_review         = Column(Text,    nullable=False)
    sdg_impact_achieved    = Column(Text,    nullable=False)
    would_work_again       = Column(String(10), nullable=False)
    outcome_summary        = Column(Text,    nullable=False)
    evidence_urls          = Column(ARRAY(Text), nullable=True, server_default="{}")
    submitted_at           = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    application = relationship("Application", back_populates="outcome")


# ─── STUDENT REFLECTION ───────────────────────────────────────────────────────

class StudentReflection(Base):
    __tablename__ = "student_reflections"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id  = Column(UUID(as_uuid=True), ForeignKey("applications.application_id", ondelete="CASCADE"), nullable=False, unique=True)
    confirmed       = Column(Boolean, nullable=False, server_default="false")
    reflection_text = Column(Text,    nullable=False)
    is_disputed     = Column(Boolean, nullable=False, server_default="false")
    dispute_reason  = Column(Text,    nullable=True)
    submitted_at    = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    application = relationship("Application", back_populates="reflection")


# ─── PROJECT SCORE ────────────────────────────────────────────────────────────

class ProjectScore(Base):
    __tablename__ = "project_scores"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id      = Column(UUID(as_uuid=True), ForeignKey("applications.application_id", ondelete="CASCADE"), nullable=True, unique=True)
    personal_project_id = Column(UUID(as_uuid=True), ForeignKey("personal_projects.id", ondelete="CASCADE"), nullable=True, unique=True)
    ngo_rating_score    = Column(Integer, nullable=True)
    outcome_score       = Column(Integer, nullable=True)
    admin_quality_score = Column(Integer, nullable=True)
    sdg_impact_score    = Column(Integer, nullable=True)
    peer_score          = Column(Integer, nullable=True)
    scored_at           = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    scored_by           = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    application      = relationship("Application", back_populates="score")
    personal_project = relationship("PersonalProject", back_populates="score")


# ─── STUDENT REVIEW ───────────────────────────────────────────────────────────

class StudentReview(Base):
    __tablename__ = "student_reviews"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.application_id", ondelete="CASCADE"), nullable=False, unique=True)
    ngo_id         = Column(UUID(as_uuid=True), ForeignKey("ngo_profiles.id", ondelete="CASCADE"), nullable=False)
    student_id     = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    overall_rating = Column(Numeric(3, 1), nullable=False)
    review_text    = Column(Text,    nullable=False)
    is_public      = Column(Boolean, nullable=False, server_default="false")
    admin_verified = Column(Boolean, nullable=False, server_default="false")
    created_at     = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    application = relationship("Application", back_populates="student_review")


# ─── NGO REVIEW ───────────────────────────────────────────────────────────────

class NgoReview(Base):
    __tablename__ = "ngo_reviews"

    id                      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id          = Column(UUID(as_uuid=True), ForeignKey("applications.application_id", ondelete="CASCADE"), nullable=False, unique=True)
    student_id              = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    ngo_id                  = Column(UUID(as_uuid=True), ForeignKey("ngo_profiles.id", ondelete="CASCADE"), nullable=False)
    clarity_rating          = Column(Integer, nullable=False)
    support_rating          = Column(Integer, nullable=False)
    fairness_rating         = Column(Integer, nullable=False)
    sdg_authenticity_rating = Column(Integer, nullable=False)
    review_text             = Column(Text,    nullable=False)
    is_public               = Column(Boolean, nullable=False, server_default="false")
    admin_verified          = Column(Boolean, nullable=False, server_default="false")
    created_at              = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    application = relationship("Application", back_populates="ngo_review")


# ─── AWARD CATEGORY ───────────────────────────────────────────────────────────

class AwardCategory(Base):
    __tablename__ = "award_categories"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String(100), nullable=False, unique=True)
    description = Column(Text,        nullable=True)
    track       = Column(String(20),  nullable=False)
    frequency   = Column(String(20),  nullable=False)
    is_active   = Column(Boolean,     nullable=False, server_default="true")
    created_at  = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    awards = relationship("Award", back_populates="category")


# ─── AWARD ────────────────────────────────────────────────────────────────────

class Award(Base):
    __tablename__ = "awards"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id         = Column(UUID(as_uuid=True), ForeignKey("award_categories.id"), nullable=False)
    winner_student_id   = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id"), nullable=False)
    application_id      = Column(UUID(as_uuid=True), ForeignKey("applications.application_id"), nullable=True)
    personal_project_id = Column(UUID(as_uuid=True), ForeignKey("personal_projects.id"), nullable=True)
    award_period        = Column(String(50),   nullable=False)
    cash_amount         = Column(Numeric(10,2), nullable=True, server_default="0")
    certificate_url     = Column(Text, nullable=True)
    issued_by           = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    issued_at           = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    category = relationship("AwardCategory", back_populates="awards")


# ─── AWARD FUND TRANSACTION ───────────────────────────────────────────────────

class AwardFundTransaction(Base):
    __tablename__ = "award_fund_transactions"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ngo_id           = Column(UUID(as_uuid=True), ForeignKey("ngo_profiles.id", ondelete="SET NULL"), nullable=True)
    student_id       = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id", ondelete="SET NULL"), nullable=True)
    amount           = Column(Numeric(10,2), nullable=False)
    currency         = Column(String(5),  nullable=False, server_default="KES")
    transaction_type = Column(String(20), nullable=False)
    reference        = Column(String(100), nullable=True)
    notes            = Column(Text,       nullable=True)
    recorded_by      = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at       = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())


# ─── ADOPTION REQUEST ─────────────────────────────────────────────────────────

class AdoptionRequest(Base):
    __tablename__ = "adoption_requests"

    id                   = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    personal_project_id  = Column(UUID(as_uuid=True), ForeignKey("personal_projects.id", ondelete="CASCADE"), nullable=False)
    ngo_id               = Column(UUID(as_uuid=True), ForeignKey("ngo_profiles.id", ondelete="CASCADE"), nullable=False)
    intended_use         = Column(Text,       nullable=False)
    deployment_scale     = Column(String(30), nullable=False)
    adoption_level       = Column(Integer,    nullable=False)
    compensation_offered = Column(Text,       nullable=False)
    status               = Column(String(30), nullable=False, server_default="pending")
    admin_notes          = Column(Text,       nullable=True)
    created_at           = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    personal_project = relationship("PersonalProject", back_populates="adoption_requests")
    agreement        = relationship("AdoptionAgreement", back_populates="request", uselist=False)


# ─── ADOPTION AGREEMENT ───────────────────────────────────────────────────────

class AdoptionAgreement(Base):
    __tablename__ = "adoption_agreements"

    id                   = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id           = Column(UUID(as_uuid=True), ForeignKey("adoption_requests.id", ondelete="CASCADE"), nullable=False, unique=True)
    agreement_reference  = Column(String(50),    nullable=False, unique=True)
    adoption_level       = Column(Integer,       nullable=False)
    rights_granted_text  = Column(Text,          nullable=False)
    rights_excluded_text = Column(Text,          nullable=False)
    credit_requirement   = Column(Text,          nullable=False)
    compensation_amount  = Column(Numeric(10,2), nullable=False)
    payment_deadline     = Column(Date,          nullable=True)
    student_signed_at    = Column(TIMESTAMP(timezone=True), nullable=True)
    ngo_signed_at        = Column(TIMESTAMP(timezone=True), nullable=True)
    admin_signed_at      = Column(TIMESTAMP(timezone=True), nullable=True)
    admin_signed_by      = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    agreement_pdf_url    = Column(Text,          nullable=True)
    created_at           = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    request = relationship("AdoptionRequest", back_populates="agreement")


# ─── PROJECT FUNDING DECLARATION ──────────────────────────────────────────────

class ProjectFundingDeclaration(Base):
    __tablename__ = "project_funding_declarations"

    id                      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id              = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True)
    funding_purpose         = Column(Text,          nullable=False)
    estimated_cost_min      = Column(Numeric(10,2), nullable=False)
    estimated_cost_max      = Column(Numeric(10,2), nullable=False)
    expenditure_cap         = Column(Numeric(10,2), nullable=False)
    reimbursement_committed = Column(Boolean,       nullable=False, server_default="true")
    admin_approved          = Column(Boolean,       nullable=False, server_default="false")
    created_at              = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    project = relationship("Project", back_populates="funding_declaration")


# ─── STUDENT RECEIPT ──────────────────────────────────────────────────────────

class StudentReceipt(Base):
    __tablename__ = "student_receipts"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id    = Column(UUID(as_uuid=True), ForeignKey("applications.application_id", ondelete="CASCADE"), nullable=False)
    student_id        = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id"), nullable=False)
    amount            = Column(Numeric(10,2), nullable=False)
    currency          = Column(String(5),   nullable=False, server_default="KES")
    purpose           = Column(Text,        nullable=False)
    supplier_name     = Column(String(255), nullable=False)
    receipt_date      = Column(Date,        nullable=False)
    receipt_image_url = Column(Text,        nullable=False)
    status            = Column(String(20),  nullable=False, server_default="pending")
    verified_by       = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at       = Column(TIMESTAMP(timezone=True), nullable=True)
    dispute_reason    = Column(Text,        nullable=True)
    created_at        = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    application = relationship("Application", back_populates="receipts")


# ─── REIMBURSEMENT OBLIGATION ─────────────────────────────────────────────────

class ReimbursementObligation(Base):
    __tablename__ = "reimbursement_obligations"

    id                    = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id        = Column(UUID(as_uuid=True), ForeignKey("applications.application_id"), nullable=False, unique=True)
    ngo_id                = Column(UUID(as_uuid=True), ForeignKey("ngo_profiles.id"), nullable=False)
    student_id            = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id"), nullable=False)
    total_verified_amount = Column(Numeric(10,2), nullable=False)
    currency              = Column(String(5),  nullable=False, server_default="KES")
    due_date              = Column(Date,       nullable=False)
    status                = Column(String(20), nullable=False, server_default="pending")
    payment_reference     = Column(String(255), nullable=True)
    payment_method        = Column(String(50),  nullable=True)
    student_confirmed     = Column(Boolean,    nullable=False, server_default="false")
    settled_at            = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at            = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    application = relationship("Application", back_populates="reimbursement")


# ─── MESSAGE THREAD ───────────────────────────────────────────────────────────

class MessageThread(Base):
    __tablename__ = "message_threads"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id       = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    personal_proj_id = Column(UUID(as_uuid=True), ForeignKey("personal_projects.id", ondelete="CASCADE"), nullable=True)
    student_id       = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id"), nullable=False)
    ngo_id           = Column(UUID(as_uuid=True), ForeignKey("ngo_profiles.id"), nullable=False)
    opened_by        = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    purpose          = Column(String(50), nullable=False)
    status           = Column(String(20), nullable=False, server_default="open")
    created_at       = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    closed_at        = Column(TIMESTAMP(timezone=True), nullable=True)

    # Relationships
    messages = relationship("Message", back_populates="thread")


# ─── MESSAGE ──────────────────────────────────────────────────────────────────

class Message(Base):
    __tablename__ = "messages"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id      = Column(UUID(as_uuid=True), ForeignKey("message_threads.id", ondelete="CASCADE"), nullable=False)
    sender_id      = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    sender_role    = Column(String(30), nullable=False)
    content        = Column(Text,    nullable=False)
    sent_at        = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    is_flagged     = Column(Boolean, nullable=False, server_default="false")
    flag_reason    = Column(Text,    nullable=True)
    admin_reviewed = Column(Boolean, nullable=False, server_default="false")

    # Relationships
    thread = relationship("MessageThread", back_populates="messages")


# ─── ADMIN BROADCAST ──────────────────────────────────────────────────────────

class AdminBroadcast(Base):
    __tablename__ = "admin_broadcasts"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id       = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    recipient_id   = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    recipient_role = Column(String(20),  nullable=False)
    subject        = Column(String(255), nullable=False)
    content        = Column(Text,        nullable=False)
    sent_at        = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    read_at        = Column(TIMESTAMP(timezone=True), nullable=True)


# ─── NOTIFICATION ─────────────────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type       = Column(String(50),  nullable=False)
    title      = Column(String(255), nullable=False)
    message    = Column(Text,        nullable=False)
    link       = Column(Text,        nullable=True)
    is_read    = Column(Boolean,     nullable=False, server_default="false")
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="notifications")


# ─── CERTIFICATE ──────────────────────────────────────────────────────────────

class WorkSubmission(Base):
    __tablename__ = "work_submissions"
    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.application_id", ondelete="CASCADE"), nullable=False, unique=True)
    student_id     = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    description    = Column(Text, nullable=False)
    deliverable_url= Column(Text, nullable=True)
    hours_worked   = Column(Integer, nullable=True)
    submitted_at   = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    ngo_feedback   = Column(Text, nullable=True)
    application    = relationship("Application", backref="work_submission")

class Certificate(Base):
    __tablename__ = "certificates"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id       = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    cert_type        = Column(String(30), nullable=False)
    reference_number = Column(String(50), nullable=False, unique=True)
    related_id       = Column(UUID(as_uuid=True), nullable=True)
    pdf_url          = Column(Text,    nullable=True)
    issued_by        = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    issued_at        = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    student = relationship("StudentProfile", back_populates="certificates")


# ─── RECOMMENDATION REQUEST ───────────────────────────────────────────────────

class RecommendationRequest(Base):
    __tablename__ = "recommendation_requests"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id  = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    purpose     = Column(Text,       nullable=False)
    status      = Column(String(20), nullable=False, server_default="pending")
    pdf_url     = Column(Text,       nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at  = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    student = relationship("StudentProfile", back_populates="recommendation_requests")


# ─── DISPUTE ──────────────────────────────────────────────────────────────────

class Dispute(Base):
    __tablename__ = "disputes"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    raised_by           = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    against_id          = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    application_id      = Column(UUID(as_uuid=True), ForeignKey("applications.application_id"), nullable=True)
    personal_project_id = Column(UUID(as_uuid=True), ForeignKey("personal_projects.id"), nullable=True)
    dispute_type        = Column(String(30), nullable=False)
    description         = Column(Text,    nullable=False)
    tier                = Column(Integer, nullable=False, server_default="1")
    status              = Column(String(20), nullable=False, server_default="open")
    resolution_notes    = Column(Text,    nullable=True)
    resolved_by         = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_at         = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at          = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
