package com.example.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.platform.*
import com.example.ui.theme.*

@Composable
fun BilingualExplanationBox(
    language: AppLanguage,
    textEn: String,
    textBn: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background( Color(0xFF0E0E14))
            .border(1.dp, ObsidianCardBorder, RoundedCornerShape(12.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        if (language == AppLanguage.BILINGUAL || language == AppLanguage.EN) {
            Row(verticalAlignment = Alignment.Top) {
                Text(
                    text = "EN",
                    style = MaterialTheme.typography.labelSmall,
                    color = CyberBlueAccent,
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(CyberBlueContainer)
                        .padding(horizontal = 5.dp, vertical = 2.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = textEn,
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextPrimary
                )
            }
        }
        if (language == AppLanguage.BILINGUAL || language == AppLanguage.BN) {
            Row(verticalAlignment = Alignment.Top) {
                Text(
                    text = "বাংলা",
                    style = MaterialTheme.typography.labelSmall,
                    color = CrimsonAccent,
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(CrimsonDarkContainer)
                        .padding(horizontal = 5.dp, vertical = 2.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = textBn,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFFE2E8F0)
                )
            }
        }
    }
}

@Composable
fun RiskBadge(
    riskLevel: RiskLevel,
    language: AppLanguage,
    modifier: Modifier = Modifier
) {
    val (bgColor, textColor, borderColor) = when (riskLevel) {
        RiskLevel.HIGH -> Triple(CrimsonDarkContainer, CrimsonAccent, CrimsonPrimary)
        RiskLevel.MEDIUM -> Triple(AmberWarningContainer, AmberWarning, AmberWarning.copy(alpha = 0.6f))
        RiskLevel.LOW -> Triple(CyberBlueContainer, CyberBlueAccent, CyberBlueAccent.copy(alpha = 0.6f))
        RiskLevel.SAFE -> Triple(EmeraldSafeContainer, EmeraldSafe, EmeraldSafe.copy(alpha = 0.6f))
    }

    val label = when (language) {
        AppLanguage.BN -> riskLevel.labelBn
        AppLanguage.EN -> riskLevel.labelEn
        AppLanguage.BILINGUAL -> "${riskLevel.labelEn} • ${riskLevel.labelBn}"
    }

    Surface(
        modifier = modifier,
        color = bgColor,
        shape = RoundedCornerShape(50),
        border = BorderStroke(1.dp, borderColor)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(textColor)
            )
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = textColor,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
fun PlatformUnavailableCard(
    featureTitleEn: String,
    featureTitleBn: String,
    requiredPlatform: PlatformId,
    currentPlatform: PlatformId,
    language: AppLanguage,
    onSwitchPlatform: (PlatformId) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("platform_unavailable_card"),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
        border = BorderStroke(1.dp, CrimsonPrimary.copy(alpha = 0.45f))
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(CircleShape)
                        .background(CrimsonDarkContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Devices,
                        contentDescription = "Platform availability",
                        tint = CrimsonAccent
                    )
                }
                Column {
                    Text(
                        text = if (language == AppLanguage.BN) {
                            "${requiredPlatform.titleBn}-এ উপলব্ধ"
                        } else {
                            "Available on ${requiredPlatform.titleEn}"
                        },
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary
                    )
                    Text(
                        text = "Current adapter: ${currentPlatform.rawId} (capability disabled)",
                        style = MaterialTheme.typography.labelMedium,
                        color = TextSecondary
                    )
                }
            }

            BilingualExplanationBox(
                language = language,
                textEn = "$featureTitleEn requires native OS / browser hooks not exposed on '${currentPlatform.titleEn}'. Switch to the ${requiredPlatform.titleEn} adapter to use or inspect this feature.",
                textBn = "$featureTitleBn ফিচারটি '${currentPlatform.titleBn}' প্ল্যাটফর্মে ব্রাউজার সীমাবদ্ধতার কারণে সরাসরি চলে না। এটি ব্যবহার করতে ${requiredPlatform.titleBn} মোডে সুইচ করুন।"
            )

            Button(
                onClick = { onSwitchPlatform(requiredPlatform) },
                colors = ButtonDefaults.buttonColors(containerColor = CrimsonPrimary),
                shape = RoundedCornerShape(50),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .testTag("switch_platform_button")
            ) {
                Icon(
                    imageVector = Icons.Default.SwapHoriz,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Switch Adapter to ${requiredPlatform.titleEn}",
                    style = MaterialTheme.typography.labelLarge
                )
            }
        }
    }
}

/**
 * Content Script Shadow DOM Warning Banner (#shield-shadow-host)
 * Injected when the service layer returns a high/medium-risk verdict for the current page;
 * includes "Details" (opens warning.html interstitial) and "Dismiss".
 */
