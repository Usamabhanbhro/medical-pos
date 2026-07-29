import warnings
warnings.filterwarnings("ignore", category=UserWarning)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import session, user_management
from db.mongodb import init_db
from contextlib import asynccontextmanager

def create_app():
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await init_db()
        yield

    app = FastAPI(lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000",
                       "http://localhost:5173",
                       "https://localhost:3000",
                       "https://truckdispatch.cloud",
                       "https://143.198.209.44.sslip.io"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # app.include_router(user.router, prefix="/api/user")
    app.include_router(session.router, prefix="/api/session")
    # Items router for admin-managed medical tests
    from routes import items as items_router
    app.include_router(items_router.router, prefix="/api/items")
    # Sales router for checkout/sale creation
    from routes import sales as sales_router
    app.include_router(sales_router.router, prefix="/api/sales")
    # Doctors router for doctor management
    from routes import doctors as doctors_router
    app.include_router(doctors_router.router, prefix="/api/doctors")
    app.include_router(user_management.router, prefix="/api/admin/users")
    # User profile router for user settings
    from routes import user_profile as user_profile_router
    app.include_router(user_profile_router.router)
    # Store router for store name/address
    from routes import store as store_router
    app.include_router(store_router.router, prefix="/api/store")
    # Ledger router for expense tracking
    from routes import ledger as ledger_router
    app.include_router(ledger_router.router)

    @app.get("/")
    def read_root():
        return {"message": "Welcome to the Medical POS API"}

    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)