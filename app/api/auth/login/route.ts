import { NextResponse } from "next/server";
import {
  findUserByUsername,
  verifyPassword,
  recordLogin,
  recordFailedLogin,
  isAccountLocked,
} from "../../../../lib/users";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "../../../../lib/auth";

export async function POST(req: Request) {
  try {
    const { username, password } = (await req.json()) as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    const user = await findUserByUsername(username);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Check account lock
    if (await isAccountLocked(user)) {
      return NextResponse.json(
        { error: "Account temporarily locked. Please try again later." },
        { status: 423 }
      );
    }

    // Verify password
    if (!verifyPassword(password, user.password_hash)) {
      await recordFailedLogin(user.id);
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Success — create session
    await recordLogin(user.id);
    const token = await createSessionToken();
    const res   = NextResponse.json({ ok: true, role: user.role });

    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
      maxAge:   SESSION_MAX_AGE,
    });

    return res;
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
