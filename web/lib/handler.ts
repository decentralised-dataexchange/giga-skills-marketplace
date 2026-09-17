// Route-handler wrapper: one place for auth, role checks, body parsing,
// and the {"error": ...} response shape. Keeps every endpoint tiny.
import { NextResponse } from "next/server";
import { ensureReady } from "./db";
import { type Role, type User, userFromRequest } from "./auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface Ctx<P = Record<string, string>> {
  req: Request;
  user: User | null;
  params: P;
  body: <T = Record<string, unknown>>() => Promise<T>;
}

interface Options {
  roles?: readonly Role[]; // require one of these roles
  auth?: boolean; // require any signed-in user
}

type Handler<P> = (ctx: Ctx<P>) => Promise<Response | object>;

export function route<P = Record<string, string>>(handler: Handler<P>, opts: Options = {}) {
  return async (req: Request, routeCtx?: { params: Promise<P> }): Promise<Response> => {
    try {
      await ensureReady();
      const user = await userFromRequest(req);
      if ((opts.auth || opts.roles) && !user) throw new ApiError(401, "Sign in required");
      if (opts.roles && user && !opts.roles.includes(user.role)) {
        throw new ApiError(403, `Requires role: ${opts.roles.join(" or ")}`);
      }
      const params = (await routeCtx?.params) ?? ({} as P);
      const body = async <T>() => (await req.json().catch(() => ({}))) as T;
      const result = await handler({ req, user, params, body });
      return result instanceof Response ? result : NextResponse.json(result);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error(err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

/** Assert inside a handler; throws the ApiError shape on failure. */
export function check(condition: unknown, status: number, message: string): asserts condition {
  if (!condition) throw new ApiError(status, message);
}
