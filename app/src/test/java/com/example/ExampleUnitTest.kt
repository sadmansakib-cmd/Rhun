package com.example

import com.example.platform.*
import org.junit.Assert.*
import org.junit.Test

class ExampleUnitTest {
    @Test
    fun platformAdapters_exposeExpectedCapabilities() {
        val android = AndroidPlatformAdapter()
        val chrome = ChromeExtPlatformAdapter()
        val web = WebPlatformAdapter()

        assertEquals(PlatformId.ANDROID, android.id)
        assertTrue(android.capabilities.installedAppsAudit)
        assertTrue(android.capabilities.notificationMonitor)
        assertFalse(android.capabilities.installedExtensionsAudit)

        assertEquals(PlatformId.CHROME_EXT, chrome.id)
        assertTrue(chrome.capabilities.installedExtensionsAudit)
        assertFalse(chrome.capabilities.installedAppsAudit)

        assertEquals(PlatformId.WEB, web.id)
        assertTrue(web.capabilities.currentTabCheck)
        assertFalse(web.capabilities.installedAppsAudit)
        assertFalse(web.capabilities.installedExtensionsAudit)
    }

    @Test
    fun scanVerdictService_flagsPhishingAndSafeDomainsCorrectly() {
        val phishing = ShieldScanVerdictService.evaluateUrl("https://bkash-reward-claim.top/login")
        assertEquals(RiskLevel.HIGH, phishing.riskLevel)
        assertTrue(phishing.triggersShadowBanner)
        assertTrue(phishing.triggersFullInterstitial)

        val safe = ShieldScanVerdictService.evaluateUrl("https://developer.android.com/security")
        assertEquals(RiskLevel.SAFE, safe.riskLevel)
        assertFalse(safe.triggersShadowBanner)
        assertFalse(safe.triggersFullInterstitial)
    }
}
