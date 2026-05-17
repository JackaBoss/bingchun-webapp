import { ref, computed } from 'vue'

const STORAGE_KEY = 'frontend_lang'
const lang = ref(localStorage.getItem(STORAGE_KEY) || 'en')

const translations = {
  en: {
    // BottomNav
    nav_menu:             'Menu',
    nav_profile:          'Profile',

    // Coming soon banner
    banner_title:         'Online ordering coming very soon!',
    banner_sub:           'Browse our menu below — visit us in-store to order today.',

    // Menu
    loading_menu:         'Loading menu…',
    menu_error:           'Couldn\'t load menu. Try again later.',
    unavailable:          'Unavailable',

    // Profile header
    your_points:          'Your points',
    redeemable:           'redeemable value',
    gold_member:          '🏆 You\'re a Gold member!',

    // QR card
    qr_label:             '📱 My QR Code',
    qr_hint:              'Show this to staff to credit points without typing your number',

    // Points history
    points_history:       'Points history',
    no_transactions:      'No transactions yet',
    no_tx_sub:            'Start ordering to earn points!',

    // Transaction types
    tx_earn:              '⭐ Earned',
    tx_redeem:            '💳 Redeemed',
    tx_expire:            '⏰ Expired',
    tx_adjust:            '✏️ Adjusted',

    // Actions
    logout:               '🚪 Log out',

    // Tier progress
    tier_bronze:          'Bronze',
    tier_silver:          'Silver',
    tier_gold:            'Gold',

    // Login
    login_title:          'Welcome back',
    login_sub:            'Sign in to your Bing Chun account',
    phone:                'Phone Number',
    phone_ph:             '01X-XXXXXXX',
    password:             'Password',
    sign_in:              'Sign In',
    signing_in:           'Signing in…',
    no_account:           'New here?',
    register:             'Register',

    // Register
    register_title:       'Create Account',
    full_name:            'Full Name',
    name_ph:              'Your name',
    otp_sent:             'OTP sent to your number',
    enter_otp:            'Enter OTP',
    verify:               'Verify & Register',
    already_member:       'Already a member?',
    sign_in_link:         'Sign in',

    // Outlet selector
    outlet_amerin:        'Amerin Mall',
    outlet_mantin:        'Mantin',
  },

  bm: {
    // BottomNav
    nav_menu:             'Menu',
    nav_profile:          'Profil',

    // Coming soon banner
    banner_title:         'Pesanan dalam talian akan hadir tidak lama lagi!',
    banner_sub:           'Semak menu kami di bawah — lawati kaunter kami untuk membuat pesanan hari ini.',

    // Menu
    loading_menu:         'Memuatkan menu…',
    menu_error:           'Gagal memuatkan menu. Cuba lagi kemudian.',
    unavailable:          'Tidak Tersedia',

    // Profile header
    your_points:          'Mata anda',
    redeemable:           'nilai boleh ditebus',
    gold_member:          '🏆 Anda ahli Gold!',

    // QR card
    qr_label:             '📱 Kod QR Saya',
    qr_hint:              'Tunjukkan ini kepada kakitangan untuk kreditkan mata tanpa menaip nombor anda',

    // Points history
    points_history:       'Sejarah mata',
    no_transactions:      'Tiada transaksi lagi',
    no_tx_sub:            'Mula membuat pesanan untuk mendapatkan mata!',

    // Transaction types
    tx_earn:              '⭐ Diperoleh',
    tx_redeem:            '💳 Ditebus',
    tx_expire:            '⏰ Tamat',
    tx_adjust:            '✏️ Dilaraskan',

    // Actions
    logout:               '🚪 Log keluar',

    // Tier progress
    tier_bronze:          'Gangsa',
    tier_silver:          'Perak',
    tier_gold:            'Emas',

    // Login
    login_title:          'Selamat kembali',
    login_sub:            'Log masuk ke akaun Bing Chun anda',
    phone:                'No. Telefon',
    phone_ph:             '01X-XXXXXXX',
    password:             'Kata Laluan',
    sign_in:              'Log Masuk',
    signing_in:           'Sedang log masuk…',
    no_account:           'Baru di sini?',
    register:             'Daftar',

    // Register
    register_title:       'Cipta Akaun',
    full_name:            'Nama Penuh',
    name_ph:              'Nama anda',
    otp_sent:             'OTP dihantar ke nombor anda',
    enter_otp:            'Masukkan OTP',
    verify:               'Sahkan & Daftar',
    already_member:       'Sudah ada akaun?',
    sign_in_link:         'Log masuk',

    // Outlet selector
    outlet_amerin:        'Amerin Mall',
    outlet_mantin:        'Mantin',
  },

  zh: {
    // BottomNav
    nav_menu:             '菜单',
    nav_profile:          '我的',

    // Coming soon banner
    banner_title:         '网上点餐即将推出！',
    banner_sub:           '欢迎浏览我们的菜单 — 今天可到门店点餐。',

    // Menu
    loading_menu:         '加载菜单中…',
    menu_error:           '菜单加载失败，请稍后再试。',
    unavailable:          '暂无供应',

    // Profile header
    your_points:          '我的积分',
    redeemable:           '可兑换价值',
    gold_member:          '🏆 您是黄金会员！',

    // QR card
    qr_label:             '📱 我的二维码',
    qr_hint:              '出示给员工扫描，无需输入手机号码即可积分',

    // Points history
    points_history:       '积分记录',
    no_transactions:      '暂无交易记录',
    no_tx_sub:            '开始消费即可赚取积分！',

    // Transaction types
    tx_earn:              '⭐ 获得积分',
    tx_redeem:            '💳 兑换积分',
    tx_expire:            '⏰ 积分过期',
    tx_adjust:            '✏️ 积分调整',

    // Actions
    logout:               '🚪 退出登录',

    // Tier progress
    tier_bronze:          '铜牌',
    tier_silver:          '银牌',
    tier_gold:            '金牌',

    // Login
    login_title:          '欢迎回来',
    login_sub:            '登录您的冰纯账户',
    phone:                '手机号码',
    phone_ph:             '01X-XXXXXXX',
    password:             '密码',
    sign_in:              '登录',
    signing_in:           '登录中…',
    no_account:           '还没有账户？',
    register:             '立即注册',

    // Register
    register_title:       '创建账户',
    full_name:            '全名',
    name_ph:              '您的姓名',
    otp_sent:             '验证码已发送至您的号码',
    enter_otp:            '输入验证码',
    verify:               '验证并注册',
    already_member:       '已有账户？',
    sign_in_link:         '立即登录',

    // Outlet selector
    outlet_amerin:        'Amerin Mall',
    outlet_mantin:        'Mantin',
  },
}

export function useLang() {
  function setLang(l) {
    lang.value = l
    localStorage.setItem(STORAGE_KEY, l)
  }

  const t = computed(() => (key) => translations[lang.value]?.[key] ?? translations.en[key] ?? key)

  return { lang, t, setLang }
}