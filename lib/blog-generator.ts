/**
 * Automatic blog post generation — grounded in this site's own content
 * (conditions treated, FAQ, the doctor's bio/approach) so posts are on-brand
 * and factually anchored rather than generic AI output, and written to SEO/
 * AEO/GEO best practices (answer-first structure, clear meta tags, an
 * in-body FAQ block, natural internal links).
 *
 * IMPORTANT: this only ever produces a DRAFT (see app/api/cron/blog-generate).
 * Medical/mental-health content published under a real clinician's name — with
 * schema.org `reviewedBy` pointing at her — must be reviewed by her before it
 * goes live. This module never publishes on its own.
 */

import Anthropic from "@anthropic-ai/sdk";
import { getSiteContent } from "./api";
import { listRecentPostTitles, slugify } from "./blog";
import { SITE } from "./seo";

export type GeneratedPost = {
  title:             string;
  slug:              string;
  excerpt:           string;
  meta_title:        string;
  meta_description:  string;
  tags:              string[];
  body_markdown:     string;
};

const MODEL = "claude-sonnet-5";

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  return new Anthropic({ apiKey });
}

/** Pulls the site's own conditions/FAQ/about content to ground the prompt. */
async function buildGroundingContext(): Promise<string> {
  const content = await getSiteContent();
  const { conditions, faq, about } = content;

  const conditionsBlock = conditions.items
    .map((c) => `- ${c.name} (/conditions/${c.slug}): ${c.intro}`)
    .join("\n");

  const faqBlock = faq.items.map((f) => `- Q: ${f.question}\n  A: ${f.answer}`).join("\n");

  return [
    `Practice: ${SITE.brand}`,
    `Clinician: ${about.name}, ${about.role}`,
    `Clinician bio: ${about.intro}`,
    `Clinical approach: ${about.approach}`,
    `Service area: online psychiatric consultations across India.`,
    ``,
    `Conditions treated (link to these where relevant, using the exact path shown):`,
    conditionsBlock,
    ``,
    `Existing FAQ content (for tone/accuracy reference — do not just repeat these verbatim):`,
    faqBlock,
  ].join("\n");
}

const SYSTEM_PROMPT = `You are writing a blog post for a real psychiatric practice's website (${SITE.brand}), to be reviewed and published by the clinician herself before anyone sees it.

Ground rules (non-negotiable):
- General educational information only. Never diagnose, never recommend a specific medication or dose, never claim to replace a real consultation.
- No fabricated statistics, studies, or citations. If you reference research, keep it generic ("research suggests…") — never invent a study name, journal, or number.
- If the topic touches self-harm, suicidal thoughts, or crisis, include a clear line directing the reader to emergency services or India's iCall helpline (+91-9152987821), and note this practice is not an emergency service.
- Warm, calm, plain-language tone. Avoid alarmist framing.
- Write for an Indian audience (context, not stereotypes) considering online/telepsychiatry.

SEO / AEO / GEO structure (follow exactly):
- Open with a 2–3 sentence answer-first paragraph that directly answers the core question a search/AI query would ask — this is the part search engines and AI assistants are most likely to quote.
- Use ## for section headings (H2), ### for subsections (H3) if needed. Never use # (H1 — the page template supplies that from the title).
- Include one short "Frequently asked questions" section near the end with 2–3 Q&As as ### headings followed by a short answer paragraph each.
- Naturally link to at most 2–3 of the practice's own pages using standard Markdown links, ONLY using the exact paths given in the grounding context (e.g. [anxiety and panic disorders](/conditions/anxiety)) and to [book a consultation](/book) once near the end.
- Length: roughly 600–900 words.
- Do not repeat a topic already covered by an existing post title given to you.

Output STRICT JSON only (no markdown fences, no commentary before/after), matching exactly this shape:
{
  "title": string,             // clear, specific, under 60 chars where possible
  "excerpt": string,            // 1–2 sentence teaser, under 160 chars
  "meta_title": string,         // under 60 chars, include the core topic
  "meta_description": string,   // under 155 chars, compelling, includes the core topic
  "tags": string[],             // 2–4 short lowercase tags
  "body_markdown": string       // the full post body in Markdown, per the structure above
}`;

/** Calls Claude to draft one grounded, SEO/AEO/GEO-structured blog post. */
export async function generateBlogPost(): Promise<GeneratedPost> {
  const [groundingContext, recentTitles] = await Promise.all([
    buildGroundingContext(),
    listRecentPostTitles(30),
  ]);

  const userPrompt = [
    groundingContext,
    ``,
    recentTitles.length
      ? `Existing post titles — do NOT repeat any of these topics:\n${recentTitles.map((t) => `- ${t}`).join("\n")}`
      : `No existing posts yet — pick any relevant topic from the conditions above.`,
    ``,
    `Pick ONE focused topic related to the conditions this practice treats (or general mental wellness relevant to its audience) and write the post now. Output only the JSON object described in the system prompt.`,
  ].join("\n");

  const res = await client().messages.create({
    model:      MODEL,
    max_tokens: 4096,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: "user", content: userPrompt }],
  });

  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Model returned no text content.");
  }

  // Defensive: strip accidental ```json fences if the model adds them anyway.
  const raw = textBlock.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Model output was not valid JSON.");
  }

  return validateGeneratedPost(parsed);
}

function validateGeneratedPost(input: unknown): GeneratedPost {
  if (!input || typeof input !== "object") throw new Error("Generated post payload is not an object.");
  const d = input as Record<string, unknown>;

  const title            = typeof d.title === "string" ? d.title.trim() : "";
  const excerpt           = typeof d.excerpt === "string" ? d.excerpt.trim() : "";
  const meta_title        = typeof d.meta_title === "string" ? d.meta_title.trim() : "";
  const meta_description  = typeof d.meta_description === "string" ? d.meta_description.trim() : "";
  const body_markdown     = typeof d.body_markdown === "string" ? d.body_markdown.trim() : "";
  const tags              = Array.isArray(d.tags) ? d.tags.filter((t): t is string => typeof t === "string") : [];

  if (!title)         throw new Error("Generated post is missing a title.");
  if (!body_markdown)  throw new Error("Generated post is missing body content.");

  return {
    title,
    slug:  slugify(title),
    excerpt:          excerpt || title,
    meta_title:       meta_title || title,
    meta_description: meta_description || excerpt || title,
    tags,
    body_markdown,
  };
}
