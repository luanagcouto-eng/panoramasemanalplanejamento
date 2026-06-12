import { z } from "zod";

export const profileRoleSchema = z.enum(["admin", "planner", "viewer"]);

export const profileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(1).nullable(),
  email: z.string().email(),
  role: profileRoleSchema.default("viewer"),
  avatar_url: z.string().url().nullable(),
  tenant_id: z.string().uuid().nullable(),
});

export type Profile = z.infer<typeof profileSchema>;
export type ProfileRole = z.infer<typeof profileRoleSchema>;
