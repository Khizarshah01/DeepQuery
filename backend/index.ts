import express from 'express';
const { tavily } = require('@tavily/core');
import { z } from "zod";
const { zodToJsonSchema } = require("zod-to-json-schema");
const app = express();
const port = 3001;
const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
import { GoogleGenAI } from "@google/genai";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from './prompt';
import { prisma } from './db';
import crypto from 'crypto';
import type { Response } from "express";
import { authMiddleware } from './middleware'
import type { AuthedRequest } from './middleware'
import cors from "cors";

// Optional: Redis queue for background jobs
let deepResearchQueue: any = null;
try {
    const { deepResearchQueue: queue } = require('./queue');
    deepResearchQueue = queue;
    console.log('Redis queue initialized for research jobs');
} catch (e) {
    console.log('Redis queue not available; research endpoint will be disabled');
}

app.use(cors());
app.use(express.json());

// web search function
async function searchWeb(query: string) {
    return await client.search(query, {
        searchDepth: "advanced"
    });
}
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const outputSchema = z.object({
    followup: z.array(z.string()),
    answer: z.string(),
});

// conversation list 
// Helper to normalize path/query params that can be string | string[] | undefined
function normalizeParam(v: string | string[] | undefined): string | null {
    if (!v) return null;
    if (Array.isArray(v)) return v.length ? (v[0] ?? null) : null;
    return v;
}

app.get('/conversation', authMiddleware, async (req:AuthedRequest, res:Response) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const conversations = await prisma.conversation.findMany({
        where: {
            userId: userId,
        },
        orderBy: {
            updatedAt: 'desc',
        }
    });
    res.json({
        userId,
        conversations,
    });

});

// conversation detail with conversationId for chats
app.get('/conversation/:conversationId', authMiddleware, async (req:AuthedRequest, res:Response) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const conversationId = normalizeParam(req.params.conversationId);
    if (!conversationId) return res.status(400).json({ message: 'conversationId required' });

    const conversationHistory = await prisma.conversation.findFirst({
        where: {
            id: conversationId,
            userId: userId,
        },
        include: {
            messages: {
                orderBy: {
                    createdAt: 'asc',
                }
            }
        }
    })
    res.json({ conversationHistory })
});

// Update conversation (e.g. rename title)
app.patch('/conversation/:conversationId', authMiddleware, async (req:AuthedRequest, res:Response) => {
    const { title } = req.body;
    if (!title || typeof title !== 'string') {
        return res.status(400).json({ message: "Title is required" });
    }

    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const conversationId = normalizeParam(req.params.conversationId);
    if (!conversationId) return res.status(400).json({ message: 'conversationId required' });

    // Ensure the conversation belongs to the user
    const existing = await prisma.conversation.findFirst({ where: { id: conversationId, userId } });
    if (!existing) return res.status(404).json({ message: 'Conversation not found' });

    const updated = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
            title: title.trim().slice(0, 60),
        },
    });
    res.json({ conversation: updated });
});

// Delete conversation
app.delete('/conversation/:conversationId', authMiddleware, async (req:AuthedRequest, res:Response) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const conversationId = normalizeParam(req.params.conversationId);
    if (!conversationId) return res.status(400).json({ message: 'conversationId required' });

    // Ensure ownership
    const existing = await prisma.conversation.findFirst({ where: { id: conversationId, userId } });
    if (!existing) return res.status(404).json({ message: 'Conversation not found' });

    // Delete messages first (to avoid FK issues)
    await prisma.message.deleteMany({
        where: { conversationId },
    });

    await prisma.conversation.delete({
        where: { id: conversationId },
    });

    res.json({ success: true });
});

