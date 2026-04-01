window.LoadingScreen = ({ onComplete }) => {
    const { useEffect, useState } = React;
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Animate from 0 to 100 over 2.2 seconds
        let start = null;
        const duration = 2200;
        let animationFrameId;

        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const elapsed = timestamp - start;
            // Easing function for smoother progress
            const easeOutQuart = 1 - Math.pow(1 - Math.min(1, elapsed / duration), 4);
            const percentage = easeOutQuart * 100;
            
            setProgress(percentage);

            if (elapsed < duration) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                onComplete();
            }
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId);
    }, [onComplete]);

    return (
        <main className="relative h-screen w-screen flex flex-col items-center justify-center p-8 bg-surface-container-lowest overflow-hidden">
            {/* Background Texture: Subtle Grain/Glass Effect */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA2qtjDspg-vt7lKe1-neP1R19ApakI4xZXECdBMUdgkPtemZik7ERDbyNR2L-xb-ihVbV9SYz5GitE-0RYWpMinlDUApYnTBXQ4UsEv3MmoSCpuD6ea00GiwKLlkDctWtFvnuaqDRh_Q8jYARsVDRB6IM8WSWMH3IPq6oEfUilHYq8lAs69IvES1XjbMMfLnRjjtSqapBjtsnJnU1z_6qUs5In9a4bTzxzwMVtKI0LmmIlynnyoV7r3VNOc-Sn3ff6IiiJusjmc5B0')" }}>
            </div>
            
            {/* Center Branding & Engine Status */}
            <div className="z-10 w-full max-w-[480px] space-y-8 flex flex-col items-center">
                
                {/* Hero Typography */}
                <div className="text-center">
                    <h1 className="font-headline text-[42px] font-extrabold tracking-tighter text-on-surface mb-1 drop-shadow-lg">
                        FYAP Pro
                    </h1>
                    <p className="font-label text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant/60">
                        Surgical Video Engine
                    </p>
                </div>
                
                {/* Precision Progress Bar */}
                <div className="w-full space-y-3">
                    <div className="w-full h-[3px] bg-surface-container-highest overflow-hidden relative">
                        <div className="surgical-gradient h-full shadow-[0_0_12px_rgba(79,70,229,0.4)] transition-all duration-75" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center w-full">
                        <span className="font-label text-[10px] font-medium text-on-surface-variant tracking-widest uppercase">
                            Initializing editing engine
                        </span>
                        <span className="font-label text-[10px] font-bold text-primary tracking-widest">
                            {Math.floor(progress)}%
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Footer Metadata (Surgical Detail) */}
            <div className="absolute bottom-12 left-0 right-0 flex justify-center">
                <div className="flex items-center space-x-6 opacity-40">
                    <div className="flex flex-col items-start">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Version</span>
                        <span className="text-[11px] font-medium text-on-surface">2.4.0 Surgical</span>
                    </div>
                    <div className="h-8 w-[1px] bg-outline-variant/30"></div>
                    <div className="flex flex-col items-start">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Build</span>
                        <span className="text-[11px] font-medium text-on-surface">x64_STABLE_882</span>
                    </div>
                    <div className="h-8 w-[1px] bg-outline-variant/30"></div>
                    <div className="flex flex-col items-start">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">License</span>
                        <span className="text-[11px] font-medium text-on-surface">Professional Tier</span>
                    </div>
                </div>
            </div>
            
            {/* Decorative UI Elements (Asymmetric Details) */}
            <div className="absolute top-8 left-8">
                <div className="flex space-x-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-primary/20"></div>
                    <div className="w-1.5 h-1.5 bg-primary/40"></div>
                    <div className="w-1.5 h-1.5 bg-primary/60"></div>
                </div>
            </div>
            
            <div className="absolute top-8 right-8">
                <span className="text-[10px] font-mono text-on-surface-variant/30">0x00234_LOAD_SEQ</span>
            </div>
        </main>
    );
};
