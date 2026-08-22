import os
from rest_framework.exceptions import ValidationError

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".txt",
    ".docx",
    ".doc",
    ".png",
    ".jpg",
    ".jpeg",
    ".md",
}


def validate_resource_file(file_obj):
    """Validate uploaded file size and extension for learning resources."""
    if not file_obj:
        return

    # Check file size
    if file_obj.size > MAX_FILE_SIZE_BYTES:
        raise ValidationError(
            f"File size exceeds the maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."
        )

    # Check file extension
    ext = os.path.splitext(file_obj.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}."
        )
