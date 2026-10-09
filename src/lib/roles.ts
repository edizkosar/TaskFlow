export const ROLES = ["owner", "admin", "member"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Sahip",
  admin: "Yönetici",
  member: "Üye",
};

const RANK: Record<Role, number> = { member: 1, admin: 2, owner: 3 };

/** Better Auth stores roles as a comma-separated string; we use one role per member. */
export function parseRole(value: string): Role {
  const roles = value.split(",").map((r) => r.trim());
  return ROLES.find((r) => roles.includes(r)) ?? "member";
}

export function hasRole(role: Role, min: Role) {
  return RANK[role] >= RANK[min];
}

/** Roles the viewer may assign to others (mirrors Better Auth's server rules). */
export function assignableRoles(viewer: Role): Role[] {
  if (viewer === "owner") return ["owner", "admin", "member"];
  if (viewer === "admin") return ["admin", "member"];
  return [];
}

/** Whether the viewer may change the role of / remove a member with `target` role. */
export function canManage(viewer: Role, target: Role) {
  if (viewer === "owner") return true;
  if (viewer === "admin") return target !== "owner";
  return false;
}
