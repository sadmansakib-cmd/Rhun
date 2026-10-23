package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.platform.*
import com.example.ui.components.DangerousLinkInterstitialOverlay
import com.example.ui.screens.*
import com.example.ui.theme.*
import com.example.viewmodel.ShieldScreen
import com.example.viewmodel.ShieldUiState
import com.example.viewmodel.ShieldViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                ShieldAppRoot()
            }
        }
    }
}

@Composable
fun ShieldAppRoot(
    viewModel: ShieldViewModel = viewModel()
) {
    val context = LocalContext.current
    LaunchedEffect(context) {
        viewModel.attachContext(context)
    }

    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // Hardware back-button handling across all secondary screens, modals, and interstitials
    BackHandler(
        enabled = uiState.currentScreen != ShieldScreen.DASHBOARD ||
            uiState.showFullPageInterstitial ||
            uiState.activePermissionExplainer != null ||
            uiState.isCompactPopupMode
    ) {
        viewModel.navigateBack()
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(ObsidianBackground)
    ) {
        val isExpandedScreen = maxWidth >= 700.dp

        // Top crimson atmospheric glow matching the reference cybersecurity design
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(260.dp)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            CrimsonDeepGlow.copy(alpha = 0.65f),
                            ObsidianBackground
                        )
                    )
                )
        )

        Row(modifier = Modifier.fillMaxSize()) {
            if (isExpandedScreen) {
                ShieldNavigationRail(
                    currentScreen = uiState.currentScreen,
                    language = uiState.language,
                    onNavigate = viewModel::navigateTo
                )
            }

            Scaffold(
                containerColor = Color.Transparent,
                contentWindowInsets = WindowInsets.safeDrawing,
                topBar = {
                    ShieldTopHeader(
                        uiState = uiState,
                        onSelectPlatform = viewModel::selectPlatform,
                        onCycleLanguage = viewModel::cycleLanguage
                    )
                },
                bottomBar = {
                    if (!isExpandedScreen) {
                        ShieldFloatingBottomBar(
                            currentScreen = uiState.currentScreen,
                            language = uiState.language,
                            onNavigate = viewModel::navigateTo
                        )
                    }
                }
            ) { innerPadding ->
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(top = innerPadding.calculateTopPadding())
                ) {
                    when (uiState.currentScreen) {
                        ShieldScreen.DASHBOARD -> DashboardScreen(
                            uiState = uiState,
                            onUrlChange = viewModel::updateUrlInput,
                            onCheckUrl = viewModel::checkUrlNow,
                            onDismissShadowBanner = viewModel::dismissShadowDomBanner,
                            onOpenInterstitial = viewModel::openFullPageInterstitial,
                            onNavigate = viewModel::navigateTo,
                            onSelectPlatform = viewModel::selectPlatform,
                            onTogglePopupMode = { viewModel.toggleCompactPopupMode() }
                        )

                        ShieldScreen.APPS_AUDIT -> AppsAuditScreen(
                            uiState = uiState,
                            onSelectFilter = viewModel::setAppAuditFilter,
                            onOpenPermissionExplainer = viewModel::openPermissionExplainer,
                            onClosePermissionExplainer = viewModel::closePermissionExplainer,
                            onTogglePermissionExplainer = viewModel::togglePermissionExplainerStatus,
                            onSwitchPlatform = viewModel::selectPlatform
                        )

                        ShieldScreen.MONITORS_SCAN -> MonitorsAndScanScreen(
                            uiState = uiState,
                            onSimulatePhishingNotif = viewModel::simulateIncomingPhishingNotification,
                            onDismissNotification = viewModel::dismissNotificationAlert,
                            onInspectUrlFromNotification = { url ->
                                viewModel.checkUrlNow(url)
                                viewModel.openFullPageInterstitial()
                            },
                            onUpdateScanInterval = viewModel::updateScanInterval,
                            onToggleScanOption = viewModel::toggleScheduledScanOption,
                            onTriggerManualScan = viewModel::triggerManualBackgroundScan,
                            onSwitchPlatform = viewModel::selectPlatform
                        )

                        ShieldScreen.EXTENSIONS_AUDIT -> ExtensionAuditScreen(
                            uiState = uiState,
                            onToggleExtensionEnabled = viewModel::toggleExtensionEnabled,
                            onOpenOptionalPermissionDialog = viewModel::openOptionalPermissionExplainerDialog,
                            onCloseOptionalPermissionDialog = viewModel::closeOptionalPermissionExplainerDialog,
                            onSetOptionalAllUrlsPermission = viewModel::setOptionalAllUrlsPermission,
                            onSwitchPlatform = viewModel::selectPlatform
                        )

                        ShieldScreen.PLATFORM_DOCS -> PlatformDocsScreen(
                            uiState = uiState,
                            onSelectPlatform = viewModel::selectPlatform,
                            onTogglePopupMode = {
                                viewModel.toggleCompactPopupMode(true)
                                viewModel.navigateTo(ShieldScreen.DASHBOARD)
                            }
                        )
                    }
                }
            }
        }

        // Full-page dangerous link interstitial overlay (warning.html)
        if (uiState.showFullPageInterstitial) {
            DangerousLinkInterstitialOverlay(
                verdict = uiState.currentVerdict,
                language = uiState.language,
                confirmProceedStep = uiState.interstitialConfirmProceedStep,
                onGoBackSafe = viewModel::closeInterstitialSafe,
                onProceedAnywayStep = viewModel::requestInterstitialProceedStep
            )
        }
    }
}

