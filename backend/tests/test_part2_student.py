"""
PART 2 — Student Flow, Logic & Data Integrity
Covers:
  - Student profile creation & validation
  - Verification gate (unverified cannot apply)
  - Project browsing & application logic
  - Work submission & certificate flow
  - Personal projects scope
  - Notifications
  - Data integrity (no duplicates, correct ownership)
  - Boundary conditions on all student endpoints
"""
import requests
import pytest
import uuid

BASE = "http://localhost:8000"

ADMIN_EMAIL    = "admin@dkut.ac.ke"
ADMIN_PASSWORD = "Admin@DKUT2025"

# Fresh student per test run
STUDENT_EMAIL    = f"student_{uuid.uuid4().hex[:6]}@students.dkut.ac.ke"
STUDENT_PASSWORD = "Student@Test123"

# Fresh NGO to create projects against
NGO_EMAIL    = f"ngo_{uuid.uuid4().hex[:6]}@org.ke"
NGO_PASSWORD = "Ngo@Test123"


def login(email, password):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=10)
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]

def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ─────────────────────────────────────────────────────────────────────────────
# FIXTURES — Register users once per session
# ─────────────────────────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def student_token():
    # Register
    r = requests.post(f"{BASE}/auth/register", json={
        "email": STUDENT_EMAIL,
        "password": STUDENT_PASSWORD,
        "first_name": "Test",
        "last_name": "Student",
        "role": "student"
    }, timeout=10)
    assert r.status_code in (200, 201, 409), f"Student registration failed: {r.text}"
    return login(STUDENT_EMAIL, STUDENT_PASSWORD)

@pytest.fixture(scope="module")
def ngo_token():
    r = requests.post(f"{BASE}/auth/register", json={
        "email": NGO_EMAIL,
        "password": NGO_PASSWORD,
        "first_name": "Test",
        "last_name": "NGO",
        "role": "ngo"
    }, timeout=10)
    assert r.status_code in (200, 201, 409)
    return login(NGO_EMAIL, NGO_PASSWORD)

@pytest.fixture(scope="module")
def admin_token():
    return login(ADMIN_EMAIL, ADMIN_PASSWORD)


# ─────────────────────────────────────────────────────────────────────────────
# 2A. STUDENT PROFILE — Logic & Integrity
# ─────────────────────────────────────────────────────────────────────────────
class TestStudentProfile:
    def test_create_student_profile(self, student_token):
        slug = f"test-student-{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{BASE}/students/profile", headers=auth(student_token), json={
            "display_name": "Test Student",
            "profile_slug": slug,
            "registration_number": f"C026-01-{uuid.uuid4().hex[:4].upper()}",
            "school": "School of Computing",
            "course": "BSc Computer Science",
            "year_of_study": 3,
            "expected_graduation_year": 2026,
            "supervisor_name": "Dr. Test Supervisor",
            "bio": "A passionate computer science student.",
            "skills": ["Python", "FastAPI", "PostgreSQL"]
        }, timeout=10)
        assert r.status_code in (200, 201, 409), f"Profile creation failed: {r.text}"

    def test_get_own_profile(self, student_token):
        r = requests.get(f"{BASE}/students/profile", headers=auth(student_token), timeout=10)
        assert r.status_code in (200, 404), f"Unexpected status: {r.status_code}"
        if r.status_code == 200:
            data = r.json()
            assert "registration_number" in data
            assert "hashed_password" not in str(data), "Password hash leaked in student profile!"

    def test_ngo_cannot_create_student_profile(self, ngo_token):
        """Scope check: NGO role must be blocked from student profile endpoint."""
        r = requests.post(f"{BASE}/students/profile", headers=auth(ngo_token), json={
            "display_name": "Fake Student",
            "profile_slug": f"fake-{uuid.uuid4().hex[:6]}",
            "registration_number": "FAKE-001",
            "school": "School of Hacking",
            "course": "BSc Exploitation",
            "year_of_study": 1,
            "expected_graduation_year": 2030,
            "supervisor_name": "Nobody",
            "skills": []
        }, timeout=10)
        assert r.status_code in (403, 401), \
            f"NGO should NOT create student profile, got {r.status_code}"

    def test_duplicate_profile_rejected(self, student_token):
        """Student cannot create two profiles."""
        r = requests.get(f"{BASE}/students/profile", headers=auth(student_token), timeout=10)
        if r.status_code == 200:
            # Profile exists — try creating again
            r2 = requests.post(f"{BASE}/students/profile", headers=auth(student_token), json={
                "display_name": "Duplicate",
                "profile_slug": f"dup-{uuid.uuid4().hex[:6]}",
                "registration_number": f"DUP-{uuid.uuid4().hex[:4]}",
                "school": "School",
                "course": "Course",
                "year_of_study": 1,
                "expected_graduation_year": 2030,
                "supervisor_name": "Sup",
                "skills": []
            }, timeout=10)
            assert r2.status_code in (400, 409), \
                f"Duplicate profile should be rejected, got {r2.status_code}"

    def test_profile_slug_boundary(self, student_token):
        """Boundary: slug with special characters should be rejected."""
        r = requests.post(f"{BASE}/students/profile", headers=auth(student_token), json={
            "display_name": "Boundary",
            "profile_slug": "../../etc/passwd",    # path traversal attempt
            "registration_number": f"B-{uuid.uuid4().hex[:4]}",
            "school": "School",
            "course": "Course",
            "year_of_study": 1,
            "expected_graduation_year": 2030,
            "supervisor_name": "Sup",
            "skills": []
        }, timeout=10)
        assert r.status_code in (400, 409, 422), \
            f"Path traversal slug should be rejected: {r.status_code}"


