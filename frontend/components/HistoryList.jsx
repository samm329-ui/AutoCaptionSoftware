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
        return <div className="text-sm text-slate-500 p-4 border border-dashed rounded-lg text-center">No recent jobs found.</div>;
    }

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' }) + ' on ' + d.toLocaleDateString();
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-medium text-slate-700 text-sm tracking-wide uppercase flex items-center gap-2">
                <window.Icon name="history" className="h-4 w-4" />
                Recent Jobs
            </div>
            
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {jobs.map(job => (
                    <div 
                        key={job.id} 
                        className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer border-l-4 
                            ${job.id === currentJobId ? 'border-brand-500 bg-brand-50/50' : 'border-transparent'}
                            ${job.status === 'processing' ? 'border-amber-400' : ''}
                            ${job.status === 'failed' ? 'border-red-400' : ''}
                        `}
                        onClick={() => onViewJob(job.id, job.status)}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="font-medium text-slate-800 text-sm truncate max-w-[200px]" title={job.filename}>
                                {job.filename}
                            </h4>
                            <span className="text-xs font-mono text-slate-400">{job.id.substring(0,6)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase font-semibold text-[10px]">
                                    {job.target_lang}
                                </span>
                                
                                {job.status === 'completed' && <span className="text-emerald-600 flex items-center gap-1"><window.Icon name="check" className="h-3 w-3" /> Ready</span>}
                                {job.status === 'processing' && <span className="text-amber-600 flex items-center gap-1"><window.Icon name="loader" className="h-3 w-3 animate-spin" /> {job.progress}%</span>}
                                {job.status === 'failed' && <span className="text-red-500 flex items-center gap-1"><window.Icon name="x" className="h-3 w-3" /> Failed</span>}
                            </div>
                            
                            <span className="text-slate-400">{formatDate(job.created_at)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
