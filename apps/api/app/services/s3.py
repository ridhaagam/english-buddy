"""S3 / MinIO object storage service."""
import boto3
from botocore.exceptions import ClientError

from app.core.config import settings


def _client():
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name="us-east-1",
        config=boto3.session.Config(signature_version="s3v4"),
    )


def put_object(key: str, body: bytes, content_type: str = "application/octet-stream") -> None:
    _client().put_object(
        Bucket=settings.S3_BUCKET,
        Key=key,
        Body=body,
        ContentType=content_type,
    )


def get_presigned_download(key: str, expires: int = 3600) -> str:
    url = _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET, "Key": key},
        ExpiresIn=expires,
    )
    # Rewrite internal Docker hostname to public-facing URL for browser access
    if settings.S3_PUBLIC_ENDPOINT != settings.S3_ENDPOINT:
        url = url.replace(settings.S3_ENDPOINT, settings.S3_PUBLIC_ENDPOINT, 1)
    return url


def delete_object(key: str) -> None:
    try:
        _client().delete_object(Bucket=settings.S3_BUCKET, Key=key)
    except ClientError:
        pass


def object_exists(key: str) -> bool:
    try:
        _client().head_object(Bucket=settings.S3_BUCKET, Key=key)
        return True
    except ClientError:
        return False
