require('dotenv').config();
const { HfInference } = require('@huggingface/inference');

// Initialize Hugging Face
const hf = new HfInference(process.env.HUGGINGFACE_TOKEN);

async function testHuggingFace() {
  console.log('🔍 Testing Hugging Face API...\n');
  
  const question = "Who is the President of US?";
  console.log(`Question: ${question}\n`);
  
  // Test 1: Try GPT-2
  console.log('Test 1: Trying GPT-2 model...');
  try {
    const response1 = await hf.textGeneration({
      model: 'gpt2',
      inputs: question,
      parameters: {
        max_new_tokens: 50,
      }
    });
    console.log('✅ GPT-2 Response:', response1.generated_text);
  } catch (error) {
    console.error('❌ GPT-2 Failed:', error.message);
  }
  
  console.log('\n---\n');
  
  // Test 2: Try DialoGPT
  console.log('Test 2: Trying DialoGPT model...');
  try {
    const response2 = await hf.conversational({
      model: 'microsoft/DialoGPT-medium',
      inputs: {
        past_user_inputs: [],
        generated_responses: [],
        text: question,
      }
    });
    console.log('✅ DialoGPT Response:', response2.generated_text);
  } catch (error) {
    console.error('❌ DialoGPT Failed:', error.message);
  }
  
  console.log('\n---\n');
  
  // Test 3: Try FLAN-T5
  console.log('Test 3: Trying FLAN-T5 model...');
  try {
    const response3 = await hf.textGeneration({
      model: 'google/flan-t5-base',
      inputs: question,
      parameters: {
        max_new_tokens: 50,
      }
    });
    console.log('✅ FLAN-T5 Response:', response3.generated_text);
  } catch (error) {
    console.error('❌ FLAN-T5 Failed:', error.message);
  }
  
  console.log('\n---\n');
  
  // Test 4: Try Question Answering
  console.log('Test 4: Trying Question Answering model...');
  try {
    const response4 = await hf.questionAnswering({
      model: 'deepset/roberta-base-squad2',
      inputs: {
        question: question,
        context: 'The current president of the United States is Joe Biden. He was inaugurated in January 2021. Donald Trump was president before him.'
      }
    });
    console.log('✅ Question Answering Response:', response4.answer);
  } catch (error) {
    console.error('❌ Question Answering Failed:', error.message);
  }
  
  console.log('\n---\n');
  console.log('Testing complete!');
}

// Run the test
testHuggingFace();