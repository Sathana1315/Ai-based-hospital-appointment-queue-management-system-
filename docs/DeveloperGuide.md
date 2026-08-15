# Q-Med Developer Guide

## Local Setup

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../.env.development .env
uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Adding New Features
1. **Database:** Collections are defined in `app/database.py`. If you create a new collection, ensure you add appropriate indexes in the `setup_indexes()` function.
2. **Routes:** Create a new file in `app/routes/`. Register it in `app/main.py`.
3. **Middleware:** Any global modifications to headers or logging should be added to `app/middleware.py`.

## Running Tests
Tests are configured using `pytest`. Run `pytest` inside the backend directory to execute the suite.
