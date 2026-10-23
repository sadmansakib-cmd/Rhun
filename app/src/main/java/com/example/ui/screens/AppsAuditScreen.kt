package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.platform.*
import com.example.ui.components.*
import com.example.ui.theme.*
import com.example.viewmodel.AppAuditFilter
import com.example.viewmodel.ShieldUiState

@Composable
fun AppsAuditScreen(
    uiState: ShieldUiState,
    onSelectFilter: (AppAuditFilter) -> Unit,
    onOpenPermissionExplainer: (PermissionExplainerItem) -> Unit,
    onClosePermissionExplainer: () -> Unit,
    onTogglePermissionExplainer: (String) -> Unit,
    onSwitchPlatform: (PlatformId) -> Unit,
    modifier: Modifier = Modifier
) {
    val filteredApps = remember(uiState.auditedApps, uiState.selectedAppFilter) {
        when (uiState.selectedAppFilter) {
            AppAuditFilter.ALL -> uiState.auditedApps
            AppAuditFilter.HIGH_RISK -> uiState.auditedApps.filter { it.riskLevel == RiskLevel.HIGH }
            AppAuditFilter.UNKNOWN_SOURCE -> uiState.auditedApps.filter { it.isUnknownSource }
            AppAuditFilter.SAFE -> uiState.auditedApps.filter { it.riskLevel == RiskLevel.SAFE }
        }
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .testTag("apps_audit_list"),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 110.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Capability Gate: If current platform adapter does not support Installed Apps Audit, show friendly card
        if (!uiState.capabilities.installedAppsAudit) {
            item {
                PlatformUnavailableCard(
                    featureTitleEn = "Installed Apps & Sideload APK Audit",
                    featureTitleBn = "ইনস্টল করা অ্যাপ ও APK অডিট",
                    requiredPlatform = PlatformId.ANDROID,
                    currentPlatform = uiState.selectedPlatform,
                    language = uiState.language,
                    onSwitchPlatform = onSwitchPlatform
                )
            }
        }

        // Permission Explainer Section (Notification Access, Usage Access, Install Unknown Apps Awareness — NO AccessibilityService)
        item {
            PermissionExplainersCard(
                explainers = uiState.permissionExplainers,
                activeExplainer = uiState.activePermissionExplainer,
                language = uiState.language,
                onSelectExplainer = onOpenPermissionExplainer,
                onCloseExplainer = onClosePermissionExplainer,
                onToggleSimulatedGrant = onTogglePermissionExplainer
            )
        }

        // Filter Pills (styled like the reference image's Courses pill bar: Crimson active pill, dark bordered inactive pills)
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                AppAuditFilter.entries.forEach { filter ->
                    val isSelected = uiState.selectedAppFilter == filter
                    Surface(
                        color = if (isSelected) CrimsonPrimary else ObsidianSurface,
                        shape = RoundedCornerShape(50),
                        border = BorderStroke(
                            1.dp,
                            if (isSelected) CrimsonPrimary else ObsidianCardBorder
                        ),
                        modifier = Modifier
                            .clickable { onSelectFilter(filter) }
                            .testTag("app_filter_${filter.name.lowercase()}")
                    ) {
                        Text(
                            text = if (uiState.language == AppLanguage.BN) {
                                filter.labelBn
                            } else {
                                "${filter.labelEn} (${filter.labelBn})"
                            },
                            style = MaterialTheme.typography.labelLarge,
                            color = if (isSelected) Color.White else TextSecondary,
                            modifier = Modifier.padding(horizontal = 18.dp, vertical = 10.dp)
                        )
                    }
                }
            }
        }

        // Audited Installed Apps Cards
        items(filteredApps, key = { it.packageName }) { app ->
            AuditedAppCard(
                app = app,
                language = uiState.language
            )
        }
    }
}

