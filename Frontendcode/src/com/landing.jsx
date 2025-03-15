import React, { useState } from 'react';
import { SunIcon, MoonIcon } from 'lucide-react';

const LandingPage = () => {
  const [darkMode, setDarkMode] = useState(false);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const handleStartInterview = (e) => {
    e.preventDefault(); // Prevent default navigation
    alert("Click Set Syllabus to continue");
    // Optional: You can add code to visually highlight the syllabus button here
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen p-4 transition-colors duration-200 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme} 
        className={`absolute top-4 right-4 p-2 rounded-full ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'} shadow-md`}
        aria-label="Toggle theme"
      >
        {darkMode ? <SunIcon size={20} /> : <MoonIcon size={20} />}
      </button>

      <div className={`w-full max-w-md p-8 space-y-8 rounded-xl shadow-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
        <div className="text-center">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Interview Preparation</h1>
          <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Prepare for your upcoming interviews with guided practice</p>
        </div>
        
        <div className="mt-8 space-y-4">
          <button
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
            onClick={handleStartInterview}
          >
            Start Interview
          </button>
        </div>
        
        {/* Syllabus Card */}
        <div className={`mt-6 p-4 border rounded-lg ${darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
          <h2 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Customize Your Practice
          </h2>
          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Tailor your interview questions to focus on specific topics
          </p>
          <button
            className={`w-full flex justify-center py-3 px-4 rounded-md shadow-sm transition duration-150 ${
              darkMode 
                ? 'text-white bg-gray-600 hover:bg-gray-500 border border-gray-500' 
                : 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            onClick={() => window.location.href = '/syllabus'}
          >
            Set Syllabus
          </button>
        </div>
        
        <div className="mt-6 text-center">
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Practice makes perfect. Start your journey today!</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;