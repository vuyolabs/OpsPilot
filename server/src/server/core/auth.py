import asyncio
import logging
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from server.storage.supabase import supabase

logger = logging.getLogger(__name__)

ADMIN_ROLE = "admin"

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None
    role: str

    @property
    def is_admin(self) -> bool:
        return self.role == ADMIN_ROLE


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    # Supabase verifies the token's signature and expiry for us.
    try:
        response = await asyncio.to_thread(
            supabase.auth.get_user,
            credentials.credentials,
        )
    except Exception:
        logger.info("Rejected an invalid or expired access token")
        raise unauthorized

    user = response.user if response else None

    if user is None:
        raise unauthorized

    # app_metadata can only be changed with the secret key, so users
    # cannot grant themselves the admin role.
    role = (user.app_metadata or {}).get("role", "user")

    return CurrentUser(
        id=user.id,
        email=user.email,
        role=role,
    )


async def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    # Anonymous and non-admin callers get the same 404 as an unknown
    # route, so admin endpoints are invisible to everyone else.
    not_found = HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Not Found",
    )

    try:
        user = await get_current_user(credentials)
    except HTTPException:
        raise not_found

    if not user.is_admin:
        raise not_found

    return user
