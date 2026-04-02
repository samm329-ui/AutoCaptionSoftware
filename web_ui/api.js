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
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = this.BASE_URL.replace(/^https?:\/\//, '');
        return `${protocol}//${host}/api/jobs/${jobId}/ws`;
    },

    async fetchTimeline(jobId) {
        const response = await fetch(`${this.BASE_URL}/api/editor/projects/${jobId}/timeline`);
        if (!response.ok) throw new Error(`Failed to fetch timeline: ${response.statusText}`);
        return response.json();
    },

    async updateTimeline(jobId, timeline) {
        const response = await fetch(`${this.BASE_URL}/api/editor/projects/${jobId}/timeline`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(timeline)
        });
        if (!response.ok) throw new Error(`Failed to save timeline: ${response.statusText}`);
        return response.json();
    },

    async fetchThumbnails(jobId, count = 10) {
        const response = await fetch(`${this.BASE_URL}/api/editor/projects/${jobId}/thumbnails?count=${count}`);
        if (!response.ok) throw new Error(`Failed to fetch thumbnails: ${response.statusText}`);
        return response.json();
    },

    async exportCaptions(jobId, format = 'srt') {
        const response = await fetch(`${this.BASE_URL}/api/editor/projects/${jobId}/captions/${format}`);
        if (!response.ok) throw new Error(`Failed to export captions: ${response.statusText}`);
        return response.blob();
    }
};
