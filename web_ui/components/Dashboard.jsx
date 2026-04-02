window.Dashboard = ({ onProjectCreated, onOpenJob }) => {
    const { useState, useEffect } = React;
    const [recentJobs, setRecentJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadJobs = async () => {
        try {
            // API returns an array directly, not {jobs: [...]}
            const apiJobs = await window.api.fetchJobs();
            
            // Update localStorage with fresh API data
            if (Array.isArray(apiJobs) && apiJobs.length > 0) {
                localStorage.setItem('fyap_jobs', JSON.stringify(apiJobs.slice(0, 100)));
            }
            
            // Load drafts
            const drafts = JSON.parse(localStorage.getItem('fyap_drafts') || '[]');
            const formattedDrafts = drafts.map(d => ({
                id: d.id,
                filename: d.name,
                created_at: d.created_at,
                status: 'Draft'
            }));
            
            // Use API jobs if available, otherwise localStorage
            const jobsToUse = Array.isArray(apiJobs) && apiJobs.length > 0 ? apiJobs : JSON.parse(localStorage.getItem('fyap_jobs') || '[]');
            
            const combined = [...formattedDrafts, ...jobsToUse].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
            setRecentJobs(combined);
        } catch (err) {
            console.error("Failed to fetch jobs, loading from localStorage", err);
            // Fallback to localStorage only
            const savedJobs = JSON.parse(localStorage.getItem('fyap_jobs') || '[]');
            const drafts = JSON.parse(localStorage.getItem('fyap_drafts') || '[]');
            const formattedDrafts = drafts.map(d => ({
                id: d.id,
                filename: d.name,
                created_at: d.created_at,
                status: 'Draft'
            }));
            const combined = [...formattedDrafts, ...savedJobs].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
            setRecentJobs(combined);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadJobs();
        // Poll every 15s for status updates
        const interval = setInterval(loadJobs, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleNewProject = () => {
        const name = prompt("Enter new project name:");
        if (name !== null) {
            const projectName = name.trim() || 'Untitled Project';
            const drafts = JSON.parse(localStorage.getItem('fyap_drafts') || '[]');
            const draftId = 'draft_' + Date.now();
            drafts.push({
                id: draftId,
                name: projectName,
                created_at: new Date().toISOString()
            });
            localStorage.setItem('fyap_drafts', JSON.stringify(drafts));
            onProjectCreated(projectName, draftId);
        }
    };

    const handleNotImplemented = (feature) => {
        alert(`${feature} feature coming soon!`);
    };

    const toggleTheme = () => {
        document.documentElement.classList.toggle('dark');
    };

    const formatRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} hours ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} days ago`;
    };

    return (
        <div className="fixed inset-0 flex bg-background-light dark:bg-background-dark shadow-2xl">
            {/* Sidebar */}
            <aside className="w-60 border-r border-slate-200 dark:border-border-dark flex flex-col bg-white dark:bg-sidebar-dark h-full">
                <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center text-background-dark font-bold text-[10px]">FY</div>
                        <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">FYAP Pro</span>
                    </div>
                </div>
                
                <div className="px-4 mb-6 space-y-1.5">
                    <button 
                        onClick={handleNewProject}
                        className="w-full py-1.5 px-4 bg-primary hover:opacity-90 text-background-dark font-semibold text-sm-surgical rounded transition-all text-center">
                        New Project
                    </button>
                </div>
                
                <nav className="px-2 flex-1 space-y-0.5 overflow-y-auto">
                    <div className="pb-1 px-3">
                        <span className="text-[9px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-600 font-bold">Library</span>
                    </div>
                    <button className="w-full flex items-center gap-2.5 px-3 py-1.5 active-nav text-slate-900 dark:text-white text-sm-surgical group transition-colors">
                        <span className="material-symbols-outlined text-primary">home</span>
                        <span className="font-medium">Home</span>
                    </button>
                    <button onClick={() => handleNotImplemented('Learn')} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm-surgical group transition-colors">
                        <span className="material-symbols-outlined group-hover:text-primary transition-colors">lightbulb</span>
                        <span className="font-medium">Learn</span>
                    </button>
                    {/* Excluded 'Teams' block conceptually to keep it workable as per request */}
                </nav>
                
                <div className="p-4 border-t border-slate-200 dark:border-border-dark">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden">
                            FY
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs-surgical font-semibold text-slate-900 dark:text-white leading-none">Local Workspace</span>
                            <span className="text-[9px] text-slate-500 dark:text-slate-500 mt-0.5">Admin Account</span>
                        </div>
                    </div>
                </div>
            </aside>
            
            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden bg-background-light dark:bg-background-dark">
                <header className="h-14 border-b border-slate-200 dark:border-border-dark flex items-center justify-between px-8 bg-white dark:bg-sidebar-dark">
                    <h1 className="text-sm font-medium text-slate-800 dark:text-slate-200 tracking-tight">Welcome to FYAP Pro</h1>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 px-3 py-1 border border-slate-200 dark:border-border-dark rounded bg-black/10 dark:bg-black/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            <span className="text-[10px] text-slate-400 font-medium">Local Engine Active</span>
                        </div>
                        <button onClick={() => handleNotImplemented('Settings')} className="text-slate-400 hover:text-white">
                            <span className="material-symbols-outlined text-[18px]">settings</span>
                        </button>
                    </div>
                </header>
                
                <div className="flex-1 overflow-y-auto px-10 py-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent Projects</h2>
                                <div className="h-4 w-px bg-border-dark"></div>
                            </div>
                        </div>
                        
                        {/* High Density List */}
                        <div className="w-full border border-slate-200 dark:border-border-dark rounded overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-border-dark">
                                        <th className="py-2.5 px-4 text-xs-surgical font-bold text-slate-500 dark:text-slate-600 uppercase tracking-widest w-[45%]">Name</th>
                                        <th className="py-2.5 px-4 text-xs-surgical font-bold text-slate-500 dark:text-slate-600 uppercase tracking-widest">
                                            Last Modified
                                        </th>
                                        <th className="py-2.5 px-4 text-xs-surgical font-bold text-slate-500 dark:text-slate-600 uppercase tracking-widest">Status</th>
                                        <th className="py-2.5 px-4 text-xs-surgical font-bold text-slate-500 dark:text-slate-600 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="4" className="py-8 text-center text-sm-surgical text-slate-500">Loading projects...</td>
                                        </tr>
                                    ) : recentJobs.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="py-8 text-center text-sm-surgical text-slate-500">No recent projects found. Create a new project to get started.</td>
                                        </tr>
                                    ) : (
                                        recentJobs.map(job => (
                                            <tr key={job.id} onClick={() => {
                                                if (job.status === 'Draft') {
                                                    onProjectCreated(job.filename, job.id);
                                                } else {
                                                    onOpenJob(job.id, job.status);
                                                }
                                            }} className={`group hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer ${job.status === 'failed' ? 'opacity-75' : ''}`}>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-6 bg-slate-200 dark:bg-slate-800 rounded-sm overflow-hidden flex items-center justify-center border border-slate-300 dark:border-white/5 group-hover:border-primary/30 transition-all">
                                                            <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-[14px]">movie</span>
                                                        </div>
                                                        <span className="text-sm-surgical font-medium text-slate-800 dark:text-slate-300 group-hover:text-primary transition-colors">
                                                            {job.filename || job.video_filename || `Project #${job.id.substring(0,6)}`}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-xs-surgical text-slate-500">
                                                    {formatRelativeTime(job.created_at)}
                                                </td>
                                                <td className={`py-3 px-4 text-xs-surgical font-semibold uppercase tracking-widest ${
                                                    job.status === 'completed' ? 'text-green-500' : 
                                                    job.status === 'failed' ? 'text-red-500' : 
                                                    job.status === 'Draft' ? 'text-amber-500' : 'text-primary'
                                                }`}>
                                                    {job.status}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button className="opacity-0 group-hover:opacity-100 material-symbols-outlined text-slate-500 hover:text-primary transition-all">launch</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Quick Tips Card */}
                        <div className="mt-8 grid grid-cols-2 gap-4">
                            <div className="p-4 rounded border border-slate-200 dark:border-border-dark bg-white/5">
                                <span className="material-symbols-outlined text-primary mb-2 text-[24px]">auto_awesome</span>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">AI Transcriptions</h3>
                                <p className="text-xs-surgical text-slate-500">FYAP Pro securely transcribes local audio for precision captioning directly via API.</p>
                            </div>
                            <div className="p-4 rounded border border-slate-200 dark:border-border-dark bg-white/5">
                                <span className="material-symbols-outlined text-primary mb-2 text-[24px]">speed</span>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Hardware Acceleration</h3>
                                <p className="text-xs-surgical text-slate-500">Make sure FFmpeg is installed to leverage high-speed local encoding.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            
            {/* Toggle Theme */}
            <div className="absolute bottom-6 right-6">
                <button 
                    onClick={toggleTheme}
                    className="w-10 h-10 rounded-full bg-white dark:bg-sidebar-dark border border-slate-200 dark:border-border-dark flex items-center justify-center shadow-lg text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[18px] dark:hidden">dark_mode</span>
                    <span className="material-symbols-outlined text-[18px] hidden dark:block">light_mode</span>
                </button>
            </div>
        </div>
    );
};
