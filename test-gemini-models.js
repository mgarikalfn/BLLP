require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
async function list() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.error("No API key"); return; }
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await resp.json();
  console.log(data.models.map(m => m.name).join('\n'));
}
list();
