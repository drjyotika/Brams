"use client";

import { useEffect, useState } from "react";
import type {
  BookingFailedData,
  BookingSuccessData,
  HeroData,
  HowItWorksData,
  NavData,
  NewsletterData,
  PricingData,
  PricingPlan,
  SiteContent,
  StatusCta,
  SupportCard,
  SupportData,
  FooterData,
} from "../../../lib/content";
import { ICON_NAMES, pickIconForHeading } from "../../../components/Icon";
import { API_BASE } from "../../../lib/config";
import { BramsLoader } from "../../../components/BramsLoader";
import styles from "../admin.module.scss";

const SUPPORT_TONES: SupportCard["tone"][] = [
  "sky", "lilac", "muted", "lime", "sand", "mint", "dark",
];

type Tab = "hero" | "support" | "howItWorks" | "pricing" | "newsletter" | "nav" | "footer" | "bookingSuccess" | "bookingFailed";

const TABS: { id: Tab; label: string }[] = [
  { id: "hero",           label: "Hero"               },
  { id: "support",        label: "Specialized Support" },
  { id: "howItWorks",     label: "How it Works"        },
  { id: "pricing",        label: "Pricing Plans"       },
  { id: "newsletter",     label: "Newsletter CTA"      },
  { id: "nav",            label: "Navigation"          },
  { id: "footer",         label: "Footer"              },
  { id: "bookingSuccess", label: "Booking — Success"   },
  { id: "bookingFailed",  label: "Booking — Failed"    },
];

export default function ContentPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [tab, setTab] = useState<Tab>("hero");

  useEffect(() => {
    fetch(`${API_BASE}/content`)
      .then((r) => r.json())
      .then((data: SiteContent) => setContent(data));
  }, []);

  if (!content) return <BramsLoader />;

  const update = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) =>
    setContent((c) => (c ? { ...c, [key]: value } : c));

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Homepage Content</h1>
      </div>

      <div className={styles.layout}>
        <nav className={styles.tabs} aria-label="Admin sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${styles.tab} ${t.id === tab ? styles.tabActive : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div>
          {tab === "hero"           && <HeroEditor           data={content.hero}           onChange={(v) => update("hero",           v)} />}
          {tab === "support"        && <SupportEditor        data={content.support}        onChange={(v) => update("support",        v)} />}
          {tab === "howItWorks"     && <HowEditor            data={content.howItWorks}     onChange={(v) => update("howItWorks",     v)} />}
          {tab === "pricing"        && <PricingEditor        data={content.pricing}        onChange={(v) => update("pricing",        v)} />}
          {tab === "newsletter"     && <NewsletterEditor     data={content.newsletter}     onChange={(v) => update("newsletter",     v)} />}
          {tab === "nav"            && <NavEditor            data={content.nav}            onChange={(v) => update("nav",            v)} />}
          {tab === "footer"         && <FooterEditor         data={content.footer}         onChange={(v) => update("footer",         v)} />}
          {tab === "bookingSuccess" && <BookingSuccessEditor data={content.bookingSuccess} onChange={(v) => update("bookingSuccess", v)} />}
          {tab === "bookingFailed"  && <BookingFailedEditor  data={content.bookingFailed}  onChange={(v) => update("bookingFailed",  v)} />}
        </div>
      </div>
    </div>
  );
}

// ─── Save helper ──────────────────────────────────────────────────────────────

type SaveStatus = { state: "idle" | "saving" | "ok" | "err"; message?: string };

