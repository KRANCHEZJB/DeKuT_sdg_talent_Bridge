# DeKUT SDG Talent Bridge

A full-stack web platform connecting Dedan Kimathi University of Technology (DeKUT) students with NGOs and industry partners through SDG-aligned project opportunities.

## System Overview

The platform facilitates:
- Student registration, verification, and project applications
- NGO project creation and student selection
- Work submission, review, and completion flow
- Certificate and recommendation letter generation (PDF)
- IP recording and innovation showcase
- Scoring, awards, and reimbursement management

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| Frontend | React + TypeScript + Vite |
| Database | PostgreSQL |
| PDF Generation | fpdf2 + Jinja2 |
| Auth | JWT (python-jose) |

## Project Structure
## Setup Instructions

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL 14+

### Backend Setup
```bash
git clone https://github.com/KRANCHEZJB/DeKuT_sdg_talent_Bridge.git
cd DeKuT_sdg_talent_Bridge
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database credentials
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## User Roles

| Role | Description |
|------|-------------|
| Admin | Verifies users, issues certificates, manages platform |
| Student | Applies for projects, submits work, downloads certificates |
| NGO | Creates projects, reviews submissions, submits outcome reports |

## Key Flows

1. **Project Flow:** Student applies → NGO selects → Student submits work → NGO reviews → Admin issues certificate
2. **Personal Project Flow:** Student submits → Admin records IP → Admin approves showcase
3. **Recommendation Letter:** Student requests → Admin approves → PDF generated via Jinja2 template

## API Documentation

Once running, visit: http://localhost:8000/docs

## License

DeKUT Final Year Project — 2026
