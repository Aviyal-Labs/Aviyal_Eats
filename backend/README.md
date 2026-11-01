# Week 1 Django skeleton

Folder structure and minimal Django configuration only. No models, business logic, endpoints, Docker, or migrations have been implemented.

## Install (Windows PowerShell)
```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
```

Create a local PostgreSQL database and set environment variables from `.env.example` in your shell. `.env` is **not automatically loaded**.

```powershell
python manage.py check
python manage.py runserver
```

Before your first migrations, implement `accounts.User` and set `AUTH_USER_MODEL = "accounts.User"` in `config/settings/base.py`.
