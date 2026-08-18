/* js/app.js
   خريطة Leaflet مع آليات CSS-3D مثبتة فوقها.
   يتكامل مع saas.js لتخزين المشاريع per-user في localStorage.
*/

// مركز تخيلي للشيخ نجار
const center = [36.245, 37.245];

// خريطة Leaflet
const map = L.map('map').setView(center, 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// DOM layer فوق الخريطة لاحتواء عناصر الآليات
const machinesLayer = document.getElementById('machines-layer');

// خرائط داخلية
let machinesDOM = {}; // id -> DOM element
let projectsCache = []; // المشاريع الحالية للعرض
window.markers = {}; // markers for legacy popup focusing

// ترجمة إحداثيات latlng إلى موضع على الشاشة (px) بالنسبة لموضع layer
function latLngToLayerPoint(latlng){
  const point = map.latLngToLayerPoint(L.latLng(latlng[0], latlng[1]));
  return {x: point.x, y: point.y};
}

// أيقونات بسيطة حسب الحالة (leaflet markers fallback)
function iconByStatus(status){
  const color = status === 'active' ? 'orange' : status === 'completed' ? 'green' : 'blue';
  return L.divIcon({
    className: 'custom-marker',
    html: `<i class="fa-solid fa-dumpster-fire" style="color:${color}; font-size:20px"></i>`,
    iconSize: [24,24],
    iconAnchor: [12,12]
  });
}

// إنشاء عنصر آلة CSS-3D لمشروع (fallback)
function createMachineElement(project){
  const el = document.createElement('div');
  el.className = `machine status-${project.status}`;
  el.setAttribute('data-id', project.id);

  el.innerHTML = `
    <div class="label">${project.id}</div>
    <div class="shadow"></div>
    <div class="body"></div>
    <div class="top"></div>
    <div class="arm"></div>
    <div class="bucket"></div>
  `;

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    const latlng = project.coords;
    const popupHtml = `
      <div style="min-width:220px; direction:rtl; text-align:right">
        <h6 style="margin:0 0 6px 0;">${project.name}</h6>
        <p style="margin:0"><strong>الرمز:</strong> ${project.id}</p>
        <p style="margin:0"><strong>الحالة:</strong> ${project.status} — تقدّم: ${project.progress || 0}%</p>
        <p style="margin:0"><strong>عمق الحفر:</strong> ${project.depth_m || '-'} م</p>
        <hr/>
        <p style="margin:0"><strong>المعدات:</strong> ${project.assignedEquipment ? project.assignedEquipment.join(', ') : ''}</p>
      </div>
    `;
    L.popup({autoClose: true, closeOnClick: true})
      .setLatLng(latlng)
      .setContent(popupHtml)
      .openOn(map);

    el.classList.add('active');
    setTimeout(()=> el.classList.remove('active'), 1300);
  });

  return el;
}

// احسب وضع كل آلة على الخريطة (position: left/top) مع مراعاة حجم العنصر
function positionMachineElement(element, latlng){
  const pos = latLngToLayerPoint(latlng);
  const offsetX = -40;
  const offsetY = -60;
  element.style.left = (pos.x + offsetX) + 'px';
  element.style.top = (pos.y + offsetY) + 'px';
}

// إضافة علامات المشاريع التقليدية وملء markers
function addOrUpdateMarker(p){
  if(window.markers[p.id]){
    window.markers[p.id].setLatLng(p.coords);
    return;
  }
  const marker = L.marker(p.coords, {icon: iconByStatus(p.status)}).addTo(map);
  const popupHtml = `
    <div style="min-width:220px; direction:rtl; text-align:right">
      <h6 style="margin:0 0 6px 0;">${p.name}</h6>
      <p style="margin:0"><strong>الرمز:</strong> ${p.id}</p>
      <p style="margin:0"><strong>الحالة:</strong> ${p.status} — تقدّم: ${p.progress || 0}%</p>
      <p style="margin:0"><strong>عمق الحفر:</strong> ${p.depth_m || '-'} م</p>
    </div>
  `;
  marker.bindPopup(popupHtml);
  window.markers[p.id] = marker;
}

// إزالة marker
function removeMarker(id){
  if(window.markers[id]){
    map.removeLayer(window.markers[id]);
    delete window.markers[id];
  }
}

// تحميل/عرض المشاريع للمستخدم الحالي (تتلقى array من كائنات المشروع)
function renderProjects(projects){
  // Legacy markers
  Object.keys(window.markers).forEach(k=>{
    if(!projects.find(p=>p.id===k)) removeMarker(k);
  });

  projects.forEach(p => addOrUpdateMarker(p));

  // DOM machines
  const existingIds = new Set(projects.map(p=>p.id));
  Object.keys(machinesDOM).forEach(id=>{
    if(!existingIds.has(id)){
      machinesDOM[id].remove();
      delete machinesDOM[id];
    }
  });

  projectsCache = projects.slice();

  // إنشاء أو تحديث العناصر
  projects.forEach(p => {
    if(!machinesDOM[p.id]){
      const el = createMachineElement(p);
      document.body.appendChild(el); // absolute positioning
      machinesDOM[p.id] = el;
    }
    const el = machinesDOM[p.id];
    el.className = `machine status-${p.status}`;
    el.querySelector('.label').textContent = p.id;
    positionMachineElement(el, p.coords);
  });
}

