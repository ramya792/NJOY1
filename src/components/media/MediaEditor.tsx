import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, RotateCw, FlipHorizontal, FlipVertical, Crop, Scissors,
  Check, Undo2, ZoomIn, ZoomOut, Move, Sun, Contrast, Droplets,
  Sparkles, Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

// ─── Filter Presets ───
export interface FilterPreset {
  name: string;
  label: string;
  css: string;
  preview: string; // CSS filter for thumbnail preview
}

export const FILTER_PRESETS: FilterPreset[] = [
  { name: 'normal', label: 'Normal', css: 'none', preview: 'none' },
  { name: 'clarendon', label: 'Clarendon', css: 'contrast(1.2) saturate(1.35)', preview: 'contrast(1.2) saturate(1.35)' },
  { name: 'gingham', label: 'Gingham', css: 'brightness(1.05) hue-rotate(-10deg)', preview: 'brightness(1.05) hue-rotate(-10deg)' },
  { name: 'moon', label: 'Moon', css: 'grayscale(1) contrast(1.1) brightness(1.1)', preview: 'grayscale(1) contrast(1.1) brightness(1.1)' },
  { name: 'lark', label: 'Lark', css: 'contrast(0.9) brightness(1.1) saturate(1.2)', preview: 'contrast(0.9) brightness(1.1) saturate(1.2)' },
  { name: 'reyes', label: 'Reyes', css: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)', preview: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)' },
  { name: 'juno', label: 'Juno', css: 'contrast(1.2) brightness(1.1) saturate(1.4) sepia(0.05)', preview: 'contrast(1.2) brightness(1.1) saturate(1.4) sepia(0.05)' },
  { name: 'slumber', label: 'Slumber', css: 'saturate(0.66) brightness(1.05) sepia(0.1)', preview: 'saturate(0.66) brightness(1.05) sepia(0.1)' },
  { name: 'crema', label: 'Crema', css: 'sepia(0.15) contrast(1.1) brightness(1.05) saturate(0.9)', preview: 'sepia(0.15) contrast(1.1) brightness(1.05) saturate(0.9)' },
  { name: 'ludwig', label: 'Ludwig', css: 'contrast(1.05) brightness(1.05) saturate(1.3)', preview: 'contrast(1.05) brightness(1.05) saturate(1.3)' },
  { name: 'aden', label: 'Aden', css: 'hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)', preview: 'hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)' },
  { name: 'perpetua', label: 'Perpetua', css: 'brightness(1.05) saturate(1.1)', preview: 'brightness(1.05) saturate(1.1)' },
  { name: 'valencia', label: 'Valencia', css: 'contrast(1.08) brightness(1.08) sepia(0.08)', preview: 'contrast(1.08) brightness(1.08) sepia(0.08)' },
  { name: 'xpro2', label: 'X-Pro II', css: 'contrast(1.3) brightness(1.1) saturate(1.5) sepia(0.1)', preview: 'contrast(1.3) brightness(1.1) saturate(1.5) sepia(0.1)' },
  { name: 'willow', label: 'Willow', css: 'grayscale(0.5) contrast(0.95) brightness(0.9)', preview: 'grayscale(0.5) contrast(0.95) brightness(0.9)' },
  { name: 'lofi', label: 'Lo-Fi', css: 'contrast(1.5) saturate(1.1)', preview: 'contrast(1.5) saturate(1.1)' },
  { name: 'inkwell', label: 'Inkwell', css: 'sepia(0.3) contrast(1.1) brightness(1.1) grayscale(1)', preview: 'sepia(0.3) contrast(1.1) brightness(1.1) grayscale(1)' },
  { name: 'nashville', label: 'Nashville', css: 'sepia(0.2) contrast(1.2) brightness(1.05) saturate(1.2) hue-rotate(-15deg)', preview: 'sepia(0.2) contrast(1.2) brightness(1.05) saturate(1.2) hue-rotate(-15deg)' },
  { name: 'earlybird', label: 'Earlybird', css: 'contrast(0.9) sepia(0.2) brightness(1.15) saturate(1.8) hue-rotate(-10deg)', preview: 'contrast(0.9) sepia(0.2) brightness(1.15) saturate(1.8) hue-rotate(-10deg)' },
  { name: 'rise', label: 'Rise', css: 'brightness(1.15) contrast(0.85) saturate(0.9) sepia(0.1)', preview: 'brightness(1.15) contrast(0.85) saturate(0.9) sepia(0.1)' },
];

