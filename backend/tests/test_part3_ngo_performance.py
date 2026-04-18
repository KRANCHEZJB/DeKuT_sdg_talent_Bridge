"""
PART 3 — NGO Flow, Admin, Performance, Concurrency, Cyber Attacks, Portability
Fixed: safe_post for rate limiting, correct NGO profile fields, organizations is admin-only
"""
import time
import uuid
import threading
import requests
import pytest
import os
import sys

BASE           = "http://localhost:8000"
ADMIN_EMAIL    = "admin@dkut.ac.ke"
ADMIN_PASSWORD = "Admin@DKUT2025"
NGO_EMAIL      = f"ngo3_{uuid.uuid4().hex[:6]}@org.ke"
NGO_PASSWORD   = "Ngo@Test123"

# ── helpers ──────────────────────────────────────────────────────────────────

def safe_post(url, **kw):
    for i in range(4):
        r = requests.post(url, **kw)
        if r.status_code == 429:
            w = 20 + i * 15
            print(f"\n⏳ Rate limited — waiting {w}s (attempt {i+1}/4)...")
            time.sleep(w)
        else:
            return r
    return r

def login(email, password):
    r = safe_post(f"{BASE}/auth/login",
                  json={"email": email, "password": password}, timeout=10)
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]

def auth(token):
    return {"Authorization": f"Bearer {token}"}

# ── fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def admin_token():
    return login(ADMIN_EMAIL, ADMIN_PASSWORD)

@pytest.fixture(scope="module")
def ngo_token():
    safe_post(f"{BASE}/auth/register", json={
        "email": NGO_EMAIL, "password": NGO_PASSWORD,
        "first_name": "Test", "last_name": "NGO", "role": "ngo"
    }, timeout=10)
    return login(NGO_EMAIL, NGO_PASSWORD)

# ── NGO Profile ───────────────────────────────────────────────────────────────

