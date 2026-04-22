import uuid
import re
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db import get_db
from app.models import (
    User, StudentProfile, NgoProfile, Project, Application,
    PersonalProject, Notification, Certificate, RecommendationRequest,
    ProjectOutcome, StudentReflection, Bootcamp, BootcampAttendance,
    Dispute, AdoptionRequest, StudentReceipt, ReimbursementObligation,
    AwardCategory, Award, WorkSubmission,
    MessageThread, Message,
    Certificate,
    Bootcamp, AwardCategory, Award
)
from app.schemas import (
    UserRegister, UserLogin, TokenResponse, UserRead,
    StudentProfileCreate, StudentProfileRead, StudentProfilePublic,
    NgoProfileCreate, NgoProfileRead,
    ProjectCreate, ProjectRead,
    ApplicationRead, ApplicationStatusUpdate,
    PersonalProjectCreate, PersonalProjectRead, PersonalProjectPublic,
    ProjectOutcomeCreate, ProjectOutcomeRead,
    StudentReflectionCreate,
    StudentReviewCreate, NgoReviewCreate,
    NotificationRead, NotificationSummary,
    CertificateRead,
    RecommendationRequestCreate, RecommendationRequestRead,
    OrgApprovalAction, ProjectApprovalAction, AdminDashboardStats,
    AdoptionRequestCreate, AdoptionRequestRead,
    DisputeCreate, DisputeRead,
    FundingDeclarationCreate, ReceiptCreate,
    BootcampCreate, BootcampRead,
    MessageThreadCreate, MessageThreadRead, MessageCreate, MessageRead,
    BootcampCreate, BootcampRead,
    AwardCategoryCreate, AwardCategoryRead, AwardCreate, AwardRead,
    WorkSubmissionCreate, WorkSubmissionRead
)
from app.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_student, require_ngo,
    require_admin, require_super_admin,
    require_verified_student, require_approved_ngo,
    validate_student_email
)
from app.config import DEKUT_STUDENT_EMAIL_DOMAIN
from app.sanitize import clean

# ─── RATE LIMITER ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="DeKUT SDG Talent Bridge API",
    description="Institutional innovation and talent management platform for Dedan Kimathi University of Technology",
    version="2.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://de-ku-t-sdg-talent-bridge-7kz8n5slt-francis-gachokis-projects.vercel.app",
        "https://de-ku-t-sdg-talent-bridge.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── SDG ENUM ─────────────────────────────────────────────────────────────────
VALID_SDGS = [
    "SDG 1 — No Poverty",
    "SDG 2 — Zero Hunger",
    "SDG 3 — Good Health and Well-being",
    "SDG 4 — Quality Education",
    "SDG 5 — Gender Equality",
    "SDG 6 — Clean Water and Sanitation",
    "SDG 7 — Affordable and Clean Energy",
    "SDG 8 — Decent Work and Economic Growth",
    "SDG 9 — Industry, Innovation and Infrastructure",
    "SDG 10 — Reduced Inequalities",
    "SDG 11 — Sustainable Cities and Communities",
    "SDG 12 — Responsible Consumption and Production",
    "SDG 13 — Climate Action",
    "SDG 14 — Life Below Water",
    "SDG 15 — Life on Land",
    "SDG 16 — Peace, Justice and Strong Institutions",
    "SDG 17 — Partnerships for the Goals",
]

# ─── REGISTRATION NUMBER PATTERN ──────────────────────────────────────────────
REG_NUMBER_PATTERN = re.compile(r'^[A-Z]\d{3}/\d{3,4}/\d{4}$')


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def create_notification(
    db: Session, user_id, type: str,
    title: str, message: str, link: str = None
):
    notif = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        link=link
    )
    db.add(notif)


def write_audit_log(
    db: Session,
    admin_id,
    action: str,
    target_type: str,
    target_id,
    old_status: str = None,
    new_status: str = None,
    notes: str = None
):
    db.execute(text("""
        INSERT INTO admin_audit_log
            (admin_id, action, target_type, target_id, old_status, new_status, notes)
        VALUES
            (:admin_id, :action, :target_type, :target_id,
             :old_status, :new_status, :notes)
    """), {
        "admin_id":    str(admin_id),
        "action":      action,
        "target_type": target_type,
        "target_id":   str(target_id),
        "old_status":  old_status,
        "new_status":  new_status,
        "notes":       notes
    })


def validate_slug(slug: str):
    if not re.match(r"^[a-z0-9][a-z0-9-]{1,98}[a-z0-9]$", slug):
        raise HTTPException(status_code=422, detail="Invalid slug format")

def generate_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    return slug


def match_students_to_project(
    project: Project, db: Session
) -> List[StudentProfile]:
    students = db.query(StudentProfile).filter(
        StudentProfile.engagement_status == "active",
        StudentProfile.is_verified == True
    ).all()
    if not project.skills_required:
        return students
    project_skills = set(s.lower().strip() for s in project.skills_required)
    matched = []
    for student in students:
        if not student.skills:
            matched.append(student)
            continue
        student_skills = set(s.lower().strip() for s in student.skills)
        if student_skills & project_skills:
            matched.append(student)
    return matched


# ─── ROOT ─────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "system":      "DeKUT SDG Talent Bridge",
        "version":     "2.0.0",
        "institution": "Dedan Kimathi University of Technology",
        "status":      "running"
    }


@app.get("/sdgs")
def get_sdgs():
    return {"sdgs": VALID_SDGS}


# ─── PUBLIC STATS (no auth required) ─────────────────────────────────────────

@app.get("/stats")
def get_public_stats(db: Session = Depends(get_db)):
    return {
        "total_students":      db.query(StudentProfile).count(),
        "verified_students":   db.query(StudentProfile).filter(StudentProfile.is_verified == True).count(),
        "total_organizations": db.query(NgoProfile).count(),
        "approved_orgs":       db.query(NgoProfile).filter(NgoProfile.is_approved == True).count(),
        "total_projects":      db.query(Project).count(),
        "open_projects":       db.query(Project).filter(Project.project_status == "open").count(),
        "total_applications":  db.query(Application).count(),
    }



# ═══════════════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
def register(
    request: Request,
    data: UserRegister,
    db: Session = Depends(get_db)
):
    if data.role == "student":
        validate_student_email(data.email)

    valid_roles = {"student", "ngo"}
    if data.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Role must be student or ngo")

    if db.query(User).filter(User.email == data.email.lower()).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    user = User(
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        first_name=clean(data.first_name),
        last_name=clean(data.last_name),
        role=data.role
    )
    db.add(user)
    db.commit()
    return {"message": "Account created successfully. Please login."}


@app.post("/auth/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    data: UserLogin,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    if user.status == "suspended":
        raise HTTPException(status_code=403, detail="Your account has been suspended. Contact support for assistance.")
    if user.status == "banned":
        raise HTTPException(status_code=403, detail="Your account has been permanently banned. Contact support for more information.")

    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type":   "bearer",
        "role":         user.role,
        "first_name":   user.first_name,
        "last_name":    user.last_name
    }


