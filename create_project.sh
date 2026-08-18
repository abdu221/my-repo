#!/usr/bin/env bash
set -e

PROJECT_DIR="sheikh-najjar-site"
ZIP_NAME="project-sheikh-najjar.zip"
DOWNLOAD_QUATERNIUS=true
QUATERNIUS_URL="https://quaternius.com/downloads/vehicles/GLB.zip"
ASSETS_DIR="$PROJECT_DIR/assets"

echo "إنشاء بنية المشروع في: $PROJECT_DIR"

# حذف إن وجد
rm -rf "$PROJECT_DIR" "$ZIP_NAME"
mkdir -p "$PROJECT_DIR/css" "$PROJECT_DIR/js" "$PROJECT_DIR/auth" "$ASSETS_DIR"

# ===== index.html =====
cat > "$PROJECT_DIR/index.html" <<'HTML'
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>شركة الحفر - الشيخ نجار (SaaS + 3D models)</title>

  <!-- Bootstrap RTL -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css" rel="stylesheet">

  <!-- Leaflet CSS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">

  <!-- Custom CSS -->
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
  <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
    <div class="container-fluid">
      <a class="navbar-brand" href="#">شركة الحفر - الشيخ نجار (SaaS)</a>
      <div class="d-flex">
        <a id="btnDashboard" class="btn btn-outline-light me-2" href="dashboard.html">لوحة التحكم</a>
        <a id="btnLogin" class="btn btn-light me-1" href="auth/login.html">تسجيل الدخول</a>
      </div>
    </div>
  </nav>

  <main class="container-fluid p-3">
    <div class="row">
      <!-- Sidebar -->
      <aside class="col-lg-4 col-md-12 mb-3">
        <div class="card mb-3">
          <div class="card-body">
            <h5 class="card-title">المستخدم الحالي</h5>
            <p id="currentUserInfo">غير مسجل — <a href="auth/login.html">تسجيل الدخول</a> أو <a href="auth/signup.html">إنشاء حساب</a></p>
            <div class="mb-2">
              <input id="searchInput" class="form-control" placeholder="ابحث عن مشروع أو معدات أو اسم" />
            </div>
            <div class="mb-2">
              <select id="statusFilter" class="form-select">
                <option value="all">كل الحالات</option>
                <option value="active">جاري</option>
                <option value="planned">مخطط</option>
                <option value="completed">مكتمل</option>
              </select>
            </div>
            <div class="d-grid gap-2">
              <button id="resetBtn" class="btn btn-outline-secondary">إعادة الضبط</button>
            </div>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-header">قائمة المشاريع (للمستخدم الحالي)</div>
          <ul id="projectsList" class="list-group list-group-flush" style="max-height: 38vh; overflow:auto;">
            <!-- Projects injected by JS -->
          </ul>
        </div>

        <div class="card mb-3">
          <div class="card-header">تعليمات سريعة</div>
          <div class="card-body">
            <ul>
              <li>لتجريب SaaS: سجل كمستخدم جديد ثم ادخل لوحة التحكم لإضافة/تعديل مشاريعك.</li>
              <li>النماذج ثلاثية الأبعاد تُحمّل تلقائياً من Quaternius (GLB.zip) وتعرض فوق الخريطة.</li>
              <li>إن فشل التحميل بسبب CORS، نفّذ أحد الحلول الواردة في رسالة الخطأ (تشغيل خادم محلي أو تنزيل الحزمة يدوياً).</li>
            </ul>
          </div>
        </div>
      </aside>

      <!-- Map -->
      <section class="col-lg-8 col-md-12 position-relative">
        <div id="map" style="height: 78vh; border: 1px solid #ddd;"></div>
        <!-- حاوية نماذج three.js -->
        <div id="three-overlay" class="three-overlay"></div>
      </section>
    </div>

    <!-- About / Contact -->
    <section id="about" class="mt-4">
      <div class="card">
        <div class="card-header">عن الشركة (تجريبي)</div>
        <div class="card-body">
          <p>شركة افتراضية متخصصة بأعمال الحفريات والمعدات الثقيلة لتجهيز البنية التحتية للمعامل في منطقة الشيخ نجار. هذا إصدار SaaS تجريبي — كل البيانات محلية.</p>
        </div>
      </div>
    </section>
  </main>

  <footer class="text-center py-3">
    &copy; 2026 شركة الحفريات - SaaS تجريبي (بيانات وهمية)
  </footer>

  <!-- Scripts -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <!-- تطبيق المشروع (SaaS, خريطة، إلخ) -->
  <script src="js/saas.js"></script>
  <script src="js/app.js"></script>

  <!-- three.js وملحقاته وJSZip (لتحميل وفك zip في المتصفح) -->
  <script src="https://unpkg.com/three@0.154.0/build/three.min.js"></script>
  <script src="https://unpkg.com/three@0.154.0/examples/js/loaders/GLTFLoader.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>

  <!-- سكربت تحميل ودمج نماذج GLB تلقائياً -->
  <script src="js/three-loader.js"></script>
