import { NextResponse } from "next/server";
import { readContent } from "../../../lib/storage";
import { defaultContent } from "../../../lib/content";

export async function GET() {
  const content = await readContent();
  return NextResponse.json({
    step1: content.bookingStep1 ?? defaultContent.bookingStep1,
    step2: content.bookingStep2 ?? defaultContent.bookingStep2,
  });
}
