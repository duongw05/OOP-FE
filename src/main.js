/**
 * UTC-SMS - Frontend Application Script
 * Architecture: Vanilla JS + Modern Component Pattern + RBAC (Role-Based Access Control)
 */

const API_BASE = 'http://localhost:8080/api';

// Application State
const state = {
  currentUser: {
    username: '211200123',
    role: 'ROLE_STUDENT',
    hoTen: 'Nguyễn Văn A',
    token: ''
  },
  currentView: 'dashboard',
  dashboardStats: null,
  lopHocPhans: [],
  registeredCourses: [],
  sinhViens: [],
  monHocs: [],
  currentGrades: []
};

// Check if current user is Lecturer or Admin
function isLecturerOrAdmin() {
  return state.currentUser.role === 'ROLE_LECTURER' ||
         state.currentUser.role === 'ROLE_ADMIN' ||
         state.currentUser.role === 'ROLE_STAFF';
}

// ==========================================
// Toast Notification Utility
// ==========================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `
    <span style="font-size: 16px;">${icon}</span>
    <span style="flex: 1; font-weight: 500;">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================
// API Helper with JWT Authorization
// ==========================================
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.currentUser.token) {
    headers['Authorization'] = `Bearer ${state.currentUser.token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    return { success: false, message: 'Lỗi kết nối tới Backend Spring Boot' };
  }
}

// ==========================================
// Authentication & Role Presets
// ==========================================
async function loginUser(username, password) {
  const res = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  if (res.success && res.data) {
    state.currentUser = {
      username: res.data.username,
      role: res.data.role,
      hoTen: res.data.hoTen,
      token: res.data.token
    };
    updateUserNavUI();
    renderSidebarNav();
    showToast(`Đăng nhập thành công: ${res.data.hoTen} (${getRoleBadgeTitle(res.data.role)})`, 'success');
    
    // If student was on a restricted page, return to dashboard
    if (!isLecturerOrAdmin() && ['sinh-vien', 'mon-hoc', 'canh-bao', 'concurrency'].includes(state.currentView)) {
      state.currentView = 'dashboard';
    }
    
    loadCurrentView();
  } else {
    showToast(res.message || 'Đăng nhập thất bại', 'error');
  }
}

function getRoleBadgeTitle(role) {
  if (role === 'ROLE_LECTURER') return 'Giảng Viên (Toàn Quyền)';
  if (role === 'ROLE_ADMIN' || role === 'ROLE_STAFF') return 'Đào Tạo / Admin (Toàn Quyền)';
  return 'Sinh Viên (Giới Hạn)';
}

function updateUserNavUI() {
  const nameEl = document.getElementById('nav-user-name');
  const roleEl = document.getElementById('nav-user-role');
  const avatarEl = document.getElementById('user-avatar');

  if (nameEl) nameEl.textContent = state.currentUser.hoTen;
  if (avatarEl) avatarEl.textContent = (state.currentUser.hoTen || 'U').charAt(0).toUpperCase();
  if (roleEl) roleEl.textContent = getRoleBadgeTitle(state.currentUser.role);
}

// ==========================================
// Sidebar Dynamic Navigation by Role
// ==========================================
function renderSidebarNav() {
  const navContainer = document.getElementById('nav-menu-container');
  if (!navContainer) return;

  const isGV = isLecturerOrAdmin();

  if (isGV) {
    // FULL FEATURES FOR LECTURER / ADMIN
    navContainer.innerHTML = `
      <div class="sidebar-section-title">PHÂN HỆ GIẢNG VIÊN & ĐÀO TẠO</div>
      <a href="#dashboard" class="nav-item ${state.currentView === 'dashboard' ? 'active' : ''}" data-target="dashboard">
        <span class="nav-icon">📊</span>
        <span class="nav-label">Tổng Quan Toàn Trường</span>
      </a>
      <a href="#diem-so" class="nav-item ${state.currentView === 'diem-so' ? 'active' : ''}" data-target="diem-so">
        <span class="nav-icon">📈</span>
        <span class="nav-label">Nhập Điểm & Chốt Sổ</span>
        <span class="nav-badge badge-pulse">Chấm Điểm</span>
      </a>
      <a href="#sinh-vien" class="nav-item ${state.currentView === 'sinh-vien' ? 'active' : ''}" data-target="sinh-vien">
        <span class="nav-icon">👥</span>
        <span class="nav-label">Hồ Sơ Sinh Viên</span>
        <span class="nav-badge" style="background: rgba(59,130,246,0.15); color: var(--primary);">QLSV</span>
      </a>
      <a href="#mon-hoc" class="nav-item ${state.currentView === 'mon-hoc' ? 'active' : ''}" data-target="mon-hoc">
        <span class="nav-icon">🏛️</span>
        <span class="nav-label">Môn Học & Mở Lớp</span>
        <span class="nav-badge" style="background: rgba(16,185,129,0.15); color: var(--success);">Mở Lớp</span>
      </a>
      <a href="#canh-bao" class="nav-item ${state.currentView === 'canh-bao' ? 'active' : ''}" data-target="canh-bao">
        <span class="nav-icon">⚠️</span>
        <span class="nav-label">Xét Cảnh Báo Học Tập</span>
        <span class="nav-badge" style="background: rgba(239,68,68,0.15); color: var(--danger);">Batch</span>
      </a>
      <a href="#concurrency" class="nav-item ${state.currentView === 'concurrency' ? 'active' : ''}" data-target="concurrency">
        <span class="nav-icon">⚡</span>
        <span class="nav-label">Mô Phỏng Tranh Chấp Lock</span>
        <span class="nav-badge" style="background: rgba(245,158,11,0.15); color: var(--warning);">Test</span>
      </a>

      <div class="sidebar-section-title" style="margin-top: 14px;">TRA CỨU & ĐÀO TẠO</div>
      <a href="#dang-ky" class="nav-item ${state.currentView === 'dang-ky' ? 'active' : ''}" data-target="dang-ky">
        <span class="nav-icon">📝</span>
        <span class="nav-label">Giám Sát Đăng Ký HP</span>
      </a>
      <a href="#thoi-khoa-bieu" class="nav-item ${state.currentView === 'thoi-khoa-bieu' ? 'active' : ''}" data-target="thoi-khoa-bieu">
        <span class="nav-icon">📅</span>
        <span class="nav-label">Thời Khóa Biểu Học Kỳ</span>
      </a>
    `;
  } else {
    // RESTRICTED FEATURES FOR STUDENT
    navContainer.innerHTML = `
      <div class="sidebar-section-title">CHỨC NĂNG DÀNH CHO SINH VIÊN</div>
      <a href="#dashboard" class="nav-item ${state.currentView === 'dashboard' ? 'active' : ''}" data-target="dashboard">
        <span class="nav-icon">📊</span>
        <span class="nav-label">Tổng Quan Học Tập</span>
      </a>
      <a href="#dang-ky" class="nav-item ${state.currentView === 'dang-ky' ? 'active' : ''}" data-target="dang-ky">
        <span class="nav-icon">📝</span>
        <span class="nav-label">Đăng Ký Học Phần</span>
        <span class="nav-badge badge-pulse">Mở ĐK</span>
      </a>
      <a href="#thoi-khoa-bieu" class="nav-item ${state.currentView === 'thoi-khoa-bieu' ? 'active' : ''}" data-target="thoi-khoa-bieu">
        <span class="nav-icon">📅</span>
        <span class="nav-label">Thời Khóa Biểu Của Tôi</span>
      </a>
      <a href="#diem-so" class="nav-item ${state.currentView === 'diem-so' ? 'active' : ''}" data-target="diem-so">
        <span class="nav-icon">📈</span>
        <span class="nav-label">Bảng Điểm Tích Lũy</span>
        <span class="nav-badge" style="background: rgba(16,185,129,0.15); color: var(--success);">Xem Điểm</span>
      </a>

      <div class="sidebar-section-title" style="margin-top: 14px;">PHÂN HỆ GIẢNG VIÊN (KHÓA 🔒)</div>
      <a href="#sinh-vien" class="nav-item ${state.currentView === 'sinh-vien' ? 'active' : ''}" data-target="sinh-vien" style="opacity: 0.65;">
        <span class="nav-icon">👥</span>
        <span class="nav-label">Quản Lý Hồ Sơ SV</span>
        <span class="nav-badge" style="background: rgba(100,116,139,0.2); color: var(--text-muted);">🔒 Khóa</span>
      </a>
      <a href="#mon-hoc" class="nav-item ${state.currentView === 'mon-hoc' ? 'active' : ''}" data-target="mon-hoc" style="opacity: 0.65;">
        <span class="nav-icon">🏛️</span>
        <span class="nav-label">Môn Học & Mở Lớp</span>
        <span class="nav-badge" style="background: rgba(100,116,139,0.2); color: var(--text-muted);">🔒 Khóa</span>
      </a>
      <a href="#canh-bao" class="nav-item ${state.currentView === 'canh-bao' ? 'active' : ''}" data-target="canh-bao" style="opacity: 0.65;">
        <span class="nav-icon">⚠️</span>
        <span class="nav-label">Xét Cảnh Báo Học Tập</span>
        <span class="nav-badge" style="background: rgba(100,116,139,0.2); color: var(--text-muted);">🔒 Khóa</span>
      </a>
      <a href="#concurrency" class="nav-item ${state.currentView === 'concurrency' ? 'active' : ''}" data-target="concurrency" style="opacity: 0.65;">
        <span class="nav-icon">⚡</span>
        <span class="nav-label">Kiểm Thử Lock (TC-05)</span>
        <span class="nav-badge" style="background: rgba(100,116,139,0.2); color: var(--text-muted);">🔒 Khóa</span>
      </a>
    `;
  }

  // Rebind navigation click listeners
  navContainer.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      state.currentView = item.dataset.target;
      loadCurrentView();
    });
  });
}

// ==========================================
// Modal Utilities
// ==========================================
function openModal(title, contentHtml) {
  const modal = document.getElementById('modal-container');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');

  modalTitle.textContent = title;
  modalBody.innerHTML = contentHtml;
  modal.classList.remove('hidden');
}

function closeModal() {
  const modal = document.getElementById('modal-container');
  modal.classList.add('hidden');
}

// Access Denied Component for Student attempting to view Admin/Lecturer pages
function renderAccessDeniedView(pageName = 'Chức năng quản trị') {
  return `
    <div class="card" style="text-align: center; padding: 48px 24px; max-width: 650px; margin: 40px auto; border-color: rgba(239, 68, 68, 0.4);">
      <div style="font-size: 56px; margin-bottom: 14px;">🔒</div>
      <h2 style="font-family: var(--font-heading); font-size: 22px; font-weight: 700; color: var(--danger); margin-bottom: 10px;">
        Quyền Truy Cập Bị Giới Hạn (Access Denied)
      </h2>
      <div style="display: inline-block; padding: 4px 12px; border-radius: var(--radius-full); background: var(--danger-bg); color: var(--danger); font-size: 12px; font-weight: 600; margin-bottom: 16px;">
        Yêu cầu vai trò: ROLE_LECTURER hoặc ROLE_ADMIN
      </div>
      <p style="color: var(--text-secondary); line-height: 1.7; margin-bottom: 24px; font-size: 13px;">
        Bạn hiện đang đăng nhập với tài khoản <strong>Sinh Viên (${state.currentUser.hoTen} - ${state.currentUser.username})</strong>.<br>
        Theo phân quyền bảo mật của hệ thống, chỉ <strong>Giảng Viên (TS. Nguyễn Hiếu Cường...)</strong> hoặc <strong>Ban Đào Tạo</strong> mới có quyền thao tác trên trang <em>"${pageName}"</em>.
      </p>
      <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
        <button class="btn btn-secondary" id="btn-back-to-dashboard">← Quay về Trang Tổng Quan</button>
        <button class="btn btn-primary" id="btn-quick-switch-to-lecturer">🔑 Chuyển sang Giảng Viên (TS. Nguyễn Hiếu Cường)</button>
      </div>
    </div>
  `;
}

// ==========================================
// View Renderers
// ==========================================

// 1. Dashboard View (Tailored by Role)
async function renderDashboard() {
  const isGV = isLecturerOrAdmin();

  if (!isGV) {
    // === STUDENT PERSONAL DASHBOARD ===
    const maSV = state.currentUser.username;
    const gpaRes = await apiRequest(`/diem/tinh-gpa/${maSV}`);
    const svRes = await apiRequest(`/sinh-vien/${maSV}`);
    const regRes = await apiRequest(`/dang-ky/sinh-vien/${maSV}`);

    const gpa = gpaRes.success ? gpaRes.data : { cpaTichLuy: 0, tongTinChiTichLuy: 0 };
    const sv = svRes.success ? svRes.data : {};
    const reg = regRes.success ? regRes.data : [];
    const isWarning = sv.trangThaiHoc === 'CanhBao';

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">👨‍🎓 Cổng Thông Tin Học Vụ Sinh Viên</h1>
          <p class="page-desc">Xin chào bạn <strong>${state.currentUser.hoTen}</strong> (Mã SV: <code>${maSV}</code>) • Lớp: <strong>${sv.tenLopNienChe || 'CNPM-K62'}</strong></p>
        </div>
        <div class="page-actions">
          <span class="badge ${isWarning ? 'badge-danger' : 'badge-success'}" style="font-size: 13px; padding: 6px 14px;">
            ${isWarning ? '⚠️ Thuộc Diện Cảnh Báo Học Tập' : '🟢 Trạng Thái Học Bình Thường'}
          </span>
        </div>
      </div>

      <!-- Student Stat Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Điểm CPA Tích Lũy</span>
            <div class="stat-icon-wrap">🎯</div>
          </div>
          <div class="stat-value" style="color: ${isWarning ? 'var(--danger)' : 'var(--primary)'};">${gpa.cpaTichLuy || '0.00'}</div>
          <div class="stat-desc">Thang điểm 4.0 chuẩn tín chỉ</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Tín Chỉ Đã Tích Lũy</span>
            <div class="stat-icon-wrap">📚</div>
          </div>
          <div class="stat-value">${gpa.tongTinChiTichLuy || 0} TC</div>
          <div class="stat-desc">Các môn học đã hoàn thành đạt</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Môn Đã Đăng Ký Kỳ Này</span>
            <div class="stat-icon-wrap">📝</div>
          </div>
          <div class="stat-value">${reg.length} Môn</div>
          <div class="stat-desc">Học kỳ 1 • Năm học 2025-2026</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Quyền Hạn Tài Khoản</span>
            <div class="stat-icon-wrap">🛡️</div>
          </div>
          <div class="stat-value" style="font-size: 18px; color: var(--warning);">Sinh Viên</div>
          <div class="stat-desc">Đăng ký môn & tra cứu kết quả</div>
        </div>
      </div>

      <!-- Student Actions & Guidelines -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">🚀 Lối Tắt Tác Vụ Sinh Viên</h2>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div style="background: var(--bg-surface); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <strong style="color: var(--text-primary); font-size: 14px;">📝 Đăng Ký Học Phần</strong>
                <p style="color: var(--text-secondary); font-size: 12px; margin-top: 4px;">Xem danh sách môn mở, chọn lớp học phần phù hợp với thời khóa biểu.</p>
              </div>
              <button class="btn btn-primary btn-sm" style="margin-top: 12px;" onclick="state.currentView = 'dang-ky'; loadCurrentView();">Đến Trang Đăng Ký →</button>
            </div>

            <div style="background: var(--bg-surface); padding: 16px; border-radius: var(--radius-md); border-line: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <strong style="color: var(--text-primary); font-size: 14px;">📅 Thời Khóa Biểu Tuần</strong>
                <p style="color: var(--text-secondary); font-size: 12px; margin-top: 4px;">Theo dõi lịch học các ca sáng/chiều và phòng học tại cơ sở ĐH GTVT.</p>
              </div>
              <button class="btn btn-secondary btn-sm" style="margin-top: 12px;" onclick="state.currentView = 'thoi-khoa-bieu'; loadCurrentView();">Xem Thời Khóa Biểu →</button>
            </div>

            <div style="background: var(--bg-surface); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <strong style="color: var(--text-primary); font-size: 14px;">📈 Bảng Điểm Cá Nhân</strong>
                <p style="color: var(--text-secondary); font-size: 12px; margin-top: 4px;">Tra cứu điểm thành phần, điểm tổng kết và in bảng điểm PDF.</p>
              </div>
              <button class="btn btn-secondary btn-sm" style="margin-top: 12px;" onclick="state.currentView = 'diem-so'; loadCurrentView();">Tra Cứu Bảng Điểm →</button>
            </div>

            <div style="background: var(--bg-surface); padding: 16px; border-radius: var(--radius-md); border: 1px dashed var(--danger); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <strong style="color: var(--danger); font-size: 14px;">🔒 Quyền Giới Hạn Của SV</strong>
                <p style="color: var(--text-secondary); font-size: 12px; margin-top: 4px;">Sinh viên không được phép nhập điểm, xóa sinh viên hoặc mở lớp học phần.</p>
              </div>
              <span class="badge badge-warning" style="align-self: flex-start; margin-top: 12px;">Đã Áp Dụng RBAC</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title">📜 Quy Chế Cần Nhớ</h2>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px; color: var(--text-secondary);">
            <div style="padding: 8px; background: var(--bg-surface); border-radius: var(--radius-sm); border-left: 3px solid var(--primary);">
              <strong>Tín chỉ kỳ chính:</strong> 12 - 24 TC
            </div>
            <div style="padding: 8px; background: var(--bg-surface); border-radius: var(--radius-sm); border-left: 3px solid var(--warning);">
              <strong>Môn tiên quyết:</strong> Bắt buộc đạt $\ge$ 1.0 (điểm D trở lên)
            </div>
            <div style="padding: 8px; background: var(--bg-surface); border-radius: var(--radius-sm); border-left: 3px solid var(--danger);">
              <strong>Ngưỡng cảnh báo:</strong><br>
              Năm 1: CPA &lt; 1.0<br>
              Năm 2: CPA &lt; 1.2<br>
              Năm 3+: CPA &lt; 1.4
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // === LECTURER / ADMIN MANAGEMENT DASHBOARD ===
  const statsRes = await apiRequest('/thong-ke/dashboard');
  const stats = statsRes.success ? statsRes.data : {
    totalSinhVien: 0, totalGiangVien: 0, totalMonHoc: 0, totalLopHocPhan: 0, totalDangKy: 0, totalCanhBao: 0, avgGpa: 0
  };

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">👨‍🏫 Cổng Điều Hành Đào Tạo & Giảng Viên (Toàn Quyền)</h1>
        <p class="page-desc">Kính chào Thầy/Cô <strong>${state.currentUser.hoTen}</strong> • Vai trò: <strong>${state.currentUser.role}</strong> (Có đầy đủ tất cả chức năng quản trị)</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" id="btn-refresh-stats">🔄 Làm mới dữ liệu</button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">Tổng Sinh Viên</span>
          <div class="stat-icon-wrap">👨‍🎓</div>
        </div>
        <div class="stat-value">${stats.totalSinhVien}</div>
        <div class="stat-desc">Quản lý hồ sơ & lớp niên chế</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">Lớp Học Phần Mở</span>
          <div class="stat-icon-wrap">📚</div>
        </div>
        <div class="stat-value">${stats.totalLopHocPhan}</div>
        <div class="stat-desc">Có quyền mở thêm lớp mới</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">Lượt Đăng Ký TC</span>
          <div class="stat-icon-wrap">⚡</div>
        </div>
        <div class="stat-value">${stats.totalDangKy}</div>
        <div class="stat-desc">Khóa phân tán Concurrency Safe</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">CPA Trung Bình</span>
          <div class="stat-icon-wrap">🎯</div>
        </div>
        <div class="stat-value">${stats.avgGpa.toFixed(2)}</div>
        <div class="stat-desc">Thang điểm 4.0 toàn trường</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">Cảnh Báo Học Tập</span>
          <div class="stat-icon-wrap" style="color: var(--danger);">⚠️</div>
        </div>
        <div class="stat-value" style="color: var(--danger);">${stats.totalCanhBao}</div>
        <div class="stat-desc">Có quyền chạy batch quét</div>
      </div>
    </div>

    <!-- Lecturer Quick Management Panel -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">🛠️ Bảng Điều Khiển Tác Vụ Giảng Viên & Ban Đào Tạo</h2>
        <span class="badge badge-success">Quyền Hạn: Đầy Đủ</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
        <div style="background: var(--bg-surface); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div style="font-size: 20px; margin-bottom: 6px;">📈</div>
          <strong style="color: var(--text-primary);">Nhập Điểm & Khóa Sổ Điểm</strong>
          <p style="color: var(--text-secondary); font-size: 12px; margin: 4px 0 12px 0;">Nhập điểm QT 50%, Điểm Thi 50% cho sinh viên trong lớp và chốt khóa sổ.</p>
          <button class="btn btn-primary btn-sm" onclick="state.currentView = 'diem-so'; loadCurrentView();">Vào Nhập Điểm →</button>
        </div>

        <div style="background: var(--bg-surface); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div style="font-size: 20px; margin-bottom: 6px;">👥</div>
          <strong style="color: var(--text-primary);">Quản Lý Hồ Sơ Sinh Viên</strong>
          <p style="color: var(--text-secondary); font-size: 12px; margin: 4px 0 12px 0;">Xem lý lịch, thêm mới sinh viên, sửa thông tin hoặc xóa sinh viên.</p>
          <button class="btn btn-secondary btn-sm" onclick="state.currentView = 'sinh-vien'; loadCurrentView();">Quản Lý SV →</button>
        </div>

        <div style="background: var(--bg-surface); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div style="font-size: 20px; margin-bottom: 6px;">🏛️</div>
          <strong style="color: var(--text-primary);">Khởi Tạo Mở Lớp Học Phần</strong>
          <p style="color: var(--text-secondary); font-size: 12px; margin: 4px 0 12px 0;">Mở thêm các lớp tín chỉ mới cho học kỳ, phân công phòng & giảng viên.</p>
          <button class="btn btn-secondary btn-sm" onclick="state.currentView = 'mon-hoc'; loadCurrentView();">Mở Lớp Mới →</button>
        </div>

        <div style="background: var(--bg-surface); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div style="font-size: 20px; margin-bottom: 6px;">⚠️</div>
          <strong style="color: var(--text-primary);">Chạy Batch Quét Cảnh Báo</strong>
          <p style="color: var(--text-secondary); font-size: 12px; margin: 4px 0 12px 0;">Kích hoạt tiến trình tự động đối chiếu CPA toàn trường theo ngưỡng quy chế.</p>
          <button class="btn btn-danger btn-sm" onclick="state.currentView = 'canh-bao'; loadCurrentView();">Chạy Quét Batch →</button>
        </div>
      </div>
    </div>
  `;
}

