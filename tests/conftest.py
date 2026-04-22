"""
Shared configuration and helpers for all test parts.
"""
import pytest
import requests
import uuid

BASE = "http://localhost:8000"

# ── Real credentials ──────────────────────────────────────────────────────────
ADMIN_EMAIL    = "admin@dkut.ac.ke"
ADMIN_PASSWORD = "Admin@DKUT2025"

STUDENT_EMAIL    = f"teststudent_{uuid.uuid4().hex[:6]}@students.dkut.ac.ke"
STUDENT_PASSWORD = "Student@Test123"

NGO_EMAIL    = f"testngo_{uuid.uuid4().hex[:6]}@org.ke"
NGO_PASSWORD = "Ngo@Test123"

# ── Helpers ───────────────────────────────────────────────────────────────────
def login(email: str, password: str) -> str:
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=10)
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    return r.json()["access_token"]

def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

def server_is_up() -> bool:
    try:
        r = requests.get(f"{BASE}/", timeout=5)
        return r.status_code < 500
    except Exception:
        return False
