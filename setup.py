#!/usr/bin/env python3
"""
SDG Talent Bridge — Interactive Setup Script
Run this once on a new machine to configure your environment.
"""

import os
import secrets
import subprocess
import sys

BLUE   = "\033[94m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def banner():
    print(f"""
{BLUE}{BOLD}
╔══════════════════════════════════════════════════════╗
║         SDG Talent Bridge — Setup Wizard             ║
║         DeKUT Platform Configuration                 ║
╚══════════════════════════════════════════════════════╝
{RESET}""")

def ask(prompt, default=None, secret=False):
    if default:
        display = f"{prompt} [{default}]: "
    else:
        display = f"{prompt}: "

    if secret:
        import getpass
        value = getpass.getpass(display)
    else:
        value = input(display).strip()

    return value if value else default

def generate_secret_key():
    return secrets.token_hex(32)

def write_env(config: dict, env_path: str):
    lines = [
        "# ─── SDG Talent Bridge Environment Configuration ───────────────────────────",
        f'DATABASE_URL=postgresql://{config["db_user"]}:{config["db_password"]}@{config["db_host"]}:{config["db_port"]}/{config["db_name"]}',
        f'SECRET_KEY={config["secret_key"]}',
        f'ACCESS_TOKEN_EXPIRE_MINUTES={config["token_expire"]}',
        f'SMTP_HOST={config["smtp_host"]}',
        f'SMTP_PORT={config["smtp_port"]}',
        f'SMTP_USER={config["smtp_user"]}',
        f'SMTP_PASSWORD={config["smtp_password"]}',
        f'SMTP_FROM={config["smtp_from"]}',
        f'FRONTEND_URL={config["frontend_url"]}',
    ]
    with open(env_path, "w") as f:
        f.write("\n".join(lines) + "\n")

def write_env_example(env_path: str):
    lines = [
        "# ─── SDG Talent Bridge Environment Example ─────────────────────────────────",
        "# Copy this file to .env and fill in your values",
        "DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/sdg_talent_bridge",
        "SECRET_KEY=your-secret-key-here",
        "ACCESS_TOKEN_EXPIRE_MINUTES=1440",
        "SMTP_HOST=smtp.gmail.com",
        "SMTP_PORT=587",
        "SMTP_USER=",
        "SMTP_PASSWORD=",
        "SMTP_FROM=",
        "FRONTEND_URL=http://localhost:5173",
    ]
    with open(env_path, "w") as f:
        f.write("\n".join(lines) + "\n")

