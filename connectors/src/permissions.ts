import { ConnectorError } from "./errors.ts";
import type { Actor, Role } from "./types.ts";

const ROLE_PERMISSIONS: Record<Role, readonly string[]> = {
  owner: [
    "integrations.manage",
    "integrations.view",
    "kitchen_ops.view",
    "kitchen_ops.edit",
    "temperatures.view",
    "temperatures.edit",
    "settings.view",
  ],
  manager: [
    "integrations.manage",
    "integrations.view",
    "kitchen_ops.view",
    "kitchen_ops.edit",
    "temperatures.view",
    "temperatures.edit",
    "settings.view",
  ],
  chef: [
    "integrations.view",
    "kitchen_ops.view",
    "kitchen_ops.edit",
    "temperatures.view",
    "temperatures.edit",
  ],
  staff: ["kitchen_ops.view", "temperatures.view"],
};

const ID = /^[A-Za-z0-9_.:-]{1,80}$/;
const ROLES = new Set<Role>(["owner", "manager", "chef", "staff"]);

export function assertActor(actor: Actor): void {
  if (!actor || typeof actor !== "object") {
    throw new ConnectorError("validation", "Missing actor.");
  }
  if (typeof actor.companyId !== "string" || !ID.test(actor.companyId)) {
    throw new ConnectorError("validation", "Company id is invalid.");
  }
  if (typeof actor.userId !== "string" || !ID.test(actor.userId)) {
    throw new ConnectorError("validation", "User id is invalid.");
  }
  if (!ROLES.has(actor.role)) {
    throw new ConnectorError("validation", "Role is invalid.");
  }
}

export function permissionsOf(actor: Actor): Set<string> {
  if (actor.permissions) return new Set(actor.permissions);
  return new Set(ROLE_PERMISSIONS[actor.role]);
}

export function hasPermission(actor: Actor, permission: string): boolean {
  return permissionsOf(actor).has(permission);
}

export function assertPermission(actor: Actor, permission: string): void {
  if (!hasPermission(actor, permission)) {
    throw new ConnectorError("forbidden", "You do not have permission to do that.");
  }
}
