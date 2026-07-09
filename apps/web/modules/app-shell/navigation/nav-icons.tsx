import {
  Contact,
  DollarSign,
  FileText,
  History,
  Home,
  LayoutGrid,
  MapPin,
  Package,
  PencilRuler,
  Ruler,
  ShieldCheck,
  ShelvingUnit,
  Tags,
  TrafficCone,
  Upload,
  UserPen,
  UserPlus,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react"

// Slug → icon map shared by the nav rail and the home launcher so both draw from
// one source of truth. Placeholder icon set drawn from lucide-react (already a
// dependency — no new packages, deploy-safe). Swap to custom artwork later by
// editing this map.
export const NAV_ICONS: Record<string, LucideIcon> = {
  "flooring-home": Home,
  "flooring-work-orders": TrafficCone,
  "templates": FileText,
  "flooring-properties": MapPin,
  "flooring-entities": Contact,
  "flooring-payments": DollarSign,
  "flooring-adjustments": PencilRuler,
  "flooring-inventory": ShelvingUnit,
  "flooring-imports": Upload,
  products: Package,
  "flooring-job-types": Wrench,
  "flooring-entity-types": Tags,
  "flooring-certificate-tracking": ShieldCheck,
  "flooring-warehouse": Warehouse,
  "flooring-unit-of-measures": Ruler,
  "flooring-categories": LayoutGrid,
  "flooring-users": UserPen,
  "flooring-invites": UserPlus,
  "flooring-user-activity": History,
}
