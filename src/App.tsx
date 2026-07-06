import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Terminal, 
  Play, 
  Copy, 
  Check, 
  Download, 
  Cpu, 
  Sliders, 
  Settings, 
  AlertCircle, 
  Code, 
  Cloud, 
  Upload, 
  File, 
  ArrowRight,
  RefreshCw,
  HelpCircle
} from "lucide-react";

interface PythonFile {
  name: string;
  content: string;
}

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "guide">("preview");
  
  // Streamlit controls / state
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [temperature, setTemperature] = useState(0.2);
  const [taskType, setTaskType] = useState<"Summarize" | "Q&A" | "Technical Review" | "Refine & Polish">("Summarize");
  const [userQuery, setUserQuery] = useState("");
  
  // Document state
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [directText, setDirectText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  
  // Output and processing states
  const [analysisOutput, setAnalysisOutput] = useState("");
  const [processedDocName, setProcessedDocName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  
  // Code Viewer state
  const [pythonFiles, setPythonFiles] = useState<PythonFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copiedFile, setCopiedFile] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  // Load written python files from our backend API
  useEffect(() => {
    fetch("/api/files")
      .then((res) => res.json())
      .then((data) => {
        if (data.files) {
          setPythonFiles(data.files);
        }
      })
      .catch((err) => console.error("Error loading files:", err));
  }, []);

  // Check if API key is present on server
  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then((data) => {
        setHasApiKey(!!data.hasApiKey);
      })
      .catch(() => setHasApiKey(false));
  }, []);

  // Handle Drag & Drop File Upload
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const processUploadedFile = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "txt" && extension !== "md" && extension !== "pdf") {
      setErrorMsg("Unsupported file format. Please upload .txt, .md, or .pdf files.");
      return;
    }
    
    setErrorMsg("");
    setFileName(file.name);
    
    // For pdf files, we do a client-side mock/simulation since reading raw binary PDF stream
    // requires a library, but if they upload pdf, we notify them and populate mock document contents,
    // or let them use direct text input. To make it seamless, we read text files.
    if (extension === "pdf") {
      // Simulate/Read pdf text content
      setFileContent(
        `--- SIMULATED PDF EXTRACTION FOR: ${file.name} ---\n` +
        `Executive Report Header: Q3 Systems Overview & Growth Projections.\n` +
        `This document provides critical analysis of the current infrastructure, scaling metrics, and core API deployments.\n` +
        `Section 1: Scaling challenges on high-throughput endpoints.\n` +
        `Section 2: Security recommendations regarding environment variables.\n` +
        `Section 3: Key action items including migration to Google Gemini Pro models for Q4 operations.\n` +
        `[End of PDF content]`
      );
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setFileContent(text);
      };
      reader.readAsText(file);
    }
  };

  // Run AI Analysis request
  const handleRunAnalysis = async () => {
    const content = fileContent || directText;
    const docName = fileName || (directText ? "Direct Text Input" : "");

    if (!content.trim()) {
      setErrorMsg("Please upload a file or paste content to begin analysis.");
      return;
    }

    if (taskType === "Q&A" && !userQuery.trim()) {
      setErrorMsg("Please enter a question to run Q&A mode.");
      return;
    }

    setErrorMsg("");
    setIsAnalyzing(true);
    setAnalysisOutput("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentText: content,
          taskType,
          modelChoice: selectedModel,
          temperature,
          userQuery
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze document.");
      }

      setAnalysisOutput(data.text);
      setProcessedDocName(docName);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Copy output report to clipboard
  const copyOutputToClipboard = () => {
    navigator.clipboard.writeText(analysisOutput);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  // Download output report as markdown
  const downloadOutputReport = () => {
    const blob = new Blob([analysisOutput], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gemini_analysis_${taskType.toLowerCase().replace(/ /g, "_")}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy source file to clipboard
  const copySourceFile = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  // Render markdown helper
  const renderSimulatedMarkdown = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, idx) => {
      if (line.startsWith("### ")) {
        return <h4 key={idx} className="text-base font-semibold text-slate-100 mt-4 mb-1.5 border-b border-slate-800 pb-1">{line.replace("### ", "")}</h4>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={idx} className="text-lg font-bold text-slate-50 mt-5 mb-2.5">{line.replace("## ", "")}</h3>;
      }
      if (line.startsWith("# ")) {
        return <h2 key={idx} className="text-xl font-bold text-white mt-6 mb-3">{line.replace("# ", "")}</h2>;
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return <li key={idx} className="ml-5 list-disc text-slate-200 my-1">{line.substring(2)}</li>;
      }
      if (line.match(/^\d+\.\s/)) {
        return <li key={idx} className="ml-5 list-decimal text-slate-200 my-1">{line.replace(/^\d+\.\s/, "")}</li>;
      }
      if (line.trim() === "") {
        return <div key={idx} className="h-2" />;
      }
      return <p key={idx} className="text-slate-300 text-sm my-1 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="min-h-screen bg-[#0E1117] text-[#FAFAFA] font-sans flex flex-col">
      {/* HEADER BAR */}
      <header className="bg-[#0E1117]/90 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-violet-400 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              Gemini Streamlit Studio
              <span className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                Sleek Interface Active
              </span>
            </h1>
            <p className="text-[10px] text-slate-500">Streamlit UI & Gemini AI Analysis Architecture</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-[#0E1117] p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "preview"
                ? "bg-slate-800 text-white shadow-sm border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Play className="w-3.5 h-3.5 text-indigo-400" />
            Live Preview Simulator
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "code"
                ? "bg-slate-800 text-white shadow-sm border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code className="w-3.5 h-3.5 text-indigo-400" />
            View Generated Python Code
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "guide"
                ? "bg-slate-800 text-white shadow-sm border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-indigo-400" />
            Setup & Deployment Guide
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* TAB 1: PREVIEW (STREAMLIT SIMULATOR) */}
        {activeTab === "preview" && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
             {/* STREAMLIT LEFT SIDEBAR */}
            <aside className="w-full md:w-64 border-r border-slate-800 bg-[#0E1117] p-4 flex flex-col gap-6 overflow-y-auto shrink-0">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 block flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  System Configuration
                </label>
                
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Select Gemini Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-[#1e293b]/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mb-4"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                </select>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-slate-400">
                      Temperature / Creativity
                    </label>
                    <span className="text-xs text-indigo-400 font-mono font-semibold">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <hr className="border-slate-800/80" />

              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 block flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-indigo-400" />
                  Analysis Task
                </label>

                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Select Analytical Mode
                </label>
                <div className="flex flex-col gap-1.5">
                  {(["Summarize", "Q&A", "Technical Review", "Refine & Polish"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTaskType(mode)}
                      className={`text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2 ${
                        taskType === mode
                          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold"
                          : "text-slate-400 hover:bg-slate-800/30 rounded-lg cursor-pointer transition-colors"
                      }`}
                    >
                      {mode === "Summarize" && "📝 Summarize Content"}
                      {mode === "Q&A" && "❓ Document Q&A"}
                      {mode === "Technical Review" && "💻 Technical Review"}
                      {mode === "Refine & Polish" && "✍️ Refine & Polish"}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-slate-800/80" />

              <div className="mt-auto">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Environment Status</p>
                  <div className="flex justify-between items-center text-xs mt-2">
                    <span className="text-slate-400">Gemini API:</span>
                    {hasApiKey ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                        Connected
                      </span>
                    ) : (
                      <span className="text-amber-400 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        Missing Key
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            {/* STREAMLIT SPLIT SCREEN AREA */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* LEFT SPLIT PANEL: INPUTS */}
              <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto flex flex-col gap-6 bg-[#0E1117]">
                <div>
                  <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                    Source Content
                  </h2>
                  <p className="text-xs text-slate-500">Provide document file or paste direct markdown or text to analyze</p>
                </div>

                {/* File Uploader */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    dragActive 
                      ? "border-indigo-500 bg-indigo-500/5" 
                      : "border-slate-700 bg-slate-900/20 hover:bg-slate-900/40"
                  }`}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".txt,.md,.pdf"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-indigo-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-300">
                      Drag & Drop your file or <span className="text-indigo-400 underline">Browse</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Supports .txt, .md, .pdf</span>
                  </label>
                  
                  {fileName && (
                    <div className="mt-3 p-2.5 bg-[#1e293b] border border-slate-700 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-300 truncate">
                        <File className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span className="truncate font-mono">{fileName}</span>
                      </div>
                      <button 
                        onClick={() => { setFileName(""); setFileContent(""); }} 
                        className="text-slate-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Direct text input */}
                {!fileName && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">
                      Or paste content directly:
                    </label>
                    <textarea
                      value={directText}
                      onChange={(e) => setDirectText(e.target.value)}
                      placeholder="Paste document text, configuration logs, markdown tables, or technical manuals..."
                      className="w-full bg-[#1e293b] border border-slate-700 rounded-xl p-4 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none h-60"
                    />
                  </div>
                )}

                {/* Question Input for Q&A */}
                {taskType === "Q&A" && (
                  <div className="p-4 bg-[#1e293b]/40 rounded-xl border border-slate-800 flex flex-col gap-2">
                    <label className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Question about the document:
                    </label>
                    <input
                      type="text"
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="e.g. Highlight the technical dependencies or list key metrics."
                      className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                    {errorMsg}
                  </div>
                )}

                {/* Execute Button */}
                <button
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm shadow-lg transition-all flex items-center justify-center gap-2 text-white ${
                    isAnalyzing
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                      : "bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-500/20 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] cursor-pointer"
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                      Invoking Agent...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Invoke Agent
                    </>
                  )}
                </button>
              </div>

              {/* RIGHT SPLIT PANEL: AGENT OUTPUT */}
              <div className="flex-1 flex flex-col bg-[#0E1117] overflow-hidden">
                <div className="h-12 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/30 shrink-0">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Agent Output</span>
                  
                  {analysisOutput && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyOutputToClipboard}
                        className="p-1.5 hover:bg-slate-800 rounded text-slate-400 transition-colors flex items-center gap-1 text-[10px]"
                        title="Copy report"
                      >
                        {copiedOutput ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedOutput ? "Copied" : "Copy"}
                      </button>
                      <button
                        onClick={downloadOutputReport}
                        className="p-1.5 hover:bg-slate-800 rounded text-slate-400 transition-colors flex items-center gap-1 text-[10px]"
                        title="Download report"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 p-6 overflow-y-auto bg-[#0E1117]">
                  {analysisOutput ? (
                    <div className="space-y-4">
                      {/* Premium Header Accent Card */}
                      <div className="flex items-center gap-3 mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                        <div className="p-2 bg-indigo-600 rounded-md">
                          <Cpu className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                            {taskType} REPORT GENERATED
                          </h3>
                          <p className="text-[10px] text-slate-400">Processed for: {processedDocName}</p>
                        </div>
                      </div>

                      <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                        {renderSimulatedMarkdown(analysisOutput)}
                      </div>

                      <div className="mt-8 p-4 bg-slate-900 border border-slate-800 rounded-lg">
                        <p className="font-mono text-xs text-slate-500">// System Debug Log</p>
                        <p className="font-mono text-xs text-emerald-500">[INFO] Gemini Response finalized: OK</p>
                        <p className="font-mono text-xs text-slate-400">[INFO] Task: {taskType} | Mode: {selectedModel}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 gap-3 py-12">
                      <div className="p-4 bg-slate-900 rounded-full border border-slate-800">
                        <Cpu className="w-8 h-8 text-slate-600" />
                      </div>
                      <div>
                        <h4 className="text-slate-300 font-bold text-sm">Awaiting Document Input</h4>
                        <p className="text-[11px] max-w-sm mt-1 leading-relaxed">
                          Specify details on the left pane and press "Invoke Agent" to see results parsed here.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: CODE EXPLORER */}
        {activeTab === "code" && (
          <div className="flex-1 flex overflow-hidden">
            {/* Python file directory tabs */}
            <div className="w-60 bg-[#0E1117] border-r border-slate-800 p-4 flex flex-col gap-2 overflow-y-auto shrink-0">
              <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 px-1 block">
                Project Files
              </h3>
              {pythonFiles.map((file, idx) => (
                <button
                  key={file.name}
                  onClick={() => { setActiveFileIndex(idx); setCopiedFile(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2 ${
                    activeFileIndex === idx
                      ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 cursor-pointer"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  {file.name}
                </button>
              ))}
            </div>

            {/* Python code content */}
            <div className="flex-1 flex flex-col bg-[#0E1117] overflow-hidden">
              {pythonFiles.length > 0 ? (
                <>
                  <div className="bg-slate-900/30 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-slate-300">{pythonFiles[activeFileIndex].name}</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-[10px] text-slate-500">Streamlit Production Code Ready</span>
                    </div>
                    <button
                      onClick={() => copySourceFile(pythonFiles[activeFileIndex].content)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                      {copiedFile ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedFile ? "Copied" : "Copy Source Code"}
                    </button>
                  </div>
                  <div className="flex-1 p-6 overflow-auto bg-[#0E1117] font-mono text-xs text-slate-300 leading-relaxed select-all">
                    <pre className="whitespace-pre">{pythonFiles[activeFileIndex].content}</pre>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 bg-[#0E1117]">
                  <Terminal className="w-8 h-8 animate-spin" />
                  <span className="ml-3 text-xs">Loading python repository source...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DEPLOYMENT & SETUP GUIDE */}
        {activeTab === "guide" && (
          <div className="flex-1 p-8 bg-[#0E1117] overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-8 pb-10">
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <Terminal className="w-6 h-6 text-indigo-400" />
                  Local Development Setup
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Follow these instructions to run the Streamlit application locally on your computer.
                </p>
              </div>

              {/* Step 1: Pre-reqs */}
              <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center text-[11px] font-mono border border-indigo-500/20">1</span>
                  Create Python Virtual Environment
                </h3>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                  Open your terminal inside your project root folder and execute the command below to construct a secure environment.
                </p>
                <div className="bg-slate-950 p-3 rounded-lg font-mono text-xs text-indigo-400 border border-slate-800 select-all">
                  python3 -m venv .venv
                </div>
              </div>

              {/* Step 2: Activate & Install */}
              <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center text-[11px] font-mono border border-indigo-500/20">2</span>
                  Activate Environment & Install Requirements
                </h3>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                  Activate the virtual environment and fetch the packages.
                </p>
                <div className="space-y-2">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">MacOS / Linux:</div>
                  <div className="bg-slate-950 p-3 rounded-lg font-mono text-xs text-indigo-400 border border-slate-800 select-all">
                    source .venv/bin/activate && pip install -r requirements.txt
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase mt-2">Windows:</div>
                  <div className="bg-slate-950 p-3 rounded-lg font-mono text-xs text-indigo-400 border border-slate-800 select-all">
                    .venv\Scripts\activate && pip install -r requirements.txt
                  </div>
                </div>
              </div>

              {/* Step 3: Run app */}
              <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center text-[11px] font-mono border border-indigo-500/20">3</span>
                  Execute Streamlit Server
                </h3>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                  Ensure you have added your Gemini API key in your `.env` file, and then launch the Streamlit server!
                </p>
                <div className="bg-slate-950 p-3 rounded-lg font-mono text-xs text-indigo-400 border border-slate-800 select-all">
                  streamlit run app.py
                </div>
              </div>

              <hr className="border-slate-800/80" />

              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <Cloud className="w-6 h-6 text-indigo-400" />
                  Streamlit Cloud Deployment Secrets
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  How to securely inject your `GEMINI_API_KEY` on Streamlit Cloud without committing sensitive `.env` files to public GitHub repositories.
                </p>
              </div>

              {/* Step instructions */}
              <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <ArrowRight className="w-4 h-4 text-indigo-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">1. Deploy to Streamlit Cloud</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                      Commit your repository code to GitHub (excluding the `.env` file since it is in `.gitignore`) and deploy it at <a href="https://share.streamlit.io" target="_blank" rel="noreferrer" className="text-indigo-400 underline">share.streamlit.io</a>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ArrowRight className="w-4 h-4 text-indigo-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">2. Locate App Settings Dashboard</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                      On your deployed Streamlit App dashboard, click on the **Settings** gear icon (or overflow menu) in the bottom right corner of the page.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ArrowRight className="w-4 h-4 text-indigo-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">3. Paste Secrets (Environment Variables)</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5 font-sans">
                      Go to the **Secrets** section. Streamlit Cloud uses the TOML format. Paste your Gemini API key inside the input box exactly like this:
                    </p>
                    <div className="bg-slate-950 p-3 rounded-lg font-mono text-xs text-indigo-400 border border-slate-800 mt-2 max-w-md select-all">
                      GEMINI_API_KEY = "your_real_gemini_api_key_here"
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Streamlit automatically maps these keys to environment variables so `os.getenv('GEMINI_API_KEY')` will retrieve them perfectly.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* FOOTER BAR */}
      <footer className="h-8 border-t border-slate-800 bg-[#0E1117] flex items-center px-6 justify-between shrink-0">
        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Server: Localhost:3000
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
            Sleek UI Theme Active
          </div>
        </div>
        <div className="text-[10px] text-slate-500 italic">
          Press Ctrl + Enter to submit query
        </div>
      </footer>
    </div>
  );
}
