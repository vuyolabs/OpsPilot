"""Run a SQL file against DATABASE_URL in a single transaction.

Usage:
    uv run python -m server.scripts.apply_sql sql/conversations.sql
"""

import asyncio
import selectors
import sys
from pathlib import Path

from server.core.database import engine


async def apply(path: Path) -> None:
    sql = path.read_text(encoding="utf-8")

    async with engine.begin() as connection:
        # exec_driver_sql runs the file as-is, multiple statements included.
        await connection.exec_driver_sql(sql)

    await engine.dispose()


def main() -> None:
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)

    path = Path(sys.argv[1])

    # psycopg's async mode doesn't support Windows' default Proactor loop.
    asyncio.run(
        apply(path),
        loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
    )

    print(f"Applied {path}")


if __name__ == "__main__":
    main()