@app.get("/auth/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ═══════════════════════════════════════════════════════════════════════════════
# STUDENT PROFILE
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/students/profile", response_model=StudentProfileRead)
def create_or_update_student_profile(
    data: StudentProfileCreate,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()

    display_name    = clean(data.display_name)
    school          = clean(data.school)
    course          = clean(data.course)
    supervisor_name = clean(data.supervisor_name)
    bio             = clean(data.bio) if data.bio else None
    skills          = [clean(s) for s in (data.skills or [])]

    slug = data.profile_slug or generate_slug(display_name)
    validate_slug(slug)

    existing = db.query(StudentProfile).filter(
        StudentProfile.profile_slug == slug
    ).first()
    if existing and (not profile or existing.id != profile.id):
        raise HTTPException(status_code=400, detail="Profile slug already taken")

    auto_verified = bool(REG_NUMBER_PATTERN.match(data.registration_number))

    if profile:
        profile.display_name             = display_name
        profile.profile_slug             = slug
        profile.registration_number      = data.registration_number
        profile.school                   = school
        profile.course                   = course
        profile.year_of_study            = data.year_of_study
        profile.expected_graduation_year = data.expected_graduation_year
        profile.supervisor_name          = supervisor_name
        profile.bio                      = bio
        profile.skills                   = skills
    else:
        if db.query(StudentProfile).filter(
            StudentProfile.registration_number == data.registration_number
        ).first():
            raise HTTPException(status_code=400, detail="Registration number already registered")

        profile = StudentProfile(
            user_id=current_user.id,
            display_name=display_name,
            profile_slug=slug,
            registration_number=data.registration_number,
            school=school,
            course=course,
            year_of_study=data.year_of_study,
            expected_graduation_year=data.expected_graduation_year,
            supervisor_name=supervisor_name,
            bio=bio,
            skills=skills
        )
        db.add(profile)

        if auto_verified:
            profile.is_verified       = True
            profile.engagement_status = "active"
            profile.verified_at       = datetime.utcnow()
            db.flush()
            create_notification(
                db, current_user.id,
                "profile_verified",
                "Profile Verified",
                "Your profile has been automatically verified. You can now apply to projects.",
                "/student"
            )

    db.commit()
    db.refresh(profile)
    return profile


@app.get("/students/profile", response_model=StudentProfileRead)
def get_my_student_profile(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.get("/students/{slug}", response_model=StudentProfilePublic)
def get_student_public_profile(slug: str, db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(
        StudentProfile.profile_slug == slug
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")
    if hasattr(profile, 'is_profile_public') and not profile.is_profile_public:
        raise HTTPException(status_code=404, detail="Student not found")
    return profile


@app.get("/students", response_model=List[StudentProfileRead])
def list_students(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return db.query(StudentProfile).all()


# ═══════════════════════════════════════════════════════════════════════════════
# NGO PROFILE
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/organizations/profile", response_model=NgoProfileRead)
def create_or_update_ngo_profile(
    data: NgoProfileCreate,
    current_user: User = Depends(require_ngo),
    db: Session = Depends(get_db)
):
    profile = db.query(NgoProfile).filter(
        NgoProfile.user_id == current_user.id
    ).first()

    organization_name = clean(data.organization_name)
    mission_statement = clean(data.mission_statement)
    country           = clean(data.country)

    slug = data.organization_slug or generate_slug(organization_name)

    existing = db.query(NgoProfile).filter(
        NgoProfile.organization_slug == slug
    ).first()
    if existing and (not profile or existing.id != profile.id):
        raise HTTPException(status_code=400, detail="Organisation slug already taken")

    if profile:
        profile.organization_name = organization_name
        profile.organization_slug = slug
        profile.organization_type = data.organization_type
        profile.mission_statement = mission_statement
        profile.primary_email     = data.primary_email
        profile.website           = data.website
        profile.country           = country
        profile.contact_phone     = data.contact_phone
    else:
        profile = NgoProfile(
            user_id=current_user.id,
            organization_name=organization_name,
            organization_slug=slug,
            organization_type=data.organization_type,
            mission_statement=mission_statement,
            primary_email=data.primary_email,
            website=data.website,
            country=country,
            contact_phone=data.contact_phone
        )
        db.add(profile)

    db.commit()
    db.refresh(profile)
    return profile


@app.get("/organizations/profile", response_model=NgoProfileRead)
def get_my_ngo_profile(
    current_user: User = Depends(require_ngo),
    db: Session = Depends(get_db)
):
    profile = db.query(NgoProfile).filter(
        NgoProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.get("/organizations", response_model=List[NgoProfileRead])
def list_organizations(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return db.query(NgoProfile).all()


# ═══════════════════════════════════════════════════════════════════════════════
# PROJECTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/projects", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    current_user: User = Depends(require_approved_ngo),
    db: Session = Depends(get_db)
):
    ngo = db.query(NgoProfile).filter(
        NgoProfile.user_id == current_user.id
    ).first()

    if data.sdg_focus not in VALID_SDGS:
        raise HTTPException(
            status_code=400,
            detail="Invalid SDG. Must be one of the 17 UN SDGs. Use GET /sdgs for the full list."
        )

    if data.participation_type == "team":
        if data.team_size_min < 2 or data.team_size_max > 5:
            raise HTTPException(status_code=400, detail="Team size must be between 2 and 5")
        if data.team_size_min > data.team_size_max:
            raise HTTPException(status_code=400, detail="Minimum team size cannot exceed maximum")

    project_name = clean(data.project_name)
    description  = clean(data.description)
    location     = clean(data.location)
    skills       = [clean(s) for s in (data.skills_required or [])]

    slug = data.project_slug or generate_slug(project_name)
    base_slug = slug
    counter = 1
    while db.query(Project).filter(Project.project_slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    project = Project(
        ngo_id=ngo.id,
        project_name=project_name,
        project_slug=slug,
        description=description,
        sdg_focus=data.sdg_focus,
        skills_required=skills,
        location=location,
        is_remote=data.is_remote,
        duration_weeks=data.duration_weeks,
        participation_type=data.participation_type or "individual",
        team_size_min=data.team_size_min if data.participation_type == "team" else 1,
        team_size_max=data.team_size_max if data.participation_type == "team" else 1,
        technology_level=data.technology_level or "basic",
        requires_funding=data.requires_funding or False,
        project_status="pending_approval"
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@app.get("/projects", response_model=List[ProjectRead])
def list_projects(
    skill:  Optional[str] = None,
    type:   Optional[str] = None,
    limit:  int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Project).filter(Project.project_status == "open")
    if type:
        query = query.filter(Project.participation_type == type)
    query = query.order_by(Project.created_at.desc())
    projects = query.offset(offset).limit(limit).all()
    if skill:
        skill_lower = skill.lower()
        projects = [
            p for p in projects
            if any(skill_lower in s.lower() for s in (p.skills_required or []))
        ]
    return projects


@app.get("/projects/mine", response_model=List[ProjectRead])
def get_my_projects(
    current_user: User = Depends(require_ngo),
    db: Session = Depends(get_db)
):
    ngo = db.query(NgoProfile).filter(
        NgoProfile.user_id == current_user.id
    ).first()
    if not ngo:
        return []
    return db.query(Project).filter(
        Project.ngo_id == ngo.id
    ).order_by(Project.created_at.desc()).all()


@app.get("/projects/{project_id}", response_model=ProjectRead)
def get_project(project_id: uuid.UUID, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# ═══════════════════════════════════════════════════════════════════════════════
# APPLICATIONS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/projects/{project_id}/apply",
    response_model=ApplicationRead,
    status_code=status.HTTP_201_CREATED
)
def apply_to_project(
    project_id: uuid.UUID,
    current_user: User = Depends(require_verified_student),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.project_status != "open":
        raise HTTPException(status_code=400, detail="Project is not open for applications")

    student = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()

    if project.bootcamp_required:
        bootcamp = db.query(Bootcamp).filter(
            Bootcamp.student_id == student.id,
            Bootcamp.admin_verified == True
        ).first()
        if not bootcamp:
            raise HTTPException(
                status_code=403,
                detail="This project requires bootcamp attendance. You must attend and be verified at a bootcamp before applying."
            )
    existing = db.query(Application).filter(
        Application.project_id == project_id,
        Application.student_id == student.id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="You have already applied to this project")

    application = Application(
        project_id=project_id,
        student_id=student.id,
        status="applied"
    )
    db.add(application)

    create_notification(
        db, current_user.id,
        "application_submitted",
        "Application Submitted",
        f"Your application to '{project.project_name}' has been submitted.",
        "/student?tab=applications"
    )

    db.commit()
    db.refresh(application)
    return application


@app.get("/applications/mine", response_model=List[ApplicationRead])
def get_my_applications(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    student = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    if not student:
        return []
    return db.query(Application).filter(
        Application.student_id == student.id
    ).order_by(Application.applied_at.desc()).all()


@app.get(
    "/projects/{project_id}/applications",
    response_model=List[ApplicationRead]
)
def get_project_applications(
    project_id: uuid.UUID,
    current_user: User = Depends(require_ngo),
    db: Session = Depends(get_db)
):
    ngo = db.query(NgoProfile).filter(
        NgoProfile.user_id == current_user.id
    ).first()
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.ngo_id == ngo.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db.query(Application).filter(
        Application.project_id == project_id
    ).all()


@app.patch(
    "/applications/{application_id}/status",
    response_model=ApplicationRead
)
def update_application_status(
    application_id: uuid.UUID,
    data: ApplicationStatusUpdate,
    current_user: User = Depends(require_ngo),
    db: Session = Depends(get_db)
):
    valid_statuses = {"shortlisted", "selected", "rejected"}
    if data.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Status must be one of: {', '.join(valid_statuses)}"
        )

    application = db.query(Application).filter(
        Application.application_id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    application.status = data.status
    if data.status == "selected":
        application.selected_at = datetime.utcnow()
    create_notification(
        db, application.student.user_id,
        "application_status_update",
        f"Application {data.status.capitalize()}",
        f"Your application has been {data.status}.",
        "/student?tab=applications"
    )

    db.commit()
    db.refresh(application)
    return application
# ═══════════════════════════════════════════════════════════════════════════════
# WORK SUBMISSIONS
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/applications/{application_id}/submit-work", response_model=WorkSubmissionRead)
def submit_work(application_id: uuid.UUID, data: WorkSubmissionCreate, current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    application = db.query(Application).filter(Application.application_id == application_id, Application.student_id == student.id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.status not in ("selected", "revision_requested"):
        raise HTTPException(status_code=400, detail="Can only submit work for selected applications or when revision was requested")
    existing = db.query(WorkSubmission).filter(WorkSubmission.application_id == application_id).first()
    if existing:
        existing.description = data.description
        existing.deliverable_url = data.deliverable_url
        existing.hours_worked = data.hours_worked
        existing.submitted_at = datetime.utcnow()
        existing.ngo_feedback = None
        application.status = "work_submitted"
        db.commit()
        db.refresh(existing)
        return existing
    submission = WorkSubmission(application_id=application_id, student_id=student.id, description=data.description, deliverable_url=data.deliverable_url, hours_worked=data.hours_worked)
    db.add(submission)
    application.status = "work_submitted"
    ngo_profile = db.query(NgoProfile).filter(NgoProfile.id == db.query(Project).filter(Project.id == application.project_id).first().ngo_id).first()
    if ngo_profile:
        create_notification(db, ngo_profile.user_id, "work_submitted", "📋 Work Submitted", f"A student has submitted their work for review.", "/ngo?tab=applications")
    db.commit()
    db.refresh(submission)
    return submission

@app.get("/applications/{application_id}/submission", response_model=WorkSubmissionRead)
def get_submission(application_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    submission = db.query(WorkSubmission).filter(WorkSubmission.application_id == application_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="No submission found")
    return submission

@app.patch("/applications/{application_id}/approve-completion")
def approve_completion(application_id: uuid.UUID, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    application = db.query(Application).filter(Application.application_id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.status != "pending_certificate":
        raise HTTPException(status_code=400, detail="Can only issue certificate for applications pending certificate approval")
    student = db.query(StudentProfile).filter(StudentProfile.id == application.student_id).first()
    if student:
        existing_cert = db.query(Certificate).filter(Certificate.related_id == application.application_id).first()
        if not existing_cert:
            import random, string
            ref = "CERT-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
            cert = Certificate(student_id=student.id, cert_type="project_completion", reference_number=ref, related_id=application.application_id, issued_by=current_user.id)
            db.add(cert)
            create_notification(db, student.user_id, "certificate_issued", "🏆 Certificate Issued!", "Congratulations! Your project completion certificate has been issued.", "/student?tab=certificates")
    application.status = "officially_complete"
    application.officially_completed_at = datetime.utcnow()
    db.commit()
    return {"status": "certificate issued"}

@app.get("/admin/pending-certificates")
def get_pending_certificates(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    apps = db.query(Application).filter(Application.status == "pending_certificate").all()
    result = []
    for app in apps:
        student = db.query(StudentProfile).filter(StudentProfile.id == app.student_id).first()
        project = db.query(Project).filter(Project.id == app.project_id).first()
        submission = db.query(WorkSubmission).filter(WorkSubmission.application_id == app.application_id).first()
        result.append({
            "application_id": str(app.application_id),
            "student_name": student.full_name if student else "Unknown",
            "student_reg": student.registration_number if student else "",
            "project_name": project.project_name if project else "Unknown",
            "ngo_name": db.query(NgoProfile).filter(NgoProfile.id == project.ngo_id).first().org_name if project else "",
            "submitted_at": submission.submitted_at.isoformat() if submission else None,
            "description": submission.description if submission else "",
            "deliverable_url": submission.deliverable_url if submission else None,
            "hours_worked": submission.hours_worked if submission else None,
            "ngo_feedback": submission.ngo_feedback if submission else None,
        })
    return result

@app.patch("/applications/{application_id}/review-submission")
def review_submission(
    application_id: uuid.UUID,
    action: str,
    feedback: str = "",
    current_user: User = Depends(require_ngo),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(Application.application_id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    submission = db.query(WorkSubmission).filter(WorkSubmission.application_id == application_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="No submission found")
    if action == "approve":
        application.status = "pending_certificate"
        submission.ngo_feedback = feedback
        admins = db.query(User).filter(User.role == "admin").all()
        for admin in admins:
            create_notification(db, admin.id, "pending_certificate", "📋 Certificate Pending", "A student completion is awaiting your certificate approval.", "/admin?tab=certificates")
    elif action == "revision":
        application.status = "revision_requested"
        submission.ngo_feedback = feedback
        student = db.query(StudentProfile).filter(StudentProfile.id == application.student_id).first()
        if student:
            create_notification(db, student.user_id, "revision_requested", "🔄 Revision Requested", f"The NGO has requested revisions: {feedback}", "/student?tab=applications")
    db.commit()
    return {"status": application.status}



# ═══════════════════════════════════════════════════════════════════════════════
# PERSONAL PROJECTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/personal-projects",
    response_model=PersonalProjectRead,
    status_code=status.HTTP_201_CREATED
)
def submit_personal_project(
    data: PersonalProjectCreate,
    current_user: User = Depends(require_verified_student),
    db: Session = Depends(get_db)
):
    if data.sdg_focus not in VALID_SDGS:
        raise HTTPException(
            status_code=400,
            detail="Invalid SDG. Use GET /sdgs for the full list."
        )

    student = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()

    project = PersonalProject(
        student_id=student.id,
        title=clean(data.title),
        problem_statement=clean(data.problem_statement),
        solution_description=clean(data.solution_description),
        sdg_focus=data.sdg_focus,
        technologies=[clean(t) for t in (data.technologies or [])],
        outcome=clean(data.outcome),
        evidence_urls=data.evidence_urls or [],
        is_commercially_sensitive=data.is_commercially_sensitive or False,
        status="submitted"
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@app.get("/personal-projects/mine", response_model=List[PersonalProjectRead])
def get_my_personal_projects(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    student = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    if not student:
        return []
    return db.query(PersonalProject).filter(
        PersonalProject.student_id == student.id
    ).order_by(PersonalProject.created_at.desc()).all()


@app.get("/personal-projects", response_model=List[PersonalProjectPublic])
def get_personal_projects_showcase(db: Session = Depends(get_db)):
    return db.query(PersonalProject).filter(
        PersonalProject.status == "showcase_approved"
    ).order_by(PersonalProject.created_at.desc()).all()


# ═══════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/notifications", response_model=NotificationSummary)
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(50).all()

    unread = sum(1 for n in notifs if not n.is_read)
    return {"notifications": notifs, "unread_count": unread}


@app.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"status": "read"}


@app.patch("/notifications/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"status": "all read"}


# ═══════════════════════════════════════════════════════════════════════════════
# CERTIFICATES
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/certificates", response_model=List[CertificateRead])
def get_my_certificates(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    student = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    if not student:
        return []
    certs = db.query(Certificate).filter(
        Certificate.student_id == student.id
    ).order_by(Certificate.issued_at.desc()).all()
    result = []
    for c in certs:
        item = CertificateRead.from_orm(c)
        if c.cert_type == 'project_completion' and c.related_id:
            app = db.query(Application).filter(Application.application_id == c.related_id).first()
            if app:
                project = db.query(Project).filter(Project.id == app.project_id).first()
                item.project_name = project.project_name if project else None
                item.title = f"Project Completion — {project.project_name}" if project else "Project Completion"
            else:
                item.title = "Project Completion Certificate"
        else:
            item.title = c.cert_type.replace('_', ' ').title()
        result.append(item)
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# RECOMMENDATION LETTERS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/letters/request",
    response_model=RecommendationRequestRead,
    status_code=status.HTTP_201_CREATED
)
def request_recommendation_letter(
    data: RecommendationRequestCreate,
    current_user: User = Depends(require_verified_student),
    db: Session = Depends(get_db)
):
    student = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    req = RecommendationRequest(
        student_id=student.id,
        purpose=clean(data.purpose),
        status="pending"
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@app.get("/letters/mine", response_model=List[RecommendationRequestRead])
def get_my_letter_requests(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    student = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    if not student:
        return []
    return db.query(RecommendationRequest).filter(
        RecommendationRequest.student_id == student.id
    ).order_by(RecommendationRequest.created_at.desc()).all()


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/admin/dashboard", response_model=AdminDashboardStats)
def admin_dashboard(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return {
        "total_students":       db.query(StudentProfile).count(),
        "pending_verification": db.query(StudentProfile).filter(
            StudentProfile.is_verified == False).count(),
        "total_organizations":  db.query(NgoProfile).count(),
        "pending_approval":     db.query(NgoProfile).filter(
            NgoProfile.approval_status == "pending").count(),
        "total_projects":       db.query(Project).count(),
        "open_projects":        db.query(Project).filter(
            Project.project_status == "open").count(),
        "total_applications":   db.query(Application).count(),
        "pending_completions":  db.query(Application).filter(
            Application.status == "completed").count(),
        "open_disputes":        db.query(Dispute).filter(
            Dispute.status == "open").count(),
    }


@app.get("/admin/queues/students", response_model=List[StudentProfileRead])
def admin_student_verification_queue(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return db.query(StudentProfile).filter(
        StudentProfile.is_verified == False
    ).order_by(StudentProfile.created_at.asc()).all()


@app.patch("/students/{student_id}/verify")
def verify_student(
    student_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    student = db.query(StudentProfile).filter(
        StudentProfile.id == student_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if student.is_verified:
        raise HTTPException(status_code=400, detail="Student is already verified")

    old_status = "pending_verification"
    student.is_verified       = True
    student.engagement_status = "active"
    student.verified_by       = current_user.id
    student.verified_at       = datetime.utcnow()

    create_notification(
        db, student.user_id,
        "profile_verified",
        "Profile Verified",
        "Your student profile has been verified by DeKUT admin. You can now apply to projects.",
        "/student"
    )

    write_audit_log(
        db,
        admin_id=current_user.id,
        action="verify_student",
        target_type="student_profile",
        target_id=student_id,
        old_status=old_status,
        new_status="active"
    )

    db.commit()
    return {"status": "verified", "student_id": str(student_id)}


@app.patch("/students/bulk-verify")
def bulk_verify_students(
    student_ids: List[uuid.UUID],
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    verified_count = 0
    for student_id in student_ids:
        student = db.query(StudentProfile).filter(
            StudentProfile.id == student_id,
            StudentProfile.is_verified == False
        ).first()
        if student:
            student.is_verified       = True
            student.engagement_status = "active"
            student.verified_by       = current_user.id
            student.verified_at       = datetime.utcnow()
            create_notification(
                db, student.user_id,
                "profile_verified",
                "Profile Verified",
                "Your student profile has been verified by DeKUT admin.",
                "/student"
            )
            write_audit_log(
                db,
                admin_id=current_user.id,
                action="bulk_verify_student",
                target_type="student_profile",
                target_id=student_id,
                old_status="pending_verification",
                new_status="active"
            )
            verified_count += 1
    db.commit()
    return {"verified": verified_count}


@app.get("/admin/queues/organizations", response_model=List[NgoProfileRead])
def admin_org_approval_queue(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return db.query(NgoProfile).filter(
        NgoProfile.approval_status == "pending"
    ).order_by(NgoProfile.created_at.asc()).all()


@app.patch("/organizations/{org_id}/approval")
def approve_organization(
    org_id: uuid.UUID,
    data: OrgApprovalAction,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    org = db.query(NgoProfile).filter(NgoProfile.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")

    if data.action == "approve" and org.is_approved:
        raise HTTPException(status_code=400, detail="Organisation is already approved")

    old_status = org.approval_status

    if data.action == "approve":
        org.is_approved      = True
        org.approval_status  = "approved"
        org.approved_by      = current_user.id
        org.approved_at      = datetime.utcnow()
        org.rejection_reason = None
        create_notification(
            db, org.user_id,
            "org_approved",
            "Organisation Approved",
            "Your organisation has been approved by DeKUT. You can now post projects.",
            "/ngo"
        )
    elif data.action == "reject":
        org.is_approved      = False
        org.approval_status  = "rejected"
        org.rejection_reason = data.rejection_reason
        create_notification(
            db, org.user_id,
            "org_rejected",
            "Organisation Not Approved",
            f"Your organisation was not approved. Reason: {data.rejection_reason}",
            "/ngo"
        )
    elif data.action == "more_info":
        org.approval_status = "more_info_required"
    else:
        raise HTTPException(
            status_code=400,
            detail="Action must be approve, reject, or more_info"
        )

    write_audit_log(
        db,
        admin_id=current_user.id,
        action=f"org_{data.action}",
        target_type="ngo_profile",
        target_id=org_id,
        old_status=old_status,
        new_status=org.approval_status,
        notes=data.rejection_reason
    )

    db.commit()
    return {"status": data.action, "org_id": str(org_id)}


@app.get("/admin/queues/projects", response_model=List[ProjectRead])
def admin_project_approval_queue(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return db.query(Project).filter(
        Project.project_status == "pending_approval"
    ).order_by(Project.created_at.asc()).all()


@app.patch("/projects/{project_id}/approval")
def approve_project(
    project_id: uuid.UUID,
    data: ProjectApprovalAction,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.action == "approve" and project.project_status == "open":
        raise HTTPException(
            status_code=400,
            detail="Project is already approved and open"
        )

    old_status = project.project_status

    if data.action == "approve":
        project.project_status = "open"
        project.approved_by    = current_user.id
        project.approved_at    = datetime.utcnow()
        matched = match_students_to_project(project, db)
        for student in matched:
            create_notification(
                db, student.user_id,
                "new_project",
                f"New Project: {project.project_name}",
                "A new project matching your skills has been posted.",
                "/student?tab=browse"
            )
    elif data.action == "reject":
        project.project_status   = "rejected"
        project.rejection_reason = data.rejection_reason
    elif data.action == "conditional":
        project.project_status     = "conditional"
        project.approval_condition = data.condition_text
        project.bootcamp_required  = True
    else:
        raise HTTPException(
            status_code=400,
            detail="Action must be approve, reject, or conditional"
        )

    write_audit_log(
        db,
        admin_id=current_user.id,
        action=f"project_{data.action}",
        target_type="project",
        target_id=project_id,
        old_status=old_status,
        new_status=project.project_status,
        notes=data.rejection_reason or data.condition_text
    )

    db.commit()
    return {"status": data.action, "project_id": str(project_id)}

# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN — SUSPEND / BAN / REACTIVATE USER
# ═══════════════════════════════════════════════════════════════════════════════

@app.patch("/admin/users/{user_id}/suspend")
def suspend_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot suspend yourself")
    if user.status == "suspended":
        raise HTTPException(status_code=400, detail="User is already suspended")
    old_status = user.status
    user.status = "suspended"
    create_notification(db, user.id, "account_suspended", "Account Suspended", "Your account has been suspended. Contact support for assistance.", None)
    write_audit_log(db, admin_id=current_user.id, action="user_suspend", target_type="user", target_id=user_id, old_status=old_status, new_status="suspended")
    db.commit()
    return {"status": "suspended", "user_id": str(user_id)}


@app.patch("/admin/users/{user_id}/ban")
def ban_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")
    if user.status == "banned":
        raise HTTPException(status_code=400, detail="User is already banned")
    old_status = user.status
    user.status = "banned"
    user.deletion_scheduled_at = datetime.utcnow() + timedelta(days=30)
    create_notification(db, user.id, "account_banned", "Account Banned", "Your account has been permanently banned. Your data will be deleted in 30 days. Contact support for more information.", None)
    write_audit_log(db, admin_id=current_user.id, action="user_ban", target_type="user", target_id=user_id, old_status=old_status, new_status="banned", notes="Data deletion scheduled in 30 days")
    db.commit()
    return {"status": "banned", "user_id": str(user_id), "deletion_scheduled_at": user.deletion_scheduled_at.isoformat()}


@app.patch("/admin/users/{user_id}/reactivate")
def reactivate_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.status == "active":
        raise HTTPException(status_code=400, detail="User is already active")
    old_status = user.status
    user.status = "active"
    create_notification(db, user.id, "account_reactivated", "Account Reactivated", "Your account has been reactivated. Welcome back!", None)
    write_audit_log(db, admin_id=current_user.id, action="user_reactivate", target_type="user", target_id=user_id, old_status=old_status, new_status="active")
    db.commit()
    return {"status": "active", "user_id": str(user_id)}


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN — CANCEL SCHEDULED DELETION
# ═══════════════════════════════════════════════════════════════════════════════

@app.patch("/admin/users/{user_id}/cancel-deletion")
def cancel_deletion(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.deletion_scheduled_at:
        raise HTTPException(status_code=400, detail="No deletion scheduled for this user")
    user.deletion_scheduled_at = None
    create_notification(
        db, user.id,
        "deletion_cancelled",
        "Account Deletion Cancelled",
        "The scheduled deletion of your account has been cancelled by an administrator.",
        None
    )
    write_audit_log(
        db,
        admin_id=current_user.id,
        action="deletion_cancelled",
        target_type="user",
        target_id=user_id,
        old_status=user.status,
        new_status=user.status,
        notes="Scheduled deletion cancelled"
    )
    db.commit()
    return {"status": "deletion_cancelled", "user_id": str(user_id)}


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN — PURGE USER (immediate permanent delete, only for banned users)
# ═══════════════════════════════════════════════════════════════════════════════

@app.delete("/admin/users/{user_id}/purge")
def purge_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.status != "banned":
        raise HTTPException(status_code=400, detail="Only banned users can be purged")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot purge yourself")
    write_audit_log(
        db,
        admin_id=current_user.id,
        action="user_purged",
        target_type="user",
        target_id=user_id,
        old_status=user.status,
        new_status="deleted",
        notes=f"User {user.email} permanently deleted"
    )
    db.commit()
    db.delete(user)
    db.commit()
    return {"status": "purged", "user_id": str(user_id)}


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN — PROCESS EXPIRED DELETIONS (run periodically or on demand)
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/admin/users/process-deletions")
def process_scheduled_deletions(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    expired = db.query(User).filter(
        User.status == "banned",
        User.deletion_scheduled_at <= datetime.utcnow()
    ).all()
    deleted = []
    for user in expired:
        write_audit_log(
            db,
            admin_id=current_user.id,
            action="user_auto_purged",
            target_type="user",
            target_id=user.id,
            old_status=user.status,
            new_status="deleted",
            notes=f"Auto-deleted after 30-day grace period: {user.email}"
        )
        deleted.append(str(user.id))
        db.delete(user)
    db.commit()
    return {"deleted_count": len(deleted), "deleted_user_ids": deleted}

# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN — FORCE-CLOSE ANY PROJECT
# ═══════════════════════════════════════════════════════════════════════════════

@app.patch("/admin/projects/{project_id}/close")
def admin_close_project(
    project_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.project_status == "closed":
        raise HTTPException(status_code=400, detail="Project is already closed")
    old_status = project.project_status
    project.project_status = "closed"
    # Cascade — withdraw all active applications
    active_apps = db.query(Application).filter(
        Application.project_id == project_id,
        Application.status.in_(["applied", "shortlisted", "selected"])
    ).all()
    for app in active_apps:
        app.status = "withdrawn"
        create_notification(
            db, app.student.user_id,
            "application_withdrawn",
            "Project Closed",
            f"The project '{project.project_name}' has been closed. Your application has been withdrawn.",
            "/student?tab=applications"
        )
    create_notification(db, project.ngo.user_id, "project_closed", f"Project Closed: {project.project_name}", "Your project has been closed by an administrator.", "/ngo?tab=projects")
    write_audit_log(db, admin_id=current_user.id, action="project_close", target_type="project", target_id=project_id, old_status=old_status, new_status="closed", notes=f"{len(active_apps)} applications withdrawn")
    db.commit()
    return {"status": "closed", "project_id": str(project_id), "applications_withdrawn": len(active_apps)}


# ═══════════════════════════════════════════════════════════════════════════════
# NGO — CLOSE THEIR OWN PROJECT
# ═══════════════════════════════════════════════════════════════════════════════

@app.patch("/ngo/projects/{project_id}/close")
def ngo_close_project(
    project_id: uuid.UUID,
    current_user: User = Depends(require_ngo),
    db: Session = Depends(get_db)
):
    ngo = db.query(NgoProfile).filter(NgoProfile.user_id == current_user.id).first()
    if not ngo:
        raise HTTPException(status_code=404, detail="NGO profile not found")
    project = db.query(Project).filter(Project.id == project_id, Project.ngo_id == ngo.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not owned by you")
    if project.project_status == "closed":
        raise HTTPException(status_code=400, detail="Project is already closed")
    old_status = project.project_status
    project.project_status = "closed"
    # Cascade — withdraw all active applications
    active_apps = db.query(Application).filter(
        Application.project_id == project_id,
        Application.status.in_(["applied", "shortlisted", "selected"])
    ).all()
    for app in active_apps:
        app.status = "withdrawn"
        create_notification(
            db, app.student.user_id,
            "application_withdrawn",
            "Project Closed",
            f"The project '{project.project_name}' has been closed by the organisation. Your application has been withdrawn.",
            "/student?tab=applications"
        )
    write_audit_log(db, admin_id=current_user.id, action="project_close_by_ngo", target_type="project", target_id=project_id, old_status=old_status, new_status="closed", notes=f"{len(active_apps)} applications withdrawn")
    db.commit()
    return {"status": "closed", "project_id": str(project_id), "applications_withdrawn": len(active_apps)}

# ═══════════════════════════════════════════════════════════════════════════════
# STUDENT — WITHDRAW APPLICATION
# ═══════════════════════════════════════════════════════════════════════════════

@app.patch("/applications/{application_id}/withdraw")
def withdraw_application(
    application_id: uuid.UUID,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    application = db.query(Application).filter(Application.application_id == application_id, Application.student_id == student.id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found or not yours")
    if application.status in ("completed", "withdrawn"):
        raise HTTPException(status_code=400, detail=f"Cannot withdraw an application with status '{application.status}'")
    old_status = application.status
    application.status = "withdrawn"
    create_notification(db, application.project.ngo.user_id, "application_withdrawn", "Application Withdrawn", f"A student has withdrawn their application from '{application.project.project_name}'.", "/ngo?tab=applications")
    write_audit_log(db, admin_id=current_user.id, action="application_withdraw", target_type="application", target_id=application_id, old_status=old_status, new_status="withdrawn")
    db.commit()
    return {"status": "withdrawn", "application_id": str(application_id)}






@app.get(
    "/admin/queues/personal-projects",
    response_model=List[PersonalProjectRead]
)
def admin_ip_queue(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return db.query(PersonalProject).filter(
        PersonalProject.status == "submitted"
    ).order_by(PersonalProject.created_at.asc()).all()


@app.patch("/personal-projects/{project_id}/record-ip")
def record_ip(
    project_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    project = db.query(PersonalProject).filter(
        PersonalProject.id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status != "submitted":
        raise HTTPException(
            status_code=400,
            detail="Project must be in submitted status"
        )

    year   = datetime.utcnow().year
    seq    = db.execute(text("SELECT nextval('ip_reference_seq')")).scalar()
    ip_ref = f"DKUT-IP-{year}-{seq:04d}"

    old_status             = project.status
    project.ip_reference   = ip_ref
    project.ip_recorded_at = datetime.utcnow()
    project.ip_recorded_by = current_user.id
    project.status         = "ip_recorded"

    create_notification(
        db, project.student.user_id,
        "ip_recorded",
        "Project IP Recorded",
        f"Your project '{project.title}' has been IP recorded. Reference: {ip_ref}",
        "/student?tab=personal"
    )

    write_audit_log(
        db,
        admin_id=current_user.id,
        action="record_ip",
        target_type="personal_project",
        target_id=project_id,
        old_status=old_status,
        new_status="ip_recorded",
        notes=ip_ref
    )

    db.commit()
    return {"status": "ip_recorded", "ip_reference": ip_ref}


@app.patch("/personal-projects/{project_id}/approve-showcase")
def approve_showcase(
    project_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    project = db.query(PersonalProject).filter(
        PersonalProject.id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    old_status     = project.status
    project.status = "showcase_approved"

    create_notification(
        db, project.student.user_id,
        "showcase_approved",
        "Project on Showcase",
        f"Your project '{project.title}' is now live on the DeKUT innovation showcase.",
        "/student?tab=personal"
    )

    write_audit_log(
        db,
        admin_id=current_user.id,
        action="approve_showcase",
        target_type="personal_project",
        target_id=project_id,
        old_status=old_status,
        new_status="showcase_approved"
    )

    db.commit()
    return {"status": "showcase_approved"}


@app.get("/admin/impact")
def admin_impact_dashboard(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return {
        "total_students":         db.query(StudentProfile).count(),
        "verified_students":      db.query(StudentProfile).filter(
            StudentProfile.is_verified == True).count(),
        "total_organizations":    db.query(NgoProfile).count(),
        "approved_organizations": db.query(NgoProfile).filter(
            NgoProfile.is_approved == True).count(),
        "total_projects":         db.query(Project).count(),
        "completed_projects":     db.query(Project).filter(
            Project.project_status == "completed").count(),
        "total_applications":     db.query(Application).count(),
        "officially_complete":    db.query(Application).filter(
            Application.status == "officially_complete").count(),
        "personal_projects":      db.query(PersonalProject).count(),
        "ip_recorded":            db.query(PersonalProject).filter(
            PersonalProject.ip_reference != None).count(),
        "award_categories":       db.query(AwardCategory).count(),
    }


@app.get("/admin/users/{user_id}/audit-log")
def get_user_audit_log(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    result = db.execute(text("""
        SELECT
            a.id, a.action, a.target_type, a.target_id,
            a.old_status, a.new_status, a.notes, a.created_at,
            u.first_name || ' ' || u.last_name AS admin_name
        FROM admin_audit_log a
        JOIN users u ON a.admin_id = u.id
        WHERE a.target_id = :user_id AND a.target_type = 'user'
        ORDER BY a.created_at DESC
        LIMIT 20
    """), {"user_id": str(user_id)}).fetchall()
    return {"logs": [dict(row._mapping) for row in result]}

@app.get("/admin/audit-log")
def get_audit_log(
    current_user: User = Depends(require_admin),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    result = db.execute(text("""
        SELECT
            a.id, a.action, a.target_type, a.target_id,
            a.old_status, a.new_status, a.notes, a.created_at,
            u.first_name || ' ' || u.last_name AS admin_name,
            u.role AS admin_role
        FROM admin_audit_log a
        JOIN users u ON a.admin_id = u.id
        ORDER BY a.created_at DESC
        LIMIT :limit
    """), {"limit": limit}).fetchall()

    return {"logs": [dict(row._mapping) for row in result]}
# ═══════════════════════════════════════════════════════════════════════════════
# MESSAGING
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/messages/threads", response_model=MessageThreadRead, status_code=status.HTTP_201_CREATED)
def create_message_thread(
    data: MessageThreadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(MessageThread).filter(
        MessageThread.student_id == data.student_id,
        MessageThread.ngo_id == data.ngo_id,
        MessageThread.project_id == data.project_id
    ).first()
    if existing:
        return existing
    thread = MessageThread(
        project_id=data.project_id,
        student_id=data.student_id,
        ngo_id=data.ngo_id,
        opened_by=current_user.id,
        purpose=data.purpose,
        status="open"
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return thread


@app.get("/messages/threads", response_model=List[MessageThreadRead])
def get_my_threads(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "student":
        student = db.query(StudentProfile).filter(
            StudentProfile.user_id == current_user.id
        ).first()
        if not student:
            return []
        return db.query(MessageThread).filter(
            MessageThread.student_id == student.id
        ).order_by(MessageThread.created_at.desc()).all()
    elif current_user.role == "ngo":
        ngo = db.query(NgoProfile).filter(
            NgoProfile.user_id == current_user.id
        ).first()
        if not ngo:
            return []
        return db.query(MessageThread).filter(
            MessageThread.ngo_id == ngo.id
        ).order_by(MessageThread.created_at.desc()).all()
    else:
        return db.query(MessageThread).order_by(MessageThread.created_at.desc()).all()


@app.get("/messages/threads/{thread_id}", response_model=MessageThreadRead)
def get_thread(
    thread_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    thread = db.query(MessageThread).filter(
        MessageThread.id == thread_id
    ).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread


@app.post("/messages/threads/{thread_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
def send_message(
    thread_id: uuid.UUID,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    thread = db.query(MessageThread).filter(
        MessageThread.id == thread_id
    ).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    if thread.status == "closed":
        raise HTTPException(status_code=400, detail="Thread is closed")
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    message = Message(
        thread_id=thread_id,
        sender_id=current_user.id,
        sender_role=current_user.role,
        content=clean(data.content)
    )
    db.add(message)
    if current_user.role == "student":
        ngo = db.query(NgoProfile).filter(NgoProfile.id == thread.ngo_id).first()
        if ngo:
            create_notification(
                db, ngo.user_id, "new_message",
                "New Message", "You have a new message from a student.",
                "/ngo?tab=messages"
            )
    elif current_user.role == "ngo":
        student = db.query(StudentProfile).filter(StudentProfile.id == thread.student_id).first()
        if student:
            create_notification(
                db, student.user_id, "new_message",
                "New Message", "You have a new message from an NGO.",
                "/student?tab=messages"
            )
    db.commit()
    db.refresh(message)
    return message


@app.patch("/messages/threads/{thread_id}/close")
def close_thread(
    thread_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    thread = db.query(MessageThread).filter(
        MessageThread.id == thread_id
    ).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    thread.status = "closed"
    thread.closed_at = datetime.utcnow()
    db.commit()
    return {"status": "closed"}
# ═══════════════════════════════════════════════════════════════════════════════
# DISPUTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/disputes", response_model=DisputeRead, status_code=status.HTTP_201_CREATED)
def raise_dispute(
    data: DisputeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # against_id could be ngo_profile.id — resolve to user.id
    against_user_id = data.against_id
    ngo = db.query(NgoProfile).filter(NgoProfile.id == data.against_id).first()
    if ngo:
        against_user_id = ngo.user_id

    dispute = Dispute(
        raised_by=current_user.id,
        against_id=against_user_id,
        application_id=data.application_id,
        personal_project_id=data.personal_project_id,
        dispute_type=data.dispute_type,
        description=clean(data.description),
        status="open"
    )
    db.add(dispute)
    db.commit()
    db.refresh(dispute)
    create_notification(
        db, data.against_id, "dispute_raised",
        "Dispute Raised Against You",
        f"A {data.dispute_type} dispute has been raised against you.",
        "/admin"
    )
    return dispute


@app.get("/disputes/mine", response_model=List[DisputeRead])
def get_my_disputes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Dispute).filter(
        Dispute.raised_by == current_user.id
    ).order_by(Dispute.created_at.desc()).all()


@app.get("/disputes", response_model=List[DisputeRead])
def get_all_disputes(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return db.query(Dispute).order_by(Dispute.created_at.desc()).all()


@app.patch("/disputes/{dispute_id}/resolve", response_model=DisputeRead)
def resolve_dispute(
    dispute_id: uuid.UUID,
    resolution_notes: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    if dispute.status == "resolved":
        raise HTTPException(status_code=400, detail="Already resolved")
    dispute.status = "resolved"
    dispute.resolution_notes = resolution_notes
    dispute.resolved_by = current_user.id
    dispute.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(dispute)
    create_notification(
        db, dispute.raised_by, "dispute_resolved",
        "Your Dispute Has Been Resolved",
        f"Resolution: {resolution_notes[:100]}",
        "/student?tab=disputes"
    )
    return dispute

# ═══════════════════════════════════════════════════════════════════════════════
# RECOMMENDATION LETTERS — ADMIN
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/letters/all", response_model=List[RecommendationRequestRead])
def get_all_letter_requests(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return db.query(RecommendationRequest).order_by(
        RecommendationRequest.created_at.desc()
    ).all()


@app.patch("/letters/{letter_id}/review")
def review_letter_request(
    letter_id: uuid.UUID,
    action: str,
    pdf_url: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    letter = db.query(RecommendationRequest).filter(
        RecommendationRequest.id == letter_id
    ).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Letter request not found")
    if action not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Action must be approved or rejected")
    letter.status = action
    letter.reviewed_by = current_user.id
    letter.reviewed_at = datetime.utcnow()
    if pdf_url:
        letter.pdf_url = pdf_url
    db.commit()
    db.refresh(letter)
    student = db.query(StudentProfile).filter(
        StudentProfile.id == letter.student_id
    ).first()
    if student:
        create_notification(
            db, student.user_id, "letter_reviewed",
            f"Recommendation Letter {action.capitalize()}",
            f"Your recommendation letter request has been {action}.",
            "/student?tab=letters"
        )
    return letter
# ═══════════════════════════════════════════════════════════════════════════════
# BOOTCAMPS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/bootcamps", response_model=BootcampRead, status_code=status.HTTP_201_CREATED)
def create_bootcamp(
    data: BootcampCreate,
    current_user: User = Depends(require_approved_ngo),
    db: Session = Depends(get_db)
):
    ngo = db.query(NgoProfile).filter(NgoProfile.user_id == current_user.id).first()
    bootcamp = Bootcamp(
        project_id=data.project_id,
        ngo_id=ngo.id,
        title=clean(data.title),
        description=clean(data.description) if data.description else None,
        skills_taught=data.skills_taught or [],
        delivery_mode=data.delivery_mode,
        scheduled_date=data.scheduled_date,
        duration_hours=data.duration_hours,
        facilitator_names=data.facilitator_names,
        max_attendees=data.max_attendees,
        prerequisites=data.prerequisites,
        materials_url=data.materials_url,
        status="pending_approval"
    )
    db.add(bootcamp)
    db.commit()
    db.refresh(bootcamp)
    return bootcamp


@app.get("/bootcamps", response_model=List[BootcampRead])
def get_bootcamps(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "ngo":
        ngo = db.query(NgoProfile).filter(NgoProfile.user_id == current_user.id).first()
        if not ngo:
            return []
        return db.query(Bootcamp).filter(Bootcamp.ngo_id == ngo.id).order_by(Bootcamp.created_at.desc()).all()
    return db.query(Bootcamp).filter(Bootcamp.admin_verified == True).order_by(Bootcamp.created_at.desc()).all()


@app.get("/bootcamps/all", response_model=List[BootcampRead])
def get_all_bootcamps(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    bootcamps = db.query(Bootcamp).order_by(Bootcamp.created_at.desc()).all()
    result = []
    for b in bootcamps:
        ngo = db.query(NgoProfile).filter(NgoProfile.id == b.ngo_id).first()
        project = db.query(Project).filter(Project.id == b.project_id).first()
        item = BootcampRead.from_orm(b)
        item.ngo_name = ngo.organization_name if ngo else str(b.ngo_id)[:8]
        item.project_name = project.project_name if project else str(b.project_id)[:8]
        result.append(item)
    return result


@app.patch("/bootcamps/{bootcamp_id}/verify")
def verify_bootcamp(
    bootcamp_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    bootcamp = db.query(Bootcamp).filter(Bootcamp.id == bootcamp_id).first()
    if not bootcamp:
        raise HTTPException(status_code=404, detail="Bootcamp not found")
    bootcamp.admin_verified = True
    bootcamp.verified_by = current_user.id
    bootcamp.status = "approved"
    db.commit()
    return {"status": "verified"}


# ═══════════════════════════════════════════════════════════════════════════════
# AWARDS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/awards/categories", response_model=AwardCategoryRead, status_code=status.HTTP_201_CREATED)
def create_award_category(
    data: AwardCategoryCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    cat = AwardCategory(
        name=data.name,
        description=data.description,
        track=data.track,
        frequency=data.frequency
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@app.get("/awards/categories", response_model=List[AwardCategoryRead])
def get_award_categories(
    db: Session = Depends(get_db)
):
    return db.query(AwardCategory).filter(AwardCategory.is_active == True).all()


@app.post("/awards", response_model=AwardRead, status_code=status.HTTP_201_CREATED)
def issue_award(
    data: AwardCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    award = Award(
        category_id=data.category_id,
        winner_student_id=data.winner_student_id,
        application_id=data.application_id,
        personal_project_id=data.personal_project_id,
        award_period=data.award_period,
        cash_amount=data.cash_amount,
        certificate_url=data.certificate_url,
        issued_by=current_user.id
    )
    db.add(award)
    db.commit()
    db.refresh(award)
    student = db.query(StudentProfile).filter(
        StudentProfile.id == data.winner_student_id
    ).first()
    if student:
        create_notification(
            db, student.user_id, "award_issued",
            "🏅 You've Been Awarded!",
            f"Congratulations! You have received an award for {data.award_period}.",
            "/student?tab=overview"
        )
    return award


@app.get("/awards", response_model=List[AwardRead])
def get_awards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "student":
        student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not student:
            return []
        awards = db.query(Award).filter(Award.winner_student_id == student.id).all()
    else:
        awards = db.query(Award).order_by(Award.issued_at.desc()).all()
    result = []
    for a in awards:
        student = db.query(StudentProfile).filter(StudentProfile.id == a.winner_student_id).first()
        category = db.query(AwardCategory).filter(AwardCategory.id == a.category_id).first()
        item = AwardRead.from_orm(a)
        item.student_name = student.display_name if student else str(a.winner_student_id)[:8]
        item.category_name = category.name if category else str(a.category_id)[:8]
        result.append(item)
    return result

# ─── REVIEWS ──────────────────────────────────────────────────────────────────
@app.post("/reviews/ngo-reviews-student", response_model=dict)
def ngo_review_student(
    data: StudentReviewCreate,
    application_id: uuid.UUID,
    current_user: User = Depends(require_ngo),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(Application.application_id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.status != "officially_complete":
        raise HTTPException(status_code=400, detail="Can only review completed applications")
    ngo = db.query(NgoProfile).filter(NgoProfile.user_id == current_user.id).first()
    existing = db.query(StudentReview).filter(StudentReview.application_id == application_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Review already submitted")
    review = StudentReview(
        application_id=application_id,
        ngo_id=ngo.id,
        student_id=application.student_id,
        overall_rating=data.overall_rating,
        review_text=data.review_text,
        is_public=True
    )
    db.add(review)
    create_notification(db, application.student.user_id, "review_received",
        "⭐ New Review!", "An NGO has reviewed your project work.", "/student?tab=profile")
    db.commit()
    return {"message": "Review submitted"}

@app.post("/reviews/student-reviews-ngo", response_model=dict)
def student_review_ngo(
    data: NgoReviewCreate,
    application_id: uuid.UUID,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(Application.application_id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.status != "officially_complete":
        raise HTTPException(status_code=400, detail="Can only review completed applications")
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if application.student_id != student.id:
        raise HTTPException(status_code=403, detail="Not your application")
    existing = db.query(NgoReview).filter(NgoReview.application_id == application_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Review already submitted")
    review = NgoReview(
        application_id=application_id,
        student_id=student.id,
        ngo_id=application.project.ngo_id,
        clarity_rating=data.clarity_rating,
        support_rating=data.support_rating,
        fairness_rating=data.fairness_rating,
        sdg_authenticity_rating=data.sdg_authenticity_rating,
        review_text=data.review_text,
        is_public=True
    )
    db.add(review)
    db.commit()
    return {"message": "Review submitted"}

@app.get("/reviews/my-student-reviews", response_model=list)
def get_my_student_reviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student:
        return []
    reviews = db.query(StudentReview).filter(StudentReview.student_id == student.id).all()
    return [{"id": str(r.id), "overall_rating": float(r.overall_rating), "review_text": r.review_text, "created_at": str(r.created_at), "application_id": str(r.application_id)} for r in reviews]