</body>
</html>
HTML

# ===== css/styles.css =====
cat > "$PROJECT_DIR/css/styles.css" <<'CSS'
:root{
  --primary: #0d6efd;
}
body {
  background: #f8f9fa;
  font-family: "Segoe UI", Tahoma, Arial, "Noto Sans Arabic", sans-serif;
}
.navbar-brand { font-weight: 600; }
.card-header { background: #f1f3f5; font-weight: 600; }
#projectsList .list-group-item { cursor: pointer; }
.project-badge { font-size: 0.8rem; }
.leaflet-popup-content { direction: rtl; text-align: right; }

/* Container for CSS-3D machine elements positioned over the map */
.machines-layer {
  position: absolute;
  inset: 0;
  pointer-events: none; /* أولياً لذلك لا يقطع أحداث الخريطة — سنفعل pointer-events لكل آلة */
}

/* آلة 3D بسيطة (جسم - ذراع) */
.machine {
  position: absolute;
  width: 80px;
  height: 50px;
  transform-style: preserve-3d;
  transform-origin: center bottom;
  transition: transform 300ms ease, top 200ms linear, left 200ms linear;
  pointer-events: auto; /* كل آلة تستقبل النقر */
  cursor: pointer;
  will-change: transform, left, top;
}

/* الظل أسفل الآلة لعمق بسيط */
.machine .shadow {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: -6px;
  width: 60px;
  height: 10px;
  background: rgba(0,0,0,0.18);
  border-radius: 50%;
  filter: blur(2px);
  z-index: 0;
}

/* جسم الآلة (صندوق) */
.machine .body {
  position: absolute;
  width: 70px;
  height: 36px;
  left: 5px;
  bottom: 6px;
  background: linear-gradient(135deg,#ffb703,#fb8500);
  border-radius: 6px;
  box-shadow: 0 6px 10px rgba(0,0,0,0.12);
  transform-origin: center center;
  transform: rotateX(8deg) translateZ(6px);
  z-index: 2;
}

/* سطح علوي يعزز تأثير 3D */
.machine .top {
  position: absolute;
  left: 12px;
  top: -8px;
  width: 46px;
  height: 18px;
  background: linear-gradient(180deg,#ffd166,#f07c00);
  border-radius: 4px;
  transform: rotateX(40deg);
  z-index: 3;
  opacity: 0.95;
}

/* ذراع الحفارة */
.machine .arm {
  position: absolute;
  right: -26px;
  bottom: 26px;
  width: 40px;
  height: 8px;
  background: linear-gradient(90deg,#6c757d,#343a40);
  border-radius: 4px;
  transform-origin: left center;
  transform: rotate(-30deg);
  z-index: 1;
  transition: transform 400ms cubic-bezier(.2,.8,.2,1);
}

/* دلّاية الحفر (bucket) */
.machine .bucket {
  position: absolute;
  right: -34px;
  bottom: 18px;
  width: 18px;
  height: 14px;
  background: #555;
  border-radius: 3px;
  transform: rotate(20deg);
  z-index: 0;
  box-shadow: inset -4px -4px 8px rgba(0,0,0,0.25);
}

/* حالة تفاعل — تحريك الذراع (مؤثر عند النقر) */
.machine.active .arm {
  transform: rotate(-5deg);
}

/* تمييز حسب الحالة (active / completed / planned) */
.machine.status-active .body { background: linear-gradient(135deg,#ffd54f,#ff9800); }
.machine.status-planned .body { background: linear-gradient(135deg,#90caf9,#42a5f5); }
.machine.status-completed .body { background: linear-gradient(135deg,#a5d6a7,#66bb6a); }

/* تلوين مؤشر صغير فوق الآلة يحمل الرمز */
.machine .label {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: -22px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  z-index: 4;
  white-space: nowrap;
}

/* استجابة للشاشات الصغيرة */
@media (max-width: 768px){
  .machine { width: 64px; height: 42px; }
  .machine .body { width: 56px; height: 30px; left: 4px; bottom: 6px; }
}

/* three overlay */
.three-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
CSS

# ===== js/saas.js =====
cat > "$PROJECT_DIR/js/saas.js" <<'JS'
/* js/saas.js
   محاكاة وظائف SaaS بسيطة باستخدام localStorage:
   - إدارة مستخدمين (signup, login, logout)
   - إدارة مشاريع per-user (CRUD) محفوظة في localStorage تحت key 'projects_{username}'
   - يطلق أحداث DOM ليخبر الواجهة بالتغييرات
*/
(function(){
  const STORAGE_USERS = 'saas_users_v1';
  const KEY_CURRENT_USER = 'saas_current_user_v1';

  function loadUsers(){
    try {
      return JSON.parse(localStorage.getItem(STORAGE_USERS) || '[]');
    } catch (e){ return []; }
  }
  function saveUsers(users){ localStorage.setItem(STORAGE_USERS, JSON.stringify(users)); }

  function getProjectsKey(username){ return `projects_${username}_v1`; }

  // إنشاء مستخدم تجريبي إن لم يوجد
  function ensureDemoUser(){
    let users = loadUsers();
    if(!users.find(u=>u.username==='demo')){
      users.push({ username: 'demo', password: 'demo123' });
      saveUsers(users);
      const demoProjects = [
        { id: "P-001", name: "حفر أساس المصنع أ", status: "active", progress: 45, start_date: "2026-06-01", end_date: "2026-09-15", coords: [36.250, 37.248], depth_m: 6, assignedEquipment: ["EX-10","TR-03"], crew: ["C-01","C-02"] },
        { id: "P-002", name: "أعمال تسوية موقع ب", status: "planned", progress: 0, start_date: "2026-09-01", end_date: "2026-10-30", coords: [36.238, 37.233], depth_m: 2.5, assignedEquipment: ["BL-02"], crew: ["C-03"] },
        { id: "P-003", name: "قناة صرف للمحطة ٣", status: "completed", progress: 100, start_date: "2026-03-10", end_date: "2026-05-05", coords: [36.247, 37.260], depth_m: 3.2, assignedEquipment: ["EX-08","TR-01"], crew: ["C-04","C-05"] }
      ];
      localStorage.setItem(getProjectsKey('demo'), JSON.stringify(demoProjects));
    }
  }

  function setCurrentUser(user){
    if(user) localStorage.setItem(KEY_CURRENT_USER, JSON.stringify(user));
    else localStorage.removeItem(KEY_CURRENT_USER);
    document.dispatchEvent(new CustomEvent('saas:userChanged', { detail: { currentUser: user, projects: getProjectsForUser(user) } }));
  }

  function getCurrentUser(){
    try { return JSON.parse(localStorage.getItem(KEY_CURRENT_USER)); } catch(e){ return null; }
  }

  function getProjectsForUser(user){
    if(!user) return [];
    try {
      return JSON.parse(localStorage.getItem(getProjectsKey(user.username)) || '[]');
    } catch (e){ return []; }
  }

  function saveProjectsForUser(user, projects){
    if(!user) return;
    localStorage.setItem(getProjectsKey(user.username), JSON.stringify(projects));
    document.dispatchEvent(new CustomEvent('saas:projectsChanged', { detail: { projects } }));
  }

  const saas = {
    init: function(){
      ensureDemoUser();
      const user = getCurrentUser();
      const projects = getProjectsForUser(user);
      document.dispatchEvent(new CustomEvent('saas:ready', { detail: { currentUser: user, projects } }));
    },

    signup: function({username, password}){
      const users = loadUsers();
      if(users.find(u=>u.username===username)) return { ok:false, error: 'اسم المستخدم موجود' };
      users.push({ username, password });
      saveUsers(users);
      localStorage.setItem(getProjectsKey(username), JSON.stringify([]));
      return { ok:true };
    },

    login: function({username, password}){
      const users = loadUsers();
      const user = users.find(u=>u.username===username && u.password===password);
      if(!user) return { ok:false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
      setCurrentUser({ username: user.username });
      return { ok:true, user: { username: user.username } };
    },

    logout: function(){
      setCurrentUser(null);
      document.dispatchEvent(new CustomEvent('saas:ready', { detail: { currentUser: null, projects: [] } }));
    },

    getCurrentUser: function(){ return getCurrentUser(); },

    getProjects: function(){ return getProjectsForUser(getCurrentUser()); },

    createProject: function(project){
      const user = getCurrentUser();
      if(!user) return { ok:false, error: 'غير مسجل' };
      const projects = getProjectsForUser(user);
      if(!project.id) project.id = 'P-' + String(Math.floor(100 + Math.random()*900));
      projects.push(project);
      saveProjectsForUser(user, projects);
      return { ok:true, project };
    },

    updateProject: function(project){
      const user = getCurrentUser();
      if(!user) return { ok:false, error: 'غير مسجل' };
      let projects = getProjectsForUser(user);
      projects = projects.map(p => p.id === project.id ? project : p);
      saveProjectsForUser(user, projects);
      return { ok:true, project };
    },

    deleteProject: function(projectId){
      const user = getCurrentUser();
      if(!user) return { ok:false, error: 'غير مسجل' };
      let projects = getProjectsForUser(user);
      projects = projects.filter(p => p.id !== projectId);
      saveProjectsForUser(user, projects);
      return { ok:true };
    }
  };

  window.saas = saas;
})();
JS

# create other files (we already uploaded some earlier but harmless)
mkdir -p "$PROJECT_DIR/auth" "$PROJECT_DIR/js"
cat > "$PROJECT_DIR/auth/login.html" <<'HTML'
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>تسجيل الدخول - SaaS تجريبي</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
  <link rel="stylesheet" href="../css/styles.css" />
</head>
<body>
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header">تسجيل الدخول</div>
          <div class="card-body">
            <form id="loginForm">
              <div class="mb-3">
                <label class="form-label">اسم المستخدم</label>
                <input id="username" class="form-control" required />
              </div>
              <div class="mb-3">
                <label class="form-label">كلمة المرور</label>
                <input id="password" type="password" class="form-control" required />
              </div>
              <div class="d-grid gap-2">
                <button class="btn btn-primary" type="submit">دخول</button>
                <a class="btn btn-outline-secondary" href="signup.html">إنشاء حساب جديد</a>
                <a class="btn btn-link" href="../index.html">العودة للخريطة</a>
              </div>
            </form>
            <div id="loginMsg" class="mt-3 text-danger"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script src="../js/saas.js"></script>
  <script>
    document.getElementById('loginForm').addEventListener('submit', (e)=>{
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      const res = window.saas.login({ username, password });
      const msg = document.getElementById('loginMsg');
      if(!res.ok){
        msg.textContent = res.error || 'فشل تسجيل الدخول';
      } else {
        window.location.href = '../dashboard.html';
      }
    });
  </script>
</body>
</html>
HTML

cat > "$PROJECT_DIR/auth/signup.html" <<'HTML'
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>إنشاء حساب - SaaS تجريبي</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
  <link rel="stylesheet" href="../css/styles.css" />
</head>
<body>
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-md-7">
        <div class="card shadow-sm">
          <div class="card-header">إنشاء حساب جديد</div>
          <div class="card-body">
            <form id="signupForm">
              <div class="mb-3">
                <label class="form-label">اسم المستخدم</label>
                <input id="username" class="form-control" required />
              </div>
              <div class="mb-3">
                <label class="form-label">كلمة المرور</label>
                <input id="password" type="password" class="form-control" required />
              </div>
              <div class="mb-3">
                <label class="form-label">تأكيد كلمة المرور</label>
                <input id="password2" type="password" class="form-control" required />
              </div>
              <div class="d-grid gap-2">
                <button class="btn btn-success" type="submit">إنشاء</button>
                <a class="btn btn-link" href="../index.html">العودة للخريطة</a>
              </div>
            </form>
            <div id="signupMsg" class="mt-3 text-danger"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script src="../js/saas.js"></script>
  <script>
    document.getElementById('signupForm').addEventListener('submit', (e)=>{
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const pw = document.getElementById('password').value;
      const pw2 = document.getElementById('password2').value;
      const msg = document.getElementById('signupMsg');
      if(pw !== pw2){ msg.textContent = 'كلمتا المرور غير متطابقتين'; return; }
      const res = window.saas.signup({ username, password: pw });
      if(!res.ok){ msg.textContent = res.error || 'فشل الإنشاء'; return; }
      window.saas.login({ username, password: pw });
      window.location.href = '../dashboard.html';
    });
  </script>
</body>
</html>
HTML

zip -r "../$ZIP_NAME" . > /dev/null || true

echo "(create_project.sh included in repo)"
