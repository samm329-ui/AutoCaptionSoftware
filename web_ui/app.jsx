window.Icon = ({ name, className }) => {
    const { useEffect, useRef } = React;
    const ref = useRef(null);

    useEffect(() => {
        if (ref.current && window.lucide) {
            window.lucide.createIcons({
                root: ref.current,
                nameAttr: 'data-lucide'
            });
        }
    }, [name, className]);

    return (
        <span 
            ref={ref} 
            className="inline-flex items-center justify-center translate-y-[-1px]"
            dangerouslySetInnerHTML={{ __html: `<i data-lucide="${name}" class="${className || ''}"></i>` }} 
        />
    );
};

const App = () => {
    const { useState, useEffect } = React;
    // view can be: 'loading', 'dashboard', 'upload', 'progress', 'result', 'editor'
    const [view, setView] = useState('loading');
    const [currentJobId, setCurrentJobId] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [draftId, setDraftId] = useState(null);

    const handleProjectCreated = (name, dId) => {
        setProjectName(name);
        if (dId) setDraftId(dId);
        setView('upload');
    };

    const handleOpenJob = (jobId, status) => {
        setCurrentJobId(jobId);
        if (status === 'processing') {
            setView('progress');
        } else if (status === 'completed' || status === 'failed') {
            setView('result');
        }
    };

    const handleJobCreated = (jobId) => {
        setCurrentJobId(jobId);
        setView('progress');
    };

    const handleJobComplete = (jobId) => {
        setCurrentJobId(jobId);
        setView('result');
    };

    const handleNewJob = () => {
        setCurrentJobId(null);
        setView('upload');
    };

    const handleHistoryClick = (jobId, status) => {
        setCurrentJobId(jobId);
        if (status === 'processing') {
            setView('progress');
        } else if (status === 'completed' || status === 'failed') {
            setView('result');
        }
    };

    const handleOpenEditor = (jobId) => {
        setCurrentJobId(jobId);
        setView('editor');
    };

    const handleCloseEditor = () => {
        setView('result');
    };

    return (
        <>
            {view === 'loading' && (
                <window.LoadingScreen onComplete={() => setView('dashboard')} />
            )}

            {view === 'dashboard' && (
                <window.Dashboard onProjectCreated={handleProjectCreated} onOpenJob={handleOpenJob} />
            )}

            {(view === 'upload' || view === 'progress' || view === 'result') && (
                <div className="flex flex-col h-screen w-screen selection:bg-primary selection:text-on-primary font-sans antialiased text-on-surface bg-background">
                    {/* TopNavBar */}
                    <nav className="fixed top-0 h-12 flex items-center bg-[#0c0e12] font-['Inter'] text-[0.875rem] tracking-tight antialiased justify-between px-3 w-full border-b border-[#1d2025] z-50">
                        <div className="flex items-center gap-6">
                            <div onClick={() => setView('dashboard')} className="text-lg font-black tracking-tighter text-indigo-500 dark:text-indigo-400 uppercase cursor-pointer hover:text-indigo-300 transition-colors">
                                FYAP PRO
                            </div>
                            <div className="hidden lg:flex items-center gap-4">
                                <span className="text-slate-400 cursor-default hover:text-white transition-colors">File</span>
                                <span className="text-slate-400 cursor-default hover:text-white transition-colors">Edit</span>
                                <span className="text-slate-400 cursor-default hover:text-white transition-colors">Sequence</span>
                                <span className="text-slate-400 cursor-default hover:text-white transition-colors">Clip</span>
                                <span className="text-slate-400 cursor-default hover:text-white transition-colors">Graphics</span>
                                <span className="text-slate-400 cursor-default hover:text-white transition-colors">View</span>
                                <span className="text-slate-400 cursor-default hover:text-white transition-colors">Window</span>
                                {projectName && (
                                    <div className="ml-4 flex items-center gap-2 px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant/30">
                                        <span className="material-symbols-outlined text-[14px] text-primary">folder</span>
                                        <span className="text-primary-container font-mono text-[10px] max-w-[200px] truncate">{projectName}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-slate-400 hover:text-white transition-all cursor-default text-[20px]">settings</span>
                            <span className="material-symbols-outlined text-slate-400 hover:text-white transition-all cursor-default text-[20px]">help</span>
                            <span className="material-symbols-outlined text-slate-400 hover:text-white transition-all cursor-default text-[20px]">account_circle</span>
                        </div>
                    </nav>

                    {/* Main Content Area */}
                    <main className="flex-1 mt-12 mb-6 overflow-y-auto pixel-grid relative flex justify-center p-8 bg-background">
                        {/* Background Decorator Elements */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]"></div>
                        </div>
                        
                        <div className="w-full max-w-4xl mx-auto flex items-center justify-center relative z-10 min-h-[500px]">
                            {view === 'upload' && <window.UploadCard onJobCreated={handleJobCreated} draftId={draftId} projectName={projectName} />}
                            {view === 'progress' && currentJobId && <window.ProgressCard jobId={currentJobId} onComplete={handleJobComplete} />}
                            {view === 'result' && currentJobId && <window.ResultCard jobId={currentJobId} onNewJob={handleNewJob} onOpenEditor={handleOpenEditor} />}
                        </div>
                    </main>

                    {/* Footer */}
                    <footer className="fixed bottom-0 w-full h-6 flex items-center bg-[#111318] font-['Inter'] text-[0.6875rem] font-medium tracking-wider uppercase border-t border-[#1d2025] justify-between px-4 z-50">
                        <div className="flex items-center gap-4">
                            <span className="text-slate-500">System Status: {view.toUpperCase()}</span>
                            <span className="text-slate-500">|</span>
                            {currentJobId && <span className="text-slate-500">Job ID: <span className="font-mono">{currentJobId.substring(0,8)}</span></span>}
                            {currentJobId && <span className="text-slate-500">|</span>}
                            <span className="text-indigo-400">LOCAL ENGINE CONNECTED</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <span className="text-slate-500 hover:text-slate-300 cursor-pointer">v2.4.0</span>
                            <span className="text-slate-500 hover:text-slate-300 cursor-pointer">Diagnostics</span>
                            <span className="text-slate-500 hover:text-slate-300 cursor-pointer">Stats</span>
                        </div>
                    </footer>
                </div>
            )}

            {/* Editor View */}
            {view === 'editor' && currentJobId && (
                <window.Editor jobId={currentJobId} onClose={handleCloseEditor} />
            )}
        </>
    );
};

// Mount App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
