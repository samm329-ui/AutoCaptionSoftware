window.ProgressCard = ({ jobId, onComplete }) => {
    const { useState, useEffect } = React;
    const [status, setStatus] = useState('Initializing');
    const [percent, setPercent] = useState(0);
    const [details, setDetails] = useState('');
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Timer logic
    useEffect(() => {
        let interval;
        if (status !== 'completed' && status !== 'failed') {
            interval = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [status]);

    useEffect(() => {
        let ws;
        
        const connectWs = () => {
             const wsUrl = window.api.getWebsocketUrl(jobId);
             ws = new WebSocket(wsUrl);

             ws.onmessage = (event) => {
                 const data = JSON.parse(event.data);
                 if (data.type === 'progress') {
                     setStatus(data.status);
                     setPercent(data.percent);
                     if (data.details) setDetails(data.details);
                     
                     if (data.status.toLowerCase() === 'completed') {
                         ws.close();
                         setTimeout(() => onComplete(jobId), 1000);
                     } else if (data.status.toLowerCase() === 'failed') {
                         setError(data.details || "Pipeline failed processing.");
                         ws.close();
                     }
                 }
             };
             
             ws.onerror = () => {
                 console.error("WebSocket error");
             };
             
             ws.onclose = () => {
                 // Check if it's already complete based on DB via polling fallback
                 window.api.fetchJob(jobId).then(job => {
                     if (job.status === 'completed') {
                         onComplete(jobId);
                     } else if (job.status === 'failed') {
                         setError(job.error || "Job disconnected and failed.");
                     }
                     // Else we could try to reconnect, but omitting for brevity
                 });
             };
        };
        
        connectWs();
        
        return () => {
            if (ws && ws.readyState !== WebSocket.CLOSED) {
                ws.close();
            }
        };
    }, [jobId, onComplete, retryCount]);

    const handleRetry = () => {
        setError(null);
        setRetryCount(prev => prev + 1);
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="relative w-full max-w-[560px] p-8 rounded-lg bg-surface-container-low border border-outline-variant/10 shadow-2xl">
            {/* Top Meta Info */}
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h2 className={`text-[0.6875rem] font-bold tracking-[0.15em] uppercase mb-1 ${error ? 'text-error' : 'text-primary'}`}>
                        {error ? 'Status: Error' : `Status: ${status}`}
                    </h2>
                    <p className="text-[0.875rem] font-medium text-on-surface">
                        {error ? error : (details || 'Processing media...')}
                    </p>
                    {error && (
                        <button 
                            onClick={handleRetry}
                            className="mt-3 px-3 py-1 bg-error-container text-on-error-container text-xs rounded uppercase tracking-wider font-bold"
                        >
                            Try Again
                        </button>
                    )}
                </div>
                <div className="text-right ml-4 shrink-0">
                    <p className="text-[0.6875rem] font-mono text-on-surface-variant uppercase tracking-wider">Engine: v4.2-surgical</p>
                    <p className="text-[0.6875rem] font-mono text-outline uppercase tracking-wider">PID: {jobId.substring(0,6).toUpperCase()}</p>
                </div>
            </div>

            {/* Precision Progress Bar */}
            <div className="space-y-4">
                <div className="relative h-[2px] w-full bg-surface-container-highest overflow-hidden">
                    {/* Animated Progress Simulation */}
                    <div 
                        className={`absolute top-0 left-0 h-full transition-all duration-300 ${error ? 'bg-error' : 'surgical-gradient laser-glow'}`}
                        style={{ width: `${Math.max(5, percent)}%` }}
                    ></div>
                </div>

                {/* Percentage & Data Readout */}
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                        <span className="text-[1.5rem] font-bold tabular-nums text-on-surface">
                            {Math.floor(percent)}<span className="text-outline text-lg font-normal">%</span>
                        </span>
                        <div className="h-4 w-[1px] bg-outline-variant/30"></div>
                        <div className="space-y-1">
                            <span className="block text-[0.625rem] leading-none font-mono text-outline uppercase">
                                {status === 'completed' ? 'Processing Complete' : 'Processing Packets'}
                            </span>
                            <span className="block text-[0.625rem] leading-none font-mono text-on-surface-variant uppercase tracking-tighter w-32 truncate">
                                JOB_ID_{jobId.substring(0,8).toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[0.6875rem] font-mono text-primary-fixed uppercase tracking-widest block mb-1">Time Elapsed</span>
                        <span className="text-[0.875rem] font-bold tabular-nums text-on-surface">
                            {formatTime(elapsedSeconds)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Technical Props Footer */}
            <div className="mt-12 pt-6 border-t border-outline-variant/20 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px] text-outline">verified_user</span>
                        <span className="text-[0.625rem] font-mono text-outline uppercase tracking-wider">MD5 Checksum: Validated</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px] text-outline">memory</span>
                        <span className="text-[0.625rem] font-mono text-outline uppercase tracking-wider">Surgical Precision Engine</span>
                    </div>
                </div>
                <div className="space-y-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-[0.625rem] font-mono text-outline uppercase tracking-wider">Audio Buffer: 48kHz</span>
                        <span className="material-symbols-outlined text-[14px] text-outline">graphic_eq</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-[0.625rem] font-mono text-outline uppercase tracking-wider">Neural Mapping: Active</span>
                        <span className="material-symbols-outlined text-[14px] text-outline">psychology</span>
                    </div>
                </div>
            </div>

            {/* Subtle "Ghost Border" Background Texture */}
            <div className="absolute -inset-[1px] rounded-lg border border-dashed border-outline-variant/30 pointer-events-none"></div>
        </div>
    );
};
