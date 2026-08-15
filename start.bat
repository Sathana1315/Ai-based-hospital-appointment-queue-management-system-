@echo off
setlocal enabledelayedexpansion
title Hospital Queue Management System - Launcher
color 0A

:: ============================================================
:: HOSPITAL QUEUE MANAGEMENT SYSTEM - PROFESSIONAL LAUNCHER
:: Author: Q-Med Dev Team
:: Description: Prepares and starts both backend and frontend
::              servers in a single double-click action.
:: ============================================================

echo.
echo  ==========================================
echo   Hospital Queue Management System
echo   Project Launcher v1.0
echo  ==========================================
echo.


:: ============================================================
:: SECTION 1: CHECK PYTHON INSTALLATION
:: Uses 'where' for reliable existence check.
:: Uses findstr /r to extract only the version line,
:: filtering out any warnings from newer Python versions.
:: ============================================================
echo  [*] Checking Python installation...
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [X] ERROR: Python is not installed or not found in PATH.
    echo.
    echo      Please install Python 3.10+ from:
    echo      https://www.python.org/downloads/
    echo      Check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)
set PYTHON_VERSION=detected
for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo  [+] Python detected: %PYTHON_VERSION%


:: ============================================================
:: SECTION 2: CHECK NODE.JS INSTALLATION
:: ============================================================
echo  [*] Checking Node.js installation...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [X] ERROR: Node.js is not installed or not found in PATH.
    echo.
    echo      Please install Node.js LTS from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
set NODE_VERSION=detected
for /f "tokens=*" %%i in ('node --version 2^>^&1') do set NODE_VERSION=%%i
echo  [+] Node.js detected: %NODE_VERSION%


:: ============================================================
:: SECTION 3: CHECK NPM INSTALLATION
:: Uses 'where' for existence check (avoids ERRORLEVEL corruption
:: from Node.js 24+ npm deprecation warnings on stdout/stderr).
:: Uses findstr to extract only the numeric version line.
:: ============================================================
echo  [*] Checking npm installation...
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [X] ERROR: npm is not installed or not found in PATH.
    echo.
    echo      Please reinstall Node.js from https://nodejs.org/
    echo      npm is bundled with Node.js.
    echo.
    pause
    exit /b 1
)
:: Use findstr to capture only lines starting with digits (the version number)
:: This safely ignores npm deprecation/warning lines from Node 24+
set NPM_VERSION=detected
for /f "tokens=*" %%i in ('npm --version 2^>nul ^| findstr /r "^[0-9]"') do set NPM_VERSION=%%i
echo  [+] npm detected: v%NPM_VERSION%


:: ============================================================
:: SECTION 4: VERIFY BACKEND FOLDER EXISTS
:: ============================================================
echo  [*] Locating backend directory...
if not exist "backend\" (
    echo.
    echo  [X] ERROR: 'backend' folder not found.
    echo      Please run start.bat from the project root folder.
    echo.
    pause
    exit /b 1
)
echo  [+] Backend directory located.
cd backend


:: ============================================================
:: SECTION 5 + 6: CHECK / CREATE PYTHON VIRTUAL ENVIRONMENT
:: Idempotent: venv is only created if the folder is missing.
:: ============================================================
echo  [*] Checking Python virtual environment...
if not exist "venv\" (
    echo  [*] Virtual environment not found. Creating new venv...
    python -m venv venv
    if %ERRORLEVEL% neq 0 (
        echo.
        echo  [X] ERROR: Failed to create virtual environment.
        echo      Ensure Python is correctly installed and try again.
        echo.
        cd ..
        pause
        exit /b 1
    )
    echo  [+] Virtual environment created successfully.
) else (
    echo  [+] Virtual environment already exists. Skipping creation.
)

