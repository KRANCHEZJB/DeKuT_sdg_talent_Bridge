import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:Kranch14th01!@localhost:5432/sdg_talent_bridge"
)

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "sdg_talent_bridge_secret_key_2024_prod_change_this"
)

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
)

# DeKUT institutional rule — students must use this email domain
DEKUT_STUDENT_EMAIL_DOMAIN = "@students.dkut.ac.ke"

# Email / SMTP settings
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "")

# Frontend URL for email links
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