// ask question 
app.post('/ask', authMiddleware, async (req:AuthedRequest, res:Response) => {

    // user query and conversation id 
    let { conversationId: rawConversationId, userQuery } = req.body;
    let previousMessages = "";

    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    if (!userQuery || typeof userQuery !== 'string') {
        return res.status(400).json({ message: 'userQuery is required' });
    }

    // normalize conversationId (might be string | string[])
    let conversationId = normalizeParam(rawConversationId);

    if (!conversationId) {
        const conversation = await prisma.conversation.create({
            data: {
                userId: userId,
                title: userQuery.slice(0, 20),
                slug: crypto.randomUUID(),
            }
        });
        conversationId = conversation.id;
    } else {
        const prevoiusConversation = await prisma.message.findMany({
            where: {
                conversationId: conversationId,
            },
            orderBy: {
                createdAt: 'asc',
            }
        });
        previousMessages = prevoiusConversation.map(msg => `${msg.role}: ${msg.content}`).join("\n");

    }

    await prisma.message.create({
        data: {
            conversationId: conversationId,
            content: userQuery,
            role: "USER",
        }
    })

    // Setup streaming headers
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    res.write("<STATUS>Searching the web...</STATUS>\n");

    const webResponse = await searchWeb(userQuery);
    const webResults = webResponse.results;

    res.write("<STATUS>Reasoning...</STATUS>\n");

    // llm request
    const prompt = PROMPT_TEMPLATE.replace("{{CONVERSATION_HISTORY}}", previousMessages || "").replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webResults)).replace("{{USER_QUERY}}", userQuery);
    let response;
    let answer = "";
    try {
        response = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_PROMPT,
                temperature: 0.7,
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(outputSchema),
            },
        });

        for await (const chunk of response) {
            answer += chunk.text ?? "";
        }
    } catch (e) {
        console.error("Gemini API Error:", e);
        res.write("\n\nI apologize, but my core AI model is currently experiencing high demand. Please try asking your question again in a few moments.\n");
        return res.end();
    }

    // parse final resposne and store  in db
    let finalAnswerText = answer;
    let followupsText = "";
    
    // Try to extract from JSON if it's JSON
    try {
        let cleanAnswer = answer.replace(/```json/gi, "").replace(/```/g, "").trim();
        let parsed = JSON.parse(cleanAnswer);
        if (Array.isArray(parsed)) parsed = parsed[0];
        
        if (parsed && parsed.answer) finalAnswerText = parsed.answer;
        else if (parsed && parsed.ANSWER) finalAnswerText = parsed.ANSWER;
        
        if (parsed && parsed.followup) followupsText = Array.isArray(parsed.followup) ? parsed.followup.join("\n") : parsed.followup;
        else if (parsed && parsed.FOLLOWUP) followupsText = Array.isArray(parsed.FOLLOWUP) ? parsed.FOLLOWUP.join("\n") : parsed.FOLLOWUP;
    } catch (e) {
        // Not valid JSON (e.g., unescaped newlines). Try regex fallback.
        const ansMatch = answer.match(/"ANSWER"\s*:\s*"([\s\S]*?)",?\s*"FOLLOWUP"/i) || answer.match(/"ANSWER"\s*:\s*"([\s\S]*?)"\s*\}/i);
        if (ansMatch) {
            finalAnswerText = (ansMatch[1] || "").replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
        const folMatch = answer.match(/"FOLLOWUP"\s*:\s*"([\s\S]*?)"/i) || answer.match(/"FOLLOWUP"\s*:\s*(\[[\s\S]*?\])/i);
        if (folMatch) {
            followupsText = (folMatch[1] || "").replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
    }
    
    // Clean up <ANSWER> and <FOLLOWUP> tags if the model included them inside the string
    const answerMatch = finalAnswerText.match(/<ANSWER>\s*([\s\S]*?)\s*<\/ANSWER>/);
    if (answerMatch) {
        finalAnswerText = answerMatch[1] || "";
    }
    
    const followupMatch = finalAnswerText.match(/<FOLLOWUP>\s*([\s\S]*?)\s*<\/FOLLOWUP>/);
    if (followupMatch) {
        followupsText = followupMatch[1] || "";
        finalAnswerText = finalAnswerText.replace(/<FOLLOWUP>\s*([\s\S]*?)\s*<\/FOLLOWUP>/g, "");
    }
    
    res.write(finalAnswerText); // send final answer to clientside
    if (followupsText) {
        res.write(`\n<FOLLOWUP>\n${followupsText}\n</FOLLOWUP>\n`);
    }

    try {
        await prisma.message.create({
            data: {
                conversationId: conversationId,
                content: finalAnswerText,
                role: "ASSISTANT",
            }
        });

        await prisma.conversation.update({
            where: { id: conversationId },
            data: {}
        });
    } catch (dbError) {
        console.error("Failed to save to db:", dbError);
    }

    res.write(`\n<CONVERSATION_ID>${conversationId}</CONVERSATION_ID>\n`);

    // send web search results to clientside
    res.write("\n<SOURCES>\n");

    // all search result 
    res.write(JSON.stringify(webResults.map((result: any) => ({ url: result.url }))));

    res.write("\n</SOURCES>\n");


    res.end(); // streaming end
})


// follow up question
// app.post('/ask/followup', authMiddleware, async (req, res) => {
//     // get exisintg conversation context and followup question from db
//     const {conversationId, followupQuestion} = req.body;

//     // send full history to llm 

//     // stream response back to clientside 
// })

app.post('/webhook/config', authMiddleware, async (req:AuthedRequest,res:Response)=>{
    const { url } = req.body;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await prisma.webhookConfig.create({
        data: {
            userId: userId,
            url: url,
        }
    });

    res.json({ message: "Webhook configured successfully" })
})


app.post('/research', authMiddleware, async(req:AuthedRequest,res:Response)=>{
    let { conversationId: rawConversationId, userQuery } = req.body;
    if (!userQuery || typeof userQuery !== 'string') {
        return res.status(400).json({message: "userQuery is required"});
    }
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    let targetConversationId = normalizeParam(rawConversationId);

    if (targetConversationId) {
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: targetConversationId,
                userId,
            },
        });

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }
    } else {
        const conversation = await prisma.conversation.create({
            data: {
                userId,
                title: userQuery.slice(0, 20),
                slug: crypto.randomUUID(),
            },
        });
        targetConversationId = conversation.id;
    }

    await prisma.message.create({
        data: {
            conversationId: targetConversationId,
            content: userQuery,
            role: "USER",
        },
    });

    if (!deepResearchQueue) {
        return res.status(503).json({ message: "Research feature is not available" });
    }

    const jobRecord = await prisma.researchJob.create({
        data: {
            userId,
            query: userQuery,
            conversationId: targetConversationId,
            status: "PENDING",
        }
    });

    await deepResearchQueue.add('deep-research-task', {
        jobId: jobRecord.id,
        query: userQuery,
        userId,
        conversationId: targetConversationId,
    })

    res.status(202).json({message: "Research job added to queue", jobId: jobRecord.id, conversationId: targetConversationId})
})

app.get('/research/status/:jobId', authMiddleware, async(req:AuthedRequest,res:Response)=>{
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const jobId = normalizeParam(req.params.jobId);
    if (!jobId) return res.status(400).json({ message: 'jobId required' });

    const job = await prisma.researchJob.findUnique({ where: { id: jobId } });

    if (!job || job.userId !== userId){
        return res.status(404).json({message:"Job not found"})
    }
    res.json({status: job.status, result: job.result, query: job.query})
})
app.listen(port);
