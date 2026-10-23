package com.example.platform

enum class PlatformId(
    val rawId: String,
    val titleEn: String,
    val titleBn: String,
    val badgeLabel: String
) {
    ANDROID("android", "Android App", "অ্যান্ড্রয়েড অ্যাপ", "ANDROID"),
    CHROME_EXT("chrome-ext", "Chrome Extension (MV3)", "ক্রোম এক্সটেনশন (MV3)", "CHROME MV3"),
    WEB("web", "Web / PWA", "ওয়েব / পিডব্লিউএ", "WEB / PWA")
}

enum class AppLanguage(val code: String, val label: String) {
    BILINGUAL("EN+BN", "EN + বাংলা"),
    EN("EN", "English"),
    BN("BN", "বাংলা")
}

enum class RiskLevel(
    val labelEn: String,
    val labelBn: String,
    val severityOrder: Int
) {
    HIGH("High Risk", "উচ্চ ঝুঁকি", 3),
    MEDIUM("Medium Risk", "মাঝারি ঝুঁকি", 2),
    LOW("Low Risk", "কম ঝুঁকি", 1),
    SAFE("Verified Safe", "নিরাপদ", 0)
}

data class PlatformCapabilities(
    val installedAppsAudit: Boolean,
    val notificationMonitor: Boolean,
    val currentTabCheck: Boolean,
    val installedExtensionsAudit: Boolean,
    val downloadGuard: Boolean,
    val backgroundScan: Boolean
)

data class PermissionDetail(
    val name: String,
    val dangerLevel: RiskLevel,
    val descEn: String,
    val descBn: String
)

data class AuditedApp(
    val packageName: String,
    val appName: String,
    val versionName: String,
    val installerSource: String,
    val isUnknownSource: Boolean,
    val riskLevel: RiskLevel,
    val permissions: List<PermissionDetail>,
    val lastUpdated: String,
    val explanationEn: String,
    val explanationBn: String,
    val actionAdviceEn: String,
    val actionAdviceBn: String
)

data class MonitoredNotification(
    val id: String,
    val appName: String,
    val packageName: String,
    val title: String,
    val messageBody: String,
    val extractedUrl: String?,
    val timestamp: String,
    val riskLevel: RiskLevel,
    val explanationEn: String,
    val explanationBn: String,
    val isDismissed: Boolean = false
)

data class AuditedExtension(
    val id: String,
    val name: String,
    val version: String,
    val enabled: Boolean,
    val installType: String,
    val hostAccessBreadth: String,
    val hostAccessRisk: RiskLevel,
    val permissions: List<PermissionDetail>,
    val optionalPermissions: List<String>,
    val lastUpdated: String,
    val riskLevel: RiskLevel,
    val explanationEn: String,
    val explanationBn: String
)

data class ScanVerdict(
    val targetUrl: String,
    val domain: String,
    val riskLevel: RiskLevel,
    val riskScore: Int, // 0..100
    val categoryEn: String,
    val categoryBn: String,
    val explanationEn: String,
    val explanationBn: String,
    val triggersShadowBanner: Boolean,
    val triggersFullInterstitial: Boolean,
    val checkedAt: String
)

data class ScanHistoryEntry(
    val id: String,
    val timestamp: String,
    val targetPlatform: String,
    val itemsScanned: Int,
    val threatsFound: Int,
    val summaryEn: String,
    val summaryBn: String
)

data class ScheduledScanConfig(
    val enabled: Boolean,
    val intervalHours: Int,
    val wifiOnly: Boolean,
    val deepPermissionAudit: Boolean,
    val notificationUrlGuard: Boolean,
    val lastScanTime: String,
    val nextScanTime: String,
    val history: List<ScanHistoryEntry>
)

data class PermissionExplainerItem(
    val id: String,
    val titleEn: String,
    val titleBn: String,
    val apiName: String,
    val isEnabled: Boolean,
    val whyWeAskEn: String,
    val whyWeAskBn: String,
    val whatWeNeverDoEn: String,
    val whatWeNeverDoBn: String,
    val stepByStepEn: String,
    val stepByStepBn: String
)

data class DownloadCheckResult(
    val fileName: String,
    val sourceUrl: String,
    val mimeType: String,
    val riskLevel: RiskLevel,
    val warningEn: String,
    val warningBn: String
)

data class ThreatTelemetryDay(
    val dayLabel: String,
    val scansCount: Int,
    val threatsBlocked: Int,
    val isHighlighted: Boolean = false
)
