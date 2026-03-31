window.ProgressCard = ({ jobId, onComplete }) => {
    const { useState, useEffect } = React;
    const [status, setStatus] = useState('Initializing');
    const [percent, setPercent] = useState(0);
    const [details, setDetails] = useState('');
    const [error, setError] = useState(null);

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
    }, [jobId, onComplete]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center">
            <h2 className="text-xl font-bold text-brand-900 mb-2">Processing Video</h2>
            <p className="text-slate-500 mb-8 text-sm">Job ID: <span className="font-mono text-xs">{jobId.substring(0,8)}</span></p>
            
            <div className="w-full max-w-md mb-2 flex justify-between text-sm font-medium text-slate-700">
                <span>{status}</span>
                <span>{percent}%</span>
            </div>
            
            <div className="w-full max-w-md bg-slate-100 rounded-full h-4 mb-4 overflow-hidden border border-slate-200">
                <div 
                    className={`h-4 rounded-full transition-all duration-500 ease-out flex items-center justify-center overflow-hidden
                        ${error ? 'bg-red-500' : 'bg-brand-500 relative'}`}
                    style={{ width: `${Math.max(5, percent)}%` }}
                >
                    {!error && percent < 100 && (
                        <div className="absolute inset-0 bg-white/20 progress-stripes"></div>
                    )}
                </div>
            </div>
            
            {details && !error && (
                <p className="text-sm text-slate-500 max-w-md text-center">{details}</p>
            )}

            {error && (
                <div className="mt-4 text-red-600 bg-red-50 p-4 rounded-lg w-full max-w-md text-sm border border-red-200">
                    <p className="font-bold mb-1">Processing Failed</p>
                    <p>{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-4 bg-white border border-red-200 text-red-600 px-4 py-2 rounded shadow-sm text-xs font-semibold hover:bg-red-50"
                    >
                        Try Again
                    </button>
                </div>
            )}
            
            <style>{`
                .progress-stripes {
                    background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);
                    background-size: 1rem 1rem;
                    animation: stripes 1s linear infinite;
                }
                @keyframes stripes {
                    from { background-position: 1rem 0; }
                    to { background-position: 0 0; }
                }
            `}</style>
        </div>
    );
};
