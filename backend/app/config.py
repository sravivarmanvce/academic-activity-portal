# app/config.py

import os
from pathlib import Path

# Document upload settings
UPLOAD_DIRECTORY = Path(os.getenv("UPLOAD_DIRECTORY", "uploads"))
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 10 * 1024 * 1024))  # 10MB default
ALLOWED_EXTENSIONS = {
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'jpg', 'jpeg', 'png', 'gif', 'txt', 'rtf'
}

# Ensure upload directory exists
UPLOAD_DIRECTORY.mkdir(exist_ok=True)

# Document types
DOCUMENT_TYPES = {
    'event_proposal': 'Event Proposal',
    'budget_document': 'Budget Document',
    'receipt': 'Receipt',
    'report': 'Report',
    'approval_letter': 'Approval Letter',
    'certificate': 'Certificate',
    'invoice': 'Invoice',
    'other': 'Other'
}

# Document status
DOCUMENT_STATUS = {
    'pending': 'Pending Approval',
    'approved': 'Approved',
    'rejected': 'Rejected'
}
