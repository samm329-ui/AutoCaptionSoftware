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
        <div className="relative w-full max-w-[560px] p-12 rounded-lg bg-surface-container-low border border-outline-variant/10 shadow-2xl flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-primary animate-spin mb-4">settings</span>
            <div className="animate-pulse text-on-surface font-medium uppercase tracking-widest text-sm">Decoding Workspace...</div>
        </div>
    );
    
    if (error) return (
        <div className="relative w-full max-w-[560px] p-8 rounded-lg bg-error-container/10 border border-error/30 shadow-2xl">
            <h3 className="font-bold mb-2 text-error text-sm uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                Network Error
            </h3>
            <p className="text-on-surface-variant text-sm">{error}</p>
            <div className="flex gap-3 mt-6">
                <button 
                    onClick={() => { setError(null); setLoading(true); window.api.fetchJob(jobId).then(data => { setJob(data); setLoading(false); if (data.srt_content) setParsedCues(parseSRT(data.srt_content)); }).catch(err => { setError(err.message); setLoading(false); }); }}
                    className="px-4 py-2 bg-primary text-on-primary border border-primary/50 rounded uppercase font-bold text-xs tracking-wider hover:bg-primary-fixed transition-colors"
                >
                    Retry
                </button>
                <button onClick={onNewJob} className="px-4 py-2 bg-error/10 text-error border border-error/50 rounded uppercase font-bold text-xs tracking-wider hover:bg-error/20 transition-colors">Go Back</button>
            </div>
        </div>
    );

    if (job.status === 'failed') return (
         <div className="relative w-full max-w-[560px] p-8 rounded-lg bg-error-container/10 border border-error/50 shadow-2xl">
             <h3 className="font-bold mb-2 text-error text-sm uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">gpp_bad</span>
                Processing Failed
            </h3>
            <p className="text-on-surface-variant text-sm mb-2">Job: <span className="font-mono text-on-surface">{job.filename}</span></p>
            <p className="text-on-surface text-sm mb-6">{job.error || "Unknown error during processing pipeline."}</p>
            <div className="flex gap-3">
                <button 
                    onClick={async () => {
                        // Reset job status and restart
                        setLoading(true);
                        setError(null);
                        try {
                            const data = await window.api.fetchJob(jobId);
                            setJob(data);
                            setLoading(false);
                        } catch (err) {
                            setError(err.message);
                            setLoading(false);
                        }
                    }}
                    className="bg-primary text-on-primary hover:bg-primary-fixed font-bold py-2 px-6 rounded uppercase tracking-wider text-xs shadow-lg transition-all"
                >
                    Retry
                </button>
                <button 
                    onClick={onNewJob}
                    className="bg-surface-container text-on-surface border border-outline-variant/30 hover:bg-surface-container-high font-bold py-2 px-6 rounded uppercase tracking-wider text-xs transition-all"
                >
                    New Project
                </button>
            </div>
        </div>
    );

    const videoUrl = `/api/jobs/${jobId}/video`;
    // Create a blob URL for VTT track
    const vttBlob = job.vtt_content ? URL.createObjectURL(new Blob([job.vtt_content], { type: 'text/vtt' })) : null;

    return (
        <div className="relative w-full max-w-[800px] bg-surface-container-low rounded-lg shadow-2xl border border-outline-variant/10 overflow-hidden flex flex-col">
            <div className="absolute -inset-[1px] rounded-lg border border-dashed border-outline-variant/30 pointer-events-none z-10"></div>
            
            {/* Header */}
            <div className="bg-surface-container border-b border-outline-variant/20 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-20">
                <div>
                    <h2 className="text-sm font-bold tracking-[0.15em] text-primary uppercase mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[#34d399]">check_circle</span>
                        Captions Rendered
                    </h2>
                    <p className="text-[0.6875rem] font-mono text-on-surface-variant mt-1 uppercase tracking-widest">
                        <strong className="text-on-surface">{job.filename}</strong> | {job.target_lang}
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap flex-shrink-0">
                    <button 
                        onClick={handleExportVideo}
                        disabled={exporting}
                        className={`bg-primary hover:bg-primary-fixed text-on-primary text-[0.6875rem] font-bold uppercase tracking-widest py-2 px-4 rounded shadow-lg transition-all flex items-center gap-2 ${exporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {exporting ? (
                            <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                        ) : (
                            <span className="material-symbols-outlined text-[16px]">movie</span>
                        )}
                        {exporting ? 'Exporting...' : 'Export Video'}
                    </button>
                    <button 
                        onClick={() => { setActiveTab('srt'); handleDownload(); }}
                        className="bg-surface hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface text-[0.6875rem] font-bold uppercase tracking-widest py-2 px-3 rounded shadow-sm transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        SRT
                    </button>
                    <button 
                        onClick={() => { setActiveTab('vtt'); handleDownload(); }}
                        className="bg-surface hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface text-[0.6875rem] font-bold uppercase tracking-widest py-2 px-3 rounded shadow-sm transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        VTT
                    </button>
                    <button 
                        onClick={onNewJob}
                        className="bg-transparent border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface text-[0.6875rem] font-bold uppercase tracking-widest py-2 px-3 rounded transition-colors"
                    >
                        New Job
                    </button>
                </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-outline-variant/20 bg-surface-container relative z-20">
                {['preview', 'srt', 'vtt'].map(tab => (
                    <button 
                        key={tab}
                        className={`flex-1 py-3 text-[0.6875rem] font-bold uppercase tracking-widest border-b-2 transition-all flex justify-center items-center gap-2 ${activeTab === tab 
                            ? 'border-primary text-primary bg-primary/5' 
                            : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'preview' && <span className="material-symbols-outlined text-[16px]">play_circle</span>}
                        {tab === 'srt' && <span className="material-symbols-outlined text-[16px]">description</span>}
                        {tab === 'vtt' && <span className="material-symbols-outlined text-[16px]">subtitles</span>}
                        {tab === 'preview' ? 'Sequence' : tab + ' Codec'}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="p-5 relative z-20">
                {activeTab === 'preview' ? (
                    <div className="space-y-4">
                        {/* Video Player */}
                        <div className="relative bg-black rounded border border-outline-variant/20 overflow-hidden shadow-inner">
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                controls
                                onTimeUpdate={handleTimeUpdate}
                                className="w-full max-h-[400px]"
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
                                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-surface/90 border border-outline-variant/30 text-on-surface text-sm px-4 py-2 rounded max-w-[90%] text-center backdrop-blur-md pointer-events-none drop-shadow-xl font-medium">
                                    {activeCue.text}
                                </div>
                            )}
                        </div>

                        {/* Timeline Caption List */}
                        <div 
                            ref={cueListRef}
                            className="bg-surface-container border border-outline-variant/20 rounded max-h-[250px] overflow-y-auto divide-y divide-outline-variant/10 shadow-inner"
                        >
                            {parsedCues.length === 0 ? (
                                <div className="p-6 text-center text-on-surface-variant text-sm font-mono uppercase tracking-widest">No caption events found</div>
                            ) : parsedCues.map((cue) => {
                                const isActive = currentTime >= cue.start && currentTime <= cue.end;
                                return (
                                    <div
                                        key={cue.index}
                                        data-active={isActive ? "true" : "false"}
                                        onClick={() => seekTo(cue.start)}
                                        className={`flex items-start gap-4 px-4 py-3 cursor-pointer transition-colors text-sm ${
                                            isActive 
                                                ? 'bg-primary/10 border-l-2 border-l-primary' 
                                                : 'hover:bg-surface-container-high border-l-2 border-l-transparent'
                                        }`}
                                    >
                                        <span className={`flex-shrink-0 font-mono text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border ${
                                            isActive 
                                                ? 'bg-primary text-on-primary border-primary' 
                                                : 'bg-surface text-on-surface-variant border-outline-variant/30'
                                        }`}>
                                            {formatTime(cue.start)}
                                        </span>
                                        <span className={`flex-1 ${isActive ? 'text-on-surface font-medium' : 'text-on-surface-variant'}`}>
                                            {cue.text}
                                        </span>
                                        <span className={`flex-shrink-0 font-mono text-[10px] uppercase tracking-widest ${isActive ? 'text-primary' : 'text-outline'}`}>
                                            {formatTime(cue.end)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-surface-container border border-outline-variant/20 rounded p-6 h-96 overflow-y-auto font-mono text-xs leading-relaxed text-on-surface shadow-inner">
                        <pre className="whitespace-pre-wrap">
                            {activeTab === 'srt' ? job.srt_content : job.vtt_content}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};
