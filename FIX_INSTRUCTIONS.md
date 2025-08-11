# STEP-BY-STEP FIX FOR DOCUMENT AVAILABILITY ISSUE

## The Problem
Documents for EEE 2025-2026 are not showing as "Available" in the event viewing tab.

## Root Cause Identified & Fixed
1. Backend `/documents/list` endpoint was not filtering by department/academic year ✅ FIXED
2. Frontend was not passing filtering parameters ✅ FIXED  
3. Document type mapping issue ('zipfile' vs 'files') ✅ FIXED

## IMMEDIATE ACTION REQUIRED

### Step 1: Restart Backend Server
```powershell
# Open new terminal and run:
cd "C:\Users\silic\Documents\GitHub\academic-activity-portal\backend"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Step 2: Restart Frontend Server  
```powershell
# Open another terminal and run:
cd "C:\Users\silic\Documents\GitHub\academic-activity-portal\frontend"
npm start
```

### Step 3: Test the Fix
1. Open browser to http://localhost:3000
2. Login and navigate to Dashboard → Document Management
3. Select Filters:
   - Department: EEE
   - Academic Year: 2025-2026
4. You should see documents listed for events "test" and "safasf"

### Step 4: Alternative Test via EventPlanningModal
If you have a way to open EventPlanningModal for EEE, 2025-2026:
- Should show debug section: "Available Documents (4 found)"
- Should show: "test": Report ✓ ZIP ✓ and "safasf": Report ✓ ZIP ✓

## Expected Result
For EEE department, 2025-2026 academic year:
- Event "test": Report: Available, ZIP: Available
- Event "safasf": Report: Available, ZIP: Available

## If Still Not Working
1. Check browser console for errors (F12 → Console tab)
2. Verify API calls are being made with correct parameters
3. Clear browser cache (Ctrl+Shift+R)
4. Check that you're selecting the correct department (EEE) and year (2025-2026)

## Backend API Test (Optional)
To manually verify backend is working, open browser and go to:
http://localhost:8000/documents/list?department_id=2&academic_year_id=1

Should return JSON with 4 documents.
