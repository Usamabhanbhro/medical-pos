import asyncio
from passlib.context import CryptContext
from mongodb import get_database
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

USERS = [
    {
        "email": "user@gmail.com",
        "password": pwd_context.hash("persona3"),
        "user_type": "salesman"
    },
    {
        "email": "admin@gmail.com",
        "password": pwd_context.hash("persona3"),
        "user_type": "admin"
    }
]

async def seed_users():
    db = get_database()
    for user in USERS:
        existing = await db.users.find_one({"email": user["email"]})
        if not existing:
            await db.users.insert_one(user)
            print(f"Seeded user: {user['email']}")
        else:
            print(f"User already exists: {user['email']}")

if __name__ == "__main__":
    asyncio.run(seed_users())
