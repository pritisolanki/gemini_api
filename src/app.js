const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const  bodyParser = require('body-parser');
const app = express();

const {
  VertexAI,
  HarmCategory,
  HarmBlockThreshold,
} = require('@google-cloud/vertexai');

const project = 'orbital-outpost-419022';
const location = 'us-central1';
const visionModel = 'gemini-1.0-pro-vision';

app.use(bodyParser.json({ limit: '10mb' }));
const  vertexAI = new VertexAI({project: project, location: location})
const generativeVisionModel = vertexAI.getGenerativeModel({
  model: visionModel,
  safety_settings: [
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
  ],
  generation_config: {max_output_tokens: 10, temperature: 0.1},
});

// Sample data (replace with your data source)
function fileToGenerativePart(path, mimeType) {
    return {
      inlineData: {
        data: Buffer.from(fs.readFileSync(path)).toString("base64"),
        mimeType
      },
    };
}

function guessMimeTypeFromBase64(base64Data) {  
    // Analyze initial bytes of base64 data
    const decodedBytes = (base64Data).slice(0, 4);
    const signature = decodedBytes.toString('ascii');
    if (signature.startsWith('/9j/')) {
      return 'image/jpeg';
    } else if (signature.startsWith('iVBORw0KGgo')) {
      return 'image/png';
    } else if (signature.startsWith('R0lGODlh')) {
      return 'image/gif';
    } else {
      return 'application/octet-stream';  // Generic binary data
    }
}

// Route to get all messages (GET request)
app.post('/api/gem', async (req, res) => {
  const base64Image = req.body.image;
  try
  {
    const prompt = `Analyze image for traffic light and vehicle in my way within 10 meters. If light color is green respond GO only. If light color is red respond STOP only. If light color is yellow respond Go SLOW only. If no traffic light is visible then respond GO only. Irrespective of traffic signals if anything obstructing my view in my way respond STOP only. No explanation needed.`;

    const filePart = {inlineData: {data: base64Image, mimeType: 'image/jpeg'}};
    const textPart = {text: prompt};
    const request = {
        contents: [{role: 'user', parts: [textPart,filePart]}],
    };
    
    const apiResule = await generativeVisionModel.generateContent(request,);
    const contentResponse = await apiResule.response;
    const resText = contentResponse.candidates[0].content.parts[0].text;
    return res.send(resText);
  }catch(e) {
    console.log(e);
  }
});

app.post('/api/vehicle', async (req, res) => {
  const base64Image = req.body.image;
  try
  {
    const prompt = `Input: Image data (from front mounted camera on the ego vehicle)
    Output: STOP (if a vehicle is within 7 meters and obstructing my way)    
    GO (if my way is clear for 10 meters)
    Restrictions: No additional explanation needed.`;

    const filePart = {inlineData: {data: base64Image, mimeType: 'image/jpeg'}};
    const textPart = {text: prompt};
    const request = {
        contents: [{role: 'user', parts: [textPart,filePart]}],
    };
    
    const apiResule = await generativeVisionModel.generateContent(request);
    const contentResponse = await apiResule.response;
    const resText = contentResponse.candidates[0].content.parts[0].text;
    return res.send(resText);
  }catch(e) {
    console.log(e);
  }
});

// Start the server
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
