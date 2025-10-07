require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function testGemini() {
  console.log('🔍 Testing Gemini 2.5 Flash API...\n');
  
  const question = "Who is the President of US?";
  console.log(`Question: ${question}\n`);
  
  try {
    console.log('Sending request to Gemini 2.5 Flash...');
    
    const result = await model.generateContent(question);
    const response = result.response;
    const answer = response.text();
    
    console.log('✅ SUCCESS! Gemini Response:\n');
    console.log(answer);
    console.log('\n---');
    console.log('✅ Gemini 2.5 Flash is working perfectly!');
    console.log('✅ And it\'s 100% FREE! 🎉');
    
  } catch (error) {
    console.error('❌ FAILED!');
    console.error('Error message:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testGemini();