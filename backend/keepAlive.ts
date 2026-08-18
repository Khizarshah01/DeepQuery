import { prisma } from "./db";

const MAX_ROWS = 10;

function randomName(length = 12) {
    const offset = "a".charCodeAt(0);
    let value = "";
    for (let i = 0; i < length; i++) {
        value += String.fromCharCode(offset + Math.floor(Math.random() * 26));
    }
    return value;
}

export async function touchKeepAlive() {
    const existing = await prisma.keepAlive.findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true },
    });

    if (existing.length >= MAX_ROWS) {
        const oldest = existing[0];
        if (oldest) {
            await prisma.keepAlive.delete({ where: { id: oldest.id } });
        }
        return {
            ok: true,
            action: "deleted",
            rows: existing.length - 1,
        };
    }

    await prisma.keepAlive.create({
        data: { name: randomName() },
    });

    return {
        ok: true,
        action: "inserted",
        rows: existing.length + 1,
    };
}
