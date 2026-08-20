from rest_framework.exceptions import ErrorDetail
from rest_framework.views import exception_handler


def _contains_unique_error(data):
    if isinstance(data, ErrorDetail):
        return data.code == "unique"
    if isinstance(data, dict):
        return any(_contains_unique_error(value) for value in data.values())
    if isinstance(data, list):
        return any(_contains_unique_error(value) for value in data)
    return False


def api_exception_handler(exc, context):
    """Map uniqueness conflicts to HTTP 409 while keeping DRF error shapes."""
    response = exception_handler(exc, context)
    if response is not None and response.status_code == 400 and _contains_unique_error(
        response.data
    ):
        response.status_code = 409
    return response
