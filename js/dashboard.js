/* js/dashboard.js
   لوحة تحكم محسّنة: بحث، تصفح، إضافة/تعديل/حذف، عرض على الخريطة.
*/
(function(){
  const pageSize = 6; // عناصر في الصفحة
  let allProjects = [];
  let filtered = [];
  let currentPage = 1;
  let currentUser = null;

  // عناصر DOM
  const userBadge = document.getElementById('userBadge');
  const projectsTableContainer = document.getElementById('projectsTableContainer');
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  const paginationEl = document.getElementById('pagination');

  const projectModalEl = document.getElementById('projectModal');
  const projectModal = new bootstrap.Modal(projectModalEl);
  const projectForm = document.getElementById('projectForm');
  const projIdEl = document.getElementById('projId');
  const projCodeEl = document.getElementById('projCode');
  const projNameEl = document.getElementById('projName');
  const projLatEl = document.getElementById('projLat');
  const projLngEl = document.getElementById('projLng');
  const projStatusEl = document.getElementById('projStatus');
  const projEqEl = document.getElementById('projEq');
  const projNoteEl = document.getElementById('projNote');
  const projectModalTitle = document.getElementById('projectModalTitle');

  const confirmDeleteModalEl = document.getElementById('confirmDeleteModal');
  const confirmDeleteModal = new bootstrap.Modal(confirmDeleteModalEl);
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const deleteMsgEl = document.getElementById('deleteMsg');

  let deleteTargetId = null;

  // Helpers
  function safeNumber(v){ const n = parseFloat(v); return isNaN(n) ? null : n; }

  function showUser(user){
    currentUser = user;
    if(!user){
      userBadge.textContent = ' (غير مسجل)';
    } else {
      userBadge.textContent = ` — ${user.username}`;
    }
  }

  function loadProjects(){
    try {
      allProjects = window.saas.getProjects() || [];
    } catch(e){
      console.error('[dashboard] error getting projects from saas:', e);
      allProjects = [];
    }
    applyFilters();
  }

  function applyFilters(){
    const q = (searchInput.value || '').trim().toLowerCase();
    const status = statusFilter.value;
    filtered = allProjects.filter(p => {
      const matchStatus = status === 'all' ? true : p.status === status;
      const text = `${p.id} ${p.name} ${(p.assignedEquipment||[]).join(' ')} ${(p.note||'')}`.toLowerCase();
      const matchQ = q === '' ? true : text.includes(q);
      return matchStatus && matchQ;
    });
    currentPage = 1;
    renderTable();
  }

  function renderTable(){
    const start = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    if(pageItems.length === 0){
      projectsTableContainer.innerHTML = `<div class="alert alert-info">لا توجد مشاريع لعرضها.</div>`;
      renderPagination();
      return;
    }

    let html = `<table class="table table-striped table-bordered align-middle">
      <thead class="table-light"><tr>
        <th>الرمز</th><th>الاسم</th><th>الحالة</th><th>إحداثيات</th><th>المعدات</th><th>أفعال</th>
      </tr></thead><tbody>`;

    pageItems.forEach(p=>{
      html += `<tr>
        <td>${escapeHtml(p.id)}</td>
        <td>${escapeHtml(p.name || '')}</td>
        <td>${escapeHtml(p.status || '')}</td>
        <td>${(p.coords && p.coords.length===2) ? `${p.coords[0].toFixed(5)}, ${p.coords[1].toFixed(5)}` : '-'}</td>
        <td>${escapeHtml((p.assignedEquipment||[]).join(', '))}</td>
        <td>
          <button class="btn btn-sm btn-primary btn-edit" data-id="${p.id}">تعديل</button>
          <button class="btn btn-sm btn-danger btn-delete" data-id="${p.id}">حذف</button>
          <button class="btn btn-sm btn-outline-success btn-map" data-id="${p.id}">عرض على الخريطة</button>
        </td>
      </tr>`;
    });

    html += `</tbody></table>`;
    projectsTableContainer.innerHTML = html;

    // Events
    projectsTableContainer.querySelectorAll('.btn-edit').forEach(b=>{
      b.addEventListener('click', ()=> {
        const id = b.getAttribute('data-id');
        const proj = allProjects.find(x=>x.id===id);
        if(proj) openProjectForm(proj);
      });
    });
    projectsTableContainer.querySelectorAll('.btn-delete').forEach(b=>{
      b.addEventListener('click', ()=> {
        const id = b.getAttribute('data-id');
        prepareDelete(id);
      });
    });
    projectsTableContainer.querySelectorAll('.btn-map').forEach(b=>{
      b.addEventListener('click', ()=> {
        const id = b.getAttribute('data-id');
        focusProjectOnMap(id);
      });
    });

    renderPagination();
  }

  function renderPagination(){
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(currentPage, pages);
    let html = '';
    // Prev
    html += `<li class="page-item ${current === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${current-1}">السابق</a></li>`;
    // pages window
    const maxShow = 5;
    let start = Math.max(1, current - Math.floor(maxShow/2));
    let end = Math.min(pages, start + maxShow - 1);
    if(end - start < maxShow - 1) start = Math.max(1, end - maxShow + 1);
    for(let i=start;i<=end;i++){
      html += `<li class="page-item ${i === current ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    // Next
    html += `<li class="page-item ${current === pages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${current+1}">التالي</a></li>`;
    paginationEl.innerHTML = html;

    paginationEl.querySelectorAll('a[data-page]').forEach(a=>{
      a.addEventListener('click', (ev)=>{
        ev.preventDefault();
        const p = parseInt(a.getAttribute('data-page'),10);
        if(!isNaN(p) && p >= 1) {
          currentPage = p;
          renderTable();
        }
      });
    });
  }

  // فتح النموذج مع بيانات المشروع (أو فارغ)
  function openProjectForm(proj){
    if(proj){
      projectModalTitle.textContent = 'تعديل المشروع';
      projIdEl.value = proj.id;
      projCodeEl.value = proj.id;
      projNameEl.value = proj.name || '';
      projLatEl.value = proj.coords && proj.coords.length===2 ? proj.coords[0] : '';
      projLngEl.value = proj.coords && proj.coords.length===2 ? proj.coords[1] : '';
      projStatusEl.value = proj.status || 'active';
      projEqEl.value = (proj.assignedEquipment||[]).join(',');
      projNoteEl.value = proj.note || '';
    } else {
      projectModalTitle.textContent = 'مشروع جديد';
      projectForm.reset();
      projIdEl.value = '';
      projCodeEl.value = 'P-' + Math.floor(100 + Math.random()*900);
    }
    // reset validation UI
    projectForm.classList.remove('was-validated');
    projectModal.show();
  }

  // حفظ المشروع (إنشاء أو تحديث)
  function saveProject(e){
    e.preventDefault();
    // validation bootstrap
    projectForm.classList.add('was-validated');
    if(!projectForm.checkValidity()) return;

    const id = projCodeEl.value.trim();
    const name = projNameEl.value.trim();
    const lat = safeNumber(projLatEl.value);
    const lng = safeNumber(projLngEl.value);
    const status = projStatusEl.value;
    const eq = (projEqEl.value || '').split(',').map(s=>s.trim()).filter(Boolean);
    const note = projNoteEl.value.trim();

    if(lat === null || lng === null){
      alert('الرجاء إدخال إحداثيات صحيحة');
      return;
    }

    const project = { id, name, status, coords: [lat, lng], assignedEquipment: eq, note };

    try {
      if(projIdEl.value){ // تحديث
        window.saas.updateProject(project);
      } else {
        window.saas.createProject(project);
      }
      // إعادة تحميل المشاريع من saas لتضمن التناسق
      loadProjects();
      projectModal.hide();
    } catch(err){
      console.error('[dashboard] saveProject error:', err);
      alert('حدث خطأ أثناء حفظ المشروع. راجع الكونسول.');
    }
  }

  // تحضير الحذف
  function prepareDelete(id){
    deleteTargetId = id;
    deleteMsgEl.textContent = `هل تريد حذف المشروع الرمزي "${id}"؟`;
    confirmDeleteModal.show();
  }
  function confirmDelete(){
    if(!deleteTargetId) return;
    try {
      window.saas.deleteProject(deleteTargetId);
      loadProjects();
      confirmDeleteModal.hide();
      deleteTargetId = null;
    } catch(err){
      console.error('[dashboard] delete error:', err);
      alert('حدث خطأ أثناء الحذف. راجع الكونسول.');
    }
  }

  // إرسال المشروع للصفحة الرئيسية للعرض على الخريطة
  function focusProjectOnMap(projectId){
    try {
      // خزّن الـ projectId مؤقتاً في localStorage ثم افتح index.html
      localStorage.setItem('focusProjectId', projectId);
      // فتح الخريطة في نافذة/تاب جديدة أو الحالية
      window.location.href = 'index.html';
    } catch(e){
      console.error('[dashboard] focusProjectOnMap error:', e);
      alert('تعذر فتح الخريطة. راجع الكونسول.');
    }
  }

  // Escape HTML لمنع XSS في العرض
  function escapeHtml(str){
    if(!str) return '';
    return String(str)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#39;');
  }

  // Events UI
  document.getElementById('btnNew').addEventListener('click', ()=> openProjectForm(null));
  document.getElementById('btnLogout').addEventListener('click', ()=>{
    try {
      window.saas.logout();
      window.location.href = 'index.html';
    } catch(e){
      console.error('[dashboard] logout error', e);
      alert('حدث خطأ أثناء تسجيل الخروج');
    }
  });

  searchInput.addEventListener('input', ()=> applyFilters());
  statusFilter.addEventListener('change', ()=> applyFilters());

  projectForm.addEventListener('submit', saveProject);
  confirmDeleteBtn.addEventListener('click', confirmDelete);

  // Initialization: ensure saas exists and user is logged in
  function init(){
    try {
      if(!window.saas || typeof window.saas.init !== 'function'){
        throw new Error('saas library not found');
      }
      window.saas.init();
      const user = window.saas.getCurrentUser();
      if(!user){
        alert('يجب تسجيل الدخول للوصول إلى لوحة التحكم');
        window.location.href = 'auth/login.html';
        return;
      }
      showUser(user);
      loadProjects();
      // استمع لتغييرات المشاريع من أماكن أخرى
      document.addEventListener('saas:projectsChanged', (e)=>{
        loadProjects();
      });
    } catch(err){
      console.error('[dashboard] initialization error:', err);
      alert('تعذر فتح لوحة التحكم الآن. سيتم إعادة التوجيه للصفحة الرئيسية.');
      setTimeout(()=> window.location.href = 'index.html', 600);
    }
  }

  // افتح المشروع المحدد تلقائياً إن وُجد focusProjectId (خاص بالعودة للخريطة)
  // (لا يؤثر على لوحة التحكم — يبقى احتياطي)
  window.addEventListener('DOMContentLoaded', init);
})();
