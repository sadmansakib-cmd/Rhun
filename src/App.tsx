import React, { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Layers,
  Smartphone,
  Puzzle,
  Bell,
  RefreshCw,
  Globe,
  Lock,
  ArrowRight,
  Info,
  Clock,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import { PlatformId, ScanResult, AuditedApp, AuditedExtension, MonitoredNotification } from './types';
import { webAdapter, androidAdapter, chromeAdapter, PlatformAdapter } from './platform';
import { scanUrl, DEMO_MODE } from './services/api';

type Tab = 'dashboard' | 'extensions' | 'apps' | 'monitors' | 'platform';
type Language = 'bilingual' | 'en' | 'bn';

interface AppProps {
  initialPopupMode?: boolean;
}

export default function App({ initialPopupMode = false }: AppProps) {
  // Determine initial platform based on environment or popup
  const [platformId, setPlatformId] = useState<PlatformId>(
    initialPopupMode ? 'chrome-ext' : 'android'
  );
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [language, setLanguage] = useState<Language>('bilingual');
  const [isPopup, setIsPopup] = useState(initialPopupMode);

  // Active Adapter
  const adapter: PlatformAdapter =
    platformId === 'chrome-ext' ? chromeAdapter : platformId === 'web' ? webAdapter : androidAdapter;

  // Scanner State
  const [urlInput, setUrlInput] = useState('https://bkash-reward-claim.top/login');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Audited Data State
  const [extensions, setExtensions] = useState<AuditedExtension[]>([]);
  const [apps, setApps] = useState<AuditedApp[]>([]);
  const [notifications, setNotifications] = useState<MonitoredNotification[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Load Initial Data when adapter changes
  useEffect(() => {
    async function loadAdapterData() {
      setLoadingData(true);
      if (adapter.capabilities.installedExtensionsAudit && adapter.auditInstalledExtensions) {
        try {
          const exts = await adapter.auditInstalledExtensions();
          setExtensions(exts);
        } catch (_e) {
          // ignore
        }
      }
      if (adapter.capabilities.installedAppsAudit && adapter.auditInstalledApps) {
        try {
          const appList = await adapter.auditInstalledApps();
          setApps(appList);
        } catch (_e) {
          // ignore
        }
      }
      if (adapter.capabilities.notificationMonitor && adapter.getMonitoredNotifications) {
        try {
          const notifs = await adapter.getMonitoredNotifications();
          setNotifications(notifs);
        } catch (_e) {
          // ignore
        }
      }
      setLoadingData(false);
    }
    loadAdapterData();
  }, [platformId]);

  // Read active tab URL if available
  useEffect(() => {
    if (adapter.capabilities.currentTabCheck && adapter.getCurrentTabUrl) {
      adapter.getCurrentTabUrl().then((tabUrl) => {
        if (tabUrl && !tabUrl.startsWith('chrome://') && !tabUrl.startsWith('about:')) {
          setUrlInput(tabUrl);
        }
      });
    }
  }, [adapter]);

  // Initial Scan Run
  useEffect(() => {
    handleScanUrl('https://bkash-reward-claim.top/login');
  }, []);

  async function handleScanUrl(target?: string) {
    const toScan = target || urlInput;
    if (!toScan) return;
    setIsScanning(true);
    setScanError(null);
    try {
      const result = await scanUrl(toScan);
      setScanResult(result);
    } catch (err: any) {
      setScanError(err.message || 'Failed to scan URL');
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div className={`min-h-screen bg-[#09090D] text-slate-100 flex flex-col ${isPopup ? 'w-[360px] h-[600px] overflow-y-auto' : ''}`}>
      {/* Top Header */}
      <header className="border-b border-[#2A2430] bg-[#13131A]/90 backdrop-blur sticky top-0 z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-600 to-rose-900 border border-rose-400 flex items-center justify-center shadow-lg shadow-rose-950/40">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-wide text-white">Shield</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                  {adapter.id.toUpperCase()}
                </span>
                {DEMO_MODE && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                    DEMO
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-none">
                {language === 'bn' ? 'অন-ডিভাইস সাইবার সিকিউরিটি' : 'On-Device Security Guard'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Language Switcher */}
            <button
              onClick={() => {
                setLanguage((l) => (l === 'bilingual' ? 'bn' : l === 'bn' ? 'en' : 'bilingual'));
              }}
              className="px-2 py-1 rounded-full bg-[#1B1B25] border border-[#2A2430] text-xs font-medium text-slate-300 hover:border-rose-500 transition-colors"
            >
              {language === 'bilingual' ? 'EN + বাংলা' : language === 'bn' ? 'বাংলা' : 'EN'}
            </button>

            {!isPopup && (
              <button
                onClick={() => setIsPopup(true)}
                className="px-2 py-1 rounded-full bg-[#1B1B25] border border-[#2A2430] text-xs font-mono text-cyan-400 hover:border-cyan-500"
                title="Preview 360x600 Chrome Extension Popup mode"
              >
                360×600
              </button>
            )}
            {isPopup && (
              <button
                onClick={() => setIsPopup(false)}
                className="px-2 py-1 rounded-full bg-rose-900/60 border border-rose-700 text-xs font-medium text-white"
              >
                Full Tab
              </button>
            )}
          </div>
        </div>

        {/* Platform Adapter Switcher (Live runtime capability toggle) */}
        <div className="flex items-center space-x-2 mt-2.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 text-[11px] font-medium">Adapter:</span>
          {(['android', 'chrome-ext', 'web'] as PlatformId[]).map((pid) => (
            <button
              key={pid}
              onClick={() => setPlatformId(pid)}
              className={`px-2.5 py-1 rounded-full transition-all font-medium text-[11px] flex items-center space-x-1 ${
                platformId === pid
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950'
                  : 'bg-[#1B1B25] text-slate-400 hover:text-white border border-[#2A2430]'
              }`}
            >
              {pid === 'android' && <Smartphone className="w-3 h-3" />}
              {pid === 'chrome-ext' && <Puzzle className="w-3 h-3" />}
              {pid === 'web' && <Globe className="w-3 h-3" />}
              <span>{pid === 'android' ? 'Android' : pid === 'chrome-ext' ? 'Chrome MV3' : 'Web / PWA'}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-5 pb-20">
        {/* Navigation Tabs */}
        <nav className="flex space-x-2 border-b border-[#2A2430] pb-2 text-xs sm:text-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'bn' ? 'ড্যাশবোর্ড ও লিংক' : 'Dashboard'}
          </button>
          <button
            onClick={() => setActiveTab('extensions')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'extensions' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'bn' ? 'এক্সটেনশন' : 'Extensions'}
          </button>
          <button
            onClick={() => setActiveTab('apps')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'apps' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'bn' ? 'অ্যাপস' : 'Apps'}
          </button>
          <button
            onClick={() => setActiveTab('monitors')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'monitors' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'bn' ? 'মনিটর' : 'Monitors'}
          </button>
          <button
            onClick={() => setActiveTab('platform')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'platform' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'bn' ? 'গাইড' : 'Guide'}
          </button>
        </nav>

        {/* Tab 1: Dashboard & URL Scanner */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* Active Tab / URL Scan Card */}
            <div className="bg-[#13131A] border border-[#2A2430] rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-sm sm:text-base text-white flex items-center space-x-2">
                    <Search className="w-4 h-4 text-rose-500" />
                    <span>{language === 'bn' ? 'পেজ বা লিংক নিরাপত্তা পরীক্ষা' : 'Check This Page / Link Guard'}</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    {language === 'bn' ? 'রিয়েল-টাইম ফিশিং ও ক্ষতিকর লিংক সনাক্তকরণ' : 'Active tab reader & phishing URL heuristics'}
                  </p>
                </div>

                {adapter.capabilities.currentTabCheck && (
                  <button
                    onClick={() => {
                      if (adapter.getCurrentTabUrl) {
                        adapter.getCurrentTabUrl().then((tabUrl) => {
                          if (tabUrl) {
                            setUrlInput(tabUrl);
                            handleScanUrl(tabUrl);
                          }
                        });
                      }
                    }}
                    className="px-2.5 py-1 rounded-full bg-rose-950 text-rose-400 border border-rose-800 hover:bg-rose-900 text-xs font-medium transition-colors"
                  >
                    {language === 'bn' ? 'বর্তমান পেজ নিন' : 'Read Active Tab'}
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 bg-[#09090D] border border-[#2A2430] focus:border-rose-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 outline-none font-mono"
                />
                <button
                  onClick={() => handleScanUrl()}
                  disabled={isScanning}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-colors shadow-lg shadow-rose-950/50"
                >
                  {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  <span>{isScanning ? 'Checking...' : 'Check'}</span>
                </button>
              </div>

              {/* Quick Preset Test Pills */}
              <div className="flex items-center space-x-2 overflow-x-auto text-[11px] text-slate-400 pt-1">
                <span>Presets:</span>
                <button
                  onClick={() => {
                    const u = 'https://bkash-reward-claim.top/login';
                    setUrlInput(u);
                    handleScanUrl(u);
                  }}
                  className="px-2 py-0.5 rounded-full bg-[#1B1B25] border border-[#2A2430] hover:text-white"
                >
                  bKash Phish (.top)
                </button>
                <button
                  onClick={() => {
                    const u = 'https://hr-bonus-task.xyz/mod-app.apk';
                    setUrlInput(u);
                    handleScanUrl(u);
                  }}
                  className="px-2 py-0.5 rounded-full bg-[#1B1B25] border border-[#2A2430] hover:text-white"
                >
                  Malware (.apk)
                </button>
                <button
                  onClick={() => {
                    const u = 'http://insecure-isp-login.net/user';
                    setUrlInput(u);
                    handleScanUrl(u);
                  }}
                  className="px-2 py-0.5 rounded-full bg-[#1B1B25] border border-[#2A2430] hover:text-white"
                >
                  HTTP Insecure
                </button>
                <button
                  onClick={() => {
                    const u = 'https://developer.android.com';
                    setUrlInput(u);
                    handleScanUrl(u);
                  }}
                  className="px-2 py-0.5 rounded-full bg-[#1B1B25] border border-[#2A2430] hover:text-white"
                >
                  Clean HTTPS
                </button>
              </div>

              {scanError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-xs">
                  {scanError}
                </div>
              )}

              {/* Result Verdict Card */}
              {scanResult && (
                <div
                  className={`mt-4 rounded-xl border p-4 space-y-3 ${
                    scanResult.riskLevel === 'high'
                      ? 'bg-rose-950/30 border-rose-700'
                      : scanResult.riskLevel === 'medium'
                      ? 'bg-amber-950/30 border-amber-700'
                      : 'bg-emerald-950/30 border-emerald-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {scanResult.riskLevel === 'high' ? (
                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                      ) : scanResult.riskLevel === 'medium' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      )}
                      <div>
                        <div className="text-sm font-bold text-white uppercase tracking-wider">
                          Verdict:{' '}
                          {scanResult.verdict === 'safe' ? (
                            <span className="text-emerald-400 normal-case">
                              {language === 'bn'
                                ? 'কোনো পরিচিত হুমকি পাওয়া যায়নি'
                                : 'No known threats found'}
                            </span>
                          ) : (
                            scanResult.verdict
                          )}
                        </div>
                        {scanResult.verdict === 'safe' && (
                          <div className="text-[11px] text-amber-300/90 font-normal mt-0.5 normal-case">
                            {language === 'bn'
                              ? '⚠ এটি সম্পূর্ণ নিরাপত্তার নিশ্চয়তা দেয় না।'
                              : '⚠ This does not guarantee safety.'}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400 font-mono">{scanResult.domain}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-rose-400">Risk {scanResult.riskScore}/100</div>
                      <div className="text-[10px] text-slate-500">{scanResult.checkedAt}</div>
                    </div>
                  </div>

                  {/* Bilingual Explanations */}
                  <div className="space-y-2 text-xs">
                    {(language === 'bilingual' || language === 'en') && scanResult.reasons[0]?.explanationEn && (
                      <div className="bg-black/30 p-2.5 rounded-lg border border-[#2A2430]">
                        <span className="text-cyan-400 font-semibold block mb-0.5">EN Explanation:</span>
                        <p className="text-slate-200">{scanResult.reasons[0].explanationEn}</p>
                        {scanResult.reasons[0].potentialHarmEn && (
                          <p className="text-slate-400 text-[11px] mt-1">
                            <strong>Potential Harm:</strong> {scanResult.reasons[0].potentialHarmEn}
                          </p>
                        )}
                      </div>
                    )}

                    {(language === 'bilingual' || language === 'bn') && scanResult.reasons[0]?.explanationBn && (
                      <div className="bg-black/30 p-2.5 rounded-lg border border-[#2A2430]">
                        <span className="text-rose-400 font-semibold block mb-0.5">বাংলা বিবরণ:</span>
                        <p className="text-slate-200">{scanResult.reasons[0].explanationBn}</p>
                        {scanResult.reasons[0].potentialHarmBn && (
                          <p className="text-slate-400 text-[11px] mt-1">
                            <strong>সম্ভাব্য ক্ষতি:</strong> {scanResult.reasons[0].potentialHarmBn}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Interstitial Action Trigger if High Risk */}
                  {scanResult.triggersFullInterstitial && (
                    <div className="pt-2 flex items-center justify-between border-t border-rose-900/60">
                      <span className="text-xs text-rose-300 font-medium">Full Interstitial Available</span>
                      <a
                        href={`/warning.html?url=${encodeURIComponent(scanResult.targetUrl)}&verdict=${encodeURIComponent(
                          JSON.stringify(scanResult)
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center space-x-1"
                      >
                        <span>Open warning.html</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setActiveTab('extensions')}
                className="bg-[#13131A] border border-[#2A2430] hover:border-rose-500/50 p-3.5 rounded-xl cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <Puzzle className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400">
                    MV3
                  </span>
                </div>
                <div className="text-xs text-slate-400">Extension Audit</div>
                <div className="text-sm sm:text-base font-bold text-white">{extensions.length} Evaluated</div>
              </div>

              <div
                onClick={() => setActiveTab('apps')}
                className="bg-[#13131A] border border-[#2A2430] hover:border-rose-500/50 p-3.5 rounded-xl cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400">
                    APK
                  </span>
                </div>
                <div className="text-xs text-slate-400">Installed Apps</div>
                <div className="text-sm sm:text-base font-bold text-white">{apps.length} Monitored</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Extension Audit */}
        {activeTab === 'extensions' && (
          <div className="space-y-4">
            {!adapter.capabilities.installedExtensionsAudit ? (
              <PlatformUnavailableCard
                featureEn="Browser Extension Audit (chrome.management.getAll)"
                featureBn="ব্রাউজার এক্সটেনশন অডিট"
                requiredPlatform="chrome-ext"
                currentPlatform={platformId}
                onSwitch={() => setPlatformId('chrome-ext')}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-sm sm:text-base text-white">Installed Extensions Audit</h2>
                    <p className="text-xs text-slate-400">Real on-device inspection via chrome.management.getAll()</p>
                  </div>
                  <span className="text-xs font-mono text-slate-400">{extensions.length} Found</span>
                </div>

                {extensions.map((ext) => (
                  <div
                    key={ext.id}
                    className="bg-[#13131A] border border-[#2A2430] rounded-xl p-4 space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm text-white">{ext.name}</h3>
                        <p className="text-xs text-slate-400">v{ext.version} • {ext.installType}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                          ext.riskLevel === 'high'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : ext.riskLevel === 'medium'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        {ext.riskLevel}
                      </span>
                    </div>

                    <div className="bg-[#09090D] p-2 rounded-lg text-xs font-mono text-cyan-300">
                      Host Access: {ext.hostAccessBreadth}
                    </div>

                    <div className="space-y-1 text-xs">
                      {(language === 'bilingual' || language === 'en') && (
                        <p className="text-slate-300"><strong>EN:</strong> {ext.explanationEn}</p>
                      )}
                      {(language === 'bilingual' || language === 'bn') && (
                        <p className="text-rose-300"><strong>বাংলা:</strong> {ext.explanationBn}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Installed Apps Audit (Android Target) */}
        {activeTab === 'apps' && (
          <div className="space-y-4">
            {!adapter.capabilities.installedAppsAudit ? (
              <PlatformUnavailableCard
                featureEn="Android Installed Apps & Sideload APK Audit"
                featureBn="ইনস্টল করা অ্যাপ ও সাইডলোড APK অডিট"
                requiredPlatform="android"
                currentPlatform={platformId}
                onSwitch={() => setPlatformId('android')}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-sm sm:text-base text-white">Installed Apps & Sideload APKs</h2>
                    <p className="text-xs text-slate-400">Audit packages, dangerous permissions & unknown sources</p>
                  </div>
                  <span className="text-xs font-mono text-slate-400">{apps.length} Audited</span>
                </div>

                {apps.map((app) => (
                  <div
                    key={app.packageName}
                    className="bg-[#13131A] border border-[#2A2430] rounded-xl p-4 space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm text-white">{app.appName}</h3>
                        <p className="text-xs text-slate-400 font-mono">{app.packageName} • v{app.versionName}</p>
                        <p className="text-xs text-rose-400 mt-0.5">Source: {app.installerSource}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                          app.riskLevel === 'high'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        {app.riskLevel}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {app.permissions.map((p) => (
                        <span key={p.name} className="px-2 py-0.5 rounded bg-[#1B1B25] text-slate-300 font-mono">
                          {p.name}
                        </span>
                      ))}
                    </div>

                    <div className="space-y-1 text-xs">
                      {(language === 'bilingual' || language === 'en') && (
                        <p className="text-slate-300"><strong>EN:</strong> {app.explanationEn}</p>
                      )}
                      {(language === 'bilingual' || language === 'bn') && (
                        <p className="text-rose-300"><strong>বাংলা:</strong> {app.explanationBn}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Monitors & Scan */}
        {activeTab === 'monitors' && (
          <div className="space-y-4">
            {!adapter.capabilities.notificationMonitor && !adapter.capabilities.backgroundScan ? (
              <PlatformUnavailableCard
                featureEn="Notification Phishing Monitor & Scheduled Scan"
                featureBn="নোটিফিকেশন মনিটর ও স্বয়ংক্রিয় স্ক্যান"
                requiredPlatform="android"
                currentPlatform={platformId}
                onSwitch={() => setPlatformId('android')}
              />
            ) : (
              <div className="space-y-4">
                <div className="bg-[#13131A] border border-[#2A2430] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-rose-400" />
                      <h3 className="font-bold text-sm text-white">Notification Phishing Monitor</h3>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{notifications.length} Alerts</span>
                  </div>

                  {notifications.map((n) => (
                    <div key={n.id} className="p-3 bg-[#09090D] border border-[#2A2430] rounded-lg space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-white">{n.title} ({n.appName})</span>
                        <span className="text-[10px] text-slate-500">{n.timestamp}</span>
                      </div>
                      <p className="text-slate-400 italic font-mono text-[11px]">"{n.messageBody}"</p>
                      <div className="text-rose-400 font-medium">Link: {n.extractedUrl}</div>
                      <p className="text-slate-300">{n.explanationEn}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Platform & MV3 Guide */}
        {activeTab === 'platform' && (
          <div className="space-y-4">
            <div className="bg-[#13131A] border border-[#2A2430] rounded-xl p-4 sm:p-5 space-y-4">
              <h2 className="font-bold text-base text-white">Platform Capability Matrix</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#2A2430] text-slate-400">
                      <th className="py-2 pr-3">Feature</th>
                      <th className="py-2 px-2">Web / PWA</th>
                      <th className="py-2 px-2">Android (APK)</th>
                      <th className="py-2 pl-2">Chrome Ext (MV3)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2430] text-slate-300">
                    <tr>
                      <td className="py-2.5 font-mono text-rose-400">currentTabCheck</td>
                      <td className="py-2.5">Manual URL</td>
                      <td className="py-2.5">Share Intent</td>
                      <td className="py-2.5 text-emerald-400 font-semibold">activeTab Real</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono text-rose-400">installedAppsAudit</td>
                      <td className="py-2.5 text-slate-500">Unavailable</td>
                      <td className="py-2.5 text-emerald-400 font-semibold">PackageManager</td>
                      <td className="py-2.5 text-slate-500">Unavailable</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono text-rose-400">notificationMonitor</td>
                      <td className="py-2.5 text-slate-500">Unavailable</td>
                      <td className="py-2.5 text-emerald-400 font-semibold">NotificationListener</td>
                      <td className="py-2.5 text-slate-500">Unavailable</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono text-rose-400">installedExtensionsAudit</td>
                      <td className="py-2.5 text-slate-500">Unavailable</td>
                      <td className="py-2.5 text-slate-500">Unavailable</td>
                      <td className="py-2.5 text-emerald-400 font-semibold">chrome.management</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono text-rose-400">downloadGuard</td>
                      <td className="py-2.5 text-slate-500">Limited</td>
                      <td className="py-2.5 text-emerald-400 font-semibold">APK Detection</td>
                      <td className="py-2.5 text-emerald-400 font-semibold">Service Worker</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function PlatformUnavailableCard({
  featureEn,
  featureBn,
  requiredPlatform,
  currentPlatform,
  onSwitch
}: {
  featureEn: string;
  featureBn: string;
  requiredPlatform: PlatformId;
  currentPlatform: PlatformId;
  onSwitch: () => void;
}) {
  return (
    <div className="bg-[#13131A] border border-rose-900/60 rounded-2xl p-6 text-center space-y-3 shadow-xl">
      <div className="w-12 h-12 mx-auto rounded-full bg-rose-950/80 border border-rose-600 flex items-center justify-center text-rose-400">
        <Info className="w-6 h-6" />
      </div>
      <div>
        <h3 className="font-bold text-base text-white">
          Available on {requiredPlatform === 'android' ? 'Android' : requiredPlatform === 'chrome-ext' ? 'Chrome Extension' : 'Web'}
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          <strong>{featureEn}</strong> is not accessible from the <code>{currentPlatform}</code> adapter sandbox.
        </p>
        <p className="text-xs text-rose-300 mt-0.5">{featureBn} এই প্ল্যাটফর্মে উপলব্ধ নয়।</p>
      </div>
      <button
        onClick={onSwitch}
        className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shadow-lg shadow-rose-950"
      >
        Switch Adapter to {requiredPlatform}
      </button>
    </div>
  );
}
