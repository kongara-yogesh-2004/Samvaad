import React from 'react';
import { ArrowLeft } from 'lucide-react';

const Thirdgo = () => {
  const handleExit = () => {
    window.location.href = '/';
    console.log('Exiting to home page...');
  };
  
  const handleBack = () => {
    window.history.back();
    console.log('Going back to previous page...');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {/* Back Button */}
      <div className="w-full max-w-3xl mb-4">
        <button 
          onClick={handleBack}
          className="flex items-center text-gray-700 hover:text-gray-900 font-medium transition-colors duration-200"
        >
          <ArrowLeft className="mr-2" size={20} />
          Back
        </button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl">
        {/* Continue Card */}
        <div className="flex-1 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 flex flex-col h-full">
            <h2 className="text-xl font-bold mb-4 text-green-600">Continue</h2>
            <p className="text-gray-600 mb-6 flex-grow">
              New debugging challenges are awaiting for you. Click to Proceed if you wish.
            </p>
            {/* Continue Button */}
            <button
              className="flex items-center justify-center gap-2 px-4 py-2 text-white font-bold rounded-md"
              style={{ background: 'linear-gradient(135deg, #4CAF50, #2E7D32)' }}
              onClick={() => window.location.href = 'http://10.0.50.85:8080/instructions'}
            >
              Continue
            </button>
          </div>
        </div>

        {/* Exit Card */}
        <div className="flex-1 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 flex flex-col h-full">
            <h2 className="text-xl font-bold mb-4 text-red-600">Exit</h2>
            <p className="text-gray-600 mb-6 flex-grow">
              Click the button below to exit and return to the home page
            </p>
            <button
              onClick={handleExit}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Thirdgo;