export type UserRole = "administrator" | "mine_operator" | "safety_officer" | "drone_operator" | "viewer" | "regulator";

const roleLabels: Record<UserRole, string> = {
  administrator: "Administrator",
  mine_operator: "Mine Operator",
  safety_officer: "Safety Officer",
  drone_operator: "Drone Operator",
  viewer: "Viewer",
  regulator: "Regulator",
};

export function roleLabel(role?: string | null) {
  return roleLabels[(role as UserRole) ?? "viewer"] ?? "Viewer";
}

export function canManageUsers(role?: string | null) {
  return role === "administrator";
}

export function canManageSettings(role?: string | null) {
  return role === "administrator";
}

export function canManageSites(role?: string | null) {
  return role === "administrator" || role === "mine_operator";
}

export function canRunMissions(role?: string | null) {
  return role === "administrator" || role === "mine_operator" || role === "drone_operator";
}

export function canManageAlerts(role?: string | null) {
  return role === "administrator" || role === "mine_operator" || role === "safety_officer";
}

export function canApproveSafety(role?: string | null) {
  return role === "administrator" || role === "safety_officer";
}
