package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.example.platform.*
import com.example.ui.components.*
import com.example.ui.theme.*
import com.example.viewmodel.ShieldUiState

@Composable
fun MonitorsAndScanScreen(
    uiState: ShieldUiState,
    onSimulatePhishingNotif: () -> Unit,
    onDismissNotification: (String) -> Unit,
    onInspectUrlFromNotification: (String) -> Unit,
    onUpdateScanInterval: (Int) -> Unit,
    onToggleScanOption: (Boolean?, Boolean?, Boolean?, Boolean?) -> Unit,
    onTriggerManualScan: () -> Unit,
    onSwitchPlatform: (PlatformId) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .testTag("monitors_scan_list"),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 110.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Notification Monitor Capability Gate & Section
        item {
            if (!uiState.capabilities.notificationMonitor) {
                PlatformUnavailableCard(
                    featureTitleEn = "Real-time Notification Link & OTP Scam Monitor",
                    featureTitleBn = "নোটিফিকেশন ফিশিং ও ওটিপি স্ক্যাম মনিটর",
                    requiredPlatform = PlatformId.ANDROID,
                    currentPlatform = uiState.selectedPlatform,
                    language = uiState.language,
                    onSwitchPlatform = onSwitchPlatform
                )
            } else {
                NotificationMonitorHeaderCard(
                    count = uiState.monitoredNotifications.size,
                    language = uiState.language,
                    onSimulatePhishingNotif = onSimulatePhishingNotif
                )
            }
        }

        if (uiState.capabilities.notificationMonitor) {
            items(uiState.monitoredNotifications, key = { it.id }) { notif ->
                MonitoredNotificationCard(
                    notification = notif,
                    language = uiState.language,
                    onInspectUrl = { url -> onInspectUrlFromNotification(url) },
                    onDismiss = { onDismissNotification(notif.id) }
                )
            }
        }

        // 2. Download Guard Warning Flow (Android & Chrome Extension)
        item {
            if (!uiState.capabilities.downloadGuard) {
                PlatformUnavailableCard(
                    featureTitleEn = "Download Guard (.APK / .CRX Interceptor)",
                    featureTitleBn = "ডাউনলোড গার্ড (ফাইল পরীক্ষা)",
                    requiredPlatform = PlatformId.CHROME_EXT,
                    currentPlatform = uiState.selectedPlatform,
                    language = uiState.language,
                    onSwitchPlatform = onSwitchPlatform
                )
            } else {
                uiState.latestDownloadCheck?.let { dl ->
                    DownloadGuardCard(download = dl, language = uiState.language)
                }
            }
        }

        // 3. Scheduled Background Scan Section
        item {
            if (!uiState.capabilities.backgroundScan) {
                PlatformUnavailableCard(
                    featureTitleEn = "Scheduled Background Scan (WorkManager / chrome.alarms)",
                    featureTitleBn = "স্বয়ংক্রিয় ব্যাকগ্রাউন্ড স্ক্যান",
                    requiredPlatform = PlatformId.ANDROID,
                    currentPlatform = uiState.selectedPlatform,
                    language = uiState.language,
                    onSwitchPlatform = onSwitchPlatform
                )
            } else {
                ScheduledScanCard(
                    uiState = uiState,
                    onUpdateScanInterval = onUpdateScanInterval,
                    onToggleScanOption = onToggleScanOption,
                    onTriggerManualScan = onTriggerManualScan
                )
            }
        }
    }
}

