window.UploadCard = ({ onJobCreated, draftId, projectName }) => {
    const { useState, useRef } = React;
    
    const [file, setFile] = useState(null);
    const [lang, setLang] = useState('en');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected && selected.type.startsWith('video/')) {
            setFile(selected);
            setError(null);
        } else {
            setError('Please select a valid video file.');
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setError(null);
        
        try {
            const job = await window.api.uploadVideo(file, lang);
            
            // Only delete draft AFTER successful upload
            if (draftId) {
                const drafts = JSON.parse(localStorage.getItem('fyap_drafts') || '[]');
                const remaining = drafts.filter(d => d.id !== draftId);
                localStorage.setItem('fyap_drafts', JSON.stringify(remaining));
            }
            
            // Save job to localStorage for persistence
            const savedJobs = JSON.parse(localStorage.getItem('fyap_jobs') || '[]');
            savedJobs.unshift({
                id: job.id,
                filename: file.name,
                created_at: new Date().toISOString(),
                status: 'processing',
                target_lang: lang
            });
            localStorage.setItem('fyap_jobs', JSON.stringify(savedJobs.slice(0, 50)));
            
            onJobCreated(job.id);
        } catch (err) {
            setError(err.message);
            // Keep draft on error so user can retry
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="relative w-full max-w-[560px] p-8 rounded-lg bg-surface-container-low border border-outline-variant/10 shadow-2xl">
            {/* Top Meta Info */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-[0.6875rem] font-bold tracking-[0.15em] text-primary uppercase mb-1">Step 1: Ingestion</h2>
                    <p className="text-[0.875rem] font-medium text-on-surface">Import Media & Target Language</p>
                    {projectName && <p className="text-[0.6875rem] mt-2 font-mono text-primary-fixed uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded inline-block">Draft: {projectName}</p>}
                </div>
                <div className="text-right">
                    <p className="text-[0.6875rem] font-mono text-on-surface-variant uppercase tracking-wider">Engine: Ready</p>
                    <p className="text-[0.6875rem] font-mono text-outline uppercase tracking-wider">Codec: MP4/MOV</p>
                </div>
            </div>

            {/* Dropzone */}
            <div 
                className={`w-full border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all mb-6
                    ${file ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container-highest'}`}
                onClick={() => fileInputRef.current.click()}
            >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="video/*" 
                />
                
                {file ? (
                    <div className="text-primary font-medium break-all flex flex-col items-center">
                        <span className="material-symbols-outlined text-[32px] mb-2">video_file</span>
                        {file.name}
                        <div className="text-[0.6875rem] font-mono text-on-surface-variant mt-2 uppercase tracking-widest bg-black/20 px-2 py-1 rounded">
                            {(file.size / (1024*1024)).toFixed(2)} MB
                        </div>
                    </div>
                ) : (
                    <div className="text-outline">
                        <span className="material-symbols-outlined text-[40px] text-primary/80 mb-4 drop-shadow-[0_0_8px_rgba(167,165,255,0.4)]">cloud_upload</span>
                        <p className="font-medium text-on-surface">Click to open media dialog</p>
                        <p className="text-[0.6875rem] font-mono uppercase tracking-widest mt-2">MP4, WebM, MOV Supported</p>
                    </div>
                )}
            </div>

            {/* Configuration */}
            <div className="w-full space-y-2 mb-8">
                <label className="text-[0.6875rem] font-bold tracking-[0.15em] text-on-surface-variant uppercase">Target Language</label>
                <div className="relative">
                    <select 
                        value={lang} 
                        onChange={e => setLang(e.target.value)}
                        className="w-full bg-surface-container-highest border border-outline-variant/30 text-on-surface rounded focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none p-3 lg:text-sm text-base appearance-none shadow-inner"
                    >
                        <option value="en">English (Translation)</option>
                        <option value="hi">Hindi (Native)</option>
                        <option value="hinglish">Hinglish (Hindi + English)</option>
                        <option value="bn">Bengali (Native)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">expand_content</span>
                </div>
            </div>

            {error && (
                <div className="mb-6 border-l-2 border-error bg-error-container/20 p-3 text-[0.875rem] text-error flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {error}
                </div>
            )}

            <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className={`w-full py-3.5 px-4 rounded font-bold uppercase tracking-widest text-[0.75rem] transition-all flex items-center justify-center gap-2
                    ${!file || isUploading ? 'bg-surface-variant text-outline cursor-not-allowed border border-outline-variant/20' : 'bg-primary text-on-primary hover:bg-primary-fixed hover:shadow-[0_0_15px_rgba(167,165,255,0.3)]'}`}
            >
                {isUploading ? (
                    <>
                        <span className="material-symbols-outlined animate-spin text-[16px]">hourglass_empty</span>
                        Uploading Data...
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                        Initialize Surgical Pipeline
                    </>
                )}
            </button>

            {/* Subtle Ghost Border Texture */}
            <div className="absolute -inset-[1px] rounded-lg border border-dashed border-outline-variant/30 pointer-events-none"></div>
        </div>
    );
};
