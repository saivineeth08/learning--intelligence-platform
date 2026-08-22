import logging
import os
import re
import xml.etree.ElementTree as ET
import zipfile
from typing import Any, Dict, List, Optional

from django.db import transaction
from rest_framework.exceptions import PermissionDenied, ValidationError

from ai.models import DocumentChunk
from resources.models import Resource, ResourceType

logger = logging.getLogger(__name__)


def extract_text_from_file(file_path: str, extension: str) -> str:
    """Extract raw text from a physical file based on its file extension."""
    if not os.path.exists(file_path):
        logger.warning("File not found for extraction: %s", file_path)
        return ""

    ext = extension.lower().strip()

    # Plain text and Markdown
    if ext in [".txt", ".md"]:
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                return f.read()
        except Exception as e:
            logger.error("Error reading text file %s: %s", file_path, str(e))
            return ""

    # PDF documents
    elif ext == ".pdf":
        try:
            from pypdf import PdfReader

            reader = PdfReader(file_path)
            pages_text = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text)
            return "\n\n".join(pages_text)
        except Exception as e:
            logger.error("Error extracting text from PDF %s: %s", file_path, str(e))
            return ""

    # Microsoft Word DOCX (ZIP containing word/document.xml)
    elif ext == ".docx":
        try:
            with zipfile.ZipFile(file_path, "r") as zf:
                if "word/document.xml" not in zf.namelist():
                    return ""
                xml_content = zf.read("word/document.xml")
                root = ET.fromstring(xml_content)
                namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                
                paragraphs = []
                for p in root.findall(".//w:p", namespaces):
                    texts = [node.text for node in p.findall(".//w:t", namespaces) if node.text]
                    if texts:
                        paragraphs.append("".join(texts))
                return "\n\n".join(paragraphs)
        except Exception as e:
            logger.error("Error extracting text from DOCX %s: %s", file_path, str(e))
            return ""

    # Legacy .doc binary or Image files (.png, .jpg, .jpeg)
    # OCR is not enabled in Step 1 foundation; return empty text gracefully
    elif ext in [".doc", ".png", ".jpg", ".jpeg"]:
        logger.info("Direct text extraction not available for format %s without OCR.", ext)
        return ""

    else:
        logger.warning("Unsupported file extension for text extraction: %s", ext)
        return ""


def extract_text(resource: Resource) -> str:
    """Extract raw text content from a Resource model instance."""
    if resource.resource_type == ResourceType.LINK:
        # For URL links, fallback to title and description
        parts = []
        if resource.title:
            parts.append(resource.title)
        if resource.description:
            parts.append(resource.description)
        return "\n\n".join(parts)

    if resource.resource_type == ResourceType.FILE and resource.file:
        file_path = resource.file.path
        _, ext = os.path.splitext(resource.file.name)
        return extract_text_from_file(file_path, ext)

    return ""


def clean_text(text: str) -> str:
    """Clean and normalize extracted raw text deterministically."""
    if not text:
        return ""

    # Normalize line endings
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")

    # Replace non-breaking spaces and tabs
    normalized = normalized.replace("\xa0", " ").replace("\t", "    ")

    # Clean line by line
    lines = [line.strip() for line in normalized.split("\n")]
    joined = "\n".join(lines)

    # Collapse 3 or more consecutive newlines to 2
    joined = re.sub(r"\n{3,}", "\n\n", joined)

    # Collapse multiple consecutive horizontal spaces to one
    joined = re.sub(r"[ ]{2,}", " ", joined)

    return joined.strip()


def chunk_text(
    text: str, chunk_size: int = 500, overlap: Optional[int] = None
) -> List[str]:
    """Deterministically partition text into overlapping chunks without losing content."""
    if not text:
        return []

    cleaned = text.strip()
    if not cleaned:
        return []

    if chunk_size <= 0:
        raise ValueError("chunk_size must be a positive integer.")

    if overlap is None:
        overlap = min(100, chunk_size // 5)

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be non-negative and strictly less than chunk_size.")

    if len(cleaned) <= chunk_size:
        return [cleaned]

    chunks = []
    step = chunk_size - overlap
    start = 0
    text_len = len(cleaned)

    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk = cleaned[start:end]

        # If not the end of text, attempt to break cleanly at sentence or word boundaries
        if end < text_len:
            # Look for sentence boundary (.!?) near end (last 40 chars)
            boundary_found = False
            search_window = chunk[-40:]
            sentence_match = re.search(r"([.!?]\s+)", search_window)
            if sentence_match:
                split_offset = chunk.rfind(sentence_match.group(1)) + len(sentence_match.group(1))
                if split_offset > overlap:
                    chunk = chunk[:split_offset]
                    end = start + split_offset
                    boundary_found = True

            # If no sentence boundary, try word boundary (space/newline)
            if not boundary_found:
                space_idx = chunk.rfind(" ")
                if space_idx > overlap:
                    chunk = chunk[:space_idx]
                    end = start + space_idx

        chunk_str = chunk.strip()
        if chunk_str:
            chunks.append(chunk_str)

        start += step
        # Prevent any infinite loop in edge cases
        if start >= end and start < text_len:
            start = end

    return chunks


def index_resource(
    resource: Resource,
    request_user: Optional[Any] = None,
    chunk_size: int = 500,
    overlap: int = 100,
) -> Dict[str, Any]:
    """Extract, clean, chunk, and idempotently persist DocumentChunk records for a Resource."""
    if request_user is not None and resource.user_id != request_user.id:
        raise PermissionDenied("You do not have permission to index this resource.")

    raw_text = extract_text(resource)
    cleaned = clean_text(raw_text)
    chunks = chunk_text(cleaned, chunk_size=chunk_size, overlap=overlap)

    with transaction.atomic():
        # Clean up any pre-existing chunks for this resource
        DocumentChunk.objects.filter(resource=resource).delete()

        chunk_objects = [
            DocumentChunk(
                resource=resource,
                user=resource.user,
                chunk_index=i,
                content=content,
            )
            for i, content in enumerate(chunks)
        ]

        if chunk_objects:
            DocumentChunk.objects.bulk_create(chunk_objects)

    logger.info(
        "Resource %s indexed successfully: %d chunks created.",
        resource.id,
        len(chunk_objects),
    )

    return {
        "resource_id": resource.id,
        "user_id": resource.user_id,
        "total_chunks": len(chunk_objects),
        "text_length": len(cleaned),
        "status": "indexed",
    }
