/* js/three-loader.js
   تحميل تلقائي لحزمة GLB من Quaternius وعرض النماذج فوق خريطة Leaflet باستخدام Three.js.
*/
(function(){
  const ZIP_URL = '/assets/GLB.zip'; // default: local copy in assets/ (script will download if requested)
  const EXPECTED = {
    excavator: [/excava/i, /dig/i, /excavator/i],
    bulldozer: [/bulldozer/i, /d bulldo/i, /dozer/i],
    dumptruck: [/dump/i, /truck/i, /tipper/i]
  };
  const modelsBuffers = {};
  let zipLoaded = false;
  let loaderError = null;
  let renderer, scene, camera;
  let modelObjects = {};

  function guessModelFileName(files){
    const names = Object.keys(files);
    const found = {};
    names.forEach(n => {
      const lower = n.toLowerCase();
      if(!found.excavator && EXPECTED.excavator.some(r=>r.test(lower))) found.excavator = n;
      if(!found.bulldozer && EXPECTED.bulldozer.some(r=>r.test(lower))) found.bulldozer = n;
      if(!found.dumptruck && EXPECTED.dumptruck.some(r=>r.test(lower))) found.dumptruck = n;
    });
    return found;
  }

  async function fetchAndExtractZipLocal(zipUrl){
    try {
      console.info('[three-loader] fetching zip from', zipUrl);
      const res = await fetch(zipUrl);
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const ab = await res.arrayBuffer();
      const zip = await JSZip.loadAsync(ab);
      const files = zip.files;
      const found = guessModelFileName(files);

      for(const key of ['excavator','bulldozer','dumptruck']){
        const fname = found[key];
        if(fname){
          const file = files[fname];
          const content = await file.async('arraybuffer');
          modelsBuffers[key] = content;
          console.info('[three-loader] extracted', key, fname);
        } else {
          console.warn('[three-loader] no file found in zip for', key);
        }
      }

      zipLoaded = true;
      document.dispatchEvent(new CustomEvent('three:zipLoaded', { detail: { ok:true } }));
    } catch(err){
      loaderError = err;
      console.error('[three-loader] failed to fetch/extract zip:', err);
      document.dispatchEvent(new CustomEvent('three:zipLoaded', { detail: { ok:false, error: String(err) } }));
    }
  }

  function initThreeOverlay(){
    if(!window.map) { console.error('Leaflet map not found (expected global "map")'); return; }
    const threeCanvas = document.createElement('canvas');
    threeCanvas.style.position = 'absolute';
    threeCanvas.style.left = '0';
    threeCanvas.style.top = '0';
    threeCanvas.style.pointerEvents = 'none';
    threeCanvas.style.width = '100%';
    threeCanvas.style.height = '100%';
    map.getContainer().appendChild(threeCanvas);

    renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    const size = map.getSize();
    renderer.setSize(size.x, size.y);

    camera = new THREE.OrthographicCamera(-size.x/2, size.x/2, size.y/2, -size.y/2, -10000, 10000);
    camera.position.set(0,0,1000);
    camera.lookAt(0,0,0);

    scene = new THREE.Scene();

    function onResize(){
      const s = map.getSize();
      renderer.setSize(s.x, s.y);
      camera.left = -s.x/2; camera.right = s.x/2; camera.top = s.y/2; camera.bottom = -s.y/2;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    }
    map.on('resize', onResize);
    map.on('move', ()=> renderer.render(scene, camera));
    map.on('zoom', ()=> renderer.render(scene, camera));
  }

  function latLngToThreePos(latlng){
    const p = map.latLngToLayerPoint(L.latLng(latlng[0], latlng[1]));
    const size = map.getSize();
    const x = p.x - size.x / 2;
    const y = - (p.y - size.y / 2);
    return new THREE.Vector3(x, y, 0);
  }

  function parseGLBBufferToObject(buffer){
    return new Promise((resolve, reject) => {
      try {
        const loader = new THREE.GLTFLoader();
        loader.parse(buffer, '', (gltf) => {
          const obj = gltf.scene || gltf.scenes[0];
          resolve(obj);
        }, (err) => reject(err));
      } catch(e){
        reject(e);
      }
    });
  }

  async function attachModelToProject(project){
    const eq = project.assignedEquipment || [];
    let type = null;
    if(eq.some(id=>/^EX/i.test(id))) type = 'excavator';
    else if(eq.some(id=>/^BL/i.test(id))) type = 'bulldozer';
    else if(eq.some(id=>/^TR/i.test(id))) type = 'dumptruck';
    else {
      const n = project.name || '';
      if(/excav/i.test(n)) type = 'excavator';
      else if(/dumper|dump|truck/i.test(n)) type = 'dumptruck';
      else if(/bulldozer|dozer/i.test(n)) type = 'bulldozer';
      else type = 'excavator';
    }
    const buf = modelsBuffers[type];
    if(!buf){
      console.warn('[three-loader] model buffer not available for type', type, 'project', project.id);
      return;
    }
    try {
      const obj = await parseGLBBufferToObject(buf);
      obj.scale.setScalar(0.6);
      const group = new THREE.Group();
      group.add(obj);
      const pos = latLngToThreePos(project.coords);
      group.position.copy(pos);
      group.rotation.y = Math.PI;
      scene.add(group);
      modelObjects[project.id] = { group, project, type };
      renderer.render(scene, camera);
    } catch(err){
      console.error('[three-loader] error parsing GLB for project', project.id, err);
    }
  }

  function removeModelForProject(projectId){
    const rec = modelObjects[projectId];
    if(rec && rec.group){
      scene.remove(rec.group);
      delete modelObjects[projectId];
      renderer.render(scene, camera);
    }
  }

  function updateModelsPositions(){
    Object.values(modelObjects).forEach(rec => {
      const pos = latLngToThreePos(rec.project.coords);
      rec.group.position.copy(pos);
      const scaleFactor = 1;
      rec.group.scale.setScalar(0.6 * scaleFactor);
    });
    renderer.render(scene, camera);
  }

  async function onProjectsChanged(projects){
    if(!projects) projects = [];
    const ids = new Set(projects.map(p=>p.id));
    Object.keys(modelObjects).forEach(id=>{
      if(!ids.has(id)) removeModelForProject(id);
    });
    for(const p of projects){
      if(modelObjects[p.id]){
        modelObjects[p.id].project = p;
        updateModelsPositions();
      } else {
        await attachModelToProject(p);
      }
    }
  }

  async function initialize(){
    try {
      initThreeOverlay();
      // حاول تحميل ZIP محلي (assets/GLB.zip)؛ إن لم يكن متاحًا لن يحدث فشل جارٍ (fallback CSS3D)
      fetchAndExtractZipLocal(ZIP_URL);

      document.addEventListener('saas:ready', (e)=>{
        const { projects = [] } = e.detail || {};
        if(zipLoaded) onProjectsChanged(projects);
        else {
          document.addEventListener('three:zipLoaded', ()=> onProjectsChanged(projects), { once: true });
        }
      });

      document.addEventListener('saas:projectsChanged', (e)=>{
        const { projects = [] } = e.detail || {};
        if(zipLoaded) onProjectsChanged(projects);
        else {
          document.addEventListener('three:zipLoaded', ()=> onProjectsChanged(projects), { once: true });
        }
      });

      document.addEventListener('three:zipLoaded', (ev)=>{
        if(!ev.detail.ok){
          console.warn('[three-loader] ZIP load failed:', ev.detail.error);
        } else {
          console.info('[three-loader] ZIP loaded successfully');
        }
      });

      map.on('move', updateModelsPositions);
      map.on('zoom', updateModelsPositions);

      function animate(){
        requestAnimationFrame(animate);
        const zoom = map.getZoom ? map.getZoom() : 13;
        Object.values(modelObjects).forEach(rec=>{
          if(rec && rec.group){
            rec.group.rotation.z = Math.sin(Date.now() * 0.001 + (rec.project.id?.length || 0)) * 0.02;
            const s = 0.6 * Math.min(1.0, Math.max(0.4, (zoom / 13)));
            rec.group.scale.setScalar(s);
          }
        });
        renderer.render(scene, camera);
      }
      animate();

    } catch(e){
      console.error('[three-loader] initialization error', e);
    }
  }

  function tryInit(){
    if(window.map && window.THREE && window.JSZip && window.THREE.GLTFLoader){
      initialize();
    } else {
      setTimeout(tryInit, 300);
    }
  }
  tryInit();

})();
