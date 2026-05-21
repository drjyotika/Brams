import { NextResponse } from "next/server";
import { getAllFeedbacks } from "../../../../lib/feedback";

export async function GET() {
  const feedbacks = await getAllFeedbacks();
  return NextResponse.json(feedbacks);
}