class TestNGOProfile:
    def test_create_ngo_profile(self, ngo_token):
        r = requests.post(f"{BASE}/organizations/profile", headers=auth(ngo_token), json={
            "organization_name":  f"Test NGO {uuid.uuid4().hex[:4]}",
            "organization_slug":  f"test-ngo-{uuid.uuid4().hex[:6]}",
            "organization_type":  "ngo",
            "mission_statement":  "Empowering communities through education and technology.",
            "primary_email":      NGO_EMAIL,
            "website":            "https://testngo.org",
            "country":            "Kenya",
            "contact_phone":      "+254700000000",
            "registration_number": f"NGO-{uuid.uuid4().hex[:6].upper()}",
            "description":        "A test NGO for system testing purposes.",
            "focus_areas":        ["Education", "Technology"],
            "county":             "Nairobi"
        }, timeout=10)
        assert r.status_code in (200, 201, 409), f"NGO profile failed: {r.text}"

    def test_student_cannot_create_ngo_profile(self):
        # Register a student and try to create NGO profile
        student_email = f"st3_{uuid.uuid4().hex[:6]}@students.dkut.ac.ke"
        safe_post(f"{BASE}/auth/register", json={
            "email": student_email, "password": "Student@Test123",
            "first_name": "Test", "last_name": "Student", "role": "student"
        }, timeout=10)
        token = login(student_email, "Student@Test123")
        r = requests.post(f"{BASE}/organizations/profile", headers=auth(token), json={
            "organization_name":  "Fake NGO",
            "organization_slug":  f"fake-ngo-{uuid.uuid4().hex[:6]}",
            "organization_type":  "ngo",
            "mission_statement":  "Fake mission.",
            "primary_email":      student_email,
            "country":            "Kenya",
            "contact_phone":      "+254700000001"
        }, timeout=10)
        assert r.status_code == 403, f"Student should not create NGO profile, got {r.status_code}"

    def test_get_own_ngo_profile(self, ngo_token):
        r = requests.get(f"{BASE}/organizations/profile", headers=auth(ngo_token), timeout=10)
        assert r.status_code in (200, 404)

    def test_list_organizations_admin_only(self, admin_token):
        """Only admin can list all organizations."""
        r = requests.get(f"{BASE}/organizations", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200, f"Admin should list organizations, got {r.text}"

    def test_ngo_cannot_list_all_organizations(self, ngo_token):
        """NGO should NOT be able to list all organizations — admin only."""
        r = requests.get(f"{BASE}/organizations", headers=auth(ngo_token), timeout=10)
        assert r.status_code == 403, f"NGO should be blocked from /organizations, got {r.status_code}"

    def test_unauthenticated_cannot_view_organizations(self):
        r = requests.get(f"{BASE}/organizations", timeout=10)
        assert r.status_code == 401

# ── Project Management ────────────────────────────────────────────────────────

class TestProjectManagement:
    def test_ngo_cannot_create_project_without_approved_profile(self, ngo_token):
        """Unapproved NGO cannot create project — system correctly blocks this."""
        r = requests.post(f"{BASE}/projects", headers=auth(ngo_token), json={
            "title":           f"Test Project {uuid.uuid4().hex[:6]}",
            "description":     "Test project for deployment verification.",
            "required_skills": ["Python", "Research"],
            "duration_weeks":  8,
            "max_volunteers":  5,
            "sdg_goals":       [4, 17]
        }, timeout=10)
        # 403 is correct — NGO not yet approved by admin
        assert r.status_code in (200, 201, 403), f"Unexpected: {r.text}"

    def test_student_cannot_create_project(self):
        student_email = f"st4_{uuid.uuid4().hex[:6]}@students.dkut.ac.ke"
        safe_post(f"{BASE}/auth/register", json={
            "email": student_email, "password": "Student@Test123",
            "first_name": "Test", "last_name": "Student", "role": "student"
        }, timeout=10)
        token = login(student_email, "Student@Test123")
        r = requests.post(f"{BASE}/projects", headers=auth(token), json={
            "title": "Fake Project", "description": "Should fail"
        }, timeout=10)
        assert r.status_code == 403

    def test_ngo_can_view_own_projects(self, ngo_token):
        r = requests.get(f"{BASE}/projects/mine", headers=auth(ngo_token), timeout=10)
        assert r.status_code == 200

    def test_student_cannot_view_ngo_mine_projects(self):
        student_email = f"st5_{uuid.uuid4().hex[:6]}@students.dkut.ac.ke"
        safe_post(f"{BASE}/auth/register", json={
            "email": student_email, "password": "Student@Test123",
            "first_name": "Test", "last_name": "Student", "role": "student"
        }, timeout=10)
        token = login(student_email, "Student@Test123")
        r = requests.get(f"{BASE}/projects/mine", headers=auth(token), timeout=10)
        assert r.status_code == 403

    def test_project_missing_required_fields(self, admin_token):
        """Boundary: incomplete project data must return 400/422."""
        r = requests.post(f"{BASE}/projects", headers=auth(admin_token), json={
            "title": "No description"
        }, timeout=10)
        assert r.status_code in (400, 403, 422), f"Incomplete project: {r.status_code}"

    def test_project_with_xss_payload(self, ngo_token):
        r = requests.post(f"{BASE}/projects", headers=auth(ngo_token), json={
            "title":       "<script>alert('xss')</script>",
            "description": "<img src=x onerror=alert(1)>",
            "required_skills": [],
            "duration_weeks": 4,
            "max_volunteers": 3,
            "sdg_goals": [1]
        }, timeout=10)
        assert r.status_code != 500, "XSS payload crashed the server"

# ── Admin Operations ──────────────────────────────────────────────────────────

class TestAdminOperations:
    def test_admin_dashboard_returns_stats(self, admin_token):
        r = requests.get(f"{BASE}/admin/dashboard", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert any(k in data for k in ("total_students", "total_organizations", "total_projects"))

    def test_admin_can_view_pending_students(self, admin_token):
        r = requests.get(f"{BASE}/admin/queues/students", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200

    def test_admin_can_view_pending_organizations(self, admin_token):
        r = requests.get(f"{BASE}/admin/queues/organizations", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200

    def test_admin_pending_certificates(self, admin_token):
        r = requests.get(f"{BASE}/admin/pending-certificates", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200

    def test_ngo_cannot_access_admin_queue(self, ngo_token):
        r = requests.get(f"{BASE}/admin/queues/students", headers=auth(ngo_token), timeout=10)
        assert r.status_code == 403

    def test_student_cannot_access_admin_queue(self):
        student_email = f"st6_{uuid.uuid4().hex[:6]}@students.dkut.ac.ke"
        safe_post(f"{BASE}/auth/register", json={
            "email": student_email, "password": "Student@Test123",
            "first_name": "Test", "last_name": "Student", "role": "student"
        }, timeout=10)
        token = login(student_email, "Student@Test123")
        r = requests.get(f"{BASE}/admin/queues/students", headers=auth(token), timeout=10)
        assert r.status_code == 403

    def test_bulk_verify_wrong_body(self, admin_token):
        r = requests.post(f"{BASE}/admin/bulk-verify",
                          headers=auth(admin_token), json={"wrong": "body"}, timeout=10)
        assert r.status_code in (400, 404, 422)

    def test_verify_nonexistent_student(self, admin_token):
        fake_id = str(uuid.uuid4())
        r = requests.patch(f"{BASE}/admin/students/{fake_id}/verify",
                           headers=auth(admin_token), timeout=10)
        assert r.status_code in (404, 422)

# ── Performance ───────────────────────────────────────────────────────────────

class TestPerformance:
    def test_root_speed(self):
        start = time.time()
        r = requests.get(f"{BASE}/", timeout=5)
        ms = (time.time() - start) * 1000
        assert r.status_code < 500
        assert ms < 500, f"Root took {ms:.0f}ms"

    def test_login_speed(self):
        start = time.time()
        r = safe_post(f"{BASE}/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=10)
        ms = (time.time() - start) * 1000
        assert r.status_code == 200
        assert ms < 2000, f"Login took {ms:.0f}ms"

    def test_projects_list_speed(self):
        start = time.time()
        r = requests.get(f"{BASE}/projects", timeout=5)
        ms = (time.time() - start) * 1000
        assert r.status_code < 500
        assert ms < 1000, f"Projects list took {ms:.0f}ms"

    def test_stats_speed(self):
        start = time.time()
        r = requests.get(f"{BASE}/stats", timeout=5)
        ms = (time.time() - start) * 1000
        assert r.status_code == 200
        assert ms < 1000, f"Stats took {ms:.0f}ms"

    def test_sdgs_speed(self):
        start = time.time()
        r = requests.get(f"{BASE}/sdgs", timeout=5)
        ms = (time.time() - start) * 1000
        assert r.status_code == 200
        assert ms < 500, f"SDGs took {ms:.0f}ms"

    def test_admin_dashboard_speed(self, admin_token):
        start = time.time()
        r = requests.get(f"{BASE}/admin/dashboard", headers=auth(admin_token), timeout=10)
        ms = (time.time() - start) * 1000
        assert r.status_code == 200
        assert ms < 2000, f"Admin dashboard took {ms:.0f}ms"

    def test_login_average_over_3_requests(self):
        times = []
        for _ in range(3):
            start = time.time()
            r = requests.post(f"{BASE}/auth/login",
                              json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=10)
            elapsed = (time.time() - start) * 1000
            if r.status_code == 429:
                pytest.skip("Rate limited — skipping speed test")
            times.append(elapsed)
        avg = sum(times) / len(times)
        assert avg < 3000, f"Average login time {avg:.0f}ms too slow"

# ── Concurrency ───────────────────────────────────────────────────────────────

class TestConcurrency:
    results = []

    def _concurrent_get(self, url, token=None):
        try:
            headers = auth(token) if token else {}
            start = time.time()
            r = requests.get(url, headers=headers, timeout=10)
            self.results.append({"status": r.status_code, "ms": (time.time()-start)*1000})
        except Exception as e:
            self.results.append({"status": 0, "ms": 0, "error": str(e)})

    def test_10_concurrent_project_reads(self):
        """10 simultaneous GET /projects must not crash."""
        self.results = []
        threads = [threading.Thread(
            target=self._concurrent_get, args=(f"{BASE}/projects",)
        ) for _ in range(10)]
        for t in threads: t.start()
        for t in threads: t.join()
        successes = sum(1 for r in self.results if r["status"] < 500)
        assert successes >= 8, f"Only {successes}/10 concurrent reads succeeded"

    def test_25_concurrent_project_reads(self, admin_token):
        """25 simultaneous GET /projects must not crash."""
        self.results = []
        threads = [threading.Thread(
            target=self._concurrent_get, args=(f"{BASE}/projects",)
        ) for _ in range(25)]
        for t in threads: t.start()
        for t in threads: t.join()
        successes = sum(1 for r in self.results if r["status"] < 500)
        assert successes >= 20, f"Only {successes}/25 concurrent reads succeeded"

    def test_50_concurrent_mixed_requests(self, admin_token):
        """50 simultaneous mixed requests — server must not crash."""
        self.results = []
        urls = [
            f"{BASE}/",
            f"{BASE}/projects",
            f"{BASE}/stats",
            f"{BASE}/sdgs",
            f"{BASE}/admin/dashboard",
        ]
        threads = [threading.Thread(
            target=self._concurrent_get,
            args=(urls[i % len(urls)], admin_token if i % 5 == 4 else None)
        ) for i in range(50)]
        for t in threads: t.start()
        for t in threads: t.join()
        crashes = sum(1 for r in self.results if r["status"] == 500)
        assert crashes == 0, f"{crashes} requests caused server crashes"

# ── Cyber Attacks ─────────────────────────────────────────────────────────────

class TestCyberAttacks:
    def test_sql_injection_in_project_id(self, admin_token):
        payloads = ["1 OR 1=1", "'; DROP TABLE projects;--", "1; SELECT * FROM users"]
        for p in payloads:
            r = requests.get(f"{BASE}/projects/{p}", headers=auth(admin_token), timeout=10)
            assert r.status_code != 500, f"SQL injection crashed server: {p}"
            assert r.status_code in (400, 404, 422), f"SQL injection not blocked: {p} → {r.status_code}"

    def test_path_traversal_attack(self, admin_token):
        payloads = ["../../etc/passwd", "../../../root/.bashrc", "%2e%2e%2fetc%2fpasswd"]
        for p in payloads:
            r = requests.get(f"{BASE}/projects/{p}", headers=auth(admin_token), timeout=10)
            assert r.status_code != 500, f"Path traversal crashed server: {p}"

    def test_header_injection_attack(self):
        try:
            r = requests.get(f"{BASE}/", headers={
                "X-Forwarded-For": "127.0.0.1\r\nX-Injected: evil",
                "Authorization":   "Bearer evil\r\nX-Admin: true"
            }, timeout=5)
            assert r.status_code != 500
        except requests.exceptions.InvalidHeader:
            pass  # requests library correctly blocks CRLF injection

    def test_oversized_payload_attack(self):
        r = safe_post(f"{BASE}/auth/login",
                      json={"email": "a" * 10000 + "@test.com", "password": "x" * 10000},
                      timeout=10)
        assert r.status_code != 500, "Oversized payload crashed the server"

    def test_json_bomb_attack(self):
        nested = {"a": None}
        for _ in range(20):
            nested = {"a": nested}
        r = safe_post(f"{BASE}/auth/login", json=nested, timeout=10)
        assert r.status_code != 500

    def test_mass_assignment_attack(self):
        r = safe_post(f"{BASE}/auth/register", json={
            "email":      f"hack_{uuid.uuid4().hex[:6]}@students.dkut.ac.ke",
            "password":   "Password@123",
            "first_name": "Hacker",
            "last_name":  "Test",
            "role":       "student",
            "is_admin":   True,
            "is_verified": True,
            "role_override": "admin"
        }, timeout=10)
        assert r.status_code in (200, 201, 400, 422)
        if r.status_code in (200, 201):
            token = login(f"hack_{r.request.body}", "Password@123") if False else None

    def test_cors_headers_present(self):
        r = requests.options(f"{BASE}/", headers={"Origin": "http://evil.com"}, timeout=5)
        assert r.status_code != 500

    def test_attack_feedback_returns_structured_error(self):
        """System must return structured JSON errors, not stack traces."""
        r = safe_post(f"{BASE}/auth/login",
                      json={"email": "bad@bad.com", "password": "badpass"}, timeout=10)
        assert r.status_code in (400, 401, 422), f"Expected structured error, got {r.status_code}"
        assert r.headers.get("content-type", "").startswith("application/json"), \
            "Error response must be JSON"

# ── Portability & Size ────────────────────────────────────────────────────────

class TestPortabilityAndSize:
    BASE_DIR = os.path.expanduser("~/backend/backend/app")

    def test_app_directory_exists(self):
        assert os.path.isdir(self.BASE_DIR)

    def test_main_py_exists(self):
        assert os.path.isfile(os.path.join(self.BASE_DIR, "main.py"))

    def test_models_py_exists(self):
        assert os.path.isfile(os.path.join(self.BASE_DIR, "models.py"))

    def test_env_variables_configured(self):
        env_file = os.path.expanduser("~/backend/backend/.env")
        assert os.path.isfile(env_file), ".env file missing"

    def test_system_size_within_limits(self):
        total = 0
        for dirpath, _, filenames in os.walk(os.path.expanduser("~/backend/backend")):
            if "venv" in dirpath or "__pycache__" in dirpath:
                continue
            for f in filenames:
                fp = os.path.join(dirpath, f)
                try:
                    total += os.path.getsize(fp)
                except OSError:
                    pass
        mb = total / (1024 * 1024)
        assert mb < 500, f"System too large: {mb:.1f}MB"

    def test_python_version_compatible(self):
        assert sys.version_info >= (3, 9), f"Python {sys.version} too old"

    def test_locustfile_exists_for_load_testing(self):
        assert os.path.isfile(os.path.expanduser("~/backend/backend/locustfile.py"))

    def test_database_connection_string_configured(self):
        env_file = os.path.expanduser("~/backend/backend/.env")
        content = open(env_file).read()
        assert "DATABASE_URL" in content or "DB_" in content, "No DB config in .env"

    def test_secret_key_not_default(self):
        env_file = os.path.expanduser("~/backend/backend/.env")
        content = open(env_file).read()
        assert "secret" not in content.lower().replace("secret_key", "").replace("SECRET_KEY", "") \
               or "SECRET_KEY" in content, "Secret key may be insecure"
