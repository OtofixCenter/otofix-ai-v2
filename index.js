import express from 'express';
import multer from 'multer';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

// Use Vercel's environment variable for the API key.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set in environment variables.");
  process.exit(1);
}

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

app.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    const { brand, model, year, type } = req.body;
    const imageData = req.file;

    if (!imageData) {
      return res.status(400).json({ error: 'Image not uploaded.' });
    }
    
    const prompt = `
    This is an image of a vehicle part.
    Vehicle Details:
    - Type: ${type}
    - Brand: ${brand}
    - Model: ${model}
    - Year: ${year}

    Task:
    1. Analyze the image to identify the part and any potential issues or damage (e.g., rust, cracks, wear and tear).
    2. Provide a detailed diagnosis and suggest a solution for the identified problem.
    3. Based on the diagnosis, recommend a replacement part. The format for the recommendation should be: "Part Name: https://www.gallacenter.com/part-link". Use a mock link for this purpose.
    4. Provide the response in Turkish.
    `;

    const modelAPI = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await modelAPI.generateContent([prompt, { inlineData: { data: imageData.buffer.toString('base64'), mimeType: imageData.mimetype } }]);
    const response = await result.response;
    const text = response.text();

    res.json({ result: text });
  } catch (error) {
    console.error('Error during image analysis:', error);
    res.status(500).json({ error: 'An error occurred while analyzing the image.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
