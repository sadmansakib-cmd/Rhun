package com.example.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.platform.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class ShieldScreen(val route: String, val labelEn: String, val labelBn: String) {
    DASHBOARD("dashboard", "Home", "হোম"),
    APPS_AUDIT("apps_audit", "Apps Audit", "অ্যাপ অডিট"),
    MONITORS_SCAN("monitors_scan", "Monitors", "মনিটর"),
    EXTENSIONS_AUDIT("extensions_audit", "Extensions", "এক্সটেনশন"),
    PLATFORM_DOCS("platform_docs", "Targets", "প্ল্যাটফর্ম")
}

enum class AppAuditFilter(val labelEn: String, val labelBn: String) {
    ALL("All", "সব"),
    HIGH_RISK("High Risk", "উচ্চ ঝুঁকি"),
    UNKNOWN_SOURCE("Unknown APK", "অজানা সোর্স"),
    SAFE("Verified Safe", "নিরাপদ")
}

data class ShieldUiState(
    val currentScreen: ShieldScreen = ShieldScreen.DASHBOARD,
    val navigationHistory: List<ShieldScreen> = emptyList(),
    val selectedPlatform: PlatformId = PlatformId.ANDROID,
    val capabilities: PlatformCapabilities = AndroidPlatformAdapter().capabilities,
    val language: AppLanguage = AppLanguage.BILINGUAL,
    val isCompactPopupMode: Boolean = false,

    // URL / Active Tab Scanner
    val urlInput: String = "https://bkash-reward-claim.top/login",
    val currentVerdict: ScanVerdict = ShieldScanVerdictService.evaluateUrl("https://bkash-reward-claim.top/login"),
    val showShadowDomBanner: Boolean = true,
    val showFullPageInterstitial: Boolean = false,
    val interstitialConfirmProceedStep: Boolean = false,
    val bypassedUrls: Set<String> = emptySet(),

    // Android Installed Apps Audit
    val auditedApps: List<AuditedApp> = emptyList(),
    val selectedAppFilter: AppAuditFilter = AppAuditFilter.ALL,
    val permissionExplainers: List<PermissionExplainerItem> = emptyList(),
    val activePermissionExplainer: PermissionExplainerItem? = null,

    // Android Notification Monitor & Download Guard
    val monitoredNotifications: List<MonitoredNotification> = emptyList(),
    val latestDownloadCheck: DownloadCheckResult? = null,

    // Chrome Extension Audit
    val auditedExtensions: List<AuditedExtension> = emptyList(),
    val optionalAllUrlsGranted: Boolean = false,
    val showOptionalPermissionDialog: Boolean = false,

    // Scheduled Scan
    val scheduledScanConfig: ScheduledScanConfig = AndroidPlatformAdapter().getScheduledScanConfig(),
    val isRunningManualScan: Boolean = false,
    val scanProgressPercent: Int = 0,

    // 7-day Threat Telemetry (for reference-style bar chart)
    val telemetryDays: List<ThreatTelemetryDay> = listOf(
        ThreatTelemetryDay("23 Oct", scansCount = 42, threatsBlocked = 3, isHighlighted = false),
        ThreatTelemetryDay("24 Oct", scansCount = 29, threatsBlocked = 1, isHighlighted = false),
        ThreatTelemetryDay("25 Oct", scansCount = 38, threatsBlocked = 2, isHighlighted = false),
        ThreatTelemetryDay("26 Oct", scansCount = 35, threatsBlocked = 4, isHighlighted = true),
        ThreatTelemetryDay("27 Oct", scansCount = 46, threatsBlocked = 2, isHighlighted = false)
    )
)

class ShieldViewModel : ViewModel() {

    private var androidAdapter = AndroidPlatformAdapter(null)
    private val chromeAdapter = ChromeExtPlatformAdapter()
    private val webAdapter = WebPlatformAdapter()

    private val _uiState = MutableStateFlow(ShieldUiState())
    val uiState: StateFlow<ShieldUiState> = _uiState.asStateFlow()

    init {
        initializeDefaultData()
    }

    fun attachContext(context: Context) {
        androidAdapter = AndroidPlatformAdapter(context.applicationContext)
        refreshPlatformData(_uiState.value.selectedPlatform)
    }

