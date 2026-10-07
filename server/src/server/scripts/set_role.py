"""Grant or revoke the admin role for a Supabase user.

Usage:
    uv run python -m server.scripts.set_role someone@example.com admin
    uv run python -m server.scripts.set_role someone@example.com user

The user must sign in again (or wait for their token to refresh)
before the frontend sees the new role.
"""

import sys

from server.storage.supabase import supabase

ROLES = ("admin", "user")
PAGE_SIZE = 200


def find_user_by_email(email: str):
    page = 1

    while True:
        users = supabase.auth.admin.list_users(page=page, per_page=PAGE_SIZE)

        for user in users:
            if (user.email or "").lower() == email.lower():
                return user

        if len(users) < PAGE_SIZE:
            return None

        page += 1


def main() -> None:
    if len(sys.argv) != 3 or sys.argv[2] not in ROLES:
        print(__doc__)
        sys.exit(1)

    email, role = sys.argv[1], sys.argv[2]
    user = find_user_by_email(email)

    if user is None:
        print(f"No user found with email {email}. Sign up in the app first.")
        sys.exit(1)

    app_metadata = {**(user.app_metadata or {}), "role": role}

    supabase.auth.admin.update_user_by_id(
        user.id,
        {"app_metadata": app_metadata},
    )

    print(f"{email} is now '{role}'.")


if __name__ == "__main__":
    main()
