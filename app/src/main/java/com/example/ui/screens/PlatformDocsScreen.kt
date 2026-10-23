package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.platform.*
import com.example.ui.theme.*
import com.example.viewmodel.ShieldUiState

@Composable
fun PlatformDocsScreen(
    uiState: ShieldUiState,
    onSelectPlatform: (PlatformId) -> Unit,
    onTogglePopupMode: () -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .testTag("platform_docs_list"),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 110.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Live Platform Adapter Switcher Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
                border = BorderStroke(1.dp, CrimsonPrimary.copy(alpha = 0.5f))
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Platform Adapter Layer (/src/platform/)",
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary
                    )
                    Text(
                        text = "Tap any target below to switch the active PlatformAdapter at runtime and test capability gating across all screens:",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )

                    PlatformId.entries.forEach { platform ->
                        val isSelected = uiState.selectedPlatform == platform
                        Surface(
                            color = if (isSelected) CrimsonDarkContainer else ObsidianSurfaceElevated,
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(
                                1.dp,
                                if (isSelected) CrimsonPrimary else ObsidianCardBorder
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelectPlatform(platform) }
                                .testTag("select_adapter_${platform.rawId}")
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "${platform.titleEn} (${platform.titleBn})",
                                        style = MaterialTheme.typography.titleSmall,
                                        color = TextPrimary
                                    )
                                    Text(
                                        text = "id: '${platform.rawId}'",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = if (isSelected) CrimsonAccent else TextSecondary
                                    )
                                }
                                RadioButton(
                                    selected = isSelected,
                                    onClick = { onSelectPlatform(platform) },
                                    colors = RadioButtonDefaults.colors(selectedColor = CrimsonPrimary)
                                )
                            }
                        }
                    }

                    OutlinedButton(
                        onClick = onTogglePopupMode,
                        shape = RoundedCornerShape(50),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.PictureInPictureAlt,
                            contentDescription = null,
                            tint = CyberBlueAccent
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Preview Chrome MV3 popup.html (360×600)",
                            color = TextPrimary
                        )
                    }
                }
            }
        }

        // Platform Capability Matrix Table
        item {
            CapabilityMatrixCard()
        }

        // Chrome MV3 Minimal Permissions & Rationale Table
        item {
            Mv3PermissionsRationaleCard()
        }

        // Build & Load Unpacked Extension + Capacitor Wrapping Guide
        item {
            BuildAndDeployGuideCard()
        }
    }
}

@Composable
private fun CapabilityMatrixCard() {
    val rows = listOf(
        Triple("currentTabCheck", "Yes (Manual URL)", "Yes (Share / Intent) • Yes (activeTab)"),
        Triple("installedAppsAudit", "No (Friendly Card)", "Yes (TODO(native) + PM) • No on Chrome"),
        Triple("notificationMonitor", "No (Friendly Card)", "Yes (NotificationListener) • No on Chrome"),
        Triple("installedExtensionsAudit", "No (Friendly Card)", "No on Android • Yes (chrome.management)"),
        Triple("downloadGuard", "Limited", "Yes (APK Guard) • Yes (Service Worker)"),
        Triple("backgroundScan", "No", "Yes (WorkManager) • Yes (chrome.alarms)")
    )

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
        border = BorderStroke(1.dp, ObsidianCardBorder)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = "Platform Capability Matrix",
                style = MaterialTheme.typography.titleMedium,
                color = TextPrimary
            )
            rows.forEach { (cap, webStatus, nativeStatus) ->
                Surface(
                    color = Color(0xFF0E0E14),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, ObsidianCardBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = cap,
                            style = MaterialTheme.typography.labelMedium,
                            color = CrimsonAccent,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Web/PWA: $webStatus",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                        Text(
                            text = "Android / Chrome Ext: $nativeStatus",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextPrimary
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun Mv3PermissionsRationaleCard() {
    val permissions = listOf(
        "storage" to "Saves user language preference (EN/BN), scan history, and allowlist in chrome.storage.local.",
        "activeTab" to "Reads the active tab URL only when the user clicks 'Check this page' or the context menu.",
        "contextMenus" to "Adds 'Check this link with Shield' when right-clicking any hyperlink.",
        "management" to "Lists installed extensions via chrome.management.getAll() for the Extension Audit screen.",
        "alarms" to "Schedules lightweight periodic extension-audit checks in the MV3 background service worker.",
        "notifications" to "Displays urgent alerts when Download Guard or periodic extension audit detects high risk.",
        "optional_host_permissions" to "Requested ONLY at runtime with explanation screen if user enables automatic Shadow DOM page banners."
    )

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
        border = BorderStroke(1.dp, ObsidianCardBorder)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = "Manifest V3 Minimal Permissions & Reasons",
                style = MaterialTheme.typography.titleMedium,
                color = TextPrimary
            )
            Text(
                text = "Strict CSP: script-src 'self'; object-src 'self' • No inline scripts • No eval() • No <all_urls> by default",
                style = MaterialTheme.typography.labelSmall,
                color = EmeraldSafe
            )

            permissions.forEach { (perm, reason) ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFF0E0E14))
                        .padding(10.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = perm,
                        style = MaterialTheme.typography.labelMedium,
                        color = CyberBlueAccent,
                        modifier = Modifier.width(110.dp)
                    )
                    Text(
                        text = reason,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextPrimary,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

@Composable
private fun BuildAndDeployGuideCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
        border = BorderStroke(1.dp, ObsidianCardBorder)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = "Build Scripts & Deployment Guide",
                style = MaterialTheme.typography.titleMedium,
                color = TextPrimary
            )
            Surface(
                color = Color(0xFF0E0E14),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "1. Load Chrome Extension (dist-ext):",
                        style = MaterialTheme.typography.labelLarge,
                        color = CrimsonAccent
                    )
                    Text(
                        text = "• Run `npm run build:ext` to output `dist-ext/` with `manifest.json`, `popup.html`, `options.html`, `warning.html`, `background.js`, and `content.js`.\n• Open `chrome://extensions` → Enable 'Developer mode' → Click 'Load unpacked' → Select `dist-ext/`.",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "2. Android Native & Capacitor Wrap:",
                        style = MaterialTheme.typography.labelLarge,
                        color = CyberBlueAccent
                    )
                    Text(
                        text = "• Native Android APK builds directly via Gradle (`:app:assembleDebug`).\n• For web-to-APK Capacitor wrapping: `npm run build:web && npx cap sync android && npx cap open android`.",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextPrimary
                    )
                }
            }
        }
    }
}