    private fun initializeDefaultData() {
        val explainers = listOf(
            PermissionExplainerItem(
                id = "perm_notif_listener",
                titleEn = "Notification Access",
                titleBn = "নোটিফিকেশন অ্যাক্সেস সচেতনতা",
                apiName = "android.service.notification.NotificationListenerService",
                isEnabled = true,
                whyWeAskEn = "Inspects incoming SMS and chat notifications locally on your phone to catch phishing links (e.g., fake bKash/Nagad/Bank OTP alerts) before you tap them.",
                whyWeAskBn = "আপনার ফোনে আসা মেসেজ ও নোটিফিকেশনের ভেতরে থাকা ক্ষতিকর ফিশিং লিংক (যেমন নকল বিকাশ/ব্যাংক ওটিপি মেসেজ) ক্লিক করার আগেই শনাক্ত করতে এটি ব্যবহৃত হয়।",
                whatWeNeverDoEn = "Zero AccessibilityService usage. Notification text never leaves your device and is never uploaded to any cloud server.",
                whatWeNeverDoBn = "আমরা কখনোই Accessibility Service ব্যবহার করি না। আপনার মেসেজের লেখা ফোনের বাইরে কোনো সার্ভারে পাঠানো হয় না।",
                stepByStepEn = "Settings → Notifications → Device & app notifications → Shield Security → Allow notification access.",
                stepByStepBn = "সেটিংস → নোটিফিকেশন → ডিভাইস ও অ্যাপ নোটিফিকেশন → Shield Security চালু করুন।"
            ),
            PermissionExplainerItem(
                id = "perm_usage_stats",
                titleEn = "Usage Access",
                titleBn = "অ্যাপ ব্যবহারের তথ্য (Usage Access)",
                apiName = "android.app.usage.UsageStatsManager",
                isEnabled = true,
                whyWeAskEn = "Detects dormant or rarely used apps that wake up in the background at odd hours to transmit data or drain battery.",
                whyWeAskBn = "যেসব অ্যাপ আপনি ব্যবহার করেন না কিন্তু গোপনে ব্যাকগ্রাউন্ডে চালু হয়ে ডেটা বা ব্যাটারি খরচ করে সেগুলো শনাক্ত করতে এটি সাহায্য করে।",
                whatWeNeverDoEn = "Cannot read screen content, keystrokes, or personal messages inside your apps.",
                whatWeNeverDoBn = "এটি আপনার স্ক্রিনের লেখা, কিবোর্ড টাইপিং বা ব্যক্তিগত চ্যাট কখনোই পড়তে পারে না।",
                stepByStepEn = "Settings → Security & Privacy → More privacy settings → Usage access → Shield Security.",
                stepByStepBn = "সেটিংস → সিকিউরিটি ও প্রাইভেসি → ইউসেজ অ্যাক্সেস → Shield Security অনুমোদন দিন।"
            ),
            PermissionExplainerItem(
                id = "perm_unknown_apps",
                titleEn = "Install Unknown Apps Awareness",
                titleBn = "অজানা সোর্স থেকে অ্যাপ ইনস্টল সচেতনতা",
                apiName = "android.permission.REQUEST_INSTALL_PACKAGES",
                isEnabled = false,
                whyWeAskEn = "Audits which browsers or file managers on your phone have permission to sideload raw .APK files outside Google Play Protect.",
                whyWeAskBn = "আপনার ফোনের কোন ব্রাউজার বা ফাইল ম্যানেজারকে প্লে স্টোরের বাইরে থেকে সরাসরি .APK ফাইল ইনস্টল করার অনুমতি দেওয়া আছে তা পরীক্ষা করে সতর্ক করে।",
                whatWeNeverDoEn = "Shield never installs packages silently or requests Accessibility privileges.",
                whatWeNeverDoBn = "Shield কখনোই নিজে থেকে কোনো অ্যাপ ইনস্টল করে না এবং Accessibility অনুমতি চায় না।",
                stepByStepEn = "Settings → Apps → Special app access → Install unknown apps → Disable for browsers & messaging apps.",
                stepByStepBn = "সেটিংস → অ্যাপস → স্পেশাল অ্যাপ অ্যাক্সেস → Install unknown apps-এ গিয়ে ব্রাউজার ও চ্যাট অ্যাপের অনুমতি বন্ধ রাখুন।"
            )
        )

        _uiState.update { state ->
            state.copy(
                auditedApps = androidAdapter.auditInstalledApps(),
                monitoredNotifications = androidAdapter.getMonitoredNotifications(),
                auditedExtensions = chromeAdapter.auditInstalledExtensions(),
                scheduledScanConfig = androidAdapter.getScheduledScanConfig(),
                latestDownloadCheck = androidAdapter.checkDownloadSafety(
                    "bKash_Bonus_Reward_v4.apk",
                    "https://hr-task-bonus.xyz/app-release.apk"
                ),
                permissionExplainers = explainers
            )
        }
    }

    fun selectPlatform(platformId: PlatformId) {
        refreshPlatformData(platformId)
    }

