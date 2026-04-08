import uuid
from datetime import UTC, datetime

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CompetitionPrice, MollieConfig, Payment, SepaMandate
from app.logging_config import get_logger
from app.services.encryption import get_encryption_service

logger = get_logger("mollie")


class MollieService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def mask_iban(self, encrypted_iban: str) -> str:
        encryption = get_encryption_service()
        try:
            iban = encryption.decrypt(encrypted_iban)
        except (ValueError, Exception):
            # If not encrypted, use as is (might be already masked or plaintext)
            iban = encrypted_iban

        if len(iban) > 4:
            return "****" + iban[-4:]
        return iban

    async def get_config(self) -> MollieConfig | None:
        result = await self.db.execute(select(MollieConfig))
        return result.scalar_one_or_none()

    async def get_api_key(self) -> str | None:
        config = await self.get_config()
        if not config:
            return None
        encryption = get_encryption_service()
        return encryption.decrypt(config.api_key)

    async def save_config(self, api_key: str) -> MollieConfig:
        encryption = get_encryption_service()
        encrypted_key = encryption.encrypt(api_key)
        existing = await self.get_config()
        if existing:
            existing.api_key = encrypted_key
            existing.updated_at = datetime.now(UTC)
        else:
            existing = MollieConfig(api_key=encrypted_key)
            self.db.add(existing)
        await self.db.commit()
        await self.db.refresh(existing)
        return existing

    async def create_mandate(
        self,
        club_id: uuid.UUID,
        club_name: str,
        iban: str,
        consumer_name: str,
    ) -> dict:
        logger.info("creating_mandate", club_id=str(club_id), club_name=club_name)
        api_key = await self.get_api_key()
        if not api_key:
            logger.error("mollie_not_configured")
            raise ValueError("Mollie not configured")

        mandate_ref = f"CLUB-{club_id.hex[:8].upper()}"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        mandate_data = {
            "mode": "live",
            "consumerName": consumer_name,
            "consumerAccount": iban,
            "consumerReference": mandate_ref,
            "signatureDate": datetime.now(UTC).date().isoformat(),
            "sequenceType": "recurring",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.mollie.com/v2/mandates",
                json=mandate_data,
                headers=headers,
            )

        if response.status_code not in (201, 200):
            logger.error(
                "mollie_mandate_creation_failed",
                status_code=response.status_code,
                response=response.text[:200],
            )
            raise ValueError(f"Mollie mandate creation failed: {response.text}")

        mollie_data = response.json()

        encryption = get_encryption_service()
        encrypted_iban = encryption.encrypt(iban)

        mandate = SepaMandate(
            club_id=club_id,
            mollie_mandate_id=mollie_data["id"],
            mandate_reference=mandate_ref,
            consumer_name=consumer_name,
            iban=encrypted_iban,
            status="pending",
        )
        self.db.add(mandate)
        await self.db.commit()
        await self.db.refresh(mandate)

        return {
            "mandate_id": str(mandate.id),
            "mollie_mandate_id": mollie_data["id"],
            "status": "pending",
        }

    async def check_mandate_status(self, mandate_id: uuid.UUID) -> dict:
        api_key = await self.get_api_key()
        if not api_key:
            raise ValueError("Mollie not configured")

        result = await self.db.execute(select(SepaMandate).where(SepaMandate.id == mandate_id))
        mandate = result.scalar_one_or_none()
        if not mandate:
            raise ValueError("Mandate not found")

        headers = {"Authorization": f"Bearer {api_key}"}

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.mollie.com/v2/mandates/{mandate.mollie_mandate_id}",
                headers=headers,
            )

        if response.status_code != 200:
            raise ValueError(f"Mollie mandate check failed: {response.text}")

        mollie_data = response.json()
        status_map = {
            "pending": "pending",
            "valid": "active",
            "revoked": "revoked",
            "expired": "expired",
        }
        new_status = status_map.get(mollie_data.get("status"), "pending")

        if new_status != mandate.status:
            mandate.status = new_status
            if new_status == "active":
                mandate.signed_at = datetime.now(UTC)
            mandate.updated_at = datetime.now(UTC)
            await self.db.commit()

        return {
            "status": new_status,
            "signed_at": mandate.signed_at.isoformat() if mandate.signed_at else None,
        }

    async def create_payment(
        self,
        club_id: uuid.UUID,
        mandate_id: uuid.UUID,
        competitie_naam: str,
        amount: int,
        webhook_url: str,
    ) -> dict:
        logger.info(
            "creating_payment", club_id=str(club_id), competitie_naam=competitie_naam, amount=amount
        )
        api_key = await self.get_api_key()
        if not api_key:
            logger.error("mollie_not_configured")
            raise ValueError("Mollie not configured")

        result = await self.db.execute(select(SepaMandate).where(SepaMandate.id == mandate_id))
        mandate = result.scalar_one_or_none()
        if not mandate or mandate.status != "active":
            raise ValueError("Active mandate required")

        result = await self.db.execute(
            select(Payment).where(
                Payment.club_id == club_id,
                Payment.competitie_naam == competitie_naam,
                Payment.status == "paid",
            )
        )
        existing_payment = result.scalar_one_or_none()
        if existing_payment:
            raise ValueError("Already paid for this competition")

        payment = Payment(
            club_id=club_id,
            mandate_id=mandate_id,
            competitie_naam=competitie_naam,
            amount=amount,
            status="pending",
        )
        self.db.add(payment)
        await self.db.commit()
        await self.db.refresh(payment)

        payment_data = {
            "amount": {
                "value": f"{amount / 100:.2f}",
                "currency": "EUR",
            },
            "customerId": mandate.mollie_mandate_id.split("_")[0],
            "mandateId": mandate.mollie_mandate_id,
            "description": f"Competitie Planner - {competitie_naam}",
            "webhookUrl": webhook_url,
            "sequenceType": "recurring",
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.mollie.com/v2/payments",
                json=payment_data,
                headers=headers,
            )

        if response.status_code not in (201, 200):
            payment.status = "failed"
            await self.db.commit()
            raise ValueError(f"Mollie payment creation failed: {response.text}")

        mollie_data = response.json()

        payment.mollie_payment_id = mollie_data["id"]
        payment.mollie_payment_status = mollie_data["status"]
        if mollie_data["status"] == "paid":
            payment.status = "paid"
            payment.paid_at = datetime.now(UTC)
        await self.db.commit()
        await self.db.refresh(payment)

        return {
            "payment_id": str(payment.id),
            "mollie_payment_id": mollie_data["id"],
            "status": payment.status,
        }

    async def handle_webhook(self, payment_id: str) -> dict:
        api_key = await self.get_api_key()
        if not api_key:
            raise ValueError("Mollie not configured")

        headers = {"Authorization": f"Bearer {api_key}"}

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.mollie.com/v2/payments/{payment_id}",
                headers=headers,
            )

        if response.status_code != 200:
            raise ValueError(f"Mollie webhook check failed: {response.text}")

        mollie_data = response.json()

        result = await self.db.execute(
            select(Payment).where(Payment.mollie_payment_id == payment_id)
        )
        payment = result.scalar_one_or_none()
        if not payment:
            raise ValueError("Payment not found")

        payment.mollie_payment_status = mollie_data["status"]
        if mollie_data["status"] == "paid":
            payment.status = "paid"
            payment.paid_at = datetime.now(UTC)
        elif mollie_data["status"] in ("failed", "expired", "canceled"):
            payment.status = "failed"
        await self.db.commit()

        return {"status": payment.status}

    async def get_prices(self) -> list[CompetitionPrice]:
        result = await self.db.execute(select(CompetitionPrice))
        return list(result.scalars().all())

    async def get_price(self, competitie_naam: str) -> CompetitionPrice | None:
        result = await self.db.execute(
            select(CompetitionPrice).where(CompetitionPrice.competitie_naam == competitie_naam)
        )
        return result.scalar_one_or_none()

    async def save_price(
        self,
        competitie_naam: str,
        price_small_club: int,
        price_large_club: int,
    ) -> CompetitionPrice:
        existing = await self.get_price(competitie_naam)
        if existing:
            existing.price_small_club = price_small_club
            existing.price_large_club = price_large_club
            existing.updated_at = datetime.now(UTC)
        else:
            existing = CompetitionPrice(
                competitie_naam=competitie_naam,
                price_small_club=price_small_club,
                price_large_club=price_large_club,
            )
            self.db.add(existing)
        await self.db.commit()
        await self.db.refresh(existing)
        return existing

    async def get_club_payments(self, club_id: uuid.UUID) -> list[Payment]:
        result = await self.db.execute(
            select(Payment).where(Payment.club_id == club_id).order_by(Payment.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_club_mandate(self, club_id: uuid.UUID) -> SepaMandate | None:
        result = await self.db.execute(
            select(SepaMandate)
            .where(SepaMandate.club_id == club_id)
            .order_by(SepaMandate.created_at.desc())
        )
        return result.scalars().first()

    async def is_competitie_paid(self, club_id: uuid.UUID, competitie_naam: str) -> bool:
        result = await self.db.execute(
            select(Payment).where(
                Payment.club_id == club_id,
                Payment.competitie_naam == competitie_naam,
                Payment.status == "paid",
            )
        )
        return result.scalar_one_or_none() is not None

    async def get_payment_status_for_competitie(
        self, club_id: uuid.UUID, competitie_naam: str
    ) -> dict:
        result = await self.db.execute(
            select(Payment).where(
                Payment.club_id == club_id,
                Payment.competitie_naam == competitie_naam,
            )
        )
        payment = result.scalar_one_or_none()
        if not payment:
            return {"status": "unpaid", "paid_at": None}
        return {
            "status": payment.status,
            "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
            "amount": payment.amount,
        }
