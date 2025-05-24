import { NextResponse } from "next/server";
import { syncAllUsers } from "@/services/sync";

export async function POST() {
  const result = await syncAllUsers();

  return NextResponse.json(result);
}
