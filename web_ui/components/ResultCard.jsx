window.ResultCard = ({ jobId, onNewJob }) => {
    const { useState, useEffect, useRef, useCallback } = React;
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('preview');
    const [currentTime, setCurrentTime] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [parsedCues, setParsedCues] = useState([]);
    const videoRef = useRef(null);
    const cueListRef = useRef(null);

    useEffect(() => {
        window.api.fetchJob(jobId)
            .then(data => {
                setJob(data);
                setLoading(false);
                // Parse SRT into cues
                if (data.srt_content) {
                    setParsedCues(parseSRT(data.srt_content));
                }
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [jobId]);

    // Parse SRT format into structured cue objects
    const parseSRT = (srt) => {
        const cues = [];
        const blocks = srt.trim().split(/\n\s*\n/);
        for (const block of blocks) {
            const lines = block.trim().split('\n');
            if (lines.length < 3) continue;
            const timeLine = lines[1];
            const match = timeLine.match(
                /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
            );
            if (!match) continue;
            const start = +match[1]*3600 + +match[2]*60 + +match[3] + +match[4]/1000;
            const end = +match[5]*3600 + +match[6]*60 + +match[7] + +match[8]/1000;
            const text = lines.slice(2).join(' ');
            cues.push({ index: +lines[0], start, end, text });
        }
        return cues;
    };

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    // Sync video time
    const handleTimeUpdate = useCallback(() => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    }, []);

    // Click a cue to jump the video
    const seekTo = (time) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            videoRef.current.play();
        }
    };

    // Auto-scroll to active cue
    useEffect(() => {
        if (cueListRef.current) {
            const activeEl = cueListRef.current.querySelector('[data-active="true"]');
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [currentTime]);

    // Find active cue
    const activeCue = parsedCues.find(c => currentTime >= c.start && currentTime <= c.end);

    const handleDownload = () => {
        if (!job) return;
        const content = activeTab === 'srt' ? job.srt_content : job.vtt_content;
        const ext = activeTab === 'srt' ? 'srt' : 'vtt';
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${job.filename}_captions.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportVideo = async () => {
        if (!job) return;
        setExporting(true);
        try {
            const response = await fetch(`/api/jobs/${jobId}/export`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to export video');
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `captioned_${job.filename}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            alert(`Export failed: ${err.message}`);
        } finally {
            setExporting(false);
        }
    };

    if (loading) return (
        <div className="text-center p-12 text-slate-500">
            <div className="animate-pulse">Loading results...</div>
        </div>
    );
    
    if (error) return (
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200">
            <h3 className="font-bold mb-2">Error loading job</h3>
            <p>{error}</p>
            <button onClick={onNewJob} className="mt-4 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-100">Go Back</button>
        </div>
    );

    if (job.status === 'failed') return (
         <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 shadow-sm">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <window.Icon name="alert-triangle" className="h-5 w-5" />
                Processing Failed
            </h3>
            <p className="text-sm mb-4">{job.error || "Unknown error during processing"}</p>
            <div className="flex gap-3">
                <button 
                    onClick={onNewJob}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors"
                >
                    Try Again
                </button>
            </div>
        </div>
    );

    const videoUrl = `/api/jobs/${jobId}/video`;
    // Create a blob URL for VTT track
    const vttBlob = job.vtt_content ? URL.createObjectURL(new Blob([job.vtt_content], { type: 'text/vtt' })) : null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-brand-50 border-b border-brand-100 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                    <h2 className="text-lg font-bold text-brand-900 flex items-center gap-2">
                        <window.Icon name="check-circle" className="h-5 w-5 text-emerald-500" />
                        Captions Ready
                    </h2>
                    <p className="text-xs text-brand-700 mt-1">
                        <strong>{job.filename}</strong> — {job.target_lang}
                    </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <button 
                        onClick={handleExportVideo}
                        disabled={exporting}
                        className={`bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-1.5 px-3 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 ${exporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {exporting ? (
                            <window.Icon name="loader-2" className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <window.Icon name="film" className="h-3.5 w-3.5" />
                        )}
                        {exporting ? 'Exporting...' : 'Export Video'}
                    </button>
                    <button 
                        onClick={() => { setActiveTab('srt'); handleDownload(); }}
                        className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-1.5 px-3 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                    >
                        <window.Icon name="download" className="h-3.5 w-3.5" />
                        SRT
                    </button>
                    <button 
                        onClick={() => { setActiveTab('vtt'); handleDownload(); }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-1.5 px-3 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                    >
                        <window.Icon name="download" className="h-3.5 w-3.5" />
                        VTT
                    </button>
                    <button 
                        onClick={onNewJob}
                        className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-medium py-1.5 px-3 rounded-lg transition-colors"
                    >
                        New Job
                    </button>
                </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                {['preview', 'srt', 'vtt'].map(tab => (
                    <button 
                        key={tab}
                        className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab 
                            ? 'border-brand-500 text-brand-700 bg-brand-50/50' 
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'preview' ? '▶ Video Preview' : tab.toUpperCase() + ' Text'}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="p-4">
                {activeTab === 'preview' ? (
                    <div className="space-y-3">
                        {/* Video Player */}
                        <div className="relative bg-black rounded-lg overflow-hidden">
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                controls
                                onTimeUpdate={handleTimeUpdate}
                                className="w-full max-h-[360px]"
                                crossOrigin="anonymous"
                            >
                                {vttBlob && (
                                    <track 
                                        kind="subtitles" 
                                        src={vttBlob} 
                                        srcLang={job.target_lang} 
                                        label="Captions" 
                                        default 
                                    />
                                )}
                            </video>
                            {/* Floating active caption */}
                            {activeCue && (
                                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-black/80 text-white text-sm px-4 py-2 rounded-lg max-w-[90%] text-center backdrop-blur-sm pointer-events-none">
                                    {activeCue.text}
                                </div>
                            )}
                        </div>

                        {/* Timeline Caption List */}
                        <div 
                            ref={cueListRef}
                            className="bg-slate-50 border border-slate-200 rounded-lg max-h-[250px] overflow-y-auto divide-y divide-slate-100"
                        >
                            {parsedCues.length === 0 ? (
                                <div className="p-4 text-center text-slate-400 text-sm">No caption cues found</div>
                            ) : parsedCues.map((cue) => {
                                const isActive = currentTime >= cue.start && currentTime <= cue.end;
                                return (
                                    <div
                                        key={cue.index}
                                        data-active={isActive ? "true" : "false"}
                                        onClick={() => seekTo(cue.start)}
                                        className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-all text-sm ${
                                            isActive 
                                                ? 'bg-brand-100 border-l-4 border-l-brand-500' 
                                                : 'hover:bg-slate-100 border-l-4 border-l-transparent'
                                        }`}
                                    >
                                        <span className={`flex-shrink-0 font-mono text-xs px-1.5 py-0.5 rounded ${
                                            isActive 
                                                ? 'bg-brand-500 text-white' 
                                                : 'bg-slate-200 text-slate-500'
                                        }`}>
                                            {formatTime(cue.start)}
                                        </span>
                                        <span className={`flex-1 ${isActive ? 'text-brand-900 font-medium' : 'text-slate-700'}`}>
                                            {cue.text}
                                        </span>
                                        <span className="flex-shrink-0 text-xs text-slate-400">
                                            {formatTime(cue.end)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm text-slate-700">
                        <pre className="whitespace-pre-wrap">
                            {activeTab === 'srt' ? job.srt_content : job.vtt_content}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};
