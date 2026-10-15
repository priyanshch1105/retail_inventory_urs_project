import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { allowRoles, authRequired } from "../server/auth";

function response() {
  const res: any = { statusCode: 200, body: undefined, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; } };
  return res;
}

describe("role access control", () => {
  beforeEach(() => { process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long"; });

  it("allows the configured role and denies an unauthorized role", () => {
    const next = vi.fn();
    const middleware = allowRoles("Admin");
    const adminRes = response();
    middleware({ user: { id: "a1", name: "A", email: "a@test", role: "Admin" } } as any, adminRes, next);
    expect(next).toHaveBeenCalledOnce();

    next.mockClear();
    const staffRes = response();
    middleware({ user: { id: "s1", name: "S", email: "s@test", role: "Staff" } } as any, staffRes, next);
    expect(staffRes.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a missing bearer token", () => {
    const res = response();
    const next = vi.fn();
    authRequired({ headers: {} } as any, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an expired JWT", () => {
    const token = jwt.sign({ id: "s1", name: "S", email: "s@test", role: "Staff" }, process.env.JWT_SECRET!, { expiresIn: -1 });
    const res = response();
    const next = vi.fn();
    authRequired({ headers: { authorization: `Bearer ${token}` } } as any, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
