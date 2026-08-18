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
