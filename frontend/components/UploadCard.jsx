window.UploadCard = ({ onJobCreated }) => {
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
            onJobCreated(job.id);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
            <h2 className="text-xl font-bold text-slate-800 mb-6 w-full">Upload Video</h2>
            
            <div 
                className={`w-full max-w-md border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                    ${file ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'}`}
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
                    <div className="text-brand-700 font-medium break-all">
                        Selected: {file.name}
                        <div className="text-sm text-brand-500 mt-1">{(file.size / (1024*1024)).toFixed(2)} MB</div>
                    </div>
                ) : (
                    <div className="text-slate-500">
                        <window.Icon name="upload-cloud" className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                        <p className="font-medium text-slate-700">Click to upload or drag and drop</p>
                        <p className="text-sm mt-1">MP4, WebM, MOV up to 1GB</p>
                    </div>
                )}
            </div>

            <div className="mt-6 w-full max-w-md">
                <label className="block text-sm font-medium text-slate-700 mb-2">Target Language</label>
                <select 
                    value={lang} 
                    onChange={e => setLang(e.target.value)}
                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 border p-2.5"
                >
                    <option value="en">English (Translation)</option>
                    <option value="hi">Hindi (Native)</option>
                    <option value="hinglish">Hinglish (Hindi + English)</option>
                    <option value="bn">Bengali (Native)</option>
                </select>
            </div>

            {error && (
                <div className="mt-4 text-red-600 bg-red-50 p-3 rounded-lg w-full max-w-md text-sm border border-red-200">
                    {error}
                </div>
            )}

            <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className={`mt-6 w-full max-w-md py-3 px-4 rounded-lg font-bold text-white shadow transition-all
                    ${!file || isUploading ? 'bg-slate-300 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700 hover:shadow-md'}`}
            >
                {isUploading ? 'Uploading & Analyzing...' : 'Start Captioning'}
            </button>
        </div>
    );
};
