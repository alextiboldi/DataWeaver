import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";

interface SignupBody {
  name?: string;
  email?: string;
  password?: string;
}

export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json()) as SignupBody;

  if (!body.email || typeof body.email !== "string" || !body.email.includes("@")) {
    return NextResponse.json(
      { error: "Valid email is required" },
      { status: 400 }
    );
  }

  if (!body.password || typeof body.password !== "string" || body.password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(body.password, 12);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name?.trim() || null,
      hashedPassword,
      role: "editor",
    },
  });

  return NextResponse.json(
    { user: { id: user.id, email: user.email, name: user.name } },
    { status: 201 }
  );
}