    private fun refreshPlatformData(platformId: PlatformId) {
        val adapter: PlatformAdapter = when (platformId) {
            PlatformId.ANDROID -> androidAdapter
            PlatformId.CHROME_EXT -> chromeAdapter
            PlatformId.WEB -> webAdapter
        }

        _uiState.update { state ->
            state.copy(
                selectedPlatform = platformId,
                capabilities = adapter.capabilities,
                scheduledScanConfig = adapter.getScheduledScanConfig(),
                latestDownloadCheck = adapter.checkDownloadSafety(
                    if (platformId == PlatformId.CHROME_EXT) "Free_VPN_Unpacked.crx" else "Reward_Update.apk",
                    "https://unverified-mirror.xyz/download"
                )
            )
        }
    }

    fun navigateTo(screen: ShieldScreen) {
        _uiState.update { state ->
            if (state.currentScreen == screen) {
                state
            } else {
                state.copy(
                    currentScreen = screen,
                    navigationHistory = state.navigationHistory + state.currentScreen
                )
            }
        }
    }

    fun navigateBack(): Boolean {
        val current = _uiState.value
        if (current.showFullPageInterstitial) {
            closeInterstitialSafe()
            return true
        }
        if (current.activePermissionExplainer != null) {
            closePermissionExplainer()
            return true
        }
        if (current.isCompactPopupMode) {
            toggleCompactPopupMode(false)
            return true
        }
        if (current.navigationHistory.isNotEmpty()) {
            val previous = current.navigationHistory.last()
            _uiState.update {
                it.copy(
                    currentScreen = previous,
                    navigationHistory = it.navigationHistory.dropLast(1)
                )
            }
            return true
        }
        if (current.currentScreen != ShieldScreen.DASHBOARD) {
            _uiState.update { it.copy(currentScreen = ShieldScreen.DASHBOARD) }
            return true
        }
        return false
    }

    fun cycleLanguage() {
        _uiState.update { state ->
            val next = when (state.language) {
                AppLanguage.BILINGUAL -> AppLanguage.BN
                AppLanguage.BN -> AppLanguage.EN
                AppLanguage.EN -> AppLanguage.BILINGUAL
            }
            state.copy(language = next)
        }
    }

    fun setLanguage(language: AppLanguage) {
        _uiState.update { it.copy(language = language) }
    }

    fun toggleCompactPopupMode(enabled: Boolean? = null) {
        _uiState.update { state ->
            val target = enabled ?: !state.isCompactPopupMode
            state.copy(
                isCompactPopupMode = target,
                selectedPlatform = if (target) PlatformId.CHROME_EXT else state.selectedPlatform,
                capabilities = if (target) chromeAdapter.capabilities else state.capabilities
            )
        }
    }

    fun updateUrlInput(url: String) {
        _uiState.update { it.copy(urlInput = url) }
    }

    fun checkUrlNow(customUrl: String? = null) {
        val target = customUrl ?: _uiState.value.urlInput
        val verdict = ShieldScanVerdictService.evaluateUrl(target)
        _uiState.update { state ->
            state.copy(
                urlInput = target,
                currentVerdict = verdict,
                showShadowDomBanner = verdict.triggersShadowBanner,
                interstitialConfirmProceedStep = false
            )
        }
    }

    fun dismissShadowDomBanner() {
        _uiState.update { it.copy(showShadowDomBanner = false) }
    }

    fun openFullPageInterstitial() {
        _uiState.update {
            it.copy(
                showFullPageInterstitial = true,
                interstitialConfirmProceedStep = false
            )
        }
    }

    fun closeInterstitialSafe() {
        _uiState.update {
            it.copy(
                showFullPageInterstitial = false,
                interstitialConfirmProceedStep = false
            )
        }
    }

    fun requestInterstitialProceedStep() {
        _uiState.update { state ->
            if (!state.interstitialConfirmProceedStep) {
                state.copy(interstitialConfirmProceedStep = true)
            } else {
                state.copy(
                    showFullPageInterstitial = false,
                    interstitialConfirmProceedStep = false,
                    showShadowDomBanner = false,
                    bypassedUrls = state.bypassedUrls + state.currentVerdict.targetUrl
                )
            }
        }
    }

    fun setAppAuditFilter(filter: AppAuditFilter) {
        _uiState.update { it.copy(selectedAppFilter = filter) }
    }

    fun openPermissionExplainer(item: PermissionExplainerItem) {
        _uiState.update { it.copy(activePermissionExplainer = item) }
    }

    fun closePermissionExplainer() {
        _uiState.update { it.copy(activePermissionExplainer = null) }
    }

    fun togglePermissionExplainerStatus(id: String) {
        _uiState.update { state ->
            val updatedList = state.permissionExplainers.map {
                if (it.id == id) it.copy(isEnabled = !it.isEnabled) else it
            }
            val updatedActive = updatedList.find { it.id == state.activePermissionExplainer?.id }
            state.copy(
                permissionExplainers = updatedList,
                activePermissionExplainer = updatedActive
            )
        }
    }

