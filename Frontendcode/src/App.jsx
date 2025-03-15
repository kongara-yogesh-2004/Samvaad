import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';       
import SyllabusPage from './com/setsyllabus';    
import LandingPage from './com/landing';   
import InteractiveInterviewApp from './com/interview';  
import Coding from './level2/code'; 
import Thirdgo from './com/thirdlevelgo';




function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/syllabus" element={<SyllabusPage />} />
          <Route path="/interview" element={<InteractiveInterviewApp />} />
          <Route path="/code" element={<Coding />} />
          <Route path="/finish" element={<Thirdgo />} />
          
        </Routes>
      </Router>
    </div>
  );
}

export default App;
