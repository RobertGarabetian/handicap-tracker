"use client";

import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { differential, handicapIndex } from "@/lib/handicap";
import { performOCR, type OCRResult } from "@/lib/ocr";
import type { Doc } from "../../convex/_generated/dataModel";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOcrDebug, setShowOcrDebug] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [formData, setFormData] = useState({
    course: "",
    rating: 72.0,
    slope: 113,
    gross: 0,
    date: new Date().toISOString().split('T')[0]
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Convex queries and mutations
  const rounds = useQuery(api.rounds.list, { userId: undefined }) || [];
  const addRound = useMutation(api.rounds.add);
  const clearData = useMutation(api.rounds.clearForUser);
  const addDemoData = useMutation(api.rounds.addDemoData);
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setFormData(prev => ({ ...prev, course: "", rating: 72.0, slope: 113, gross: 0 }));
      setOcrResult(null);
    }
  };
  
  const handleOCR = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    try {
      const result = await performOCR(selectedFile);
      setOcrResult(result);
      setFormData(prev => ({
        ...prev,
        course: result.course,
        rating: result.rating,
        slope: result.slope,
        gross: result.gross
      }));
    } catch (error) {
      console.error("OCR failed:", error);
      alert("OCR processing failed. Please try again or enter data manually.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleSaveRound = async () => {
    if (!formData.course || !formData.gross || !formData.rating || !formData.slope) {
      alert("Please fill in all required fields");
      return;
    }
    
    const diff = differential(formData.gross, formData.rating, formData.slope);
    
    try {
      await addRound({
        userId: undefined,
        date: formData.date,
        course: formData.course,
        rating: formData.rating,
        slope: formData.slope,
        gross: formData.gross,
        differential: diff,
        ocrRaw: ocrResult?.ocrRaw,
        imageUrl: previewUrl || undefined
      });
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setOcrResult(null);
      setFormData({
        course: "",
        rating: 72.0,
        slope: 113,
        gross: 0,
        date: new Date().toISOString().split('T')[0]
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      
    } catch (error) {
      console.error("Failed to save round:", error);
      alert("Failed to save round. Please try again.");
    }
  };
  
  const handleDemoData = async () => {
    try {
      await addDemoData({ userId: undefined });
    } catch (error) {
      console.error("Failed to add demo data:", error);
      alert("Failed to add demo data. Please try again.");
    }
  };
  
  const handleClearData = async () => {
    if (confirm("Are you sure you want to clear all your rounds?")) {
      try {
        await clearData({ userId: "demo" }); // Using demo user for now
      } catch (error) {
        console.error("Failed to clear data:", error);
        alert("Failed to clear data. Please try again.");
      }
    }
  };
  
  // Calculate current handicap index
  const differentials = rounds?.map((r: Doc<"rounds">) => r.differential) || [];
  const currentHandicap = handicapIndex(differentials);
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Golf Handicap Tracker</h1>
          <p className="text-gray-600">Upload scorecard photos and track your handicap automatically</p>
        </header>
        
        {/* Current Handicap Display */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Current Handicap Index</h2>
            <div className="text-5xl font-bold text-green-600">{currentHandicap}</div>
            <p className="text-sm text-gray-500 mt-2">
              Based on {rounds?.length || 0} rounds
            </p>
          </div>
        </div>
        
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload Scorecard</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File Upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              
              {previewUrl && (
                <div className="mt-4">
                  <img
                    src={previewUrl}
                    alt="Scorecard preview"
                    className="max-w-full h-auto rounded-lg border"
                  />
                  <button
                    onClick={handleOCR}
                    disabled={isProcessing}
                    className="mt-2 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? "Processing..." : "Extract Data with OCR"}
                  </button>
                </div>
              )}
            </div>
            
            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course Name
                </label>
                <input
                  type="text"
                  value={formData.course}
                  onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter course name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course Rating
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData(prev => ({ ...prev, rating: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slope Rating
                  </label>
                  <input
                    type="number"
                    value={formData.slope}
                    onChange={(e) => setFormData(prev => ({ ...prev, slope: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gross Score
                </label>
                <input
                  type="number"
                  value={formData.gross}
                  onChange={(e) => setFormData(prev => ({ ...prev, gross: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              {/* Differential Display */}
              {formData.gross > 0 && formData.rating > 0 && formData.slope > 0 && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600">Differential:</p>
                  <p className="text-lg font-semibold text-green-600">
                    {differential(formData.gross, formData.rating, formData.slope).toFixed(1)}
                  </p>
                </div>
              )}
              
              <button
                onClick={handleSaveRound}
                disabled={!formData.course || !formData.gross || !formData.rating || !formData.slope}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Round
              </button>
            </div>
          </div>
          
          {/* OCR Debug Section */}
          {ocrResult && (
            <div className="mt-6">
              <button
                onClick={() => setShowOcrDebug(!showOcrDebug)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showOcrDebug ? "Hide" : "Show"} OCR Text (Debug)
              </button>
              {showOcrDebug && (
                <div className="mt-2 p-3 bg-gray-100 rounded-md">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">{ocrResult.ocrRaw}</pre>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={handleDemoData}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            Add Demo Data
          </button>
          <button
            onClick={handleClearData}
            className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
          >
            Clear My Data
          </button>
        </div>
        
        {/* Rounds Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Your Rounds</h2>
          </div>
          
          {rounds && rounds.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slope
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gross
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Differential
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rounds.map((round: Doc<"rounds">) => (
                    <tr key={round._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(round.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {round.course}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {round.rating}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {round.slope}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {round.gross}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {round.differential.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              <p>No rounds recorded yet. Upload a scorecard to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