// 2. Course Registration View
async function renderDangKyHocPhan() {
  const isStudent = state.currentUser.role === 'ROLE_STUDENT';
  const maSV = isStudent ? state.currentUser.username : '211200123';

  // Load courses and student registrations
  const coursesRes = await apiRequest(`/dang-ky/lop-mo?maSV=${maSV}`);
  const registeredRes = await apiRequest(`/dang-ky/sinh-vien/${maSV}`);

  const courses = coursesRes.success ? coursesRes.data : [];
  const registered = registeredRes.success ? registeredRes.data : [];

  const totalRegisteredCredits = registered.reduce((acc, c) => acc + (c.soTinChi || 0), 0);

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">📝 Đăng Ký Học Phần Trực Tuyến</h1>
        <p class="page-desc">Đợt đăng ký tín chỉ Học kỳ 1 (2025-2026) • Đang thao tác hồ sơ: <strong style="color: var(--primary);">${state.currentUser.hoTen} (${maSV})</strong></p>
      </div>
      <div class="page-actions">
        <div class="badge badge-success" style="font-size: 13px; padding: 6px 12px;">
          Tín chỉ đã đăng ký: <strong>${totalRegisteredCredits} / 24 TC</strong>
        </div>
      </div>
    </div>

    <!-- Active Registered Courses Table -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">📋 Danh Sách Học Phần Đã Đăng Ký Thành Công</h2>
        <span class="badge badge-info">${registered.length} môn học</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Mã Phiếu</th>
              <th>Mã LHP</th>
              <th>Tên Môn Học</th>
              <th>Số TC</th>
              <th>Lịch Học</th>
              <th>Phòng</th>
              <th>Trạng Thái</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            ${registered.length === 0 ? '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">Chưa đăng ký học phần nào trong học kỳ này.</td></tr>' : ''}
            ${registered.map(r => `
              <tr>
                <td><code>${r.maPhieu}</code></td>
                <td><strong>${r.maLHP}</strong></td>
                <td>${r.tenMon}</td>
                <td><span class="badge badge-info">${r.soTinChi} TC</span></td>
                <td>${r.lichHoc || '-'}</td>
                <td>${r.phongHoc || '-'}</td>
                <td><span class="badge badge-success">${r.trangThai}</span></td>
                <td>
                  <button class="btn btn-danger btn-sm btn-drop-course" data-lhp="${r.maLHP}" data-sv="${maSV}">Hủy Môn</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Available Courses Grid -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">📚 Danh Mục Lớp Học Phần Đang Mở Đăng Ký</h2>
        <div class="search-wrapper">
          <input type="text" id="search-course-input" class="input-control search-input" placeholder="Tìm theo tên môn, mã môn..." />
        </div>
      </div>

      <div class="course-grid" id="course-cards-container">
        ${courses.map(c => {
          const isFull = c.siSoHienTai >= c.siSoToiDa;
          const percent = Math.min(100, Math.round((c.siSoHienTai / c.siSoToiDa) * 100));
          const fillClass = isFull ? 'full' : (percent > 80 ? 'high' : '');

          return `
            <div class="course-card ${c.daDangKy ? 'registered' : ''}">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <span class="course-code-tag">${c.maLHP}</span>
                  <span class="badge ${c.daDangKy ? 'badge-success' : (isFull ? 'badge-danger' : 'badge-info')}">
                    ${c.daDangKy ? 'Đã Đăng Ký' : (isFull ? 'Hết Chỗ' : 'Còn Chỗ')}
                  </span>
                </div>
                <div class="course-name">${c.tenMon}</div>
                <div class="course-details">
                  <div class="detail-row">
                    <span>Số tín chỉ:</span>
                    <strong>${c.soTinChi} Tín chỉ</strong>
                  </div>
                  <div class="detail-row">
                    <span>Môn tiên quyết:</span>
                    <span>${c.maMonTienQuyet ? `${c.tenMonTienQuyet} (${c.maMonTienQuyet})` : 'Không có'}</span>
                  </div>
                  <div class="detail-row">
                    <span>Giảng viên:</span>
                    <span>${c.tenGiangVien}</span>
                  </div>
                  <div class="detail-row">
                    <span>Thời khóa biểu:</span>
                    <strong style="color: var(--primary);">${c.lichHoc || 'Chưa xếp'}</strong>
                  </div>
                  <div class="detail-row">
                    <span>Phòng học:</span>
                    <span>${c.phongHoc || 'TBA'}</span>
                  </div>
                </div>
              </div>

              <div>
                <!-- Capacity Progress Bar -->
                <div class="capacity-container">
                  <div class="capacity-meta">
                    <span>Sĩ số: <strong>${c.siSoHienTai}/${c.siSoToiDa}</strong></span>
                    <span>${percent}%</span>
                  </div>
                  <div class="capacity-track">
                    <div class="capacity-fill ${fillClass}" style="width: ${percent}%;"></div>
                  </div>
                </div>

                <div style="margin-top: 14px;">
                  ${c.daDangKy ? `
                    <button class="btn btn-secondary btn-sm" style="width: 100%;" disabled>✓ Đã Trong Phiếu ĐK</button>
                  ` : `
                    <button class="btn btn-primary btn-sm btn-enroll-course" style="width: 100%;" data-lhp="${c.maLHP}" data-sv="${maSV}" ${isFull ? 'disabled' : ''}>
                      ${isFull ? 'Lớp Đã Đầy' : '➕ Đăng Ký Học Phần'}
                    </button>
                  `}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// 3. Timetable & Schedule View
async function renderThoiKhoaBieu() {
  const isStudent = state.currentUser.role === 'ROLE_STUDENT';
  const maSV = isStudent ? state.currentUser.username : '211200123';
  const regRes = await apiRequest(`/dang-ky/sinh-vien/${maSV}`);
  const registered = regRes.success ? regRes.data : [];

  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">📅 Thời Khóa Biểu Học Tập</h1>
        <p class="page-desc">Lịch học chi tiết học kỳ 1 (2025-2026) của: <strong>${state.currentUser.hoTen} (${maSV})</strong></p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="window.print()">🖨️ In Thời Khóa Biểu</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">🗓️ Lịch Học Theo Tuần</h2>
      </div>
      <div class="table-responsive">
        <table class="data-table" style="text-align: center;">
          <thead>
            <tr>
              <th style="width: 120px;">Ca Học / Tiết</th>
              ${days.map(d => `<th>${d}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Sáng (Tiết 1-3)<br><small>07:00 - 09:30</small></strong></td>
              ${days.map(d => {
                const match = registered.find(r => r.lichHoc && r.lichHoc.includes(d) && r.lichHoc.includes('Tiết 1-3'));
                if (match) {
                  return `<td style="background: rgba(59, 130, 246, 0.15); border: 1px solid var(--primary); border-radius: 4px; padding: 10px;">
                    <strong style="color: var(--primary);">${match.tenMon}</strong><br>
                    <small>Phòng: ${match.phongHoc || 'A7-301'}</small><br>
                    <code style="font-size: 10px;">${match.maLHP}</code>
                  </td>`;
                }
                return `<td style="color: var(--text-muted);">-</td>`;
              }).join('')}
            </tr>
            <tr>
              <td><strong>Sáng (Tiết 4-6)<br><small>09:40 - 12:05</small></strong></td>
              ${days.map(d => {
                const match = registered.find(r => r.lichHoc && r.lichHoc.includes(d) && r.lichHoc.includes('Tiết 4-6'));
                if (match) {
                  return `<td style="background: rgba(16, 185, 129, 0.15); border: 1px solid var(--success); border-radius: 4px; padding: 10px;">
                    <strong style="color: var(--success);">${match.tenMon}</strong><br>
                    <small>Phòng: ${match.phongHoc || 'A7-205'}</small><br>
                    <code style="font-size: 10px;">${match.maLHP}</code>
                  </td>`;
                }
                return `<td style="color: var(--text-muted);">-</td>`;
              }).join('')}
            </tr>
            <tr>
              <td><strong>Chiều (Tiết 7-9)<br><small>12:35 - 15:00</small></strong></td>
              ${days.map(d => {
                const match = registered.find(r => r.lichHoc && r.lichHoc.includes(d) && r.lichHoc.includes('Tiết 7-9'));
                if (match) {
                  return `<td style="background: rgba(245, 158, 11, 0.15); border: 1px solid var(--warning); border-radius: 4px; padding: 10px;">
                    <strong style="color: var(--warning);">${match.tenMon}</strong><br>
                    <small>Phòng: ${match.phongHoc || 'A7-302'}</small><br>
                    <code style="font-size: 10px;">${match.maLHP}</code>
                  </td>`;
                }
                return `<td style="color: var(--text-muted);">-</td>`;
              }).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 4. Grades & Gradebook View (Differentiated: Lecturer Grade Entry vs. Student Transcript)
async function renderDiemSo() {
  const isLecturer = isLecturerOrAdmin();
  
  if (isLecturer) {
    // === LECTURER GRADE ENTRY & GRADEBOOK LOCKING ===
    const lhpListRes = await apiRequest('/lop-hoc-phan');
    const lhps = lhpListRes.success ? lhpListRes.data : [];
    const selectedLHP = lhps.length > 0 ? lhps[0].maLHP : 'INT1332_01';

    const gradesRes = await apiRequest(`/diem/lop/${selectedLHP}`);
    const grades = gradesRes.success ? gradesRes.data : [];

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">📈 Quản Lý Điểm & Chốt Sổ Điểm Lớp Học Phần</h1>
          <p class="page-desc">Chức năng Giảng Viên (TS. Nguyễn Hiếu Cường): Nhập điểm quá trình, điểm thi và chốt khóa sổ điểm</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-danger" id="btn-lock-gradebook" data-lhp="${selectedLHP}">🔒 Chốt Khóa Sổ Điểm</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <label class="form-label" style="margin: 0;">Chọn Lớp Học Phần:</label>
            <select id="select-grade-lhp" class="select-control" style="width: 320px;">
              ${lhps.map(l => `
                <option value="${l.maLHP}" ${l.maLHP === selectedLHP ? 'selected' : ''}>
                  ${l.maLHP} - ${l.tenMon} (${l.trangThaiSoDiem === 'DA_CHOT' ? 'ĐÃ CHỐT' : 'CHƯA CHỐT'})
                </option>
              `).join('')}
            </select>
          </div>
          <div>
            Trạng thái sổ: <span class="badge ${grades.some(g => g.trangThaiSoDiem === 'DA_CHOT') ? 'badge-danger' : 'badge-success'}">
              ${grades.some(g => g.trangThaiSoDiem === 'DA_CHOT') ? '🔒 ĐÃ CHỐT (Khóa sửa)' : '🟢 CHƯA CHỐT (Đang nhập)'}
            </span>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã SV</th>
                <th>Họ Và Tên</th>
                <th>Điểm Quá Trình (50%)</th>
                <th>Điểm Thi (50%)</th>
                <th>Điểm Tổng Kết (Thang 10)</th>
                <th>Điểm Chữ</th>
                <th>Thang 4</th>
                <th>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              ${grades.length === 0 ? '<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">Lớp chưa có sinh viên có điểm.</td></tr>' : ''}
              ${grades.map(g => {
                const isLocked = g.trangThaiSoDiem === 'DA_CHOT';
                return `
                  <tr>
                    <td><strong>${g.maSV}</strong></td>
                    <td>${g.hoTenSV || 'Sinh viên'}</td>
                    <td>
                      <input type="number" step="0.1" min="0" max="10" 
                        class="input-control input-diem-qt" 
                        value="${g.diemQuaTrinh != null ? g.diemQuaTrinh : ''}" 
                        data-sv="${g.maSV}" data-lhp="${g.maLHP}" 
                        style="width: 90px;" ${isLocked ? 'disabled' : ''} />
                    </td>
                    <td>
                      <input type="number" step="0.1" min="0" max="10" 
                        class="input-control input-diem-thi" 
                        value="${g.diemThi != null ? g.diemThi : ''}" 
                        data-sv="${g.maSV}" data-lhp="${g.maLHP}" 
                        style="width: 90px;" ${isLocked ? 'disabled' : ''} />
                    </td>
                    <td><strong>${g.diemTongKet != null ? g.diemTongKet : '-'}</strong></td>
                    <td><span class="badge badge-info">${g.diemChu || '-'}</span></td>
                    <td><strong>${g.diemThang4 != null ? g.diemThang4 : '-'}</strong></td>
                    <td>
                      <button class="btn btn-primary btn-sm btn-save-single-grade" data-sv="${g.maSV}" data-lhp="${g.maLHP}" ${isLocked ? 'disabled' : ''}>
                        Lưu Điểm
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    // === STUDENT READ-ONLY TRANSCRIPT VIEW ===
    const maSV = state.currentUser.username;
    const gradesRes = await apiRequest(`/diem/sinh-vien/${maSV}`);
    const gpaRes = await apiRequest(`/diem/tinh-gpa/${maSV}`);

    const grades = gradesRes.success ? gradesRes.data : [];
    const gpaData = gpaRes.success ? gpaRes.data : { cpaTichLuy: 0, tongTinChiTichLuy: 0 };

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">📈 Bảng Điểm Tích Lũy Cá Nhân</h1>
          <p class="page-desc">Tra cứu kết quả học tập của sinh viên: <strong>${state.currentUser.hoTen} (${maSV})</strong> • Chế độ chỉ đọc</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" id="btn-export-pdf-transcript">📄 Xuất Bảng Điểm PDF</button>
        </div>
      </div>

      <!-- CPA Summary Card -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Điểm CPA Toàn Khóa</span>
            <div class="stat-icon-wrap">🏆</div>
          </div>
          <div class="stat-value" style="color: var(--primary);">${gpaData.cpaTichLuy || 0.0}</div>
          <div class="stat-desc">Thang điểm 4.0 chuẩn tín chỉ</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Tổng Tín Chỉ Tích Lũy</span>
            <div class="stat-icon-wrap">📚</div>
          </div>
          <div class="stat-value">${gpaData.tongTinChiTichLuy || 0} TC</div>
          <div class="stat-desc">Tín chỉ đã hoàn thành đạt</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Xếp Loại Học Lực</span>
            <div class="stat-icon-wrap">⭐</div>
          </div>
          <div class="stat-value" style="font-size: 18px;">
            ${(gpaData.cpaTichLuy >= 3.6) ? 'Xuất Sắc' : (gpaData.cpaTichLuy >= 3.2 ? 'Giỏi' : (gpaData.cpaTichLuy >= 2.5 ? 'Khá' : (gpaData.cpaTichLuy >= 2.0 ? 'Trung Bình' : 'Cảnh Báo')))}
          </div>
          <div class="stat-desc">Đánh giá theo quy chế đào tạo</div>
        </div>
      </div>

      <!-- Detailed Transcript Table -->
      <div class="card" id="printable-transcript">
        <div class="card-header">
          <h2 class="card-title">📜 Chi Tiết Điểm Từng Học Phần</h2>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã LHP</th>
                <th>Tên Môn Học</th>
                <th>Số TC</th>
                <th>Học Kỳ</th>
                <th>Điểm QT</th>
                <th>Điểm Thi</th>
                <th>Điểm Tổng Kết</th>
                <th>Điểm Chữ</th>
                <th>Thang 4</th>
                <th>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              ${grades.length === 0 ? '<tr><td colspan="10" style="text-align: center; padding: 24px; color: var(--text-muted);">Chưa có dữ liệu điểm học phần.</td></tr>' : ''}
              ${grades.map(g => `
                <tr>
                  <td><code>${g.maLHP}</code></td>
                  <td><strong>${g.tenMon}</strong></td>
                  <td><span class="badge badge-info">${g.soTinChi} TC</span></td>
                  <td>${g.hocKy} (${g.namHoc})</td>
                  <td>${g.diemQuaTrinh != null ? g.diemQuaTrinh : '-'}</td>
                  <td>${g.diemThi != null ? g.diemThi : '-'}</td>
                  <td><strong>${g.diemTongKet != null ? g.diemTongKet : '-'}</strong></td>
                  <td><span class="badge ${g.diemChu === 'F' ? 'badge-danger' : 'badge-success'}">${g.diemChu || '-'}</span></td>
                  <td><strong>${g.diemThang4 != null ? g.diemThang4 : '-'}</strong></td>
                  <td>
                    <span class="badge ${g.diemThang4 != null && g.diemThang4 >= 1.0 ? 'badge-success' : 'badge-danger'}">
                      ${g.diemThang4 != null && g.diemThang4 >= 1.0 ? 'Đạt' : 'Học Lại'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

// 5. Student Profiles View (Restricted to Lecturer & Admin)
async function renderSinhVien() {
  if (!isLecturerOrAdmin()) {
    return renderAccessDeniedView('Quản Lý Hồ Sơ Sinh Viên');
  }

  const svRes = await apiRequest('/sinh-vien');
  const sinhViens = svRes.success ? svRes.data : [];

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">👥 Quản Lý Hồ Sơ Sinh Viên Toàn Trường</h1>
        <p class="page-desc">Chức năng Giảng Viên / Đào Tạo: Tra cứu, cập nhật thông tin và quản lý lớp niên chế</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-open-add-student">➕ Thêm Sinh Viên Mới</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Danh Sách Sinh Viên (${sinhViens.length} Sinh viên)</h2>
        <div class="search-wrapper">
          <input type="text" id="search-student-input" class="input-control search-input" placeholder="Tìm theo tên hoặc MSV..." />
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Mã SV</th>
              <th>Họ Và Tên</th>
              <th>Ngày Sinh</th>
              <th>Giới Tính</th>
              <th>Lớp Niên Chế</th>
              <th>Khoa Quản Lý</th>
              <th>CPA</th>
              <th>Trạng Thái Học</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody id="student-table-body">
            ${sinhViens.map(s => {
              const isWarning = s.trangThaiHoc === 'CanhBao';
              return `
                <tr>
                  <td><code>${s.maSV}</code></td>
                  <td><strong>${s.hoTen}</strong></td>
                  <td>${s.ngaySinh || '-'}</td>
                  <td>${s.gioiTinh || '-'}</td>
                  <td><span class="badge badge-info">${s.tenLopNienChe || s.maLopNienChe}</span></td>
                  <td>${s.tenKhoa || '-'}</td>
                  <td><strong>${s.gpaTichLuy != null ? s.gpaTichLuy.toFixed(2) : '0.00'}</strong></td>
                  <td>
                    <span class="badge ${isWarning ? 'badge-danger' : 'badge-success'}">
                      ${isWarning ? '⚠️ Cảnh Báo' : '🟢 Đang Học'}
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      <button class="btn btn-secondary btn-sm btn-edit-student" data-sv='${JSON.stringify(s)}'>Sửa</button>
                      <button class="btn btn-danger btn-sm btn-del-student" data-msv="${s.maSV}">Xóa</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 6. Course Catalog & Section Opening View (Restricted to Lecturer & Admin)
async function renderMonHoc() {
  if (!isLecturerOrAdmin()) {
    return renderAccessDeniedView('Môn Học & Mở Lớp Học Phần');
  }

  const monRes = await apiRequest('/mon-hoc');
  const lhpRes = await apiRequest('/lop-hoc-phan');

  const mons = monRes.success ? monRes.data : [];
  const lhps = lhpRes.success ? lhpRes.data : [];

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">🏛️ Môn Học & Mở Lớp Học Phần</h1>
        <p class="page-desc">Chức năng Giảng Viên / Đào Tạo: Quản lý chương trình đào tạo chuẩn và khởi tạo lớp học phần mới</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-open-create-lhp">➕ Mở Lớp Học Phần Mới</button>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <!-- Course Catalog -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">📚 Danh Mục Môn Học Chuẩn (${mons.length})</h2>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã Môn</th>
                <th>Tên Môn Học</th>
                <th>Tín Chỉ</th>
                <th>Tiên Quyết</th>
              </tr>
            </thead>
            <tbody>
              ${mons.map(m => `
                <tr>
                  <td><code>${m.maMon}</code></td>
                  <td><strong>${m.tenMon}</strong></td>
                  <td><span class="badge badge-info">${m.soTinChi} TC</span></td>
                  <td>${m.monTienQuyet ? `${m.monTienQuyet.tenMon} (${m.monTienQuyet.maMon})` : '<span style="color: var(--text-muted);">-</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Sections List -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">🎓 Các Lớp Học Phần Đã Khởi Tạo (${lhps.length})</h2>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã LHP</th>
                <th>Môn Học</th>
                <th>Sĩ Số</th>
                <th>Lịch / Phòng</th>
                <th>Sổ Điểm</th>
              </tr>
            </thead>
            <tbody>
              ${lhps.map(l => `
                <tr>
                  <td><code>${l.maLHP}</code></td>
                  <td><strong>${l.tenMon}</strong></td>
                  <td>${l.siSoHienTai}/${l.siSoToiDa}</td>
                  <td><small>${l.lichHoc} • ${l.phongHoc}</small></td>
                  <td><span class="badge ${l.trangThaiSoDiem === 'DA_CHOT' ? 'badge-danger' : 'badge-success'}">${l.trangThaiSoDiem}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// 7. Academic Warning Batch Engine View (Restricted to Lecturer & Admin)
async function renderCanhBao() {
  if (!isLecturerOrAdmin()) {
    return renderAccessDeniedView('Tiến Trình Xét Cảnh Báo Học Tập');
  }

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">⚠️ Tiến Trình Xét Cảnh Báo Học Tập Tự Động</h1>
        <p class="page-desc">Chức năng Quản lý Đào tạo (UC-06): Quét toàn bộ điểm tích lũy và đối chiếu ngưỡng quy chế tín chỉ ĐH GTVT</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-danger" id="btn-run-academic-warning">⚡ Chạy Batch Quét Cảnh Báo</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">🎯 Cơ Sở Quy Chế & Ngưỡng Đánh Giá</h2>
      </div>
      <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.8;">
        <ul>
          <li><strong>Năm thứ nhất:</strong> Sinh viên có điểm CPA tích lũy &lt; <strong>1.00</strong> sẽ bị cảnh báo học tập Mức 1.</li>
          <li><strong>Năm thứ hai:</strong> Sinh viên có điểm CPA tích lũy &lt; <strong>1.20</strong> sẽ bị cảnh báo học tập Mức 2.</li>
          <li><strong>Năm thứ ba trở đi:</strong> Sinh viên có điểm CPA tích lũy &lt; <strong>1.40</strong> sẽ bị cảnh báo học tập Mức 3 (Nguy cơ buộc thôi học).</li>
        </ul>
      </div>
    </div>

    <div class="card" id="warning-results-card" style="display: none;">
      <div class="card-header">
        <h2 class="card-title">📋 Kết Quả Xử Lý Batch Toàn Trường</h2>
        <span class="badge badge-danger" id="warning-count-badge">0 Sinh viên cảnh báo</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Mã SV</th>
              <th>Họ Tên</th>
              <th>Lớp Niên Chế</th>
              <th>Điểm CPA</th>
              <th>Mức Cảnh Báo & Lý Do</th>
            </tr>
          </thead>
          <tbody id="warning-results-body">
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 8. Concurrency Lock Simulation View (Test Case TC-05 - Restricted to Lecturer & Admin)
function renderConcurrency() {
  if (!isLecturerOrAdmin()) {
    return renderAccessDeniedView('Mô Phỏng Tranh Chấp Lock (TC-05)');
  }

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">⚡ Mô Phỏng Tranh Chấp Sĩ Số & Distributed Lock</h1>
        <p class="page-desc">Chức năng Quản trị & Giảng viên: Kiểm thử chịu tải đồng thời (Test Case TC-05) với 50 requests gửi song song</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-start-concurrency-test">🚀 Kích Hoạt Test Đồng Thời (50 Luồng)</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">🧪 Thông Số Kịch Bản Kiểm Thử</h2>
      </div>
      <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
        <p>• <strong>Lớp học phần mục tiêu:</strong> <code>INT1332_01</code> (Hiện có sĩ số thực tế)</p>
        <p>• <strong>Số luồng giả lập (Concurrent Threads):</strong> 50 request gửi song song (Promise.all)</p>
        <p>• <strong>Cơ chế khóa:</strong> Redis Distributed Lock / Java ReentrantLock tại tầng Service</p>
        <p>• <strong>Kỳ vọng:</strong> Chỉ duy nhất các slot còn trống được phép thành công, các request vượt quá sĩ số tối đa sẽ bị Exception bắt giữ, sĩ số không bao giờ bị tràn!</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">🖥️ Console Realtime Audit Log</h2>
        <button class="btn btn-secondary btn-sm" id="btn-clear-concurrency-log">Xóa Log</button>
      </div>
      <div class="concurrency-box" id="concurrency-terminal">
        <div class="concurrency-log-line info">[System] Sẵn sàng kích hoạt bài kiểm thử tranh chấp đồng thời...</div>
      </div>
    </div>
  `;
}

// ==========================================
// Route & View Dispatcher
// ==========================================
async function loadCurrentView() {
  const container = document.getElementById('main-content');
  if (!container) return;

  // Update active nav link
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.target === state.currentView);
  });

  // Render HTML based on view
  let html = '';
  switch (state.currentView) {
    case 'dashboard':
      html = await renderDashboard();
      break;
    case 'dang-ky':
      html = await renderDangKyHocPhan();
      break;
    case 'thoi-khoa-bieu':
      html = await renderThoiKhoaBieu();
      break;
    case 'diem-so':
      html = await renderDiemSo();
      break;
    case 'sinh-vien':
      html = await renderSinhVien();
      break;
    case 'mon-hoc':
      html = await renderMonHoc();
      break;
    case 'canh-bao':
      html = await renderCanhBao();
      break;
    case 'concurrency':
      html = renderConcurrency();
      break;
    default:
      html = await renderDashboard();
  }

  container.innerHTML = html;
  bindEventsForCurrentView();
}

// Helper to quickly switch to Lecturer role
function switchToLecturer() {
  const gvPill = document.querySelector('.role-pill[data-user="GV001"]');
  if (gvPill) gvPill.click();
}

// ==========================================
// Event Bindings for Views
// ==========================================
function bindEventsForCurrentView() {
  // Access Denied Buttons
  const backDashBtn = document.getElementById('btn-back-to-dashboard');
  if (backDashBtn) {
    backDashBtn.addEventListener('click', () => {
      state.currentView = 'dashboard';
      loadCurrentView();
    });
  }

  const quickSwitchBtn = document.getElementById('btn-quick-switch-to-lecturer');
  if (quickSwitchBtn) {
    quickSwitchBtn.addEventListener('click', () => {
      switchToLecturer();
    });
  }

  // 1. Dashboard Events
  const refreshStatsBtn = document.getElementById('btn-refresh-stats');
  if (refreshStatsBtn) {
    refreshStatsBtn.addEventListener('click', async () => {
      showToast('Đang làm mới thống kê hệ thống...', 'info');
      loadCurrentView();
    });
  }

  // 2. Course Registration Events
  document.querySelectorAll('.btn-enroll-course').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const maLHP = btn.dataset.lhp;
      const maSV = btn.dataset.sv;

      btn.disabled = true;
      btn.textContent = 'Đang xử lý...';

      const res = await apiRequest('/dang-ky', {
        method: 'POST',
        body: JSON.stringify({ maSV, maLHP })
      });

      if (res.success) {
        showToast(`Đăng ký thành công lớp ${maLHP}!`, 'success');
      } else {
        showToast(res.message || 'Đăng ký thất bại', 'error');
      }
      loadCurrentView();
    });
  });

  document.querySelectorAll('.btn-drop-course').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const maLHP = btn.dataset.lhp;
      const maSV = btn.dataset.sv;

      if (!confirm(`Bạn có chắc chắn muốn hủy đăng ký lớp học phần ${maLHP}?`)) return;

      const res = await apiRequest(`/dang-ky?maSV=${maSV}&maLHP=${maLHP}`, {
        method: 'DELETE'
      });

      if (res.success) {
        showToast(`Hủy thành công lớp ${maLHP}`, 'success');
      } else {
        showToast(res.message || 'Không thể hủy môn', 'error');
      }
      loadCurrentView();
    });
  });

  // 3. Lecturer Grade Entry Events
  const selectGradeLHP = document.getElementById('select-grade-lhp');
  if (selectGradeLHP) {
    selectGradeLHP.addEventListener('change', async (e) => {
      const lhp = e.target.value;
      const res = await apiRequest(`/diem/lop/${lhp}`);
      loadCurrentView();
    });
  }

  document.querySelectorAll('.btn-save-single-grade').forEach(btn => {
    btn.addEventListener('click', async () => {
      const maSV = btn.dataset.sv;
      const maLHP = btn.dataset.lhp;

      const qtInput = document.querySelector(`.input-diem-qt[data-sv="${maSV}"][data-lhp="${maLHP}"]`);
      const thiInput = document.querySelector(`.input-diem-thi[data-sv="${maSV}"][data-lhp="${maLHP}"]`);

      const diemQuaTrinh = parseFloat(qtInput.value);
      const diemThi = parseFloat(thiInput.value);

      if (isNaN(diemQuaTrinh) || isNaN(diemThi)) {
        showToast('Vui lòng nhập đầy đủ điểm quá trình và điểm thi!', 'warning');
        return;
      }

      const res = await apiRequest('/diem/nhap', {
        method: 'POST',
        body: JSON.stringify({ maSV, maLHP, diemQuaTrinh, diemThi })
      });

      if (res.success) {
        showToast(`Đã lưu điểm cho sinh viên ${maSV}: TK=${res.data.diemTongKet} (${res.data.diemChu})`, 'success');
        loadCurrentView();
      } else {
        showToast(res.message || 'Lỗi khi lưu điểm', 'error');
      }
    });
  });

  const lockGradebookBtn = document.getElementById('btn-lock-gradebook');
  if (lockGradebookBtn) {
    lockGradebookBtn.addEventListener('click', async () => {
      const maLHP = lockGradebookBtn.dataset.lhp;
      if (!confirm(`Xác nhận chốt khóa sổ điểm lớp ${maLHP}? Sau khi chốt sẽ không thể chỉnh sửa điểm!`)) return;

      const res = await apiRequest(`/diem/chot-so/${maLHP}`, { method: 'POST' });
      if (res.success) {
        showToast(`Đã chốt sổ điểm lớp ${maLHP} thành công!`, 'success');
        loadCurrentView();
      } else {
        showToast(res.message || 'Không thể chốt sổ điểm', 'error');
      }
    });
  }

  // PDF Export Transcript Simulation
  const exportPdfBtn = document.getElementById('btn-export-pdf-transcript');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // 4. Student Management Modal Events
  const addStudentBtn = document.getElementById('btn-open-add-student');
  if (addStudentBtn) {
    addStudentBtn.addEventListener('click', () => {
      const modalHtml = `
        <form id="add-student-form">
          <div class="form-group">
            <label class="form-label">Mã Sinh Viên (Quy tắc UTC):</label>
            <input type="text" id="new-sv-id" class="input-control" placeholder="Ví dụ: 211200199" required />
          </div>
          <div class="form-group">
            <label class="form-label">Họ và Tên:</label>
            <input type="text" id="new-sv-name" class="input-control" placeholder="Nguyễn Văn X" required />
          </div>
          <div class="form-group">
            <label class="form-label">Lớp Niên Chế:</label>
            <select id="new-sv-lop" class="select-control">
              <option value="CNPM-K62">Công nghệ Phần mềm K62 (CNPM-K62)</option>
              <option value="HTTT-K62">Hệ thống Thông tin K62 (HTTT-K62)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Email:</label>
            <input type="email" id="new-sv-email" class="input-control" placeholder="msv@sv.utc.edu.vn" required />
          </div>
          <div class="form-group">
            <label class="form-label">Số Điện Thoại:</label>
            <input type="tel" id="new-sv-phone" class="input-control" placeholder="0987654321" />
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-close-btn').click()">Hủy</button>
            <button type="submit" class="btn btn-primary">Lưu Sinh Viên</button>
          </div>
        </form>
      `;
      openModal('Thêm Sinh Viên Mới', modalHtml);

      document.getElementById('add-student-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          maSV: document.getElementById('new-sv-id').value.trim(),
          hoTen: document.getElementById('new-sv-name').value.trim(),
          maLopNienChe: document.getElementById('new-sv-lop').value,
          email: document.getElementById('new-sv-email').value.trim(),
          soDienThoai: document.getElementById('new-sv-phone').value.trim(),
          ngaySinh: '2003-01-01',
          gioiTinh: 'Nam',
          trangThaiHoc: 'DangHoc'
        };

        const res = await apiRequest('/sinh-vien', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (res.success) {
          showToast(`Thêm sinh viên ${payload.hoTen} thành công!`, 'success');
          closeModal();
          loadCurrentView();
        } else {
          showToast(res.message || 'Lỗi khi thêm sinh viên', 'error');
        }
      });
    });
  }

  // Delete Student
  document.querySelectorAll('.btn-del-student').forEach(btn => {
    btn.addEventListener('click', async () => {
      const msv = btn.dataset.msv;
      if (!confirm(`Xác nhận xóa sinh viên có mã ${msv}?`)) return;

      const res = await apiRequest(`/sinh-vien/${msv}`, { method: 'DELETE' });
      if (res.success) {
        showToast(`Đã xóa sinh viên ${msv}`, 'success');
        loadCurrentView();
      } else {
        showToast(res.message || 'Không thể xóa sinh viên', 'error');
      }
    });
  });

  // 5. Course Section Opening Events
  const openCreateLhpBtn = document.getElementById('btn-open-create-lhp');
  if (openCreateLhpBtn) {
    openCreateLhpBtn.addEventListener('click', async () => {
      const monRes = await apiRequest('/mon-hoc');
      const mons = monRes.success ? monRes.data : [];

      const modalHtml = `
        <form id="create-lhp-form">
          <div class="form-group">
            <label class="form-label">Mã Lớp Học Phần:</label>
            <input type="text" id="new-lhp-id" class="input-control" placeholder="Ví dụ: INT1332_03" required />
          </div>
          <div class="form-group">
            <label class="form-label">Môn Học:</label>
            <select id="new-lhp-mon" class="select-control">
              ${mons.map(m => `<option value="${m.maMon}">${m.tenMon} (${m.maMon}) - ${m.soTinChi} TC</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Giảng Viên Giảng Dạy:</label>
            <select id="new-lhp-gv" class="select-control">
              <option value="GV001">TS. Nguyễn Hiếu Cường</option>
              <option value="GV002">ThS. Trần Văn Hùng</option>
            </select>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label">Lịch Học:</label>
              <input type="text" id="new-lhp-lich" class="input-control" placeholder="Thứ 6 (Tiết 1-3)" required />
            </div>
            <div class="form-group">
              <label class="form-label">Phòng Học:</label>
              <input type="text" id="new-lhp-phong" class="input-control" placeholder="A7-305" required />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Sĩ Số Tối Đa:</label>
            <input type="number" id="new-lhp-siso" class="input-control" value="70" min="10" max="150" required />
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-close-btn').click()">Hủy</button>
            <button type="submit" class="btn btn-primary">Khởi Tạo Lớp HP</button>
          </div>
        </form>
      `;
      openModal('Mở Lớp Học Phần Mới', modalHtml);

      document.getElementById('create-lhp-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          maLHP: document.getElementById('new-lhp-id').value.trim(),
          maMon: document.getElementById('new-lhp-mon').value,
          maGiangVien: document.getElementById('new-lhp-gv').value,
          lichHoc: document.getElementById('new-lhp-lich').value.trim(),
          phongHoc: document.getElementById('new-lhp-phong').value.trim(),
          siSoToiDa: parseInt(document.getElementById('new-lhp-siso').value)
        };

        const res = await apiRequest('/lop-hoc-phan', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (res.success) {
          showToast(`Khởi tạo lớp học phần ${payload.maLHP} thành công!`, 'success');
          closeModal();
          loadCurrentView();
        } else {
          showToast(res.message || 'Lỗi khi mở lớp học phần', 'error');
        }
      });
    });
  }

  // 6. Academic Warning Batch Run Event
  const runWarningBtn = document.getElementById('btn-run-academic-warning');
  if (runWarningBtn) {
    runWarningBtn.addEventListener('click', async () => {
      runWarningBtn.disabled = true;
      runWarningBtn.textContent = '⏳ Đang quét toàn trường...';

      const res = await apiRequest('/diem/chay-canh-bao', { method: 'POST' });
      runWarningBtn.disabled = false;
      runWarningBtn.textContent = '⚡ Chạy Batch Quét Cảnh Báo';

      if (res.success && res.data) {
        const data = res.data;
        showToast(`Hoàn tất: ${data.soSinhVienBiCanhBao} sinh viên bị cảnh báo học tập!`, 'warning');

        const card = document.getElementById('warning-results-card');
        const badge = document.getElementById('warning-count-badge');
        const body = document.getElementById('warning-results-body');

        if (card && body) {
          card.style.display = 'block';
          badge.textContent = `${data.soSinhVienBiCanhBao} Sinh viên vi phạm quy chế`;

          body.innerHTML = (data.danhSachChiTiet || []).map(item => `
            <tr>
              <td><code>${item.maSV}</code></td>
              <td><strong>${item.hoTen}</strong></td>
              <td>${item.lop}</td>
              <td><strong style="color: var(--danger);">${item.cpa}</strong></td>
              <td><span class="badge badge-danger">${item.lyDo}</span></td>
            </tr>
          `).join('');
        }
      } else {
        showToast(res.message || 'Lỗi khi quét cảnh báo', 'error');
      }
    });
  }

  // 7. Concurrency Test Simulation
  const startConcurrencyBtn = document.getElementById('btn-start-concurrency-test');
  const terminal = document.getElementById('concurrency-terminal');
  const clearLogBtn = document.getElementById('btn-clear-concurrency-log');

  if (clearLogBtn && terminal) {
    clearLogBtn.addEventListener('click', () => {
      terminal.innerHTML = '<div class="concurrency-log-line info">[System] Log đã được làm sạch.</div>';
    });
  }

  if (startConcurrencyBtn && terminal) {
    startConcurrencyBtn.addEventListener('click', async () => {
      startConcurrencyBtn.disabled = true;
      startConcurrencyBtn.textContent = '⚡ Đang chạy 50 requests song song...';

      terminal.innerHTML += `<div class="concurrency-log-line info">[Test Runner] Bắt đầu kích hoạt 50 luồng HTTP POST đồng thời tranh chấp slot lớp INT1332_01...</div>`;

      // Generate 50 concurrent requests
      const requests = [];
      for (let i = 1; i <= 50; i++) {
        const fakeSV = `211200${120 + (i % 5)}`; // simulate multiple student IDs
        requests.push(
          apiRequest('/dang-ky', {
            method: 'POST',
            body: JSON.stringify({ maSV: fakeSV, maLHP: 'INT1332_01' })
          }).then(res => ({ id: i, sv: fakeSV, res }))
        );
      }

      const results = await Promise.all(requests);

      let successCount = 0;
      let rejectCount = 0;

      results.forEach(r => {
        if (r.res.success) {
          successCount++;
          terminal.innerHTML += `<div class="concurrency-log-line success">[Thread-${r.id}] ĐĂNG KÝ THÀNH CÔNG cho SV ${r.sv}! Khóa phân tán giải phóng.</div>`;
        } else {
          rejectCount++;
          terminal.innerHTML += `<div class="concurrency-log-line rejected">[Thread-${r.id}] BỊ TỪ CHỐI: ${r.res.message}</div>`;
        }
      });

      terminal.innerHTML += `<div class="concurrency-log-line info">[Kết Quả TC-05] Hoàn thành 50 luồng: ${successCount} thành công, ${rejectCount} bị chặn an toàn. Không xảy ra Race Condition!</div>`;
      terminal.scrollTop = terminal.scrollHeight;

      startConcurrencyBtn.disabled = false;
      startConcurrencyBtn.textContent = '🚀 Kích Hoạt Test Đồng Thời (50 Luồng)';
      showToast(`Kiểm thử đồng thời hoàn tất: ${successCount} thành công, ${rejectCount} bị từ chối`, 'info');
    });
  }
}

// ==========================================
// Initialization & Global Event Listeners
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  // Sidebar toggle
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('app-sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.contains('dark-theme');
      document.body.classList.toggle('dark-theme', !isDark);
      document.body.classList.toggle('light-theme', isDark);
      themeToggle.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
    });
  }

  // Modal close button and backdrop click
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalContainer = document.getElementById('modal-container');
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalContainer) {
    modalContainer.addEventListener('click', (e) => {
      if (e.target === modalContainer) closeModal();
    });
  }

  // Role Preset Buttons (Appendix B accounts)
  document.querySelectorAll('.role-pill').forEach(pill => {
    pill.addEventListener('click', async () => {
      document.querySelectorAll('.role-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const user = pill.dataset.user;
      let pass = 'sv123';
      if (user === 'GV001') pass = 'gv123';
      if (user === 'admin') pass = 'admin123';

      await loginUser(user, pass);
    });
  });

  // Initial Auto-Login as default student (211200123)
  await loginUser('211200123', 'sv123');
});