def check_postgres():
    try:
        result = subprocess.run(["psql", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"  {GREEN}✓ PostgreSQL found:{RESET} {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    print(f"  {YELLOW}⚠ PostgreSQL not found. Install it before running the backend.{RESET}")
    return False

def check_python():
    version = sys.version_info
    if version.major == 3 and version.minor >= 10:
        print(f"  {GREEN}✓ Python {version.major}.{version.minor} detected{RESET}")
        return True
    print(f"  {RED}✗ Python 3.10+ required. You have {version.major}.{version.minor}{RESET}")
    return False

def check_node():
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"  {GREEN}✓ Node.js found:{RESET} {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    print(f"  {YELLOW}⚠ Node.js not found. Install it to run the frontend.{RESET}")
    return False

def main():
    banner()

    # ─── Detect script location ───────────────────────────────────────────────
    script_dir   = os.path.dirname(os.path.abspath(__file__))
    backend_dir  = os.path.join(script_dir, "backend")
    frontend_dir = os.path.join(script_dir, "frontend")
    env_path     = os.path.join(backend_dir, ".env")
    env_example  = os.path.join(backend_dir, ".env.example")

    # ─── System checks ────────────────────────────────────────────────────────
    print(f"{BOLD}🔍 Checking system requirements...{RESET}")
    check_python()
    check_node()
    check_postgres()
    print()

    # ─── Already configured? ──────────────────────────────────────────────────
    if os.path.exists(env_path):
        overwrite = ask(
            f"{YELLOW}⚠  A .env file already exists. Overwrite it? (yes/no){RESET}",
            default="no"
        )
        if overwrite.lower() not in ("yes", "y"):
            print(f"\n{GREEN}✅ Setup skipped. Existing .env kept.{RESET}\n")
            return

    # ─── Database configuration ───────────────────────────────────────────────
    print(f"{BOLD}🗄️  Database Configuration{RESET}")
    print(f"{YELLOW}  (Press Enter to use the default value shown in brackets){RESET}\n")

    db_user     = ask("  PostgreSQL username", default="postgres")
    db_password = ask("  PostgreSQL password", secret=True)
    while not db_password:
        print(f"  {RED}Password cannot be empty.{RESET}")
        db_password = ask("  PostgreSQL password", secret=True)

    db_host = ask("  Database host", default="localhost")
    db_port = ask("  Database port", default="5432")
    db_name = ask("  Database name", default="sdg_talent_bridge")
    print()

    # ─── Security configuration ───────────────────────────────────────────────
    print(f"{BOLD}🔐 Security Configuration{RESET}\n")
    secret_input = ask(
        "  Secret key (press Enter to auto-generate a secure one)",
        default=""
    )
    secret_key = secret_input if secret_input else generate_secret_key()
    if not secret_input:
        print(f"  {GREEN}✓ Auto-generated secret key{RESET}")

    token_expire = ask("  Token expiry in minutes", default="1440")
    print()

    # ─── Email configuration (optional) ───────────────────────────────────────
    print(f"{BOLD}📧 Email Configuration {YELLOW}(optional — press Enter to skip){RESET}{BOLD}{RESET}\n")
    smtp_host     = ask("  SMTP host",     default="")
    smtp_port     = ask("  SMTP port",     default="587")
    smtp_user     = ask("  SMTP username", default="")
    smtp_password = ask("  SMTP password", secret=True) if smtp_user else ""
    smtp_from     = ask("  From email",    default="")
    print()

    # ─── Frontend URL ─────────────────────────────────────────────────────────
    print(f"{BOLD}🌐 Frontend Configuration{RESET}\n")
    frontend_url = ask("  Frontend URL", default="http://localhost:5173")
    print()

    # ─── Write files ──────────────────────────────────────────────────────────
    config = {
        "db_user": db_user, "db_password": db_password,
        "db_host": db_host, "db_port": db_port, "db_name": db_name,
        "secret_key": secret_key, "token_expire": token_expire,
        "smtp_host": smtp_host, "smtp_port": smtp_port,
        "smtp_user": smtp_user, "smtp_password": smtp_password,
        "smtp_from": smtp_from, "frontend_url": frontend_url,
    }

    write_env(config, env_path)
    write_env_example(env_example)

    # ─── Summary ──────────────────────────────────────────────────────────────
    print(f"{GREEN}{BOLD}✅ Setup complete!{RESET}\n")
    print(f"  {GREEN}✓{RESET} .env file created at:         {env_path}")
    print(f"  {GREEN}✓{RESET} .env.example created at:      {env_example}")
    print()
    print(f"{BOLD}🚀 Next steps:{RESET}")
    print(f"""
  1. Create the database:
     {BLUE}psql -U {db_user} -c "CREATE DATABASE {db_name};"  {RESET}

  2. Start the backend:
     {BLUE}cd backend && pip install -r requirements.txt{RESET}
     {BLUE}uvicorn app.main:app --reload --host 0.0.0.0 --port 8000{RESET}

  3. Start the frontend:
     {BLUE}cd frontend && npm install && npm run dev{RESET}

  4. Open your browser:
     {BLUE}http://localhost:5173{RESET}

  5. Login with default admin:
     {BLUE}Email:    admin@dkut.ac.ke{RESET}
     {BLUE}Password: Admin@DKUT2025{RESET}
""")

if __name__ == "__main__":
    main()
