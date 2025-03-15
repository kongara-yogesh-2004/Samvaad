const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

app.use(cors());
app.use(bodyParser.json());

const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY = "9a0a163900mshedb35886c4241ddp131c85jsn286ff6ef79af"; 

// Mock questions data with test cases
const questions = [
  {
    id: 1,
    title: "Two Sum",
    description: "Given an array of integers and a target, return indices of the two numbers such that they add up to target.",
    difficulty: "Easy",
    testCases: {
      input: "[2,7,11,15]\n9",
      expectedOutput: "[0,1]"
    }
  },
  {
    id: 2,
    title: "Palindrome Check",
    description: "Write a function to check if a string is a palindrome.",
    difficulty: "Easy",
    testCases: {
      input: "racecar",
      expectedOutput: "true"
    }
  },
  {
    id: 3,
    title: "Fibonacci Sequence",
    description: "Write a function to generate the nth Fibonacci number.",
    difficulty: "Medium",
    testCases: {
      input: "10",
      expectedOutput: "55"
    }
  },
  {
    id: 4,
    title: "Valid Parentheses",
    description: "Given a string containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    difficulty: "Medium",
    testCases: {
      input: "(){}[]",
      expectedOutput: "true"
    }
  }
];

// Fetch all languages supported by Judge0
app.get('/languages', async (req, res) => {
  try {
    const response = await axios.get(`${JUDGE0_URL}/languages`, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching languages:", error.message);
    res.status(500).send('Error fetching languages');
  }
});

// Serve questions data
app.get('/questions', (req, res) => {
  res.json(questions);
});

// Run code using Judge0
app.post('/run', async (req, res) => {
  const { source_code, language_id, stdin } = req.body;

  try {
    // Encode stdin to Base64 if provided
    const encodedStdin = stdin ? Buffer.from(stdin).toString('base64') : '';
    
    // Submit the code to Judge0
    const submissionResponse = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`, {
      source_code: source_code,  // Now comes in as base64
      language_id,
      stdin: encodedStdin
    }, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        'Content-Type': 'application/json'
      }
    });

    // Decode the output from Base64
    const { stdout, stderr, compile_output, message } = submissionResponse.data;
    const decodedStdout = stdout ? Buffer.from(stdout, 'base64').toString('utf-8') : null;
    const decodedStderr = stderr ? Buffer.from(stderr, 'base64').toString('utf-8') : null;
    const decodedCompileOutput = compile_output ? Buffer.from(compile_output, 'base64').toString('utf-8') : null;
    const decodedMessage = message ? Buffer.from(message, 'base64').toString('utf-8') : null;

    // Send a human-readable response
    res.json({
      stdout: decodedStdout,
      stderr: decodedStderr,
      compile_output: decodedCompileOutput,
      message: decodedMessage
    });

  } catch (error) {
    console.error("Error running code:", error.message);
    res.status(500).send('Error running code');
  }
});

app.listen(5000, () => console.log('Server running on port 5000'));