@Composable
private fun ShieldTopHeader(
    uiState: ShieldUiState,
    onSelectPlatform: (PlatformId) -> Unit,
    onCycleLanguage: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(CrimsonPrimary)
                        .border(1.5.dp, CrimsonAccent, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Security,
                        contentDescription = "Shield Security Icon",
                        tint = Color.White,
                        modifier = Modifier.size(22.dp)
                    )
                }
                Column {
                    Text(
                        text = "Shield Security",
                        style = MaterialTheme.typography.titleLarge,
                        color = TextPrimary
                    )
                    Text(
                        text = "${uiState.selectedPlatform.titleEn} • ${uiState.selectedPlatform.titleBn}",
                        style = MaterialTheme.typography.labelSmall,
                        color = CrimsonAccent
                    )
                }
            }

            // Bilingual Language Switcher Pill
            Surface(
                color = ObsidianSurfaceElevated,
                shape = RoundedCornerShape(50),
                border = BorderStroke(1.dp, CrimsonPrimary.copy(alpha = 0.6f)),
                modifier = Modifier
                    .clickable { onCycleLanguage() }
                    .testTag("language_switcher_btn")
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Translate,
                        contentDescription = "Switch Language",
                        tint = CrimsonAccent,
                        modifier = Modifier.size(15.dp)
                    )
                    Text(
                        text = uiState.language.label,
                        style = MaterialTheme.typography.labelLarge,
                        color = TextPrimary
                    )
                }
            }
        }

        // Platform Target Switcher Bar (Android / Chrome Extension MV3 / Web PWA)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            PlatformId.entries.forEach { platform ->
                val isSelected = uiState.selectedPlatform == platform
                Surface(
                    color = if (isSelected) CrimsonPrimary else ObsidianSurface.copy(alpha = 0.85f),
                    shape = RoundedCornerShape(50),
                    border = BorderStroke(
                        1.dp,
                        if (isSelected) CrimsonAccent else ObsidianCardBorder
                    ),
                    modifier = Modifier
                        .clickable { onSelectPlatform(platform) }
                        .testTag("header_platform_${platform.rawId}")
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = when (platform) {
                                PlatformId.ANDROID -> Icons.Default.PhoneAndroid
                                PlatformId.CHROME_EXT -> Icons.Default.Extension
                                PlatformId.WEB -> Icons.Default.Public
                            },
                            contentDescription = null,
                            tint = if (isSelected) Color.White else TextSecondary,
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = platform.badgeLabel,
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isSelected) Color.White else TextSecondary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

