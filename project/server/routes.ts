import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import sharp from "sharp";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { insertProblemSchema } from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export function registerRoutes(app: Express): Server {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  app.post("/api/problems", upload.single("image"), async (req, res) => {
    try {
      console.log("Received form data:", {
        question: req.body.question,
        hasImage: !!req.file,
        file: req.file ? {
          fieldname: req.file.fieldname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : null
      });

      if (!req.body.question) {
        throw new Error("Question is required");
      }

      let imageData;
      if (req.file) {
        console.log("Processing image...");
        try {
          const processedImage = await sharp(req.file.buffer)
            .resize(800, 800, { fit: "inside" })
            .jpeg()
            .toBuffer();

          imageData = processedImage;
          console.log("Image processed successfully");
        } catch (error) {
          console.error("Error processing image:", error);
          throw new Error("Failed to process image");
        }
      }

      const problemData = insertProblemSchema.parse({
        question: req.body.question,
        imageUrl: imageData ? `data:image/jpeg;base64,${imageData.toString('base64')}` : undefined,
      });

      const problem = await storage.createProblem(problemData);

      try {
        const result = await model.generateContent({
          contents: [{
            role: "user",
            parts: [
              { text: `Please solve this math or science problem and provide a detailed explanation. Format mathematical expressions using LaTeX notation ($...$ for inline math and $$...$$ for display math): ${problemData.question}` },
              ...(imageData ? [{
                inlineData: {
                  data: imageData.toString('base64'),
                  mimeType: "image/jpeg"
                }
              }] : [])
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
          ],
        });

        const response = await result.response;
        const text = response.text();

        problem.solution = {
          text: text,
        };
      } catch (error) {
        console.error('Gemini API Error:', error);
        problem.solution = {
          text: "Unable to process request",
          error: error instanceof Error ? error.message : "Unknown error occurred while processing your request",
        };
      }

      res.json(problem);
    } catch (error) {
      console.error('Request Error:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Invalid request" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}