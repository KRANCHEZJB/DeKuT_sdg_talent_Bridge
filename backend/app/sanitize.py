import bleach


def clean(value: str) -> str:
    """Strip all HTML tags and dangerous content from a string."""
    if not value:
        return value
    return bleach.clean(value, tags=[], attributes={}, strip=True).strip()


def clean_profile(data: dict) -> dict:
    """Sanitize all string fields in a profile dict."""
    sanitized = {}
    for key, value in data.items():
        if isinstance(value, str):
            sanitized[key] = clean(value)
        elif isinstance(value, list):
            sanitized[key] = [clean(v) if isinstance(v, str) else v for v in value]
        else:
            sanitized[key] = value
    return sanitized
