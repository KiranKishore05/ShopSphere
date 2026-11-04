import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, AlertCircle, RefreshCw, Server, Database, ShieldCheck } from 'lucide-react';
import { checkHealth } from '../../services/healthService';

export default function HealthStatusBadge() {
  const [health, setHealth] = useState({
    connected: false,
    latency: 0,
    data: null,
    error: null,
    loading: true
  });
  const [showDetails, setShowDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = async () => {
    setIsRefreshing(true);
    const result = await checkHealth();
    setHealth({
      ...result,
      loading: false
    });
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchStatus();
    // Poll health every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-sphere-border bg-sphere-surface text-sphere-charcoal hover:border-sphere-sand transition-all text-xs shadow-editorial-sm"
        title="Click to view backend system status"
      >
        <span className="relative flex h-2 w-2">
          {health.connected ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          )}
        </span>

        <span className="font-medium tracking-wider uppercase text-[10px]">
          {health.loading ? 'Checking...' : health.connected ? 'API Online' : 'Detached'}
        </span>

        {health.connected && health.latency > 0 && (
          <span className="text-sphere-muted text-[10px] hidden sm:inline">
            ({health.latency}ms)
          </span>
        )}
      </button>

      {/* Popover Card */}
      {showDetails && (
        <div className="absolute right-0 mt-2 w-80 bg-sphere-surface border border-sphere-border rounded-lg shadow-editorial-lg p-4 z-50 text-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-sphere-border">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-sphere-sand-dark" />
              <span className="font-semibold text-sphere-ink uppercase tracking-wider text-[11px]">
                System Architecture Status
              </span>
            </div>
            <button
              onClick={fetchStatus}
              disabled={isRefreshing}
              className="text-sphere-muted hover:text-sphere-ink transition-colors p-1"
              title="Refresh Health"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {health.loading ? (
            <div className="py-4 text-center text-sphere-muted">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-sphere-sand" />
              <span>Querying system heartbeat...</span>
            </div>
          ) : health.connected ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sphere-charcoal">
                <span className="flex items-center gap-1.5 text-sphere-muted">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> API Gateway:
                </span>
                <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                  HTTP 200 OK
                </span>
              </div>

              <div className="flex items-center justify-between text-sphere-charcoal">
                <span className="flex items-center gap-1.5 text-sphere-muted">
                  <Activity className="w-3.5 h-3.5 text-sphere-sand-dark" /> Roundtrip Latency:
                </span>
                <span className="font-mono text-sphere-ink">{health.latency} ms</span>
              </div>

              <div className="flex items-center justify-between text-sphere-charcoal">
                <span className="flex items-center gap-1.5 text-sphere-muted">
                  <Database className="w-3.5 h-3.5 text-sphere-sand-dark" /> Database Status:
                </span>
                <span className="font-medium capitalize text-sphere-ink">
                  {health.data?.database?.status || 'Active'}
                </span>
              </div>

              <div className="flex items-center justify-between text-sphere-charcoal">
                <span className="flex items-center gap-1.5 text-sphere-muted">
                  <ShieldCheck className="w-3.5 h-3.5 text-sphere-sand-dark" /> Environment:
                </span>
                <span className="font-mono text-sphere-ink uppercase text-[10px]">
                  {health.data?.environment || 'development'}
                </span>
              </div>

              <div className="pt-2 border-t border-sphere-border text-[10px] text-sphere-muted flex justify-between">
                <span>Uptime: {health.data?.uptimeSeconds ?? 0}s</span>
                <span>v{health.data?.version || '1.0.0'}</span>
              </div>
            </div>
          ) : (
            <div className="py-2 text-rose-700 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Backend Unreachable</p>
                  <p className="text-[11px] text-rose-600/80 mt-1">
                    {health.error || 'Ensure Node server is running on http://localhost:5000'}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-sphere-muted bg-sphere-cream p-2 rounded">
                Run <code className="font-mono text-sphere-ink">npm run dev:server</code> in the server terminal.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
