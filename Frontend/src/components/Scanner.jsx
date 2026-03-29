import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Network } from '@capacitor/network';
import * as tf from '@tensorflow/tfjs';

// 🌿 TRANSLATION MANUALS
const PLANT_LABELS = ["apple","corn","tomato","potato","grapes"]; // MUST MATCH metadata.json EXACTLY

const DISEASE_LABELS = {
  tomato: [
    "Tomato - healthy",
    "Tomato - Early blight",
    "Tomato - Late blight",
    "Tomato - Bacterial spot",
    "Tomato - Leaf Mold",
    "Tomato - Septoria leaf spot",
    "Tomato - Spider mites",
    "Tomato - Target Spot",
    "Tomato - Tomato Yellow Leaf Curl Virus",
    "Tomato - Tomato mosaic virus",
  ],
  apple: [
    "Apple - healthy",
    "Apple - Apple scab",
    "Apple - Cedar apple rust",
    "Apple - Black rot",
  ],
  corn: [
    "Corn - healthy",
    "Corn - Northern Leaf Blight",
    "Corn - Common rust",
    "Corn - Cercospora leaf spot Gray leaf spot",
  ],
  grapes: [
    "Grapes - healthy",
    "Grapes - Black rot",
    "Grapes - Esca (Black Measles)",
    "Grapes - Leaf Blight (Isariopsis Leaf Spot)",
  ],
  potato: [
    "Potato - healthy",
    "Potato - Early blight",
    "Potato - Late blight",
  ]
};

