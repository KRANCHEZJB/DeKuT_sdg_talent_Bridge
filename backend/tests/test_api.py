import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Unique suffix per test run to avoid conflicts with real database
suffix = uuid.uuid4().hex[:8]

student_data = {
    "email": f"teststudent_{suffix}@sdgtalent.com",
    "password": "Test123!",
    "first_name": "Test",
    "last_name": "Student",
    "role": "student"
}

ngo_data = {
    "email": f"testngo_{suffix}@sdgtalent.com",
    "password": "Test123!",
    "first_name": "Test",
    "last_name": "NGO",
    "role": "ngo"
}

# ─── AUTH TESTS ──────────────────────────────────────
def test_register_student():
    response = client.post("/auth/register", json=student_data)
    assert response.status_code == 200
    assert response.json()["email"] == student_data["email"]

def test_register_ngo():
    response = client.post("/auth/register", json=ngo_data)
    assert response.status_code == 200
    assert response.json()["email"] == ngo_data["email"]

def test_register_duplicate_email():
    response = client.post("/auth/register", json=student_data)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

def test_login_student():
    response = client.post("/auth/login", json={
        "email": student_data["email"],
        "password": student_data["password"]
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["role"] == "student"

def test_login_wrong_password():
    response = client.post("/auth/login", json={
        "email": student_data["email"],
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_get_me():
    login = client.post("/auth/login", json={
        "email": student_data["email"],
        "password": student_data["password"]
    })
    token = login.json()["access_token"]
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == student_data["email"]

def test_get_me_no_token():
    response = client.get("/auth/me")
    assert response.status_code == 401

# ─── NGO PROFILE TESTS ───────────────────────────────
def test_create_ngo_profile():
    login = client.post("/auth/login", json={
        "email": ngo_data["email"],
        "password": ngo_data["password"]
    })
    token = login.json()["access_token"]
    response = client.post("/ngo/profile", json={
        "organization_name": f"Test NGO {suffix}",
        "organization_slug": f"test-ngo-{suffix}",
        "mission_statement": "Testing NGO mission",
        "primary_email": ngo_data["email"]
    }, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["organization_name"] == f"Test NGO {suffix}"

def test_student_cannot_create_ngo_profile():
    login = client.post("/auth/login", json={
        "email": student_data["email"],
        "password": student_data["password"]
    })
    token = login.json()["access_token"]
    response = client.post("/ngo/profile", json={
        "organization_name": "Fake NGO",
        "organization_slug": f"fake-ngo-{suffix}",
        "mission_statement": "Fake mission",
        "primary_email": "fake@sdgtalent.com"
    }, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403

# ─── STUDENT PROFILE TESTS ───────────────────────────
def test_create_student_profile():
    login = client.post("/auth/login", json={
        "email": student_data["email"],
        "password": student_data["password"]
    })
    token = login.json()["access_token"]
    response = client.post("/student/profile", json={
        "display_name": f"Test Student {suffix}",
        "profile_slug": f"test-student-{suffix}",
        "bio": "Test bio"
    }, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert "id" in response.json()

def test_ngo_cannot_create_student_profile():
    login = client.post("/auth/login", json={
        "email": ngo_data["email"],
        "password": ngo_data["password"]
    })
    token = login.json()["access_token"]
    response = client.post("/student/profile", json={
        "display_name": "Fake Student",
        "profile_slug": f"fake-student-{suffix}",
        "bio": "Fake bio"
    }, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403

# ─── PROJECT TESTS ───────────────────────────────────
def test_create_project():
    login = client.post("/auth/login", json={
        "email": ngo_data["email"],
        "password": ngo_data["password"]
    })
    token = login.json()["access_token"]
    response = client.post("/projects/", json={
        "project_name": f"Test Project {suffix}",
        "project_slug": f"test-project-{suffix}",
        "project_type": "volunteering",
        "description": "Test project description",
        "skills_required": ["python", "research"],
        "is_remote": True
    }, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["project_name"] == f"Test Project {suffix}"

def test_student_cannot_create_project():
    login = client.post("/auth/login", json={
        "email": student_data["email"],
        "password": student_data["password"]
    })
    token = login.json()["access_token"]
    response = client.post("/projects/", json={
        "project_name": "Fake Project",
        "project_slug": f"fake-project-{suffix}",
        "project_type": "volunteering",
        "description": "Fake",
        "is_remote": True
    }, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403

def test_get_projects():
    response = client.get("/projects/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
