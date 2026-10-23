package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.platform.*
import com.example.ui.components.*
import com.example.ui.theme.*
import com.example.viewmodel.ShieldScreen
import com.example.viewmodel.ShieldUiState

@Composable
fun DashboardScreen(
    uiState: ShieldUiState,
    onUrlChange: (String) -> Unit,
    onCheckUrl: (String?) -> Unit,
    onDismissShadowBanner: () -> Unit,
    onOpenInterstitial: () -> Unit,
    onNavigate: (ShieldScreen) -> Unit,
    onSelectPlatform: (PlatformId) -> Unit,
    onTogglePopupMode: () -> Unit,
    modifier: Modifier = Modifier
) {
    val contentModifier = if (uiState.isCompactPopupMode) {
        modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 8.dp)
    } else {
        modifier.fillMaxSize()
    }

    Box(modifier = contentModifier, contentAlignment = Alignment.TopCenter) {
        val columnWidthModifier = if (uiState.isCompactPopupMode) {
            Modifier
                .widthIn(max = 360.dp)
                .heightIn(max = 620.dp)
                .clip(RoundedCornerShape(24.dp))
                .border(2.dp, CrimsonPrimary, RoundedCornerShape(24.dp))
                .background(ObsidianBackground)
        } else {
            Modifier.fillMaxSize()
        }

        LazyColumn(
            modifier = columnWidthModifier.testTag("dashboard_list"),
            contentPadding = PaddingValues(
                start = 16.dp,
                end = 16.dp,
                top = 8.dp,
                bottom = 110.dp
            ),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (uiState.isCompactPopupMode) {
                item {
                    Surface(
                        color = CrimsonDarkContainer,
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, CrimsonPrimary),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "CHROME MV3 POPUP (360×600)",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = CrimsonAccent
                                )
                                Text(
                                    text = "popup.html • activeTab scanner",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextSecondary
                                )
                            }
                            TextButton(
                                onClick = onTogglePopupMode,
                                modifier = Modifier.testTag("exit_popup_mode_btn")
                            ) {
                                Text("Full App", color = Color.White)
                            }
                        }
                    }
                }
            }

            // Hero Protection Card (Dark Crimson + Deep Indigo Gradient inspired by reference UI)
            item {
                HeroProtectionCard(
                    uiState = uiState,
                    onTogglePopupMode = onTogglePopupMode,
                    onRunQuickCheck = { onCheckUrl(null) }
                )
            }

            // Content Script Shadow DOM Banner Preview (shown when high/medium risk)
            item {
                AnimatedVisibility(
                    visible = uiState.showShadowDomBanner && uiState.currentVerdict.triggersShadowBanner
                ) {
                    ShadowDomWarningBanner(
                        verdict = uiState.currentVerdict,
                        language = uiState.language,
                        onDetailsClick = onOpenInterstitial,
                        onDismissClick = onDismissShadowBanner
                    )
                }
            }

            // Active Tab / URL Scanner ("Check this page")
            item {
                ActiveTabScannerCard(
                    uiState = uiState,
                    onUrlChange = onUrlChange,
                    onCheckUrl = onCheckUrl,
                    onOpenInterstitial = onOpenInterstitial
                )
            }

            // 2x2 Quick Access Grid (matching reference image's glowing tinted dark cards)
            item {
                Text(
                    text = if (uiState.language == AppLanguage.BN) "দ্রুত অ্যাক্সেস (Quick Access)" else "Quick Access",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(10.dp))
                QuickAccessGrid(
                    uiState = uiState,
                    onNavigate = onNavigate
                )
            }

            // 7-day Threat Telemetry Bar Chart (hidden in compact 360x600 popup mode to stay compact)
            if (!uiState.isCompactPopupMode) {
                item {
                    TelemetryStripedBarChart(days = uiState.telemetryDays)
                }
            }
        }
    }
}

