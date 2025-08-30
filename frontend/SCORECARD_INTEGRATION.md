# Score Card Module - Frontend Integration Guide

## Overview
The Department Score Card module provides a comprehensive system for managing KPI-based assessments with three main user interfaces:

### 1. Admin Interface (ScoreCardAdmin.jsx)
- **Route**: `/scorecard-admin`
- **Users**: admin, principal, dean_iqac, pa_principal
- **Features**: 
  - Question Management (CRUD, reorder, bulk operations)
  - Template Management
  - Import/Export functionality
  - Statistics and analytics

### 2. HoD Form Interface (ScoreCardForm.jsx)
- **Route**: `/scorecard-form`
- **Users**: hod
- **Features**:
  - Scorecard submission form
  - Question-by-question responses
  - File uploads and OneDrive links
  - Progress tracking
  - Summary and submission

### 3. Principal Review Interface (ScoreCardReview.jsx)
- **Route**: `/scorecard-review`
- **Users**: principal, dean_iqac, admin
- **Features**:
  - Review pending submissions
  - Approve/reject scorecards
  - View detailed responses and documents
  - Add review comments

## Required API Endpoints

### Admin Endpoints (scorecard_admin.py)
```
GET    /api/scorecard/admin/questions          # Get all questions
POST   /api/scorecard/admin/questions          # Create question
PUT    /api/scorecard/admin/questions/{id}     # Update question
DELETE /api/scorecard/admin/questions/{id}     # Delete question
POST   /api/scorecard/admin/questions/reorder  # Reorder questions

GET    /api/scorecard/admin/templates          # Get all templates
POST   /api/scorecard/admin/templates          # Create template
PUT    /api/scorecard/admin/templates/{id}     # Update template
DELETE /api/scorecard/admin/templates/{id}     # Delete template

POST   /api/scorecard/admin/import             # Import questions/templates
GET    /api/scorecard/admin/export             # Export questions/templates

GET    /api/scorecard/admin/statistics         # Get statistics
GET    /api/scorecard/admin/submissions        # Get all submissions
POST   /api/scorecard/admin/submissions/{id}/review  # Review submission
```

### HoD/User Endpoints (scorecard.py)
```
GET    /api/scorecard/templates                # Get available templates
POST   /api/scorecard/submissions              # Create submission
GET    /api/scorecard/submissions/{id}         # Get submission details
PUT    /api/scorecard/submissions/{id}         # Update submission
POST   /api/scorecard/submissions/{id}/submit  # Submit for review

GET    /api/scorecard/responses/{submission_id}  # Get responses
POST   /api/scorecard/responses                  # Create/update response
PUT    /api/scorecard/responses/{id}             # Update response
DELETE /api/scorecard/responses/{id}             # Delete response

POST   /api/scorecard/upload                     # Upload files
```

### File Endpoints
```
GET    /api/files/download/{filename}          # Download uploaded file
```

## Database Schema Requirements

### Core Tables
- `scorecard_questions` - KPI questions with scoring
- `scorecard_templates` - Question templates by year
- `scorecard_submissions` - Department submissions
- `scorecard_responses` - Individual question responses
- `scorecard_files` - Uploaded file metadata

### Key Features
- **Flexible Scoring**: Each question has configurable max_score
- **Multiple Response Types**: numeric, text, boolean
- **Document Support**: OneDrive links, physical docs, file uploads
- **File Management**: 100MB upload limit, physical storage
- **Workflow States**: draft → submitted → approved/rejected

## Component Structure

### ScoreCardAdmin.jsx
```jsx
- Dashboard overview
- Tabbed interface (Questions, Import/Export, Statistics)
- QuestionManager component for CRUD operations
- ImportExportManager for bulk operations
- StatisticsView for analytics
```

### ScoreCardForm.jsx
```jsx
- Template selection
- Question-by-question form
- File upload handling
- Progress tracking
- ScoreCardSummary integration
```

### ScoreCardReview.jsx
```jsx
- Two-panel layout (submissions list + review panel)
- Detailed response viewing
- Approve/reject workflow
- Comment system
```

## Styling
- **ScoreCard.css**: Complete styling for form and summary
- **ScoreCardAdmin.css**: Admin interface styling
- **ScoreCardReview.css**: Review interface styling

## Navigation Integration
- Bootstrap dropdown menu in Header.jsx
- Role-based navigation links
- Active state management

## Permission Matrix
```
Action                    | Admin | Principal | Dean IQAC | PA Principal | HoD
Question Management       |   ✓   |     ✓     |     ✓     |      ✓       |  ✗
Template Management       |   ✓   |     ✓     |     ✓     |      ✓       |  ✗
Submit Scorecard         |   ✗   |     ✗     |     ✗     |      ✗       |  ✓
Review Submissions       |   ✓   |     ✓     |     ✓     |      ✗       |  ✗
View Statistics          |   ✓   |     ✓     |     ✓     |      ✓       |  ✗
```

## Integration Checklist
- [ ] Backend API endpoints implemented
- [ ] Database tables created and populated
- [ ] File upload directory configured (100MB limit)
- [ ] User roles and permissions set up
- [ ] Frontend routes added to App.js
- [ ] Navigation links added to Header.jsx
- [ ] All components properly imported and styled

## Testing Scenarios
1. **Admin Flow**: Create questions → Create template → View statistics
2. **HoD Flow**: Select template → Fill scorecard → Upload files → Submit
3. **Review Flow**: View submissions → Review responses → Approve/reject
4. **File Handling**: Upload files → Download files → OneDrive links
5. **Permissions**: Test role-based access to different interfaces
