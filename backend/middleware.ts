import type { NextFunction, Request, Response } from "express";
import { createSupabaseClient } from "./client";
import { prisma } from "./db";

export type AuthedRequest = Request & { userId?: string };

const client = createSupabaseClient();

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
        return res.status(403).json({ error: "incorrect token" });
    }

    try {
        const { data: { user }, error } = await client.auth.getUser(token);
        
        if (error || !user) {
            return res.status(403).json({ error: "incorrect token" });
        }

        const userId = user.id;
        
        try {
            await prisma.user.upsert({
                where: { id: userId },
                update: {
                    email: user.email as string,
                    name: user.user_metadata.full_name as string,
                },
                create: {
                    id: userId,
                    supabaseId: userId,
                    email: user.email as string,
                    Auth: user.app_metadata.provider === "google" ? "GOOGLE" : "GITHUB", 
                    name: user.user_metadata.full_name as string,
                }
            });
        } catch (dbError) {
            console.error("Database sync error:", dbError);
        }   

        (req as AuthedRequest).userId = userId;
        next();
    } catch (err) {
        return res.status(403).json({ error: "Unauthorized" });
    }
}