@Composable
private fun NotificationMonitorHeaderCard(
    count: Int,
    language: AppLanguage,
    onSimulatePhishingNotif: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
        border = BorderStroke(1.dp, ObsidianCardBorder)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = if (language == AppLanguage.BN) {
                            "নোটিফিকেশন মনিটর ($count)"
                        } else {
                            "Notification Phishing Monitor ($count)"
                        },
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary
                    )
                    Text(
                        text = "Reads NotificationListenerService events (TODO(native) adapter)",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                }
                Icon(
                    imageVector = Icons.Default.NotificationsActive,
                    contentDescription = null,
                    tint = CrimsonAccent
                )
            }

            Button(
                onClick = onSimulatePhishingNotif,
                colors = ButtonDefaults.buttonColors(containerColor = CrimsonPrimary),
                shape = RoundedCornerShape(50),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .testTag("simulate_phishing_notif_btn")
            ) {
                Icon(
                    imageVector = Icons.Default.AddAlert,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Simulate Incoming SMS Phishing Link",
                    style = MaterialTheme.typography.labelLarge
                )
            }
        }
    }
}

@Composable
private fun MonitoredNotificationCard(
    notification: MonitoredNotification,
    language: AppLanguage,
    onInspectUrl: (String) -> Unit,
    onDismiss: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("notif_card_${notification.id}"),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
        border = BorderStroke(
            1.dp,
            if (notification.riskLevel == RiskLevel.HIGH) CrimsonPrimary.copy(alpha = 0.65f)
            else ObsidianCardBorder
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.SmsFailed,
                        contentDescription = null,
                        tint = if (notification.riskLevel == RiskLevel.HIGH) CrimsonAccent else EmeraldSafe,
                        modifier = Modifier.size(20.dp)
                    )
                    Column {
                        Text(
                            text = "${notification.appName} • ${notification.timestamp}",
                            style = MaterialTheme.typography.labelMedium,
                            color = TextSecondary
                        )
                        Text(
                            text = notification.title,
                            style = MaterialTheme.typography.titleSmall,
                            color = TextPrimary
                        )
                    }
                }
                RiskBadge(riskLevel = notification.riskLevel, language = language)
            }

            Surface(
                color = Color(0xFF0E0E14),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = "\"${notification.messageBody}\"",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary,
                    modifier = Modifier.padding(10.dp)
                )
            }

            BilingualExplanationBox(
                language = language,
                textEn = notification.explanationEn,
                textBn = notification.explanationBn
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                notification.extractedUrl?.let { url ->
                    Button(
                        onClick = { onInspectUrl(url) },
                        colors = ButtonDefaults.buttonColors(containerColor = CrimsonPrimary),
                        shape = RoundedCornerShape(50),
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                    ) {
                        Text("Inspect Link Verdict", style = MaterialTheme.typography.labelLarge)
                    }
                }
                OutlinedButton(
                    onClick = onDismiss,
                    shape = RoundedCornerShape(50),
                    modifier = Modifier.height(48.dp)
                ) {
                    Text("Dismiss", color = TextSecondary)
                }
            }
        }
    }
}

@Composable
private fun DownloadGuardCard(
    download: DownloadCheckResult,
    language: AppLanguage
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
        border = BorderStroke(1.dp, AmberWarning.copy(alpha = 0.6f))
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.DownloadForOffline,
                        contentDescription = null,
                        tint = AmberWarning
                    )
                    Column {
                        Text(
                            text = "Download Guard Notification Flow",
                            style = MaterialTheme.typography.titleSmall,
                            color = TextPrimary
                        )
                        Text(
                            text = "${download.fileName} (${download.mimeType})",
                            style = MaterialTheme.typography.labelSmall,
                            color = AmberWarning
                        )
                    }
                }
                RiskBadge(riskLevel = download.riskLevel, language = language)
            }

            BilingualExplanationBox(
                language = language,
                textEn = download.warningEn,
                textBn = download.warningBn
            )
        }
    }
}

