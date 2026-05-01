"""
File: backend/app/routers/payments.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Club, Payment, SepaMandate
from app.routers.auth import get_current_superadmin
from app.services.mollie import MollieService
from app.services.tenant_auth import get_current_tenant_admin, get_current_tenant_user

router = APIRouter(prefix="/payments", tags=["payments"])
CURRENT_TENANT_DEP = Depends(get_current_tenant_user)
CURRENT_ADMIN_DEP = Depends(get_current_tenant_admin)
CURRENT_SUPERADMIN_DEP = Depends(get_current_superadmin)


class MollieConfigUpdate(BaseModel):
    api_key: str


class CompetitionPriceUpdate(BaseModel):
    competitie_naam: str
    price_small_club: int
    price_large_club: int


class MandateCreate(BaseModel):
    iban: str
    consumer_name: str


class PaymentCreate(BaseModel):
    competitie_naam: str


@router.get("/config")
async def get_mollie_config(
    current: tuple = CURRENT_SUPERADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = MollieService(db)
    config = await service.get_config()
    masked_key = None
    if config and config.api_key:
        try:
            api_key = await service.get_api_key()
            if api_key and len(api_key) > 8:
                masked_key = f"{api_key[:5]}***{api_key[-3:]}"
            elif api_key:
                masked_key = "***"
        except ValueError:
            masked_key = "invalid"
    return {
        "configured": config is not None,
        "api_key": masked_key,
    }


@router.post("/config")
async def save_mollie_config(
    data: MollieConfigUpdate,
    current: tuple = CURRENT_SUPERADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not (data.api_key.startswith("live_") or data.api_key.startswith("test_")):
        raise HTTPException(
            status_code=400,
            detail="Invalid API key format. Must start with 'live_' or 'test_'",
        )
    service = MollieService(db)
    await service.save_config(data.api_key)
    return {"message": "Mollie configuration saved"}


@router.get("/prices")
async def list_prices(
    current: tuple = CURRENT_SUPERADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = MollieService(db)
    prices = await service.get_prices()
    return {
        "prices": [
            {
                "id": str(p.id),
                "competitie_naam": p.competitie_naam,
                "price_small_club": p.price_small_club,
                "price_large_club": p.price_large_club,
            }
            for p in prices
        ]
    }


@router.post("/prices")
async def save_price(
    data: CompetitionPriceUpdate,
    current: tuple = CURRENT_SUPERADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = MollieService(db)
    price = await service.save_price(
        data.competitie_naam, data.price_small_club, data.price_large_club
    )
    return {
        "id": str(price.id),
        "competitie_naam": price.competitie_naam,
        "price_small_club": price.price_small_club,
        "price_large_club": price.price_large_club,
    }


@router.get("/mandates")
async def list_all_mandates(
    current: tuple = CURRENT_SUPERADMIN_DEP,
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
) -> dict:
    service = MollieService(db)
    result = await db.execute(
        select(SepaMandate).order_by(SepaMandate.created_at.desc()).offset(skip).limit(limit)
    )
    mandates = result.scalars().all()
    total_result = await db.execute(select(func.count()).select_from(SepaMandate))
    total = total_result.scalar()
    mandate_data = []
    for m in mandates:
        club_result = await db.execute(select(Club).where(Club.id == m.club_id))
        club = club_result.scalar_one_or_none()
        payments_result = await db.execute(select(Payment).where(Payment.mandate_id == m.id))
        payments = payments_result.scalars().all()
        mandate_data.append(
            {
                "id": str(m.id),
                "club_id": str(m.club_id),
                "club_name": club.naam if club else "Unknown",
                "mollie_mandate_id": m.mollie_mandate_id,
                "mandate_reference": m.mandate_reference,
                "consumer_name": m.consumer_name,
                "iban": service.mask_iban(m.iban),
                "status": m.status,
                "signed_at": m.signed_at.isoformat() if m.signed_at else None,
                "created_at": m.created_at.isoformat(),
                "payments": [
                    {
                        "id": str(p.id),
                        "competitie_naam": p.competitie_naam,
                        "amount": p.amount,
                        "status": p.status,
                        "paid_at": p.paid_at.isoformat() if p.paid_at else None,
                    }
                    for p in payments
                ],
            }
        )
    return {"mandates": mandate_data, "total": total}


@router.get("/mandates/{mandate_club_id}")
async def get_club_mandate(
    mandate_club_id: str,
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    _, club = current
    if str(club.id) != mandate_club_id:
        raise HTTPException(status_code=403, detail="Access denied")
    service = MollieService(db)
    mandate = await service.get_club_mandate(club.id)
    if not mandate:
        return {"has_mandate": False}
    payments = await service.get_club_payments(club.id)
    return {
        "has_mandate": True,
        "mandate": {
            "id": str(mandate.id),
            "status": mandate.status,
            "signed_at": mandate.signed_at.isoformat() if mandate.signed_at else None,
        },
        "payments": [
            {
                "id": str(p.id),
                "competitie_naam": p.competitie_naam,
                "amount": p.amount,
                "status": p.status,
                "paid_at": p.paid_at.isoformat() if p.paid_at else None,
            }
            for p in payments
        ],
    }


@router.post("/mandates")
async def create_mandate(
    data: MandateCreate,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    service = MollieService(db)
    existing = await service.get_club_mandate(club.id)
    if existing and existing.status == "active":
        raise HTTPException(status_code=400, detail="Mandate already exists")
    try:
        result = await service.create_mandate(
            club_id=club.id,
            club_name=club.naam,
            iban=data.iban,
            consumer_name=data.consumer_name,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/mandates/{mandate_id}/verify")
async def verify_mandate(
    mandate_id: str,
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    _, club = current
    service = MollieService(db)
    try:
        result = await service.check_mandate_status(UUID(mandate_id))
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/payments")
async def create_payment(
    data: PaymentCreate,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
    webhook_url: str = Query(...),
) -> dict:
    user, club = current
    service = MollieService(db)
    mandate = await service.get_club_mandate(club.id)
    if not mandate or mandate.status != "active":
        raise HTTPException(status_code=400, detail="Active mandate required")
    price = await service.get_price(data.competitie_naam)
    if not price:
        raise HTTPException(status_code=400, detail="Price not configured for this competition")
    amount = price.price_large_club if club.max_banen > 7 else price.price_small_club
    try:
        result = await service.create_payment(
            club_id=club.id,
            mandate_id=mandate.id,
            competitie_naam=data.competitie_naam,
            amount=amount,
            webhook_url=webhook_url,
        )
        logger = structlog.get_logger()
        logger.info(
            "payment_created",
            club_id=str(club.id),
            competitie_naam=data.competitie_naam,
            amount=amount,
            payment_id=result.get("payment_id"),
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def mollie_webhook(
    payment_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = MollieService(db)
    try:
        result = await service.handle_webhook(payment_id)
        logger = structlog.get_logger()
        logger.info(
            "payment_webhook_received",
            payment_id=payment_id,
            status=result.get("status"),
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/checkout-status")
async def get_checkout_status(
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    service = MollieService(db)
    mandate = await service.get_club_mandate(club.id)
    payments = await service.get_club_payments(club.id)
    has_active_mandate = bool(mandate and mandate.status == "active")
    paid_competitions = {p.competitie_naam for p in payments if p.status == "paid"}
    return {
        "has_active_mandate": has_active_mandate,
        "paid_competitions": list(paid_competitions),
        "mandate_status": mandate.status if mandate else None,
        "iban": service.mask_iban(mandate.iban) if mandate else None,
        "is_sponsored": club.is_sponsored,
    }


class PaymentStatusResponse(BaseModel):
    competitie_naam: str
    status: str
    paid_at: str | None
    amount: int | None


@router.get("/payment-status", response_model=list[PaymentStatusResponse])
async def get_payment_status(
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    user, club = current
    from sqlalchemy import select

    from app.models import Competitie

    result = await db.execute(
        select(Competitie).where(Competitie.club_id == club.id, Competitie.actief)
    )
    competities = result.scalars().all()
    service = MollieService(db)
    payments = await service.get_club_payments(club.id)
    payment_by_competitie = {p.competitie_naam: p for p in payments}
    result_list = []
    for c in competities:
        payment = payment_by_competitie.get(c.naam)
        if payment:
            result_list.append(
                PaymentStatusResponse(
                    competitie_naam=c.naam,
                    status=payment.status,
                    paid_at=payment.paid_at.isoformat() if payment.paid_at else None,
                    amount=payment.amount,
                )
            )
        else:
            result_list.append(
                PaymentStatusResponse(
                    competitie_naam=c.naam,
                    status="unpaid",
                    paid_at=None,
                    amount=None,
                )
            )
    return result_list
