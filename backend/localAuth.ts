import crypto from "crypto";

const PREFIX = "local.";
const SECRET = process.env.LOCAL_AUTH_SECRET || "deepquery-local-dev-secret";

export function isLocalRequest(req: { hostname?: string; headers: { origin?: string; host?: string } }) {
    const host = `${req.hostname || ""} ${req.headers.host || ""} ${req.headers.origin || ""}`.toLowerCase();
    return host.includes("localhost") || host.includes("127.0.0.1");
}

export function signLocalToken(userId: string) {
    const payload = Buffer.from(JSON.stringify({ userId })).toString("base64url");
    const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
    return `${PREFIX}${payload}.${sig}`;
}

export function verifyLocalToken(token: string): string | null {
    if (!token.startsWith(PREFIX)) return null;

    const raw = token.slice(PREFIX.length);
    const separator = raw.lastIndexOf(".");
    if (separator <= 0) return null;

    const payload = raw.slice(0, separator);
    const sig = raw.slice(separator + 1);
    const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    try {
        const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        return typeof data.userId === "string" ? data.userId : null;
    } catch {
        return null;
    }
}
