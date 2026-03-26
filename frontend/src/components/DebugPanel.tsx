"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { checkHealth, api } from "@/lib/api";

interface LogEntry {
  id: number;
  type: "info" | "success" | "error" | "warning";
  message: string;
  timestamp: Date;
  details?: string;
}

interface ServerStatus {
  status: "checking" | "online" | "offline";
  latency?: number;
  error?: string;
}

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus>({ status: "checking" });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const addLog = (type: LogEntry["type"], message: string, details?: string) => {
    setLogs((prev) => [
      { id: Date.now(), type, message, timestamp: new Date(), details },
      ...prev.slice(0, 49),
    ]);
  };



  useEffect(() => {
    const checkServer = async () => {
      setServerStatus({ status: "checking" });
      const start = Date.now();
      try {
        const health = await checkHealth();
        const latency = Date.now() - start;
        if (health) {
          setServerStatus({ status: "online", latency });
        } else {
          setServerStatus({ status: "offline", error: "No response" });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setServerStatus({ status: "offline", error: errorMsg });
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 10000);
    return () => clearInterval(interval);
  }, []);

  const statusColor = {
    checking: "bg-yellow-500",
    online: "bg-green-500",
    offline: "bg-red-500",
  }[serverStatus.status];

  const statusText = {
    checking: "Checking...",
    online: `Online (${serverStatus.latency}ms)`,
    offline: "Offline",
  }[serverStatus.status];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-surface-container-high border border-outline flex items-center justify-center hover:bg-surface-container-highest transition-colors shadow-lg"
        title="Debug Panel"
      >
        <svg className="w-6 h-6 text-on-surface" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.9 }}
            className="fixed bottom-20 right-4 z-40 w-80 max-h-[70vh] bg-surface-container-high border border-outline rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-3 border-b border-outline bg-surface-container-highest">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-on-surface">Debug Panel</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <div className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
                <span className="text-sm text-on-surface-variant">{statusText}</span>
                <span className="text-xs text-on-surface-variant ml-auto">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[calc(70vh-80px)]">
              {logs.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center py-4">No activity yet</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2 rounded-lg cursor-pointer transition-colors ${
                      log.type === "error"
                        ? "bg-error/10 hover:bg-error/20"
                        : log.type === "success"
                        ? "bg-success/10 hover:bg-success/20"
                        : log.type === "warning"
                        ? "bg-warning/10 hover:bg-warning/20"
                        : "bg-primary-dim/10 hover:bg-primary-dim/20"
                    }`}
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium ${
                          log.type === "error"
                            ? "text-error"
                            : log.type === "success"
                            ? "text-success"
                            : log.type === "warning"
                            ? "text-warning"
                            : "text-primary"
                        }`}
                      >
                        {log.type.toUpperCase()}
                      </span>
                      <span className="text-xs text-on-surface-variant">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface mt-1 break-all">{log.message}</p>
                    {expandedLog === log.id && log.details && (
                      <pre className="mt-2 text-xs bg-black/20 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {log.details}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-2 border-t border-outline bg-surface-container-highest">
              <button
                onClick={() => setLogs([])}
                className="w-full text-sm text-on-surface-variant hover:text-on-surface py-1"
              >
                Clear Logs
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
