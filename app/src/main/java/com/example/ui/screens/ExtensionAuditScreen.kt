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
import androidx.compose.ui.unit.dp
import com.example.platform.*
import com.example.ui.components.*
import com.example.ui.theme.*
import com.example.viewmodel.ShieldUiState

@Composable
fun ExtensionAuditScreen(
    uiState: ShieldUiState,
    onToggleExtensionEnabled: (String) -> Unit,
    onOpenOptionalPermissionDialog: () -> Unit,
    onCloseOptionalPermissionDialog: () -> Unit,
    onSetOptionalAllUrlsPermission: (Boolean) -> Unit,
    onSwitchPlatform: (PlatformId) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .testTag("extension_audit_list"),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 110.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Capability Gate for Chrome Extension Audit
        if (!uiState.capabilities.installedExtensionsAudit) {
            item {
                PlatformUnavailableCard(
                    featureTitleEn = "Browser Extension Audit (chrome.management.getAll)",
                    featureTitleBn = "ব্রাউজার এক্সটেনশন অডিট (chrome.management.getAll)",
                    requiredPlatform = PlatformId.CHROME_EXT,
                    currentPlatform = uiState.selectedPlatform,
                    language = uiState.language,
                    onSwitchPlatform = onSwitchPlatform
                )
            }
        }

        // MV3 Runtime Optional Host Permission Card (Explaining why <all_urls> is NOT requested by default)
        item {
            OptionalHostPermissionCard(
                isGranted = uiState.optionalAllUrlsGranted,
                language = uiState.language,
                onOpenExplainer = onOpenOptionalPermissionDialog,
                onRevoke = { onSetOptionalAllUrlsPermission(false) }
            )
        }

        // Header summary
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = if (uiState.language == AppLanguage.BN) {
                            "ইনস্টল করা ক্রোম এক্সটেনশন (${uiState.auditedExtensions.size})"
                        } else {
                            "Installed Chrome Extensions (${uiState.auditedExtensions.size})"
                        },
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary
                    )
                    Text(
                        text = "Evaluated via chrome.management.getAll() • Host access & danger level",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                }
            }
        }

        items(uiState.auditedExtensions, key = { it.id }) { ext ->
            AuditedExtensionCard(
                extension = ext,
                language = uiState.language,
                onToggleEnabled = { onToggleExtensionEnabled(ext.id) }
            )
        }
    }

    if (uiState.showOptionalPermissionDialog) {
        AlertDialog(
            onDismissRequest = onCloseOptionalPermissionDialog,
            containerColor = ObsidianSurface,
            titleContentColor = TextPrimary,
            textContentColor = TextSecondary,
            title = {
                Text(
                    text = "Optional Runtime Host Access (<all_urls>)",
                    style = MaterialTheme.typography.titleLarge
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "By default, Shield Chrome Extension (MV3) only uses 'activeTab' when you click the toolbar icon or context menu. It NEVER requests <all_urls> at install time.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextPrimary
                    )
                    Text(
                        text = "ডিফল্টভাবে Shield এক্সটেনশন শুধুমাত্র আপনি ক্লিক করলেই বর্তমান ট্যাব পরীক্ষা করে ('activeTab')। স্বয়ংক্রিয়ভাবে প্রতিটি সাইটে ব্যানার দেখাতে চাইলে আপনি ঐচ্ছিক অনুমতি (chrome.permissions.request) চালু করতে পারেন।",
                        style = MaterialTheme.typography.bodyMedium,
                        color = CrimsonAccent
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { onSetOptionalAllUrlsPermission(true) },
                    colors = ButtonDefaults.buttonColors(containerColor = CrimsonPrimary),
                    modifier = Modifier.testTag("confirm_optional_perm_btn")
                ) {
                    Text("Grant via chrome.permissions.request")
                }
            },
            dismissButton = {
                TextButton(onClick = onCloseOptionalPermissionDialog) {
                    Text("Keep activeTab Only", color = TextSecondary)
                }
            }
        )
    }
}

