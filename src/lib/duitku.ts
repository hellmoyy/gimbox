import crypto from "crypto";
import { DUITKU_MERCHANT_CODE, DUITKU_API_KEY } from "./runtimeConfig";

export function duitkuSignatureGetPaymentMethod(amount: number, datetime: string) {
  return crypto.createHash("sha256")
    .update(DUITKU_MERCHANT_CODE + amount + datetime + DUITKU_API_KEY)
    .digest("hex");
}

export function duitkuSignatureTransaction(orderId: string, amount: number) {
  return crypto.createHash("md5")
    .update(DUITKU_MERCHANT_CODE + orderId + amount + DUITKU_API_KEY)
    .digest("hex");
}

export function duitkuSignatureCallback(amount: number, orderId: string) {
  return crypto.createHash("md5")
    .update(DUITKU_MERCHANT_CODE + amount + orderId + DUITKU_API_KEY)
    .digest("hex");
}

export function duitkuSignatureStatus(orderId: string) {
  return crypto.createHash("md5")
    .update(DUITKU_MERCHANT_CODE + orderId + DUITKU_API_KEY)
    .digest("hex");
}