    fun simulateIncomingPhishingNotification() {
        val newNotif = MonitoredNotification(
            id = "notif-${System.currentTimeMillis()}",
            appName = "SMS / Nagad Alert",
            packageName = "com.google.android.apps.messaging",
            title = "URGENT: Bonus 2,500 BDT Pending",
            messageBody = "Claim your festival cashback within 15 minutes: https://nagad-claim-bonus.top/verify-account",
            extractedUrl = "https://nagad-claim-bonus.top/verify-account",
            timestamp = "Just now",
            riskLevel = RiskLevel.HIGH,
            explanationEn = "Real-time Notification Monitor intercepted a high-risk '.top' phishing link targeting mobile banking credentials.",
            explanationBn = "নোটিফিকেশন মনিটর তাৎক্ষণিকভাবে একটি ঝুঁকিপূর্ণ '.top' ফিশিং লিংক শনাক্ত করেছে যা মোবাইল ব্যাংকিং পিন চুরির চেষ্টা করছে।"
        )
        _uiState.update { state ->
            state.copy(
                monitoredNotifications = listOf(newNotif) + state.monitoredNotifications
            )
        }
    }

    fun dismissNotificationAlert(id: String) {
        _uiState.update { state ->
            state.copy(
                monitoredNotifications = state.monitoredNotifications.filterNot { it.id == id }
            )
        }
    }

    fun toggleExtensionEnabled(extensionId: String) {
        _uiState.update { state ->
            state.copy(
                auditedExtensions = state.auditedExtensions.map { ext ->
                    if (ext.id == extensionId) ext.copy(enabled = !ext.enabled) else ext
                }
            )
        }
    }

    fun openOptionalPermissionExplainerDialog() {
        _uiState.update { it.copy(showOptionalPermissionDialog = true) }
    }

    fun closeOptionalPermissionExplainerDialog() {
        _uiState.update { it.copy(showOptionalPermissionDialog = false) }
    }

    fun setOptionalAllUrlsPermission(granted: Boolean) {
        _uiState.update {
            it.copy(
                optionalAllUrlsGranted = granted,
                showOptionalPermissionDialog = false
            )
        }
    }

    fun updateScanInterval(hours: Int) {
        _uiState.update { state ->
            state.copy(
                scheduledScanConfig = state.scheduledScanConfig.copy(
                    intervalHours = hours,
                    nextScanTime = "In ${hours}h 00m"
                )
            )
        }
    }

    fun toggleScheduledScanOption(
        enabled: Boolean? = null,
        wifiOnly: Boolean? = null,
        deepAudit: Boolean? = null,
        notifGuard: Boolean? = null
    ) {
        _uiState.update { state ->
            val cfg = state.scheduledScanConfig
            state.copy(
                scheduledScanConfig = cfg.copy(
                    enabled = enabled ?: cfg.enabled,
                    wifiOnly = wifiOnly ?: cfg.wifiOnly,
                    deepPermissionAudit = deepAudit ?: cfg.deepPermissionAudit,
                    notificationUrlGuard = notifGuard ?: cfg.notificationUrlGuard
                )
            )
        }
    }

    fun triggerManualBackgroundScan() {
        if (_uiState.value.isRunningManualScan) return
        viewModelScope.launch {
            _uiState.update { it.copy(isRunningManualScan = true, scanProgressPercent = 12) }
            delay(250)
            _uiState.update { it.copy(scanProgressPercent = 48) }
            delay(250)
            _uiState.update { it.copy(scanProgressPercent = 84) }
            delay(250)
            val platform = _uiState.value.selectedPlatform
            val newEntry = ScanHistoryEntry(
                id = "scan-${System.currentTimeMillis()}",
                timestamp = "Just now",
                targetPlatform = "${platform.titleEn} On-Demand Scan",
                itemsScanned = if (platform == PlatformId.CHROME_EXT) _uiState.value.auditedExtensions.size else _uiState.value.auditedApps.size,
                threatsFound = 2,
                summaryEn = "Completed full permission & link heuristic audit. 2 high-risk items require attention.",
                summaryBn = "সম্পূর্ণ নিরাপত্তা পরীক্ষা সম্পন্ন হয়েছে। ২টি উচ্চ-ঝুঁকিপূর্ণ বিষয়ে আপনার মনোযোগ প্রয়োজন।"
            )
            _uiState.update { state ->
                state.copy(
                    isRunningManualScan = false,
                    scanProgressPercent = 100,
                    scheduledScanConfig = state.scheduledScanConfig.copy(
                        lastScanTime = "Just now",
                        history = listOf(newEntry) + state.scheduledScanConfig.history
                    )
                )
            }
        }
    }
}
