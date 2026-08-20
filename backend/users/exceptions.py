from rest_framework import status
from rest_framework.exceptions import APIException


class InvalidCredentialsError(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Invalid credentials."
    default_code = "invalid_credentials"


class IncorrectPasswordError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Current password is incorrect."
    default_code = "incorrect_password"


class TokenOwnershipError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Refresh token does not belong to the authenticated user."
    default_code = "token_ownership"