// فلترة وبحث
function applyFilters(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const status = document.getElementById('statusFilter').value;

  const filtered = projectsCache.filter(p => {
    const matchStatus = status === 'all' ? true : p.status === status;
    const text = `${p.name} ${p.id} ${p.assignedEquipment ? p.assignedEquipment.join(' ') : ''} ${(p.note||'')}`.toLowerCase();
    const matchQ = q === '' ? true : text.includes(q);
    return matchStatus && matchQ;
  });

  projectsCache.forEach(p => {
    if(filtered.find(fp => fp.id === p.id)){
      machinesDOM[p.id].style.display = 'block';
      if(window.markers[p.id]) window.markers[p.id].addTo(map);
    } else {
      machinesDOM[p.id].style.display = 'none';
      if(window.markers[p.id]) map.removeLayer(window.markers[p.id]);
    }
  });

  populateProjectsList(filtered);
}

function populateProjectsList(list){
  const projectsList = document.getElementById('projectsList');
  projectsList.innerHTML = '';
  list.forEach(p => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-start';
    li.innerHTML = `
      <div class="ms-2 me-auto">
        <div class="fw-bold">${p.name}</div>
        <small>رمز: ${p.id} — حالة: ${p.status} — تقدم: ${p.progress || 0}%</small>
      </div>
      <span class="badge bg-${p.status === 'active' ? 'warning' : p.status === 'completed' ? 'success' : 'primary'} rounded-pill project-badge">${p.status}</span>
    `;
    li.onclick = () => {
      map.setView(p.coords, 16, {animate:true});
      if(window.markers[p.id]) window.markers[p.id].openPopup();
    };
    projectsList.appendChild(li);
  });
}

// استمع لحركات الخريطة لتحديث مواضع الآلات
map.on('move', ()=> {
  Object.values(machinesDOM).forEach(el=>{
    const id = el.getAttribute('data-id');
    const p = projectsCache.find(x=>x.id===id);
    if(p) positionMachineElement(el, p.coords);
  });
});
map.on('zoom', ()=> {
  Object.values(machinesDOM).forEach(el=>{
    const id = el.getAttribute('data-id');
    const p = projectsCache.find(x=>x.id===id);
    if(p) positionMachineElement(el, p.coords);
  });
});

// واجهة مع saas.js: عندما يتغير المستخدم أو بيانات المشاريع، يحدث رندر
document.addEventListener('saas:ready', (e)=>{
  const { currentUser, projects } = e.detail;
  updateCurrentUserInfo(currentUser);
  renderProjects(projects || []);
  applyFilters();
});

document.addEventListener('saas:userChanged', (e)=>{
  const { currentUser, projects } = e.detail;
  updateCurrentUserInfo(currentUser);
  renderProjects(projects || []);
  applyFilters();
});

document.addEventListener('saas:projectsChanged', (e)=>{
  const { projects } = e.detail;
  renderProjects(projects || []);
  applyFilters();
});

// تحديث عرض المستخدم الحالي في الشريط الجانبي
function updateCurrentUserInfo(user){
  const el = document.getElementById('currentUserInfo');
  let btnLogin = document.getElementById('btnLogin');
  let btnDashboard = document.getElementById('btnDashboard');

  if(!btnLogin){
    btnLogin = document.createElement('a');
    btnLogin.id = 'btnLogin';
    btnLogin.className = 'btn btn-light me-1';
    btnLogin.href = 'auth/login.html';
    document.querySelector('.navbar .container-fluid .d-flex')?.appendChild(btnLogin);
  }
  if(!btnDashboard){
    btnDashboard = document.createElement('a');
    btnDashboard.id = 'btnDashboard';
    btnDashboard.className = 'btn btn-outline-light me-2';
    btnDashboard.href = 'dashboard.html';
    document.querySelector('.navbar .container-fluid .d-flex')?.prepend(btnDashboard);
  }

  // أزل أي معالجات سابقة
  btnLogin.onclick = null;
  btnDashboard.onclick = null;

  if(!user){
    el.innerHTML = 'غير مسجل — <a href="auth/login.html">تسجيل الدخول</a> أو <a href="auth/signup.html">إنشاء حساب</a>';
    btnLogin.textContent = 'تسجيل الدخول';
    btnLogin.href = 'auth/login.html';
    btnDashboard.classList.add('disabled');
    btnDashboard.onclick = (ev) => {
      ev.preventDefault();
      alert('يجب تسجيل الدخول لعرض لوحة التحكم');
      console.warn('[UI] منع التنقل إلى dashboard لأن المستخدم غير مسجّل');
    };
  } else {
    el.innerHTML = `<strong>${user.username}</strong> — مستخدم تجريبي`;
    btnLogin.textContent = 'تسجيل الخروج';
    btnLogin.href = '#';
    btnLogin.onclick = (ev) => {
      ev.preventDefault();
      try {
        window.saas.logout();
      } catch(err){
        console.error('[UI] خطأ عند تسجيل الخروج:', err);
        alert('حدث خطأ عند تسجيل الخروج. راجع الكونسول للمزيد.');
      }
    };
    btnDashboard.classList.remove('disabled');
    btnDashboard.href = 'dashboard.html';
    btnDashboard.onclick = null;
  }
}

// ربط عناصر الفلترة
document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);
document.getElementById('resetBtn').addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
  document.getElementById('statusFilter').value = 'all';
  applyFilters();
});

// عند العودة من لوحة التحكم (focus on project)
(function(){
  const focusId = localStorage.getItem('focusProjectId');
  if(focusId){
    localStorage.removeItem('focusProjectId');
    setTimeout(()=>{
      try {
        if(window.markers && window.markers[focusId]){
          const marker = window.markers[focusId];
          map.setView(marker.getLatLng(), 16, {animate:true});
          marker.openPopup();
        } else {
          console.warn('[index] marker for focusId not found:', focusId);
        }
      } catch(e){
        console.error('[index] error focusing project:', e);
      }
    }, 600);
  }
})();
