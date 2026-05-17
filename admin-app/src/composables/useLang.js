import { ref, computed } from 'vue'

const STORAGE_KEY = 'admin_lang'
const lang = ref(localStorage.getItem(STORAGE_KEY) || 'en')

const translations = {
  en: {
    // Nav
    nav_dashboard:    'Dashboard',
    nav_orders:       'Orders',
    nav_menu:         'Menu',
    nav_counter:      'Scan Customer QR',
    nav_vouchers:     'Vouchers',
    nav_outlets:      'Outlets',
    nav_walkin:       'Walk-in Sales',
    nav_members:      'Members',
    nav_reports:      'Sales Report',
    nav_staff:        'Staff',
    nav_signout:      'Sign out',

    // Common
    loading:          'Loading…',
    save:             'Save',
    cancel:           'Cancel',
    confirm:          'Confirm',
    search:           'Search',
    edit:             'Edit',
    delete:           'Delete',
    close:            'Close',
    open:             'Open',
    all:              'All',
    actions:          'Actions',
    status:           'Status',
    name:             'Name',
    phone:            'Phone',
    role:             'Role',
    outlet:           'Outlet',
    date:             'Date',
    total:            'Total',
    points:           'Points',
    none:             'None',
    active:           'Active',
    inactive:         'Inactive',
    yes:              'Yes',
    no:               'No',

    // Auth
    sign_in:          'Sign In',
    signing_in:       'Signing in…',
    phone_placeholder:'01X-XXXXXXX',
    password:         'Password',
    access_denied:    'Access denied. Staff accounts only.',
    invalid_creds:    'Invalid credentials',

    // Dashboard
    page_dashboard:   'Dashboard',
    sub_dashboard:    'Overview of today\'s activity',
    today_orders:     'Today\'s Orders',
    today_revenue:    'Today\'s Revenue',
    total_members:    'Total Members',
    pending_orders:   'Pending Orders',
    recent_orders:    'Recent Orders',
    no_orders:        'No orders yet today',

    // Orders
    page_orders:      'Orders',
    sub_orders:       'Manage and update order statuses',
    order_no:         'Order No.',
    customer:         'Customer',
    order_date:       'Date',
    no_orders_found:  'No orders found',
    filter_all:       'All',

    // Outlets
    page_outlets:     'Outlets',
    sub_outlets:      'Toggle outlet status and manage operating hours',
    manage_hours:     'Manage hours ▼',
    hide_hours:       'Hide hours ▲',
    apply_selected:   'Apply to selected:',
    save_hours:       'Save Hours',
    saving:           'Saving…',
    hours_saved:      '✓ Hours saved',
    load_hours_fail:  'Failed to load hours',
    save_hours_fail:  'Failed to save hours',
    toggle_fail:      'Failed to update outlet status',
    reason_fail:      'Failed to update reason',
    close_outlet:     'Close outlet?',
    close_confirm:    'Customers will see this outlet as currently unavailable.',
    confirm_close:    'Confirm Close',
    edit_reason:      'Edit close reason',
    save_reason:      'Save Reason',
    close_reason_ph:  'e.g. Public holiday, Staff shortage',
    optional:         '(optional)',
    reason_label:     'Reason',
    batch_all:        'All',
    day_sun: 'Sun', day_mon: 'Mon', day_tue: 'Tue', day_wed: 'Wed',
    day_thu: 'Thu', day_fri: 'Fri', day_sat: 'Sat',
    col_day: 'Day', col_status: 'Status', col_open: 'Open', col_close: 'Close',
    pill_open:   'Open',
    pill_closed: 'Closed',
    status_open:   'OPEN',
    status_closed: 'CLOSED',

    // Members
    page_members:     'Members',
    sub_members:      'View and manage loyalty members',
    add_member:       'Add Member',
    tier:             'Tier',
    member_since:     'Member Since',
    no_members:       'No members found',

    // Staff
    page_staff:       'Staff',
    sub_staff:        'Manage staff accounts',
    add_staff:        'Add Staff',
    deactivate:       'Deactivate',
    reactivate:       'Reactivate',

    // Vouchers
    page_vouchers:    'Vouchers',
    sub_vouchers:     'Manage member vouchers',
    add_voucher:      'Add Voucher',

    // Reports
    page_reports:     'Sales Report',
    sub_reports:      'View and export sales data',
    from_date:        'From',
    to_date:          'To',
    generate:         'Generate',
    export_csv:       'Export CSV',

    // Menu
    page_menu:        'Menu',
    sub_menu:         'Toggle item availability',
    available:        'Available',
    unavailable:      'Unavailable',

    // Counter
    page_counter:     'Scan Customer QR',
    sub_counter:      'Scan or enter phone to credit walk-in points',

    // Walk-in
    page_walkin:      'Walk-in Sales',
    sub_walkin:       'View walk-in point crediting history',

    // Order statuses
    status_pending:   'Pending',
    status_paid:      'Paid',
    status_preparing: 'Preparing',
    status_ready:     'Ready',
    status_completed: 'Completed',
    status_cancelled: 'Cancelled',
  },

  bm: {
    // Nav
    nav_dashboard:    'Papan Pemuka',
    nav_orders:       'Pesanan',
    nav_menu:         'Menu',
    nav_counter:      'Imbas QR Pelanggan',
    nav_vouchers:     'Baucar',
    nav_outlets:      'Cawangan',
    nav_walkin:       'Jualan Walk-in',
    nav_members:      'Ahli',
    nav_reports:      'Laporan Jualan',
    nav_staff:        'Kakitangan',
    nav_signout:      'Log keluar',

    // Common
    loading:          'Memuatkan…',
    save:             'Simpan',
    cancel:           'Batal',
    confirm:          'Sahkan',
    search:           'Cari',
    edit:             'Edit',
    delete:           'Padam',
    close:            'Tutup',
    open:             'Buka',
    all:              'Semua',
    actions:          'Tindakan',
    status:           'Status',
    name:             'Nama',
    phone:            'No. Telefon',
    role:             'Peranan',
    outlet:           'Cawangan',
    date:             'Tarikh',
    total:            'Jumlah',
    points:           'Mata',
    none:             'Tiada',
    active:           'Aktif',
    inactive:         'Tidak Aktif',
    yes:              'Ya',
    no:               'Tidak',

    // Auth
    sign_in:          'Log Masuk',
    signing_in:       'Sedang log masuk…',
    phone_placeholder:'01X-XXXXXXX',
    password:         'Kata Laluan',
    access_denied:    'Akses ditolak. Akaun kakitangan sahaja.',
    invalid_creds:    'Nombor telefon atau kata laluan tidak sah',

    // Dashboard
    page_dashboard:   'Papan Pemuka',
    sub_dashboard:    'Ringkasan aktiviti hari ini',
    today_orders:     'Pesanan Hari Ini',
    today_revenue:    'Hasil Hari Ini',
    total_members:    'Jumlah Ahli',
    pending_orders:   'Pesanan Belum Selesai',
    recent_orders:    'Pesanan Terkini',
    no_orders:        'Tiada pesanan hari ini',

    // Orders
    page_orders:      'Pesanan',
    sub_orders:       'Urus dan kemaskini status pesanan',
    order_no:         'No. Pesanan',
    customer:         'Pelanggan',
    order_date:       'Tarikh',
    no_orders_found:  'Tiada pesanan dijumpai',
    filter_all:       'Semua',

    // Outlets
    page_outlets:     'Cawangan',
    sub_outlets:      'Togol status cawangan dan urus waktu operasi',
    manage_hours:     'Urus waktu operasi ▼',
    hide_hours:       'Sembunyikan waktu ▲',
    apply_selected:   'Guna pada yang dipilih:',
    save_hours:       'Simpan Waktu',
    saving:           'Menyimpan…',
    hours_saved:      '✓ Waktu disimpan',
    load_hours_fail:  'Gagal memuatkan waktu operasi',
    save_hours_fail:  'Gagal menyimpan waktu operasi',
    toggle_fail:      'Gagal mengemaskini status cawangan',
    reason_fail:      'Gagal mengemaskini sebab penutupan',
    close_outlet:     'Tutup cawangan?',
    close_confirm:    'Pelanggan akan melihat cawangan ini sebagai tidak tersedia.',
    confirm_close:    'Sahkan Penutupan',
    edit_reason:      'Edit sebab penutupan',
    save_reason:      'Simpan Sebab',
    close_reason_ph:  'cth. Cuti umum, Kekurangan kakitangan',
    optional:         '(pilihan)',
    reason_label:     'Sebab',
    batch_all:        'Semua',
    day_sun: 'Ahd', day_mon: 'Isn', day_tue: 'Sel', day_wed: 'Rab',
    day_thu: 'Kha', day_fri: 'Jum', day_sat: 'Sab',
    col_day: 'Hari', col_status: 'Status', col_open: 'Buka', col_close: 'Tutup',
    pill_open:   'Buka',
    pill_closed: 'Tutup',
    status_open:   'BUKA',
    status_closed: 'TUTUP',

    // Members
    page_members:     'Ahli',
    sub_members:      'Lihat dan urus ahli kesetiaan',
    add_member:       'Tambah Ahli',
    tier:             'Tahap',
    member_since:     'Ahli Sejak',
    no_members:       'Tiada ahli dijumpai',

    // Staff
    page_staff:       'Kakitangan',
    sub_staff:        'Urus akaun kakitangan',
    add_staff:        'Tambah Kakitangan',
    deactivate:       'Nyahaktifkan',
    reactivate:       'Aktifkan Semula',

    // Vouchers
    page_vouchers:    'Baucar',
    sub_vouchers:     'Urus baucar ahli',
    add_voucher:      'Tambah Baucar',

    // Reports
    page_reports:     'Laporan Jualan',
    sub_reports:      'Lihat dan eksport data jualan',
    from_date:        'Dari',
    to_date:          'Hingga',
    generate:         'Jana',
    export_csv:       'Eksport CSV',

    // Menu
    page_menu:        'Menu',
    sub_menu:         'Togol ketersediaan item',
    available:        'Tersedia',
    unavailable:      'Tidak Tersedia',

    // Counter
    page_counter:     'Imbas QR Pelanggan',
    sub_counter:      'Imbas atau masukkan telefon untuk kreditkan mata',

    // Walk-in
    page_walkin:      'Jualan Walk-in',
    sub_walkin:       'Lihat sejarah pengkreditan mata walk-in',

    // Order statuses
    status_pending:   'Menunggu',
    status_paid:      'Dibayar',
    status_preparing: 'Disediakan',
    status_ready:     'Sedia',
    status_completed: 'Selesai',
    status_cancelled: 'Dibatalkan',
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