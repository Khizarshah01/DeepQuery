import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from './db';
import { GoogleGenAI } from '@google/genai';
import { z } from "zod";
const { zodToJsonSchema } = require("zod-to-json-schema");
const { tavily } = require('@tavily/core');
import { SYSTEM_PROMPT, PROMPT_TEMPLATE } from './prompt';

const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null
});
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

const outputSchema = z.object({
    followup: z.array(z.string()),
    answer: z.string(),
});

function parseResearchResponse(answerStr: string) {
    let finalResult = answerStr;
    let followupsText = "";

    try {
        let cleanAnswer = answerStr.replace(/```json/gi, "").replace(/```/g, "").trim();
        let parsed = JSON.parse(cleanAnswer);
        if (Array.isArray(parsed)) parsed = parsed[0];

        if (parsed && typeof parsed.answer === "string") finalResult = parsed.answer;
        else if (parsed && typeof parsed.ANSWER === "string") finalResult = parsed.ANSWER;

        if (parsed && parsed.followup) followupsText = Array.isArray(parsed.followup) ? parsed.followup.join("\n") : String(parsed.followup);
        else if (parsed && parsed.FOLLOWUP) followupsText = Array.isArray(parsed.FOLLOWUP) ? parsed.FOLLOWUP.join("\n") : String(parsed.FOLLOWUP);
    } catch(e) {
        const ansMatch = answerStr.match(/"ANSWER"\s*:\s*"([\s\S]*?)",?\s*"FOLLOWUP"/i) || answerStr.match(/"ANSWER"\s*:\s*"([\s\S]*?)"\s*\}/i);
        if (ansMatch) {
            finalResult = (ansMatch[1] || "").replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }

        const folMatch = answerStr.match(/"FOLLOWUP"\s*:\s*"([\s\S]*?)"/i) || answerStr.match(/"FOLLOWUP"\s*:\s*(\[[\s\S]*?\])/i);
        if (folMatch) {
            followupsText = (folMatch[1] || "").replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
    }

    const answerMatch = finalResult.match(/<ANSWER>\s*([\s\S]*?)\s*<\/ANSWER>/i);
    if (answerMatch) {
        finalResult = answerMatch[1] || "";
    }

    const followupMatch = finalResult.match(/<FOLLOWUP>\s*([\s\S]*?)\s*<\/FOLLOWUP>/i);
    if (followupMatch) {
        followupsText = followupMatch[1] || "";
        finalResult = finalResult.replace(/<FOLLOWUP>\s*([\s\S]*?)\s*<\/FOLLOWUP>/gi, "");
    }

    finalResult = finalResult.trim();
    if (!finalResult) {
        finalResult = answerStr.trim() || "Deep research completed, but no answer text was returned.";
    }

    if (followupsText.trim()) {
        finalResult += `\n<FOLLOWUP>\n${followupsText.trim()}\n</FOLLOWUP>`;
    }

    return finalResult;
}

export const deepResearchWorker = new Worker('DeepResearch', async (job: Job) => {
    const { jobId, query, userId, conversationId } = job.data;
    
    // 1. Update status to PROCESSING
    await prisma.researchJob.update({
        where: { id: jobId },
        data: { status: 'PROCESSING' }
    });

    try {
        console.log(`Starting deep research for job ${jobId}: "${query}"`);
        
        // 2. Heavy work (Simulate multiple searches or deep research)
        const webResponse = await tavilyClient.search(query, { searchDepth: "advanced" });
        const webResults = webResponse.results;

        // Fetch previous conversation if conversationId is provided
        let previousMessages = "";
        if (conversationId) {
            const previousConversation = await prisma.message.findMany({
                where: { conversationId },
                orderBy: { createdAt: 'asc' }
            });
            previousMessages = previousConversation.map((msg: any) => `${msg.role}: ${msg.content}`).join("\n");
        }

        const prompt = PROMPT_TEMPLATE
            .replace("{{CONVERSATION_HISTORY}}", previousMessages)
            .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webResults))
            .replace("{{USER_QUERY}}", query);
        
        // 3. Query Gemini
        const response = await ai.models.generateContentStream({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_PROMPT,
                temperature: 0.7,
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(outputSchema),
            },
        });
        
        let answerStr = "";
        for await (const chunk of response) {
            answerStr += chunk.text ?? "";
        }

        const finalResult = parseResearchResponse(answerStr);

        if (conversationId) {
            await prisma.message.create({
                data: {
                    conversationId,
                    content: finalResult,
                    role: 'ASSISTANT',
                }
            });

            await prisma.conversation.update({
                where: { id: conversationId },
                data: {}
            });
        }

        // 4. Update status to COMPLETED and save result
        await prisma.researchJob.update({
            where: { id: jobId },
            data: { status: 'COMPLETED', result: finalResult }
        });

        // 5. Trigger Webhook if configured
        const webhookConfig = await prisma.webhookConfig.findFirst({
            where: { userId }
        });

        if (webhookConfig && webhookConfig.url) {
            console.log(`Triggering webhook for user ${userId} at ${webhookConfig.url}`);
            try {
                await fetch(webhookConfig.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: `Deep Research Complete for: "${query}"`,
                        result: finalResult,
                        sources: webResults.map((r: any) => r.url)
                    })
                });
            } catch(e) {
                console.error("Failed to trigger webhook:", e);
            }
        }

        return finalResult;
    } catch (error) {
        // Handle failure
        console.error(`Job ${jobId} failed:`, error);
        await prisma.researchJob.update({
            where: { id: jobId },
            data: { status: 'FAILED' }
        });
        throw error;
    }
}, { 
    connection,
    concurrency: 5, // Process up to 5 jobs concurrently
});

deepResearchWorker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed successfully!`);
});

deepResearchWorker.on('failed', (job, err) => {
    console.log(`Job ${job?.id} has failed with ${err.message}`);
});

console.log("Deep Research Worker is running and waiting for jobs...");