:: Activate the virtual environment
echo  [*] Activating virtual environment...
call venv\Scripts\activate.bat
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [X] ERROR: Failed to activate virtual environment.
    echo      Try deleting 'backend\venv' and running start.bat again.
    echo.
    cd ..
    pause
    exit /b 1
)
echo  [+] Virtual environment activated.


:: ============================================================
:: SECTION 7 + 8: INSTALL BACKEND DEPENDENCIES (ONLY IF NEEDED)
:: Checks 4 core packages. Only runs pip install if any are absent.
:: This makes the script idempotent - no unnecessary reinstalls.
:: ============================================================
echo  [*] Checking backend dependencies...
if not exist "requirements.txt" (
    echo  [!] WARNING: requirements.txt not found. Skipping dependency install.
    goto :backend_deps_done
)

set NEEDS_INSTALL=0
pip show fastapi >nul 2>&1
if %ERRORLEVEL% neq 0 set NEEDS_INSTALL=1
pip show uvicorn >nul 2>&1
if %ERRORLEVEL% neq 0 set NEEDS_INSTALL=1
pip show motor >nul 2>&1
if %ERRORLEVEL% neq 0 set NEEDS_INSTALL=1
pip show groq >nul 2>&1
if %ERRORLEVEL% neq 0 set NEEDS_INSTALL=1

if %NEEDS_INSTALL% equ 1 (
    echo  [*] Missing packages detected. Installing from requirements.txt...
    pip install -r requirements.txt
    if %ERRORLEVEL% neq 0 (
        echo.
        echo  [X] ERROR: pip install failed.
        echo      Check your internet connection and requirements.txt.
        echo.
        cd ..
        pause
        exit /b 1
    )
    echo  [+] Backend dependencies installed successfully.
) else (
    echo  [+] Backend dependencies already installed. Skipping pip install.
)

:backend_deps_done


:: ============================================================
:: SECTION 9: VERIFY ALL REQUIRED BACKEND PACKAGES
:: Checks each package individually and collects missing ones.
:: ============================================================
echo  [*] Verifying required backend packages...
set MISSING_PACKAGES=

pip show fastapi       >nul 2>&1
if %ERRORLEVEL% neq 0 set "MISSING_PACKAGES=%MISSING_PACKAGES% fastapi"

pip show uvicorn       >nul 2>&1
if %ERRORLEVEL% neq 0 set "MISSING_PACKAGES=%MISSING_PACKAGES% uvicorn"

pip show motor         >nul 2>&1
if %ERRORLEVEL% neq 0 set "MISSING_PACKAGES=%MISSING_PACKAGES% motor"

pip show pymongo       >nul 2>&1
if %ERRORLEVEL% neq 0 set "MISSING_PACKAGES=%MISSING_PACKAGES% pymongo"

pip show python-dotenv >nul 2>&1
if %ERRORLEVEL% neq 0 set "MISSING_PACKAGES=%MISSING_PACKAGES% python-dotenv"

pip show python-jose   >nul 2>&1
if %ERRORLEVEL% neq 0 set "MISSING_PACKAGES=%MISSING_PACKAGES% python-jose"

pip show passlib       >nul 2>&1
if %ERRORLEVEL% neq 0 set "MISSING_PACKAGES=%MISSING_PACKAGES% passlib"

pip show bcrypt        >nul 2>&1
if %ERRORLEVEL% neq 0 set "MISSING_PACKAGES=%MISSING_PACKAGES% bcrypt"

pip show faster-whisper >nul 2>&1
if %ERRORLEVEL% neq 0 set "MISSING_PACKAGES=%MISSING_PACKAGES% faster-whisper"

pip show groq          >nul 2>&1
if %ERRORLEVEL% neq 0 set "MISSING_PACKAGES=%MISSING_PACKAGES% groq"

pip show pydantic      >nul 2>&1
if %ERRORLEVEL% neq 0 set "MISSING_PACKAGES=%MISSING_PACKAGES% pydantic"

