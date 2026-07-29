import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pymongo.collation import Collation

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_ATLAS_URL")
DB_NAME = os.getenv("MONGODB_DB_NAME", "medical_pos")

# Connection pooling with optimized settings for performance
client = AsyncIOMotorClient(
    MONGODB_URL,
    maxPoolSize=10,
    minPoolSize=1,
    maxIdleTimeMS=30000,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    socketTimeoutMS=20000,
)
db = client[DB_NAME]

async def init_db():
    """Initialize database with indexes for better performance"""
    # Create index on email field for fast lookups
    await db.users.create_index("email", unique=True)
    
    # Create indexes for sessions collection
    await db.sessions.create_index("user_id")
    await db.sessions.create_index("token", unique=True)
    await db.sessions.create_index("expires_at")
    await db.sessions.create_index([("user_id", 1), ("is_active", 1)])

    # Ensure items have a case-insensitive unique name
    # We use a collation with strength=2 so casing is ignored ("Test" == "test").
    await db.items.create_index(
        "name",
        unique=True,
        collation=Collation(locale="en", strength=2),
    )
    # Ensure sales have unique sale_id
    await db.sales.create_index("sale_id", unique=True)
    
    print("Database initialized with indexes for users, sessions and items")


def get_database():
    return db