@Composable
private fun OptionalHostPermissionCard(
    isGranted: Boolean,
    language: AppLanguage,
    onOpenExplainer: () -> Unit,
    onRevoke: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("optional_host_permission_card"),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
        border = BorderStroke(1.dp, CyberBlueAccent.copy(alpha = 0.5f))
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
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "MV3 Minimal Host Permission Principle",
                        style = MaterialTheme.typography.titleSmall,
                        color = TextPrimary
                    )
                    Text(
                        text = if (isGranted) {
                            "Runtime optional <all_urls> active (Auto-Banner ON)"
                        } else {
                            "Default: activeTab only • <all_urls> NOT requested at install"
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = if (isGranted) AmberWarning else EmeraldSafe
                    )
                }
                if (isGranted) {
                    OutlinedButton(
                        onClick = onRevoke,
                        shape = RoundedCornerShape(50),
                        modifier = Modifier.height(40.dp)
                    ) {
                        Text("Revoke <all_urls>", color = CrimsonAccent)
                    }
                } else {
                    Button(
                        onClick = onOpenExplainer,
                        colors = ButtonDefaults.buttonColors(containerColor = CyberBlueContainer),
                        shape = RoundedCornerShape(50),
                        modifier = Modifier
                            .height(40.dp)
                            .testTag("request_optional_perm_btn")
                    ) {
                        Text("Enable Auto-Guard", color = CyberBlueAccent)
                    }
                }
            }

            BilingualExplanationBox(
                language = language,
                textEn = "Shield respects Chrome MV3 least-privilege rules: no inline scripts, no eval(), and no default <all_urls>. Host access is requested strictly at runtime with your explicit consent.",
                textBn = "Shield ন্যূনতম অনুমতির নিয়ম মেনে চলে: ইনস্টল করার সময় <all_urls> চাওয়া হয় না। শুধুমাত্র আপনার সম্মতিতে রানটাইমে ঐচ্ছিক অনুমতি নেওয়া হয়।"
            )
        }
    }
}

@Composable
private fun AuditedExtensionCard(
    extension: AuditedExtension,
    language: AppLanguage,
    onToggleEnabled: () -> Unit
) {
    var expanded by remember { mutableStateOf(true) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = !expanded }
            .testTag("extension_card_${extension.id}"),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
        border = BorderStroke(
            1.dp,
            if (extension.riskLevel == RiskLevel.HIGH) CrimsonPrimary.copy(alpha = 0.65f)
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
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = extension.name,
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary
                    )
                    Text(
                        text = "v${extension.version} • ${extension.installType} • Updated: ${extension.lastUpdated}",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary
                    )
                }
                RiskBadge(riskLevel = extension.riskLevel, language = language)
            }

            // Host Access Breadth Banner
            Surface(
                color = if (extension.hostAccessRisk == RiskLevel.HIGH) CrimsonDarkContainer else ObsidianSurfaceElevated,
                shape = RoundedCornerShape(10.dp),
                border = BorderStroke(
                    1.dp,
                    if (extension.hostAccessRisk == RiskLevel.HIGH) CrimsonPrimary.copy(alpha = 0.5f) else ObsidianCardBorder
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Public,
                            contentDescription = null,
                            tint = if (extension.hostAccessRisk == RiskLevel.HIGH) CrimsonAccent else EmeraldSafe,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "Host Access Breadth: ${extension.hostAccessBreadth}",
                            style = MaterialTheme.typography.labelMedium,
                            color = TextPrimary
                        )
                    }
                }
            }

            // Permissions chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                extension.permissions.forEach { perm ->
                    val isHigh = perm.dangerLevel == RiskLevel.HIGH
                    Surface(
                        color = if (isHigh) CrimsonDarkContainer else ObsidianSurfaceElevated,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = perm.name,
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isHigh) CrimsonAccent else CyberBlueAccent,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            AnimatedVisibility(visible = expanded) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    BilingualExplanationBox(
                        language = language,
                        textEn = extension.explanationEn,
                        textBn = extension.explanationBn
                    )

                    extension.permissions.forEach { perm ->
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFF0E0E14))
                                .padding(10.dp)
                        ) {
                            Text(
                                text = "${perm.name} (${perm.dangerLevel.labelEn})",
                                style = MaterialTheme.typography.labelMedium,
                                color = if (perm.dangerLevel == RiskLevel.HIGH) CrimsonAccent else EmeraldSafe
                            )
                            Text(
                                text = perm.descEn,
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

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (extension.enabled) "Status: Enabled in Browser" else "Status: Disabled (Quarantined)",
                            style = MaterialTheme.typography.labelMedium,
                            color = if (extension.enabled) TextSecondary else AmberWarning
                        )
                        OutlinedButton(
                            onClick = onToggleEnabled,
                            shape = RoundedCornerShape(50)
                        ) {
                            Text(
                                text = if (extension.enabled) "Disable Extension" else "Re-enable",
                                color = if (extension.enabled) CrimsonAccent else EmeraldSafe
                            )
                        }
                    }
                }
            }
        }
    }
}
