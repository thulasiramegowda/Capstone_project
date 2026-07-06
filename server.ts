import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON middleware
  app.use(express.json({ limit: "50mb" }));

  // Initialize server-side Gemini client
  const getGeminiClient = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please add your key under the Secrets panel or .env file.");
    }
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // API 1: Document Analysis Proxy
  app.post("/api/analyze", async (req, res) => {
    try {
      const { documentText, taskType, modelChoice, temperature, userQuery } = req.body;

      if (!documentText) {
        return res.status(400).json({ error: "No document content provided." });
      }

      // 1. Get system instructions based on the selected task
      let systemPrompt = "";
      if (taskType === "Summarize") {
        systemPrompt = `
You are an expert Executive Assistant and Principal Research Analyst. 
Your task is to analyze the provided document content and generate a highly professional, structured, and insightful executive summary.

Please organize your response into the following clear sections:
1.  **Executive Overview**: A high-level 2-3 sentence summary of the document's main objective and core message.
2.  **Key Strategic Takeaways**: A bulleted list of the 4-6 most critical points, insights, or findings.
3.  **Actionable Recommendations**: Clear, actionable next steps or strategic recommendations based on the content.
4.  **Structural Outline**: A brief overview of the topics covered in the document.

Maintain an objective, professional, and sophisticated business tone. If the document lacks sufficient detail for a section, state that clearly rather than making things up.
`;
      } else if (taskType === "Q&A") {
        systemPrompt = `
You are an advanced Document Intelligence Specialist. Your objective is to answer the user's specific query based strictly and only on the provided document content.

**Strict Guidelines:**
1.  Base your answers only on the facts directly mentioned in the document. Do not extrapolate, assume, or bring in outside knowledge unless specifically requested to compare.
2.  If the answer to the query cannot be found or reasonably inferred from the document, explicitly state: "I cannot find the answer to this question in the provided document."
3.  Cite specific sections, headings, or quotes from the text to support your answers whenever possible.
4.  Present complex information using clear formatting, bullet points, or tables.
`;
      } else if (taskType === "Technical Review") {
        systemPrompt = `
You are a Principal Software Engineer and System Architect. Your task is to perform a rigorous technical review of the code, configuration, or technical documentation provided.

Please evaluate the content across the following dimensions:
1.  **Architecture & Design**: Assess the overall architectural soundness and modularity.
2.  **Security & Vulnerability Analysis**: Identify potential security risks, data exposure, or vulnerability patterns.
3.  **Code Quality & Best Practices**: Highlight code smells, styling violations, or suboptimal patterns.
4.  **Performance & Scaling**: Pinpoint bottlenecks, memory issues, or scalability concerns.
5.  **Refactoring Solution**: Provide a complete, optimized code block or concrete recommendations showing how to implement the suggested fixes.

Ensure your tone is constructive, highly technical, and precise.
`;
      } else if (taskType === "Refine & Polish") {
        systemPrompt = `
You are a Professional Editor and Communications Expert. Your objective is to refine, polish, and optimize the provided text or document.

Please adapt the input text to be:
1.  More concise and clear, eliminating fluff and passive phrasing.
2.  Grammatically pristine with enhanced word choices.
3.  Better organized for readability (using strong headings, bold key terms, and bullet points where appropriate).

Please provide:
- A brief bulleted explanation of the specific improvements you made.
- The complete polished rewrite of the document.
`;
      } else {
        systemPrompt = "You are a helpful assistant analyzing document content.";
      }

      // 2. Format user prompt
      let userPrompt = "";
      if (taskType === "Q&A") {
        userPrompt = `--- DOCUMENT START ---\n${documentText}\n--- DOCUMENT END ---\n\nUser Query: ${userQuery || "Please summarize the main points."}`;
      } else {
        userPrompt = `Please analyze the following document:\n\n--- DOCUMENT START ---\n${documentText}\n--- DOCUMENT END ---`;
      }

      // Initialize Gemini
      const ai = getGeminiClient();

      // Model choice mapping / fallback to gemini-3.5-flash for client-side API
      // Since the user selected "gemini-2.5-flash", we use "gemini-3.5-flash" on our TS server
      // which is the recommended default basic text model from the gemini-api skill.
      const model = "gemini-3.5-flash";

      const response = await ai.models.generateContent({
        model: model,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: temperature || 0.2,
        },
      });

      if (!response || !response.text) {
        throw new Error("Empty response returned from Gemini API");
      }

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // API 2: Retrieve written project files
  app.get("/api/files", (req, res) => {
    try {
      const filesList = [
        { name: "app.py", path: "./app.py" },
        { name: "tools.py", path: "./tools.py" },
        { name: "prompts.py", path: "./prompts.py" },
        { name: "requirements.txt", path: "./requirements.txt" },
        { name: ".env", path: "./.env" },
        { name: ".gitignore", path: "./.gitignore" },
      ];

      const filesContent = filesList.map((f) => {
        const fullPath = path.resolve(process.cwd(), f.path);
        let content = "";
        try {
          if (fs.existsSync(fullPath)) {
            content = fs.readFileSync(fullPath, "utf-8");
          } else {
            content = `# File not found: ${f.name}`;
          }
        } catch (e: any) {
          content = `# Error reading ${f.name}: ${e.message}`;
        }
        return {
          name: f.name,
          content: content,
        };
      });

      res.json({ files: filesContent });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API 3: Status check
  app.get("/api/status", (req, res) => {
    res.json({ hasApiKey: !!process.env.GEMINI_API_KEY });
  });

  // Serve static UI / Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
