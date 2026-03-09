// @vitest-environment node
import { test, expect, vi } from "vitest";
import { jwtVerify } from "jose";

const mockCookieStore = { set: vi.fn(), get: vi.fn(), delete: vi.fn() };

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

test("createSession sets a valid JWT cookie with correct options", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

  const { createSession } = await import("@/lib/auth");
  await createSession("user-123", "test@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  const [cookieName, token, options] = mockCookieStore.set.mock.calls[0];

  // Cookie config
  expect(cookieName).toBe("auth-token");
  expect(options).toMatchObject({
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
  });
  expect(options.expires.getTime()).toBe(new Date("2026-01-08T00:00:00Z").getTime());

  // JWT payload
  const { payload } = await jwtVerify(token, JWT_SECRET);
  const now = Math.floor(Date.now() / 1000);

  expect(payload.userId).toBe("user-123");
  expect(payload.email).toBe("test@example.com");
  expect(payload.iat).toBe(now);
  expect(payload.exp! - now).toBe(7 * 24 * 60 * 60);
});