@Composable
private fun HeroProtectionCard(
    uiState: ShieldUiState,
    onTogglePopupMode: () -> Unit,
    onRunQuickCheck: () -> Unit
) {
    val highRiskAppsCount = uiState.auditedApps.count { it.riskLevel == RiskLevel.HIGH }
    val highRiskExtsCount = uiState.auditedExtensions.count { it.riskLevel == RiskLevel.HIGH }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("hero_protection_card"),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        border = BorderStroke(1.dp, Color(0xFF4B1528))
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            Color(0xFF3E0717),
                            Color(0xFF17132A),
                            Color(0xFF0E0E17)
                        )
                    )
                )
                .padding(20.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        color = Color(0xFF2B0B17),
                        shape = RoundedCornerShape(50),
                        border = BorderStroke(1.dp, CrimsonPrimary.copy(alpha = 0.6f))
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Shield,
                                contentDescription = null,
                                tint = CrimsonAccent,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = "ADAPTER: ${uiState.selectedPlatform.badgeLabel}",
                                style = MaterialTheme.typography.labelSmall,
                                color = CrimsonAccent
                            )
                        }
                    }

                    Surface(
                        color = ObsidianSurfaceElevated,
                        shape = RoundedCornerShape(50),
                        border = BorderStroke(1.dp, ObsidianCardBorder),
                        modifier = Modifier
                            .clickable { onTogglePopupMode() }
                            .testTag("toggle_popup_mode_chip")
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.PictureInPictureAlt,
                                contentDescription = "Toggle Chrome 360x600 Popup View",
                                tint = CyberBlueAccent,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = if (uiState.isCompactPopupMode) "Exit Popup" else "360×600 Popup",
                                style = MaterialTheme.typography.labelSmall,
                                color = TextPrimary
                            )
                        }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom
                ) {
                    Column {
                        Text(
                            text = if (uiState.language == AppLanguage.BN) {
                                "শিল্ড সিকিউরিটি সক্রিয়"
                            } else {
                                "Shield Protection"
                            },
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary
                        )
                        Row(
                            verticalAlignment = Alignment.Bottom,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = "94.2%",
                                style = MaterialTheme.typography.displayLarge,
                                color = TextPrimary
                            )
                            Text(
                                text = "Device Trust Index",
                                style = MaterialTheme.typography.bodySmall,
                                color = CrimsonAccent,
                                modifier = Modifier.padding(bottom = 6.dp)
                            )
                        }
                    }
                }

                // Progress bar inspired by reference image's glowing red/dark track
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    LinearProgressIndicator(
                        progress = { 0.82f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(50)),
                        color = CrimsonPrimary,
                        trackColor = Color(0xFF282238)
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "$highRiskAppsCount risky APKs • $highRiskExtsCount risky extensions flagged",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                        Button(
                            onClick = onRunQuickCheck,
                            colors = ButtonDefaults.buttonColors(containerColor = CrimsonPrimary),
                            shape = RoundedCornerShape(50),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                            modifier = Modifier
                                .defaultMinSize(minHeight = 36.dp)
                                .testTag("hero_scan_now_btn")
                        ) {
                            Text(
                                text = "Verify Now",
                                style = MaterialTheme.typography.labelLarge
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ActiveTabScannerCard(
    uiState: ShieldUiState,
    onUrlChange: (String) -> Unit,
    onCheckUrl: (String?) -> Unit,
    onOpenInterstitial: () -> Unit
) {
    val verdict = uiState.currentVerdict

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("active_tab_scanner_card"),
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
                Column {
                    Text(
                        text = if (uiState.language == AppLanguage.BN) {
                            "এই পেজ বা লিংক পরীক্ষা করুন"
                        } else {
                            "Check This Page / Link Guard"
                        },
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary
                    )
                    Text(
                        text = "activeTab URL reader & contextMenu link analyzer",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                }
                RiskBadge(riskLevel = verdict.riskLevel, language = uiState.language)
            }

            OutlinedTextField(
                value = uiState.urlInput,
                onValueChange = onUrlChange,
                singleLine = true,
                placeholder = { Text("https://example.com") },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Default.Language,
                        contentDescription = "URL input",
                        tint = CrimsonAccent
                    )
                },
                trailingIcon = {
                    IconButton(
                        onClick = { onCheckUrl(null) },
                        modifier = Modifier.testTag("check_url_submit_btn")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Scan URL",
                            tint = Color.White
                        )
                    }
                },
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = CrimsonPrimary,
                    unfocusedBorderColor = ObsidianCardBorder,
                    focusedContainerColor = Color(0xFF0D0D13),
                    unfocusedContainerColor = Color(0xFF0D0D13)
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("url_input_field")
            )

            // Preset sample URLs for quick 1-tap testing
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                PresetUrlChip(
                    label = "Phishing (.top)",
                    url = "https://bkash-reward-claim.top/login",
                    onSelect = { onCheckUrl(it) }
                )
                PresetUrlChip(
                    label = "Malware (.apk)",
                    url = "https://hr-task-bonus.xyz/mod-apk.apk",
                    onSelect = { onCheckUrl(it) }
                )
                PresetUrlChip(
                    label = "Insecure HTTP",
                    url = "http://portal-isp-dhaka.net/login",
                    onSelect = { onCheckUrl(it) }
                )
                PresetUrlChip(
                    label = "Safe HTTPS",
                    url = "https://developer.android.com/security",
                    onSelect = { onCheckUrl(it) }
                )
            }

            // Verdict Result Card
            Surface(
                color = Color(0xFF0D0D14),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(
                    1.dp,
                    if (verdict.riskLevel == RiskLevel.HIGH) CrimsonPrimary.copy(alpha = 0.7f)
                    else ObsidianCardBorder
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = verdict.categoryEn,
                                style = MaterialTheme.typography.titleSmall,
                                color = TextPrimary
                            )
                            Text(
                                text = verdict.categoryBn,
                                style = MaterialTheme.typography.bodySmall,
                                color = CrimsonAccent
                            )
                        }
                        Surface(
                            color = if (verdict.riskScore >= 70) CrimsonDarkContainer else EmeraldSafeContainer,
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(
                                text = "Risk ${verdict.riskScore}/100",
                                style = MaterialTheme.typography.labelMedium,
                                color = if (verdict.riskScore >= 70) CrimsonAccent else EmeraldSafe,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }

                    BilingualExplanationBox(
                        language = uiState.language,
                        textEn = verdict.explanationEn,
                        textBn = verdict.explanationBn
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = { onCheckUrl(null) },
                            colors = ButtonDefaults.buttonColors(containerColor = CrimsonPrimary),
                            shape = RoundedCornerShape(50),
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                                .testTag("check_this_page_btn")
                        ) {
                            Icon(
                                imageVector = Icons.Default.VerifiedUser,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Check this page", style = MaterialTheme.typography.labelLarge)
                        }

                        if (verdict.triggersFullInterstitial) {
                            OutlinedButton(
                                onClick = onOpenInterstitial,
                                border = BorderStroke(1.dp, CrimsonAccent),
                                shape = RoundedCornerShape(50),
                                modifier = Modifier
                                    .height(48.dp)
                                    .testTag("open_interstitial_btn")
                            ) {
                                Text(
                                    text = "warning.html",
                                    color = CrimsonAccent,
                                    style = MaterialTheme.typography.labelLarge
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PresetUrlChip(
    label: String,
    url: String,
    onSelect: (String) -> Unit
) {
    Surface(
        color = ObsidianSurfaceElevated,
        shape = RoundedCornerShape(50),
        border = BorderStroke(1.dp, ObsidianCardBorder),
        modifier = Modifier.clickable { onSelect(url) }
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = TextPrimary,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
        )
    }
}

@Composable
private fun QuickAccessGrid(
    uiState: ShieldUiState,
    onNavigate: (ShieldScreen) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            QuickAccessTile(
                titleEn = "Apps Audit",
                titleBn = "ইনস্টল করা অ্যাপ",
                subtitle = "${uiState.auditedApps.size} apps • Android",
                icon = Icons.Default.Android,
                gradientColors = listOf(Color(0xFF3D1216), Color(0xFF17131A)),
                accentColor = CrimsonAccent,
                isSupported = uiState.capabilities.installedAppsAudit,
                onClick = { onNavigate(ShieldScreen.APPS_AUDIT) },
                testTag = "quick_access_apps_audit",
                modifier = Modifier.weight(1f)
            )
            QuickAccessTile(
                titleEn = "Notif & Scan",
                titleBn = "নোটিফিকেশন ও স্ক্যান",
                subtitle = "${uiState.monitoredNotifications.size} alerts • Guard",
                icon = Icons.Default.NotificationsActive,
                gradientColors = listOf(Color(0xFF0E2238), Color(0xFF131520)),
                accentColor = CyberBlueAccent,
                isSupported = uiState.capabilities.notificationMonitor || uiState.capabilities.backgroundScan,
                onClick = { onNavigate(ShieldScreen.MONITORS_SCAN) },
                testTag = "quick_access_monitors",
                modifier = Modifier.weight(1f)
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            QuickAccessTile(
                titleEn = "Extensions",
                titleBn = "এক্সটেনশন অডিট",
                subtitle = "${uiState.auditedExtensions.size} MV3 items",
                icon = Icons.Default.Extension,
                gradientColors = listOf(Color(0xFF0B2922), Color(0xFF12181A)),
                accentColor = EmeraldSafe,
                isSupported = uiState.capabilities.installedExtensionsAudit,
                onClick = { onNavigate(ShieldScreen.EXTENSIONS_AUDIT) },
                testTag = "quick_access_extensions",
                modifier = Modifier.weight(1f)
            )
            QuickAccessTile(
                titleEn = "3 Targets",
                titleBn = "প্ল্যাটফর্ম ও গাইড",
                subtitle = "Web • APK • MV3",
                icon = Icons.Default.Layers,
                gradientColors = listOf(Color(0xFF2E2410), Color(0xFF171614)),
                accentColor = AmberWarning,
                isSupported = true,
                onClick = { onNavigate(ShieldScreen.PLATFORM_DOCS) },
                testTag = "quick_access_platform_docs",
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun QuickAccessTile(
    titleEn: String,
    titleBn: String,
    subtitle: String,
    icon: ImageVector,
    gradientColors: List<Color>,
    accentColor: Color,
    isSupported: Boolean,
    onClick: () -> Unit,
    testTag: String,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .height(132.dp)
            .clickable { onClick() }
            .testTag(testTag),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        border = BorderStroke(1.dp, accentColor.copy(alpha = 0.28f))
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.linearGradient(gradientColors))
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.35f))
                            .border(1.dp, accentColor.copy(alpha = 0.5f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = titleEn,
                            tint = accentColor,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Surface(
                        color = Color.Black.copy(alpha = 0.4f),
                        shape = RoundedCornerShape(50)
                    ) {
                        Text(
                            text = if (isSupported) "ACTIVE" else "ADAPTER",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isSupported) accentColor else TextSecondary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                }

                Column {
                    Text(
                        text = titleEn,
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary
                    )
                    Text(
                        text = "$titleBn • $subtitle",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                        maxLines = 1
                    )
                }
            }
        }
    }
}
