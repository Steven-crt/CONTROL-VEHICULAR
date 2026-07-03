const crypto = require("node:crypto");

const ALGORITHM = "aes-256-gcm";
const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;
const PREFIX = "v1:";

function getKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY no configurado en variables de entorno");
  }

  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error("ENCRYPTION_KEY debe ser una cadena hexadecimal de 64 caracteres");
  }

  return keyBuffer;
}

function encrypt(text) {
  if (!text) return text;

  const key = getKey();
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(String(text), "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${PREFIX}${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${encrypted}`;
}

function decryptGcm(encryptedText) {
  if (!encryptedText.startsWith(PREFIX)) {
    return null;
  }

  const [, ivHex, tagHex, encrypted] = encryptedText.split(":");
  if (!ivHex || !tagHex || !encrypted) {
    return null;
  }

  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  if (iv.length !== GCM_IV_LENGTH || tag.length !== GCM_TAG_LENGTH) {
    return null;
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;

  try {
    return decryptGcm(encryptedText) || encryptedText;
  } catch {
    return encryptedText;
  }
}

function mask(value, visibleChars = 3) {
  if (!value) return value;
  const str = String(value);
  if (str.length <= visibleChars * 2) {
    return str.slice(0, 1) + "*".repeat(str.length - 2) + str.slice(-1);
  }
  return (
    str.slice(0, visibleChars) +
    "*".repeat(str.length - visibleChars * 2) +
    str.slice(-visibleChars)
  );
}

module.exports = { encrypt, decrypt, mask };
