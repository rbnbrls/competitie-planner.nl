"""
File: backend/app/services/encryption.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import base64

from cryptography.fernet import Fernet, InvalidToken


class EncryptionService:
    def __init__(self, key: str):
        if len(key) < 32:
            raise ValueError("ENCRYPTION_KEY must be at least 32 characters")
        encoded_key = base64.urlsafe_b64encode(key.ljust(32)[:32].encode())
        self._fernet = Fernet(encoded_key)

    def encrypt(self, plaintext: str) -> str:
        return self._fernet.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> str:
        try:
            return self._fernet.decrypt(ciphertext.encode()).decode()
        except InvalidToken:
            raise ValueError("Invalid encrypted data")


def get_encryption_service() -> EncryptionService:
    from app.config import settings

    return EncryptionService(settings.ENCRYPTION_KEY)
