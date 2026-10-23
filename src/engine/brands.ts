/**
 * Curated brand dictionary for typosquatting and spoofing detection.
 * Includes major Bangladeshi financial/e-commerce brands and global services.
 * Keep this file editable for expanding protected brand targets.
 */

export interface ProtectedBrand {
  name: string;
  category: 'mfs' | 'bank' | 'ecommerce' | 'social' | 'tech' | 'crypto';
  officialDomains: string[];
  keywords: string[];
}

export const PROTECTED_BRANDS: ProtectedBrand[] = [
  // Bangladeshi Mobile Financial Services (MFS)
  {
    name: 'bKash',
    category: 'mfs',
    officialDomains: ['bkash.com', 'www.bkash.com'],
    keywords: ['bkash', 'bkaash', 'bikash', 'bksh']
  },
  {
    name: 'Nagad',
    category: 'mfs',
    officialDomains: ['nagad.com.bd', 'www.nagad.com.bd'],
    keywords: ['nagad', 'nogod', 'naagad']
  },
  {
    name: 'Rocket',
    category: 'mfs',
    officialDomains: ['dutchbanglabank.com', 'rocket.com.bd'],
    keywords: ['rocket', 'dbblrocket']
  },
  {
    name: 'Upay',
    category: 'mfs',
    officialDomains: ['upaybd.com', 'www.upaybd.com'],
    keywords: ['upay', 'upaybd']
  },
  {
    name: 'Cellfin',
    category: 'bank',
    officialDomains: ['ibbl.com.bd', 'cellfin.com.bd'],
    keywords: ['cellfin', 'celfin']
  },

  // Bangladeshi Banks
  {
    name: 'Islami Bank Bangladesh',
    category: 'bank',
    officialDomains: ['islamibankbd.com', 'ibbl.com.bd'],
    keywords: ['islamibank', 'ibbl']
  },
  {
    name: 'BRAC Bank',
    category: 'bank',
    officialDomains: ['bracbank.com'],
    keywords: ['bracbank', 'brac-bank']
  },
  {
    name: 'City Bank',
    category: 'bank',
    officialDomains: ['thecitybank.com', 'citytouch.com.bd'],
    keywords: ['citybank', 'citytouch']
  },
  {
    name: 'Eastern Bank (EBL)',
    category: 'bank',
    officialDomains: ['ebl.com.bd'],
    keywords: ['eblbank', 'easternbank']
  },
  {
    name: 'Dutch-Bangla Bank (DBBL)',
    category: 'bank',
    officialDomains: ['dutchbanglabank.com'],
    keywords: ['dbbl', 'dutchbangla']
  },
  {
    name: 'Sonali Bank',
    category: 'bank',
    officialDomains: ['sonalibank.com.bd'],
    keywords: ['sonalibank', 'sonalipay']
  },

  // Bangladeshi E-commerce & Portals
  {
    name: 'Daraz',
    category: 'ecommerce',
    officialDomains: ['daraz.com.bd', 'daraz.com'],
    keywords: ['daraz', 'darazbd']
  },
  {
    name: 'Chaldal',
    category: 'ecommerce',
    officialDomains: ['chaldal.com'],
    keywords: ['chaldal']
  },
  {
    name: 'Bikroy',
    category: 'ecommerce',
    officialDomains: ['bikroy.com'],
    keywords: ['bikroy']
  },

  // Global Tech & Social Brands
  {
    name: 'Google',
    category: 'tech',
    officialDomains: ['google.com', 'google.com.bd', 'accounts.google.com'],
    keywords: ['google', 'gmail', 'googleaccount']
  },
  {
    name: 'Facebook',
    category: 'social',
    officialDomains: ['facebook.com', 'fb.com', 'm.facebook.com'],
    keywords: ['facebook', 'faceb00k', 'facebok']
  },
  {
    name: 'WhatsApp',
    category: 'social',
    officialDomains: ['whatsapp.com', 'web.whatsapp.com'],
    keywords: ['whatsapp', 'whatsap', 'watsapp']
  },
  {
    name: 'Telegram',
    category: 'social',
    officialDomains: ['telegram.org', 't.me', 'web.telegram.org'],
    keywords: ['telegram', 'telegrm']
  },
  {
    name: 'Microsoft',
    category: 'tech',
    officialDomains: ['microsoft.com', 'live.com', 'outlook.com', 'office.com'],
    keywords: ['microsoft', 'outlook', 'office365']
  },
  {
    name: 'Apple',
    category: 'tech',
    officialDomains: ['apple.com', 'icloud.com'],
    keywords: ['apple', 'icloud', 'appleid']
  },
  {
    name: 'Binance',
    category: 'crypto',
    officialDomains: ['binance.com'],
    keywords: ['binance', 'binancepay']
  },
  {
    name: 'PayPal',
    category: 'mfs',
    officialDomains: ['paypal.com'],
    keywords: ['paypal']
  },
  {
    name: 'Netflix',
    category: 'tech',
    officialDomains: ['netflix.com'],
    keywords: ['netflix']
  }
];
