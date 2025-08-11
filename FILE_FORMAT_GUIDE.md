# Document Upload File Format Guide

## 📄 Supported File Formats

### Event Reports
The system now supports multiple formats for event reports:

| Format | Extension | MIME Type | Description |
|--------|-----------|-----------|-------------|
| **PDF** | `.pdf` | `application/pdf` | Portable Document Format (Recommended) |
| **Microsoft Word (Legacy)** | `.doc` | `application/msword` | Word 97-2003 Document |  
| **Microsoft Word (Modern)** | `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Word 2007+ Document |

### Supporting Documents
Only ZIP archives are supported for supporting documents:

| Format | Extension | MIME Type | Description |
|--------|-----------|-----------|-------------|
| **ZIP Archive** | `.zip` | `application/zip` | Compressed archive containing supporting files |

## 🔧 Technical Implementation

### Frontend Validation
```javascript
// File input accepts multiple report formats
<input 
  type="file" 
  accept=".pdf,.doc,.docx" 
  onChange={handleReportUpload}
/>
```

### Backend Validation
The API endpoint validates file types before processing:

```python
# Allowed report extensions
allowed_report_types = ['.pdf', '.doc', '.docx']

# MIME type validation for reports
allowed_mime_types = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
```

### Database Constraints
PostgreSQL constraints ensure data integrity:

```sql
-- Ensure valid MIME types for reports
ALTER TABLE documents ADD CONSTRAINT check_report_mime_types
    CHECK (
        (document_type != 'complete_report') OR
        (document_type = 'complete_report' AND (
            mime_type IN (
                'application/pdf',
                'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/octet-stream'
            ) OR
            filename ~* '\.(pdf|doc|docx)$'
        ))
    );
```

## 📋 Usage Guidelines

### For HoDs (Head of Departments)
1. **Report Format**: Choose PDF for best compatibility, DOC/DOCX for editable documents
2. **File Size**: Keep report files under 10MB for optimal performance
3. **Naming**: Use descriptive filenames (e.g., "Annual_Conference_2024_Report.pdf")

### For Principals
- All report formats are downloadable and viewable
- Approval/rejection process works regardless of report format
- Rejection comments help guide format preferences if needed

## ⚠️ Important Notes

1. **File Size Limits**: Recommend max 10MB per file for performance
2. **Security**: All uploads are scanned and validated server-side
3. **Version Control**: Document versioning tracks all format changes
4. **Backward Compatibility**: Existing PDF-only workflows continue to work

## 🚀 Future Enhancements

Potential future additions:
- Support for other document formats (RTF, ODT)
- Automatic PDF conversion for DOC/DOCX files
- Document preview functionality for all formats
- Bulk upload capabilities
