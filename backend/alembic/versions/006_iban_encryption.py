"""iban encryption

Revision ID: 006_iban_encryption
Revises: 005_tijdslot_config
Create Date: 2026-04-06

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import base64
from cryptography.fernet import Fernet
import os

# Try to import settings, otherwise use environment
try:
    from app.config import settings
    ENCRYPTION_KEY = settings.ENCRYPTION_KEY
except ImportError:
    ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

revision: str = "006_iban_encryption"
down_revision: Union[str, None] = "005_tijdslot_config"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def get_fernet(key: str):
    if not key or len(key) < 32:
        # Standard logic from EncryptionService
        key_str = (key or "").ljust(32)[:32].encode()
    else:
        key_str = key[:32].encode()
        
    encoded_key = base64.urlsafe_b64encode(key_str)
    return Fernet(encoded_key)


def upgrade() -> None:
    # 1. Update column length
    op.alter_column('sepa_mandates', 'iban',
               existing_type=sa.String(length=34),
               type_=sa.String(length=255),
               existing_nullable=False)

    # 2. Encrypt existing data if key is available
    if ENCRYPTION_KEY:
        fernet = get_fernet(ENCRYPTION_KEY)
        # Use a connection to get current data
        conn = op.get_bind()
        res = conn.execute(sa.text("SELECT id, iban FROM sepa_mandates"))
        for row in res:
            mandate_id = row[0]
            current_iban = row[1]
            
            # Skip if already encrypted (Fernet tokens start with gAAAAA)
            if current_iban and not current_iban.startswith("gAAAAA"):
                encrypted_iban = fernet.encrypt(current_iban.encode()).decode()
                conn.execute(
                    sa.text("UPDATE sepa_mandates SET iban = :iban WHERE id = :id"),
                    {"iban": encrypted_iban, "id": mandate_id}
                )


def downgrade() -> None:
    # 1. Decrypt data if key is available
    if ENCRYPTION_KEY:
        fernet = get_fernet(ENCRYPTION_KEY)
        conn = op.get_bind()
        res = conn.execute(sa.text("SELECT id, iban FROM sepa_mandates"))
        for row in res:
            mandate_id = row[0]
            current_iban = row[1]
            if current_iban and current_iban.startswith("gAAAAA"):
                try:
                    decrypted_iban = fernet.decrypt(current_iban.encode()).decode()
                    # Truncate to original length if necessary
                    conn.execute(
                        sa.text("UPDATE sepa_mandates SET iban = :iban WHERE id = :id"),
                        {"iban": decrypted_iban[:34], "id": mandate_id}
                    )
                except Exception:
                    pass

    # 2. Revert column length
    op.alter_column('sepa_mandates', 'iban',
               existing_type=sa.String(length=255),
               type_=sa.String(length=34),
               existing_nullable=False)
