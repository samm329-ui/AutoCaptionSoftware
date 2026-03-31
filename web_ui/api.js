// API Utilities for FYAP Pro Dashboard

window.api = {
    // Determine base URL dynamically (empty if self-hosted, fallback otherwise)
    BASE_URL: window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
        ? window.location.origin
        : 'http://localhost:8000',

    async uploadVideo(file, targetLang) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("target_lang", targetLang);

        const response = await fetch(`${this.BASE_URL}/api/jobs/`, {
            method: 'POST',
            body: formData,
        });
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }
        return response.json();
    },

    async fetchJob(jobId) {
        const response = await fetch(`${this.BASE_URL}/api/jobs/${jobId}`);
        if (!response.ok) {
            throw new Error(`Fetch failed: ${response.statusText}`);
        }
        return response.json();
    },

    async fetchJobs() {
        const response = await fetch(`${this.BASE_URL}/api/jobs/`);
        if (!response.ok) {
            throw new Error(`Fetch failed: ${response.statusText}`);
        }
        return response.json();
    },
    
    getWebsocketUrl(jobId) {
        // Convert http:// to ws://
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = this.BASE_URL.replace(/^https?:\/\//, '');
        return `${protocol}//${host}/api/jobs/${jobId}/ws`;
    }
};
