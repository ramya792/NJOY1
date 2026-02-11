import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, RotateCw, FlipHorizontal, FlipVertical,
  Crop, Scissors, SlidersHorizontal, Sparkles, Sun, Contrast, Droplets,
  Square, RectangleHorizontal, Smartphone, Circle
} from 'lucide-react';

// ─── Filter Presets ─────────────────────────────────────────────
export const FILTER_PRESETS = [
  { id: 'none', name: 'Original', filter: 'none' },
  { id: 'clarendon', name: 'Clarendon', filter: 'contrast(1.2) saturate(1.35)' },
  { id: 'gingham', name: 'Gingham', filter: 'brightness(1.05) hue-rotate(-10deg)' },
  { id: 'moon', name: 'Moon', filter: 'grayscale(1) contrast(1.1) brightness(1.1)' },
  { id: 'lark', name: 'Lark', filter: 'contrast(0.9) brightness(1.15) saturate(1.2)' },
  { id: 'reyes', name: 'Reyes', filter: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)' },
  { id: 'juno', name: 'Juno', filter: 'contrast(1.15) saturate(1.8) sepia(0.05)' },
  { id: 'slumber', name: 'Slumber', filter: 'saturate(0.66) brightness(1.05) sepia(0.15)' },
  { id: 'crema', name: 'Crema', filter: 'sepia(0.5) contrast(0.9) brightness(1.1) saturate(0.7)' },
  { id: 'ludwig', name: 'Ludwig', filter: 'contrast(1.05) saturate(1.3) brightness(1.05)' },
  { id: 'aden', name: 'Aden', filter: 'hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)' },
  { id: 'perpetua', name: 'Perpetua', filter: 'brightness(1.15) contrast(1.1) saturate(1.3)' },
  { id: 'noir', name: 'Noir', filter: 'grayscale(1) contrast(1.3) brightness(0.9)' },
  { id: 'vintage', name: 'Vintage', filter: 'sepia(0.4) contrast(1.1) brightness(0.95) saturate(0.8)' },
  { id: 'warm', name: 'Warm', filter: 'sepia(0.15) saturate(1.4) brightness(1.05)' },
  { id: 'cool', name: 'Cool', filter: 'hue-rotate(15deg) saturate(0.9) brightness(1.05)' },
  { id: 'dramatic', name: 'Dramatic', filter: 'contrast(1.4) brightness(0.9) saturate(1.2)' },
  { id: 'fade', name: 'Fade', filter: 'contrast(0.8) brightness(1.1) saturate(0.7)' },
  { id: 'vivid', name: 'Vivid', filter: 'saturate(2) contrast(1.1) brightness(1.05)' },
  { id: 'dreamy', name: 'Dreamy', filter: 'brightness(1.15) contrast(0.85) saturate(1.3) blur(0.3px)' },
];

// ─── Aspect Ratio Options ───────────────────────────────────────
const ASPECT_RATIOS = [
  { id: 'free', label: 'Free', icon: Crop, ratio: null },
  { id: '1:1', label: '1:1', icon: Square, ratio: 1 },
  { id: '4:5', label: '4:5', icon: RectangleHorizontal, ratio: 4 / 5 },
  { id: '9:16', label: '9:16', icon: Smartphone, ratio: 9 / 16 },
  { id: '16:9', label: '16:9', icon: RectangleHorizontal, ratio: 16 / 9 },
  { id: 'circle', label: 'Circle', icon: Circle, ratio: 1 },
];

interface MediaEditorProps {
  file: File;
  mediaType: 'image' | 'video';
  onSave: (editedFile: File, filter: string) => void;
  onCancel: () => void;
  open: boolean;
}

