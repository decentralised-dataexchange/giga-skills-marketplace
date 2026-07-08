import { route } from "@/lib/handler";

export const GET = route(async ({ user }) => ({
  user: user ? { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status } : null,
}));
