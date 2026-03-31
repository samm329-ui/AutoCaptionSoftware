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
    // view can be: 'upload', 'progress', 'result'
    const [view, setView] = useState('upload');
    const [currentJobId, setCurrentJobId] = useState(null);

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

    return (
        <div className="min-h-screen flex flex-col pt-12 pb-24 px-4 sm:px-6 lg:px-8">
            <header className="max-w-5xl mx-auto w-full mb-12 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                        <window.Icon name="subtitles" className="text-brand-600 h-8 w-8" />
                        FYAP Pro
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 font-medium">
                        Fast & Accurate Video Transcription
                    </p>
                </div>
            </header>

            <main className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area (2/3 width) */}
                <div className="lg:col-span-2">
                    {view === 'upload' && (
                        <window.UploadCard onJobCreated={handleJobCreated} />
                    )}
                    
                    {view === 'progress' && currentJobId && (
                        <window.ProgressCard 
                            jobId={currentJobId} 
                            onComplete={handleJobComplete} 
                        />
                    )}
                    
                    {view === 'result' && currentJobId && (
                        <window.ResultCard 
                            jobId={currentJobId} 
                            onNewJob={handleNewJob} 
                        />
                    )}
                </div>

                {/* Sidebar (1/3 width) */}
                <div className="lg:col-span-1">
                    <window.HistoryList 
                        onViewJob={handleHistoryClick}
                        currentJobId={currentJobId}
                    />
                </div>
            </main>
        </div>
    );
};

// Mount App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
