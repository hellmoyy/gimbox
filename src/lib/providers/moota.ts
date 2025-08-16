import axios from "axios";
import { getDb } from "../mongodb";
import { MOOTA_API_KEY as CFG_MOOTA_KEY } from "../runtimeConfig";

export async function getMootaConfig() {
  const db = await getDb();
  const doc = await db.collection("settings").findOne({ key: "gateway:moota" });
  const value = doc?.value || {};
  const apiKey: string = String(value?.keys?.apiKey || CFG_MOOTA_KEY || process.env.MOOTA_API_KEY || "");
  const enabled: boolean = value?.enabled !== false; // default true if configured
  return { apiKey, enabled };
}

export async function listBankAccounts() {
  const { apiKey } = await getMootaConfig();
  if (!apiKey) throw new Error("Moota API key is not configured");
  const base = "https://api.moota.co/v2";
  const res = await axios.get(`${base}/bank-accounts`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return res.data;
}
