import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

// Diagnostic endpoint — visit /api/health to see storage status.
export async function GET() {
  const cwd = process.cwd();

  const probe = async (p: string) => {
    try {
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, "ok", "utf8");
      await fs.unlink(p);
      return "writable";
    } catch (e) {
      return (e as NodeJS.ErrnoException).code ?? "error";
    }
  };

  const [cwdProbe, tmpProbe] = await Promise.all([
    probe(path.join(cwd, "data", "_probe.tmp")),
    probe("/tmp/_brams_probe.tmp"),
  ]);

  return NextResponse.json({
    ok: true,
    env: {
      VERCEL: process.env.VERCEL ?? null,
      BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? "set" : "not set",
      NODE_ENV: process.env.NODE_ENV,
    },
    cwd,
    cwdWritable: cwdProbe,
    tmpWritable: tmpProbe,
    storageMode:
      process.env.BLOB_READ_WRITE_TOKEN
        ? "vercel-blob"
        : cwdProbe === "writable"
        ? "local-file"
        : "tmp-fallback",
  });
}
