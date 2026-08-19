from .base import *  # noqa: F403
from .base import env_bool

DEBUG = env_bool("DEBUG", default=True)

REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
]
