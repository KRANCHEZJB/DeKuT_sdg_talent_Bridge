import pytest
import requests
import uuid

BASE = "http://localhost:8000"

def login(email, password):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]

def auth(token):
    return {"Authorization": f"Bearer {token}"}

ADMIN_EMAIL    = "admin@dkut.ac.ke"
ADMIN_PASSWORD = "Admin@DKUT2025"
STUDENT_EMAIL    = "teststudent@dkut.ac.ke"
STUDENT_PASSWORD = "Student@Test123"
NGO_EMAIL    = "testngo@org.ke"
NGO_PASSWORD = "Ngo@Test123"


class TestAuth:
    def test_admin_login(self):
        token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token

    def test_invalid_login(self):
        r = requests.post(f"{BASE}/auth/login", json={"email": "wrong@email.com", "password": "wrongpass"})
        assert r.status_code in (401, 400)


class TestStudentRegistration:
    def test_register_student(self):
        r = requests.post(f"{BASE}/auth/register", json={
            "email": STUDENT_EMAIL,
            "password": STUDENT_PASSWORD,
            "first_name": "Test",
            "last_name": "Student",
            "role": "student"
        })
        assert r.status_code in (200, 201, 409), r.text

    def test_unverified_student_cannot_apply(self):
        token = login(STUDENT_EMAIL, STUDENT_PASSWORD)
        r = requests.get(f"{BASE}/projects", headers=auth(token))
        projects = r.json() if r.status_code == 200 else []
        if projects:
            pid = projects[0]["id"]
            r2 = requests.post(f"{BASE}/projects/{pid}/apply", headers=auth(token))
            assert r2.status_code == 403, f"Expected 403, got {r2.status_code}: {r2.text}"
        else:
            pytest.skip("No projects available to test against")


class TestNgoRegistration:
    def test_register_ngo(self):
        r = requests.post(f"{BASE}/auth/register", json={
            "email": NGO_EMAIL,
            "password": NGO_PASSWORD,
            "first_name": "Test",
            "last_name": "NGO",
            "role": "ngo"
        })
        assert r.status_code in (200, 201, 409), r.text


class TestNGOCannotIssueCertificate:
    def test_ngo_cannot_set_officially_complete(self):
        ngo_token = login(NGO_EMAIL, NGO_PASSWORD)
        r = requests.get(f"{BASE}/ngo/applications", headers=auth(ngo_token))
        if r.status_code == 200 and r.json():
            app_id = r.json()[0]["application_id"]
            r2 = requests.patch(
                f"{BASE}/applications/{app_id}/status",
                json={"status": "officially_complete"},
                headers=auth(ngo_token)
            )
            assert r2.status_code == 400, f"NGO should NOT set officially_complete: {r2.text}"
        else:
            pytest.skip("No NGO applications to test against")


class TestWorkSubmissionGates:
    def test_cannot_submit_work_if_not_selected(self):
        student_token = login(STUDENT_EMAIL, STUDENT_PASSWORD)
        r = requests.get(f"{BASE}/applications/mine", headers=auth(student_token))
        if r.status_code == 200 and r.json():
            app = next((a for a in r.json() if a["status"] == "applied"), None)
            if app:
                r2 = requests.post(
                    f"{BASE}/applications/{app["application_id"]}/submit-work",
                    json={"description": "test", "deliverable_url": "http://test.com", "hours_worked": 10},
                    headers=auth(student_token)
                )
                assert r2.status_code == 400, f"Should block submission when status=applied: {r2.text}"
            else:
                pytest.skip("No applied applications to test against")
        else:
            pytest.skip("No applications found")


class TestAdminCertificateGate:
    def test_cannot_issue_cert_for_nonexistent_app(self):
        admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        fake_id = str(uuid.uuid4())
        r = requests.patch(f"{BASE}/applications/{fake_id}/approve-completion", headers=auth(admin_token))
        assert r.status_code == 404, r.text

    def test_ngo_cannot_call_approve_completion(self):
        ngo_token = login(NGO_EMAIL, NGO_PASSWORD)
        fake_id = str(uuid.uuid4())
        r = requests.patch(f"{BASE}/applications/{fake_id}/approve-completion", headers=auth(ngo_token))
        assert r.status_code in (403, 401), f"NGO should not access approve-completion: {r.text}"
