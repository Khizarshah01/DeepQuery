import express from 'express';
const { tavily } = require('@tavily/core');
import { z } from "zod";
const { zodToJsonSchema } = require("zod-to-json-schema");
const app = express();
const port = 3000;
const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
import { GoogleGenAI } from "@google/genai";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from './prompt';
app.use(express.json());
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const outputSchema = z.object({
    followup: z.array(z.string()),
    answer: z.string(),
});


app.post('/conversation', async (req, res) => {

    // user query
    const userQuery = req.body.query;


    // search the query
    const webResponse = await client.search(userQuery, {
        searchDepth: "advanced"
    });

    //response from web search
    const webResults = webResponse.results;

    // llm request
    const prompt = PROMPT_TEMPLATE.replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webResults)).replace("{{USER_QUERY}}", userQuery);
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

    // data streaming chunk by chunk
    for await (const chunk of response) {
        res.write(chunk.text ?? ""); // send chunk to clientside
    } 

    // send web search results to clientside
    res.write("------SOURCEs------\n");
    // all search result 
    webResults.forEach((result: any) => res.write(JSON.stringify(result)));
    res.end(); // streaming end
})

app.listen(port);