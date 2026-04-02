import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// --- Custom Typewriter Component ---
const TypewriterText = ({ text = "", delay = 0 }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    
    // Safety check just in case text is undefined or null
    if (!text) return;

    // 🔥 THE FIX: Force whatever Gemini sent into a pure String.
    // If it's an Array (like ["Step 1", "Step 2"]), join it with line breaks.
    const safeText = Array.isArray(text) ? text.join('\n') : String(text);

    // Now it is 100% safe to run .replace()
    const cleanText = safeText.replace(/\*\*/g, '').replace(/\*/g, '');

    const startTimer = setTimeout(() => {
      const typingInterval = setInterval(() => {
        setDisplayedText(cleanText.substring(0, i + 1));
        i++;
        if (i >= cleanText.length) clearInterval(typingInterval);
      }, 15); 
      
      return () => clearInterval(typingInterval);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [text, delay]);

  return <span>{displayedText}</span>;
};


// --- Main Results Card ---
const ResultsCard = ({ data, onReset }) => {
  if (!data) return null;

  // 🔥 FIX 2: Force the severity to be a single word (cuts off Gemini's rambling paragraphs)
  const rawSeverity = data.severity || "";
  const cleanSeverity = rawSeverity.split(/[ .\n,]/)[0].replace(/[^a-zA-Z]/g, '');

  // Calculate color using the newly cleaned, single-word severity
  const severityColor = cleanSeverity ? (
    cleanSeverity.toLowerCase().includes('high') || cleanSeverity.toLowerCase().includes('critical') ? 'bg-red-500 text-white shadow-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
    cleanSeverity.toLowerCase().includes('medium') || cleanSeverity.toLowerCase().includes('moderate') ? 'bg-amber-500 text-white shadow-amber-500/30' :
    'bg-emerald-500 text-white shadow-emerald-500/30'
  ) : '';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto mt-8 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      {/* 1. TOP HEADER */}
      <div className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Diagnosis Confirmed
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {data.name}
            </h2>
          </div>
          
          {/* Renders the badge using cleanSeverity */}
          {cleanSeverity && (
            <span className={`inline-flex items-center justify-center px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wide whitespace-nowrap ${severityColor}`}>
              {cleanSeverity} Risk
            </span>
          )}
        </div>

        {/* Confidence Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-bold">
            <span className="text-slate-600 dark:text-slate-400">AI Confidence Score</span>
            <span className="text-emerald-600 dark:text-emerald-400">{data.confidence}</span>
          </div>
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: data.confidence }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* 2. THE 4-BOX GRID */}
      <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Box 1: Weather */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800/50 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">🌦️</div>
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
              Live Weather Context
            </h3>
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-200/80 font-medium leading-relaxed flex-grow">
            <TypewriterText text={data.weather_warning || data.weatherContext} delay={500} />
          </p>
        </div>

        {/* Box 2: Symptoms */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">🔬</div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Observed Symptoms
            </h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed flex-grow">
            <TypewriterText text={data.symptoms} delay={1500} />
          </p>
        </div>

        {/* Box 3: Root Cause */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">🦠</div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Root Cause
            </h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed flex-grow">
            <TypewriterText text={data.reasons || data.rootCause} delay={2500} />
          </p>
        </div>

        {/* Box 4: Treatment Plan */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800/50 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-800/50 rounded-lg">🛡️</div>
            <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-400 uppercase tracking-wider">
              Treatment Plan
            </h3>
          </div>
          <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200/90 leading-relaxed whitespace-pre-line flex-grow">
            <TypewriterText text={data.remedy} delay={4000} />
          </div>
        </div>

      </div>

      {/* 3. BOTTOM ACTION BAR */}
      <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-end">
        <button 
          onClick={onReset}
          className="w-full md:w-auto px-8 py-3 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/30 active:scale-95"
        >
          Scan Another Leaf
        </button>
      </div>
    </motion.div>
  );
};

export default ResultsCard;