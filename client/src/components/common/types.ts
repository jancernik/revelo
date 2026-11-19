export type ButtonColor = "primary" | "secondary"

export type IconName = Exclude<
  keyof typeof import("@lucide/vue"),
  "createLucideIcon" | "Icon" | "icons" | "LUCIDE_CONTEXT" | "setLucideProps" | "useLucideProps"
>

export interface SwitchOption {
  icon?: IconName
  label?: string
  value: string
}