const Scanner = ({ imagePreview, setImagePreview, isAnalyzing, setIsAnalyzing, setDiseaseData }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [scanStatus, setScanStatus] = useState(""); // Dynamic UI Text
  
  // State for the "Bouncer" Model
  const [plantRouterModel, setPlantRouterModel] = useState(null);

  // 1. WAKE UP THE BOUNCER (Loads the Plant Detector on startup)
  useEffect(() => {
    const loadRouter = async () => {
      try {
        console.log("Loading Edge AI Plant Router...");
        const router = await tf.loadLayersModel('/models/plant_router/model.json');
        setPlantRouterModel(router);
        console.log("✅ Plant Router Ready!");
      } catch (error) {
        console.error("Failed to load Plant Router:", error);
      }
    };
    loadRouter();
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
      setDiseaseData(null);
      setErrorMessage(null);
      setScanStatus("");
    }
  };

  // 2. THE CASCADING PIPELINE
  const handleScan = async () => {
    if (!selectedFile) return;
    
    setIsAnalyzing(true);
    setErrorMessage(null);
    
    const networkStatus = await Network.getStatus();

    // ==========================================
    // ROUTE A: CLOUD MODE (Django LLM Orchestrator)
    // ==========================================
    if (networkStatus.connected) {
      setScanStatus("Analyzing via Cloud LLM...");
      console.log("True internet detected. Routing to Django Cloud...");
      
      const formData = new FormData();
      formData.append('image', selectedFile); 

      try {
        const response = await axios.post('http://127.0.0.1:8000/api/predict/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setDiseaseData(response.data);
      } catch (error) {
        console.error("API Error:", error);
        setErrorMessage(error.response ? `Server Error: ${error.response.status}` : "Network Error. Is the Django server running?");
      } finally {
        setIsAnalyzing(false);
      }
    } 
    
    // ==========================================
    // ROUTE B: OFFLINE CASCADING AI MODE
    // ==========================================
    else {
      console.log("ZERO connectivity detected. Routing to Local Edge AI...");

      if (!plantRouterModel) {
        setErrorMessage("Plant routing model not loaded yet.");
        setIsAnalyzing(false);
        return;
      }

      try {
        await new Promise((resolve, reject) => {
          const imgElement = new Image();
          imgElement.src = imagePreview;
          
          imgElement.onload = async () => {
            let bouncerTensor;
            let specialistTensor;
            let plantPredictionTensor;
            let diseasePredictionTensor;
            let specialistModel;

            try {
              const canvas = document.createElement('canvas');
              canvas.width = 224;
              canvas.height = 224;

              const ctx = canvas.getContext('2d');
              const size = Math.min(imgElement.width, imgElement.height);
              const startX = (imgElement.width - size) / 2;
              const startY = (imgElement.height - size) / 2;
              ctx.drawImage(imgElement, startX, startY, size, size, 0, 0, 224, 224);

              // ==========================================
              // TENSOR 1: THE TM BOUNCER (-1 to 1 Math)
              // ==========================================
              setScanStatus("Step 1: Identifying Plant Species...");
              
              // 🔥 RESTORED: Teachable Machine Math
              bouncerTensor = tf.browser.fromPixels(canvas)
                .toFloat()
                .div(127.5) 
                .sub(1)
                .expandDims();

              plantPredictionTensor = plantRouterModel.predict(bouncerTensor);
              const plantPredictions = await plantPredictionTensor.data();
              
              console.log("--- BOUNCER'S BRAIN ---");
              PLANT_LABELS.forEach((label, i) => {
                console.log(`${label}: ${(plantPredictions[i] * 100).toFixed(2)}%`);
              });
              console.log("-----------------------");

              const plantIndex = plantPredictions.indexOf(Math.max(...plantPredictions));
              const detectedPlant = PLANT_LABELS[plantIndex];
              console.log(`Bouncer final decision: ${detectedPlant}`);

              // ==========================================
              // TENSOR 2: THE TF SPECIALIST (0 to 1 Math)
              // ==========================================
              setScanStatus(`Plant Detected: ${detectedPlant.toUpperCase()}. Loading specialist...`);
              specialistModel = await tf.loadLayersModel(`models/tfjs_${detectedPlant}/model.json`);

              setScanStatus("Step 2: Diagnosing Disease...");
              
              // 🔥 KEPT: Standard Keras Math for the Specialist
              specialistTensor = tf.browser.fromPixels(canvas)
                .toFloat()
                .div(255.0) 
                .expandDims();

              diseasePredictionTensor = specialistModel.predict(specialistTensor);
              const diseasePredictions = await diseasePredictionTensor.data();
              
              const diseaseIndex = diseasePredictions.indexOf(Math.max(...diseasePredictions));
              const confidenceScore = (diseasePredictions[diseaseIndex] * 100).toFixed(2);
              
              const predictedDiseaseName = DISEASE_LABELS[detectedPlant][diseaseIndex];
              console.log(`Specialist says: ${predictedDiseaseName} (${confidenceScore}%)`);

              // Output Result - Added fallback to prevent undefined crashes downstream
              setDiseaseData({
                name: predictedDiseaseName || "Unknown Disease",
                confidence: `${confidenceScore}%`,
                severity: (predictedDiseaseName && predictedDiseaseName.includes("healthy")) ? "None" : "Requires Attention", 
                remedy: `Identified as ${detectedPlant}. Check offline guide for remedies.`
              });
              
              resolve(); 

            } catch (innerError) {
              reject(innerError); 
            } finally {
              if (bouncerTensor) bouncerTensor.dispose();
              if (specialistTensor) specialistTensor.dispose();
              if (plantPredictionTensor) plantPredictionTensor.dispose();
              if (diseasePredictionTensor) diseasePredictionTensor.dispose();
              if (specialistModel) specialistModel.dispose(); 
            }
          };

          imgElement.onerror = () => {
            reject(new Error("Failed to read the image file."));
          };
        });

      } catch (error) {
        console.error("Cascading AI Error:", error);
        setErrorMessage("Offline pipeline failed. Check if the models are bundled correctly.");
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleDiscard = () => {
    setImagePreview(null);
    setSelectedFile(null);
    setDiseaseData(null);
    setErrorMessage(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto mt-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 transition-colors duration-300">
      
      {!imagePreview ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-400 dark:border-emerald-500 rounded-xl p-10 bg-emerald-50 dark:bg-emerald-900/20">
          <input type="file" accept="image/*" onChange={handleImageUpload} id="leaf-upload" className="hidden" />
          <label htmlFor="leaf-upload" className="cursor-pointer flex flex-col items-center text-center space-y-3">
            <span className="text-5xl">📸</span>
            <p className="text-slate-700 dark:text-slate-300 font-medium">Tap to upload or take a photo.</p>
            <span className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 shadow-md">Select Image</span>
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative w-full h-64 bg-black rounded-xl overflow-hidden shadow-inner">
            <img src={imagePreview} alt="Plant" className={`w-full h-full object-cover transition-all duration-500 ${isAnalyzing ? 'brightness-50 blur-[2px]' : ''}`} />
            
            {isAnalyzing && (
              <motion.div initial={{ top: "0%" }} animate={{ top: "100%" }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="absolute left-0 w-full h-1 bg-emerald-400 shadow-[0_0_20px_4px_rgba(52,211,153,0.8)] z-10" />
            )}
            
            {isAnalyzing && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <p className="bg-slate-900/80 text-emerald-400 font-bold px-5 py-2 text-center rounded-xl backdrop-blur-md animate-pulse border border-emerald-500/30">
                  {scanStatus}
                </p>
              </div>
            )}
          </div>

          {errorMessage && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-200 text-sm text-center font-medium">
              ⚠️ {errorMessage}
            </motion.div>
          )}

          <div className="flex gap-3">
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleScan} disabled={isAnalyzing} className={`flex-1 py-3 rounded-xl font-bold text-white ${isAnalyzing ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
              {isAnalyzing ? 'Processing...' : 'Identify Disease'}
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleDiscard} disabled={isAnalyzing} className="px-5 py-3 rounded-xl font-bold bg-slate-100 text-slate-700 hover:bg-red-100 hover:text-red-600">
              Discard
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Scanner;