"""
API Key 加密工具
- 使用 Fernet（AES-128-CBC + HMAC-SHA256）对称加密
- 主密钥从环境变量 SETTINGS_ENCRYPT_KEY 读取
- 若未配置则以明文存储（开发模式），并输出警告
- decrypt_secret() 在解密失败时自动回退为明文（兼容迁移）
"""
import logging

logger = logging.getLogger(__name__)

_fernet = None
_fernet_initialized = False


def _get_fernet():
    global _fernet, _fernet_initialized
    if _fernet_initialized:
        return _fernet
    _fernet_initialized = True

    from app.config import settings
    key = getattr(settings, "SETTINGS_ENCRYPT_KEY", "")
    if not key:
        logger.warning(
            "SETTINGS_ENCRYPT_KEY 未配置，API Key 将以明文存储（仅限开发环境）"
        )
        return None

    from cryptography.fernet import Fernet
    try:
        _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    except Exception as exc:
        logger.error(f"SETTINGS_ENCRYPT_KEY 格式无效，回退为明文模式: {exc}")
    return _fernet


def encrypt_secret(plaintext: str) -> str:
    """加密 API Key，返回密文字符串（Fernet token）。未配置 key 则原样返回。"""
    if not plaintext:
        return plaintext
    f = _get_fernet()
    if not f:
        return plaintext
    return f.encrypt(plaintext.encode()).decode()


def decrypt_secret(value: str) -> str:
    """解密 API Key。若解密失败（如明文迁移数据），原样返回。"""
    if not value:
        return value
    f = _get_fernet()
    if not f:
        return value
    try:
        from cryptography.fernet import InvalidToken
        return f.decrypt(value.encode()).decode()
    except (InvalidToken, Exception):
        # 兼容旧的明文存储数据，直接返回原值
        return value


def mask_secret(value: str) -> str:
    """日志展示用：仅显示前 8 位 + ***"""
    if not value:
        return "(空)"
    return value[:8] + "***"
