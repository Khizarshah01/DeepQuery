import type { NextFunction, Request, Response } from "express";
import { createSupabaseClient } from "./client";
import { prisma } from "./db";
import { verifyLocalToken } from "./localAuth";

export type AuthedRequest = Request & { userId?: string };

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
        return res.status(403).json({ error: "incorrect token" });
    }

    const localUserId = verifyLocalToken(token);
    if (localUserId) {
        const localUser = await prisma.user.findUnique({ where: { id: localUserId } });
        if (!localUser) {
            return res.status(403).json({ error: "incorrect token" });
        }
        (req as AuthedRequest).userId = localUser.id;
        return next();
    }

    try {
        let client;
        try {
            client = createSupabaseClient();
        } catch (configError) {
            console.error("Supabase is not configured:", configError);
            return res.status(503).json({
                error: "Supabase is not configured. Add PUBLIC_SUPABASE_URL and SECRET_KEY_BASE to backend/.env",
            });
        }

        const { data: { user }, error } = await client.auth.getUser(token);
        
        if (error || !user) {
            console.error("Auth getUser failed:", error?.message || "no user");
            return res.status(403).json({ error: "incorrect token" });
        }

        const userId = user.id;
        const email = user.email || `${userId}@users.local`;
        const name =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.user_metadata?.user_name ||
            email.split("@")[0] ||
            "User";
        const Auth = user.app_metadata?.provider === "github" ? "GITHUB" : "GOOGLE";
        
        try {
            await prisma.user.upsert({
                where: { id: userId },
                update: {
                    email,
                    name,
                },
                create: {
                    id: userId,
                    supabaseId: userId,
                    email,
                    Auth,
                    name,
                }
            });
        } catch (dbError) {
            console.error("Database sync error:", dbError);
            return res.status(500).json({ error: "Failed to sync user to database" });
        }   

        (req as AuthedRequest).userId = userId;
        next();
    } catch (err) {
        return res.status(403).json({ error: "Unauthorized" });
    }
}
