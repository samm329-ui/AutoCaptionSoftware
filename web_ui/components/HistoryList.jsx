window.HistoryList = ({ onViewJob, currentJobId }) => {
    const { useState, useEffect } = React;
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadJobs = () => {
        window.api.fetchJobs()
            .then(data => {
                setJobs(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load history", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        loadJobs();
        // Poll every 10s for history updates
        const interval = setInterval(loadJobs, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading && jobs.length === 0) {
        return <div className="text-sm text-slate-500 p-4">Loading history...</div>;
    }

    if (jobs.length === 0) {
        return <div className="text-sm text-slate-500 p-4 border border-dashed border-[#1E2028] bg-[#0F1115] rounded-xl text-center">No recent jobs found.</div>;
    }

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' }) + ' on ' + d.toLocaleDateString();
    };

    return (
        <div className="bg-surface-container-low rounded-lg shadow-2xl border border-outline-variant/10 overflow-hidden h-full flex flex-col relative w-full h-[600px]">
            <div className="absolute -inset-[1px] rounded-lg border border-dashed border-outline-variant/30 pointer-events-none z-10"></div>
            
            <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center gap-2 shrink-0 bg-surface/50 relative z-20">
                <span className="material-symbols-outlined text-primary text-[18px]">history</span>
                <span className="font-bold tracking-[0.15em] text-on-surface text-[0.6875rem] uppercase">
                    Workspace Memory
                </span>
            </div>
            
            <div className="divide-y divide-outline-variant/10 overflow-y-auto flex-1 relative z-20">
                {jobs.map(job => (
                    <div 
                        key={job.id} 
                        className={`p-4 hover:bg-surface-container-high transition-colors cursor-pointer border-l-2 
                            ${job.id === currentJobId ? 'border-primary bg-primary/5' : 'border-transparent'}
                            ${job.status === 'processing' ? 'border-tertiary-container' : ''}
                            ${job.status === 'failed' ? 'border-error' : ''}
                        `}
                        onClick={() => onViewJob(job.id, job.status)}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-on-surface text-sm truncate max-w-[200px]" title={job.filename}>
                                {job.filename || `Job #${job.id.substring(0,8)}`}
                            </h4>
                            <span className="text-[10px] font-mono text-on-surface-variant bg-surface px-1.5 py-0.5 rounded border border-outline-variant/30">{job.id.substring(0,6)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center mt-3">
                            <div className="flex items-center gap-2">
                                <span className="bg-surface text-on-surface-variant px-1.5 py-0.5 rounded uppercase font-bold tracking-wider text-[9px] border border-outline-variant/30">
                                    {job.target_lang || 'EN'}
                                </span>
                                
                                {job.status === 'completed' && <span className="text-[#34d399] flex items-center gap-1 font-bold tracking-wider text-[9px] uppercase"><span className="material-symbols-outlined text-[12px]">check_circle</span> Ready</span>}
                                {job.status === 'processing' && <span className="text-tertiary-container flex items-center gap-1 font-bold tracking-wider text-[9px] uppercase"><span className="material-symbols-outlined text-[12px] animate-spin">sync</span> {job.progress}%</span>}
                                {job.status === 'failed' && <span className="text-error flex items-center gap-1 font-bold tracking-wider text-[9px] uppercase"><span className="material-symbols-outlined text-[12px]">cancel</span> Failed</span>}
                            </div>
                            
                            <span className="text-on-surface-variant text-[9px] font-mono">{formatDate(job.created_at)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
