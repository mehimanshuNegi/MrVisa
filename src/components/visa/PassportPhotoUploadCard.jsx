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
  FileText,
  ChevronDown,
  XCircle,
  AlertTriangle
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
  const [showAllChecks, setShowAllChecks] = useState(false);
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

  // Status mapping directly from existing validation result
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

  // Full specification checklist definitions
  const checklistItems = [
    {
      id: 'fileValid',
      label: 'Valid format (JPG, PNG, WEBP)',
      pass: !!checks.fileValid,
      failTitle: 'Invalid image format',
      defaultMessage: 'Please upload a standard JPG, PNG, or WEBP image.'
    },
    {
      id: 'orientation',
      label: 'Portrait orientation',
      pass: !!checks.orientation,
      failTitle: 'Portrait orientation required',
      defaultMessage: 'The photograph appears to be landscape. Portrait orientation is expected.'
    },
    {
      id: 'resolution',
      label: 'Sufficient resolution (>300px)',
      pass: !!checks.resolution,
      failTitle: 'Image resolution too low',
      defaultMessage: 'Image resolution is lower than the recommended 300×300px.'
    },
    {
      id: 'faceDetected',
      label: 'Clear face detected & framed',
      pass: !!checks.faceDetected && checks.faceCentered !== false && checks.faceSize !== false,
      failTitle: checks.faceDetected === false ? 'Face not detected' : 'Face framing / centering',
      defaultMessage: checks.faceDetected === false
        ? 'No clear face detected in the photograph. Please ensure your face is fully visible.'
        : 'Face does not appear reasonably centered or sized in the frame.'
    },
    {
      id: 'quality',
      label: 'Good clarity & sharpness',
      pass: !!checks.quality,
      failTitle: 'Image may be blurry',
      defaultMessage: 'Image appears to have noticeable blur or low sharpness.'
    },
    {
      id: 'background',
      label: 'Light / white background',
      pass: checks.background !== false,
      failTitle: 'Background does not meet requirements',
      defaultMessage: 'Background does not appear to be sufficiently light or plain.'
    }
  ];

  // Derive ONLY problematic checks with backend explanations
  const backendErrors = validation?.errors || [];
  const backendWarnings = validation?.warnings || [];

  const problematicChecks = [];

  if (backendErrors.length > 0 || backendWarnings.length > 0) {
    backendErrors.forEach((errMsg) => {
      let title = 'Action needed';
      if (/format|file/i.test(errMsg)) title = 'Invalid image format';
      else if (/resolution|dimension/i.test(errMsg)) title = 'Image resolution too low';
      else if (/face/i.test(errMsg)) title = 'Face not detected';
      else if (/background/i.test(errMsg)) title = 'Background does not meet requirements';
      else if (/blur|sharp/i.test(errMsg)) title = 'Image may be blurry';

      problematicChecks.push({
        severity: 'error',
        title,
        message: errMsg
      });
    });

    backendWarnings.forEach((warnMsg) => {
      let title = 'Review recommended';
      if (/background/i.test(warnMsg)) title = 'Background may not be sufficiently light';
      else if (/blur|sharp/i.test(warnMsg)) title = 'Image may be blurry';
      else if (/resolution/i.test(warnMsg)) title = 'Image resolution lower than recommended';
      else if (/landscape|orientation/i.test(warnMsg)) title = 'Portrait orientation recommended';
      else if (/face/i.test(warnMsg)) title = 'Face framing or centering';
      else if (/dark|brightness|overexposed/i.test(warnMsg)) title = 'Lighting requires review';

      problematicChecks.push({
        severity: 'warning',
        title,
        message: warnMsg
      });
    });
  } else if (!isValid && photoFile) {
    checklistItems
      .filter((item) => !item.pass)
      .forEach((item) => {
        problematicChecks.push({
          severity: isInvalid ? 'error' : 'warning',
          title: item.failTitle,
          message: item.defaultMessage
        });
      });
  }

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
          <div className="lg:col-span-6 space-y-4">
            
            {/* Case 0: No Photo Uploaded Yet (Clean Pending State) */}
            {!photoFile && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2 text-left">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#082B61] flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#2563EB]" />
                    Automated Photo Checks
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Pending Upload</span>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Upload your photograph to run automatic quality checks for face framing, portrait orientation, clarity, and background compliance.
                </p>
              </div>
            )}

            {/* Case 1: Minimal Success State (ALL Checks Passed) */}
            {photoFile && isValid && (
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 space-y-3 transition-all text-left">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                      <CheckCircle2 size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950">Photo verified</h4>
                      <p className="text-[11px] text-emerald-700 font-medium">All photo checks passed</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllChecks((prev) => !prev)}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-white/80 hover:bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors inline-flex items-center gap-1 cursor-pointer flex-shrink-0"
                  >
                    <span>{showAllChecks ? 'Hide checks' : 'View all checks'}</span>
                    <ChevronDown size={13} className={`transition-transform duration-200 ${showAllChecks ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Collapsible complete checks list if user wants to see details */}
                {showAllChecks && (
                  <div className="pt-3 border-t border-emerald-200/60 space-y-2 text-xs">
                    {checklistItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-slate-700">
                        <div className="flex items-center gap-2">
                          <Check size={14} strokeWidth={3} className="text-emerald-600 flex-shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                          Pass
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Case 2: Review Recommended (Show ONLY Problematic Checks) */}
            {photoFile && isReviewNeeded && (
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-3 transition-all text-left">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                      <AlertTriangle size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-950">Photo needs attention</h4>
                      <p className="text-[11px] text-amber-800 font-medium">
                        {validation?.summary || 'Review recommended before proceeding'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllChecks((prev) => !prev)}
                    className="text-[11px] font-semibold text-amber-800 hover:text-amber-900 bg-white/80 hover:bg-white px-2.5 py-1.5 rounded-lg border border-amber-200 transition-colors inline-flex items-center gap-1 cursor-pointer flex-shrink-0"
                  >
                    <span>{showAllChecks ? 'Hide all checks' : 'View all checks'}</span>
                    <ChevronDown size={13} className={`transition-transform duration-200 ${showAllChecks ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* ONLY problematic checks shown immediately */}
                <div className="space-y-2 text-xs pt-1">
                  {problematicChecks.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white/90 border border-amber-200/80 flex items-start gap-2.5">
                      <span className="text-amber-600 font-bold flex-shrink-0 text-sm mt-[-1px]">⚠️</span>
                      <div className="space-y-0.5">
                        <p className="font-bold text-amber-950 text-xs">{item.title}</p>
                        <p className="text-[11px] text-slate-600 font-medium">{item.message}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-amber-800/90 font-medium pt-0.5">
                  Tip: You can continue with this photo or upload a different one. Our visa team also reviews every photograph prior to consulate dispatch.
                </p>

                {/* Collapsible Complete Checklist */}
                {showAllChecks && (
                  <div className="pt-3 border-t border-amber-200/60 space-y-2 text-xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                      Complete Checklist
                    </span>
                    {checklistItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-slate-700">
                        <div className="flex items-center gap-2">
                          {item.pass ? (
                            <Check size={14} strokeWidth={3} className="text-emerald-600 flex-shrink-0" />
                          ) : (
                            <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
                          )}
                          <span>{item.label}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.pass ? 'text-emerald-700 bg-emerald-100/70' : 'text-amber-700 bg-amber-100'
                        }`}>
                          {item.pass ? 'Pass' : 'Review'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Case 3: Action Needed (Show ONLY Failed Checks) */}
            {photoFile && isInvalid && (
              <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/90 space-y-3 transition-all text-left">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                      <XCircle size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-rose-950">Photo needs attention</h4>
                      <p className="text-[11px] text-rose-700 font-medium">
                        {validation?.summary || 'One or more required conditions failed'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllChecks((prev) => !prev)}
                    className="text-[11px] font-semibold text-rose-800 hover:text-rose-900 bg-white/80 hover:bg-white px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors inline-flex items-center gap-1 cursor-pointer flex-shrink-0"
                  >
                    <span>{showAllChecks ? 'Hide all checks' : 'View all checks'}</span>
                    <ChevronDown size={13} className={`transition-transform duration-200 ${showAllChecks ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* ONLY problematic checks shown immediately */}
                <div className="space-y-2 text-xs pt-1">
                  {problematicChecks.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white/90 border border-rose-200/80 flex items-start gap-2.5">
                      <span className="text-rose-600 font-bold flex-shrink-0 text-sm mt-[-1px]">❌</span>
                      <div className="space-y-0.5">
                        <p className="font-bold text-rose-950 text-xs">{item.title}</p>
                        <p className="text-[11px] text-slate-600 font-medium">{item.message}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Collapsible Complete Checklist */}
                {showAllChecks && (
                  <div className="pt-3 border-t border-rose-200/60 space-y-2 text-xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                      Complete Checklist
                    </span>
                    {checklistItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-slate-700">
                        <div className="flex items-center gap-2">
                          {item.pass ? (
                            <Check size={14} strokeWidth={3} className="text-emerald-600 flex-shrink-0" />
                          ) : (
                            <XCircle size={14} className="text-rose-600 flex-shrink-0" />
                          )}
                          <span>{item.label}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.pass ? 'text-emerald-700 bg-emerald-100/70' : 'text-rose-700 bg-rose-100'
                        }`}>
                          {item.pass ? 'Pass' : 'Action Needed'}
                        </span>
                      </div>
                    ))}
                  </div>
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
