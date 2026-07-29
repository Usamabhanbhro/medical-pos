from fastapi import APIRouter, HTTPException, Depends, Request, Query, status
from typing import List, Optional
from schemas.user import UserCreate, UserUpdateRequest, UserManagementResponse, UserType
from services.user_management_service import UserManagementService
from services.session_service import SessionService


router = APIRouter()


async def verify_admin(request: Request):
	token = request.cookies.get("access_token")
	if not token:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No token provided")

	payload = await SessionService.validate_session(token)
	if not payload:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")

	if payload.get("user_type") != "admin":
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

	return payload


def get_service() -> UserManagementService:
	return UserManagementService()


@router.get("/", response_model=List[UserManagementResponse])
async def list_users(
	request: Request,
	query: str = Query("", description="Search by email substring", alias="query"),
	user_type: Optional[UserType] = Query(None, description="Filter by user role"),
	limit: int = Query(50, ge=1, le=200, description="Maximum number of users to return"),
	skip: int = Query(0, ge=0, description="Number of users to skip"),
	service: UserManagementService = Depends(get_service),
):
	await verify_admin(request)
	return await service.search_users(query, user_type, limit, skip)


@router.post("/", response_model=UserManagementResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
	user_data: UserCreate,
	request: Request,
	service: UserManagementService = Depends(get_service),
):
	await verify_admin(request)
	try:
		return await service.create_user(user_data)
	except ValueError as exc:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.put("/{user_id}", response_model=UserManagementResponse)
async def update_user(
	user_id: str,
	update_data: UserUpdateRequest,
	request: Request,
	service: UserManagementService = Depends(get_service),
):
	await verify_admin(request)
	try:
		user = await service.update_user(user_id, update_data.dict(exclude_unset=True))
	except ValueError as exc:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
	return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
	user_id: str,
	request: Request,
	service: UserManagementService = Depends(get_service),
):
	await verify_admin(request)
	deleted = await service.delete_user(user_id)
	if not deleted:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
	return None
