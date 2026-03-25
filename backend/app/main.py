import uuid
import re
from datetime import datetime
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
    AwardCategory, Award
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
    BootcampCreate, BootcampRead
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
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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
    """Return all valid SDG options for frontend dropdowns."""
    return {"sdgs": VALID_SDGS}


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
        raise HTTPException(
            status_code=400,
            detail="Role must be student or ngo"
        )

    if db.query(User).filter(User.email == data.email.lower()).first():
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists"
        )

    if len(data.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters"
        )

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
    user = db.query(User).filter(
        User.email == data.email.lower()
    ).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Invalid email or password"
        )

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

    # Sanitize inputs
    display_name    = clean(data.display_name)
    school          = clean(data.school)
    course          = clean(data.course)
    supervisor_name = clean(data.supervisor_name)
    bio             = clean(data.bio) if data.bio else None
    skills          = [clean(s) for s in (data.skills or [])]

    slug = data.profile_slug or generate_slug(display_name)

    existing = db.query(StudentProfile).filter(
        StudentProfile.profile_slug == slug
    ).first()
    if existing and (not profile or existing.id != profile.id):
        raise HTTPException(
            status_code=400,
            detail="Profile slug already taken"
        )

    # Auto pre-verification logic
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
            raise HTTPException(
                status_code=400,
                detail="Registration number already registered"
            )

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

        # Apply auto pre-verification
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
        raise HTTPException(
            status_code=400,
            detail="Organisation slug already taken"
        )

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

    # SDG validation
    if data.sdg_focus not in VALID_SDGS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid SDG. Must be one of the 17 UN SDGs. Use GET /sdgs for the full list."
        )

    if data.participation_type == "team":
        if data.team_size_min < 2 or data.team_size_max > 5:
            raise HTTPException(
                status_code=400,
                detail="Team size must be between 2 and 5"
            )
        if data.team_size_min > data.team_size_max:
            raise HTTPException(
                status_code=400,
                detail="Minimum team size cannot exceed maximum"
            )

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
        raise HTTPException(
            status_code=400,
            detail="Project is not open for applications"
        )

    student = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()

    existing = db.query(Application).filter(
        Application.project_id == project_id,
        Application.student_id == student.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already applied to this project"
        )

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
    # SDG validation
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
    return db.query(Certificate).filter(
        Certificate.student_id == student.id
    ).order_by(Certificate.issued_at.desc()).all()


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

    # Status pre-check
    if student.is_verified:
        raise HTTPException(
            status_code=400,
            detail="Student is already verified"
        )

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


@app.patch("/students/{student_id}/bulk-verify")
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

    # Status pre-check
    if data.action == "approve" and org.is_approved:
        raise HTTPException(
            status_code=400,
            detail="Organisation is already approved"
        )

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

    # Status pre-check
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

    old_status         = project.status
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
