window.Editor = ({ jobId, onClose }) => {
    const { useState, useEffect, useRef } = React;
    
    const [job, setJob] = useState(null);
    const [clips, setClips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [fps, setFps] = useState(30);
    const [selectedClip, setSelectedClip] = useState(null);
    const [activeCaption, setActiveCaption] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [saving, setSaving] = useState(false);
    const [showMs, setShowMs] = useState(true);
    
    const videoRef = useRef(null);
    
    useEffect(() => {
        loadData();
    }, [jobId]);
    
    const loadData = async () => {
        setLoading(true);
        try {
            const jobData = await window.api.fetchJob(jobId);
            setJob(jobData);
            
            if (jobData.srt_content) {
                const parsedClips = parseSRT(jobData.srt_content);
                setClips(parsedClips);
            }
            
            setDuration(jobData.duration || 0);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const parseSRT = (srt) => {
        if (!srt) return [];
        const cues = [];
        const blocks = srt.trim().split(/\n\s*\n/);
        for (const block of blocks) {
            const lines = block.trim().split('\n');
            if (lines.length < 3) continue;
            
            const timeLine = lines[1];
            const match = timeLine.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
            if (!match) continue;
            
            const start = +match[1]*3600 + +match[2]*60 + +match[3] + +match[4]/1000;
            const end = +match[5]*3600 + +match[6]*60 + +match[7] + +match[8]/1000;
            const text = lines.slice(2).join(' ');
            
            cues.push({
                id: `clip_${cues.length + 1}`,
                start: start,
                end: end,
                duration: end - start,
                text: text
            });
        }
        return cues;
    };
    
    // Find active caption with buffer for missed frames
    const findActiveCaption = (time, bufferMs = 50) => {
        const buffer = bufferMs / 1000;
        return clips.find(clip => 
            (time >= clip.start - buffer && time <= clip.end + buffer) ||
            (time >= clip.start && time <= clip.end)
        ) || null;
    };
    
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const t = videoRef.current.currentTime;
            setCurrentTime(t);
            setActiveCaption(findActiveCaption(t, 100));
        }
    };
    
    // High-frequency timer to catch short captions
    useEffect(() => {
        if (!isPlaying) return;
        
        const interval = setInterval(() => {
            if (videoRef.current && !videoRef.current.paused) {
                const t = videoRef.current.currentTime;
                setCurrentTime(t);
                const caption = findActiveCaption(t, 100);
                if (caption?.id !== activeCaption?.id) {
                    setActiveCaption(caption);
                }
            }
        }, 16); // ~60fps check rate
        
        return () => clearInterval(interval);
    }, [isPlaying, clips]);
    
    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };
    
    const handlePlay = () => {
        if (videoRef.current) {
            videoRef.current.play();
            setIsPlaying(true);
        }
    };
    
    const handlePause = () => {
        if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };
    
    const stepFrame = (dir) => {
        const frameTime = 1 / fps;
        const newTime = Math.max(0, Math.min(currentTime + (dir * frameTime), duration));
        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
        }
    };
    
    const stepMs = (ms) => {
        const newTime = Math.max(0, Math.min(currentTime + (ms / 1000), duration));
        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
        }
    };
    
    const handleSeek = (time) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
    };
    
    const handleTimelineClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = (x / rect.width) * duration;
        handleSeek(Math.max(0, Math.min(time, duration)));
    };
    
    const handleClipClick = (e, clip) => {
        e.stopPropagation();
        setSelectedClip({...clip});
        handleSeek(clip.start);
    };
    
    const updateClipText = (text) => {
        if (!selectedClip) return;
        const newClips = clips.map(c => 
            c.id === selectedClip.id ? { ...c, text } : c
        );
        setClips(newClips);
        setSelectedClip({ ...selectedClip, text });
    };
    
    const updateClipTiming = (field, value) => {
        if (!selectedClip) return;
        const ms = parseFloat(value);
        if (isNaN(ms)) return;
        
        const seconds = ms / 1000;
        const newClips = clips.map(c => {
            if (c.id === selectedClip.id) {
                if (field === 'start') {
                    const newEnd = Math.max(seconds + 0.1, c.end);
                    return { ...c, start: seconds, end: newEnd, duration: newEnd - seconds };
                } else {
                    return { ...c, end: seconds, duration: seconds - c.start };
                }
            }
            return c;
        });
        setClips(newClips);
        setSelectedClip({ ...selectedClip, [field]: seconds });
    };
    
    const handleSave = async () => {
        if (!jobId) return;
        setSaving(true);
        try {
            const srt = generateSRT(clips);
            await fetch(`/api/jobs/${jobId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ srt_content: srt })
            });
            alert('Saved!');
        } catch (err) {
            alert('Save failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };
    
    const generateSRT = (clipsToExport) => {
        let srt = '';
        clipsToExport.forEach((clip, i) => {
            const start = formatSRTTime(clip.start);
            const end = formatSRTTime(clip.end);
            srt += `${i + 1}\n${start} --> ${end}\n${clip.text || ''}\n\n`;
        });
        return srt;
    };
    
    const handleExportSRT = () => {
        const srt = generateSRT(clips);
        const blob = new Blob([srt], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${job?.filename || 'captions'}.srt`;
        a.click();
    };
    
    // Format with milliseconds: HH:MM:SS.mmm
    const formatTimeMs = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };
    
    // Format short with ms: MM:SS.mmm
    const formatTimeShort = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };
    
    // Parse ms input back to seconds
    const parseMsInput = (str) => {
        const parts = str.split('.');
        if (parts.length === 2) {
            const base = parseInt(parts[0]) * 60 + parseInt(parts[1].substring(0, 2));
            const ms = parseInt(parts[1].substring(0, 3));
            return base * 1000 + ms;
        }
        return parseInt(str) * 1000;
    };
    
    const formatSRTTime = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        const ms = Math.floor((s % 1) * 1000);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    };
    
    const getClipStyle = (clip) => {
        if (duration === 0) return {};
        const left = (clip.start / duration) * 100;
        const width = Math.max(((clip.end - clip.start) / duration) * 100, 0.5);
        return { left: `${left}%`, width: `${width}%` };
    };
    
    const playheadPos = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    // Find nearby captions for visual indicator
    const getNearbyCaption = () => {
        const threshold = 0.5; // seconds
        const next = clips.find(c => c.start > currentTime && c.start - currentTime < threshold);
        const prev = clips.find(c => c.end < currentTime && currentTime - c.end < threshold);
        return { next, prev };
    };
    
    const { next: nextCaption, prev: prevCaption } = getNearbyCaption();
    
    if (loading) return (
        <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center">
            <div className="text-white text-center">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-4">Loading Editor...</p>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
            <div className="bg-red-900 p-6 rounded text-white text-center">
                <p>Error: {error}</p>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-red-700 rounded">Close</button>
            </div>
        </div>
    );
    
    return (
        <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col" style={{ height: '100vh', width: '100vw' }}>
            
            {/* TOP BAR */}
            <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-3 shrink-0">
                <button onClick={onClose} className="text-gray-300 hover:text-white mr-4">Exit</button>
                <span className="text-white font-medium text-sm">{job?.filename || 'Editor'}</span>
                <span className="text-gray-500 text-xs ml-2">({clips.length} captions)</span>
                <div className="flex-1" />
                <button onClick={handleSave} disabled={saving} className="px-3 py-1 bg-purple-600 text-white text-xs rounded mr-2">
                    {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={handleExportSRT} className="px-3 py-1 bg-gray-700 text-white text-xs rounded">
                    Export SRT
                </button>
            </div>
            
            {/* MAIN AREA */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* LEFT PANEL */}
                <div className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                        <h3 className="text-white text-sm font-medium">Captions</h3>
                        <span className="text-purple-400 text-xs font-mono">{clips.length} cues</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                        {clips.length === 0 ? (
                            <p className="text-gray-500 text-xs text-center py-8">No captions found.</p>
                        ) : (
                            clips.map((clip, i) => {
                                const isActive = activeCaption?.id === clip.id;
                                return (
                                    <div
                                        key={clip.id}
                                        onClick={() => handleClipClick({ stopPropagation: () => {} }, clip)}
                                        className={`p-3 border-b border-gray-700 cursor-pointer transition-colors ${
                                            isActive 
                                                ? 'bg-green-900/30 border-l-4 border-l-green-500' 
                                                : 'hover:bg-gray-700'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs font-mono font-bold ${isActive ? 'text-green-400' : 'text-purple-400'}`}>
                                                #{i + 1}
                                            </span>
                                            <span className="text-gray-500 text-[10px] font-mono">
                                                {formatTimeShort(clip.start)}
                                            </span>
                                        </div>
                                        <p className={`text-xs line-clamp-2 ${isActive ? 'text-green-300' : 'text-gray-300'}`}>
                                            {clip.text}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-600">
                                            <span>Dur: <span className="text-gray-400">{clip.duration.toFixed(3)}s</span></span>
                                            <span>End: <span className="text-gray-400">{formatTimeShort(clip.end)}</span></span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    
                    {/* Edit Panel */}
                    {selectedClip && (
                        <div className="p-3 border-t border-gray-700 bg-gray-900">
                            <h4 className="text-gray-400 text-xs uppercase mb-3">Edit Caption #{clips.findIndex(c => c.id === selectedClip.id) + 1}</h4>
                            
                            <textarea
                                value={selectedClip.text || ''}
                                onChange={(e) => updateClipText(e.target.value)}
                                className="w-full bg-gray-800 text-white text-sm p-2 rounded border border-gray-600 resize-none h-20 mb-3"
                            />
                            
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <label className="text-gray-500 text-xs w-14">Start:</label>
                                    <input
                                        type="text"
                                        defaultValue={formatTimeShort(selectedClip.start)}
                                        onBlur={(e) => {
                                            const ms = parseMsInput(e.target.value);
                                            updateClipTiming('start', ms);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const ms = parseMsInput(e.target.value);
                                                updateClipTiming('start', ms);
                                            }
                                        }}
                                        className="flex-1 bg-gray-800 text-purple-400 text-xs p-2 rounded border border-gray-600 font-mono"
                                    />
                                    <button onClick={() => stepMs(-100)} className="text-gray-500 hover:text-white text-xs px-1">-100</button>
                                    <button onClick={() => stepMs(100)} className="text-gray-500 hover:text-white text-xs px-1">+100</button>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <label className="text-gray-500 text-xs w-14">End:</label>
                                    <input
                                        type="text"
                                        defaultValue={formatTimeShort(selectedClip.end)}
                                        onBlur={(e) => {
                                            const ms = parseMsInput(e.target.value);
                                            updateClipTiming('end', ms);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const ms = parseMsInput(e.target.value);
                                                updateClipTiming('end', ms);
                                            }
                                        }}
                                        className="flex-1 bg-gray-800 text-purple-400 text-xs p-2 rounded border border-gray-600 font-mono"
                                    />
                                    <button onClick={() => stepMs(-100)} className="text-gray-500 hover:text-white text-xs px-1">-100</button>
                                    <button onClick={() => stepMs(100)} className="text-gray-500 hover:text-white text-xs px-1">+100</button>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <label className="text-gray-500 text-xs w-14">Dur:</label>
                                    <div className="flex-1 bg-gray-800 text-gray-400 text-xs p-2 rounded border border-gray-700 font-mono">
                                        {selectedClip.duration.toFixed(3)}s
                                    </div>
                                    <button onClick={() => stepMs(-10)} className="text-gray-500 hover:text-white text-xs px-1">-10</button>
                                    <button onClick={() => stepMs(10)} className="text-gray-500 hover:text-white text-xs px-1">+10</button>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 mt-3">
                                <button onClick={() => handleSeek(selectedClip.start)} className="flex-1 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600">
                                    Go to
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* CENTER */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    
                    {/* VIDEO */}
                    <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
                        <video
                            ref={videoRef}
                            src={`/api/jobs/${jobId}/video`}
                            className="max-w-full max-h-full"
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => setIsPlaying(false)}
                            crossOrigin="anonymous"
                        />
                        
                        {/* Caption Overlay */}
                        <div 
                            className="absolute px-6 py-3 rounded text-2xl font-bold text-center max-w-[90%]"
                            style={{
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                color: '#ffffff',
                                bottom: '12%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                display: activeCaption ? 'block' : 'none',
                                textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                            }}
                        >
                            {activeCaption?.text}
                        </div>
                    </div>
                    
                    {/* TRANSPORT */}
                    <div className="h-14 bg-gray-800 border-t border-gray-700 flex items-center px-4 gap-2 shrink-0">
                        {/* Frame step */}
                        <button onClick={() => stepFrame(-1)} className="text-gray-400 hover:text-white p-1" title="Previous Frame">
                            <span className="material-symbols-outlined text-lg">skip_previous</span>
                        </button>
                        <button onClick={() => stepMs(-33)} className="text-gray-500 hover:text-white text-[10px]" title="-33ms">-33</button>
                        
                        <button 
                            onClick={isPlaying ? handlePause : handlePlay}
                            className="w-9 h-9 bg-white text-black rounded-full flex items-center justify-center hover:scale-105"
                        >
                            <span className="material-symbols-outlined text-xl">{isPlaying ? 'pause' : 'play_arrow'}</span>
                        </button>
                        
                        <button onClick={() => stepMs(33)} className="text-gray-500 hover:text-white text-[10px]" title="+33ms">+33</button>
                        <button onClick={() => stepFrame(1)} className="text-gray-400 hover:text-white p-1" title="Next Frame">
                            <span className="material-symbols-outlined text-lg">skip_next</span>
                        </button>
                        
                        {/* Timecode */}
                        <div className="ml-3 bg-black px-3 py-1.5 rounded border border-gray-600">
                            <span className="font-mono text-purple-400 text-sm font-bold tracking-wider">
                                {formatTimeMs(currentTime)}
                            </span>
                        </div>
                        
                        <span className="text-gray-500 text-xs">/ {formatTimeMs(duration)}</span>
                        
                        <div className="flex-1" />
                        
                        {/* Active caption */}
                        {activeCaption && (
                            <div className="px-2 py-1 bg-green-900/50 rounded text-green-400 text-xs max-w-[200px] truncate">
                                {activeCaption.text?.substring(0, 25)}...
                            </div>
                        )}
                        
                        {/* Fine adjust */}
                        <div className="ml-4 flex items-center gap-1">
                            <span className="text-gray-500 text-[10px]">Fine:</span>
                            <button onClick={() => stepMs(-1)} className="text-gray-500 hover:text-white text-xs px-1 bg-gray-700 rounded">-1</button>
                            <button onClick={() => stepMs(1)} className="text-gray-500 hover:text-white text-xs px-1 bg-gray-700 rounded">+1</button>
                            <button onClick={() => stepMs(-10)} className="text-gray-500 hover:text-white text-xs px-1 bg-gray-700 rounded">-10</button>
                            <button onClick={() => stepMs(10)} className="text-gray-500 hover:text-white text-xs px-1 bg-gray-700 rounded">+10</button>
                        </div>
                        
                        {/* Zoom */}
                        <div className="ml-4 flex items-center gap-2">
                            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} className="text-gray-400 hover:text-white">-</button>
                            <span className="text-gray-300 text-xs w-12 text-center">{zoom.toFixed(1)}x</span>
                            <button onClick={() => setZoom(z => Math.min(10, z + 0.5))} className="text-gray-400 hover:text-white">+</button>
                        </div>
                    </div>
                    
                    {/* TIMELINE */}
                    <div className="h-44 bg-gray-900 border-t border-gray-700 flex overflow-hidden shrink-0">
                        <div className="w-12 flex-shrink-0 bg-gray-800 border-r border-gray-700">
                            <div className="h-7 border-b border-gray-700"></div>
                            <div className="h-14 flex items-center justify-center border-b border-gray-700">
                                <span className="font-bold text-yellow-400">S</span>
                            </div>
                        </div>
                        
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Ruler */}
                            <div className="h-7 bg-gray-800 border-b border-gray-700 relative flex-shrink-0 overflow-hidden">
                                {Array.from({ length: Math.ceil(duration / 5) + 1 }).map((_, i) => (
                                    <div 
                                        key={i}
                                        className="absolute top-0 h-full border-l border-gray-600"
                                        style={{ left: `${(i * 5 / duration) * 100}%` }}
                                    >
                                        <span className="text-[9px] text-gray-500 pl-1">{formatTimeShort(i * 5).substring(0, 5)}</span>
                                    </div>
                                ))}
                                <div className="absolute top-0 w-0.5 bg-purple-400 z-10 pointer-events-none" style={{ left: `${playheadPos}%`, height: '100%' }}>
                                    <div className="w-2 h-2 bg-purple-400 -translate-x-1/2 rotate-45 absolute -top-0.5"></div>
                                </div>
                            </div>
                            
                            {/* Tracks */}
                            <div className="flex-1 relative overflow-hidden">
                                <div 
                                    className="absolute inset-0 cursor-crosshair"
                                    onClick={handleTimelineClick}
                                >
                                    {clips.map((clip, ci) => {
                                        const isActive = activeCaption?.id === clip.id;
                                        return (
                                            <div
                                                key={clip.id}
                                                onClick={(e) => handleClipClick(e, clip)}
                                                className={`absolute top-1 h-12 rounded cursor-pointer transition-all ${
                                                    isActive 
                                                        ? 'bg-yellow-400 ring-2 ring-white' 
                                                        : 'bg-yellow-600/70 hover:bg-yellow-500'
                                                }`}
                                                style={getClipStyle(clip)}
                                            >
                                                <div className={`text-[10px] px-1 truncate font-medium overflow-hidden ${isActive ? 'text-black' : 'text-black/80'}`} style={{ marginTop: '2px', paddingLeft: '2px', paddingRight: '2px' }}>
                                                    {clip.text?.substring(0, 20) || `C${ci + 1}`}
                                                </div>
                                                <div className={`text-[8px] px-1 font-mono ${isActive ? 'text-black/60' : 'text-black/50'}`} style={{ paddingLeft: '2px' }}>
                                                    {formatTimeShort(clip.start).substring(0, 7)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {/* Playhead */}
                                <div 
                                    className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none"
                                    style={{ left: `${playheadPos}%` }}
                                >
                                    <div className="w-3 h-3 bg-white -translate-x-1/2 rotate-45 absolute -top-1.5"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* STATUS BAR */}
            <div className="h-6 bg-gray-800 border-t border-gray-700 flex items-center px-3 text-[10px] text-gray-500 shrink-0">
                <span>{isPlaying ? 'Playing' : 'Paused'}</span>
                <div className="flex-1" />
                <span>Time: {formatTimeMs(currentTime)}</span>
                <span className="mx-4">{clips.length} captions</span>
                <span>Active: {activeCaption ? clips.indexOf(activeCaption) + 1 : 'None'}</span>
            </div>
        </div>
    );
};
