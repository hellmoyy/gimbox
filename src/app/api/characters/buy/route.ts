import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";

const ALLOWED = new Set(["premium01","premium02","premium03"]);

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
    const token = await getToken({ req, secret });
    if (!token || !token.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = String(token.email).toLowerCase();
    const { character, price = 100 } = await req.json();
    if (!ALLOWED.has(String(character))) {
      return NextResponse.json({ success: false, error: "Invalid character" }, { status: 400 });
    }

    const db = await getDb();
  const profiles = db.collection("profiles");
  const pets = db.collection("pets");

    const pet = await pets.findOne({ email });
    if (!pet) return NextResponse.json({ success: false, error: "Pet not found" }, { status: 404 });

    if ((pet as any).coins < price) {
      return NextResponse.json({ success: false, error: "Not enough coins" }, { status: 400 });
    }

    // Add to owned and deduct coins atomically
    const updatedPet = await pets.findOneAndUpdate(
      { email, coins: { $gte: price } },
      { $inc: { coins: -price } },
      { returnDocument: "after" }
    );
    if (!updatedPet?.value) {
      return NextResponse.json({ success: false, error: "Not enough coins" }, { status: 400 });
    }
    await profiles.updateOne(
      { email },
      { $addToSet: { ownedCharacters: String(character) } }
    );
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