@Composable
private fun ScheduledScanCard(
    uiState: ShieldUiState,
    onUpdateScanInterval: (Int) -> Unit,
    onToggleScanOption: (Boolean?, Boolean?, Boolean?, Boolean?) -> Unit,
    onTriggerManualScan: () -> Unit
) {
    val cfg = uiState.scheduledScanConfig

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("scheduled_scan_card"),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
        border = BorderStroke(1.dp, ObsidianCardBorder)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = if (uiState.language == AppLanguage.BN) {
                            "স্বয়ংক্রিয় ব্যাকগ্রাউন্ড স্ক্যান (Scheduled Scan)"
                        } else {
                            "Scheduled Background Scan"
                        },
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary
                    )
                    Text(
                        text = "Last: ${cfg.lastScanTime} • Next: ${cfg.nextScanTime}",
                        style = MaterialTheme.typography.labelSmall,
                        color = CyberBlueAccent
                    )
                }
                Switch(
                    checked = cfg.enabled,
                    onCheckedChange = { onToggleScanOption(it, null, null, null) },
                    colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = CrimsonPrimary)
                )
            }

            // Interval selector pills
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(6, 12, 24).forEach { hours ->
                    val selected = cfg.intervalHours == hours
                    Surface(
                        color = if (selected) CrimsonPrimary else ObsidianSurfaceElevated,
                        shape = RoundedCornerShape(50),
                        modifier = Modifier
                            .weight(1f)
                            .clickable { onUpdateScanInterval(hours) }
                            .testTag("scan_interval_${hours}h")
                    ) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier.padding(vertical = 10.dp)
                        ) {
                            Text(
                                text = "Every ${hours}h",
                                style = MaterialTheme.typography.labelLarge,
                                color = if (selected) Color.White else TextSecondary
                            )
                        }
                    }
                }
            }

            // Toggle options
            ScanToggleRow(
                title = "Deep Permission & Sideload Audit",
                subtitle = "Flag newly installed APKs / Extensions automatically",
                checked = cfg.deepPermissionAudit,
                onCheckedChange = { onToggleScanOption(null, null, it, null) }
            )
            ScanToggleRow(
                title = "Scan on Unmetered Wi-Fi Only",
                subtitle = "Preserve mobile data during reputation database sync",
                checked = cfg.wifiOnly,
                onCheckedChange = { onToggleScanOption(null, it, null, null) }
            )

            AnimatedVisibility(visible = uiState.isRunningManualScan) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    LinearProgressIndicator(
                        progress = { uiState.scanProgressPercent / 100f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(50)),
                        color = CrimsonPrimary,
                        trackColor = ObsidianSurfaceElevated
                    )
                    Text(
                        text = "Auditing packages & permissions (${uiState.scanProgressPercent}%)...",
                        style = MaterialTheme.typography.labelSmall,
                        color = CrimsonAccent
                    )
                }
            }

            Button(
                onClick = onTriggerManualScan,
                enabled = !uiState.isRunningManualScan,
                colors = ButtonDefaults.buttonColors(containerColor = CrimsonPrimary),
                shape = RoundedCornerShape(50),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .testTag("run_manual_scan_btn")
            ) {
                Icon(
                    imageVector = Icons.Default.Radar,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Run Background Audit Now", style = MaterialTheme.typography.labelLarge)
            }

            // Recent Scan History
            if (cfg.history.isNotEmpty()) {
                Text(
                    text = "Recent Audit Log",
                    style = MaterialTheme.typography.labelLarge,
                    color = TextSecondary
                )
                cfg.history.take(3).forEach { entry ->
                    Surface(
                        color = Color(0xFF0E0E14),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, ObsidianCardBorder)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "${entry.targetPlatform} • ${entry.timestamp}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = CyberBlueAccent
                                )
                                Text(
                                    text = "${entry.itemsScanned} items • ${entry.threatsFound} threats",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (entry.threatsFound > 0) CrimsonAccent else EmeraldSafe
                                )
                            }
                            Text(
                                text = entry.summaryEn,
                                style = MaterialTheme.typography.bodySmall,
                                color = TextPrimary
                            )
                            Text(
                                text = entry.summaryBn,
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ScanToggleRow(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = title, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
            Text(text = subtitle, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
        }
        Checkbox(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = CheckboxDefaults.colors(checkedColor = CrimsonPrimary)
        )
    }
}