function useSaver(sectionKey: keyof SiteContent) {
  const [status, setStatus] = useState<SaveStatus>({ state: "idle" });
  const save = async (value: unknown) => {
    setStatus({ state: "saving" });
    try {
      const res = await fetch(`${API_BASE}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [sectionKey]: value }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus({ state: "ok", message: "Saved" });
      setTimeout(() => setStatus({ state: "idle" }), 2000);
    } catch (e) {
      setStatus({ state: "err", message: (e as Error).message });
    }
  };
  return { status, save };
}

function StatusBadge({ status }: { status: SaveStatus }) {
  if (status.state === "idle") return null;
  if (status.state === "saving") return <span className={styles.status}>Saving…</span>;
  if (status.state === "ok") return <span className={`${styles.status} ${styles.statusOk}`}>{status.message}</span>;
  return <span className={`${styles.status} ${styles.statusErr}`}>Error: {status.message}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
    </label>
  );
}

function HeroEditor({ data, onChange }: { data: HeroData; onChange: (v: HeroData) => void }) {
  const { status, save } = useSaver("hero");
  const set = <K extends keyof HeroData>(k: K, v: HeroData[K]) => onChange({ ...data, [k]: v });
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Hero</h2>
      <p className={styles.panelHint}>Top of the page — title, subtitle, CTAs, portrait.</p>
      <Field label="Eyebrow"><input className={styles.input} value={data.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} /></Field>
      <div className={styles.row}>
        <Field label="Title — lead"><input className={styles.input} value={data.titleLead} onChange={(e) => set("titleLead", e.target.value)} /></Field>
        <Field label="Title — accent"><input className={styles.input} value={data.titleAccent} onChange={(e) => set("titleAccent", e.target.value)} /></Field>
      </div>
      <Field label="Description"><textarea className={styles.textarea} value={data.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <div className={styles.row}>
        <Field label="Primary CTA label"><input className={styles.input} value={data.primaryCta.label} onChange={(e) => set("primaryCta", { ...data.primaryCta, label: e.target.value })} /></Field>
        <Field label="Primary CTA href"><input className={styles.input} value={data.primaryCta.href} onChange={(e) => set("primaryCta", { ...data.primaryCta, href: e.target.value })} /></Field>
      </div>
      <div className={styles.row}>
        <Field label="Secondary CTA label"><input className={styles.input} value={data.secondaryCta.label} onChange={(e) => set("secondaryCta", { ...data.secondaryCta, label: e.target.value })} /></Field>
        <Field label="Secondary CTA href"><input className={styles.input} value={data.secondaryCta.href} onChange={(e) => set("secondaryCta", { ...data.secondaryCta, href: e.target.value })} /></Field>
      </div>
      <Field label="Portrait image URL"><input className={styles.input} value={data.portrait.src} onChange={(e) => set("portrait", { ...data.portrait, src: e.target.value })} /></Field>
      <Field label="Portrait alt"><input className={styles.input} value={data.portrait.alt} onChange={(e) => set("portrait", { ...data.portrait, alt: e.target.value })} /></Field>
      <div className={styles.row}>
        <Field label="Badge label"><input className={styles.input} value={data.badge.label} onChange={(e) => set("badge", { ...data.badge, label: e.target.value })} /></Field>
        <Field label="Badge quote"><input className={styles.input} value={data.badge.quote} onChange={(e) => set("badge", { ...data.badge, quote: e.target.value })} /></Field>
      </div>
      <div className={styles.actions}>
        <button className={styles.primary} onClick={() => save(data)}>Save Hero</button>
        <StatusBadge status={status} />
      </div>
    </section>
  );
}

function SupportEditor({ data, onChange }: { data: SupportData; onChange: (v: SupportData) => void }) {
  const { status, save } = useSaver("support");
  const setCard = (idx: number, patch: Partial<SupportCard>) => {
    const cards = data.cards.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onChange({ ...data, cards });
  };
  const removeCard = (idx: number) => onChange({ ...data, cards: data.cards.filter((_, i) => i !== idx) });
  const addCard = () => {
    const used = new Set(data.cards.map((c) => c.tone));
    const nextTone = SUPPORT_TONES.find((t) => !used.has(t)) ?? SUPPORT_TONES[data.cards.length % SUPPORT_TONES.length];
    const title = "New Card";
    onChange({ ...data, cards: [...data.cards, { id: `card-${Date.now()}`, title, description: "Describe this area of support.", iconName: pickIconForHeading(title), tone: nextTone }] });
  };
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Specialized Support</h2>
      <p className={styles.panelHint}>Header copy + the four bento cards.</p>
      <Field label="Title"><input className={styles.input} value={data.title} onChange={(e) => onChange({ ...data, title: e.target.value })} /></Field>
      <Field label="Description"><textarea className={styles.textarea} value={data.description} onChange={(e) => onChange({ ...data, description: e.target.value })} /></Field>
      <div className={styles.row}>
        <Field label="Link label"><input className={styles.input} value={data.link.label} onChange={(e) => onChange({ ...data, link: { ...data.link, label: e.target.value } })} /></Field>
        <Field label="Link href"><input className={styles.input} value={data.link.href} onChange={(e) => onChange({ ...data, link: { ...data.link, href: e.target.value } })} /></Field>
      </div>
      {data.cards.map((card, i) => (
        <div key={card.id} className={styles.cardArrayItem}>
          <div className={styles.cardArrayHead}>
            <span>Card #{i + 1}</span>
            <button type="button" className={styles.danger} onClick={() => removeCard(i)}>Remove</button>
          </div>
          <Field label="Title">
            <input className={styles.input} value={card.title} onChange={(e) => {
              const title = e.target.value;
              const suggested = pickIconForHeading(title);
              const shouldFollow = card.iconName === "sparkles" || card.iconName === pickIconForHeading(card.title);
              setCard(i, { title, iconName: shouldFollow ? suggested : card.iconName });
            }} />
          </Field>
          <Field label="Description"><textarea className={styles.textarea} value={card.description} onChange={(e) => setCard(i, { description: e.target.value })} /></Field>
          <div className={styles.row}>
            <Field label="Icon"><select className={styles.select} value={card.iconName} onChange={(e) => setCard(i, { iconName: e.target.value })}>{ICON_NAMES.map((n) => (<option key={n} value={n}>{n}</option>))}</select></Field>
            <Field label="Tone"><select className={styles.select} value={card.tone} onChange={(e) => setCard(i, { tone: e.target.value as SupportCard["tone"] })}>{SUPPORT_TONES.map((t) => (<option key={t} value={t}>{t}</option>))}</select></Field>
          </div>
        </div>
      ))}
      <div className={styles.actions}>
        <button className={styles.secondary} type="button" onClick={addCard}>+ Add card</button>
        <button className={styles.primary} onClick={() => save(data)}>Save Support</button>
        <StatusBadge status={status} />
      </div>
    </section>
  );
}

function HowEditor({ data, onChange }: { data: HowItWorksData; onChange: (v: HowItWorksData) => void }) {
  const { status, save } = useSaver("howItWorks");
  const setStep = (idx: number, patch: Partial<HowItWorksData["steps"][number]>) => {
    const steps = data.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ ...data, steps });
  };
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>How it Works</h2>
      <p className={styles.panelHint}>Three numbered steps.</p>
      <Field label="Title"><input className={styles.input} value={data.title} onChange={(e) => onChange({ ...data, title: e.target.value })} /></Field>
      <Field label="Description"><textarea className={styles.textarea} value={data.description} onChange={(e) => onChange({ ...data, description: e.target.value })} /></Field>
      {data.steps.map((step, i) => (
        <div key={step.id} className={styles.cardArrayItem}>
          <div className={styles.cardArrayHead}>Step {step.number}</div>
          <Field label="Title"><input className={styles.input} value={step.title} onChange={(e) => setStep(i, { title: e.target.value })} /></Field>
          <Field label="Description"><textarea className={styles.textarea} value={step.description} onChange={(e) => setStep(i, { description: e.target.value })} /></Field>
        </div>
      ))}
      <div className={styles.actions}>
        <button className={styles.primary} onClick={() => save(data)}>Save Steps</button>
        <StatusBadge status={status} />
      </div>
    </section>
  );
}

function PricingEditor({ data, onChange }: { data: PricingData; onChange: (v: PricingData) => void }) {
  const [status, setStatus] = useState<SaveStatus>({ state: "idle" });
  const setPlan = (idx: number, patch: Partial<PricingPlan>) => {
    const plans = data.plans.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    onChange({ ...data, plans });
  };
  const removePlan = (idx: number) => onChange({ ...data, plans: data.plans.filter((_, i) => i !== idx) });
  const addPlan = () => {
    const id = `plan-${Date.now()}`;
    onChange({ ...data, plans: [...data.plans, { id, eyebrow: "NEW PLAN", title: "New Plan", price: "₹0", unit: "/ session", features: ["Feature one"], cta: { label: "Book", href: "#" } }] });
  };
  const saveAll = async () => {
    setStatus({ state: "saving" });
    try {
      const r1 = await fetch(`${API_BASE}/plans`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data.plans) });
      if (!r1.ok) throw new Error(`plans HTTP ${r1.status}`);
      const r2 = await fetch(`${API_BASE}/content`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pricing: { ...data, plans: data.plans } }) });
      if (!r2.ok) throw new Error(`content HTTP ${r2.status}`);
      setStatus({ state: "ok", message: "Saved" });
      setTimeout(() => setStatus({ state: "idle" }), 2000);
    } catch (e) { setStatus({ state: "err", message: (e as Error).message }); }
  };
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Pricing Plans</h2>
      <p className={styles.panelHint}>Edit copy, prices, features. Add or remove plans.</p>
      <Field label="Section title"><input className={styles.input} value={data.title} onChange={(e) => onChange({ ...data, title: e.target.value })} /></Field>
      {data.plans.map((plan, i) => (
        <div key={plan.id} className={styles.planCard}>
          <div className={styles.planHead}>
            <h3 className={styles.planTitle}>{plan.title || "Untitled plan"} {plan.highlighted && <span style={{ color: "#745475" }}>★</span>}</h3>
            <button className={styles.danger} onClick={() => removePlan(i)}>Remove</button>
          </div>
          <div className={styles.row}>
            <Field label="Eyebrow"><input className={styles.input} value={plan.eyebrow} onChange={(e) => setPlan(i, { eyebrow: e.target.value })} /></Field>
            <Field label="Title"><input className={styles.input} value={plan.title} onChange={(e) => setPlan(i, { title: e.target.value })} /></Field>
          </div>
          <div className={styles.row}>
            <Field label="Price"><input className={styles.input} value={plan.price} onChange={(e) => setPlan(i, { price: e.target.value })} /></Field>
            <Field label="Unit"><input className={styles.input} value={plan.unit} onChange={(e) => setPlan(i, { unit: e.target.value })} /></Field>
          </div>
          <Field label="Features">
            <div>
              {plan.features.map((f, fi) => (
                <div key={fi} className={styles.featureRow}>
                  <input className={styles.input} value={f} onChange={(e) => { const features = [...plan.features]; features[fi] = e.target.value; setPlan(i, { features }); }} />
                  <button className={styles.danger} type="button" onClick={() => setPlan(i, { features: plan.features.filter((_, x) => x !== fi) })}>×</button>
                </div>
              ))}
              <button className={styles.secondary} type="button" onClick={() => setPlan(i, { features: [...plan.features, ""] })}>+ Add feature</button>
            </div>
          </Field>
          <div className={styles.row}>
            <Field label="CTA label"><input className={styles.input} value={plan.cta.label} onChange={(e) => setPlan(i, { cta: { ...plan.cta, label: e.target.value } })} /></Field>
            <Field label="CTA href"><input className={styles.input} value={plan.cta.href} onChange={(e) => setPlan(i, { cta: { ...plan.cta, href: e.target.value } })} /></Field>
          </div>
          <div className={styles.row}>
            <Field label="Badge (optional)"><input className={styles.input} value={plan.badge ?? ""} onChange={(e) => setPlan(i, { badge: e.target.value || undefined })} /></Field>
            <label className={styles.checkbox}><input type="checkbox" checked={!!plan.highlighted} onChange={(e) => setPlan(i, { highlighted: e.target.checked })} />Highlighted</label>
          </div>
        </div>
      ))}
      <div className={styles.actions}>
        <button className={styles.secondary} type="button" onClick={addPlan}>+ Add plan</button>
        <button className={styles.primary} onClick={saveAll}>Save Plans</button>
        <StatusBadge status={status} />
      </div>
    </section>
  );
}

function NewsletterEditor({ data, onChange }: { data: NewsletterData; onChange: (v: NewsletterData) => void }) {
  const { status, save } = useSaver("newsletter");
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Newsletter CTA</h2>
      <Field label="Title"><input className={styles.input} value={data.title} onChange={(e) => onChange({ ...data, title: e.target.value })} /></Field>
      <Field label="Description"><textarea className={styles.textarea} value={data.description} onChange={(e) => onChange({ ...data, description: e.target.value })} /></Field>
      <div className={styles.row}>
        <Field label="Input placeholder"><input className={styles.input} value={data.inputPlaceholder} onChange={(e) => onChange({ ...data, inputPlaceholder: e.target.value })} /></Field>
        <Field label="Button label"><input className={styles.input} value={data.buttonLabel} onChange={(e) => onChange({ ...data, buttonLabel: e.target.value })} /></Field>
      </div>
      <div className={styles.actions}>
        <button className={styles.primary} onClick={() => save(data)}>Save Newsletter</button>
        <StatusBadge status={status} />
      </div>
    </section>
  );
}

function NavEditor({ data, onChange }: { data: NavData; onChange: (v: NavData) => void }) {
  const { status, save } = useSaver("nav");
  const setLink = (idx: number, patch: Partial<NavData["links"][number]>) =>
    onChange({ ...data, links: data.links.map((l, i) => (i === idx ? { ...l, ...patch } : l)) });
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Navigation</h2>
      <Field label="Brand"><input className={styles.input} value={data.brand} onChange={(e) => onChange({ ...data, brand: e.target.value })} /></Field>
      {data.links.map((link, i) => (
        <div key={i} className={styles.row}>
          <Field label={`Link ${i + 1} label`}><input className={styles.input} value={link.label} onChange={(e) => setLink(i, { label: e.target.value })} /></Field>
          <Field label="href"><input className={styles.input} value={link.href} onChange={(e) => setLink(i, { href: e.target.value })} /></Field>
        </div>
      ))}
      <div className={styles.row}>
        <Field label="CTA label"><input className={styles.input} value={data.cta.label} onChange={(e) => onChange({ ...data, cta: { ...data.cta, label: e.target.value } })} /></Field>
        <Field label="CTA href"><input className={styles.input} value={data.cta.href} onChange={(e) => onChange({ ...data, cta: { ...data.cta, href: e.target.value } })} /></Field>
      </div>
      <div className={styles.actions}>
        <button className={styles.primary} onClick={() => save(data)}>Save Nav</button>
        <StatusBadge status={status} />
      </div>
    </section>
  );
}

function FooterEditor({ data, onChange }: { data: FooterData; onChange: (v: FooterData) => void }) {
  const { status, save } = useSaver("footer");
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Footer</h2>
      <Field label="Brand"><input className={styles.input} value={data.brand} onChange={(e) => onChange({ ...data, brand: e.target.value })} /></Field>
      <Field label="Copyright"><input className={styles.input} value={data.copyright} onChange={(e) => onChange({ ...data, copyright: e.target.value })} /></Field>
      {data.columns.map((col, ci) => (
        <div key={ci} className={styles.cardArrayItem}>
          <div className={styles.cardArrayHead}>Column {ci + 1}</div>
          {col.links.map((l, li) => (
            <div key={li} className={styles.row}>
              <Field label={`Link ${li + 1} label`}><input className={styles.input} value={l.label} onChange={(e) => { const columns = [...data.columns]; columns[ci] = { links: columns[ci].links.map((x, i) => i === li ? { ...x, label: e.target.value } : x) }; onChange({ ...data, columns }); }} /></Field>
              <Field label="href"><input className={styles.input} value={l.href} onChange={(e) => { const columns = [...data.columns]; columns[ci] = { links: columns[ci].links.map((x, i) => i === li ? { ...x, href: e.target.value } : x) }; onChange({ ...data, columns }); }} /></Field>
            </div>
          ))}
        </div>
      ))}
      <div className={styles.actions}>
        <button className={styles.primary} onClick={() => save(data)}>Save Footer</button>
        <StatusBadge status={status} />
      </div>
    </section>
  );
}

// ─── Shared CTA array editor ──────────────────────────────────────────────────

const CTA_VARIANTS: StatusCta["variant"][] = ["primary", "secondary", "text"];

function CtaArrayEditor({
  ctas,
  onChange,
  hint,
}: {
  ctas: StatusCta[];
  onChange: (v: StatusCta[]) => void;
  hint?: string;
}) {
  const update = (id: string, patch: Partial<StatusCta>) =>
    onChange(ctas.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (id: string) => onChange(ctas.filter((c) => c.id !== id));
  const add = () =>
    onChange([
      ...ctas,
      { id: `cta-${Date.now()}`, label: "New CTA", href: "#", variant: "secondary" },
    ]);

  return (
    <div className={styles.cardArrayItem}>
      <div className={styles.cardArrayHead}>
        Action CTAs
        {hint && <span style={{ fontWeight: 400, marginLeft: 8, fontSize: 12, color: "#9b8fa0" }}>{hint}</span>}
      </div>

      {ctas.map((cta, i) => (
        <div key={cta.id} style={{ borderTop: i > 0 ? "1px solid rgba(207,195,204,.3)" : undefined, paddingTop: i > 0 ? 14 : 0, marginTop: i > 0 ? 14 : 0 }}>
          <div className={styles.cardArrayHead} style={{ marginBottom: 10 }}>
            <span>CTA #{i + 1}</span>
            <button type="button" className={styles.danger} onClick={() => remove(cta.id)}>Remove</button>
          </div>
          <div className={styles.row}>
            <Field label="Label">
              <input
                className={styles.input}
                value={cta.label}
                onChange={(e) => update(cta.id, { label: e.target.value })}
              />
            </Field>
            <Field label="Emoji (optional)">
              <input
                className={styles.input}
                value={cta.emoji ?? ""}
                placeholder="e.g. 🎥"
                onChange={(e) => update(cta.id, { emoji: e.target.value || undefined })}
              />
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="Link (href)">
              <input
                className={styles.input}
                value={cta.href}
                placeholder="https://… or /path or # or {planId}"
                onChange={(e) => update(cta.id, { href: e.target.value })}
              />
            </Field>
            <Field label="Variant">
              <select
                className={styles.select}
                value={cta.variant}
                onChange={(e) => update(cta.id, { variant: e.target.value as StatusCta["variant"] })}
              >
                {CTA_VARIANTS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 12 }}>
        <button type="button" className={styles.secondary} onClick={add}>+ Add CTA</button>
      </div>
    </div>
  );
}

// ─── Booking — Success ────────────────────────────────────────────────────────

function BookingSuccessEditor({ data, onChange }: { data: BookingSuccessData; onChange: (v: BookingSuccessData) => void }) {
  const { status, save } = useSaver("bookingSuccess");
  const set = <K extends keyof BookingSuccessData>(k: K, v: BookingSuccessData[K]) =>
    onChange({ ...data, [k]: v });
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Booking — Success Page</h2>
      <p className={styles.panelHint}>Shown at <code>/book/success</code> after payment is confirmed.</p>

      <Field label="Heading"><input className={styles.input} value={data.title} onChange={(e) => set("title", e.target.value)} /></Field>
      <Field label="Subtitle"><textarea className={styles.textarea} value={data.subtitle} onChange={(e) => set("subtitle", e.target.value)} /></Field>

      <CtaArrayEditor
        ctas={data.ctas}
        onChange={(v) => set("ctas", v)}
        hint="primary = large button · secondary = row of outline buttons · text = plain link"
      />

      <div className={styles.cardArrayItem}>
        <div className={styles.cardArrayHead}>Footer Note</div>
        <Field label="Note text (before email)"><textarea className={styles.textarea} value={data.footerNote} onChange={(e) => set("footerNote", e.target.value)} /></Field>
        <div className={styles.row}>
          <Field label="Support email"><input className={styles.input} type="email" value={data.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} /></Field>
          <Field label="Copyright"><input className={styles.input} value={data.copyright} onChange={(e) => set("copyright", e.target.value)} /></Field>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.primary} onClick={() => save(data)}>Save Success Page</button>
        <StatusBadge status={status} />
      </div>
    </section>
  );
}

// ─── Booking — Failed ─────────────────────────────────────────────────────────

function BookingFailedEditor({ data, onChange }: { data: BookingFailedData; onChange: (v: BookingFailedData) => void }) {
  const { status, save } = useSaver("bookingFailed");
  const set = <K extends keyof BookingFailedData>(k: K, v: BookingFailedData[K]) =>
    onChange({ ...data, [k]: v });
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Booking — Failed Page</h2>
      <p className={styles.panelHint}>Shown at <code>/book/failed</code> when payment is unsuccessful. Use <code>{"{planId}"}</code> in any href to insert the plan from the URL.</p>

      <Field label="Heading"><input className={styles.input} value={data.title} onChange={(e) => set("title", e.target.value)} /></Field>
      <Field label="Body text"><textarea className={styles.textarea} value={data.body} onChange={(e) => set("body", e.target.value)} /></Field>

      <CtaArrayEditor
        ctas={data.ctas}
        onChange={(v) => set("ctas", v)}
        hint="primary = large retry button · secondary = outline row · use {planId} in href to append plan"
      />

      <div className={styles.cardArrayItem}>
        <div className={styles.cardArrayHead}>Troubleshooting Box</div>
        <Field label="Heading"><input className={styles.input} value={data.troubleshootTitle} onChange={(e) => set("troubleshootTitle", e.target.value)} /></Field>
        <Field label="Body"><textarea className={styles.textarea} value={data.troubleshootBody} onChange={(e) => set("troubleshootBody", e.target.value)} /></Field>
      </div>

      <div className={styles.actions}>
        <button className={styles.primary} onClick={() => save(data)}>Save Failed Page</button>
        <StatusBadge status={status} />
      </div>
    </section>
  );
}
