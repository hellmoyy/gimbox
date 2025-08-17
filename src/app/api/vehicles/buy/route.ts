import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";

const ALLOWED = new Set([
  // legacy vehicle IDs
  "vehicle01", "vehicle02", "vehicle03",
  // driving variants for standard characters
  "drive_char01", "drive_char02", "drive_char03", "drive_char04", "drive_char05", "drive_char06",
  // driving variants for premium characters
  "drive_premium01", "drive_premium02", "drive_premium03",
]);

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
    const token = await getToken({ req, secret });
    if (!token || !token.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = String(token.email).toLowerCase();
    const { vehicle, price = 150 } = await req.json();
    if (!ALLOWED.has(String(vehicle))) {
      return NextResponse.json({ success: false, error: "Invalid vehicle" }, { status: 400 });
    }

    const db = await getDb();
    const profiles = db.collection("profiles");
    const pets = db.collection("pets");

    const pet = await pets.findOne({ email });
    if (!pet) return NextResponse.json({ success: false, error: "Pet not found" }, { status: 404 });
    if ((pet as any).coins < price) {
      return NextResponse.json({ success: false, error: "Not enough coins" }, { status: 400 });
    }

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
      { $addToSet: { ownedVehicles: String(vehicle) } }
    );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
