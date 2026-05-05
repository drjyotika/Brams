import {
  BadgeCheck,
  Calendar,
  CloudRain,
  HeartPulse,
  ShieldCheck,
  Target,
  Video,
  Wind,
  ArrowRight,
  Check,
  type LucideIcon,
} from "lucide-react";

const REGISTRY: Record<string, LucideIcon> = {
  "badge-check": BadgeCheck,
  calendar: Calendar,
  "cloud-rain": CloudRain,
  "heart-pulse": HeartPulse,
  shield: ShieldCheck,
  target: Target,
  video: Video,
  wind: Wind,
  "arrow-right": ArrowRight,
  check: Check,
};

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
  const Cmp = REGISTRY[name] ?? Wind;
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}