@Composable
private fun PermissionExplainersCard(
    explainers: List<PermissionExplainerItem>,
    activeExplainer: PermissionExplainerItem?,
    language: AppLanguage,
    onSelectExplainer: (PermissionExplainerItem) -> Unit,
    onCloseExplainer: () -> Unit,
    onToggleSimulatedGrant: (String) -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("permission_explainers_section"),
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
                            "অ্যান্ড্রয়েড অনুমতি নির্দেশিকা (Permission Explainers)"
                        } else {
                            "Android Permission Explainers"
                        },
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary
                    )
                    Text(
                        text = "Zero AccessibilityService used • Privacy-first local inspection",
                        style = MaterialTheme.typography.bodySmall,
                        color = EmeraldSafe
                    )
                }
                Icon(
                    imageVector = Icons.Default.PrivacyTip,
                    contentDescription = "Privacy Guarantee",
                    tint = EmeraldSafe
                )
            }

            explainers.forEach { item ->
                val isSelected = activeExplainer?.id == item.id
                Surface(
                    color = if (isSelected) CrimsonDarkContainer else ObsidianSurfaceElevated,
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(
                        1.dp,
                        if (isSelected) CrimsonPrimary else ObsidianCardBorder
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            if (isSelected) onCloseExplainer() else onSelectExplainer(item)
                        }
                        .testTag("explainer_card_${item.id}")
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "${item.titleEn} • ${item.titleBn}",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = TextPrimary
                                )
                                Text(
                                    text = item.apiName,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = TextSecondary
                                )
                            }
                            Surface(
                                color = if (item.isEnabled) EmeraldSafeContainer else AmberWarningContainer,
                                shape = RoundedCornerShape(50)
                            ) {
                                Text(
                                    text = if (item.isEnabled) "AWARE / ON" else "REVIEW",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (item.isEnabled) EmeraldSafe else AmberWarning,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }

                        AnimatedVisibility(visible = isSelected) {
                            Column(
                                modifier = Modifier.padding(top = 6.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                BilingualExplanationBox(
                                    language = language,
                                    textEn = item.whyWeAskEn,
                                    textBn = item.whyWeAskBn
                                )
                                Surface(
                                    color = EmeraldSafeContainer.copy(alpha = 0.55f),
                                    shape = RoundedCornerShape(10.dp),
                                    border = BorderStroke(1.dp, EmeraldSafe.copy(alpha = 0.4f))
                                ) {
                                    Column(modifier = Modifier.padding(10.dp)) {
                                        Text(
                                            text = "Strict Non-Accessibility Guarantee:",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = EmeraldSafe
                                        )
                                        Text(
                                            text = item.whatWeNeverDoEn,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = TextPrimary
                                        )
                                        Text(
                                            text = item.whatWeNeverDoBn,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = TextSecondary
                                        )
                                    }
                                }
                                Text(
                                    text = "How to configure: ${item.stepByStepEn}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = CyberBlueAccent
                                )
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.End
                                ) {
                                    OutlinedButton(
                                        onClick = { onToggleSimulatedGrant(item.id) },
                                        shape = RoundedCornerShape(50)
                                    ) {
                                        Text(
                                            text = if (item.isEnabled) "Mark as Unconfigured" else "Mark as Configured",
                                            color = TextPrimary
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AuditedAppCard(
    app: AuditedApp,
    language: AppLanguage
) {
    var expanded by remember { mutableStateOf(app.riskLevel == RiskLevel.HIGH) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = !expanded }
            .testTag("audited_app_${app.packageName}"),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
        border = BorderStroke(
            1.dp,
            if (app.riskLevel == RiskLevel.HIGH) CrimsonPrimary.copy(alpha = 0.6f)
            else ObsidianCardBorder
        )
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                if (app.isUnknownSource) CrimsonDarkContainer else ObsidianSurfaceElevated
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (app.isUnknownSource) Icons.Default.WarningAmber else Icons.Default.Android,
                            contentDescription = null,
                            tint = if (app.isUnknownSource) CrimsonAccent else EmeraldSafe
                        )
                    }
                    Column {
                        Text(
                            text = app.appName,
                            style = MaterialTheme.typography.titleMedium,
                            color = TextPrimary
                        )
                        Text(
                            text = "${app.packageName} • v${app.versionName}",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextSecondary
                        )
                        Text(
                            text = "Source: ${app.installerSource}",
                            style = MaterialTheme.typography.bodySmall,
                            color = if (app.isUnknownSource) CrimsonAccent else EmeraldSafe
                        )
                    }
                }
                RiskBadge(riskLevel = app.riskLevel, language = language)
            }

            // Permission chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                app.permissions.forEach { perm ->
                    val chipColor = when (perm.dangerLevel) {
                        RiskLevel.HIGH -> CrimsonDarkContainer
                        RiskLevel.MEDIUM -> AmberWarningContainer
                        else -> ObsidianSurfaceElevated
                    }
                    val textColor = when (perm.dangerLevel) {
                        RiskLevel.HIGH -> CrimsonAccent
                        RiskLevel.MEDIUM -> AmberWarning
                        else -> TextSecondary
                    }
                    Surface(
                        color = chipColor,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = perm.name,
                            style = MaterialTheme.typography.labelSmall,
                            color = textColor,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            AnimatedVisibility(visible = expanded) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    BilingualExplanationBox(
                        language = language,
                        textEn = app.explanationEn,
                        textBn = app.explanationBn
                    )

                    // Detailed permission breakdown in English & Bengali
                    app.permissions.forEach { perm ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Icon(
                                imageVector = Icons.Default.Key,
                                contentDescription = null,
                                tint = CrimsonAccent,
                                modifier = Modifier
                                    .size(16.dp)
                                    .padding(top = 2.dp)
                            )
                            Column {
                                Text(
                                    text = "${perm.name}: ${perm.descEn}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextPrimary
                                )
                                Text(
                                    text = perm.descBn,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextSecondary
                                )
                            }
                        }
                    }

                    Surface(
                        color = ObsidianSurfaceElevated,
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(10.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircleOutline,
                                contentDescription = null,
                                tint = CyberBlueAccent,
                                modifier = Modifier.size(18.dp)
                            )
                            Column {
                                Text(
                                    text = app.actionAdviceEn,
                                    style = MaterialTheme.typography.labelLarge,
                                    color = TextPrimary
                                )
                                Text(
                                    text = app.actionAdviceBn,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = CyberBlueAccent
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
