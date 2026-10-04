import React, { useState, useRef } from 'react';
import {
  Upload,
  Check,
  AlertCircle,
  Camera,
  RefreshCw,
  Info,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  FileText
} from 'lucide-react';

export default function PassportPhotoUploadCard({
  destination,
  photoFile,
  previewUrl,
  isUploading,
  validation,
  uploadedDoc,
  error,
  onUpload,
  onConfirm,
  onSkip,
  onBack
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  // Status mapping
  const status = validation?.status || (photoFile ? 'VALID' : 'IDLE');
  const isReviewNeeded = status === 'REVIEW_NEEDED';
  const isValid = status === 'VALID';
  const isInvalid = status === 'INVALID';

  const checks = validation?.checks || {
    fileValid: !!photoFile,
    resolution: !!photoFile,
    orientation: !!photoFile,
    faceDetected: !!photoFile,
    quality: !!photoFile,
    background: true
  };

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-10">
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm space-y-7">
        
        {/* Header */}
        <div className="text-left space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#2563EB] bg-[#2563EB]/10 px-3 py-1 rounded-full">
              Step 4 of 6 • Photograph
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <Sparkles size={11} />
              AI Quality Verified
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
            Upload your passport-size photograph
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
            Please upload a recent color photograph taken against a plain light background for your{' '}
            <strong className="text-[#082B61]">{destination?.country?.name || destination?.title || 'Visa'}</strong> application.
          </p>
        </div>

        {/* Global Error Notice if any */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-700 text-xs sm:text-sm">
              <AlertCircle size={16} />
              <span>Photograph Upload Notice</span>
            </div>
            <p className="text-xs text-rose-600">{error}</p>
          </div>
        )}

        {/* Main Content: 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          
          {/* LEFT: Upload Box / Live Preview */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Applicant Photograph
              </span>
              {photoFile && (
                <span className="text-[11px] font-bold text-slate-400">
                  {(photoFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {!previewUrl ? (
              // Empty Drag & Drop Zone
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative w-full aspect-[4/5] rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-6 text-center cursor-pointer group ${
                  isDragOver
                    ? 'border-[#2563EB] bg-[#2563EB]/5 scale-[1.01]'
                    : 'border-slate-300 hover:border-[#2563EB] bg-slate-50/70 hover:bg-white'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[#2563EB] group-hover:scale-110 group-hover:shadow-md transition-all duration-300 mb-4">
                  <Camera size={30} strokeWidth={2.2} />
                </div>
                <h3 className="text-sm font-black text-[#082B61] mb-1">
                  Drag and drop your photo here
                </h3>
                <p className="text-xs text-slate-500 mb-4 font-medium">
                  or <span className="text-[#2563EB] underline font-bold">browse from your computer</span>
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-200/60 text-slate-600 text-[11px] font-semibold">
                  <span>JPG, PNG, WEBP • Max 10MB</span>
                </div>
              </div>
            ) : (
              // Photo Preview Card with Controls
              <div className="relative w-full aspect-[4/5] rounded-3xl border border-slate-200 bg-slate-900 overflow-hidden shadow-md flex items-center justify-center group">
                <img
                  src={previewUrl}
                  alt="Passport Photograph Preview"
                  className="w-full h-full object-cover"
                />

                {/* Uploading Spinner Overlay */}
                {isUploading && (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 text-center space-y-2 z-20">
                    <RefreshCw size={28} className="animate-spin text-[#38BDF8]" />
                    <p className="text-xs font-bold">Verifying photograph quality...</p>
                    <p className="text-[11px] text-slate-300">Checking face framing, resolution & background</p>
                  </div>
                )}

                {/* Top Floating Badge */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                  {isValid && !isUploading && (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/95 text-white text-[11px] font-black tracking-wide shadow-sm flex items-center gap-1.5 backdrop-blur-xs">
                      <CheckCircle2 size={13} strokeWidth={2.5} />
                      Photo Ready
                    </span>
                  )}
                  {isReviewNeeded && !isUploading && (
                    <span className="px-3 py-1 rounded-full bg-amber-500/95 text-white text-[11px] font-black tracking-wide shadow-sm flex items-center gap-1.5 backdrop-blur-xs">
                      <AlertCircle size={13} strokeWidth={2.5} />
                      Review Recommended
                    </span>
                  )}
                  {isInvalid && !isUploading && (
                    <span className="px-3 py-1 rounded-full bg-rose-500/95 text-white text-[11px] font-black tracking-wide shadow-sm flex items-center gap-1.5 backdrop-blur-xs">
                      <AlertCircle size={13} strokeWidth={2.5} />
                      Action Needed
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs">
                    35×45mm
                  </span>
                </div>

                {/* Bottom Overlay Action: Change Photo */}
                <div className="absolute bottom-3 left-3 right-3 z-10">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/95 hover:bg-white text-[#082B61] text-xs font-bold shadow-lg backdrop-blur-xs transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-xl"
                  >
                    <RefreshCw size={14} />
                    <span>Upload a Different Photo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Quality Checks & Visa Photo Guidelines */}
          <div className="lg:col-span-6 space-y-5">
            
            {/* Real-time Quality Checks List */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#082B61] flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#2563EB]" />
                  Automated Photo Checks
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {photoFile ? 'Checked Live' : 'Pending Upload'}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* 1. File & Format Check */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium text-slate-700">
                    {checks.fileValid ? (
                      <Check size={14} strokeWidth={3} className="text-emerald-600 flex-shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 flex-shrink-0" />
                    )}
                    <span>Valid format (JPG, PNG, WEBP)</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${checks.fileValid ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 bg-white'}`}>
                    {checks.fileValid ? 'Pass' : '—'}
                  </span>
                </div>

                {/* 2. Portrait Orientation */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium text-slate-700">
                    {checks.orientation ? (
                      <Check size={14} strokeWidth={3} className="text-emerald-600 flex-shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 flex-shrink-0" />
                    )}
                    <span>Portrait orientation</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${checks.orientation ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 bg-white'}`}>
                    {checks.orientation ? 'Pass' : '—'}
                  </span>
                </div>

                {/* 3. Resolution & Dimensions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium text-slate-700">
                    {checks.resolution ? (
                      <Check size={14} strokeWidth={3} className="text-emerald-600 flex-shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 flex-shrink-0" />
                    )}
                    <span>Sufficient resolution (&gt;300px)</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${checks.resolution ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 bg-white'}`}>
                    {checks.resolution ? 'Pass' : '—'}
                  </span>
                </div>

                {/* 4. Face Detection & Centering */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium text-slate-700">
                    {checks.faceDetected ? (
                      <Check size={14} strokeWidth={3} className="text-emerald-600 flex-shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 flex-shrink-0" />
                    )}
                    <span>Clear face detected & framed</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${checks.faceDetected ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 bg-white'}`}>
                    {checks.faceDetected ? 'Pass' : '—'}
                  </span>
                </div>

                {/* 5. Lighting & Sharpness */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium text-slate-700">
                    {checks.quality ? (
                      <Check size={14} strokeWidth={3} className="text-emerald-600 flex-shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 flex-shrink-0" />
                    )}
                    <span>Good clarity & sharpness</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${checks.quality ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 bg-white'}`}>
                    {checks.quality ? 'Pass' : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Validation Feedback Messages */}
            {validation && (validation.messages?.length > 0 || validation.warnings?.length > 0) && (
              <div className={`p-4 rounded-2xl border text-xs text-left space-y-1.5 ${
                isReviewNeeded
                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-center gap-1.5 font-bold">
                  {isReviewNeeded ? (
                    <AlertCircle size={15} className="text-amber-700 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 size={15} className="text-emerald-700 flex-shrink-0" />
                  )}
                  <span>{validation.summary || (isReviewNeeded ? 'Quality Recommendations' : 'Photo Verified')}</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-600 font-medium">
                  {(validation.warnings || validation.messages || []).map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
                {isReviewNeeded && (
                  <p className="text-[10px] text-amber-800 font-semibold pt-1">
                    Tip: You can continue with this photo or upload a clearer one. Our team also reviews your photo prior to consulate dispatch.
                  </p>
                )}
              </div>
            )}

            {/* General Guidelines Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Official Photo Specifications
              </span>
              <div className="grid grid-cols-2 gap-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-black">✓</span>
                  <span>Light / white background</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-black">✓</span>
                  <span>Face camera directly</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-black">✓</span>
                  <span>Neutral facial expression</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-black">✓</span>
                  <span>No sunglasses or glare</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors py-2 px-3 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Back to Passport Review</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Non-blocking Skip Option */}
            <button
              type="button"
              onClick={onSkip}
              className="w-full sm:w-auto py-3 px-5 rounded-full border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-600 hover:text-[#082B61] transition-colors cursor-pointer"
            >
              Skip photo for now
            </button>

            {/* Confirm & Continue Button */}
            <button
              type="button"
              onClick={onConfirm}
              disabled={isUploading}
              className={`w-full sm:w-auto py-3.5 px-8 rounded-full font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                photoFile || uploadedDoc
                  ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white hover:shadow-lg'
                  : 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white hover:shadow-lg'
              }`}
            >
              <span>{photoFile ? 'Looks good — Continue' : 'Continue to Travellers'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