@Composable
fun ShadowDomWarningBanner(
    verdict: ScanVerdict,
    language: AppLanguage,
    onDetailsClick: () -> Unit,
    onDismissClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("shadow_dom_warning_banner"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF230811)),
        border = BorderStroke(1.5.dp, CrimsonPrimary)
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
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.GppBad,
                        contentDescription = "High risk warning",
                        tint = CrimsonAccent,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "SHIELD CONTENT SCRIPT (#shadow-root)",
                        style = MaterialTheme.typography.labelSmall,
                        color = CrimsonAccent
                    )
                }
                Surface(
                    color = Color(0xFF3D0C1B),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = "CSS Isolated",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextPrimary,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Text(
                text = if (language == AppLanguage.BN) {
                    "সতর্কতা: এই পেজটি ঝুঁকিপূর্ণ (${verdict.categoryBn}) — ${verdict.domain}"
                } else {
                    "High-Risk Page Detected: ${verdict.categoryEn} (${verdict.domain})"
                },
                style = MaterialTheme.typography.titleSmall,
                color = TextPrimary
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = onDetailsClick,
                    colors = ButtonDefaults.buttonColors(containerColor = CrimsonPrimary),
                    shape = RoundedCornerShape(50),
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp)
                        .testTag("shadow_banner_details_btn")
                ) {
                    Icon(
                        imageVector = Icons.Default.OpenInFull,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Details (warning.html)", style = MaterialTheme.typography.labelLarge)
                }

                OutlinedButton(
                    onClick = onDismissClick,
                    border = BorderStroke(1.dp, CrimsonAccent.copy(alpha = 0.6f)),
                    shape = RoundedCornerShape(50),
                    modifier = Modifier
                        .height(48.dp)
                        .testTag("shadow_banner_dismiss_btn")
                ) {
                    Text("Dismiss", color = TextPrimary, style = MaterialTheme.typography.labelLarge)
                }
            }
        }
    }
}

/**
 * Full-page interstitial for dangerous links (warning.html)
 * Features "Go back" (primary) and "Proceed anyway" (secondary, requires a confirmation step).
 */
@Composable
fun DangerousLinkInterstitialOverlay(
    verdict: ScanVerdict,
    language: AppLanguage,
    confirmProceedStep: Boolean,
    onGoBackSafe: () -> Unit,
    onProceedAnywayStep: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color(0xFF3B0512), Color(0xFF09090D), Color(0xFF09090D))
                )
            )
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .padding(20.dp)
            .testTag("warning_interstitial_overlay"),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
            border = BorderStroke(1.5.dp, CrimsonPrimary)
        ) {
            Column(
                modifier = Modifier.padding(22.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(68.dp)
                        .clip(CircleShape)
                        .background(CrimsonDarkContainer)
                        .border(2.dp, CrimsonPrimary, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.WarningAmber,
                        contentDescription = "Dangerous link blocked",
                        tint = CrimsonPrimary,
                        modifier = Modifier.size(36.dp)
                    )
                }

                Surface(
                    color = CrimsonDarkContainer,
                    shape = RoundedCornerShape(50)
                ) {
                    Text(
                        text = "SHIELD INTERSTITIAL • warning.html",
                        style = MaterialTheme.typography.labelMedium,
                        color = CrimsonAccent,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                    )
                }

                Text(
                    text = if (language == AppLanguage.BN) {
                        "বিপজ্জনক লিংক ব্লক করা হয়েছে!"
                    } else {
                        "Deceptive & Dangerous Site Ahead"
                    },
                    style = MaterialTheme.typography.headlineMedium,
                    color = TextPrimary
                )

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = Color(0xFF0E0E14),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, ObsidianCardBorder)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "Blocked Target URL:",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextSecondary
                        )
                        Text(
                            text = verdict.targetUrl,
                            style = MaterialTheme.typography.labelMedium,
                            color = CrimsonAccent
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        RiskBadge(riskLevel = verdict.riskLevel, language = language)
                    }
                }

                BilingualExplanationBox(
                    language = language,
                    textEn = verdict.explanationEn,
                    textBn = verdict.explanationBn
                )

                // Primary CTA: Go Back to Safety
                Button(
                    onClick = onGoBackSafe,
                    colors = ButtonDefaults.buttonColors(containerColor = CrimsonPrimary),
                    shape = RoundedCornerShape(50),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .testTag("interstitial_go_back_btn")
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = null
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (language == AppLanguage.BN) {
                            "নিরাপদ পেজে ফিরে যান (Go Back)"
                        } else {
                            "Go back (Recommended)"
                        },
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Secondary CTA: Proceed anyway (with mandatory 2-step confirmation)
                AnimatedVisibility(visible = confirmProceedStep) {
                    Surface(
                        color = AmberWarningContainer,
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, AmberWarning)
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = "Confirmation Step Required",
                                style = MaterialTheme.typography.labelLarge,
                                color = AmberWarning
                            )
                            Text(
                                text = "Are you sure? Proceeding exposes your browser/device to ${verdict.categoryEn}. Tap 'Confirm & Proceed' below only if you understand the risk.",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextPrimary
                            )
                            Text(
                                text = "আপনি কি নিশ্চিত? এগিয়ে গেলে আপনার পাসওয়ার্ড বা ওটিপি চুরি হতে পারে।",
                                style = MaterialTheme.typography.bodySmall,
                                color = CrimsonAccent
                            )
                        }
                    }
                }

                OutlinedButton(
                    onClick = onProceedAnywayStep,
                    border = BorderStroke(
                        1.dp,
                        if (confirmProceedStep) AmberWarning else ObsidianCardBorder
                    ),
                    shape = RoundedCornerShape(50),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("interstitial_proceed_btn")
                ) {
                    Text(
                        text = if (confirmProceedStep) {
                            "Confirm & Proceed Anyway (Unsafe)"
                        } else {
                            "Proceed anyway (Requires confirmation)"
                        },
                        color = if (confirmProceedStep) AmberWarning else TextSecondary,
                        style = MaterialTheme.typography.labelLarge
                    )
                }
            }
        }
    }
}

