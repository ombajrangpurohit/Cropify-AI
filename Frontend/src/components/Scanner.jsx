import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Network } from '@capacitor/network';
import * as tf from '@tensorflow/tfjs';

// 🌿 TRANSLATION MANUALS
const SUPPORTED_PLANTS = ["apple", "corn", "grapes", "potato", "tomato"];

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

const DISEASE_DETAILS = {
  // ==========================================
  // TOMATO DISEASES
  // ==========================================
  "Tomato - healthy": {
    severity: "None",
    observedSymptoms: "Leaves are vibrant green with uniform texture. No spots, yellowing, or wilting observed.",
    remedy: "Crop is perfectly healthy! Maintain your standard watering and fertilization schedule."
  },
  "Tomato - Early blight": {
    severity: "Moderate",
    observedSymptoms: "Brown or black spots with concentric rings (bullseye pattern) on older, lower leaves. Surrounding tissue often turns yellow.",
    remedy: "1. Prune the lowest leaves to prevent soil splash.\n2. Apply a copper-based fungicide.\n3. Always water at the base, never overhead."
  },
  "Tomato - Late blight": {
    severity: "Critical (Spreads Rapidly)",
    observedSymptoms: "Large, dark, water-soaked patches on leaves and stems. White fungal growth may appear on the undersides of leaves in humid conditions.",
    remedy: "1. Immediately uproot and burn infected plants.\n2. Apply Chlorothalonil or Copper fungicide to surrounding healthy plants.\n3. Do not compost infected leaves."
  },
  "Tomato - Bacterial spot": {
    severity: "High",
    observedSymptoms: "Small, dark, water-soaked spots on leaves that eventually turn brown and scabby. Spots may have a faint yellow halo.",
    remedy: "1. Spray copper bactericides combined with Mancozeb.\n2. Avoid working in the field when leaves are wet to prevent spreading the bacteria."
  },
  "Tomato - Leaf Mold": {
    severity: "Moderate",
    observedSymptoms: "Pale greenish-yellow spots on the upper leaf surface with olive-green to brown velvety fungal growth on the underside.",
    remedy: "1. Increase plant spacing to improve air circulation.\n2. Prune heavily infected foliage.\n3. Apply a preventative fungicide if humidity is high."
  },
  "Tomato - Septoria leaf spot": {
    severity: "Moderate",
    observedSymptoms: "Numerous small, circular spots with dark borders and gray/tan centers on lower leaves. Tiny black specks (spores) may be visible in the centers.",
    remedy: "1. Remove heavily spotted leaves immediately.\n2. Apply a broad-spectrum fungicide (like Chlorothalonil).\n3. Mulch the base of the plant to prevent soil spores from splashing up."
  },
  "Tomato - Spider mites": {
    severity: "Moderate to High",
    observedSymptoms: "Tiny yellow or white speckles (stippling) on leaves. Fine webbing may be visible, especially on the undersides of leaves.",
    remedy: "1. Spray the undersides of leaves with Neem oil or insecticidal soap.\n2. Introduce predatory mites if possible.\n3. Ensure plants are not drought-stressed."
  },
  "Tomato - Target Spot": {
    severity: "Moderate",
    observedSymptoms: "Brown, circular spots with target-like concentric rings on leaves. Lesions may coalesce, causing leaves to yellow and drop.",
    remedy: "1. Apply systemic fungicides targeting fungal leaf spots.\n2. Improve airflow by pruning inner branches.\n3. Avoid excessive nitrogen fertilization."
  },
  "Tomato - Tomato Yellow Leaf Curl Virus": {
    severity: "Critical",
    observedSymptoms: "Upward curling and yellowing of leaf margins. Plants are severely stunted with smaller-than-normal leaves.",
    remedy: "1. There is no chemical cure for the virus. Uproot and destroy the plant.\n2. Use yellow sticky traps and insecticidal soaps to kill the Whiteflies spreading it."
  },
  "Tomato - Tomato mosaic virus": {
    severity: "Critical",
    observedSymptoms: "Mottled light and dark green mosaic patterns on leaves. Leaves may be distorted, fern-like, or stunted.",
    remedy: "1. Completely destroy infected plants.\n2. Wash your hands and disinfect all pruning tools with a 10% bleach solution. It spreads easily by touch."
  },

  // ==========================================
  // APPLE DISEASES
  // ==========================================
  "Apple - healthy": {
    severity: "None",
    observedSymptoms: "Smooth, green leaves with no lesions, curling, or abnormal discoloration.",
    remedy: "Tree is healthy! Continue routine pruning to ensure good sunlight penetration."
  },
  "Apple - Apple scab": {
    severity: "High",
    observedSymptoms: "Olive-green to black, velvety spots on leaves and fruit. Severely infected leaves may turn yellow and drop prematurely.",
    remedy: "1. Rake and destroy fallen leaves in autumn to remove overwintering spores.\n2. Apply preventative fungicides (like Captan) during early spring bud break."
  },
  "Apple - Cedar apple rust": {
    severity: "Moderate",
    observedSymptoms: "Bright orange-yellow spots on the upper surface of leaves. Small, raised fungal structures (aecia) appear on the undersides.",
    remedy: "1. Remove any nearby Eastern Red Cedar trees or juniper galls within a 1-mile radius.\n2. Apply preventative fungicidal sprays when apple blossoms open."
  },
  "Apple - Black rot": {
    severity: "High",
    observedSymptoms: "Frog-eye leaf spots (purple margins with light tan centers). Fruit may develop brown, rotting areas that eventually turn black and shrivel.",
    remedy: "1. Prune out all dead or diseased wood during winter.\n2. Remove any 'mummified' dried apples hanging on the tree.\n3. Apply Captan or sulfur-based fungicides."
  },

  // ==========================================
  // CORN DISEASES
  // ==========================================
  "Corn - healthy": {
    severity: "None",
    observedSymptoms: "Leaves are long, upright, and uniform green without streaking, spotting, or rust pustules.",
    remedy: "Crop is healthy! Ensure adequate nitrogen levels in the soil for optimal ear development."
  },
  "Corn - Northern Leaf Blight": {
    severity: "High",
    observedSymptoms: "Large, cigar-shaped, grayish-green to tan lesions on the leaves, usually starting on the lower canopy.",
    remedy: "1. Apply a foliar fungicide immediately if lesions appear before silking.\n2. Next season, practice crop rotation and deep tillage to bury infected residue."
  },
  "Corn - Common rust": {
    severity: "Moderate",
    observedSymptoms: "Small, oval, cinnamon-brown to brick-red pustules erupting on both upper and lower leaf surfaces.",
    remedy: "1. Apply preventative fungicides early in the season if rust pustules are spotted.\n2. For next season, select rust-resistant corn hybrids."
  },
  "Corn - Cercospora leaf spot Gray leaf spot": {
    severity: "High",
    observedSymptoms: "Rectangular, pale brown to gray lesions restricted by leaf veins, giving them a distinct blocky appearance.",
    remedy: "1. Apply a strobilurin or triazole fungicide at the tasseling stage.\n2. Practice 1-2 year crop rotation away from corn to break the fungal life cycle."
  },

  // ==========================================
  // GRAPE DISEASES
  // ==========================================
  "Grapes - healthy": {
    severity: "None",
    observedSymptoms: "Leaves are broad, evenly green, and free from lesions, powdery mildew, or localized necrosis.",
    remedy: "Vines are healthy! Maintain a good trellis system to ensure maximum airflow."
  },
  "Grapes - Black rot": {
    severity: "High",
    observedSymptoms: "Small, circular reddish-brown spots on leaves. Berries develop brown spots that rapidly encompass the entire fruit, turning them into black, shriveled mummies.",
    remedy: "1. Remove and burn all dried, mummified berries from the vines and ground.\n2. Apply Mancozeb or Myclobutanil fungicides from early bud break until berries ripen."
  },
  "Grapes - Esca (Black Measles)": {
    severity: "Critical",
    observedSymptoms: "Tiger-stripe pattern on leaves (yellowing and necrosis between veins). Berries may develop small, dark spots (measles).",
    remedy: "1. Prune out infected wood at least 8 inches below the visible canker.\n2. Burn all pruned wood immediately. Disinfect pruning shears between cuts."
  },
  "Grapes - Leaf Blight (Isariopsis Leaf Spot)": {
    severity: "Moderate",
    observedSymptoms: "Irregular, reddish-brown patches on the leaves. Severe infection causes leaves to shrivel and drop early.",
    remedy: "1. Spray a 1% Bordeaux mixture or a copper-based fungicide.\n2. Ensure the canopy is thinned out to allow sunlight to dry the leaves quickly."
  },

  // ==========================================
  // POTATO DISEASES
  // ==========================================
  "Potato - healthy": {
    severity: "None",
    observedSymptoms: "Foliage is dark green, fully expanded, and shows no signs of spots, blight, or yellowing.",
    remedy: "Crop is healthy! Ensure consistent soil moisture to prevent tuber cracking."
  },
  "Potato - Early blight": {
    severity: "Moderate",
    observedSymptoms: "Dark brown spots with concentric rings (target board appearance) primarily on older foliage.",
    remedy: "1. Apply protectant fungicides like Chlorothalonil or Mancozeb.\n2. Do not harvest until vines are completely dead to protect the tubers from spores."
  },
  "Potato - Late blight": {
    severity: "Critical (Spreads Rapidly)",
    observedSymptoms: "Irregular, water-soaked lesions on leaves that expand rapidly into large brown dead areas. White fuzzy growth may appear on leaf undersides in wet conditions.",
    remedy: "1. Destroy all infected foliage immediately.\n2. Apply systemic fungicides every 5-7 days.\n3. Do not leave cull piles of discarded potatoes near the field."
  }
};

