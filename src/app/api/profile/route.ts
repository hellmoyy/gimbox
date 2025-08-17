import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";

type UserProfile = {
  email: string;
  selectedCharacter?: string;
  characterName?: string;
  ownedCharacters?: string[];
  ownedVehicles?: string[];
  createdAt: Date;
  updatedAt: Date;
};

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
    const token = await getToken({ req, secret });
    if (!token || !token.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = String(token.email).toLowerCase();
  const db = await getDb();
  const profiles = db.collection<UserProfile>("profiles");
  const [profile, takenDocs] = await Promise.all([
      profiles.findOne({ email }, { projection: { _id: 0 } }),
      profiles
        .find(
          { selectedCharacter: { $in: ["char01", "char02", "char03", "char04", "char05", "char06", "premium01", "premium02", "premium03"] } },
          { projection: { _id: 0, selectedCharacter: 1 } }
        )
        .toArray(),
    ]);
    const taken = Array.from(
      new Set(
        (takenDocs || [])
          .map((d: any) => d?.selectedCharacter)
          .filter((x: any): x is string => typeof x === "string")
      )
    );
    return NextResponse.json({ success: true, profile: profile || null, taken });
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
    const selectedCharacter = String(body?.selectedCharacter || "").trim();
    const characterNameRaw = String(body?.characterName || "");
    const characterName = characterNameRaw.trim();
    const allowed = new Set(["char01", "char02", "char03", "char04", "char05", "char06"]);
    if (!allowed.has(selectedCharacter)) {
      return NextResponse.json({ success: false, error: "Invalid character" }, { status: 400 });
    }
    if (characterName.length < 6) {
      return NextResponse.json({ success: false, error: "Name too short" }, { status: 400 });
    }
    const db = await getDb();
    const profiles = db.collection<UserProfile>("profiles");
    const existing = await profiles.findOne({ email });
    if (existing?.selectedCharacter && existing.selectedCharacter !== selectedCharacter) {
      return NextResponse.json({ success: false, error: "Cannot change initial character" }, { status: 400 });
    }
    const now = new Date();
    // Ensure a unique index on selectedCharacter (only when set)
    try {
      await profiles.createIndex(
        { selectedCharacter: 1 },
        { unique: true, partialFilterExpression: { selectedCharacter: { $type: "string" } } }
      );
    } catch {}

    try {
      await profiles.updateOne(
        { email },
        {
          $set: { email, selectedCharacter, characterName, updatedAt: now },
          $setOnInsert: { createdAt: now },
          $addToSet: { ownedCharacters: selectedCharacter },
        },
        { upsert: true }
      );
      return NextResponse.json({ success: true });
    } catch (err: any) {
      if (err && (err.code === 11000 || /duplicate key/i.test(String(err.message)))) {
        return NextResponse.json({ success: false, error: "Character already taken" }, { status: 409 });
      }
      throw err;
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