/**
 * Striped & Glowing Crimson Bar Chart inspired directly by the user's attached reference UI
 */
@Composable
fun TelemetryStripedBarChart(
    days: List<ThreatTelemetryDay>,
    modifier: Modifier = Modifier
) {
    val maxScans = (days.maxOfOrNull { it.scansCount } ?: 50).coerceAtLeast(10)

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(ObsidianSurface)
            .border(1.dp, ObsidianCardBorder, RoundedCornerShape(22.dp))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Threat Telemetry & Guard Hours",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary
                )
                Text(
                    text = "On-device URL, APK & Extension audits (Last 5 days)",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }
            Surface(
                color = ObsidianSurfaceElevated,
                shape = CircleShape,
                border = BorderStroke(1.dp, ObsidianCardBorder)
            ) {
                Text(
                    text = "LIVE",
                    style = MaterialTheme.typography.labelSmall,
                    color = CrimsonAccent,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                )
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(150.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Bottom
        ) {
            // Y-axis labels
            Column(
                modifier = Modifier
                    .fillMaxHeight()
                    .padding(bottom = 22.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                listOf("50", "40", "30", "20", "10").forEach { label ->
                    Text(
                        text = label,
                        style = MaterialTheme.typography.labelSmall,
                        color = TextMuted
                    )
                }
            }

            days.forEach { day ->
                val heightFraction = (day.scansCount.toFloat() / maxScans.toFloat()).coerceIn(0.25f, 1f)
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Bottom
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        contentAlignment = Alignment.BottomCenter
                    ) {
                        Canvas(
                            modifier = Modifier
                                .fillMaxWidth(0.78f)
                                .fillMaxHeight(heightFraction)
                        ) {
                            val cornerRadius = CornerRadius(size.width / 2f, size.width / 2f)
                            if (day.isHighlighted) {
                                drawRoundRect(
                                    brush = Brush.verticalGradient(
                                        colors = listOf(
                                            Color(0xFFFB7185),
                                             CrimsonPrimary,
                                            Color(0xFF4C0519)
                                        )
                                    ),
                                    cornerRadius = cornerRadius
                                )
                            } else {
                                drawRoundRect(
                                    color = Color(0xFF262633),
                                    cornerRadius = cornerRadius
                                )
                                // Diagonal stripes inside non-highlighted bars matching the reference image
                                clipRect {
                                    val step = 14.dp.toPx()
                                    var y = -size.width
                                    while (y < size.height + size.width) {
                                        drawLine(
                                            color = Color(0xFF343446),
                                            start = Offset(0f, y),
                                            end = Offset(size.width, y - size.width * 0.8f),
                                            strokeWidth = 5.dp.toPx(),
                                            pathEffect = PathEffect.cornerPathEffect(4f)
                                        )
                                        y += step
                                    }
                                }
                            }
                        }

                        if (day.isHighlighted || day.threatsBlocked >= 3) {
                            Surface(
                                color = if (day.isHighlighted) Color.White else CrimsonDarkContainer,
                                shape = CircleShape,
                                modifier = Modifier
                                    .align(Alignment.TopCenter)
                                    .padding(top = 6.dp)
                            ) {
                                Text(
                                    text = "${day.threatsBlocked}!",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (day.isHighlighted) CrimsonPrimary else CrimsonAccent,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = day.dayLabel,
                        style = MaterialTheme.typography.labelSmall,
                        color = if (day.isHighlighted) TextPrimary else TextSecondary,
                        fontSize = 10.sp
                    )
                }
            }
        }
    }
}
