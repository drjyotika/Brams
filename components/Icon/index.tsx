import {
  Activity,
  Baby,
  BadgeCheck,
  Brain,
  Calendar,
  CloudRain,
  Compass,
  Flame,
  HeartHandshake,
  HeartPulse,
  Leaf,
  Moon,
  ShieldCheck,
  Smile,
  Sparkles,
  Target,
  Users,
  Video,
  Wind,
  Zap,
  ArrowRight,
  Check,
  type LucideIcon,
} from "lucide-react";

const REGISTRY: Record<string, LucideIcon> = {
  activity: Activity,
  baby: Baby,
  "badge-check": BadgeCheck,
  brain: Brain,
  calendar: Calendar,
  "cloud-rain": CloudRain,
  compass: Compass,
  flame: Flame,
  "heart-handshake": HeartHandshake,
  "heart-pulse": HeartPulse,
  leaf: Leaf,
  moon: Moon,
  shield: ShieldCheck,
  smile: Smile,
  sparkles: Sparkles,
  target: Target,
  users: Users,
  video: Video,
  wind: Wind,
  zap: Zap,
  "arrow-right": ArrowRight,
  check: Check,
};

export const ICON_NAMES = Object.keys(REGISTRY);

// Pick a sensible icon based on words in the heading. Used by the admin panel
// when creating a new card so the default icon matches what the admin typed.
const KEYWORD_TO_ICON: Array<[RegExp, string]> = [
  [/\b(anxiety|panic|stress|worr)/i, "wind"],
  [/\b(depress|mood|sad|hopeless)/i, "cloud-rain"],
  [/\b(focus|adhd|attention|concentr)/i, "target"],
  [/\b(trauma|ptsd|recover|safe)/i, "shield"],
  [/\b(addict|substance|alcohol|nicotine|cannabis|drug|relapse)/i, "flame"],
  [/\b(child|adolescent|teen|kid|parent)/i, "users"],
  [/\b(infant|toddler|baby)/i, "baby"],
  [/\b(sleep|insomnia|night|dream)/i, "moon"],
  [/\b(couple|relationship|family|marriage)/i, "heart-handshake"],
  [/\b(grief|loss|berea)/i, "leaf"],
  [/\b(self.?esteem|confidence|joy|happi)/i, "smile"],
  [/\b(burn.?out|fatigue|exhaust|energy)/i, "zap"],
  [/\b(direct|career|life|coach|guid)/i, "compass"],
  [/\b(med|prescription|pharmac)/i, "heart-pulse"],
  [/\b(mind|cogniti|memory|brain|psych)/i, "brain"],
  [/\b(spark|wellness|holistic|wellbeing)/i, "sparkles"],
];

export function pickIconForHeading(heading: string): string {
  for (const [re, icon] of KEYWORD_TO_ICON) {
    if (re.test(heading)) return icon;
  }
  return "sparkles";
}

export function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  className,
}: {
  name: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const Cmp = REGISTRY[name] ?? Sparkles;
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}
