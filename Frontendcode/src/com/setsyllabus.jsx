import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { SunIcon, MoonIcon, ArrowLeftIcon, BookOpenIcon, LoaderIcon } from 'lucide-react';

const SyllabusPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syllabus, setSyllabus] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [darkMode, setDarkMode] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const navigate = useNavigate();

  // Check for saved theme preference on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }
  }, []);

  // Update localStorage when theme changes
  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const handleSyllabusChange = (e) => {
    setSyllabus(e.target.value);
    setCharCount(e.target.value.length);
  };

  const handleSyllabusSubmit = (e) => {
    e.preventDefault();
    
    if (!syllabus.trim()) {
      setMessage({ text: 'Please enter syllabus content', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setMessage({ text: '', type: '' });

    const data = {
      message: syllabus
    };

    // Show loading message
    setMessage({ text: 'Processing your syllabus...', type: 'info' });

    axios.post('http://10.0.53.41:8000/dynamic_question', data, {
      headers: { 'Content-Type': 'application/json' }
    })
    .then((response) => {
      console.log("Response Data:", response.data);
      
      if (!response.data || Object.keys(response.data).length === 0) {
        console.error("Received empty response from server.");
        setMessage({ text: "Error: Empty response received from the server.", type: "error" });
        return;
      }

      setMessage({ text: 'Syllabus submitted successfully!', type: 'success' });
      
      // Use a short timeout to show success message before redirecting
      setTimeout(() => {
        navigate('/interview', { state: { syllabusData: response.data } });
      }, 1000);
    })
    .catch((error) => {
      console.error("Axios Error:", error);
      setMessage({ 
        text: "Error submitting syllabus: " + (error.response?.data?.message || error.message), 
        type: "error" 
      });
    })
    .finally(() => {
      setIsSubmitting(false);
    });
  };

  return (
    <div className={`min-h-screen p-4 transition-colors duration-200 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme} 
        className={`fixed top-4 right-4 p-2 rounded-full shadow-md transition-colors ${
          darkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-white text-gray-800 hover:bg-gray-100'
        }`}
        aria-label="Toggle theme"
      >
        {darkMode ? <SunIcon size={20} /> : <MoonIcon size={20} />}
      </button>

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/')}
            className={`mr-4 p-2 rounded-full transition-colors ${
              darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            aria-label="Go back"
          >
            <ArrowLeftIcon size={20} />
          </button>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Set Interview Syllabus</h1>
        </div>

        <div className={`p-6 rounded-lg shadow-md transition-colors ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center mb-4">
            <BookOpenIcon className={`mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} size={20} />
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Paste your interview syllabus below. This will be used to generate relevant interview questions.
            </p>
          </div>

          {message.text && (
            <div className={`p-4 mb-6 rounded-md flex items-center ${
              message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
              message.type === 'info' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {isSubmitting && message.type === 'info' && <LoaderIcon className="animate-spin mr-2" size={16} />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSyllabusSubmit}>
            <div className="mb-4">
              <div className="relative">
                <textarea
                  id="syllabus"
                  rows="12"
                  className={`w-full p-4 border rounded-md focus:ring-2 focus:ring-offset-2 transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Paste your syllabus content here..."
                  value={syllabus}
                  onChange={handleSyllabusChange}
                  disabled={isSubmitting}
                ></textarea>
                <div className={`absolute bottom-2 right-3 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {charCount} characters
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <button
                type="button"
                onClick={() => navigate('/')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className={`px-6 py-2 rounded-md transition-colors flex items-center ${
                  isSubmitting 
                    ? (darkMode ? 'bg-blue-700 text-white' : 'bg-blue-500 text-white') 
                    : (darkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={isSubmitting}
              >
                {isSubmitting && <LoaderIcon className="animate-spin mr-2" size={16} />}
                {isSubmitting ? 'Processing...' : 'Set Syllabus'}
              </button>
            </div>
          </form>
        </div>

        <div className={`mt-6 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Set a comprehensive syllabus to generate more accurate interview questions.
        </div>
      </div>
    </div>
  );
};

export default SyllabusPage;