const MediaEditor: React.FC<MediaEditorProps> = ({ file, mediaType, onSave, onCancel, open }) => {
  const [activeTab, setActiveTab] = useState<'crop' | 'filters' | 'adjust' | 'trim'>('crop');
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // Crop state
  const [cropEnabled, setCropEnabled] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 100, h: 100 }); // percentage-based
  const [selectedRatio, setSelectedRatio] = useState('free');
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStartRect, setCropStartRect] = useState({ x: 0, y: 0, w: 100, h: 100 });

  // Video trim state
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const trimDragging = useRef<'start' | 'end' | null>(null);

  // Generate preview URL
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Video metadata
  useEffect(() => {
    if (mediaType === 'video' && videoRef.current) {
      const video = videoRef.current;
      const onMeta = () => {
        setVideoDuration(video.duration);
        setTrimEnd(100);
      };
      video.addEventListener('loadedmetadata', onMeta);
      return () => video.removeEventListener('loadedmetadata', onMeta);
    }
  }, [mediaType, previewUrl]);

  // Video time update
  useEffect(() => {
    if (mediaType !== 'video' || !videoRef.current) return;
    const video = videoRef.current;
    const onTime = () => {
      setCurrentTime(video.currentTime);
      const endSec = (trimEnd / 100) * videoDuration;
      if (video.currentTime >= endSec) {
        video.pause();
        setIsPlaying(false);
        video.currentTime = (trimStart / 100) * videoDuration;
      }
    };
    video.addEventListener('timeupdate', onTime);
    return () => video.removeEventListener('timeupdate', onTime);
  }, [mediaType, trimStart, trimEnd, videoDuration]);

  // ─── Combined CSS filter ──────────────────────────────────────
  const getFilterCSS = useCallback(() => {
    const parts: string[] = [];
    if (selectedFilter !== 'none') {
      const preset = FILTER_PRESETS.find(f => f.id === selectedFilter);
      if (preset) return `${preset.filter} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    }
    parts.push(`brightness(${brightness}%)`);
    parts.push(`contrast(${contrast}%)`);
    parts.push(`saturate(${saturation}%)`);
    return parts.join(' ');
  }, [selectedFilter, brightness, contrast, saturation]);

  const getTransformCSS = useCallback(() => {
    const t: string[] = [];
    if (rotation) t.push(`rotate(${rotation}deg)`);
    if (flipH) t.push('scaleX(-1)');
    if (flipV) t.push('scaleY(-1)');
    return t.length ? t.join(' ') : 'none';
  }, [rotation, flipH, flipV]);

  // ─── Crop Drag Handlers ───────────────────────────────────────
  const getPointerPos = (e: React.PointerEvent | PointerEvent) => {
    if (!cropContainerRef.current) return { px: 0, py: 0 };
    const rect = cropContainerRef.current.getBoundingClientRect();
    return {
      px: ((e.clientX - rect.left) / rect.width) * 100,
      py: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleCropPointerDown = (e: React.PointerEvent, type: typeof dragType) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragType(type);
    const pos = getPointerPos(e);
    setDragStart({ x: pos.px, y: pos.py });
    setCropStartRect({ ...cropRect });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleCropPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragType) return;
    const pos = getPointerPos(e);
    const dx = pos.px - dragStart.x;
    const dy = pos.py - dragStart.y;
    const ratio = ASPECT_RATIOS.find(a => a.id === selectedRatio)?.ratio;

    let newRect = { ...cropStartRect };

    if (dragType === 'move') {
      newRect.x = Math.max(0, Math.min(100 - newRect.w, cropStartRect.x + dx));
      newRect.y = Math.max(0, Math.min(100 - newRect.h, cropStartRect.y + dy));
    } else {
      // Handle resize from corners and edges
      let nx = newRect.x, ny = newRect.y, nw = newRect.w, nh = newRect.h;

      if (dragType.includes('e')) { nw = Math.max(10, Math.min(100 - nx, cropStartRect.w + dx)); }
      if (dragType.includes('w')) { const d = Math.min(dx, cropStartRect.w - 10); nx = cropStartRect.x + d; nw = cropStartRect.w - d; }
      if (dragType.includes('s')) { nh = Math.max(10, Math.min(100 - ny, cropStartRect.h + dy)); }
      if (dragType.includes('n')) { const d = Math.min(dy, cropStartRect.h - 10); ny = cropStartRect.y + d; nh = cropStartRect.h - d; }

      // Enforce aspect ratio
      if (ratio) {
        if (cropContainerRef.current) {
          const containerRect = cropContainerRef.current.getBoundingClientRect();
          const containerRatio = containerRect.width / containerRect.height;
          const adjustedRatio = ratio / containerRatio;
          if (dragType.includes('e') || dragType.includes('w')) {
            nh = nw / adjustedRatio;
            if (ny + nh > 100) nh = 100 - ny;
            nw = nh * adjustedRatio;
          } else {
            nw = nh * adjustedRatio;
            if (nx + nw > 100) nw = 100 - nx;
            nh = nw / adjustedRatio;
          }
        }
      }

      newRect = { x: Math.max(0, nx), y: Math.max(0, ny), w: Math.max(10, nw), h: Math.max(10, nh) };
    }

    setCropRect(newRect);
  }, [isDragging, dragType, dragStart, cropStartRect, selectedRatio]);

  const handleCropPointerUp = () => {
    setIsDragging(false);
    setDragType(null);
  };

  // Reset crop when ratio changes
  const handleRatioSelect = (ratioId: string) => {
    setSelectedRatio(ratioId);
    setCropEnabled(true);
    const ratio = ASPECT_RATIOS.find(a => a.id === ratioId)?.ratio;
    if (!ratio || !cropContainerRef.current) {
      setCropRect({ x: 5, y: 5, w: 90, h: 90 });
      return;
    }
    const containerRect = cropContainerRef.current.getBoundingClientRect();
    const containerRatio = containerRect.width / containerRect.height;
    const adjustedRatio = ratio / containerRatio;
    let w = 80, h = 80;
    if (adjustedRatio > 1) { h = w / adjustedRatio; }
    else { w = h * adjustedRatio; }
    setCropRect({ x: (100 - w) / 2, y: (100 - h) / 2, w, h });
  };

  // ─── Video Trim Handlers ──────────────────────────────────────
  const handleTrimPointerDown = (type: 'start' | 'end') => (e: React.PointerEvent) => {
    e.preventDefault();
    trimDragging.current = type;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleTrimPointerMove = (e: React.PointerEvent) => {
    if (!trimDragging.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    if (trimDragging.current === 'start') {
      setTrimStart(Math.min(pct, trimEnd - 5));
    } else {
      setTrimEnd(Math.max(pct, trimStart + 5));
    }
  };

  const handleTrimPointerUp = () => {
    trimDragging.current = null;
  };

  const playTrimPreview = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    video.currentTime = (trimStart / 100) * videoDuration;
    video.play();
    setIsPlaying(true);
  };

  const pauseVideo = () => {
    videoRef.current?.pause();
    setIsPlaying(false);
  };

  // ─── Save / Export ────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      if (mediaType === 'image') {
        // For images: apply crop, filter, rotation, flip via Canvas
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = previewUrl;
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Calculate crop in actual pixels
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (cropEnabled) {
          sx = (cropRect.x / 100) * img.width;
          sy = (cropRect.y / 100) * img.height;
          sw = (cropRect.w / 100) * img.width;
          sh = (cropRect.h / 100) * img.height;
        }

        // Handle rotation canvas sizing
        const isRotated90 = rotation === 90 || rotation === 270;
        canvas.width = isRotated90 ? sh : sw;
        canvas.height = isRotated90 ? sw : sh;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        if (flipH) ctx.scale(-1, 1);
        if (flipV) ctx.scale(1, -1);

        // Apply CSS filter
        const filterCSS = getFilterCSS();
        if (filterCSS !== 'none') ctx.filter = filterCSS.replace(/blur\([^)]+\)/g, '');

        const dw = isRotated90 ? sh : sw;
        const dh = isRotated90 ? sw : sh;
        ctx.drawImage(img, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();

        // Apply circle mask
        if (selectedRatio === 'circle') {
          ctx.globalCompositeOperation = 'destination-in';
          ctx.beginPath();
          ctx.ellipse(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.92);
        });
        const editedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
        onSave(editedFile, selectedFilter);
      } else {
        // For videos: we can't fully re-encode in browser, so we save trim info + filter as metadata
        // The video file is passed through with filter info
        // In a production app, FFmpeg.wasm would handle this
        onSave(file, `${selectedFilter}|trim:${trimStart}-${trimEnd}|brightness:${brightness}|contrast:${contrast}|saturation:${saturation}`);
      }
    } catch (error) {
      console.error('Error saving media:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!open) return null;

  const tabs = mediaType === 'video'
    ? [
        { id: 'trim' as const, label: 'Trim', icon: Scissors },
        { id: 'crop' as const, label: 'Crop', icon: Crop },
        { id: 'filters' as const, label: 'Filters', icon: Sparkles },
        { id: 'adjust' as const, label: 'Adjust', icon: SlidersHorizontal },
      ]
    : [
        { id: 'crop' as const, label: 'Crop', icon: Crop },
        { id: 'filters' as const, label: 'Filters', icon: Sparkles },
        { id: 'adjust' as const, label: 'Adjust', icon: SlidersHorizontal },
      ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
          <button onClick={onCancel} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
          <h3 className="text-white font-semibold text-base">Edit Media</h3>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Done'}
          </button>
        </div>

        {/* Preview Area */}
        <div ref={previewRef} className="flex-1 flex items-center justify-center overflow-hidden p-4 min-h-0">
          <div
            ref={cropContainerRef}
            className="relative max-w-full max-h-full"
            style={{ touchAction: 'none' }}
            onPointerMove={cropEnabled ? handleCropPointerMove : undefined}
            onPointerUp={cropEnabled ? handleCropPointerUp : undefined}
            onPointerLeave={cropEnabled ? handleCropPointerUp : undefined}
          >
            {mediaType === 'image' ? (
              <img
                ref={imgRef}
                src={previewUrl}
                alt="Edit preview"
                className="max-w-full max-h-[55vh] object-contain rounded-lg"
                style={{
                  filter: getFilterCSS(),
                  transform: getTransformCSS(),
                  transition: 'filter 0.2s, transform 0.3s',
                }}
                draggable={false}
              />
            ) : (
              <video
                ref={videoRef}
                src={previewUrl}
                className="max-w-full max-h-[55vh] object-contain rounded-lg"
                style={{
                  filter: getFilterCSS(),
                  transform: getTransformCSS(),
                  transition: 'filter 0.2s, transform 0.3s',
                }}
                playsInline
                muted={false}
              />
            )}

            {/* Crop Overlay */}
            {cropEnabled && (
              <>
                {/* Dark overlay outside crop area */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-black/60" />
                  <div
                    className="absolute bg-transparent"
                    style={{
                      left: `${cropRect.x}%`,
                      top: `${cropRect.y}%`,
                      width: `${cropRect.w}%`,
                      height: `${cropRect.h}%`,
                      boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
                      borderRadius: selectedRatio === 'circle' ? '50%' : '0',
                    }}
                  />
                </div>

                {/* Crop border + grid */}
                <div
                  className="absolute border-2 border-white cursor-move"
                  style={{
                    left: `${cropRect.x}%`,
                    top: `${cropRect.y}%`,
                    width: `${cropRect.w}%`,
                    height: `${cropRect.h}%`,
                    borderRadius: selectedRatio === 'circle' ? '50%' : '0',
                  }}
                  onPointerDown={(e) => handleCropPointerDown(e, 'move')}
                >
                  {/* Rule of thirds grid */}
                  {selectedRatio !== 'circle' && (
                    <>
                      <div className="absolute left-[33%] top-0 bottom-0 w-px bg-white/30 pointer-events-none" />
                      <div className="absolute left-[66%] top-0 bottom-0 w-px bg-white/30 pointer-events-none" />
                      <div className="absolute top-[33%] left-0 right-0 h-px bg-white/30 pointer-events-none" />
                      <div className="absolute top-[66%] left-0 right-0 h-px bg-white/30 pointer-events-none" />
                    </>
                  )}
                </div>

                {/* Corner handles */}
                {selectedRatio !== 'circle' && ['nw', 'ne', 'sw', 'se'].map((corner) => {
                  const isTop = corner.includes('n');
                  const isLeft = corner.includes('w');
                  return (
                    <div
                      key={corner}
                      className="absolute w-6 h-6 z-10"
                      style={{
                        left: `calc(${cropRect.x + (isLeft ? 0 : cropRect.w)}% - 12px)`,
                        top: `calc(${cropRect.y + (isTop ? 0 : cropRect.h)}% - 12px)`,
                        cursor: `${corner}-resize`,
                      }}
                      onPointerDown={(e) => handleCropPointerDown(e, corner as any)}
                    >
                      <div
                        className="absolute bg-white"
                        style={{
                          width: '20px', height: '3px',
                          [isTop ? 'top' : 'bottom']: '10px',
                          [isLeft ? 'left' : 'right']: '10px',
                        }}
                      />
                      <div
                        className="absolute bg-white"
                        style={{
                          width: '3px', height: '20px',
                          [isTop ? 'top' : 'bottom']: '10px',
                          [isLeft ? 'left' : 'right']: '10px',
                        }}
                      />
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Tool Tabs */}
        <div className="bg-black/90 backdrop-blur-sm border-t border-white/10 flex-shrink-0">
          {/* Tab Headers */}
          <div className="flex border-b border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== 'crop') setCropEnabled(false);
                  if (tab.id === 'crop') setCropEnabled(true);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="px-4 py-3 max-h-[35vh] overflow-y-auto">
            {/* ── Crop Tab ────────────────────────────── */}
            {activeTab === 'crop' && (
              <div className="space-y-4">
                {/* Aspect Ratio Options */}
                <div>
                  <p className="text-white/50 text-xs mb-2 font-medium">ASPECT RATIO</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {ASPECT_RATIOS.map((ar) => (
                      <button
                        key={ar.id}
                        onClick={() => handleRatioSelect(ar.id)}
                        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[56px] ${
                          selectedRatio === ar.id
                            ? 'bg-primary text-white'
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
                        }`}
                      >
                        <ar.icon className="w-4 h-4" />
                        <span className="text-[10px] font-medium">{ar.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rotate & Flip */}
                <div>
                  <p className="text-white/50 text-xs mb-2 font-medium">TRANSFORM</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white/10 text-white/80 hover:bg-white/15 transition-colors"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span className="text-xs">Rotate</span>
                    </button>
                    <button
                      onClick={() => setFlipH(!flipH)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg transition-colors ${
                        flipH ? 'bg-primary text-white' : 'bg-white/10 text-white/80 hover:bg-white/15'
                      }`}
                    >
                      <FlipHorizontal className="w-4 h-4" />
                      <span className="text-xs">Flip H</span>
                    </button>
                    <button
                      onClick={() => setFlipV(!flipV)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg transition-colors ${
                        flipV ? 'bg-primary text-white' : 'bg-white/10 text-white/80 hover:bg-white/15'
                      }`}
                    >
                      <FlipVertical className="w-4 h-4" />
                      <span className="text-xs">Flip V</span>
                    </button>
                  </div>
                </div>

                {cropEnabled && (
                  <p className="text-white/40 text-xs text-center">
                    Drag the crop area or use corner handles to resize
                  </p>
                )}
              </div>
            )}

            {/* ── Filters Tab ─────────────────────────── */}
            {activeTab === 'filters' && (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {FILTER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedFilter(preset.id)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0"
                  >
                    <div
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedFilter === preset.id ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      {mediaType === 'image' ? (
                        <img
                          src={previewUrl}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                          style={{ filter: preset.filter }}
                          draggable={false}
                        />
                      ) : (
                        <div
                          className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center"
                          style={{ filter: preset.filter }}
                        >
                          <Sparkles className="w-5 h-5 text-white/60" />
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-medium ${
                      selectedFilter === preset.id ? 'text-primary' : 'text-white/60'
                    }`}>
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* ── Adjust Tab ──────────────────────────── */}
            {activeTab === 'adjust' && (
              <div className="space-y-4">
                {/* Brightness */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-white/60" />
                      <span className="text-xs text-white/70 font-medium">Brightness</span>
                    </div>
                    <span className="text-xs text-white/50 font-mono">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="200"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-white/20 accent-primary"
                  />
                </div>

                {/* Contrast */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Contrast className="w-3.5 h-3.5 text-white/60" />
                      <span className="text-xs text-white/70 font-medium">Contrast</span>
                    </div>
                    <span className="text-xs text-white/50 font-mono">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="200"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-white/20 accent-primary"
                  />
                </div>

                {/* Saturation */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-white/60" />
                      <span className="text-xs text-white/70 font-medium">Saturation</span>
                    </div>
                    <span className="text-xs text-white/50 font-mono">{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-white/20 accent-primary"
                  />
                </div>

                {/* Reset button */}
                <button
                  onClick={() => { setBrightness(100); setContrast(100); setSaturation(100); }}
                  className="w-full py-2 text-xs text-white/50 hover:text-white/80 transition-colors"
                >
                  Reset Adjustments
                </button>
              </div>
            )}

            {/* ── Trim Tab (Video only) ───────────────── */}
            {activeTab === 'trim' && mediaType === 'video' && (
              <div className="space-y-4">
                {/* Time display */}
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>Start: {formatTime((trimStart / 100) * videoDuration)}</span>
                  <span className="text-white font-medium">
                    Duration: {formatTime(((trimEnd - trimStart) / 100) * videoDuration)}
                  </span>
                  <span>End: {formatTime((trimEnd / 100) * videoDuration)}</span>
                </div>

                {/* Timeline slider */}
                <div
                  className="relative h-14 bg-white/5 rounded-xl overflow-hidden touch-none select-none"
                  onPointerMove={handleTrimPointerMove}
                  onPointerUp={handleTrimPointerUp}
                  onPointerLeave={handleTrimPointerUp}
                >
                  {/* Inactive zones */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-black/60 z-10"
                    style={{ width: `${trimStart}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 right-0 bg-black/60 z-10"
                    style={{ width: `${100 - trimEnd}%` }}
                  />

                  {/* Active zone */}
                  <div
                    className="absolute top-0 bottom-0 border-y-2 border-primary/80"
                    style={{
                      left: `${trimStart}%`,
                      width: `${trimEnd - trimStart}%`,
                    }}
                  />

                  {/* Video thumbnail waveform placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center gap-[3px] px-2">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full bg-white/15"
                        style={{ height: `${20 + Math.sin(i * 0.7) * 30 + Math.random() * 20}%` }}
                      />
                    ))}
                  </div>

                  {/* Current time indicator */}
                  {videoDuration > 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white z-20"
                      style={{ left: `${(currentTime / videoDuration) * 100}%` }}
                    />
                  )}

                  {/* Start handle */}
                  <div
                    className="absolute top-0 bottom-0 w-5 bg-primary rounded-l-lg z-20 flex items-center justify-center cursor-ew-resize touch-none"
                    style={{ left: `calc(${trimStart}% - 10px)` }}
                    onPointerDown={handleTrimPointerDown('start')}
                  >
                    <div className="w-1 h-6 bg-white/80 rounded-full" />
                  </div>

                  {/* End handle */}
                  <div
                    className="absolute top-0 bottom-0 w-5 bg-primary rounded-r-lg z-20 flex items-center justify-center cursor-ew-resize touch-none"
                    style={{ left: `calc(${trimEnd}% - 10px)` }}
                    onPointerDown={handleTrimPointerDown('end')}
                  >
                    <div className="w-1 h-6 bg-white/80 rounded-full" />
                  </div>
                </div>

                {/* Play controls */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={isPlaying ? pauseVideo : playTrimPreview}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-medium"
                  >
                    {isPlaying ? (
                      <>
                        <div className="flex gap-1">
                          <div className="w-1 h-4 bg-white rounded" />
                          <div className="w-1 h-4 bg-white rounded" />
                        </div>
                        Pause
                      </>
                    ) : (
                      <>
                        <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[5px] border-y-transparent ml-0.5" />
                        Preview Trim
                      </>
                    )}
                  </button>
                </div>

                <p className="text-white/40 text-xs text-center">
                  Drag the handles to set start and end points for the video
                </p>
              </div>
            )}
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </AnimatePresence>
  );
};

export default MediaEditor;
