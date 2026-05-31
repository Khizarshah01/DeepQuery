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
import { authMiddleware } from './middleware';
import cors from "cors";

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
app.get('/conversation', authMiddleware, async (req, res) => {
    const conversations = await prisma.conversation.findMany({
        where: {
            userId: req.userId,
        },
        orderBy: {
            updatedAt: 'desc',
        }
    });
    res.json({
        userId: (req as any).userId,
        conversations,
    });

});

// conversation detail with conversationId for chats
app.get('/conversation/:conversationId', authMiddleware, async (req, res) => {
    const conversationHistory = await prisma.conversation.findFirst({
        where: {
            id: req.params.conversationId,
            userId: req.userId,
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

// ask question 
app.post('/ask', authMiddleware, async (req, res) => {

    // user query and conversation id 
    let { conversationId, userQuery } = req.body;
    let previousMessages = "";

    if (!conversationId) {
        const conversation = await prisma.conversation.create({
            data: {
                userId: req.userId,
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

    const webResponse = await searchWeb(userQuery);
    const webResults = webResponse.results;

    // llm request
    const prompt = PROMPT_TEMPLATE.replace("{{CONVERSATION_HISTORY}}", previousMessages || "").replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webResults)).replace("{{USER_QUERY}}", userQuery);
    let response;
    try {

        response = await ai.models.generateContentStream({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_PROMPT,
                temperature: 0.7,
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(outputSchema),
            },
        });

    } catch (e) {
        console.error("Gemini API Error:", e);

        return res.status(500).json({
            message: "AI service temporarily unavailable",
        });
    }
    let answer = "";
    for await (const chunk of response) {
        answer += chunk.text ?? "";
    }

    // parse final resposne and store  in db
    let finalResponse;
    try {
        finalResponse = JSON.parse(answer);
        res.write(finalResponse.answer); // send final answer to clientside
    }
    catch (e) {
        console.error("Failed to parse LLM response:", e);
        return res.status(500).json({
            message: "Failed to parse LLM response",
        });
    }

    await prisma.message.create({
        data: {
            conversationId: conversationId,
            content: finalResponse.answer,
            role: "ASSISTANT",
        }
    });

    await prisma.conversation.update({
        where: {
            id: conversationId,
        },
        data: {}
    });

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

app.listen(port);