# ─────────────────────────────────────────────────────────────────────────────
# 2B. VERIFICATION GATE
# ─────────────────────────────────────────────────────────────────────────────
class TestVerificationGate:
    def test_unverified_student_cannot_apply(self, student_token):
        """LOGIC: Unverified student must be blocked from applying."""
        r = requests.get(f"{BASE}/projects", headers=auth(student_token), timeout=10)
        if r.status_code == 200:
            projects = r.json()
            if projects:
                pid = projects[0]["id"]
                r2 = requests.post(f"{BASE}/projects/{pid}/apply",
                                   headers=auth(student_token), timeout=10)
                assert r2.status_code == 403, \
                    f"Unverified student applied to project! Got {r2.status_code}: {r2.text}"
            else:
                pytest.skip("No projects available to test against")
        else:
            pytest.skip("Could not fetch projects")

    def test_unverified_student_gets_correct_error_message(self, student_token):
        """Attack feedback: Error message should explain WHY access was denied."""
        r = requests.get(f"{BASE}/projects", headers=auth(student_token), timeout=10)
        if r.status_code == 200:
            projects = r.json()
            if projects:
                pid = projects[0]["id"]
                r2 = requests.post(f"{BASE}/projects/{pid}/apply",
                                   headers=auth(student_token), timeout=10)
                if r2.status_code == 403:
                    body = r2.text.lower()
                    # Should mention verification, not a generic error
                    assert any(word in body for word in ["verif", "not verified", "pending"]), \
                        f"403 should explain verification requirement. Got: {r2.text}"


# ─────────────────────────────────────────────────────────────────────────────
# 2C. PROJECT BROWSING — Scope & Accuracy
# ─────────────────────────────────────────────────────────────────────────────
class TestProjectBrowsing:
    def test_authenticated_can_list_projects(self, student_token):
        r = requests.get(f"{BASE}/projects", headers=auth(student_token), timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_projects_response_structure(self, student_token):
        r = requests.get(f"{BASE}/projects", headers=auth(student_token), timeout=10)
        assert r.status_code == 200
        projects = r.json()
        if projects:
            p = projects[0]
            assert "id" in p
            assert "title" in p

    def test_nonexistent_project_returns_404(self, student_token):
        fake_id = str(uuid.uuid4())
        r = requests.get(f"{BASE}/projects/{fake_id}", headers=auth(student_token), timeout=10)
        assert r.status_code == 404, f"Non-existent project should 404, got {r.status_code}"

    def test_invalid_project_id_format(self, student_token):
        """Boundary: Non-UUID project ID."""
        r = requests.get(f"{BASE}/projects/not-a-valid-uuid", headers=auth(student_token), timeout=10)
        assert r.status_code in (404, 422), f"Invalid UUID format should fail: {r.status_code}"


# ─────────────────────────────────────────────────────────────────────────────
# 2D. PERSONAL PROJECTS — Scope & Integrity
# ─────────────────────────────────────────────────────────────────────────────
class TestPersonalProjects:
    def test_student_can_view_own_personal_projects(self, student_token):
        r = requests.get(f"{BASE}/personal-projects/mine", headers=auth(student_token), timeout=10)
        assert r.status_code in (200, 403), f"Unexpected: {r.status_code}"

    def test_public_personal_projects_accessible(self, student_token):
        r = requests.get(f"{BASE}/personal-projects", headers=auth(student_token), timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_ngo_cannot_access_mine_personal_projects(self, ngo_token):
        """Scope: /personal-projects/mine is for students only."""
        r = requests.get(f"{BASE}/personal-projects/mine", headers=auth(ngo_token), timeout=10)
        assert r.status_code in (403, 401), \
            f"NGO accessing student personal projects got {r.status_code}"


# ─────────────────────────────────────────────────────────────────────────────
# 2E. NOTIFICATIONS — Logic & Feedback
# ─────────────────────────────────────────────────────────────────────────────
class TestNotifications:
    def test_student_can_get_notifications(self, student_token):
        r = requests.get(f"{BASE}/notifications", headers=auth(student_token), timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "unread_count" in data or isinstance(data, dict), \
            f"Unexpected notifications structure: {data}"

    def test_mark_all_read(self, student_token):
        r = requests.patch(f"{BASE}/notifications/read-all", headers=auth(student_token), timeout=10)
        assert r.status_code in (200, 204), f"Mark-all-read failed: {r.status_code}"

    def test_mark_nonexistent_notification(self, student_token):
        fake_id = str(uuid.uuid4())
        r = requests.patch(f"{BASE}/notifications/{fake_id}/read",
                           headers=auth(student_token), timeout=10)
        assert r.status_code in (404, 403, 422), f"Fake notification should not succeed"


# ─────────────────────────────────────────────────────────────────────────────
# 2F. CERTIFICATES — Logic
# ─────────────────────────────────────────────────────────────────────────────
class TestCertificates:
    def test_student_can_view_certificates(self, student_token):
        r = requests.get(f"{BASE}/certificates", headers=auth(student_token), timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_unauthenticated_cannot_view_certificates(self):
        r = requests.get(f"{BASE}/certificates", timeout=10)
        assert r.status_code in (401, 403)
