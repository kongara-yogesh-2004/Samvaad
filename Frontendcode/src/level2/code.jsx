import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import Select from 'react-select';
import './code.css';
import { Star, Code, Terminal, BarChart, CheckCircle, Trophy, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Coding = () => {
  const [questions, setQuestions] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [sourceCode, setSourceCode] = useState('');
  const [output, setOutput] = useState('');
  const [userScore, setUserScore] = useState(0);
  const [completedQuestions, setCompletedQuestions] = useState([]);
  const [stars, setStars] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [editorLanguage, setEditorLanguage] = useState('javascript'); // Default editor language
  const navigate = useNavigate();
  // Language ID to Monaco language mapping
  const languageIdToMonaco = {
    // Common languages - add more as needed
    54: 'cpp',        // C++
    50: 'c',          // C
    62: 'java',       // Java
    63: 'javascript', // JavaScript
    71: 'python',     // Python
    82: 'sql',        // SQL
    74: 'typescript', // TypeScript
    51: 'csharp',     // C#
    72: 'ruby',       // Ruby
    83: 'swift',      // Swift
    57: 'php',        // PHP
    78: 'scala',      // Scala
    60: 'go',         // Go
    59: 'fortran',    // Fortran
    84: 'rust',       // Rust
    85: 'r',          // R
    61: 'haskell'     // Haskell
    // Add more language mappings as needed
  };

  // Template code for different languages
  const languageTemplates = {
    'cpp': '#include <iostream>\n\nint main() {\n    std::cout << "Hello World!";\n    return 0;\n}',
    'python': 'def main():\n    print("Hello World!")\n\nif __name__ == "__main__":\n    main()',
    'javascript': 'function main() {\n    console.log("Hello World!");\n}\n\nmain();',
    'java': 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}',
    'c': '#include <stdio.h>\n\nint main() {\n    printf("Hello World!");\n    return 0;\n}',
    'csharp': 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello World!");\n    }\n}',
    'php': '<?php\necho "Hello World!";\n?>',
    'ruby': 'puts "Hello World!"',
    'go': 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello World!")\n}',
    'rust': 'fn main() {\n    println!("Hello World!");\n}',
    'typescript': 'function main(): void {\n    console.log("Hello World!");\n}\n\nmain();'
  };

  const handleFinish = () => {
    navigate('/finish'); // Navigate to /finish when clicked
  };

  // Fetch questions from backend
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get('http://localhost:5000/questions');
        setQuestions(response.data);
        setSelectedQuestion(response.data[0]); // Default to first question
      } catch (error) {
        console.error('Error fetching questions:', error);
      }
    };
    fetchQuestions();
  }, []);

  // Fetch languages from Judge0 via backend
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await axios.get('http://localhost:5000/languages');
        const options = response.data.map(lang => ({
          value: lang.id,
          label: lang.name
        }));
        setLanguages(options);
      } catch (error) {
        console.error('Error fetching languages:', error);
      }
    };
    fetchLanguages();
  }, []);

  // Update editor language when language selection changes
  useEffect(() => {
    if (selectedLanguage) {
      // Convert Judge0 language ID to Monaco editor language
      const monacoLang = languageIdToMonaco[selectedLanguage.value];
      if (monacoLang) {
        setEditorLanguage(monacoLang);
        
        // Set template code if the editor is empty
        if (sourceCode === '' && languageTemplates[monacoLang]) {
          setSourceCode(languageTemplates[monacoLang]);
        }
      } else {
        // Default to plaintext for unsupported languages
        setEditorLanguage('plaintext');
      }
    }
  }, [selectedLanguage]);

  // Toggle theme
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('light-mode');
  };

  // Handle code execution
  const handleRunCode = async () => {
    if (!selectedLanguage) {
      alert('Please select a language');
      return;
    }
    try {
      const response = await axios.post('http://localhost:5000/run', {
        source_code: btoa(sourceCode), // Encode source code in base64
        language_id: selectedLanguage.value,
        stdin: selectedQuestion?.testCases?.input || ''
      });
      
      setOutput(response.data.stdout || response.data.stderr || 'No output');
      
      // Check if solution is correct
      if (response.data.stdout && response.data.stdout.trim() === (selectedQuestion?.testCases?.expectedOutput || '').trim()) {
        // If the question isn't already completed
        if (!completedQuestions.includes(selectedQuestion.id)) {
          // Add points
          const newScore = userScore + 10;
          setUserScore(newScore);
          
          // Add 5 stars whenever score of 10 is received
          const newStars = stars + 5;
          setStars(newStars);
          
          // Mark question as completed
          setCompletedQuestions([...completedQuestions, selectedQuestion.id]);
        }
      }
    } catch (error) {
      console.error('Error running code:', error);
      setOutput('Error running code');
    }
  };

  // Handle code evaluation
  const handleEvaluateCode = async () => {
    if (!selectedLanguage || !selectedQuestion) {
      alert('Please select a language and question');
      return;
    }
    try {
      // Endpoint for evaluation - you would need to create this on your backend
      const response = await axios.post('http://10.0.53.41:8000/evaluate', 
        {
          question: JSON.stringify(selectedQuestion),
          answer: sourceCode.toString()
        }, 
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
  
      console.log('Response:', response.data);
      if (response.data.score !== undefined) {
        setUserScore(response.data.score); // Update the score
      }
      
      setOutput('Evaluation submitted. Check for results at Score...');
      
      // Here you would handle the evaluation response
      // This is just a placeholder since the endpoint doesn't exist yet
    } catch (error) {
      console.error('Error evaluating code:', error);
      setOutput('Error submitting code for evaluation');
    }
  };

  // Setup language select styles
  const selectStyles = {
    control: (base) => ({
      ...base,
      background: darkMode ? '#1a2634' : '#f0f4f8',
      borderColor: darkMode ? '#0a84ff33' : '#0a84ff55',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#0a84ff'
      }
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused 
        ? (darkMode ? '#2a3a4a' : '#e6f0ff') 
        : (darkMode ? '#1a2634' : '#f0f4f8'),
      color: darkMode ? '#e6e6e6' : '#333333',
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: darkMode ? '#1a2634' : '#f0f4f8',
    }),
    singleValue: (base) => ({
      ...base,
      color: darkMode ? '#e6e6e6' : '#333333'
    }),
    placeholder: (base) => ({
      ...base,
      color: darkMode ? '#a0a0a0' : '#888888'
    })
  };

  return (
    <div className={`app-container ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      <header className="app-header">
        <h1 className="glow-text">
          <Code size={32} className="icon-margin" />
          Samvaad Code Master
        </h1>
        
        <div className="header-controls">
          <div className="scoreboard">
            <div className="score-item">
              <Trophy size={20} className="icon-margin" />
              <span>Score: {userScore}</span>
            </div>
            <div className="score-item">
              <Star size={20} fill={darkMode ? "gold" : "#ffaa00"} stroke={darkMode ? "gold" : "#ffaa00"} className="icon-margin" />
              <span>Stars: {stars}</span>
            </div>
          </div>
          
          <button className="theme-toggle" onClick={toggleTheme}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="left-panel">
          <h2 className="section-title glow-text">
            <BarChart size={20} className="icon-margin" />
            Problems
          </h2>
          
          <ul className="question-list">
            {questions.map(q => (
              <li
                key={q.id}
                onClick={() => setSelectedQuestion(q)}
                className={`question-item ${selectedQuestion?.id === q.id ? 'selected' : ''} ${completedQuestions.includes(q.id) ? 'completed' : ''}`}
              >
                {completedQuestions.includes(q.id) && 
                  <CheckCircle size={16} className="completed-icon" />
                }
                {q.title}
                <span className={`difficulty-badge ${q.difficulty.toLowerCase()}`}>
                  {q.difficulty}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="right-panel">
          {selectedQuestion && (
            <div className="question-details">
              <h2 className="section-title glow-text">{selectedQuestion.title}</h2>
              <div className="difficulty-indicator">
                <span className={`difficulty-badge ${selectedQuestion.difficulty.toLowerCase()}`}>
                  {selectedQuestion.difficulty}
                </span>
              </div>
              <p className="question-description">{selectedQuestion.description}</p>
              <p>TestCase:</p>
              <p className="test-cases">{selectedQuestion.testCases.input}</p>
            </div>
          )}

          <div className="editor-section">
            <h2 className="section-title glow-text">
              <Code size={20} className="icon-margin" />
              Code Editor {editorLanguage && `(${editorLanguage})`}
            </h2>
            
            <div className="language-select-container">
              <Select
                options={languages}
                onChange={(lang) => {
                  setSelectedLanguage(lang);
                  setSourceCode(''); // Reset code when changing language
                }}
                placeholder="Select Language"
                className="language-select"
                styles={selectStyles}
                value={selectedLanguage}
              />
            </div>
            
            <Editor
              height="40vh"
              language={editorLanguage}
              value={sourceCode}
              onChange={(value) => setSourceCode(value)}
              theme={"vs-dark" }
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
              }}
            />
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="run-button" onClick={handleRunCode}>
                <Terminal size={16} className="icon-margin" />
                Run Code
              </button>
              
              <button 
                className="run-button" 
                onClick={handleEvaluateCode}
                style={{ 
                  background: 'linear-gradient(135deg, #4CAF50, #2E7D32)'
                }}
              >
                <CheckCircle size={16} className="icon-margin" />
                Evaluate
              </button>

              <button 
                className="run-button" 
                onClick={handleFinish}
                style={{ 
                  background: 'linear-gradient(135deg, #E53935, #B71C1C)'
                }}
              >
                <CheckCircle size={16} className="icon-margin" />
                Finish
              </button>


            </div>
          </div>

          <div className="output-section">
            <h2 className="section-title glow-text">
              <Terminal size={20} className="icon-margin" />
              Output
            </h2>
            <pre className="output-display">{output}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Coding;