// ─── Types ───
interface MediaEditorProps {
  file: File;
  mediaType: 'image' | 'video';
  onSave: (editedFile: File, filter: string) => void;
  onCancel: () => void;
  open: boolean;
}

type EditTool = 'filters' | 'crop' | 'adjust' | 'rotate' | 'trim';

// ─── Component ───
const MediaEditor: React.FC<MediaEditorProps> = ({ file, mediaType, onSave, onCancel, open }) => {
  const [activeTool, setActiveTool] = useState<EditTool>('filters');
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [previewUrl, setPreviewUrl] = useState('');
  
  // Video trim state
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Crop state
  const [cropMode, setCropMode] = useState(false);
  const [cropAspect, setCropAspect] = useState<string>('free');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Load preview
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  // Load video duration
  useEffect(() => {
    if (mediaType === 'video' && videoRef.current) {
      const v = videoRef.current;
      const handleMeta = () => {
        setVideoDuration(v.duration);
        setTrimEnd(100);
      };
      v.addEventListener('loadedmetadata', handleMeta);
      return () => v.removeEventListener('loadedmetadata', handleMeta);
    }
  }, [mediaType, previewUrl]);

  // Build combined CSS filter
  const getCombinedFilter = useCallback(() => {
    const filterPreset = FILTER_PRESETS.find(f => f.name === selectedFilter);
    const adjustFilter = `brightness(${brightness / 100}) contrast(${contrast / 100}) saturate(${saturation / 100})`;
    
    if (filterPreset && filterPreset.name !== 'normal') {
      return `${filterPreset.css} ${adjustFilter}`;
    }
    return adjustFilter;
  }, [selectedFilter, brightness, contrast, saturation]);

  // Build transform string
  const getTransform = useCallback(() => {
    const transforms: string[] = [];
    if (rotation !== 0) transforms.push(`rotate(${rotation}deg)`);
    if (flipH) transforms.push('scaleX(-1)');
    if (flipV) transforms.push('scaleY(-1)');
    return transforms.join(' ') || 'none';
  }, [rotation, flipH, flipV]);

  // Apply edits and export
  const handleSave = async () => {
    if (mediaType === 'image') {
      await saveImage();
    } else {
      // For video, we pass the filter CSS string; actual trimming requires server-side processing
      // So we just return the original file with the filter metadata
      const filterString = getCombinedFilter();
      onSave(file, filterString !== 'brightness(1) contrast(1) saturate(1)' ? filterString : selectedFilter !== 'normal' ? getCombinedFilter() : 'none');
    }
  };

  const saveImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const img = imageRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size  
    const isRotated90 = rotation % 180 !== 0;
    canvas.width = isRotated90 ? img.naturalHeight : img.naturalWidth;
    canvas.height = isRotated90 ? img.naturalWidth : img.naturalHeight;

    // Apply transforms
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    if (flipH) ctx.scale(-1, 1);
    if (flipV) ctx.scale(1, -1);

    // Apply CSS filters via canvas
    ctx.filter = getCombinedFilter();
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    // Export
    canvas.toBlob((blob) => {
      if (blob) {
        const editedFile = new File([blob], file.name, { type: file.type || 'image/jpeg' });
        onSave(editedFile, selectedFilter !== 'normal' ? selectedFilter : 'none');
      }
    }, file.type || 'image/jpeg', 0.92);
  };

  // Reset all edits
  const handleReset = () => {
    setSelectedFilter('normal');
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setTrimStart(0);
    setTrimEnd(100);
  };

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <button onClick={onCancel} className="text-white p-1">
            <X className="w-6 h-6" />
          </button>
          <h3 className="text-white font-semibold">Edit Media</h3>
          <div className="flex items-center gap-2">
            <button onClick={handleReset} className="text-white/70 p-1">
              <Undo2 className="w-5 h-5" />
            </button>
            <Button size="sm" onClick={handleSave} className="rounded-full">
              <Check className="w-4 h-4 mr-1" /> Done
            </Button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex items-center justify-center overflow-hidden p-4 relative">
          {mediaType === 'image' ? (
            <>
              <img
                ref={imageRef}
                src={previewUrl}
                alt="Edit preview"
                className="max-w-full max-h-full object-contain rounded-lg"
                style={{
                  filter: getCombinedFilter(),
                  transform: getTransform(),
                  transition: 'filter 0.2s, transform 0.3s',
                }}
                crossOrigin="anonymous"
              />
              <canvas ref={canvasRef} className="hidden" />
            </>
          ) : (
            <video
              ref={videoRef}
              src={previewUrl}
              className="max-w-full max-h-full object-contain rounded-lg"
              style={{
                filter: getCombinedFilter(),
                transform: getTransform(),
                transition: 'filter 0.2s, transform 0.3s',
              }}
              controls={false}
              autoPlay
              loop
              muted
              playsInline
              onTimeUpdate={() => {
                if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
              }}
            />
          )}
        </div>

        {/* Tool Tabs */}
        <div className="border-t border-white/10">
          {/* Tab Bar */}
          <div className="flex justify-around py-2 px-2 border-b border-white/5">
            {[
              { id: 'filters' as EditTool, icon: Sparkles, label: 'Filters' },
              { id: 'adjust' as EditTool, icon: Sun, label: 'Adjust' },
              { id: 'rotate' as EditTool, icon: RotateCw, label: 'Rotate' },
              ...(mediaType === 'video' ? [{ id: 'trim' as EditTool, icon: Scissors, label: 'Trim' }] : []),
            ].map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                  activeTool === tool.id ? 'text-primary bg-primary/10' : 'text-white/60'
                }`}
              >
                <tool.icon className="w-5 h-5" />
                <span className="text-[10px]">{tool.label}</span>
              </button>
            ))}
          </div>

          {/* Tool Content */}
          <div className="px-3 py-3" style={{ minHeight: '140px' }}>
            {/* === FILTERS TAB === */}
            {activeTool === 'filters' && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {FILTER_PRESETS.map(filter => (
                  <button
                    key={filter.name}
                    onClick={() => setSelectedFilter(filter.name)}
                    className={`flex flex-col items-center gap-1 flex-shrink-0 ${
                      selectedFilter === filter.name ? 'opacity-100' : 'opacity-70'
                    }`}
                  >
                    <div
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedFilter === filter.name ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      {mediaType === 'image' ? (
                        <img
                          src={previewUrl}
                          alt={filter.label}
                          className="w-full h-full object-cover"
                          style={{ filter: filter.preview }}
                        />
                      ) : (
                        <div
                          className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500"
                          style={{ filter: filter.preview }}
                        />
                      )}
                    </div>
                    <span className={`text-[10px] ${
                      selectedFilter === filter.name ? 'text-primary font-semibold' : 'text-white/60'
                    }`}>
                      {filter.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* === ADJUST TAB === */}
            {activeTool === 'adjust' && (
              <div className="space-y-4 px-2">
                <div className="flex items-center gap-3">
                  <Sun className="w-4 h-4 text-white/60 flex-shrink-0" />
                  <span className="text-white/80 text-xs w-16">Brightness</span>
                  <Slider
                    value={[brightness]}
                    onValueChange={(v) => setBrightness(v[0])}
                    min={30}
                    max={200}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-white/50 text-xs w-8 text-right">{brightness}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Contrast className="w-4 h-4 text-white/60 flex-shrink-0" />
                  <span className="text-white/80 text-xs w-16">Contrast</span>
                  <Slider
                    value={[contrast]}
                    onValueChange={(v) => setContrast(v[0])}
                    min={30}
                    max={200}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-white/50 text-xs w-8 text-right">{contrast}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Droplets className="w-4 h-4 text-white/60 flex-shrink-0" />
                  <span className="text-white/80 text-xs w-16">Saturation</span>
                  <Slider
                    value={[saturation]}
                    onValueChange={(v) => setSaturation(v[0])}
                    min={0}
                    max={200}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-white/50 text-xs w-8 text-right">{saturation}%</span>
                </div>
              </div>
            )}

            {/* === ROTATE TAB === */}
            {activeTool === 'rotate' && (
              <div className="flex items-center justify-center gap-6 py-4">
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    <RotateCw className="w-6 h-6" />
                  </div>
                  <span className="text-[10px]">Rotate 90°</span>
                </button>
                <button
                  onClick={() => setFlipH(!flipH)}
                  className={`flex flex-col items-center gap-1 transition-colors ${flipH ? 'text-primary' : 'text-white/70 hover:text-white'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${flipH ? 'bg-primary/20' : 'bg-white/10'}`}>
                    <FlipHorizontal className="w-6 h-6" />
                  </div>
                  <span className="text-[10px]">Flip H</span>
                </button>
                <button
                  onClick={() => setFlipV(!flipV)}
                  className={`flex flex-col items-center gap-1 transition-colors ${flipV ? 'text-primary' : 'text-white/70 hover:text-white'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${flipV ? 'bg-primary/20' : 'bg-white/10'}`}>
                    <FlipVertical className="w-6 h-6" />
                  </div>
                  <span className="text-[10px]">Flip V</span>
                </button>
              </div>
            )}

            {/* === TRIM TAB (Video only) === */}
            {activeTool === 'trim' && mediaType === 'video' && (
              <div className="space-y-3 px-2">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>{formatTime((trimStart / 100) * videoDuration)}</span>
                  <span className="text-white/80 font-medium">
                    Duration: {formatTime(((trimEnd - trimStart) / 100) * videoDuration)}
                  </span>
                  <span>{formatTime((trimEnd / 100) * videoDuration)}</span>
                </div>
                
                {/* Trim range slider */}
                <div className="relative h-12 bg-white/5 rounded-lg overflow-hidden">
                  {/* Progress indicator */}
                  <div
                    className="absolute top-0 bottom-0 bg-primary/20"
                    style={{
                      left: `${trimStart}%`,
                      width: `${trimEnd - trimStart}%`,
                    }}
                  />
                  {/* Current time indicator */}
                  {videoDuration > 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
                      style={{ left: `${(currentTime / videoDuration) * 100}%` }}
                    />
                  )}
                  {/* Start handle */}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={trimStart}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (v < trimEnd - 5) {
                        setTrimStart(v);
                        if (videoRef.current) videoRef.current.currentTime = (v / 100) * videoDuration;
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                </div>

                <div className="flex gap-2">
                  <Slider
                    value={[trimStart]}
                    onValueChange={(v) => {
                      if (v[0] < trimEnd - 5) {
                        setTrimStart(v[0]);
                        if (videoRef.current) videoRef.current.currentTime = (v[0] / 100) * videoDuration;
                      }
                    }}
                    min={0}
                    max={95}
                    step={1}
                    className="flex-1"
                  />
                  <Slider
                    value={[trimEnd]}
                    onValueChange={(v) => {
                      if (v[0] > trimStart + 5) {
                        setTrimEnd(v[0]);
                      }
                    }}
                    min={5}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                </div>
                <p className="text-white/40 text-[10px] text-center">Drag sliders to set start and end points</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MediaEditor;