/**
 * Floating dark pill bottom navigation bar inspired by the user's attached reference UI
 */
@Composable
private fun ShieldFloatingBottomBar(
    currentScreen: ShieldScreen,
    language: AppLanguage,
    onNavigate: (ShieldScreen) -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.navigationBars)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            color = Color(0xFF14141D).copy(alpha = 0.96f),
            shape = RoundedCornerShape(50),
            border = BorderStroke(1.dp, Color(0xFF2D2736)),
            tonalElevation = 8.dp,
            modifier = Modifier
                .fillMaxWidth()
                .testTag("bottom_navigation_bar")
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                ShieldScreen.entries.forEach { screen ->
                    val selected = currentScreen == screen
                    val (filledIcon, outlinedIcon) = screenIcons(screen)
                    Surface(
                        color = if (selected) Color(0xFF252533) else Color.Transparent,
                        shape = RoundedCornerShape(50),
                        modifier = Modifier
                            .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                            .clip(RoundedCornerShape(50))
                            .clickable { onNavigate(screen) }
                            .testTag("nav_tab_${screen.route}")
                    ) {
                        Row(
                            modifier = Modifier.padding(
                                horizontal = if (selected) 14.dp else 10.dp,
                                vertical = 10.dp
                            ),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = if (selected) filledIcon else outlinedIcon,
                                contentDescription = screen.labelEn,
                                tint = if (selected) Color.White else TextSecondary,
                                modifier = Modifier.size(20.dp)
                            )
                            if (selected) {
                                Text(
                                    text = if (language == AppLanguage.BN) screen.labelBn else screen.labelEn,
                                    style = MaterialTheme.typography.labelLarge,
                                    color = Color.White
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
private fun ShieldNavigationRail(
    currentScreen: ShieldScreen,
    language: AppLanguage,
    onNavigate: (ShieldScreen) -> Unit
) {
    NavigationRail(
        containerColor = ObsidianSurface,
        contentColor = TextPrimary,
        modifier = Modifier.windowInsetsPadding(WindowInsets.safeDrawing)
    ) {
        Spacer(modifier = Modifier.height(12.dp))
        ShieldScreen.entries.forEach { screen ->
            val selected = currentScreen == screen
            val (filledIcon, outlinedIcon) = screenIcons(screen)
            NavigationRailItem(
                selected = selected,
                onClick = { onNavigate(screen) },
                icon = {
                    Icon(
                        imageVector = if (selected) filledIcon else outlinedIcon,
                        contentDescription = screen.labelEn
                    )
                },
                label = {
                    Text(
                        text = if (language == AppLanguage.BN) screen.labelBn else screen.labelEn,
                        style = MaterialTheme.typography.labelSmall
                    )
                },
                colors = NavigationRailItemDefaults.colors(
                    selectedIconColor = Color.White,
                    selectedTextColor = CrimsonAccent,
                    indicatorColor = CrimsonPrimary
                ),
                modifier = Modifier.testTag("rail_tab_${screen.route}")
            )
        }
    }
}

private fun screenIcons(screen: ShieldScreen): Pair<ImageVector, ImageVector> = when (screen) {
    ShieldScreen.DASHBOARD -> Icons.Filled.Home to Icons.Outlined.Home
    ShieldScreen.APPS_AUDIT -> Icons.Filled.Android to Icons.Outlined.Android
    ShieldScreen.MONITORS_SCAN -> Icons.Filled.NotificationsActive to Icons.Outlined.Notifications
    ShieldScreen.EXTENSIONS_AUDIT -> Icons.Filled.Extension to Icons.Outlined.Extension
    ShieldScreen.PLATFORM_DOCS -> Icons.Filled.Layers to Icons.Outlined.Layers
}