if not "%MISSING_PACKAGES%"=="" (
    echo.
    echo  [X] ERROR: The following required packages are still missing:
    echo     %MISSING_PACKAGES%
    echo.
    echo      Run manually: pip install -r requirements.txt
    echo.
    cd ..
    pause
    exit /b 1
)
echo  [+] All required backend packages verified.


:: ============================================================
:: SECTION 10: CHECK BACKEND .ENV FILE (NON-FATAL WARNING)
:: Missing .env will not stop execution but warns the user.
:: ============================================================
echo  [*] Checking backend .env configuration...
if not exist ".env" (
    echo  [!] WARNING: .env file not found in the backend folder.
    echo      The server may fail to connect to MongoDB or Groq API.
    echo      Create backend\.env with MONGODB_URI and GROQ_API_KEY.
    echo.
) else (
    echo  [+] .env configuration file found.
)

:: Return to project root
cd ..


:: ============================================================
:: SECTION 11: CHECK / INSTALL FRONTEND NODE_MODULES
:: Only runs npm install when node_modules folder is absent.
:: ============================================================
echo  [*] Checking frontend dependencies...
if not exist "frontend\" (
    echo.
    echo  [X] ERROR: 'frontend' folder not found.
    echo      Please run start.bat from the project root folder.
    echo.
    pause
    exit /b 1
)

if not exist "frontend\node_modules\" (
    echo  [*] node_modules not found. Running npm install...
    cd frontend
    npm install
    if %ERRORLEVEL% neq 0 (
        echo.
        echo  [X] ERROR: npm install failed for the frontend.
        echo      Check your internet connection or package.json for errors.
        echo.
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo  [+] Frontend dependencies installed successfully.
) else (
    echo  [+] Frontend node_modules already exist. Skipping npm install.
)
echo  [+] Frontend dependencies verified.


:: ============================================================
:: SECTION 12: LAUNCH FASTAPI BACKEND IN A NEW TERMINAL WINDOW
:: Uses full venv path for uvicorn to avoid PATH lookup issues.
:: %~dp0 expands to the directory of start.bat (project root).
:: ============================================================
echo  [*] Starting FastAPI server...
set "PROJECT_ROOT=%~dp0"
start "Hospital Queue - Backend" cmd /k "title Hospital Queue Backend && cd /d "%PROJECT_ROOT%backend" && call venv\Scripts\activate.bat && echo. && echo  [+] FastAPI running at http://127.0.0.1:8000 && echo  [+] API Docs at    http://127.0.0.1:8000/docs && echo. && venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo  [+] Starting FastAPI server...


:: ============================================================
:: SECTION 13: LAUNCH REACT FRONTEND IN A NEW TERMINAL WINDOW
:: ============================================================
start "Hospital Queue - Frontend" cmd /k "title Hospital Queue Frontend && cd /d "%PROJECT_ROOT%frontend" && echo. && echo  [+] React Frontend running at http://localhost:5173 && echo. && npm run dev"
echo  [+] Starting React server...


:: ============================================================
:: SECTION 14: BRIEF WAIT FOR SERVERS TO INITIALIZE
:: ============================================================
echo.
echo  [*] Waiting for servers to initialize...
timeout /t 3 /nobreak >nul


:: ============================================================
:: SECTION 15: FINAL STARTUP SUMMARY
:: ============================================================
echo.
echo  ==========================================
echo   Hospital Queue Management System
echo  ==========================================
echo.
echo   Backend  (FastAPI):
echo   http://127.0.0.1:8000
echo.
echo   Frontend (React):
echo   http://localhost:5173
echo.
echo  ==========================================
echo.
echo  [+] Python   : %PYTHON_VERSION%
echo  [+] Node.js  : %NODE_VERSION%
echo  [+] npm      : v%NPM_VERSION%
echo.
echo  [+] Project started successfully!
echo  [+] Both server windows are running separately.
echo  [+] Close those windows to stop the servers.
echo.
echo  ==========================================
echo.
pause
endlocal
