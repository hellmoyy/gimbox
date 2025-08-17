import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";

type PetDoc = {
  email: string;
  name: string;
  level: number;
  exp: number;
  coins: number;
  hp: number;
  hunger: number;
  energy: number;
  mood: number;
  sleeping: boolean;
  inventory: { food: number };
  updatedAt: Date;
};

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
    const token = await getToken({ req, secret });
    if (!token || !token.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = String(token.email).toLowerCase();
    const db = await getDb();
    const pets = db.collection<PetDoc>("pets");
    const profiles = db.collection("profiles");
  let pet = (await pets.findOne({ email }, { projection: { _id: 0 } })) as unknown as PetDoc | null;
    if (!pet) {
      const profile = await profiles.findOne({ email }, { projection: { _id: 0, characterName: 1 } });
      const now = new Date();
  const newPet: PetDoc = {
        email,
        name: profile?.characterName && String(profile.characterName).trim().length >= 6 ? String(profile.characterName).trim() : "GimPet",
        level: 1,
        exp: 0,
        coins: 0,
        hp: 100,
        hunger: 80,
        energy: 80,
        mood: 60,
        sleeping: false,
        inventory: { food: 3 },
        updatedAt: now,
  };
  await pets.insertOne(newPet);
  pet = newPet;
    }
    return NextResponse.json({ success: true, pet });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
    const token = await getToken({ req, secret });
    if (!token || !token.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = String(token.email).toLowerCase();
    const body = await req.json();
    const patch = body?.pet ?? {};
    const db = await getDb();
    const pets = db.collection<PetDoc>("pets");
    const now = new Date();
    const update = {
      ...patch,
      updatedAt: now,
    } as Partial<PetDoc>;
    await pets.updateOne(
      { email },
      { $set: update, $setOnInsert: { email, name: "GimPet", level: 1, exp: 0, coins: 0, hp: 100, hunger: 80, energy: 80, mood: 60, sleeping: false, inventory: { food: 3 } } },
      { upsert: true }
    );
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
