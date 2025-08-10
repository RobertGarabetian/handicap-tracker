"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { differential, handicapIndex } from "@/lib/handicap";
import { performOCR, type OCRResult } from "@/lib/ocr";
import type { Doc } from "../../convex/_generated/dataModel";
import { Authenticated, Unauthenticated } from 'convex/react'
import { SignInButton, UserButton } from '@clerk/nextjs'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Authenticated>
        <HandicapTracker />
      </Authenticated>
      <Unauthenticated>
        <SignInPage />
      </Unauthenticated>
    </div>
  )
}

function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Golf Handicap Tracker</h1>
          <p className="text-gray-600">Sign in to track your golf handicap</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <SignInButton mode="modal" />
            <p className="text-sm text-gray-600 mt-4">
              Track your golf rounds and calculate your handicap automatically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HandicapTracker() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOcrDebug, setShowOcrDebug] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [formData, setFormData] = useState({
    course: "",
    rating: 72.0,
    slope: 113,
    gross: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Convex queries and mutations
  const rounds = useQuery(api.rounds.list) || [];
  const addRound = useMutation(api.rounds.add);
  const clearData = useMutation(api.rounds.clearForUser);
  const addDemoData = useMutation(api.rounds.addDemoData);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions or use photo library.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'scorecard.jpg', { type: 'image/jpeg' });
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(blob));
          setFormData(prev => ({ ...prev, course: "", rating: 72.0, slope: 113, gross: 0 }));
          setOcrResult(null);
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

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
      await addDemoData();
    } catch (error) {
      console.error("Failed to add demo data:", error);
      alert("Failed to add demo data. Please try again.");
    }
  };

  const handleClearData = async () => {
    if (confirm("Are you sure you want to clear all your rounds?")) {
      try {
        await clearData();
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
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4">
        <header className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <div></div>
            <UserButton />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Golf Handicap Tracker</h1>
          <p className="text-gray-600">Track your golf rounds and calculate your handicap</p>
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

        {/* Camera Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Capture Scorecard</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Camera/Photo Section */}
            <div>
              {!showCamera && !previewUrl && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">Take a photo of your scorecard or choose from your library</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={startCamera}
                      className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
                    >
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-green-700">Take Photo</span>
                    </button>

                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-blue-700">Choose Photo</span>
                    </label>
                  </div>
                </div>
              )}

              {showCamera && (
                <div className="space-y-4">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      className="w-full h-64 object-cover rounded-lg"
                      autoPlay
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={capturePhoto}
                      className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium"
                    >
                      📸 Capture
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {previewUrl && (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Scorecard preview"
                      className="w-full h-64 object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setOcrResult(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                  <button
                    onClick={handleOCR}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
