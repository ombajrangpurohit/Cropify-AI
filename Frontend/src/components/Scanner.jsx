import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const Scanner = ({ 
  imagePreview, 
  setImagePreview, 
  isAnalyzing, 
  setIsAnalyzing, 
  setDiseaseData 
}) => {

  // NEW: State to hold the actual file for the backend and handle errors
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Handle file selection
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file); // Save the raw file for Axios
      setImagePreview(URL.createObjectURL(file));
      setDiseaseData(null); // Clear previous results
      setErrorMessage(null); // Clear previous errors
    }
  };

  // The REAL API Call to Django
  const handleScan = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setErrorMessage(null);

    // 1. Package the file for Django
    const formData = new FormData();
    // NOTE: 'image' must match what your Django backend expects in request.FILES
    formData.append('image', selectedFile); 

    try {
      // 2. Make the request to the Django server
      // NOTE: Ask your teammate for the exact URL (e.g., http://127.0.0.1:8000/api/predict/)
      const response = await axios.post('http://127.0.0.1:8000/api/predict/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // 3. Success! Pass the data up to the parent component
      // Assuming Django returns JSON like: { name: "...", confidence: "...", severity: "...", remedy: "..." }
      setDiseaseData(response.data);

    } catch (error) {
      // 4. Handle Server/Network Errors
      console.error("API Error:", error);
      if (error.response) {
        setErrorMessage(`Server Error: ${error.response.status}`);
      } else {
        setErrorMessage("Network Error. Is the Django server running?");
      }
      setDiseaseData(null);
    } finally {
      setIsAnalyzing(false); // Stops the laser animation
    }
  };

  // Clear everything
  const handleDiscard = () => {
    setImagePreview(null);
    setSelectedFile(null);
    setDiseaseData(null);
    setErrorMessage(null);
  };

  return (
    // Framer Motion: Slides up and fades in when the page loads
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto mt-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 transition-colors duration-300"
    >
      
      {!imagePreview ? (
        /* --- UPLOAD STATE --- */
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-400 dark:border-emerald-500 rounded-xl p-10 bg-emerald-50 dark:bg-emerald-900/20 transition-colors">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload} 
            id="leaf-upload" 
            className="hidden" 
          />
          <label 
            htmlFor="leaf-upload" 
            className="cursor-pointer flex flex-col items-center text-center space-y-3"
          >
            <span className="text-5xl">📸</span>
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              Tap to upload or take a photo of the affected plant.
            </p>
            <span className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors shadow-md">
              Select Image
            </span>
          </label>
        </div>

      ) : (
        /* --- PREVIEW & SCAN STATE --- */
        <div className="space-y-4">
          
          {/* Image Container with Scanning Animation */}
          <div className="relative w-full h-64 bg-black rounded-xl overflow-hidden shadow-inner">
            <img 
              src={imagePreview} 
              alt="Plant Leaf" 
              className={`w-full h-full object-cover transition-all duration-500 ${isAnalyzing ? 'brightness-50 blur-[2px] grayscale-[50%]' : ''}`}
            />
            
            {/* The "Laser" Scan Line Animation */}
            {isAnalyzing && (
              <motion.div 
                initial={{ top: "0%" }}
                animate={{ top: "100%" }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 w-full h-1 bg-emerald-400 shadow-[0_0_20px_4px_rgba(52,211,153,0.8)] z-10"
              />
            )}
            
            {/* Analyzing Overlay Text */}
            {isAnalyzing && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <p className="bg-slate-900/80 text-emerald-400 font-bold px-5 py-2 rounded-xl backdrop-blur-md animate-pulse border border-emerald-500/30">
                  Analyzing Plant...
                </p>
              </div>
            )}
          </div>

          {/* Error Message Display */}
          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl border border-red-200 dark:border-red-800 text-sm text-center font-medium"
            >
              ⚠️ {errorMessage}
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={handleScan} 
              disabled={isAnalyzing}
              className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${
                isAnalyzing ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/30'
              }`}
            >
              {isAnalyzing ? 'Processing...' : 'Identify Disease'}
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={handleDiscard}
              disabled={isAnalyzing}
              className="px-5 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
            >
              Discard
            </motion.button>
          </div>

        </div>
      )}
    </motion.div>
  );
};

export default Scanner;