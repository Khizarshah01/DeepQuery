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

        let finalResult = "";
        try {
            const finalResponse = JSON.parse(answerStr);
            finalResult = finalResponse.answer;
        } catch(e) {
            finalResult = answerStr; // fallback if JSON parsing fails
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
