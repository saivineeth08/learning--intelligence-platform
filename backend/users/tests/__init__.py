from users.models import User

VALID_PASSWORD = "StrongPassword123!"
NEW_PASSWORD = "AnotherStrongPass456!"


def registration_payload(**overrides):
    payload = {
        "username": "saivineeth",
        "email": "user@example.com",
        "first_name": "Sai",
        "last_name": "Vineeth",
        "password": VALID_PASSWORD,
        "password_confirm": VALID_PASSWORD,
    }
    payload.update(overrides)
    return payload


def create_user(**overrides):
    defaults = {
        "username": "saivineeth",
        "email": "user@example.com",
        "password": VALID_PASSWORD,
        "first_name": "Sai",
        "last_name": "Vineeth",
    }
    defaults.update(overrides)
    password = defaults.pop("password")
    return User.objects.create_user(password=password, **defaults)


def auth_header(access_token):
    return {"HTTP_AUTHORIZATION": f"Bearer {access_token}"}
