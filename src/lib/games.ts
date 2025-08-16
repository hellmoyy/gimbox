import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export type Game = { _id: ObjectId; name: string; code?: string; icon?: string; isActive?: boolean };

export async function getGames(filter: any = {}) {
  const db = await getDb();
  const items = await db
    .collection("games")
    .find({ isActive: { $ne: false }, ...filter })
    .project({ name: 1, code: 1, icon: 1 })
    .sort({ name: 1 })
    .toArray();
  return items as Game[];
}

export async function getGameMap() {
  const list = await getGames();
  const map = new Map<string, Game>();
  for (const g of list) map.set(g._id.toString(), g);
  return map;
}
export const games = [
  {
    code: "never-after",
    name: "Never After (Global)",
    icon: "https://tema3.demouniplay.my.id/game/never-after.webp",
  },
  {
    code: "honor-of-kings",
    name: "Honor of Kings",
    icon: "https://tema3.demouniplay.my.id/game/honor-of-kings.webp",
  },
  {
    code: "seal-m-sea",
    name: "SEAL M SEA",
    icon: "https://tema3.demouniplay.my.id/game/seal-m-sea.webp",
  },
  {
    code: "hago",
    name: "Hago",
    icon: "https://tema3.demouniplay.my.id/game/hago.webp",
  },
  {
    code: "mobile-legends",
    name: "Mobile Legends",
    icon: "https://tema3.demouniplay.my.id/game/mobile-legends.webp",
  },
  {
    code: "rf-classic",
    name: "RF Online Classic",
    icon: "https://tema3.demouniplay.my.id/game/rf-classic.webp",
  },
  {
    code: "valorant",
    name: "Valorant",
    icon: "https://tema3.demouniplay.my.id/game/valorant.webp",
  },
  {
    code: "google-play",
    name: "Voucher Google Play",
    icon: "https://tema3.demouniplay.my.id/voucher/google-play.webp",
  },
  {
    code: "call-of-duty",
    name: "Call of Duty Mobile",
    icon: "https://tema3.demouniplay.my.id/game/call-of-duty.webp",
  },
  {
    code: "arena-breakout",
    name: "Arena Breakout",
    icon: "https://tema3.demouniplay.my.id/game/arena-breakout.webp",
  },
  // ...tambahkan game lain sesuai kebutuhan
];
