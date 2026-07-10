import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

/**
 * Renders admin-authored Markdown to HTML for a blog post body.
 *
 * Not sanitized beyond what `marked` itself does — acceptable here because
 * post bodies are authored exclusively by admins (same trust level as the
 * rest of the admin-editable site content), never by public/patient input.
 */
export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}
