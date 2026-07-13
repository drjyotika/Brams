import { NextRequest, NextResponse } from "next/server";
import { createPost, getMostRecentPostCreatedAt } from "../../../../lib/blog";
import { generateBlogPost } from "../../../../lib/blog-generator";
import { buildBlogDraftReadyEmail, sendEmail } from "../../../../lib/email";
import { SITE } from "../../../../lib/seo";

/**
 * GET /api/cron/blog-generate
 *
 * Called daily by Vercel Cron (see vercel.json), but only actually generates a
 * post once at least MIN_INTERVAL_DAYS has passed since the last one — so the
 * real "every 2 days" cadence is enforced here, not by the cron scheduler's
 * exact timing (robust to a missed, delayed, or extra invocation).
 *
 * IMPORTANT: this only ever creates a DRAFT and emails the clinician to
 * review it. It never auto-publishes — the generated content carries her name
 * and a schema.org `reviewedBy` claim, so a human must approve it first.
 *
 * Protected by CRON_SECRET (set automatically by Vercel, or manually in
 * environment variables) — same pattern as cron/appointment-reminders.
 */

const MIN_INTERVAL_DAYS = 2;
const CLINIC_NOTIFY = ["drjyotika@bramsmindcare.com", "info@bramsmindcare.com"];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const lastPostAt = await getMostRecentPostCreatedAt();
    if (lastPostAt) {
      const daysSince = (Date.now() - lastPostAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < MIN_INTERVAL_DAYS) {
        return NextResponse.json({
          ok: true,
          skipped: true,
          reason: `Last post was ${daysSince.toFixed(1)} days ago (< ${MIN_INTERVAL_DAYS}-day cadence).`,
        });
      }
    }

    const generated = await generateBlogPost();

    const post = await createPost({
      slug:             generated.slug,
      title:            generated.title,
      excerpt:          generated.excerpt,
      body_markdown:    generated.body_markdown,
      meta_title:       generated.meta_title,
      meta_description: generated.meta_description,
      tags:             generated.tags,
      status:           "draft", // never auto-published — see module header
    });

    // Best-effort notification — a failed email must not fail the generation.
    try {
      const tpl = buildBlogDraftReadyEmail({
        title:     post.title,
        excerpt:   post.excerpt ?? "",
        reviewUrl: `${SITE.url}/admin/blog/${post.id}`,
      });
      await sendEmail({ to: CLINIC_NOTIFY, subject: tpl.subject, html: tpl.html, text: tpl.text });
    } catch (e) {
      console.error("[cron/blog-generate] notification email failed:", e);
    }

    console.log(`[cron/blog-generate] created draft "${post.title}" (${post.id})`);
    return NextResponse.json({ ok: true, created: { id: post.id, title: post.title, slug: post.slug } });
  } catch (e) {
    console.error("[cron/blog-generate] failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
