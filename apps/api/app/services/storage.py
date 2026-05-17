"""Local filesystem storage — replaces S3/MinIO."""
import pathlib

from app.core.config import settings


def _path(key: str) -> pathlib.Path:
    p = pathlib.Path(settings.FILES_ROOT) / key
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def put_object(key: str, body: bytes, content_type: str = "application/octet-stream") -> None:
    _path(key).write_bytes(body)


def object_exists(key: str) -> bool:
    return _path(key).exists()


def delete_object(key: str) -> None:
    try:
        _path(key).unlink()
    except FileNotFoundError:
        pass


def get_file_path(key: str) -> pathlib.Path:
    return pathlib.Path(settings.FILES_ROOT) / key
