package com.example.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val ShieldDarkColorScheme = darkColorScheme(
    primary = CrimsonPrimary,
    onPrimary = Color.White,
    primaryContainer = CrimsonDarkContainer,
    onPrimaryContainer = CrimsonAccent,
    secondary = CyberBlueAccent,
    onSecondary = Color(0xFF04131D),
    secondaryContainer = CyberBlueContainer,
    onSecondaryContainer = CyberBlueAccent,
    tertiary = EmeraldSafe,
    onTertiary = Color(0xFF031F17),
    tertiaryContainer = EmeraldSafeContainer,
    onTertiaryContainer = EmeraldSafe,
    background = ObsidianBackground,
    onBackground = TextPrimary,
    surface = ObsidianSurface,
    onSurface = TextPrimary,
    surfaceVariant = ObsidianSurfaceElevated,
    onSurfaceVariant = TextSecondary,
    outline = ObsidianCardBorder,
    error = Color(0xFFEF4444),
    onError = Color.White
)

@Composable
fun MyApplicationTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = ShieldDarkColorScheme,
        typography = Typography,
        content = content
    )
}