const Scanner = ({ imagePreview, setImagePreview, isAnalyzing, setIsAnalyzing, setDiseaseData }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [scanStatus, setScanStatus] = useState("");

  // 🔥 Network & Routing States
  const [selectedPlant, setSelectedPlant] = useState("tomato");
  const [isOnline, setIsOnline] = useState(true);

  // Live Wi-Fi Monitor
  useEffect(() => {
    let networkListener;

    const checkInitialStatus = async () => {
      const status = await Network.getStatus();
      setIsOnline(status.connected);
    };
    checkInitialStatus();

    const setupListener = async () => {
      networkListener = await Network.addListener('networkStatusChange', status => {
        setIsOnline(status.connected);
      });
    };
    setupListener();

    return () => {
      if (networkListener) {
        networkListener.remove();
      }
    };
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

  const handleScan = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setErrorMessage(null);

    // Always do a fresh check exactly when the button is pressed
    const currentNetworkStatus = await Network.getStatus();

    // ==========================================
    // ROUTE A: CLOUD MODE (Django LLM Orchestrator)
    // ==========================================
    if (currentNetworkStatus.connected) {
      setScanStatus("Analyzing via Cloud LLM...");
      console.log("True internet detected. Routing to Django Cloud...");

      const formData = new FormData();
      formData.append('image', selectedFile);

      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const response = await axios.post(apiUrl, formData, {
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
    // ROUTE B: OFFLINE SPECIALIST MODE
    // ==========================================
    else {
      console.log(`ZERO connectivity detected. Routing to Local ${selectedPlant.toUpperCase()} AI...`);

      try {
        await new Promise((resolve, reject) => {
          const imgElement = new Image();
          imgElement.src = imagePreview;

          imgElement.onload = async () => {
            let specialistTensor;
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

              setScanStatus(`Loading ${selectedPlant.toUpperCase()} specialist...`);
              specialistModel = await tf.loadLayersModel(`/models/tfjs_${selectedPlant}/model.json`);

              setScanStatus("Diagnosing Disease...");

              specialistTensor = tf.browser.fromPixels(canvas)
                .toFloat()
                .div(255.0)
                .expandDims();

              diseasePredictionTensor = specialistModel.predict(specialistTensor);
              const diseasePredictions = await diseasePredictionTensor.data();

              const diseaseIndex = diseasePredictions.indexOf(Math.max(...diseasePredictions));
              const confidenceScore = (diseasePredictions[diseaseIndex] * 100).toFixed(2);

              const predictedDiseaseName = DISEASE_LABELS[selectedPlant][diseaseIndex];
              
             // 🔥 Pull from the local database!
              const details = DISEASE_DETAILS[predictedDiseaseName] || {
                severity: "Unknown",
                observedSymptoms: "Unable to load offline symptoms.",
                remedy: "Diagnosis incomplete. Please connect to the internet for a Gemini AI analysis."
              };

              console.log(`Specialist says: ${predictedDiseaseName} (${confidenceScore}%)`);

              // Push the data to the UI cards
              setDiseaseData({
                name: predictedDiseaseName || "Unknown Disease",
                confidence: `${confidenceScore}%`,
                severity: null, 
                symptoms: details.observedSymptoms,      // Maps to your "OBSERVED SYMPTOMS" card
                remedy: details.remedy,                  // Maps to your "TREATMENT PLAN" card
                
                // Hardcoded Offline Messages for dynamic features
                rootCause: "📡 Offline Mode: Please connect to the internet for a deep AI root cause analysis.",
                weatherContext: "📡 Offline Mode: Weather context requires an active internet connection."
              });

              resolve();

            } catch (innerError) {
              reject(innerError);
            } finally {
              if (specialistTensor) specialistTensor.dispose();
              if (diseasePredictionTensor) diseasePredictionTensor.dispose();
              if (specialistModel) specialistModel.dispose();
            }
          };

          imgElement.onerror = () => {
            reject(new Error("Failed to read the image file."));
          };
        });

      } catch (error) {
        console.error("Offline AI Error:", error);
        setErrorMessage(`Failed to load the ${selectedPlant} model. Are you sure it's in /public/models/tfjs_${selectedPlant}/?`);
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

      {/* 🔥 THE MAGIC DROPDOWN: Only visible when offline */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <label className="block text-sm font-semibold text-amber-600 dark:text-amber-500 mb-2 flex items-center gap-2">
              <span className="text-lg">⚠️</span> Offline Mode Active - Select Crop:
            </label>
            <select
              value={selectedPlant}
              onChange={(e) => setSelectedPlant(e.target.value)}
              disabled={isAnalyzing}
              className="w-full bg-amber-50 dark:bg-slate-900 border border-amber-300 dark:border-amber-600/50 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow disabled:opacity-50"
            >
              {SUPPORTED_PLANTS.map(plant => (
                <option key={plant} value={plant}>
                  {plant.charAt(0).toUpperCase() + plant.slice(1)}
                </option>
              ))}
            </select>
          </motion.div>
        )}
      </AnimatePresence>

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