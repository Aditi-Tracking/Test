const OS_APP_ID = '5b1d05e6-49bb-4b53-b3de-c57e83b4e229';
  const PUSH_URL  = 'https://rramdtpabwjsndgkohbi.supabase.co/functions/v1/send-push';
  let _osReady = false;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    try {
      await OneSignal.init({
        appId: OS_APP_ID,
        notifyButton: { enable: false },
        welcomeNotification: { disable: true },
        serviceWorkerPath: 'OneSignalSDKWorker.js'
      });
      _osReady = true;
      _osSyncBtn();
    } catch(e) { console.warn('OneSignal init:', e); }
  });

  function osIsSubscribed() {
    try { return _osReady && !!window.OneSignal?.User?.PushSubscription?.optedIn; } catch(e) { return false; }
  }

  function _osSyncBtn() {
    const btn   = document.getElementById('osNotifBtn');
    const pill  = document.getElementById('osNotifPill');
    const label = document.getElementById('osNotifLabel');
    const icon  = document.getElementById('osNotifIcon');
    if (!btn) return;
    if (osIsSubscribed()) {
      if (icon)  icon.textContent  = '🔔';
      if (label) label.textContent = 'Notifications ON';
      if (pill)  { pill.textContent = 'ON'; pill.style.background = 'rgba(0,212,170,0.2)'; pill.style.color = '#00d4aa'; }
      btn.style.borderColor = 'rgba(0,212,170,0.5)';
    } else {
      if (icon)  icon.textContent  = '🔕';
      if (label) label.textContent = 'Enable Notifications';
      if (pill)  { pill.textContent = 'OFF'; pill.style.background = 'rgba(120,120,120,0.12)'; pill.style.color = 'var(--muted)'; }
      btn.style.borderColor = 'rgba(0,212,170,0.22)';
    }
  }

  async function osToggle() {
    if (!_osReady) { _osToast('⏳ Wait'); return; }
    if (osIsSubscribed()) {
      await window.OneSignal.User.PushSubscription.optOut();
      setTimeout(_osSyncBtn, 500);
      _osToast('🔕 Notifications Off');
    } else {
      await window.OneSignal.User.PushSubscription.optIn();
      setTimeout(_osSyncBtn, 1000);
      _osToast('🔔 Notifications ON!');
    }
  }

  // Supabase Edge Function ke through — CORS problem nahi!
  async function osSendPush(title, message) {
    try {
      const r = await fetch(PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message })
      });
      const d = await r.json();
      console.log('Push sent:', d);
    } catch(e) { console.warn('osSendPush error:', e); }
  }

  function _osToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      background:#1e1e2e;border:1px solid rgba(255,255,255,0.12);color:#fff;
      border-radius:12px;padding:11px 22px;font-size:0.84rem;font-weight:600;
      box-shadow:0 8px 28px rgba(0,0,0,0.4);z-index:99999;white-space:nowrap;
      opacity:0;transition:opacity 0.25s;`;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; });
    setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(),400); }, 3000);
  }

// ===== next block =====

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║              [JS MAIN] — PORTAL JAVASCRIPT STARTS HERE                      ║
// ║  Yeh poora portal ka brain hai — sab logic/functions yahan hain             ║
// ║                                                                              ║
// ║  SECTIONS IN ORDER:                                                          ║
// ║  1. NAVIGATION       (~line 6123) — panel switching, prefetch               ║
// ║  2. USER SHEET       (~line 6161) — profile popup, sync UI                  ║
// ║  3. PROFILE MODAL    (~line 6202) — profile details fetch/fill              ║
// ║  4. PROFILE PHOTO    (~line 6322) — photo upload to Supabase storage        ║
// ║  5. VIDEO SECTION    (~line 6375) — switchDB, initHistory, panel routing    ║
// ║  6. SUPABASE SETUP   (~line 6560) — URL, ANON key, SB_HDRS helpers         ║
// ║  7. LEADS DASHBOARD  (~line 6600) — loadLeads, charts, filters, table       ║
// ║  8. COLLECTION DASH  (~line 6780) — loadColl, charts, filters               ║
// ║  9. FMS O2D          (~line 7087) — fmsLoadData, filters, table             ║
// ║  10. TASKS CHECKLIST (~line 7477) — loadTasks, markTaskDone, upload         ║
// ║  11. CONTENT NODES   (~line 11470) — CN system, file overlays               ║
// ║  12. DEPT PANELS     (~line 11830) — HR, Sales, After Sales etc.            ║
// ║  13. CRM VEHICLE     (~line 16600) — loadCRM, server switch, vehicle data   ║
// ║  14. IMS DASHBOARD   (~line 17100) — loadIMS, stock tables                  ║
// ║  15. CELEBRATIONS    (~line 18100) — birthday/anniversary system            ║
// ║  16. REFERRAL SYSTEM (~line 19200) — loadReferral, openings, applications   ║
// ║  17. ANNOUNCEMENTS   (~line 19890) — loadAnnouncements, wish system         ║
// ║  18. QUIZ SYSTEM     (~line 20460) — quizzes, timer, result, grading        ║
// ║  19. PORTAL UPDATES  (~line 22490) — MIS post/edit/delete updates           ║
// ║  20. AUTH / LOGIN    (~line 9700)  — doLogin, doLogout, Supabase Auth       ║
// ║  21. PERMISSIONS     (~line 10150) — PERMISSIONS object, per-user control   ║
// ║  22. VENDOR MODULE   (~line 23220) — purchase approval, pay, bulk-pay       ║
// ║  23. IDLE TIMEOUT    (~line 22640) — auto-logout after inactivity           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════
let lLoaded=false,cLoaded=false;
// Pre-fetch data caches
let _leadsCache=null, _collCache=null, _tasksCache=null, _fmsCache=null;

function prefetchAllData(){
  const _isOwner = CURRENT_USER && CURRENT_USER.role === 'owner';
  const myEmail = CURRENT_USER ? encodeURIComponent(String(CURRENT_USER.email||'').trim().toLowerCase()) : '';
  const myName = CURRENT_USER ? encodeURIComponent(String(CURRENT_USER.name||'').trim().toLowerCase()) : '';

  if(!_tasksCache){
    // Supabase se prefetch — background mein loadTasks trigger karo
    Promise.resolve().then(()=>{
      _tasksAllReady=true;
      if(!tLoaded){
        tLoaded=true;
        setTimeout(()=>{ try{ loadTasks(); }catch(e){ } }, 0);
      }
    });
  }

  // Managing Director/MIS/PC: also fetch leads, collection, FMS in background
  if(_isOwner){
    if(!_leadsCache) fetch(L_URL).then(r=>r.json()).then(d=>{_leadsCache=d;}).catch(()=>{});
    if(!_collCache)  fetch(C_URL).then(r=>r.json()).then(d=>{_collCache=d;}).catch(()=>{});
    if(!_fmsCache)   fetch(FMS_API).then(r=>r.text()).then(d=>{_fmsCache=d;}).catch(()=>{});
  }
}
function toggleUserPopup(e){
  if(e) e.stopPropagation();
  openUserSheet();
}
document.addEventListener('click',function(e){
  if(!e.target.closest('.bn-user-profile')){const p=document.getElementById('bnUserPopup');if(p)p.classList.remove('open');}
});

// ─── USER BOTTOM SHEET ───────────────────────────────────────────────────────
function _syncProfileUI(){
  if(typeof CURRENT_USER==='undefined' || !CURRENT_USER) return;
  const name     = CURRENT_USER.name || CURRENT_USER.email.split('@')[0] || 'User';
  const rawRole  = CURRENT_USER.rawRole || 'employee';
  const roleLabel= rawRole === 'owner' ? 'Managing Director' : rawRole.split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
  const roleIcon = rawRole === 'owner' ? '👑' : rawRole === 'mis' ? '📊' : rawRole === 'pc' ? '💼' : rawRole === 'executive assistant' || rawRole === 'ea' ? '🤝' : '👤';
  const initial  = name.charAt(0).toUpperCase();
  // Desktop sidebar
  const sbpAv=document.getElementById('sbpAvatar'); if(sbpAv) sbpAv.textContent=initial;
  const sbpNm=document.getElementById('sbpName');   if(sbpNm) sbpNm.textContent=name;
  const sbpRl=document.getElementById('sbpRole');   if(sbpRl) sbpRl.textContent=roleIcon+' '+roleLabel;
  // Mobile bottom nav
  const bnpAv=document.getElementById('bnpAvatar'); if(bnpAv) bnpAv.textContent=initial;
  const bnpNm=document.getElementById('bnpName');   if(bnpNm) bnpNm.textContent=name.split(' ')[0];
  // Mobile sheet header (pre-fill)
  const usAv=document.getElementById('usAvatar'); if(usAv) usAv.textContent=initial;
  const usNm=document.getElementById('usName');   if(usNm) usNm.textContent=name;
  const usRl=document.getElementById('usRole');   if(usRl) usRl.textContent=roleLabel;
}

// ─── USER BOTTOM SHEET (Mobile only) ─────────────────────────────────────────
function openUserSheet(){
  _syncProfileUI();
  const overlay=document.getElementById('userSheetOverlay');
  const sheet=document.getElementById('userSheet');
  if(!overlay||!sheet) return;
  overlay.style.display='block'; sheet.style.display='block';
  requestAnimationFrame(()=>{ sheet.style.transform='translateY(0)'; });
}
function closeUserSheet(){
  const sheet=document.getElementById('userSheet');
  if(sheet){
    sheet.style.transform='translateY(100%)';
    setTimeout(()=>{
      sheet.style.display='none';
      const ov=document.getElementById('userSheetOverlay'); if(ov) ov.style.display='none';
    },280);
  }
}

// ─── PROFILE DETAILS MODAL ───────────────────────────────────────────────────
function showProfileDetails(){
  closeUserSheet();
  const overlay=document.getElementById('profileModalOverlay');
  const modal=document.getElementById('profileModal');
  if(!overlay||!modal) return;
  overlay.style.display='block'; modal.style.display='block';

  const loadMsg=document.getElementById('pmLoadingMsg');
  const grid=document.getElementById('pmDetailsGrid');
  const errMsg=document.getElementById('pmErrorMsg');
  if(loadMsg) loadMsg.style.display='block';
  if(grid)    grid.style.display='none';
  if(errMsg)  errMsg.style.display='none';

  const name   =(typeof CURRENT_USER!=='undefined'&&CURRENT_USER&&CURRENT_USER.name)    ? CURRENT_USER.name    : 'User';
  const email  =(typeof CURRENT_USER!=='undefined'&&CURRENT_USER&&CURRENT_USER.email)   ? String(CURRENT_USER.email).trim() : '';
  const rawRole=(typeof CURRENT_USER!=='undefined'&&CURRENT_USER&&CURRENT_USER.rawRole) ? CURRENT_USER.rawRole : '';

  // Photo wrap reset karo — _fillProfileModal previous run mein innerHTML replace kar deta hai
  // jisse pmAvatarLetter span destroy ho jata hai. Yahan dobara create karo.
  const photoWrap=document.getElementById('pmPhotoWrap');
  if(photoWrap) photoWrap.innerHTML='<span id="pmAvatarLetter">'+name.charAt(0).toUpperCase()+'</span>';
  const upStatus=document.getElementById('pmUploadStatus'); if(upStatus) upStatus.textContent='';

  // Safe DOM updates — element null ho toh skip
  const _set=(id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=val; };
  _set('pmName', name);
  _set('pmDept', rawRole ? rawRole.charAt(0).toUpperCase()+rawRole.slice(1) : 'Employee');
  _set('pmAvatarLetter', name.charAt(0).toUpperCase());

  const _hdrs = SB_HDRS();

  // DEBUG: console mein dikhao kya search ho raha hai

  // Step 1 – Email_Id se match karo (most reliable — email unique hota hai)
  const tryEmailLookup = email
    ? fetch(`${SUPABASE_URL}/rest/v1/Employee_details?select=*&Email_Id=ilike.${encodeURIComponent(email)}&limit=1`,{headers:_hdrs}).then(r=>r.json())
    : Promise.resolve([]);

  tryEmailLookup
  .then(rows=>{
    if(rows&&rows.length>0){ _fillProfileModal(rows[0],name,rawRole,grid,errMsg,loadMsg); return null; }
    // Step 2 – Employee_name exact match fallback
    const encodedName=encodeURIComponent(name.trim());
    return fetch(`${SUPABASE_URL}/rest/v1/Employee_details?select=*&Employee_name=ilike.${encodedName}&limit=1`,{headers:_hdrs}).then(r=>r.json());
  })
  .then(rows=>{
    if(rows===null) return null; // already filled in step 1
    if(rows&&rows.length>0){ _fillProfileModal(rows[0],name,rawRole,grid,errMsg,loadMsg); return null; }
    // Step 3 – first name only fallback
    const firstName=name.trim().split(/\s+/)[0];
    if(firstName&&firstName.toLowerCase()!==name.toLowerCase()){
      return fetch(`${SUPABASE_URL}/rest/v1/Employee_details?select=*&Employee_name=ilike.${encodeURIComponent(firstName)}&limit=1`,{headers:_hdrs}).then(r=>r.json()).then(rows2=>{
        if(rows2&&rows2.length>0){ _fillProfileModal(rows2[0],name,rawRole,grid,errMsg,loadMsg); return null; }
        _profileNotFound(name,loadMsg,errMsg);
        return null;
      });
    }
    _profileNotFound(name,loadMsg,errMsg);
    return null;
  })
  .catch(err=>{ if(loadMsg)loadMsg.style.display='none'; if(errMsg){errMsg.style.display='block';errMsg.textContent='⚠️ Network error.';} });
}
function _profileNotFound(name,loadMsg,errMsg){
  if(loadMsg) loadMsg.style.display='none';
  const _em=(typeof CURRENT_USER!=='undefined'&&CURRENT_USER&&CURRENT_USER.email)?CURRENT_USER.email:'';
  if(errMsg){ errMsg.style.display='block'; errMsg.textContent='⚠️ Record not found. (Name: "'+name+'"'+(_em?', Email: '+_em:'')+') — Please contact MIS.'; }
}
function _fillProfileModal(row,name,rawRole,grid,errMsg,loadMsg){
  if(loadMsg) loadMsg.style.display='none';
  const _set=(id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=val; };
  const photoUrl=row['avatar_url']||row['Link']||row['link']||row['Photo']||null;
  const photoWrap=document.getElementById('pmPhotoWrap');
  if(photoWrap) {
    if(photoUrl) {
      photoWrap.innerHTML=`<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.innerHTML='<span id=&quot;pmAvatarLetter&quot;>'+(this.alt||'?').charAt(0).toUpperCase()+'</span>'" alt="${(row['Employee_name']||name)}">`;
    } else {
      photoWrap.innerHTML=`<span id="pmAvatarLetter">${(row['Employee_name']||name).charAt(0).toUpperCase()}</span>`;
    }
  }
  // Agar avatar_url hai toh CURRENT_USER mein bhi save karo aur UI sync karo
  if(row['avatar_url'] && typeof CURRENT_USER !== 'undefined' && CURRENT_USER) {
    CURRENT_USER.avatar_url = row['avatar_url'];
    localStorage.setItem('aditiUser', JSON.stringify(CURRENT_USER));
    _syncProfileUI();
    // Update sidebar avatar with actual photo
    const sbAv = document.getElementById('sidebarUserAvatar');
    if (sbAv) sbAv.innerHTML = `<img src="${row['avatar_url']}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent='${(CURRENT_USER.name||'?')[0].toUpperCase()}'">`;
  }
  const dbName=row['Employee_name']||name;
  const dbDept=row['Employee_Dept']||row['Emp_Dept']||rawRole||'—';
  _set('pmName', dbName);
  _set('pmDept', dbDept.charAt(0).toUpperCase()+dbDept.slice(1));
  _set('pmAvatarLetter', dbName.charAt(0).toUpperCase());
  function fmtDate(d){ if(!d)return'—'; try{return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}catch{return d;} }
  _set('pmEmail',    row['Email_Id']||row['Email']||'—');
  _set('pmPhone',    row['Phone Number']||row['Phone_Number']||'—');
  _set('pmLocation', row['Location']||row['location']||'—');
  _set('pmDOJ',      fmtDate(row['Date Of Joining']||row['Date_Of_Joining']));
  _set('pmDOB',      fmtDate(row['Date of Birth']||row['Date_of_Birth']));
  if(grid) grid.style.display='grid';
}
function closeProfileModal(){
  const ov=document.getElementById('profileModalOverlay'); if(ov) ov.style.display='none';
  const md=document.getElementById('profileModal');        if(md) md.style.display='none';
}

// Download access — in emails ko Training Videos download karne ki permission hai
const VIDEO_DOWNLOAD_EMAILS = [
  'care3@adititracking.com',   // Akshay More
  'mis@adititracking.com',     // Hemant (MIS)
  'mis1@adititracking.com',    // Krishna (MIS)
  'chirag@adititracking.com',  // Managing Director
];
function _canDownloadVideo() {
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return false;
  return PERMISSIONS.can_download_video === 'true';
}

// ─── PROFILE PHOTO UPLOAD ────────────────────────────────────────────────────
function handleProfilePhotoUpload(input) {
  const file = input.files && input.files[0];
  if (!file) return;

  // Sirf image allow karo
  if (!file.type.startsWith('image/')) {
    _pmUploadMsg('❌ Please select an image file only.', '#ff5c7c');
    return;
  }
  // 5MB limit
  if (file.size > 5 * 1024 * 1024) {
    _pmUploadMsg('❌ File must be smaller than 5MB.', '#ff5c7c');
    return;
  }
  uploadProfilePhoto(file);
  // Reset input so same file dobara select ho sake
  input.value = '';
}

function _pmUploadMsg(msg, color) {
  const el = document.getElementById('pmUploadStatus');
  if (el) { el.textContent = msg; el.style.color = color || 'var(--muted)'; }
}

async function uploadProfilePhoto(file) {
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return;
  const email = String(CURRENT_USER.email || '').trim().toLowerCase();
  if (!email) { _pmUploadMsg('❌ Email not found.', '#ff5c7c'); return; }

  _pmUploadMsg('⏳ Uploading...', '#f0a500');

  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const filePath = `avatars/${email}.${ext}`;
    const bucket   = 'Employee_Photos';
    const hdrs = {
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${_currentToken}`,
      'Content-Type': file.type,
      'Cache-Control': '3600',
      'x-upsert': 'true'   // agar file already hai toh overwrite karo
    };

    // 1. Storage mein upload
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`,
      { method: 'POST', headers: hdrs, body: file }
    );

    if (!uploadRes.ok) {
      const errTxt = await uploadRes.text();
      throw new Error('Upload failed: ' + errTxt);
    }

    // 2. Public URL banao
    // Cache bust ke liye timestamp add karo
    const ts = Date.now();
    const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}?t=${ts}`;

    // 3. Employee_details table mein avatar_url update karo
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/Employee_details?Email_Id=ilike.${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${_currentToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ avatar_url: avatarUrl })
      }
    );

    if (!patchRes.ok) {
      const errTxt2 = await patchRes.text();
      throw new Error('DB update failed: ' + errTxt2);
    }

    // 4. CURRENT_USER mein save karo + localStorage update
    CURRENT_USER.avatar_url = avatarUrl;
    localStorage.setItem('aditiUser', JSON.stringify(CURRENT_USER));

    // 5. Profile modal photo update karo
    const photoWrap = document.getElementById('pmPhotoWrap');
    if (photoWrap) {
      photoWrap.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="Profile">`;
    }

    // 6. Home page banner photo bhi update karo (live)
    const homeBanner = document.getElementById('empProfileBanner');
    if (homeBanner) {
      // Koi bhi purana photo element dhundho — wrap, loading, ya placeholder
      const targetEl = homeBanner.querySelector('.emp-photo-wrap')
                    || homeBanner.querySelector('.emp-photo-loading')
                    || homeBanner.querySelector('.emp-photo-placeholder');
      if (targetEl) {
        const newWrap = document.createElement('div');
        newWrap.className = 'emp-photo-wrap';
        const newImg = document.createElement('img');
        newImg.src = avatarUrl;
        newImg.alt = CURRENT_USER.name || 'Profile';
        newImg.style.cssText = 'width:90px;height:90px;object-fit:cover;border-radius:50%;';
        newWrap.appendChild(newImg);
        targetEl.replaceWith(newWrap);
      }
      // Banner visible karo agar hidden hai
      homeBanner.style.display = 'flex';
    }

    // 7. Sidebar, bottom nav, user sheet — sab update karo
    _syncProfileUI();

    _pmUploadMsg('✅ Photo updated successfully!', '#00d4aa');

  } catch(err) {
    _pmUploadMsg('❌ ' + (err.message || 'Upload failed. Please try again.'), '#ff5c7c');
  }
}
// ─────────────────────────────────────────────────────────────────────────────


function toggleDashboardAccordion(){
  var grp=document.getElementById('dashboardSubGroup');
  var arrow=document.getElementById('dashAccordionArrow');
  var trigger=document.getElementById('nav-dashboards-trigger');
  if(!grp)return;
  if(grp.style.display==='none'||grp.style.display===''){
    grp.style.display='block';
    if(arrow)arrow.classList.add('open');
    if(trigger)trigger.classList.add('dash-open');
  } else {
    grp.style.display='none';
    if(arrow)arrow.classList.remove('open');
    if(trigger)trigger.classList.remove('dash-open');
  }
}

function resourcesShowDocs(){
  document.getElementById('resources-main').style.display='none';
  document.getElementById('resources-docs').style.display='block';
  window.scrollTo({top:0,behavior:'smooth'});
}
function resourcesShowMain(){
  document.getElementById('resources-docs').style.display='none';
  document.getElementById('resources-main').style.display='block';
  window.scrollTo({top:0,behavior:'smooth'});
}


// ═══════════════════════════════════════════════════════════
// GLOBAL VIDEO MANAGER — Ek waqt mein sirf ek video
// Jab koi naya video play hota hai, baaki sab automatically pause
// ═══════════════════════════════════════════════════════════
function pauseAllVideosExcept(exceptId) {
  document.querySelectorAll('video').forEach(function(v) {
    if (v.id !== exceptId && !v.paused) {
      v.pause();
    }
  });
}

function switchDB(id, fromPopState){
  _actOnPageSwitch(id); // ACTIVITY TRACKING: log previous page time, start new page timer
  document.querySelectorAll('.dashboard-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelectorAll('.bn-item').forEach(n=>n.classList.remove('active'));
  // Auto-open dashboard accordion when a sub-dashboard is selected
  var dashPanels=['leads','collection','fms','tasks','ims','crm','mapping'];
  if(dashPanels.indexOf(id)>=0){
    var grp=document.getElementById('dashboardSubGroup');
    var arrow=document.getElementById('dashAccordionArrow');
    var trigger=document.getElementById('nav-dashboards-trigger');
    if(grp){grp.style.display='block';}
    if(arrow){arrow.classList.add('open');}
    if(trigger){trigger.classList.add('dash-open');}
  }
  // Reset Resources sub-view when switching away
  if(id!=='resources'){
    var rm=document.getElementById('resources-main');
    var rd=document.getElementById('resources-docs');
    if(rm){rm.style.display='block';}
    if(rd){rd.style.display='none';}
  }
  var panel=document.getElementById('panel-'+id);
  if(!panel){
    // Fallback for coming-soon panels — show home
    document.getElementById('panel-home').classList.add('active');
    document.getElementById('nav-home').classList.add('active');
    return;
  }
  panel.classList.add('active');
  if(document.getElementById('nav-'+id)) document.getElementById('nav-'+id).classList.add('active');
  if(document.getElementById('bn-'+id)) document.getElementById('bn-'+id).classList.add('active');
  // Scroll to top on mobile
  window.scrollTo({top:0,behavior:'smooth'});
  const _up=document.getElementById('bnUserPopup');if(_up)_up.classList.remove('open');
  if(id==='leads'&&!lLoaded){lLoaded=true;loadLeads();}
  if(id==='collection'&&!cLoaded){cLoaded=true;loadColl();}
  if(id==='tasks'&&!tLoaded){tLoaded=true;loadTasks();}
  if(id==='hr'){loadHRSection();}
  if(id==='sales'&&!salesDocsLoaded){loadSalesDocs();}
  if(id==='aftersales'&&!afterSalesLoaded){loadAfterSales();}
  if(id==='products'&&!prodLoaded){loadProducts();}
  if(id==='training'){loadTrainingSection();}
  if(id==='marketing'){loadMarketingCounts();}
  if(id==='ims')      { loadIMSDashboard(); }
  if(id==='crm')      { loadCRMDashboard(); }
  if(id==='mapping')   { loadMappingDashboard(); }
  if(id==='adminperms') { loadAdminPermsPanel(); }
  if(id==='finance')    { loadSimpleCNPanel('finance',    'Finance').then(()=>_injectPurchaseCard()); }
  if(id==='compliance') { loadSimpleCNPanel('compliance', 'Compliance'); }
  if(id==='referral')   { initReferralProgramme(); }
  if(id==='announcements') { /* handled by override below */ }
  if(id==='activitylog') { loadActivityLog(); }
  if(id==='itadmin')    { loadSimpleCNPanel('itadmin',    'IT Admin');   }
  // Training panel needs no data loading — just shows static links
  // Push history state so back button returns to home
  if(!fromPopState){
    if(id==='home'){
      history.replaceState({panel:'home'},'','');
    } else {
      history.pushState({panel:id},'','');
    }
  }
}

// Handle browser/phone back button — always go to home
window.addEventListener('popstate', function(e){
  const panel = (e.state && e.state.panel) ? e.state.panel : 'home';
  switchDB(panel==='home' ? 'home' : 'home', true);
});

// On portal load, set initial history state
function initHistory(){
  history.replaceState({panel:'home'},'','');
}

// ╔══════════════════════════════════════════════════════════════════════════
// ║  [SUPABASE SETUP] — Database connection constants
// ║  SUPABASE_URL  = Supabase project ka URL (kabhi change mat karo)
// ║  SUPABASE_ANON = Public anon key (safe to expose — RLS protect karta hai)
// ║  _currentToken = Login ke baad user's JWT replace karta hai anon key ko
// ║  SB_HDRS()     = Har API call mein yahi headers lagao
// ║  IMPORTANT: Agar Supabase project change karo toh DONO URL + ANON update karo
// ╚══════════════════════════════════════════════════════════════════════════
// ── Supabase constants + header helpers (defined early — used throughout) ──
const SUPABASE_URL  = 'https://rramdtpabwjsndgkohbi.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyYW1kdHBhYndqc25kZ2tvaGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDQ4ODUsImV4cCI6MjA5MTQ4MDg4NX0.hpdTOkhRrbqmbPM6VJWEtz2oEjkeXAjYJQS9rgzheec';
// ── Auth token — login ke baad user JWT yahan save hota hai ──
let _currentToken = SUPABASE_ANON; // default: anon; login hone pe user JWT set hoga

// SB_HDRS ab _currentToken use karta hai — authenticated RLS policies kaam karengi
// SB_HDRS_JSON / SB_HDRS_REPR / SB_HDRS_MIN sab inhi se extend hote hain — auto-fix!
const SB_HDRS      = () => ({ 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${_currentToken}`, 'Accept': 'application/json' });
const SB_HDRS_JSON = () => ({ ...SB_HDRS(), 'Content-Type': 'application/json' });
const SB_HDRS_REPR = () => ({ ...SB_HDRS_JSON(), 'Prefer': 'return=representation' });
const SB_HDRS_MIN  = () => ({ ...SB_HDRS_JSON(), 'Prefer': 'return=minimal' });

// SB_HDRS_AUTH alias — purana code jo SB_HDRS_AUTH() use karta hai vo bhi kaam kare
const SB_HDRS_AUTH      = SB_HDRS;
const SB_HDRS_AUTH_JSON = SB_HDRS_JSON;

// ═══════════════════════════════════
// LEAD TRACKING DASHBOARD
// ═══════════════════════════════════
const L_URL='https://script.google.com/macros/s/AKfycbxsC_glUfbC5RJSs0BPFYQI5jbsM5p6VeIraKcl-cO8zC8VjVnLqFYQuumhRP69oEy2/exec';
const REP_MAP={'supportmum@adititracking.com':{name:'Support MUM',color:'#f0a500',bg:'rgba(240,165,0,0.2)'},'salesmumbai@adititracking.com':{name:'Sales Mumbai',color:'#00d4aa',bg:'rgba(0,212,170,0.2)'},'salesgoa@adititracking.com':{name:'Sales Goa',color:'#ff5c7c',bg:'rgba(255,92,124,0.2)'},'salesgujarat@adititracking.com':{name:'Sales Gujarat',color:'#a78bfa',bg:'rgba(167,139,250,0.2)'},'coolbus.enterprise@adititracking.com':{name:'CoolBus',color:'#4e9af1',bg:'rgba(78,154,241,0.2)'}};
const rN=e=>REP_MAP[e]?.name||(String(e||'')).split('@')[0];
const rC=e=>REP_MAP[e]?.color||'#888';
const rB=e=>REP_MAP[e]?.bg||'rgba(128,128,128,0.2)';
const rI=e=>rN(e).charAt(0).toUpperCase();
// Set Chart.js global defaults based on current theme on initial load
(function(){
  const isLight = document.body.classList.contains('light-mode');
  const tc = isLight ? '#000000' : '#ffffff';
  const gc = isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)';
  if(typeof Chart !== 'undefined'){
    Chart.defaults.color = tc;
    Chart.defaults.borderColor = gc;
    Chart.defaults.font.family = 'DM Sans';
  }
})();
let L=[],Lf=[],Lch={},Lp=1,Lsk=null,Lsd=1,Ltype='',Lkpi=null;
let Lcf={leadType:null,source:null,solution:null,product:null};
const LPP=15;
async function loadLeads(){
  document.getElementById('leadsTxt').textContent='Fetching data from Google Sheet...';
  try{
    let rows;
    if(_leadsCache){rows=_leadsCache;_leadsCache=null;}
    else{const res=await fetch(L_URL);if(!res.ok)throw new Error(res.status);rows=await res.json();}
    // Normalize {h:[headers], r:[[row],[row]]} compressed format → array of objects
    if(rows&&!Array.isArray(rows)&&rows.h&&rows.r){
      const headers=rows.h;
      rows=rows.r.map(row=>{const obj={};headers.forEach((k,i)=>{obj[k]=row[i]??'';});return obj;});
    } else if(rows&&!Array.isArray(rows)&&rows.data&&Array.isArray(rows.data)){
      rows=rows.data;
    }
    // Auto-detect CustomerName column (handles different naming conventions)
    if(!Array.isArray(rows)||!rows.length)throw new Error('API returned empty or invalid data');
    const sampleKeys=Object.keys(rows[0]||{});
    const custCol=sampleKeys.find(k=>/customer.?name|client.?name|name|cust/i.test(k))||sampleKeys[0];
    const winCol=sampleKeys.find(k=>/win.?chance|winchance|chance|score/i.test(k))||'WinChances';
    const orderCol=sampleKeys.find(k=>/order.?value|value|amount|revenue/i.test(k))||'Order Value';
    const wonCol=sampleKeys.find(k=>/^won$|^win$|closed/i.test(k))||'Won';
    const sourceCol=sampleKeys.find(k=>/^source$/i.test(k))||'Source';
    const solutionCol=sampleKeys.find(k=>/^solution$/i.test(k))||'Solution';
    const heroCol=sampleKeys.find(k=>/hero.?product|product/i.test(k))||'Hero Product';
    const emailCol=sampleKeys.find(k=>/email.?address|emailaddress|email|rep/i.test(k))||'Emailaddress';
    const tsCol=sampleKeys.find(k=>/timestamp|date|created/i.test(k))||'Timestamp';
    const quoteCol=sampleKeys.find(k=>/quotation|quote/i.test(k))||'Quotation Sent';
    const demoCol=sampleKeys.find(k=>/demo/i.test(k))||'IstheDemoGiven';
    const fu1Col=sampleKeys.find(k=>/follow.?up.?1|followup.?1|fu.?1/i.test(k))||'Follow-up 1 ';
    const fu2Col=sampleKeys.find(k=>/follow.?up.?2|followup.?2|fu.?2/i.test(k))||'Follow-up 2 ';
    const fu3Col=sampleKeys.find(k=>/follow.?up.?3|followup.?3|fu.?3/i.test(k))||'Follow-up 3';
    const lostCol=sampleKeys.find(k=>/^lost$/i.test(k))||'Lost';
    L=rows.map(r=>{
      const n={};
      Object.keys(r).forEach(k=>{n[k]=r[k]===''||r[k]===undefined?null:r[k];});
      // Normalize to expected keys
      if(custCol!=='CustomerName')n['CustomerName']=r[custCol]||null;
      if(winCol!=='WinChances')n['WinChances']=r[winCol]||null;
      if(orderCol!=='Order Value')n['Order Value']=r[orderCol]||null;
      if(wonCol!=='Won')n['Won']=r[wonCol]||null;
      if(sourceCol!=='Source')n['Source']=r[sourceCol]||null;
      if(solutionCol!=='Solution')n['Solution']=r[solutionCol]||null;
      if(heroCol!=='Hero Product')n['Hero Product']=r[heroCol]||null;
      if(emailCol!=='Emailaddress')n['Emailaddress']=r[emailCol]||null;
      if(tsCol!=='Timestamp')n['Timestamp']=r[tsCol]||null;
      if(quoteCol!=='Quotation Sent')n['Quotation Sent']=r[quoteCol]||null;
      if(demoCol!=='IstheDemoGiven')n['IstheDemoGiven']=r[demoCol]||null;
      if(fu1Col!=='Follow-up 1 ')n['Follow-up 1 ']=r[fu1Col]||null;
      if(fu2Col!=='Follow-up 2 ')n['Follow-up 2 ']=r[fu2Col]||null;
      if(fu3Col!=='Follow-up 3')n['Follow-up 3']=r[fu3Col]||null;
      if(lostCol!=='Lost')n['Lost']=r[lostCol]||null;
      const wc=parseFloat(n['WinChances'])||0;
      n['LeadType']=wc<=2?'Cold':wc<=5?'Warm':'Hot';
      n['WinChances']=wc;
      n['Order Value']=n['Order Value']?parseFloat(n['Order Value'])||null:null;
      return n;
    }).filter(r=>r['CustomerName']);
    if(!L.length)throw new Error('No data — Column mismatch. Sheet columns: '+sampleKeys.slice(0,5).join(', ')+'...');
    document.getElementById('leadsLoad').style.display='none';document.getElementById('leadsCont').style.display='block';
    document.getElementById('leadsSync').textContent='Sync: '+new Date().toLocaleTimeString('en-IN');
    document.getElementById('leadsErr').style.display='none';
    lBuildFilters();lRenderAll();
  }catch(e){document.getElementById('leadsLoad').style.display='none';document.getElementById('leadsCont').style.display='block';document.getElementById('leadsErr').style.display='block';document.getElementById('leadsErr').textContent='⚠️ Data load failed: '+e.message;}
}
async function refreshLeads(){const b=document.getElementById('leadsRefBtn');b.classList.add('spinning');Object.values(Lch).forEach(c=>c&&c.destroy&&c.destroy());Lch={};document.getElementById('leadsLoad').style.display='flex';document.getElementById('leadsCont').style.display='none';await loadLeads();b.classList.remove('spinning');}
function lBuildFilters(){
  const src=[...new Set(L.map(r=>r['Source']).filter(Boolean))].sort();
  const sol=[...new Set(L.map(r=>r['Solution']).filter(Boolean))].sort();
  const rep=[...new Set(L.map(r=>r['Emailaddress']).filter(Boolean))];
  const s1=document.getElementById('lFSrc');s1.innerHTML='<option value="">All Sources</option>';src.forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;s1.appendChild(o);});
  const s2=document.getElementById('lFSol');s2.innerHTML='<option value="">All Solutions</option>';sol.forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;s2.appendChild(o);});
  const s3=document.getElementById('lFRep');s3.innerHTML='<option value="">All Reps</option>';rep.forEach(r=>{const o=document.createElement('option');o.value=r;o.textContent=rN(r);s3.appendChild(o);});
}
function lRenderAll(){lRenderKPIs();lRenderCharts();lRenderInsights();lApply();}
function lGetCF(){return L.filter(r=>{
  if(Lkpi&&Lkpi!=='all'){if(Lkpi==='won'&&r['Lead Status']!=='Won')return false;if(Lkpi==='hot'&&r['LeadType']!=='Hot')return false;if(Lkpi==='warm'&&r['LeadType']!=='Warm')return false;if(Lkpi==='cold'&&r['LeadType']!=='Cold')return false;if(Lkpi==='quoted'&&r['Quotation Sent']!=='Yes')return false;}
  if(Lcf.leadType&&r['LeadType']!==Lcf.leadType)return false;
  if(Lcf.source){const s=(r['Source']||'').replace('Google Ads','GoogleAds').replace('CustomerReferral','Referral').replace('Internal Reference','Internal');if(s!==Lcf.source)return false;}
  if(Lcf.solution&&r['Solution']!==Lcf.solution)return false;
  if(Lcf.product){const ps=(r['Hero Product']||'').split(/[,\/]/).map(p=>p.trim().replace(/\s+/g,'').toUpperCase());if(!ps.includes(Lcf.product))return false;}
  return true;
});}
// ── Global chart colour helper ──────────────────────────────────────────────
// Returns { tc, gc, gridDisplay } based on current theme
function chartColors(){
  const isLight=document.body.classList.contains('light-mode');
  const tc = isLight ? '#000000' : '#ffffff';
  const gc = isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)';
  if(typeof Chart !== 'undefined'){
    Chart.defaults.color = tc;
    Chart.defaults.borderColor = gc;
  }
  return { tc, gc, noGrid: false };
}
// ────────────────────────────────────────────────────────────────────────────

function lRenderKPIs(){
  const t=L.length,w=L.filter(r=>r['Lead Status']==='Won').length,h=L.filter(r=>r['LeadType']==='Hot').length,wa=L.filter(r=>r['LeadType']==='Warm').length,c=L.filter(r=>r['LeadType']==='Cold').length;
  const rev=L.filter(r=>r['Lead Status']==='Won').reduce((s,r)=>s+(+r['Order Value']||0),0);
  const cr=t?((w/t)*100).toFixed(1):0,q=L.filter(r=>r['Quotation Sent']==='Yes').length,nfu=L.filter(r=>!r['Follow-up 1 ']&&r['Lead Status']!=='Won').length;
  const kpis=[{l:'Total Leads',v:t,s:'All time',a:'#f0a500',b:'Live',bb:'rgba(240,165,0,0.15)',fk:'all'},{l:'Won Deals',v:w,s:'₹'+(rev/1000).toFixed(0)+'K revenue',a:'#00d4aa',b:cr+'% conv.',bb:'rgba(0,212,170,0.15)',fk:'won'},{l:'🔥 Hot Leads',v:h,s:'Win > 5',a:'#ff5c7c',b:(t?((h/t)*100).toFixed(0):0)+'%',bb:'rgba(255,92,124,0.15)',fk:'hot'},{l:'🌤 Warm Leads',v:wa,s:'Win 3-5',a:'#f0a500',b:(t?((wa/t)*100).toFixed(0):0)+'%',bb:'rgba(240,165,0,0.15)',fk:'warm'},{l:'❄️ Cold Leads',v:c,s:'Win ≤ 2',a:'#4e9af1',b:'Nurturing',bb:'rgba(78,154,241,0.15)',fk:'cold'},{l:'Quotations',v:q,s:nfu+' need FU',a:'#a78bfa',b:(t?((q/t)*100).toFixed(0):0)+'%',bb:'rgba(167,139,250,0.15)',fk:'quoted'}];
  document.getElementById('lKpiGrid').innerHTML=kpis.map(k=>{const ia=Lkpi===k.fk&&Lkpi!==null&&Lkpi!=='all';return `<div class="kpi-card ${ia?'kpi-active':''}" style="--card-accent:${k.a};--card-color:${k.a}" onclick="lKpiClick('${k.fk}')"><div class="kpi-label">${k.l}</div><div class="kpi-value">${k.v}</div><div class="kpi-sub">${k.s}</div><span class="kpi-badge" style="background:${k.bb};color:${k.a}">${k.b}</span><div class="kpi-click-hint">${ia?'✕ Clear':'↗ Filter'}</div></div>`;}).join('');
}
function lKpiClick(fk){Lkpi=(Lkpi===fk&&fk!=='all')?null:fk;const m={won:'Won',hot:'Hot',warm:'Warm',cold:'Cold',quoted:'Quoted'};Ltype=Lkpi&&Lkpi!=='all'?m[Lkpi]||'':'';document.querySelectorAll('#panel-leads .filter-btn').forEach((b,i)=>b.classList.toggle('active',i===0));Object.values(Lch).forEach(c=>c&&c.destroy&&c.destroy());Lch={};lRenderAll();lBadge();}
function lBadge(){const b=document.getElementById('lCFBadge');const m={won:'Won Deals',hot:'🔥 Hot',warm:'🌤 Warm',cold:'❄️ Cold',quoted:'Quotations'};const ca=Object.values(Lcf).filter(Boolean);if((Lkpi&&Lkpi!=='all')||ca.length>0){b.style.display='flex';let p=[];if(Lkpi&&Lkpi!=='all')p.push('<strong style="color:var(--accent2)">'+m[Lkpi]+'</strong>');if(ca.length)p.push('<strong style="color:var(--accent)">'+ca.join(' + ')+'</strong>');b.innerHTML='🎯 Filter: '+p.join(' & ')+' <span onclick="lClearAll()" style="cursor:pointer;color:var(--hot);margin-left:8px;font-weight:600">✕ Clear All</span>';}else b.style.display='none';}
function lClearAll(){Lkpi=null;Ltype='';Lcf={leadType:null,source:null,solution:null,product:null};document.querySelectorAll('#panel-leads .filter-btn').forEach((b,i)=>b.classList.toggle('active',i===0));Object.values(Lch).forEach(c=>c&&c.destroy&&c.destroy());Lch={};lRenderAll();lBadge();}
function lCF(k,v){Lcf[k]=Lcf[k]===v?null:v;lBadge();lApply();Object.values(Lch).forEach(c=>c&&c.destroy&&c.destroy());Lch={};lRenderCharts();}
function lRenderCharts(){
  const D=lGetCF();const sc=['#f0a500','#00d4aa','#ff5c7c','#4e9af1','#a78bfa','#f97316','#10b981'];
  const {tc:lTC,gc:lGC,noGrid:lNG}=chartColors();
  const tc={Hot:0,Warm:0,Cold:0};D.forEach(r=>{if(tc[r['LeadType']]!==undefined)tc[r['LeadType']]++;});
  const tk=['Hot','Warm','Cold'];const tb=tk.map((k,i)=>Lcf.leadType&&Lcf.leadType!==k?(document.body.classList.contains('light-mode')?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.08)'):['#ff5c7c','#f0a500','#4e9af1'][i]);
  Lch.temp=new Chart(document.getElementById('lChTemp'),{type:'doughnut',data:{labels:['Hot 🔥','Warm 🌤','Cold ❄️'],datasets:[{data:[tc.Hot,tc.Warm,tc.Cold],backgroundColor:tb,borderWidth:0,hoverOffset:8}]},options:{cutout:'68%',onClick:(_,e)=>{if(e.length)lCF('leadType',tk[e[0].index]);},plugins:{legend:{position:'right',labels:{color:lTC,padding:10,font:{family:'DM Sans',size:10}}}},responsive:true,maintainAspectRatio:false}});
  document.getElementById('lChTemp').style.cursor='pointer';
  const so={};D.forEach(r=>{const s=(r['Source']||'Unknown').replace('Google Ads','GoogleAds').replace('CustomerReferral','Referral').replace('Internal Reference','Internal');so[s]=(so[s]||0)+1;});
  const ss=Object.entries(so).sort((a,b)=>b[1]-a[1]);
  Lch.src=new Chart(document.getElementById('lChSrc'),{type:'bar',data:{labels:ss.map(([k])=>k),datasets:[{data:ss.map(([,v])=>v),backgroundColor:ss.map(([k],i)=>Lcf.source&&Lcf.source!==k?(document.body.classList.contains('light-mode')?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.06)'):sc[i%sc.length]),borderRadius:6,borderWidth:0}]},options:{indexAxis:'y',onClick:(_,e)=>{if(e.length)lCF('source',ss[e[0].index][0]);},plugins:{legend:{display:false}},scales:{x:{ticks:{color:lTC,font:{family:'DM Sans',size:10}},grid:{display:!lNG,color:lGC}},y:{ticks:{color:lTC,font:{family:'DM Sans',size:10}},grid:{display:false}}},responsive:true,maintainAspectRatio:false}});
  document.getElementById('lChSrc').style.cursor='pointer';
  const slc={};D.forEach(r=>{const s=r['Solution']||'Unknown';slc[s]=(slc[s]||0)+1;});const sk=Object.keys(slc);const slcol=['#00d4aa','#f0a500','#ff5c7c','#4e9af1','#a78bfa'];
  Lch.sol=new Chart(document.getElementById('lChSol'),{type:'doughnut',data:{labels:sk,datasets:[{data:Object.values(slc),backgroundColor:sk.map((k,i)=>Lcf.solution&&Lcf.solution!==k?(document.body.classList.contains('light-mode')?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.06)'):slcol[i%slcol.length]),borderWidth:0,hoverOffset:8}]},options:{cutout:'65%',onClick:(_,e)=>{if(e.length)lCF('solution',sk[e[0].index]);},plugins:{legend:{position:'right',labels:{color:lTC,padding:10,font:{family:'DM Sans',size:10}}}},responsive:true,maintainAspectRatio:false}});
  document.getElementById('lChSol').style.cursor='pointer';
  const dc={};D.forEach(r=>{let d=(r['Timestamp']||'').toString();if(d.match(/^\d{2}\/\d{2}\/\d{4}/)){const m=d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);d=m[3]+'-'+m[2]+'-'+m[1];}d=d.slice(0,10);if(d.length===10)dc[d]=(dc[d]||0)+1;});
  const ds=Object.keys(dc).sort();
  Lch.day=new Chart(document.getElementById('lChDay'),{type:'line',data:{labels:ds.map(d=>d.slice(5)),datasets:[{data:ds.map(d=>dc[d]),borderColor:'#a78bfa',backgroundColor:'rgba(167,139,250,0.1)',fill:true,tension:0.4,pointBackgroundColor:'#a78bfa',pointRadius:4,borderWidth:2}]},options:{plugins:{legend:{display:false}},scales:{x:{ticks:{color:lTC,font:{family:'DM Sans',size:10}},grid:{display:!lNG,color:lGC}},y:{ticks:{color:lTC,font:{family:'DM Sans',size:10}},grid:{display:!lNG,color:lGC}}},responsive:true,maintainAspectRatio:false}});
  const pc={};D.forEach(r=>{if(!r['Hero Product'])return;r['Hero Product'].split(/[,\/]/).map(p=>p.trim().replace(/\s+/g,'').toUpperCase()).filter(Boolean).forEach(p=>{pc[p]=(pc[p]||0)+1;});});
  const ps=Object.entries(pc).sort((a,b)=>b[1]-a[1]).slice(0,8);
  Lch.prod=new Chart(document.getElementById('lChProd'),{type:'bar',data:{labels:ps.map(([k])=>k),datasets:[{data:ps.map(([,v])=>v),backgroundColor:ps.map(([k])=>Lcf.product&&Lcf.product!==k?(document.body.classList.contains('light-mode')?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.06)'):'#ff5c7c'),borderRadius:6,borderWidth:0}]},options:{onClick:(_,e)=>{if(e.length)lCF('product',ps[e[0].index][0]);},plugins:{legend:{display:false}},scales:{x:{ticks:{color:lTC,font:{family:'DM Sans',size:9}},grid:{display:false}},y:{ticks:{color:lTC,font:{family:'DM Sans',size:10}},grid:{display:!lNG,color:lGC}}},responsive:true,maintainAspectRatio:false}});
  document.getElementById('lChProd').style.cursor='pointer';
}
function lRenderLB(){const el=document.getElementById('lLBoard');if(!el)return;const rc={},rw={};L.forEach(r=>{const e=r['Emailaddress'];if(!e)return;rc[e]=(rc[e]||0)+1;if(r['Lead Status']==='Won')rw[e]=(rw[e]||0)+1;});const sorted=Object.entries(rc).sort((a,b)=>b[1]-a[1]);const mx=sorted[0]?.[1]||1;el.innerHTML=sorted.map(([e,cnt],i)=>`<div class="lb-row"><span class="lb-rank">${i+1}</span><div style="background:${rB(e)};color:${rC(e)};width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.70rem;font-weight:700;flex-shrink:0">${rI(e)}</div><span style="font-size:0.83rem;flex:1;color:var(--text)">${rN(e)}</span><div class="lb-bar-wrap"><div class="lb-bar" style="width:${(cnt/mx*100).toFixed(0)}%;background:${rC(e)}"></div></div><span class="lb-count" style="color:${rC(e)}">${cnt}</span>${rw[e]?'<span style="font-size:0.73rem;color:var(--won);margin-left:3px">✓'+rw[e]+'</span>':''}</div>`).join('');}
function lRenderInsights(){
  const wd=L.filter(r=>r['Lead Status']==='Won'&&r['Order Value']);const tr=wd.reduce((s,r)=>s+(+r['Order Value']||0),0);const mx=[...wd].sort((a,b)=>(+b['Order Value']||0)-(+a['Order Value']||0))[0];
  document.getElementById('lRevIns').innerHTML=`<div class="insight-row"><span>Total Revenue</span><span class="insight-val">₹${tr.toLocaleString('en-IN')}</span></div><div class="insight-row"><span>Avg Deal</span><span class="insight-val">₹${wd.length?Math.round(tr/wd.length).toLocaleString('en-IN'):0}</span></div><div class="insight-row"><span>Biggest Deal</span><span class="insight-val">₹${mx?(+mx['Order Value']).toLocaleString('en-IN'):0}</span></div><div class="insight-row"><span>Won / Total</span><span class="insight-val">${wd.length} / ${L.length}</span></div><div class="insight-row"><span>Top Winner</span><span class="insight-val">${mx?rN(mx['Emailaddress']):'—'}</span></div>`;
  const wq=L.filter(r=>r['Quotation Sent']==='Yes').length,nfu=L.filter(r=>!r['Follow-up 1 ']&&r['Lead Status']!=='Won').length,dm=L.filter(r=>r['IstheDemoGiven']==='Yes').length,hnq=L.filter(r=>r['LeadType']==='Hot'&&!r['Quotation Sent']&&r['Lead Status']!=='Won').length,ls=L.filter(r=>r['Lost']&&r['Lost']!==null).length;
  document.getElementById('lPipeIns').innerHTML=`<div class="insight-row"><span>Quotations Sent</span><span class="insight-val">${wq}</span></div><div class="insight-row"><span>Demos Given</span><span class="insight-val">${dm} (${L.length?((dm/L.length)*100).toFixed(0):0}%)</span></div><div class="insight-row"><span>Hot w/o Quote ⚠️</span><span class="insight-val" style="color:var(--hot)">${hnq}</span></div><div class="insight-row"><span>No Follow-Up</span><span class="insight-val" style="color:var(--warm)">${nfu}</span></div><div class="insight-row"><span>Lost</span><span class="insight-val" style="color:var(--lost)">${ls}</span></div>`;
  const hf=L.filter(r=>r['LeadType']==='Hot'&&!r['Follow-up 1 ']&&r['Lead Status']!=='Won').length,hw=L.filter(r=>(+r['WinChances']||0)>=8&&r['Lead Status']!=='Won'&&!r['Lost']).length,rc2=L.filter(r=>(+r['WinChances']||0)===10&&r['Lead Status']!=='Won'&&!r['Lost']).length;
  document.getElementById('lActIns').innerHTML=`<div class="insight-row"><span>🔥 Hot, no FU</span><span class="insight-val" style="color:var(--hot)">${hf}</span></div><div class="insight-row"><span>⭐ Win≥8, open</span><span class="insight-val" style="color:var(--accent)">${hw}</span></div><div class="insight-row"><span>✅ Win=10, close now!</span><span class="insight-val" style="color:var(--won)">${rc2}</span></div>`;
}
function lSetType(v,b){Ltype=v;document.querySelectorAll('#panel-leads .filter-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');lApply();}
function lApply(){
  const q=document.getElementById('lSearch').value.toLowerCase(),src=document.getElementById('lFSrc').value,sol=document.getElementById('lFSol').value,rep=document.getElementById('lFRep').value;
  Lf=L.filter(r=>{
    if(q&&!((r['CustomerName']||'').toLowerCase().includes(q)||String(r['ContactNumber']||'').includes(q)||(r['EmailId']||'').toLowerCase().includes(q)))return false;
    if(src&&r['Source']!==src)return false;if(sol&&r['Solution']!==sol)return false;if(rep&&r['Emailaddress']!==rep)return false;
    if(Ltype==='Won'){if(r['Lead Status']!=='Won')return false;}else if(Ltype==='Quoted'){if(r['Quotation Sent']!=='Yes')return false;}else if(Ltype&&r['LeadType']!==Ltype)return false;
    if(Lkpi&&Lkpi!=='all'){if(Lkpi==='won'&&r['Lead Status']!=='Won')return false;if(Lkpi==='hot'&&r['LeadType']!=='Hot')return false;if(Lkpi==='warm'&&r['LeadType']!=='Warm')return false;if(Lkpi==='cold'&&r['LeadType']!=='Cold')return false;if(Lkpi==='quoted'&&r['Quotation Sent']!=='Yes')return false;}
    if(Lcf.leadType&&r['LeadType']!==Lcf.leadType)return false;
    if(Lcf.source){const s=(r['Source']||'').replace('Google Ads','GoogleAds').replace('CustomerReferral','Referral').replace('Internal Reference','Internal');if(s!==Lcf.source)return false;}
    if(Lcf.solution&&r['Solution']!==Lcf.solution)return false;
    if(Lcf.product){const ps=(r['Hero Product']||'').split(/[,\/]/).map(p=>p.trim().replace(/\s+/g,'').toUpperCase());if(!ps.includes(Lcf.product))return false;}
    return true;
  });
  if(Lsk)Lf.sort((a,b)=>{let av=a[Lsk]??'',bv=b[Lsk]??'';if(!isNaN(av)&&!isNaN(bv))return(+av-+bv)*Lsd;return String(av).localeCompare(String(bv))*Lsd;});
  Lp=1;lRenderTable();
}
function lReset(){document.getElementById('lSearch').value='';document.getElementById('lFSrc').value='';document.getElementById('lFSol').value='';document.getElementById('lFRep').value='';Ltype='';Lkpi=null;Lcf={leadType:null,source:null,solution:null,product:null};document.querySelectorAll('#panel-leads .filter-btn').forEach((b,i)=>b.classList.toggle('active',i===0));Object.values(Lch).forEach(c=>c&&c.destroy&&c.destroy());Lch={};lRenderAll();lBadge();}
function lSort(k){Lsk=Lsk===k?(Lsd*=-1,k):(Lsd=1,k);lApply();}
function lRenderTable(){
  const tot=Lf.length,tp=Math.max(1,Math.ceil(tot/LPP)),pg=Lf.slice((Lp-1)*LPP,Lp*LPP);
  document.getElementById('lTblCnt').textContent=tot+' lead'+(tot!==1?'s':'');
  const tb=document.getElementById('lTblBody');
  if(!pg.length){tb.innerHTML='<tr><td colspan="12"><div class="empty-state">No leads found</div></td></tr>';return;}
  tb.innerHTML=pg.map(r=>{const wc=+r['WinChances']||0;const wcc=wc>=7?'#00d4aa':wc>=4?'#f0a500':'#4e9af1';const f1=r['Follow-up 1 ']==='Yes',f2=r['Follow-up 2 ']==='Yes',f3=r['Follow-up 3']==='Yes';const bc=r['LeadType']==='Hot'?'badge-hot':r['LeadType']==='Warm'?'badge-warm':'badge-cold';const sc2=r['Lead Status']==='Won'?'badge-won':r['Lost']?'badge-lost':'badge-open';const st=r['Lead Status']==='Won'?'✓ Won':r['Lost']?'✗ Lost':'● Open';const ov=r['Order Value']?'₹'+(+r['Order Value']).toLocaleString('en-IN'):'—';return`<tr><td><div style="font-weight:600;max-width:150px;overflow:hidden;text-overflow:ellipsis">${(r['CustomerName']||'—').slice(0,22)}</div><div style="font-size:0.78rem;color:var(--muted)">${r['Source']||''}</div></td><td style="font-size:0.83rem">${(r['Source']||'—').replace('CustomerReferral','Referral')}</td><td><span style="font-size:0.83rem;color:#a78bfa">${r['Solution']||'—'}</span></td><td style="font-size:0.80rem;color:var(--muted)">${(r['Hero Product']||'—').slice(0,18)}</td><td><div class="wc-wrap"><div class="wc-bar"><div class="wc-fill" style="width:${wc*10}%;background:${wcc}"></div></div><span style="font-size:0.82rem;font-weight:600;color:${wcc}">${wc}/10</span></div></td><td><span class="badge ${bc}">${r['LeadType']}</span></td><td><span style="font-size:0.83rem;color:${r['IstheDemoGiven']==='Yes'?'var(--won)':'var(--muted)'}">${r['IstheDemoGiven']==='Yes'?'✓ Yes':'✗ No'}</span></td><td><div class="fu-dots"><div class="fu-dot ${f1?'done':''}"></div><div class="fu-dot ${f2?'done':''}"></div><div class="fu-dot ${f3?'done':''}"></div></div></td><td><span style="font-size:0.83rem;color:${r['Quotation Sent']==='Yes'?'var(--won)':'var(--muted)'}">${r['Quotation Sent']==='Yes'?'✓ Sent':r['Quotation Sent']==='No'?'✗ No':'—'}</span></td><td><span class="badge ${sc2}">${st}</span></td><td style="font-weight:600;color:${r['Order Value']?'var(--accent)':'var(--muted)'}">${ov}</td><td><div class="rep-info"><div class="rep-dot" style="background:${rB(r['Emailaddress'])};color:${rC(r['Emailaddress'])}">${rI(r['Emailaddress'])}</div><span style="font-size:0.83rem">${rN(r['Emailaddress'])}</span></div></td></tr>`;}).join('');
  const bar=document.getElementById('lPagBar');if(tp<=1){bar.innerHTML='';return;}
  let h='<span class="page-info">Page '+Lp+' of '+tp+'</span><button class="page-btn" onclick="lGoPage('+(Lp-1)+')" '+(Lp===1?'disabled':'')+'>‹</button>';
  for(let p=1;p<=tp;p++)h+='<button class="page-btn '+(p===Lp?'active':'')+'" onclick="lGoPage('+p+')">'+p+'</button>';
  h+='<button class="page-btn" onclick="lGoPage('+(Lp+1)+')" '+(Lp===tp?'disabled':'')+'>›</button>';bar.innerHTML=h;
}
function lGoPage(p){const tp=Math.ceil(Lf.length/LPP);if(p<1||p>tp)return;Lp=p;lRenderTable();document.querySelector('#panel-leads .table-card').scrollIntoView({behavior:'smooth',block:'start'});}

// ═══════════════════════════════════
// COLLECTION DASHBOARD
// ═══════════════════════════════════
const C_URL='https://script.google.com/macros/s/AKfycbw4EZ2NFdBKvFYhnHpLTta9u28GCoYK9OkcZnwetgFYILTwlPJb1_uDl6y52VQYR29g/exec';
const C_COLS=['#f0a500','#00d4aa','#ff5c7c','#4e9af1','#a78bfa','#f97316'];
let C=[],Cf=[],Cch={},Cp=1,Csk=null,Csd=1;
let C_person='',C_month='',C_loc='',C_kpi=null;
let C_tSearch='',C_tDate='',C_tStatus='';
const CPP=20;

async function loadColl(){
  document.getElementById('cTxt').textContent='Fetching data from Google Sheet...';
  try{
    let rows;
    if(_collCache){rows=_collCache;_collCache=null;}
    else{const res=await fetch(C_URL);if(!res.ok)throw new Error('HTTP '+res.status);rows=await res.json();}
    if(!Array.isArray(rows)) throw new Error('Invalid data: '+JSON.stringify(rows).slice(0,100));
    C=rows.map(r=>{
      r['Commitment']=parseFloat(r['Commitment'])||0;
      r['Achivment']=parseFloat(r['Achivment'])||0;
      r['Commitment Calls']=parseFloat(r['Commitment Calls'])||0;
      r['Achievement  Calls']=parseFloat(r['Achievement  Calls'])||0;
      r['MTD']=parseFloat(String(r['MTD']).replace(/,/g,''))||0;
      r['Monthly Target']=parseFloat(r['Monthly Target'])||0;
      let d=String(r['Date']||'');
      if(d.match(/^\d{2}\/\d{2}\/\d{4}/)){const m=d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);d=m[3]+'-'+m[2]+'-'+m[1];}
      r['_date']=d.slice(0,10);
      r['_month']=r['Month Name']||d.slice(0,7);
      return r;
    }).filter(r=>r['Name']&&String(r['Name']).trim()!=='');
    if(!C.length) throw new Error('No data found — sheet may be empty');
    document.getElementById('cLoad').style.display='none';
    document.getElementById('cCont').style.display='block';
    document.getElementById('cSync').textContent='Sync: '+new Date().toLocaleTimeString('en-IN');
    document.getElementById('cErr').style.display='none';
    cBuildTopFilters(); cRenderAll(); cApplyTable();
  }catch(e){
    document.getElementById('cLoad').style.display='none';
    document.getElementById('cCont').style.display='block';
    document.getElementById('cErr').style.display='block';
    document.getElementById('cErr').textContent='⚠️ Error: '+e.message;
  }
}

async function refreshColl(){
  const b=document.getElementById('cRefBtn'); b.classList.add('spinning');
  Object.values(Cch).forEach(c=>c&&c.destroy&&c.destroy()); Cch={};
  document.getElementById('cLoad').style.display='flex';
  document.getElementById('cCont').style.display='none';
  C_person=''; C_month=''; C_loc=''; C_kpi=null;
  await loadColl(); b.classList.remove('spinning');
}

function cGetNames(){return[...new Set(C.map(r=>r['Name']).filter(Boolean))].sort();}

function cBuildTopFilters(){
  const names=cGetNames();
  let pb='';
  names.forEach((n,i)=>{pb+=`<button class="filter-btn" onclick="cSetPerson('${n}',this)" style="border-color:${C_COLS[i%C_COLS.length]}55">${n}</button> `;});
  document.getElementById('cPersonBtns').innerHTML=pb;
  const months=[...new Set(C.map(r=>r['_month']).filter(Boolean))].sort();
  const ms=document.getElementById('cFMonth'); ms.innerHTML='<option value="">All Months</option>';
  months.forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=m;ms.appendChild(o);});
  const locs=[...new Set(C.map(r=>r['Location']).filter(Boolean))].sort();
  const ls=document.getElementById('cFLoc'); ls.innerHTML='<option value="">All Locations</option>';
  locs.forEach(l=>{const o=document.createElement('option');o.value=l;o.textContent=l;ls.appendChild(o);});
  const dates=[...new Set(C.map(r=>r['_date']).filter(Boolean))].sort().reverse();
  const ds=document.getElementById('cFDate'); ds.innerHTML='<option value="">All Dates</option>';
  dates.forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d.split('-').reverse().join('/');ds.appendChild(o);});
}

function cSetPerson(name,el){
  C_person=C_person===name?'':name;
  document.querySelectorAll('#cPersonBtns .filter-btn,#cBtnAll').forEach(b=>b.classList.remove('active'));
  if(!C_person) document.getElementById('cBtnAll').classList.add('active');
  else el.classList.add('active');
  Object.values(Cch).forEach(c=>c&&c.destroy&&c.destroy()); Cch={};
  cRenderAll(); cApplyTable(); cBadge();
}

function cApplyGlobal(){
  C_month=document.getElementById('cFMonth').value;
  C_loc=document.getElementById('cFLoc').value;
  Object.values(Cch).forEach(c=>c&&c.destroy&&c.destroy()); Cch={};
  cRenderAll(); cApplyTable(); cBadge();
}

function cResetAll(){
  C_person=''; C_month=''; C_loc=''; C_kpi=null;
  document.getElementById('cFMonth').value='';
  document.getElementById('cFLoc').value='';
  document.querySelectorAll('#cPersonBtns .filter-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('cBtnAll').classList.add('active');
  Object.values(Cch).forEach(c=>c&&c.destroy&&c.destroy()); Cch={};
  cRenderAll(); cApplyTable(); cBadge();
}

function cGetFiltered(){
  return C.filter(r=>{
    if(C_person&&r['Name']!==C_person) return false;
    if(C_month&&r['_month']!==C_month) return false;
    if(C_loc&&r['Location']!==C_loc) return false;
    if(C_kpi==='achieved'&&r['Achivment']<r['Commitment']) return false;
    if(C_kpi==='below'&&r['Achivment']>=r['Commitment']) return false;
    return true;
  });
}

function cBadge(){
  const b=document.getElementById('cCFBadge'); const parts=[];
  if(C_person) parts.push('<strong style="color:var(--accent2)">'+C_person+'</strong>');
  if(C_month) parts.push('<strong style="color:var(--accent)">'+C_month+'</strong>');
  if(C_loc) parts.push('<strong style="color:#a78bfa">'+C_loc+'</strong>');
  if(C_kpi) parts.push('<strong style="color:var(--accent3)">'+C_kpi+'</strong>');
  if(parts.length){b.style.display='flex';b.innerHTML='🎯 Filter: '+parts.join(' + ')+' <span onclick="cResetAll()" style="cursor:pointer;color:var(--hot);margin-left:8px;font-weight:600">✕ Clear</span>';}
  else b.style.display='none';
}

function cRenderAll(){const D=cGetFiltered(); cRenderKPIs(D); cRenderCharts(D); cRenderLB(D);}

function cKpiClick(fk){
  C_kpi=C_kpi===fk?null:fk;
  Object.values(Cch).forEach(c=>c&&c.destroy&&c.destroy()); Cch={};
  cRenderAll(); cApplyTable(); cBadge();
}

function cRenderKPIs(D){
  const tc=D.reduce((s,r)=>s+r['Commitment'],0);
  const ta=D.reduce((s,r)=>s+r['Achivment'],0);
  const tm=D.reduce((s,r)=>s+r['MTD'],0);
  const tcc=D.reduce((s,r)=>s+r['Commitment Calls'],0);
  const tac=D.reduce((s,r)=>s+r['Achievement  Calls'],0);
  const pct=tc?((ta/tc)*100).toFixed(1):0;
  const cpct=tcc?((tac/tcc)*100).toFixed(1):0;
  const achieved=D.filter(r=>r['Achivment']>=r['Commitment']&&r['Commitment']>0).length;
  const below=D.filter(r=>r['Achivment']<r['Commitment']&&r['Commitment']>0).length;
  const kpis=[
    {l:'Total Commitment',v:'₹'+tc.toLocaleString('en-IN'),s:'Selected period',a:'#f0a500',b:'Target',bb:'rgba(240,165,0,0.15)',fk:'commitment'},
    {l:'Total Achievement',v:'₹'+ta.toLocaleString('en-IN'),s:pct+'% of commitment',a:'#00d4aa',b:pct+'%',bb:'rgba(0,212,170,0.15)',fk:'achieved'},
    {l:'MTD Total',v:'₹'+tm.toLocaleString('en-IN'),s:'Month to date',a:'#a78bfa',b:'MTD',bb:'rgba(167,139,250,0.15)',fk:'mtd'},
    {l:'Commit Calls',v:tcc,s:cpct+'% achieved',a:'#4e9af1',b:tcc+' calls',bb:'rgba(78,154,241,0.15)',fk:'calls'},
    {l:'Achievement Calls',v:tac,s:'Calls done',a:'#f97316',b:cpct+'%',bb:'rgba(249,115,22,0.15)',fk:'achvcalls'},
    {l:'Days Achieved',v:achieved,s:below+' days below target',a:'#ff5c7c',b:achieved+'/'+D.filter(r=>r['Commitment']>0).length,bb:'rgba(255,92,124,0.15)',fk:'achieved'},
  ];
  document.getElementById('cKpiGrid').innerHTML=kpis.map(k=>{
    const ia=C_kpi===k.fk;
    return`<div class="kpi-card ${ia?'kpi-active':''}" style="--card-accent:${k.a};--card-color:${k.a}" onclick="cKpiClick('${k.fk}')">
      <div class="kpi-label">${k.l}</div><div class="kpi-value" style="font-size:clamp(0.6rem,0.95vw,0.95rem);word-break:break-all;overflow-wrap:anywhere;line-height:1.2">${k.v}</div>
      <div class="kpi-sub">${k.s}</div>
      <span class="kpi-badge" style="background:${k.bb};color:${k.a}">${k.b}</span>
      <div class="kpi-click-hint">${ia?'✕ Clear':'↗ Click to filter'}</div>
    </div>`;
  }).join('');
}

function cRenderCharts(D){
  const names=cGetNames();
  const {tc:cTC,gc:cGC,noGrid:cNG}=chartColors();
  const dates=[...new Set(D.map(r=>r['_date']).filter(Boolean))].sort();
  const dayLabels=dates.map(d=>d.slice(5).split('-').reverse().join('/'));
  const dc={},da={};
  dates.forEach(d=>{dc[d]=0;da[d]=0;});
  D.forEach(r=>{if(r['_date']){dc[r['_date']]=(dc[r['_date']]||0)+r['Commitment'];da[r['_date']]=(da[r['_date']]||0)+r['Achivment'];}});

  if(document.getElementById('cChDay')){
    Cch.day=new Chart(document.getElementById('cChDay'),{type:'bar',data:{labels:dayLabels,datasets:[
      {label:'Commitment',data:dates.map(d=>dc[d]),backgroundColor:'rgba(240,165,0,0.65)',borderColor:'#f0a500',borderWidth:1,borderRadius:4},
      {label:'Achievement',data:dates.map(d=>da[d]),backgroundColor:'rgba(0,212,170,0.65)',borderColor:'#00d4aa',borderWidth:1,borderRadius:4}
    ]},options:{plugins:{legend:{labels:{color:cTC,font:{family:'DM Sans',size:10}}}},scales:{x:{ticks:{color:cTC,font:{family:'DM Sans',size:9}},grid:{display:!cNG,color:cGC}},y:{ticks:{color:cTC,font:{family:'DM Sans',size:10},callback:v=>'₹'+v.toLocaleString('en-IN')},grid:{display:!cNG,color:cGC}}},responsive:true,maintainAspectRatio:false}});
  }

  const mtdMap={};names.forEach(n=>{mtdMap[n]=0;});
  D.forEach(r=>{if(r['Name']&&r['MTD']>0) mtdMap[r['Name']]=Math.max(mtdMap[r['Name']]||0,r['MTD']);});
  if(document.getElementById('cChMTD')){
    Cch.mtd=new Chart(document.getElementById('cChMTD'),{type:'bar',data:{labels:names,datasets:[{data:names.map(n=>mtdMap[n]||0),backgroundColor:C_COLS.slice(0,names.length),borderRadius:6,borderWidth:0}]},options:{indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' ₹'+ctx.raw.toLocaleString('en-IN')}}},scales:{x:{ticks:{color:cTC,font:{family:'DM Sans',size:9},callback:v=>'₹'+v.toLocaleString('en-IN')},grid:{display:!cNG,color:cGC}},y:{ticks:{color:cTC,font:{family:'DM Sans',size:11}},grid:{display:false}}},responsive:true,maintainAspectRatio:false}});
  }

  const pctData=names.map(n=>{const rows=D.filter(r=>r['Name']===n);const co=rows.reduce((s,r)=>s+r['Commitment'],0);const ac=rows.reduce((s,r)=>s+r['Achivment'],0);return co?+((ac/co)*100).toFixed(1):0;});
  if(document.getElementById('cChPct')){
    Cch.pct=new Chart(document.getElementById('cChPct'),{type:'doughnut',data:{labels:names,datasets:[{data:pctData,backgroundColor:C_COLS.slice(0,names.length),borderWidth:0,hoverOffset:10}]},options:{cutout:'62%',plugins:{legend:{position:'right',labels:{color:cTC,padding:12,font:{family:'DM Sans',size:11}}},tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${ctx.raw}%`}}},responsive:true,maintainAspectRatio:false}});
  }

  const ccc=names.map(n=>D.filter(r=>r['Name']===n).reduce((s,r)=>s+r['Commitment Calls'],0));
  const acc=names.map(n=>D.filter(r=>r['Name']===n).reduce((s,r)=>s+r['Achievement  Calls'],0));
  if(document.getElementById('cChCalls')){
    Cch.calls=new Chart(document.getElementById('cChCalls'),{type:'bar',data:{labels:names,datasets:[
      {label:'Commit Calls',data:ccc,backgroundColor:'rgba(78,154,241,0.7)',borderRadius:4,borderWidth:0},
      {label:'Achv Calls',data:acc,backgroundColor:'rgba(0,212,170,0.7)',borderRadius:4,borderWidth:0}
    ]},options:{plugins:{legend:{labels:{color:cTC,font:{family:'DM Sans',size:10}}}},scales:{x:{ticks:{color:cTC,font:{family:'DM Sans',size:10}},grid:{display:false}},y:{ticks:{color:cTC,font:{family:'DM Sans',size:10}},grid:{display:!cNG,color:cGC}}},responsive:true,maintainAspectRatio:false}});
  }

  const tDS=names.map((n,i)=>{const bd={};dates.forEach(d=>{bd[d]=D.filter(r=>r['Name']===n&&r['_date']===d).reduce((s,r)=>s+r['Achivment'],0);});return{label:n,data:dates.map(d=>bd[d]||0),borderColor:C_COLS[i%C_COLS.length],backgroundColor:'transparent',tension:0.4,pointRadius:4,borderWidth:2,pointHoverRadius:7};});
  if(document.getElementById('cChTrend')){
    Cch.trend=new Chart(document.getElementById('cChTrend'),{type:'line',data:{labels:dayLabels,datasets:tDS},options:{plugins:{legend:{labels:{color:cTC,font:{family:'DM Sans',size:10}}}},scales:{x:{ticks:{color:cTC,font:{family:'DM Sans',size:9}},grid:{display:!cNG,color:cGC}},y:{ticks:{color:cTC,font:{family:'DM Sans',size:10},callback:v=>'₹'+v.toLocaleString('en-IN')},grid:{display:!cNG,color:cGC}}},responsive:true,maintainAspectRatio:false}});
  }

  const tco=names.map(n=>D.filter(r=>r['Name']===n).reduce((s,r)=>s+r['Commitment'],0));
  const tac=names.map(n=>D.filter(r=>r['Name']===n).reduce((s,r)=>s+r['Achivment'],0));
  if(document.getElementById('cChTeam')){
    Cch.team=new Chart(document.getElementById('cChTeam'),{type:'bar',data:{labels:names,datasets:[
      {label:'Commitment',data:tco,backgroundColor:'rgba(240,165,0,0.5)',borderRadius:4,borderWidth:0},
      {label:'Achievement',data:tac,backgroundColor:C_COLS.slice(0,names.length).map(c=>c+'cc'),borderRadius:4,borderWidth:0}
    ]},options:{plugins:{legend:{labels:{color:cTC,font:{family:'DM Sans',size:10}}},tooltip:{callbacks:{label:ctx=>` ${ctx.dataset.label}: ₹${ctx.raw.toLocaleString('en-IN')}`}}},scales:{x:{ticks:{color:cTC,font:{family:'DM Sans',size:10}},grid:{display:false}},y:{ticks:{color:cTC,font:{family:'DM Sans',size:10},callback:v=>'₹'+v.toLocaleString('en-IN')},grid:{display:!cNG,color:cGC}}},responsive:true,maintainAspectRatio:false}});
  }
}

function cRenderLB(D){
  const names=cGetNames();
  const board=names.map((n,i)=>{
    const rows=D.filter(r=>r['Name']===n);
    const co=rows.reduce((s,r)=>s+r['Commitment'],0);
    const ac=rows.reduce((s,r)=>s+r['Achivment'],0);
    const pct=co?+((ac/co)*100).toFixed(1):0;
    return{name:n,co,ac,pct,color:C_COLS[i%C_COLS.length]};
  }).sort((a,b)=>b.ac-a.ac);
  const mx=board[0]?.ac||1;
  document.getElementById('cLBoard').innerHTML=board.map((b,i)=>`
    <div class="lb-row">
      <span style="font-size:1rem;width:26px;flex-shrink:0">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</span>
      <div style="background:${b.color}22;color:${b.color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.80rem;font-weight:700;flex-shrink:0">${b.name[0]}</div>
      <div style="flex:1"><div style="font-size:0.89rem;font-weight:600;color:var(--text)">${b.name}</div><div style="font-size:0.74rem;color:var(--muted)">₹${b.ac.toLocaleString('en-IN')} / ₹${b.co.toLocaleString('en-IN')}</div></div>
      <div class="lb-bar-wrap"><div class="lb-bar" style="width:${(b.ac/mx*100).toFixed(0)}%;background:${b.color}"></div></div>
      <span style="font-size:0.85rem;font-weight:700;color:${b.color};min-width:48px;text-align:right">${b.pct}%</span>
    </div>`).join('');
}

function cApplyTable(){
  C_tSearch=(document.getElementById('cSearch')?.value||'').toLowerCase();
  C_tDate=document.getElementById('cFDate').value;
  C_tStatus=document.getElementById('cFStatus').value;
  Cf=C.filter(r=>{
    if(C_person&&r['Name']!==C_person) return false;
    if(C_month&&r['_month']!==C_month) return false;
    if(C_loc&&r['Location']!==C_loc) return false;
    if(C_tSearch&&!(r['Name']||'').toLowerCase().includes(C_tSearch)&&!(r['Location']||'').toLowerCase().includes(C_tSearch)) return false;
    if(C_tDate&&r['_date']!==C_tDate) return false;
    if(C_tStatus==='achieved'&&r['Achivment']<r['Commitment']) return false;
    if(C_tStatus==='below'&&r['Achivment']>=r['Commitment']) return false;
    return true;
  });
  if(Csk) Cf.sort((a,b)=>{let av=a[Csk]??'',bv=b[Csk]??'';if(!isNaN(av)&&!isNaN(bv))return(+av-+bv)*Csd;return String(av).localeCompare(String(bv))*Csd;});
  Cp=1; cRenderTable();
}

function cResetTable(){
  if(document.getElementById('cSearch')) document.getElementById('cSearch').value='';
  document.getElementById('cFDate').value='';
  document.getElementById('cFStatus').value='';
  C_tSearch=''; C_tDate=''; C_tStatus='';
  cApplyTable();
}

function cSort(k){Csk=Csk===k?(Csd*=-1,k):(Csd=1,k);cApplyTable();}

function cRenderTable(){
  const names=cGetNames();
  const tot=Cf.length,tp=Math.max(1,Math.ceil(tot/CPP));
  const pg=Cf.slice((Cp-1)*CPP,Cp*CPP);
  document.getElementById('cTblCnt').textContent=tot+' record'+(tot!==1?'s':'');
  const tb=document.getElementById('cTblBody');
  if(!pg.length){tb.innerHTML='<tr><td colspan="13"><div class="empty-state">No records found</div></td></tr>';return;}
  tb.innerHTML=pg.map(r=>{
    const co=r['Commitment'],ac=r['Achivment'];
    const pct=co?((ac/co)*100).toFixed(1):0;
    const cc=r['Commitment Calls'],ac2=r['Achievement  Calls'];
    const cpct=cc?((ac2/cc)*100).toFixed(1):0;
    const ni=names.indexOf(r['Name']); const col=ni>=0?C_COLS[ni%C_COLS.length]:'#888';
    let sc='badge-zero',st='—';
    if(co>0){sc=ac>=co?'badge-exceed':'badge-below';st=ac>=co?'✓ Achieved':'↓ Below';}
    const statusNote=r['Status']?`<div style="font-size:0.71rem;color:var(--warm);margin-top:2px">${r['Status']}</div>`:'';
    return`<tr>
      <td style="font-size:0.83rem;color:var(--muted)">${r['_date']||'—'}</td>
      <td style="font-size:0.80rem;color:var(--muted)">${r['Month Name']||'—'}</td>
      <td><div style="display:flex;align-items:center;gap:7px"><div style="background:${col}22;color:${col};width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.76rem;font-weight:700">${(r['Name']||'?')[0]}</div><span style="font-weight:600;color:${col}">${r['Name']||'—'}</span></div></td>
      <td style="font-size:0.83rem;color:var(--muted)">${r['Location']||'—'}</td>
      <td style="color:var(--muted);font-size:0.82rem">₹${r['Monthly Target'].toLocaleString('en-IN')}</td>
      <td style="font-weight:600">₹${co.toLocaleString('en-IN')}</td>
      <td style="font-weight:600;color:${ac>=co&&ac>0?'var(--won)':ac>0?'var(--hot)':'var(--muted)'}">₹${ac.toLocaleString('en-IN')}</td>
      <td><div class="prog-wrap"><div class="prog-bar"><div class="prog-fill" style="width:${Math.min(pct,100)}%;background:${parseFloat(pct)>=100?'var(--won)':parseFloat(pct)>=50?'var(--warm)':'var(--hot)'}"></div></div><span style="font-size:0.80rem;font-weight:600;min-width:42px;text-align:right;color:${parseFloat(pct)>=100?'var(--won)':parseFloat(pct)>=50?'var(--warm)':'var(--hot)'}">${pct}%</span></div></td>
      <td style="color:var(--cold);font-weight:600">${cc}</td>
      <td style="color:${ac2>=cc&&ac2>0?'var(--won)':'var(--accent)'};font-weight:600">${ac2}</td>
      <td style="font-size:0.82rem;font-weight:600;color:${parseFloat(cpct)>=100?'var(--won)':parseFloat(cpct)>=50?'var(--warm)':'var(--hot)'}">${cpct}%</td>
      <td style="font-weight:700;color:var(--accent2)">₹${r['MTD'].toLocaleString('en-IN')}</td>
      <td><span class="badge ${sc}">${st}</span>${statusNote}</td>
    </tr>`;
  }).join('');
  const bar=document.getElementById('cPagBar');if(tp<=1){bar.innerHTML='';return;}
  let h='<span class="page-info">Page '+Cp+' of '+tp+'</span><button class="page-btn" onclick="cGoPage('+(Cp-1)+')" '+(Cp===1?'disabled':'')+'>‹</button>';
  for(let p=1;p<=tp;p++)h+='<button class="page-btn '+(p===Cp?'active':'')+'\" onclick="cGoPage('+p+')">'+p+'</button>';
  h+='<button class="page-btn" onclick="cGoPage('+(Cp+1)+')" '+(Cp===tp?'disabled':'')+'>›</button>';
  bar.innerHTML=h;
}
function cGoPage(p){const tp=Math.ceil((Cf.length||1)/CPP);if(p<1||p>tp)return;Cp=p;cRenderTable();document.querySelector('#panel-collection .table-card').scrollIntoView({behavior:'smooth',block:'start'});}


// ═══════════════════════════════════════════════════
// FMS Installation Tracker — Dashboard Logic
// For PC = Yes → DELAYED | For PC = No → REMAINING
// ═══════════════════════════════════════════════════
const FMS_API = "https://script.google.com/macros/s/AKfycbxpa-GJ2UNqVCBTVZeyhvfa9bUaCoqPYAfJS10Zu-9ljEEJgBEiwlER8S4bNzAm_nbo-g/exec";
let fmsAllData=[], fmsFiltered=[], fmsCharts={}, fmsLoaded=false;
let fmsMainPage=1, fmsCPPage=1, fmsCurrentFilter='all';
let fmsSortKey=null, fmsSortDir=1;
let fmsDateFrom=null, fmsDateTo=null;
const FMS_PER_PAGE=15, FMS_CP_PER_PAGE=8;
const FMS_COLS=['#f0a500','#00d4ff','#00d4aa','#a855f7','#ff5c7c','#06b6d4','#f97316'];

// For PC = Yes → Delayed, For PC = No → Remaining (time bacha hua)
const fmsIsDelayed   = r => (r.forPC||'').toLowerCase()==='yes';
const fmsIsRemaining = r => (r.forPC||'').toLowerCase()!=='yes';

const _origSwitchDB = switchDB;
switchDB = function(id){
  _origSwitchDB(id);
  if(id==='fms'&&!fmsLoaded){fmsLoaded=true;fmsLoadData();}
};

async function fmsLoadData(){
  document.getElementById('fMainTableBody').innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;padding:3rem;gap:1rem;color:var(--muted);"><div class="loader-bar"><div class="loader-fill"></div></div><p style="font-size:0.89rem;">Loading...</p></div>`;
  try{
    const res=await fetch(FMS_API);
    const text=await res.text();
    let json;try{json=JSON.parse(text);}catch(e){throw new Error('Invalid JSON from API');}
    let raw=[];
    if(Array.isArray(json)) raw=json;
    else if(json.data&&Array.isArray(json.data)) raw=json.data;
    else if(json.records&&Array.isArray(json.records)) raw=json.records;
    else if(json.rows&&Array.isArray(json.rows)) raw=json.rows;
    else if(json.h&&json.r){raw=json.r.map(row=>{const o={};json.h.forEach((k,i)=>{o[k]=row[i]??'';});return o;});}
    if(!raw.length){
      document.getElementById('fMainTableBody').innerHTML=`<div style="padding:2rem;text-align:center;color:var(--muted);"><div style="font-size:2rem;margin-bottom:0.5rem;">📭</div>No data found in sheet<br><small>Check [FMS] logs in Browser Console (F12)</small></div>`;
      return;
    }
    const firstRow=raw[0],keys=Object.keys(firstRow);
    function gv(r,...cols){for(const c of cols){if(r[c]!==undefined&&String(r[c]).trim()!='')return String(r[c]);const f=keys.find(k=>k.toLowerCase().replace(/[^a-z0-9]/g,'')==c.toLowerCase().replace(/[^a-z0-9]/g,''));if(f&&r[f]!==undefined&&String(r[f]).trim()!='')return String(r[f]);}return '';}
    fmsAllData=raw.map(r=>({
      uniqueKey:    gv(r,'Unique Key','UniqueKey','uniqueKey'),
      planned:      gv(r,'Planned Step','PlannedStep','Planned','planned'),
      plannedStep:  gv(r,'Planned Step','PlannedStep','How','how'),
      how:          gv(r,'How','how'),
      doerName:     gv(r,'Final Doer Name','FinalDoerName','Doer Name','DoerName','doerName'),
      link:         gv(r,'Link','link'),
      forPC:        gv(r,'For PC','ForPC','forPC'),
      doerEmail:    gv(r,'Final Doer Email','FinalDoerEmail','Doer Email','DoerEmail','doerEmail'),
      customerName: gv(r,'Customer Name','CustomerName','customerName'),
      product:      gv(r,'Product','product'),
    })).filter(r=>r.uniqueKey&&!r.uniqueKey.includes('#N/A'));
    const el=document.getElementById('fmsLastRefresh');
    if(el) el.textContent='Updated '+new Date().toLocaleTimeString();
    fmsProcessData();
  }catch(e){
    document.getElementById('fMainTableBody').innerHTML=`<div style="padding:2rem;text-align:center;color:var(--hot);">❌ ${e.message}<br><small style="color:var(--muted);">Set Apps Script URL or check CORS</small><button onclick="fmsLoadData()" style="margin-top:0.8rem;display:block;margin-left:auto;margin-right:auto;padding:6px 16px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text);cursor:pointer;">🔄 Retry</button></div>`;
  }
}

function fmsProcessData(){
  fmsFiltered=[...fmsAllData];
  fmsCurrentFilter='all';
  fmsPopulateDropdowns();
  fmsRefreshAll();
}

// Central refresh — updates KPIs + Charts + Tables together
function fmsRefreshAll(){
  fmsUpdateKPIs();
  fmsRenderCharts(fmsFiltered);
  fmsRenderCPTable();
  fmsRenderDoerSummary();
  fmsMainPage=1;
  fmsRenderMainTable();
}

function fmsUpdateKPIs(){
  const delayed  = fmsFiltered.filter(fmsIsDelayed).length;
  const remaining= fmsFiltered.filter(fmsIsRemaining).length;
  const now=new Date();
  const dd=String(now.getDate()).padStart(2,'0'),mm=String(now.getMonth()+1).padStart(2,'0');
  const todayCount=fmsFiltered.filter(r=>r.planned&&r.planned.includes(dd+'/'+mm)).length;
  const prods=new Set(fmsFiltered.map(r=>r.product).filter(v=>v&&v.trim())).size;

  document.getElementById('fkpiRemaining').textContent=remaining||'0';
  document.getElementById('fkpiDelayed').textContent=delayed||'0';
  document.getElementById('fkpiTotal').textContent=fmsFiltered.length;
  document.getElementById('fkpiToday').textContent=todayCount;
  document.getElementById('fkpiProducts').textContent=prods;

  // Active KPI highlight
  document.querySelectorAll('.kpi-card[id^="fkpi-"]').forEach(c=>c.classList.remove('kpi-active'));
  const m={all:'fkpi-all',remaining:'fkpi-remaining',delayed:'fkpi-delayed',today:'fkpi-today'};
  if(m[fmsCurrentFilter]) document.getElementById(m[fmsCurrentFilter])?.classList.add('kpi-active');
}

// Charts always reflect fmsFiltered (reactive)
function fmsRenderCharts(data){
  Object.values(fmsCharts).forEach(c=>{try{c.destroy();}catch(e){}});fmsCharts={};
  const {tc,gc,noGrid}=chartColors();

  // Chart 1: Product Wise Pending (For PC = No = remaining)
  const pm={};
  data.filter(fmsIsRemaining).forEach(r=>{const k=r.product&&r.product.trim()?r.product:'Unknown';pm[k]=(pm[k]||0)+1;});
  const pl=Object.keys(pm),pv=Object.values(pm);
  const c1=document.getElementById('fChartProductPending');
  if(c1&&pl.length){
    fmsCharts.prod=new Chart(c1,{type:'bar',data:{labels:pl,datasets:[{data:pv,backgroundColor:FMS_COLS.slice(0,pl.length),borderRadius:6,borderSkipped:false}]},
    options:{plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' Remaining: '+ctx.raw}}},
    scales:{x:{ticks:{color:tc,font:{size:9}},grid:{display:false}},y:{ticks:{color:tc,beginAtZero:true},grid:{display:!noGrid,color:gc}}},
    onClick:(e,els)=>{if(els.length)fmsKpiFilter('product',pl[els[0].index]);},
    onHover:(e,els)=>{e.native.target.style.cursor=els.length?'pointer':'default';},
    responsive:true,maintainAspectRatio:false}});
  } else if(c1){
    const ctx=c1.getContext('2d');ctx.clearRect(0,0,c1.width,c1.height);
  }

  // Chart 2: Doer-wise Remaining tasks (horizontal bar)
  const dm={};
  data.filter(fmsIsRemaining).forEach(r=>{const k=r.doerName&&r.doerName.trim()?r.doerName:'Unknown';dm[k]=(dm[k]||0)+1;});
  const dl=Object.keys(dm),dv=Object.values(dm);
  const c2=document.getElementById('fChartDoer');
  if(c2&&dl.length){
    fmsCharts.doer=new Chart(c2,{type:'bar',data:{labels:dl,datasets:[{data:dv,backgroundColor:'rgba(0,212,255,0.75)',borderRadius:6}]},
    options:{indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' Remaining: '+ctx.raw}}},
    scales:{x:{ticks:{color:tc,beginAtZero:true},grid:{display:!noGrid,color:gc}},y:{ticks:{color:tc,font:{size:9}},grid:{display:false}}},
    onClick:(e,els)=>{if(els.length)fmsKpiFilter('doer',dl[els[0].index]);},
    onHover:(e,els)=>{e.native.target.style.cursor=els.length?'pointer':'default';},
    responsive:true,maintainAspectRatio:false}});
  }

  // Chart 3: Status doughnut — For PC No=Remaining, Yes=Delayed
  const delayed  =data.filter(fmsIsDelayed).length;
  const remaining=data.filter(fmsIsRemaining).length;
  const c3=document.getElementById('fChartStatus');
  if(c3){
    fmsCharts.status=new Chart(c3,{type:'doughnut',
    data:{labels:['Remaining (PC No)','Delayed (PC Yes)'],datasets:[{data:[remaining,delayed],backgroundColor:['#00d4aa','#ff5c7c'],borderWidth:0,hoverOffset:8}]},
    options:{plugins:{legend:{labels:{color:tc,padding:14,font:{size:11}}}},cutout:'62%',
    onClick:(e,els)=>{if(els.length)fmsKpiFilter(els[0].index===0?'remaining':'delayed');},
    onHover:(e,els)=>{e.native.target.style.cursor=els.length?'pointer':'default';},
    responsive:true,maintainAspectRatio:false}});
  }

  // Chart 4: Daily planned volume line
  const days=[],counts=[];
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    days.push(d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}));
    const dd2=String(d.getDate()).padStart(2,'0'),mm2=String(d.getMonth()+1).padStart(2,'0');
    counts.push(data.filter(r=>r.planned&&r.planned.includes(dd2+'/'+mm2)).length);
  }
  const c4=document.getElementById('fChartDaily');
  if(c4){
    fmsCharts.daily=new Chart(c4,{type:'line',data:{labels:days,datasets:[{data:counts,borderColor:'#f0a500',backgroundColor:'rgba(240,165,0,0.1)',fill:true,tension:0.4,pointBackgroundColor:'#f0a500',pointRadius:5,pointHoverRadius:7}]},
    options:{plugins:{legend:{display:false}},scales:{x:{ticks:{color:tc,font:{size:9}},grid:{display:!noGrid,color:gc}},y:{ticks:{color:tc,beginAtZero:true},grid:{display:!noGrid,color:gc}}},responsive:true,maintainAspectRatio:false}});
  }
}

// Single filter entry point — filters fmsFiltered, then refreshes everything
// Format date from any format → DD/MM/YYYY HH:MM
function fmsFmtDate(str){
  if(!str||str.trim()==='')return '—';
  try{
    // ISO format: 2026-04-03T05:18:12.372Z or 1899-12-29T...
    let d;
    if(str.includes('T')){
      d=new Date(str);
      // Invalid/epoch dates (1899 etc) → show as-is trimmed
      if(isNaN(d)||d.getFullYear()<2000) return str.split('T')[0];
    } else {
      // DD/MM/YYYY HH:MM:SS or similar
      const p=str.split(' ');const datePart=p[0],timePart=p[1]||'';
      const dp=datePart.split('/');
      if(dp.length===3){
        // already DD/MM/YYYY
        const timeStr=timePart?timePart.slice(0,5):'';
        return datePart+(timeStr?' '+timeStr:'');
      }
      d=new Date(str);
    }
    if(isNaN(d))return str;
    const dd=String(d.getDate()).padStart(2,'0');
    const mm=String(d.getMonth()+1).padStart(2,'0');
    const yyyy=d.getFullYear();
    const hh=String(d.getHours()).padStart(2,'0');
    const min=String(d.getMinutes()).padStart(2,'0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }catch(e){return str;}
}

function fmsKpiFilter(type, value){
  // Toggle: same KPI clicked again → reset to all
  if(type===fmsCurrentFilter && !value){
    fmsCurrentFilter='all';
    fmsFiltered=[...fmsAllData];
    fmsMainPage=1;
    fmsRefreshAll();
    return;
  }
  fmsCurrentFilter=type;
  const now=new Date();
  const dd=String(now.getDate()).padStart(2,'0'),mm=String(now.getMonth()+1).padStart(2,'0');
  if(type==='all')           fmsFiltered=[...fmsAllData];
  else if(type==='remaining')fmsFiltered=fmsAllData.filter(fmsIsRemaining);
  else if(type==='delayed')  fmsFiltered=fmsAllData.filter(fmsIsDelayed);
  else if(type==='today')    fmsFiltered=fmsAllData.filter(r=>r.planned&&r.planned.includes(dd+'/'+mm));
  else if(type==='product')  fmsFiltered=fmsAllData.filter(r=>r.product===value);
  else if(type==='doer')     fmsFiltered=fmsAllData.filter(r=>r.doerName===value);
  fmsMainPage=1;
  fmsRefreshAll();
}

function fmsPopulateDropdowns(){
  const prods=[...new Set(fmsAllData.map(r=>r.product).filter(v=>v&&v.trim()))];
  document.getElementById('fProductFilter').innerHTML='<option value="">All Products</option>'+prods.map(p=>`<option value="${p}">${p}</option>`).join('');
  const doers=[...new Set(fmsAllData.map(r=>r.doerName).filter(v=>v&&v.trim()))];
  document.getElementById('fDoerFilter').innerHTML='<option value="">All Doers</option>'+doers.map(d=>`<option value="${d}">${d}</option>`).join('');
}

function fmsRenderDoerSummary(){
  const dm={};
  fmsFiltered.filter(fmsIsRemaining).forEach(r=>{const k=r.doerName&&r.doerName.trim()?r.doerName:'Unknown';dm[k]=(dm[k]||0)+1;});
  const sorted=Object.entries(dm).sort((a,b)=>b[1]-a[1]);
  const max=sorted[0]?.[1]||1;
  document.getElementById('fDoerSummary').innerHTML=sorted.length?sorted.map(([name,cnt],i)=>`
    <div onclick="fmsKpiFilter('doer','${name.replace(/'/g,"\\\'")}')" style="padding:0.55rem 1rem;display:flex;align-items:center;gap:0.6rem;cursor:pointer;border-bottom:1px solid var(--border);">
      <div style="width:28px;height:28px;border-radius:50%;background:${FMS_COLS[i%FMS_COLS.length]}22;color:${FMS_COLS[i%FMS_COLS.length]};display:flex;align-items:center;justify-content:center;font-size:0.79rem;font-weight:700;flex-shrink:0;">${(name[0]||'?').toUpperCase()}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:0.88rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
        <div style="height:4px;background:var(--border);border-radius:4px;margin-top:4px;"><div style="height:4px;background:${FMS_COLS[i%FMS_COLS.length]};border-radius:4px;width:${Math.round(cnt/max*100)}%;"></div></div>
      </div>
      <div style="font-size:0.91rem;font-weight:700;color:${FMS_COLS[i%FMS_COLS.length]};min-width:22px;text-align:right;">${cnt}</div>
    </div>`).join(''):'<div style="padding:1.5rem;text-align:center;color:var(--muted);font-size:0.89rem;">No remaining tasks</div>';
}

function fmsRenderCPTable(){
  const data=fmsFiltered;
  if(!data.length){document.getElementById('fCPTableBody').innerHTML='<div style="padding:2rem;text-align:center;color:var(--muted);font-size:0.89rem;">No data</div>';document.getElementById('fCPPagination').style.display='none';return;}
  const start=(fmsCPPage-1)*FMS_CP_PER_PAGE;
  const pg=data.slice(start,start+FMS_CP_PER_PAGE);
  document.getElementById('fCPTableBody').innerHTML=pg.map(r=>{
    const delayed=fmsIsDelayed(r);
    return`<div style="display:grid;grid-template-columns:1fr 1.2fr 0.9fr;border-bottom:1px solid var(--border);padding:0.45rem 1rem;cursor:pointer;" onclick="fmsOpenMarkDone(${fmsAllData.indexOf(r)})">
      <span style="font-size:0.85rem;font-weight:700;color:#00d4ff;">${r.uniqueKey}</span>
      <span style="font-size:0.82rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.customerName||'—'}</span>
      <span style="font-size:0.79rem;color:${delayed?'var(--hot)':'var(--won)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.product||'—'}</span>
    </div>`;
  }).join('');
  const tot=data.length,tp=Math.ceil(tot/FMS_CP_PER_PAGE),s=start+1,e=Math.min(fmsCPPage*FMS_CP_PER_PAGE,tot);
  document.getElementById('fCPPageInfo').textContent=`${s}–${e} of ${tot}`;
  let btns='';for(let i=1;i<=Math.min(tp,6);i++)btns+=`<button onclick="fmsCPGoPage(${i})" style="width:22px;height:22px;border-radius:5px;border:1px solid var(--border);background:${i===fmsCPPage?'#f0a500':'transparent'};color:${i===fmsCPPage?'#000':'var(--text)'};cursor:pointer;font-size:0.80rem;">${i}</button>`;
  document.getElementById('fCPPageBtns').innerHTML=btns;
  document.getElementById('fCPPagination').style.display='flex';
}
function fmsCPGoPage(n){fmsCPPage=n;fmsRenderCPTable();}

function fmsApplyDateFilter(){
  fmsDateFrom=document.getElementById('fDateFrom').value||null;
  fmsDateTo=document.getElementById('fDateTo').value||null;
  fmsApplySearch();
}
function fmsClearDateFilter(){
  document.getElementById('fDateFrom').value='';
  document.getElementById('fDateTo').value='';
  fmsDateFrom=null;fmsDateTo=null;fmsApplySearch();
}

function fmsApplySearch(){
  const q=(document.getElementById('fSearch').value||'').toLowerCase();
  const prod=document.getElementById('fProductFilter').value;
  const doer=document.getElementById('fDoerFilter').value;
  const status=document.getElementById('fStatusFilter').value;
  // Search from full dataset but respect active KPI filter
  let base=fmsAllData;
  if(fmsCurrentFilter==='remaining') base=fmsAllData.filter(fmsIsRemaining);
  else if(fmsCurrentFilter==='delayed') base=fmsAllData.filter(fmsIsDelayed);
  else if(fmsCurrentFilter==='today'){const now=new Date(),dd=String(now.getDate()).padStart(2,'0'),mm=String(now.getMonth()+1).padStart(2,'0');base=fmsAllData.filter(r=>r.planned&&r.planned.includes(dd+'/'+mm));}
  fmsFiltered=base.filter(r=>{
    const mq=!q||[r.uniqueKey,r.plannedStep,r.doerName,r.customerName,r.product].some(v=>(v||'').toLowerCase().includes(q));
    const mp=!prod||r.product===prod;
    const md=!doer||r.doerName===doer;
    const ms=!status||(status==='delayed'?fmsIsDelayed(r):fmsIsRemaining(r));
    let mdate=true;
    if(fmsDateFrom||fmsDateTo){
      // Parse planned date for date range filter
      const raw=r.planned||'';const part=raw.split(' ')[0];const pp=part.split('/');
      if(pp.length>=3){
        const d=pp[0].length===4?new Date(+pp[0],+pp[1]-1,+pp[2]):new Date(+pp[2],+pp[1]-1,+pp[0]);
        if(fmsDateFrom&&d<new Date(fmsDateFrom))mdate=false;
        if(fmsDateTo&&d>new Date(fmsDateTo))mdate=false;
      } else mdate=false;
    }
    return mq&&mp&&md&&ms&&mdate;
  });
  fmsMainPage=1;
  fmsRenderCharts(fmsFiltered);
  fmsUpdateKPIs();
  fmsRenderCPTable();
  fmsRenderDoerSummary();
  fmsRenderMainTable();
}

function fmsSort2(key){
  if(fmsSortKey===key)fmsSortDir*=-1;else{fmsSortKey=key;fmsSortDir=1;}
  fmsFiltered.sort((a,b)=>String(a[key]||'').localeCompare(String(b[key]||''))*fmsSortDir);
  fmsRenderMainTable();
}

function fmsRenderMainTable(){
  const tot=fmsFiltered.length;
  document.getElementById('fTableCount').textContent=tot+' record'+(tot!==1?'s':'');
  if(!tot){
    document.getElementById('fMainTableBody').innerHTML='<div style="padding:2rem;text-align:center;color:var(--muted);">No data found 😕<br><small style="font-size:0.85rem;">Press the Reset button</small></div>';
    document.getElementById('fMainPagination').style.display='none';
    return;
  }
  const start=(fmsMainPage-1)*FMS_PER_PAGE;
  const pg=fmsFiltered.slice(start,start+FMS_PER_PAGE);
  const rows=pg.map((r)=>{
    const delayed=fmsIsDelayed(r);
    const rowBg=delayed?'rgba(255,92,124,0.035)':'';
    const doerIdx=[...new Set(fmsAllData.map(x=>x.doerName))].indexOf(r.doerName);
    const doerCol=FMS_COLS[doerIdx%FMS_COLS.length]||'#888';
    const fmtDate=fmsFmtDate(r.planned);
    const statusBadge=delayed
      ?'<span style="font-size:0.70rem;color:#ff5c7c;font-weight:700;background:rgba(255,92,124,0.12);padding:2px 8px;border-radius:20px;white-space:nowrap;">⚠ Delayed</span>'
      :'<span style="font-size:0.70rem;color:#00d4aa;font-weight:700;background:rgba(0,212,170,0.1);padding:2px 8px;border-radius:20px;white-space:nowrap;">✓ Remaining</span>';
    const markDoneBtn=r.link&&r.link.startsWith('http')
      ?`<button onclick="event.stopPropagation();fmsOpenMarkDone(${fmsAllData.indexOf(r)})" style="padding:5px 14px;border-radius:20px;border:1.5px solid ${delayed?'#ff5c7c':'#f0a500'};background:transparent;color:${delayed?'#ff5c7c':'#f0a500'};font-size:0.82rem;font-weight:700;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Mark Done</button>`
      :'<span style="font-size:0.80rem;color:var(--muted);">—</span>';
    return`<div onclick="fmsOpenMarkDone(${fmsAllData.indexOf(r)})" style="display:grid;grid-template-columns:1.1fr 1.1fr 2fr 1.3fr 1fr;border-bottom:1px solid var(--border);background:${rowBg};cursor:pointer;align-items:center;" onmouseover="this.style.background='rgba(255,255,255,0.025)'" onmouseout="this.style.background='${rowBg}'">
      <div style="padding:0.65rem 1rem;border-right:1px solid var(--border);">
        <div style="font-size:0.89rem;font-weight:800;color:#00d4ff;letter-spacing:0.01em;">${r.uniqueKey}</div>
        <div style="font-size:0.79rem;color:var(--muted);margin-top:3px;line-height:1.3;">${r.customerName||'—'}</div>
      </div>
      <div style="padding:0.65rem 1rem;border-right:1px solid var(--border);">
        <div style="font-size:0.88rem;font-weight:600;color:${doerCol};">${r.doerName||'—'}</div>
        <div style="font-size:0.73rem;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;">${r.doerEmail||''}</div>
      </div>
      <div style="padding:0.65rem 1rem;border-right:1px solid var(--border);">
        <div style="font-size:0.86rem;color:var(--text);line-height:1.4;">${r.plannedStep||'—'}</div>
        <div style="font-size:0.74rem;color:var(--muted);margin-top:2px;font-style:italic;">${r.product||''}</div>
      </div>
      <div style="padding:0.65rem 1rem;border-right:1px solid var(--border);">
        <div style="font-size:0.84rem;font-weight:500;color:var(--text);font-family:'DM Mono',monospace,sans-serif;">${fmtDate}</div>
        <div style="margin-top:4px;">${statusBadge}</div>
      </div>
      <div style="padding:0.65rem 1rem;text-align:center;">${markDoneBtn}</div>
    </div>`;
  }).join('');
  document.getElementById('fMainTableBody').innerHTML=rows;
  const tp=Math.ceil(tot/FMS_PER_PAGE),s=start+1,e=Math.min(fmsMainPage*FMS_PER_PAGE,tot);
  document.getElementById('fMainPageInfo').textContent=`${s}–${e} of ${tot}`;
  let btns='';
  if(fmsMainPage>1)btns+=`<button onclick="fmsMainGoPage(${fmsMainPage-1})" style="width:28px;height:28px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text);cursor:pointer;">‹</button>`;
  for(let i=Math.max(1,fmsMainPage-2);i<=Math.min(tp,fmsMainPage+2);i++)btns+=`<button onclick="fmsMainGoPage(${i})" style="width:28px;height:28px;border-radius:6px;border:1px solid var(--border);background:${i===fmsMainPage?'#f0a500':'transparent'};color:${i===fmsMainPage?'#000':'var(--text)'};cursor:pointer;font-size:0.88rem;">${i}</button>`;
  if(fmsMainPage<tp)btns+=`<button onclick="fmsMainGoPage(${fmsMainPage+1})" style="width:28px;height:28px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text);cursor:pointer;">›</button>`;
  document.getElementById('fMainPageBtns').innerHTML=btns;
  document.getElementById('fMainPagination').style.display='flex';
}

function fmsMainGoPage(n){fmsMainPage=n;fmsRenderMainTable();}

function fmsOpenMarkDone(idx){
  const r=fmsAllData[idx];if(!r)return;
  const delayed=fmsIsDelayed(r);
  document.getElementById('fmsMarkDoneInfo').innerHTML=`
    <b style="color:#f0a500;">${r.uniqueKey}</b> — ${r.customerName||'Customer'}<br>
    <span style="color:var(--muted);">Doer:</span> ${r.doerName||'—'} &nbsp;|&nbsp; <span style="color:var(--muted);">Product:</span> ${r.product||'—'}<br>
    <span style="color:var(--muted);">Step:</span> ${r.plannedStep||'—'}<br>
    <span style="color:var(--muted);">Planned:</span> ${fmsFmtDate(r.planned)}<br>
    <span style="color:var(--muted);">Status:</span> ${delayed?'<span style="color:var(--hot);font-weight:600;">⚠ Delayed (For PC = Yes)</span>':'<span style="color:var(--won);font-weight:600;">✓ Remaining (For PC = No)</span>'}`;
  const lnk=document.getElementById('fmsMarkDoneLink');
  if(r.link&&r.link.startsWith('http')){lnk.href=r.link;lnk.style.display='inline-flex';}else{lnk.style.display='none';}
  document.getElementById('fmsMarkDoneModal').style.display='flex';
}
function closeFmsMarkDone(){document.getElementById('fmsMarkDoneModal').style.display='none';}
document.getElementById('fmsMarkDoneModal').addEventListener('click',function(e){if(e.target===this)closeFmsMarkDone();});

function fmsClearAllFilters(){
  document.getElementById('fSearch').value='';
  document.getElementById('fProductFilter').value='';
  document.getElementById('fDoerFilter').value='';
  document.getElementById('fStatusFilter').value='';
  document.getElementById('fDateFrom').value='';
  document.getElementById('fDateTo').value='';
  fmsDateFrom=null; fmsDateTo=null;
  fmsCurrentFilter='all';
  fmsFiltered=[...fmsAllData];
  fmsMainPage=1;
  fmsRefreshAll();
}

function fmsExportCSV(){
  const h=['Unique Key','Customer Name','Product','Doer Name','Planned Step','Planned','For PC','Doer Email','Form Link'];
  const rows=fmsFiltered.map(r=>[r.uniqueKey,r.customerName,r.product,r.doerName,r.plannedStep,r.planned,r.forPC,r.doerEmail,r.link].map(v=>`"${(v||'').replace(/"/g,'""')}"`).join(','));
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent([h.join(','),...rows].join('\n'));a.download='fms_tasks_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
}



// ============================================================


// ═══════════════════════════════════════
// TASK CHECKLIST DASHBOARD — Supabase Version
// ═══════════════════════════════════════

// NOTE: Google Form submissions removed — task status updates directly to Supabase DB.

// ── Supabase REST API: Task done mark karo ──
async function markTaskDone(rowId, remarks) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/employee_checklists?id=eq.${encodeURIComponent(rowId)}`,
      {
        method: 'PATCH',
        headers: SB_HDRS_JSON(),
        body: JSON.stringify({
          actual_timestamp: new Date().toISOString(),
          remarks: remarks || null
        })
      }
    );
    return res.ok;
  } catch(e) {
    alert('Update error: ' + e.message);
    return false;
  }
}

// Department → sheet mapping removed (Supabase se direct fetch hoga)
// Managing Director/MIS/PC = fetch all (owner role check rahega)
let tAllData=[], tFiltered=[], tPage=1, tLoaded=false;
let tActiveKpi=null, tActivePerson=null, tActiveDept=null, tActiveStatus=null, tActiveFreq=null, tActiveDateFrom=null, tActiveDateTo=null, tActiveLocation=null;

function tParseDate(v){
  if(!v) return '';
  let s=String(v).trim();
  // dd/mm/yyyy
  let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(m) return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
  // yyyy-mm-dd
  m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return m[0].slice(0,10);
  return s.slice(0,10);
}
const T_PER_PAGE=20;
let tCharts={};

// ── Supabase paginated fetch — 1000 row limit bypass karo ──
async function tFetchAllPages(baseUrl){
  const BATCH = 1000;
  let all = [];
  let offset = 0;
  while(true){
    const url = `${baseUrl}&limit=${BATCH}&offset=${offset}`;
    const res = await fetch(url, { headers: SB_HDRS() });
    const batch = await res.json();
    if(!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch); // FIX: avoid creating new array every iteration
    if(batch.length < BATCH) break; // last page
    offset += BATCH;
    if(offset > 100000) break; // safety cap at 100k
  }
  return all;
}


async function loadTasks(overrideDateFrom, overrideDateTo){
  // Loader overlay — content hide mat karo, sirf dim karo (no jerk/flash)
  const _tasksCont = document.getElementById('tasksCont');
  const _isFirstLoad = !window._tasksEverLoaded;
  if(_isFirstLoad){
    document.getElementById('tasksLoad').style.display='flex';
    _tasksCont.style.display='none';
  } else {
    document.getElementById('tasksLoad').style.display='none';
    _tasksCont.style.opacity='0.45';
    _tasksCont.style.pointerEvents='none';
    _tasksCont.style.transition='opacity 0.2s';
  }
  try{
    const isOwner = PERMISSIONS.checklist_scope === 'all';
    const myEmail = CURRENT_USER ? String(CURRENT_USER.email||'').trim().toLowerCase() : '';

    // ── Date: dono ke liye today default, admin date change kar sakta hai ──
    const todayStr = new Date().toISOString().slice(0,10);
    const fetchFrom = overrideDateFrom || document.getElementById('tFDateFrom').value || todayStr;
    const fetchTo   = overrideDateTo   || document.getElementById('tFDateTo').value   || todayStr;

    // UI mein date set karo (dono ke liye)
    document.getElementById('tFDateFrom').value = fetchFrom;
    document.getElementById('tFDateTo').value   = fetchTo;
    tActiveDateFrom = fetchFrom;
    tActiveDateTo   = fetchTo;

    // ── Step 1: Email se emp_id dhundho (employee ke liye) ──
    let myEmpId = null;
    if(!isOwner && myEmail){
      const empRes = await fetch(
        `${SUPABASE_URL}/rest/v1/Employee_details?select=Emp_id&Email_Id=ilike.${encodeURIComponent(myEmail)}&limit=1`,
        { headers: SB_HDRS() }
      );
      const empRows = await empRes.json();
      if(empRows && empRows[0]){
        myEmpId = String(empRows[0].Emp_id || empRows[0].emp_id || '').trim();
      }
      if(!myEmpId){
        tAllData=[];
        const warn=document.getElementById('tNoTaskWarn');
        if(warn){
          warn.style.display='block';
          warn.innerHTML=`<div style="background:rgba(255,92,124,0.08);border:1px solid rgba(255,92,124,0.3);border-radius:12px;padding:16px 20px;margin:16px 0">
            <div style="color:#ff5c7c;font-weight:700;margin-bottom:8px">⚠️ No tasks found!</div>
            <div style="font-size:0.88rem;margin-bottom:6px">Login email: <b style="color:#f0a500">${myEmail}</b></div>
            <div style="font-size:0.82rem;color:#f0a500">👆 Login email Employee_details table mein nahi mila!</div>
          </div>`;
        }
        document.getElementById('tasksLoad').style.display='none';
        document.getElementById('tasksCont').style.display='block';
        return;
      }
    }

    // ── Step 2: Tasks fetch — ek hi query mein planned tasks + pending ongoing tasks ──
    // OR condition: (planned_date in range) OR (ongoing date in range AND not done)
    // NOTE: actual_timestamp wali condition hata di — done task sirf apni planned_date pe dikhega,
    // doosre din nahi aayega chahe kisi bhi din done kiya ho
    const orFilter = `or=(and(planned_date.gte.${fetchFrom},planned_date.lte.${fetchTo}),and(ongoing.gte.${fetchFrom},ongoing.lte.${fetchTo},actual_timestamp.is.null))`;
    let tasksBaseUrl;
    if(isOwner){
      tasksBaseUrl = `${SUPABASE_URL}/rest/v1/employee_checklists?select=*`
                   + `&${orFilter}`
                   + `&order=planned_date.desc,id.asc`;
    } else {
      tasksBaseUrl = `${SUPABASE_URL}/rest/v1/employee_checklists?select=*`
                   + `&emp_id=eq.${encodeURIComponent(myEmpId)}`
                   + `&${orFilter}`
                   + `&order=planned_date.desc,id.asc`;
    }

    const tasks = await tFetchAllPages(tasksBaseUrl);
    if(!Array.isArray(tasks)) throw new Error('Tasks fetch failed');

    // tasks = planned tasks + pending ongoing tasks (already merged in one query)
    const mergedTasks = tasks;

    // ── Step 3: Employee_details batch fetch ──
    const empIdSet = [...new Set(mergedTasks.map(r=>String(r.emp_id||'').trim()).filter(Boolean))];
    let empMap = {};
    if(empIdSet.length > 0){
      const edRes = await fetch(
        `${SUPABASE_URL}/rest/v1/Employee_details?select=Emp_id,Employee_name,Employee_Dept,Email_Id,Location&Emp_id=in.(${empIdSet.join(',')})`,
        { headers: SB_HDRS() }
      );
      const edRows = await edRes.json();
      if(Array.isArray(edRows)){
        edRows.forEach(r=>{
          const id = String(r.Emp_id || r.emp_id || '').trim();
          if(id) empMap[id] = {
            name:  String(r.Employee_name || '').trim(),
            dept:  String(r.Employee_Dept || '').trim(),
            email: String(r.Email_Id || '').trim(),
            loc:   String(r.Location || '').trim(),
          };
        });
      }
    }

    // ── Step 4: Build tAllData from merged tasks ──
    tAllData = mergedTasks.map(r => {
      const empId = String(r.emp_id || '').trim();
      const ed = empMap[empId] || {};
      // expected_date: YYYY-MM-DD → DD/MM/YYYY for display
      const expRaw = r.ongoing ? String(r.ongoing).trim() : null;
      const expParts = expRaw ? expRaw.split('-') : null;
      const expDisplay = expParts && expParts.length===3 ? `${expParts[2]}/${expParts[1]}/${expParts[0]}` : null;
      return {
        'Name':             ed.name  || empId || '',
        'Email':            ed.email || '',
        'Department':       ed.dept  || '',
        'Task ID':          String(r.sheet_task_id || '').trim(),
        'Freq':             String(r.frequency || '').trim(),
        'Task':             String(r.task_name || '').trim(),
        'Planned':          String(r.planned_date || r.planned_data || '').trim(),
        'Actual':           String(r.actual_timestamp || '').trim(),
        'Status':           r.actual_timestamp ? 'Done' : 'Pending',
        'Remarks':          String(r.remarks || '').trim(),
        '_location':        ed.loc || String(r.branch_id || '').trim(),
        '_id':              r.id,
        '_expected_date':   expRaw,
        '_expected_display':expDisplay,
        '_upload_url':      r.upload ? String(r.upload).trim() : null,
      };
    });

    if(tAllData.length===0 && !isOwner){
      const warn=document.getElementById('tNoTaskWarn');
      if(warn){
        warn.style.display='block';
        warn.innerHTML=`<div style="background:rgba(255,92,124,0.08);border:1px solid rgba(255,92,124,0.3);border-radius:12px;padding:16px 20px;margin:16px 0">
          <div style="color:#ff5c7c;font-weight:700;margin-bottom:8px">⚠️ No tasks found!</div>
          <div style="font-size:0.88rem;margin-bottom:6px">Login email: <b style="color:#f0a500">${myEmail}</b> | Emp ID: <b style="color:#f0a500">${myEmpId}</b></div>
          <div style="font-size:0.82rem;color:#f0a500">👆 employee_checklists mein is emp_id ka koi record nahi mila.</div>
        </div>`;
      }
      const navTasks=document.getElementById('nav-tasks');
      if(navTasks)navTasks.style.display='none';
      // Dashboards Tasks se independent — PERMISSIONS se control hoga
      const hasDashAccess=
        PERMISSIONS.can_view_crm==='true'||
        PERMISSIONS.can_view_leads==='true'||
        PERMISSIONS.can_view_collection==='true'||
        PERMISSIONS.can_view_fms==='true'||
        PERMISSIONS.can_view_ims==='true';
      const navDash=document.getElementById('nav-dashboards-trigger');
      if(navDash)navDash.style.display=hasDashAccess?'':'none';
      const dashGroup=document.getElementById('dashboardSubGroup');
      if(dashGroup)dashGroup.style.display=hasDashAccess?'':'none';
      document.querySelectorAll('#panel-home .home-card').forEach(card=>{
        if(card.textContent.includes('Task Checklist'))card.style.display='none';
      });
    }

    tAllData.forEach(r=>{ r['_tDate']=tParseDate(r['Planned']); });

    // ── DB Sync: agar DB mein ongoing/upload NULL hai toh localStorage bhi clear karo ──
    tSyncLocalStorageWithDB(tAllData);

    tProcessData();
    window._tasksEverLoaded = true;
    tInitUploadsButton(); // Show 📂 Uploaded Files button for owner/MIS/Saajan
    document.getElementById('tasksLoad').style.display='none';
    const _tc = document.getElementById('tasksCont');
    _tc.style.display='block';
    _tc.style.opacity='1';
    _tc.style.pointerEvents='';
    document.getElementById('tasksSync').textContent='Updated '+new Date().toLocaleTimeString();

  }catch(e){
    document.getElementById('tasksLoad').style.display='none';
    const _tcErr = document.getElementById('tasksCont');
    _tcErr.style.display='block';
    _tcErr.style.opacity='1';
    _tcErr.style.pointerEvents='';
    document.getElementById('tTblBody').innerHTML=`<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--hot)">❌ ${e.message}</td></tr>`;
  }
}



async function refreshTasks(){
  const btn=document.getElementById('tasksRefBtn');
  btn.classList.add('spinning');
  Object.values(tCharts).forEach(c=>c&&c.destroy&&c.destroy()); tCharts={};
  tActiveKpi=null; tActivePerson=null; tActiveDept=null; tActiveStatus=null;
  _tasksCache=null;
  tLoaded=true;
  // Refresh = aaj ke tasks dikhao (dono ke liye — employee aur admin)
  const _ts = new Date().toISOString().slice(0,10);
  await loadTasks(_ts, _ts);
  btn.classList.remove('spinning');
}

function tProcessData(){
  // 1. Restore locally-saved done states
  tApplyDoneTasks();

  // 2. Date filter is already set by loadTasks()

  // 3. Populate dropdowns
  tPopulateFilters();

  // 4. Yield BEFORE every heavy render step to keep browser responsive
  //    Each setTimeout(0) gives browser a chance to breathe between steps
  setTimeout(function(){
    tRenderKPIs();
    setTimeout(function(){
      tRenderCharts();
      setTimeout(function(){
        tFiltered = tGetFiltered(); tPage=1;
        tRenderTable();
        tUpdateBadge();
        updateHomeTaskBanner();
      }, 0);
    }, 0);
  }, 0);
}

// ══════════════════════════════════════════════════════════════════════
// MANDATORY ATTACHMENT TASKS (Akshay More checklist — Attachment col mein *)
// Agar employee in tasks ke liye attachment upload nahi karta, task
// "Done" nahi banega aur KPI/Charts mein bhi count nahi hoga — chahe wo
// "Mark Done" dabaye ya na dabaye. Spelling DB ke 'task_name' se exact
// match honi chahiye (case/extra-space ignore hoti hai).
// ══════════════════════════════════════════════════════════════════════
const MANDATORY_ATTACHMENT_TASKS = [
  'open tickets less than 24 hours',
  'open tickets more than 24 hours',
  'open tickets more than 48 hours',
  'open tickets more than 96 hours',
  'checkin pending activity',
  'checkout pending activity',
  'training videos creation',
  '1 1 meetings with l1 team',
  '1 1 meetings with l2 team',
  'l1 team utilization',
  'un read emails',
  'missed calls response',
  'un read whatsapp',
  // ↓ Sakshi Tupe / Vinit Singh / Chirag Gupta checklist ke extra * wale tasks
  'escalations',
  'ims status check'
];

function tNormTaskName(s){
  return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}

function tTaskRequiresAttachment(taskName){
  const norm = tNormTaskName(taskName);
  if(!norm) return false;
  return MANDATORY_ATTACHMENT_TASKS.indexOf(norm) !== -1;
}

// Attachment exists for this row? — Supabase 'upload' column OR localStorage backup
function tHasAttachment(r){
  if(!r) return false;
  if(r['_upload_url']) return true;
  const tid = String(r['Task ID']||'');
  return tGetUploadCount(tid) > 0;
}

function tIsDone(r){
  const s=String(r['Status']||'').toLowerCase().trim();
  const actual=String(r['Actual']||'').trim();
  const markedDone = s==='done'||s==='yes'||s==='1'||s==='complete'||s==='completed'||actual!=='';
  if(!markedDone) return false;
  // ── Mandatory-attachment check: * wale task ke liye attachment zaroori hai,
  // warna chahe DB mein "actual_timestamp" set ho, hum use Pending hi maanenge ──
  if(tTaskRequiresAttachment(r['Task']) && !tHasAttachment(r)) return false;
  return true;
}

/* ══ HOME TASK ALERT BANNER — shows pending task count on home page ══ */
function updateHomeTaskBanner(){
  const banner = document.getElementById('homeTaskBanner');
  if(!banner) return;

  // Don't show for Managing Director, MIS, or PC roles
  const role = CURRENT_USER && (CURRENT_USER.rawRole||'').toLowerCase();
  if(!CURRENT_USER || CURRENT_USER.role==='owner' || role==='owner' || role==='mis' || role==='pc' || role==='executive assistant' || role==='ea' || role==='admin'){
    banner.style.display='none';
    return;
  }

  // Work with today's tasks — ongoing task sirf expected date (ongoing column) pe dikhega
  const todayStr = new Date().toISOString().slice(0,10);
  const todayAllTasks = tAllData.filter(r => tIsVisibleOnDate(r, todayStr));
  const todayTasks = tGetCountableForDate(todayStr, todayAllTasks);
  const totalToday = todayTasks.length;

  // If no countable tasks today, hide banner
  if(totalToday === 0){
    banner.style.display='none';
    return;
  }

  const doneTasks   = todayTasks.filter(r => tIsDone(r)).length;
  const pending     = totalToday - doneTasks;
  const userName    = (CURRENT_USER.name || CURRENT_USER.email.split('@')[0]).split(' ')[0];
  const now         = new Date();
  const hour        = now.getHours();

  banner.style.display = 'block';

  if(pending === 0){
    // All done — celebrate!
    banner.innerHTML = `
      <div class="htb-wrap htb-done">
        <div class="htb-icon">🏆</div>
        <div class="htb-body">
          <div class="htb-title">Outstanding work, ${userName}! All tasks completed.</div>
          <div class="htb-sub">
            You've finished all <strong>${totalToday} task${totalToday>1?'s':''}</strong> for today.
            Your score is looking great — keep this consistency going every day!
          </div>
          <div class="htb-count-chip">✅ ${doneTasks} / ${totalToday} Done Today</div>
        </div>
        <button class="htb-btn htb-btn-done" onclick="switchDB('tasks')">View Tasks</button>
      </div>`;
  } else {
    // Pending tasks remain
    const isUrgent = hour >= 16; // After 4 PM = urgent
    const greet    = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const urgencyNote = isUrgent
      ? `<div class="htb-urgent">⚠️ Day is ending — please complete your tasks before close of business!</div>`
      : `<span style="color:var(--muted);font-size:0.80rem;">Complete them now for a great performance score!</span>`;

    banner.innerHTML = `
      <div class="htb-wrap htb-pending">
        <div class="htb-icon">${isUrgent ? '⚠️' : '📋'}</div>
        <div class="htb-body">
          <div class="htb-title">
            ${greet}, ${userName}! You have <span class="htb-count">${pending}</span>
            pending task${pending>1?'s':''} today.
          </div>
          <div class="htb-sub">
            <strong>${doneTasks} of ${totalToday}</strong> task${totalToday>1?'s':''} completed so far.
            ${isUrgent ? '' : 'Head to your Task Checklist and mark them done to boost your score.'}
          </div>
          ${urgencyNote}
        </div>
        <button class="htb-btn htb-btn-go" onclick="switchDB('tasks')">Go to Tasks →</button>
      </div>`;
  }
}

function tGetFiltered(){
  return tAllData.filter(r=>{
    if(tActivePerson&&r['Name']!==tActivePerson) return false;
    if(tActiveDept&&r['Department']!==tActiveDept) return false;
    if(tActiveLocation&&(r['_location']||'')!==tActiveLocation) return false;
    if(tActiveStatus==='done'&&!tIsDone(r)) return false;
    if(tActiveStatus==='pending'&&(tIsDone(r)||tIsOngoing(r))) return false;
    if(tActiveStatus==='ongoing'&&(!tIsOngoing(r)||tIsDone(r))) return false;
    if(tActiveFreq&&String(r['Freq']||'').trim()!==tActiveFreq) return false;
    // ── Date filter — ongoing: sirf expected date pe dikhao; done: actual date pe ──
    if(tActiveDateFrom || tActiveDateTo){
      const df = tActiveDateFrom || '0000-01-01';
      const dt = tActiveDateTo   || '9999-12-31';
      if(tIsOngoing(r)){
        // Ongoing task: original planned date se HAAT ke expected date (ongoing column) pe aao
        const exp = r['_expected_date'] || r['_tDate'] || '';
        if(exp < df || exp > dt) return false;
      } else if(tIsDone(r)){
        // Done task: sirf apni planned_date pe dikhao
        // actual_date se match karne se task doosre din bhi dikh raha tha — FIX
        if((r['_tDate']||'') < df || (r['_tDate']||'') > dt) return false;
      } else {
        if((r['_tDate']||'') < df || (r['_tDate']||'') > dt) return false;
      }
    }
    const q=(document.getElementById('tSearch').value||'').toLowerCase();
    if(q&&!((r['Name']||'').toLowerCase().includes(q)||(r['Task']||'').toLowerCase().includes(q)||(r['Department']||'').toLowerCase().includes(q))) return false;
    return true;
  });
}

function tRenderKPIs(){
  // Use date-filtered data so KPIs match what the table shows
  const baseData = tGetDateFiltered();
  // ── Ongoing tasks are excluded; done ongoing tasks count on completion date ──
  const ongoingTasks = baseData.filter(r=>tIsOngoing(r));
  const ongoingCount = ongoingTasks.length;

  // If single day view, use tGetCountableForDate for accurate score
  // (ongoing task done today = +1 on today's count)
  let countableData;
  if(tActiveDateFrom && tActiveDateFrom === tActiveDateTo){
    countableData = tGetCountableForDate(tActiveDateFrom, baseData);
  } else {
    countableData = baseData.filter(r=>!tIsOngoing(r));
  }

  const total=countableData.length;
  const done=countableData.filter(r=>tIsDone(r)).length;
  const pending=total-done;
  const pct=total?Math.round((done/total)*100):0;

  // Unique employees (from date-filtered data)
  const uniqueEmp=[...new Set(baseData.map(r=>r['Name']).filter(Boolean))].length;

  // Score = (completed / countable_total * 100) - 100  → range: -100 to 0
  const score = total ? Math.round((done/total)*100) - 100 : -100;
  const scoreColor = score >= -10 ? '#00d4aa' : score >= -30 ? '#34d399' : score >= -50 ? '#4e9af1' : score >= -75 ? '#f0a500' : '#ff5c7c';

  const kpis=[
    {id:'all',      label:'Total Tasks',      value:total,       color:'#a855f7', sub:ongoingCount?ongoingCount+' ongoing excluded':'All records', clickable:true},
    {id:'done',     label:'Completed',        value:done,        color:'#00d4aa', sub:pct+'% completion',      clickable:true},
    {id:'pending',  label:'Pending',          value:pending,     color:'#f0a500', sub:(100-pct)+'% remaining', clickable:true},
    {id:'ongoing',  label:'🔄 Ongoing',       value:ongoingCount,color:'#00d4ff', sub:'Click to view all',     clickable:true},
    {id:'emp',      label:'Total Employees',  value:uniqueEmp,   color:'#f472b6', sub:'Active members',        clickable:true},
    {id:'score',    label:'Score',            value:score+'%',   color:scoreColor, sub:ongoingCount?'Ongoing excluded':'Overall Rate', clickable:true},
  ];

  // Set grid to 5 columns — handled via CSS #tKpiGrid rule
  const grid=document.getElementById('tKpiGrid');

  grid.innerHTML=kpis.map(k=>{
    const isActive=tActiveKpi===k.id;
    return `<div class="kpi-card ${isActive?'kpi-active':''}"
      style="--card-accent:${k.color};cursor:pointer;transition:all 0.2s"
      onclick="tKpiClick('${k.id}')">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value" style="color:${k.color}">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>
      <span class="kpi-badge" style="background:${k.color}22;color:${k.color}">${isActive?'✕ Clear':'↗ Filter'}</span>
    </div>`;
  }).join('');
}

function tKpiClick(id){
  if(tActiveKpi===id){tActiveKpi=null; tActiveStatus=null;}
  else{
    tActiveKpi=id;
    if(id==='done')    tActiveStatus='done';
    else if(id==='pending')  tActiveStatus='pending';
    else if(id==='ongoing')  tActiveStatus='ongoing';  // 🔄 Ongoing KPI click
    else tActiveStatus=null; // 'all', 'emp', 'score' → no status filter
  }
  tFiltered=tGetFiltered(); tPage=1;
  tRenderKPIs();
  tRenderCharts();
  tRenderTable();
  tUpdateBadge();
}

function tRenderCharts(){
  Object.values(tCharts).forEach(c=>c&&c.destroy&&c.destroy()); tCharts={};
  const {tc,gc,noGrid}=chartColors();
  // Use date-filtered data as base; apply kpi/status filter on top if active
  const chartData=(tFiltered&&tFiltered.length&&(tActiveKpi||tActivePerson||tActiveDept||tActiveStatus||tActiveFreq||tActiveLocation))?tFiltered:tGetDateFiltered();

  // 1. Status donut - clickable
  const doneCount=chartData.filter(r=>tIsDone(r)).length;
  const pendCount=chartData.length-doneCount;
  tCharts.status=new Chart(document.getElementById('tChStatus'),{
    type:'doughnut',
    data:{labels:['Completed','Pending'],datasets:[{
      data:[doneCount,pendCount],
      backgroundColor:tActiveStatus?
        (tActiveStatus==='done'?['#00d4aa',(document.body.classList.contains('light-mode')?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.06)')]:[(document.body.classList.contains('light-mode')?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.06)'),'#f0a500']):
        ['#00d4aa','#f0a500'],
      borderWidth:0,hoverOffset:8
    }]},
    options:{
      cutout:'62%',responsive:true,maintainAspectRatio:false,
      onClick:(_,els)=>{if(els.length){const lbl=['done','pending'][els[0].index];tChartFilter('status',lbl);}},
      onHover:(e,els)=>{e.native.target.style.cursor=els.length?'pointer':'default';},
      plugins:{legend:{labels:{color:tc,padding:14,font:{size:11}}}}
    }
  });

  // 2. Person bar - clickable
  // FIX: Use reduce to count in O(n) instead of filter-per-person O(n²)
  const personCountMap = chartData.reduce((acc,r)=>{ const n=r['Name']||''; acc[n]=(acc[n]||0)+1; return acc; },{});
  const persons = Object.keys(personCountMap).sort();
  const personCounts = persons.map(p=>personCountMap[p]);
  tCharts.person=new Chart(document.getElementById('tChPerson'),{
    type:'bar',
    data:{labels:persons,datasets:[{
      data:personCounts,
      backgroundColor:persons.map(p=>tActivePerson?
        (tActivePerson===p?'#00d4ff':(document.body.classList.contains('light-mode')?'rgba(0,212,255,0.12)':'rgba(0,212,255,0.15)')):
        '#00d4ff'),
      borderRadius:6,borderSkipped:false
    }]},
    options:{
      responsive:true,maintainAspectRatio:false,
      onClick:(_,els)=>{if(els.length)tChartFilter('person',persons[els[0].index]);},
      onHover:(e,els)=>{e.native.target.style.cursor=els.length?'pointer':'default';},
      plugins:{legend:{display:false}},
      scales:{
        x:{ticks:{color:tc,font:{size:9}},grid:{display:false}},
        y:{ticks:{color:tc},grid:{display:!noGrid,color:gc},beginAtZero:true}
      }
    }
  });

  // 3. Dept bar - clickable
  // FIX: Use reduce to count in O(n) instead of filter-per-dept O(n²)
  const deptCountMap = chartData.reduce((acc,r)=>{ const d=r['Department']||''; if(d){acc[d]=(acc[d]||0)+1;} return acc; },{});
  const depts = Object.keys(deptCountMap).sort();
  const deptCounts = depts.map(d=>deptCountMap[d]);
  const DCOLS=['#a855f7','#f0a500','#00d4aa','#00d4ff','#ff5c7c','#f472b6','#34d399'];
  tCharts.dept=new Chart(document.getElementById('tChDept'),{
    type:'bar',
    data:{labels:depts,datasets:[{
      data:deptCounts,
      backgroundColor:depts.map((d,i)=>tActiveDept?
        (tActiveDept===d?DCOLS[i%DCOLS.length]:(document.body.classList.contains('light-mode')?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.06)')):
        DCOLS[i%DCOLS.length]),
      borderRadius:6,borderSkipped:false
    }]},
    options:{
      responsive:true,maintainAspectRatio:false,
      onClick:(_,els)=>{if(els.length)tChartFilter('dept',depts[els[0].index]);},
      onHover:(e,els)=>{e.native.target.style.cursor=els.length?'pointer':'default';},
      plugins:{legend:{display:false}},
      scales:{
        x:{ticks:{color:tc,font:{size:9}},grid:{display:false}},
        y:{ticks:{color:tc},grid:{display:!noGrid,color:gc},beginAtZero:true}
      }
    }
  });

  // 4. Leaderboard — FIX: single-pass reduce instead of filter-per-person O(n²)
  const _statsMap = chartData.reduce((acc,r)=>{
    const n=r['Name']||''; if(!n) return acc;
    if(!acc[n]) acc[n]={name:n,dept:r['Department']||'',total:0,done:0,pending:0};
    acc[n].total++;
    if(tIsDone(r)) acc[n].done++; else acc[n].pending++;
    return acc;
  },{});
  const allStats = Object.values(_statsMap).map(p=>({
    ...p,score:+(p.done-p.pending*0.5).toFixed(1),
    pct:p.total?Math.round((p.done/p.total)*100):0
  })).sort((a,b)=>b.done-a.done);

  const medals=['🥇','🥈','🥉'];
  document.getElementById('tLeaderboard').innerHTML=`
    <table style="width:100%;border-collapse:collapse;font-size:0.83rem">
      <thead><tr style="color:var(--muted);border-bottom:1px solid var(--border)">
        <th style="padding:6px 8px;text-align:left">#</th>
        <th style="padding:6px 8px;text-align:left">NAME</th>
        <th style="padding:6px 8px;text-align:left">DEPARTMENT</th>
        <th style="padding:6px 8px;text-align:center">TOTAL</th>
        <th style="padding:6px 8px;text-align:center;color:#00d4aa">DONE</th>
        <th style="padding:6px 8px;text-align:center;color:#f0a500">PENDING</th>
      </tr></thead>
      <tbody>
        ${allStats.map((p,i)=>`
        <tr style="border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s" 
          onclick="tChartFilter('person','${p.name}')"
          onmouseover="this.style.background='var(--surface2)'" 
          onmouseout="this.style.background='transparent'">
          <td style="padding:7px 8px;font-size:1rem">${medals[i]||i+1}</td>
          <td style="padding:7px 8px;font-weight:600;color:${tActivePerson===p.name?'#a855f7':'var(--text)'}">${p.name}</td>
          <td style="padding:7px 8px"><span style="font-size:0.80rem;background:rgba(168,85,247,0.1);color:#a855f7;padding:2px 7px;border-radius:5px">${p.dept||'—'}</span></td>
          <td style="padding:7px 8px;text-align:center">${p.total}</td>
          <td style="padding:7px 8px;text-align:center;color:#00d4aa;font-weight:600">${p.done}</td>
          <td style="padding:7px 8px;text-align:center;color:#f0a500;font-weight:600">${p.pending}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function tChartFilter(type, val){
  if(type==='person'){
    tActivePerson=(tActivePerson===val)?null:val;
    document.getElementById('tFPerson').value=tActivePerson||'';
  } else if(type==='dept'){
    tActiveDept=(tActiveDept===val)?null:val;
    document.getElementById('tFDept').value=tActiveDept||'';
  } else if(type==='status'){
    tActiveStatus=(tActiveStatus===val)?null:val;
    if(tActiveStatus) tActiveKpi=tActiveStatus;
    else tActiveKpi=null;
    document.getElementById('tFStatus').value=tActiveStatus||'';
  }
  tFiltered=tGetFiltered(); tPage=1;
  tRenderKPIs();
  tRenderCharts();
  tRenderTable();
  tUpdateBadge();
}

function tUpdateBadge(){
  const badge=document.getElementById('tCFBadge');
  const parts=[];
  if(tActiveDateFrom||tActiveDateTo){
    const f=tActiveDateFrom||'…', t=tActiveDateTo||'…';
    parts.push(`<strong style="color:#06b6d4">📅 ${f} → ${t}</strong>`);
  }
  if(tActivePerson) parts.push(`<strong style="color:#00d4ff">👤 ${tActivePerson}</strong>`);
  if(tActiveDept) parts.push(`<strong style="color:#a855f7">🏢 ${tActiveDept}</strong>`);
  if(tActiveLocation) parts.push(`<strong style="color:#06b6d4">📍 ${tActiveLocation}</strong>`);
  if(tActiveFreq) parts.push(`<strong style="color:#34d399">🔄 ${tActiveFreq}</strong>`);
  if(tActiveStatus) parts.push(`<strong style="color:#f0a500">${tActiveStatus==='done'?'✅ Completed':tActiveStatus==='ongoing'?'🔄 Ongoing':'⏳ Pending'}</strong>`);
  if(parts.length){
    badge.style.display='flex';
    badge.innerHTML='🎯 Filter: '+parts.join(' + ')+'';
  } else {
    badge.style.display='none';
  }
}

function tPopulateFilters(){
  // _tDate already parsed in loadTasks — no need to re-parse here
  const depts=[...new Set(tAllData.map(r=>r['Department']).filter(Boolean))].sort();
  const persons=[...new Set(tAllData.map(r=>r['Name']).filter(Boolean))].sort();
  const freqs=[...new Set(tAllData.map(r=>String(r['Freq']||'').trim()).filter(Boolean))].sort();
  document.getElementById('tFDept').innerHTML='<option value="">All Departments</option>'+depts.map(d=>`<option value="${d}">${d}</option>`).join('');
  document.getElementById('tFPerson').innerHTML='<option value="">All People</option>'+persons.map(p=>`<option value="${p}">${p}</option>`).join('');
  document.getElementById('tFFreq').innerHTML='<option value="">All Frequency</option>'+freqs.map(f=>`<option value="${f}">${f}</option>`).join('');
  // Show location filter only for Managing Director/mis/pc
  const locEl=document.getElementById('tFLocation');
  if(locEl && CURRENT_USER && CURRENT_USER.role==='owner'){
    locEl.style.display='';
  } else if(locEl){
    locEl.style.display='none';
  }
  // ── Date filter visibility: sirf Managing Director/MIS/PC ko hi date change karne ka option mile.
  // Baaki employees ke liye From/To inputs aur unke labels hide ho jaate hain — but
  // background mein "today" ka filter pehle se applied hai (tInit mein set hota hai),
  // toh unhe by-default aaj ke tasks dikhte rahenge.
  const _isPrivilegedDate = CURRENT_USER && (
    CURRENT_USER.role === 'owner' ||
    CURRENT_USER.rawRole === 'owner' ||
    CURRENT_USER.rawRole === 'mis' ||
    CURRENT_USER.rawRole === 'pc' ||
    CURRENT_USER.rawRole === 'executive assistant' ||
    CURRENT_USER.rawRole === 'ea'
  );
  document.querySelectorAll('.tDateFilterEl').forEach(el=>{
    el.style.display = _isPrivilegedDate ? '' : 'none';
  });
}

function tApply(){
  const dept=document.getElementById('tFDept').value;
  const person=document.getElementById('tFPerson').value;
  const status=document.getElementById('tFStatus').value;
  const freq=document.getElementById('tFFreq').value;
  const dateFrom=document.getElementById('tFDateFrom').value;
  const dateTo=document.getElementById('tFDateTo').value;
  const locEl=document.getElementById('tFLocation');
  const loc=locEl?locEl.value:'';

  // Date change hone pe DONO ke liye server se re-fetch karo — debounced (no jerk)
  if(dateFrom !== tActiveDateFrom || dateTo !== tActiveDateTo){
    clearTimeout(window._tDateFilterTimer);
    window._tDateFilterTimer = setTimeout(()=>{
      loadTasks(dateFrom || undefined, dateTo || undefined);
    }, 400);
    return;
  }

  tActiveDept=dept||null;
  tActivePerson=person||null;
  tActiveStatus=status||null;
  tActiveFreq=freq||null;
  tActiveDateFrom=dateFrom||null;
  tActiveDateTo=dateTo||null;
  tActiveLocation=loc||null;
  if(!status) tActiveKpi=null;
  tFiltered=tGetFiltered(); tPage=1;
  tRenderKPIs();
  tRenderCharts();
  tRenderTable();
  tUpdateBadge();
}





function fmtDate(val){
  if(!val||val==='—'||val==='') return '—';
  const s=String(val).trim();
  // Already formatted DD/MM/YYYY
  if(/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s;
  // Pure date: YYYY-MM-DD → DD/MM/YYYY (no timezone, no time)
  const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  // ISO datetime with T: show only date part (ignore time/timezone)
  const isoDate = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if(isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
  // Fallback: try Date parse but only show date
  try{
    const d=new Date(s);
    if(isNaN(d.getTime())) return s;
    const day=String(d.getDate()).padStart(2,'0');
    const mon=String(d.getMonth()+1).padStart(2,'0');
    const yr=d.getFullYear();
    return `${day}/${mon}/${yr}`;
  }catch(e){return s;}
}

// ── Task Checklist Actual column — UTC → IST (Mumbai +5:30) display ──
function fmtDateTime(val){
  if(!val||val==='—'||val==='') return '—';
  try{
    let s = String(val).trim();
    if(!s) return '—';
    // Supabase plain timestamp column 'Z' ya '+00:00' nahi deta
    // Browser bina timezone ke string ko LOCAL time maanta hai (IST)
    // Isliye 'Z' append karo — force UTC parsing
    if(!/[Zz]|[+-]\d{2}:?\d{2}$/.test(s)) s += 'Z';
    const d = new Date(s);
    if(isNaN(d.getTime())) return String(val);
    // UTC + 5:30 = IST
    const istMs = d.getTime() + (330 * 60 * 1000);
    const ist   = new Date(istMs);
    const dd    = String(ist.getUTCDate()).padStart(2,'0');
    const mon   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][ist.getUTCMonth()];
    const yr    = ist.getUTCFullYear();
    const hh    = String(ist.getUTCHours()).padStart(2,'0');
    const mn    = String(ist.getUTCMinutes()).padStart(2,'0');
    return `${dd} ${mon} ${yr}, ${hh}:${mn}`;
  }catch(e){ return String(val); }
}

function tRenderTable(){
  const start=(tPage-1)*T_PER_PAGE;
  const pg=tFiltered.slice(start,start+T_PER_PAGE);
  document.getElementById('tTblCnt').textContent=tFiltered.length+' tasks';
  // Supabase version: Google Form URLs removed — inline remarks input se direct DB update
  const buildPrefillUrl = function(r){ return null; };
  document.getElementById('tTblBody').innerHTML=pg.map((r,i)=>{
    const done=tIsDone(r);
    const isOngoing=!done&&tIsOngoing(r);
    const ongoingData=tGetOngoingData(r['Task ID']);
    const isSupport=(r['Department']||'').toLowerCase()==='support'||r['_source']==='support';
    // ── FIX (Goa): isSales check sirf HO Sales sheet ke liye chale, branch (goa/gujarat/bangalore)
    // ke Sales-dept rows ke liye nahi. Branch employees pre-filled Google Form direct kholenge,
    // jaisa support/HO main mein hota hai. Pehle Department='Sales' Goa sheet mein hone se
    // remarks-popup khul jata tha — wo galat behaviour tha.
    const _src=String(r['_source']||'').toLowerCase();
    const isBranch=_src==='goa'||_src==='gujarat'||_src==='bangalore';
    const isSales=!isBranch && _src==='sales';
    const statusBadge=done
      ?'<span class="badge" style="background:rgba(0,212,170,0.12);color:#00d4aa;border:1px solid rgba(0,212,170,0.25)">✅ Done</span>'
      :isOngoing
      ?'<span class="badge" style="background:rgba(0,212,255,0.12);color:#00d4ff;border:1px solid rgba(0,212,255,0.25)">🔄 Ongoing</span>'
      :'<span class="badge" style="background:rgba(240,165,0,0.1);color:#f0a500;border:1px solid rgba(240,165,0,0.2)">⏳ Pending</span>';
    const _undoBtn = (done && _canUndoTask())
      ? `<button onclick="tUndoTask('${r['Task ID']||''}')"
           title="Undo — Set task back to Pending"
           style="margin-top:4px;width:100%;background:rgba(255,92,124,0.10);border:1.5px solid rgba(255,92,124,0.35);color:#ff5c7c;border-radius:7px;padding:4px 6px;font-size:0.72rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px;white-space:nowrap;transition:all 0.18s;"
           onmouseover="this.style.background='rgba(255,92,124,0.22)'" onmouseout="this.style.background='rgba(255,92,124,0.10)'">
           ↩️ Undo
         </button>`
      : '';
    // ── Mandatory attachment check — agar * wala task hai aur abhi file upload nahi hui ──
    const _needsAttach   = tTaskRequiresAttachment(r['Task']);
    const _attachMissing = _needsAttach && !tHasAttachment(r);
    const actionCell=done
      ?`<div style="display:flex;flex-direction:column;align-items:flex-start;">
          <span style="color:#00d4aa;font-size:0.84rem;font-weight:700;display:flex;align-items:center;gap:4px;">✅ Done</span>
          ${_undoBtn}
        </div>`
      :_attachMissing
      ?`<button data-dept-tid="${r['Task ID']||''}" onclick="tBlockedMarkDone('${r['Task ID']||''}')"
            title="First Upload📎the document"
            style="background:rgba(255,92,124,0.10);color:#ff5c7c;border:1.5px dashed rgba(255,92,124,0.5);border-radius:8px;padding:6px 8px;font-size:0.76rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap;width:100%;transition:all 0.18s;">
            📎 Upload Required
          </button>`
      :`<button data-dept-tid="${r['Task ID']||''}" onclick="deptShowRemarksInput('${r['Task ID']||''}','${_src}')"
            style="background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;border-radius:8px;padding:6px 8px;font-size:0.78rem;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap;width:100%;box-shadow:0 2px 6px rgba(168,85,247,0.3);transition:all 0.18s;">
            ✅ Mark Done
          </button>`;
    const remarks = r['Remarks']||'';
    const remarkCell = remarks
      ? `<span style="font-size:0.82rem;color:var(--text);background:var(--surface2);padding:3px 7px;border-radius:5px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${remarks.replace(/"/g,'')}">${remarks}</span>`
      : `<span style="color:var(--muted);font-size:0.82rem">—</span>`;
    const deptColor = (r['Department']||'').toLowerCase()==='support' ? '#00d4ff' : (r['Department']||'').toLowerCase()==='sales' ? '#00d4aa' : '#a855f7';
    const deptBg = (r['Department']||'').toLowerCase()==='support' ? 'rgba(0,212,255,0.1)' : (r['Department']||'').toLowerCase()==='sales' ? 'rgba(0,212,170,0.1)' : 'rgba(168,85,247,0.1)';
    const ongoingCell = done
      ? `<span style="color:#00d4aa;font-size:0.82rem;font-weight:600">✅ Done</span>`
      : isOngoing
      ? `<div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start">
           <span style="color:#00d4ff;font-size:0.80rem;font-weight:700">🔄 Ongoing</span>
           ${ongoingData&&ongoingData.expectedDate?`<span style="color:var(--muted);font-size:0.71rem;font-weight:500">📅 ${ongoingData.expectedDate}</span>`:''}
         </div>`
      : `<button id="ong_${r['Task ID']||''}" onclick="tShowOngoing('${r['Task ID']||''}','${_src}')"
           style="background:rgba(0,212,255,0.08);border:1.5px solid rgba(0,212,255,0.3);color:#00d4ff;border-radius:8px;padding:6px 8px;font-size:0.78rem;font-weight:700;cursor:pointer;white-space:nowrap;width:100%;display:flex;align-items:center;justify-content:center;gap:4px;transition:all 0.18s;">
           🔄 Ongoing
         </button>`;
    const hasUpload = !!(r['_upload_url'] || tGetUploadCount(r['Task ID']||'') > 0);
    const uploadUrl  = r['_upload_url'] || (() => { try{ const s=JSON.parse(localStorage.getItem('aditiTaskUploads')||'{}'); const f=(s[String(r['Task ID']||'')]||[])[0]; return f?f.url:null; }catch(e){return null;} })();
    const uploadCell = `
      <input type="file" id="tfu_${r['Task ID']||''}" style="display:none;" accept="*/*"
        onchange="tDirectUpload(this,'${r['Task ID']||''}')">
      <div style="display:flex;align-items:center;justify-content:center;">
        ${hasUpload && uploadUrl
          ? `<a href="${uploadUrl}" target="_blank" rel="noopener" title="See Your Uploaded file"
               style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;
                      background:rgba(0,212,170,0.12);border:1.5px solid rgba(0,212,170,0.4);
                      border-radius:8px;text-decoration:none;font-size:1rem;cursor:pointer;transition:all 0.18s;"
               onmouseover="this.style.background='rgba(0,212,170,0.25)'"
               onmouseout="this.style.background='rgba(0,212,170,0.12)'">📄</a>`
          : `<button id="tfu_btn_${r['Task ID']||''}" title="${_attachMissing?'Mandatory — File/PDF':'Upload file'}"
               onclick="document.getElementById('tfu_${r['Task ID']||''}').click()"
               style="position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px;
                      background:${_attachMissing?'rgba(255,92,124,0.10)':'rgba(168,85,247,0.08)'};border:1.5px solid ${_attachMissing?'rgba(255,92,124,0.5)':'rgba(168,85,247,0.3)'};
                      border-radius:8px;font-size:1rem;cursor:pointer;transition:all 0.18s;color:${_attachMissing?'#ff5c7c':'#a855f7'};"
               onmouseover="this.style.background='${_attachMissing?'rgba(255,92,124,0.22)':'rgba(168,85,247,0.22)'}'"
               onmouseout="this.style.background='${_attachMissing?'rgba(255,92,124,0.10)':'rgba(168,85,247,0.08)'}'">📎${_needsAttach?'<span style="position:absolute;top:-2px;right:-2px;color:#ff5c7c;font-weight:900;font-size:0.95rem;">*</span>':''}</button>`
        }
      </div>`;
    return `<tr>
      <td style="padding:0;width:30px;text-align:center;"><input type="checkbox" class="t-row-cb" data-id="${r['_id']}" onchange="tOnCheckChange()" style="width:13px;height:13px;cursor:pointer;margin:0;"></td>
      <td style="padding:8px 4px;"><div style="font-weight:600;font-size:0.84rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(r['Name']||'')}">${r['Name']||'—'}</div></td>
      <td style="padding:8px 8px;font-size:0.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(r['Task']||'').replace(/"/g,'')}${_needsAttach?' (Attachment Mandatory)':''}">${r['Task']||'—'}${_needsAttach?'<span title="Attachment Mandatory" style="color:#ff5c7c;font-weight:900;margin-left:3px;">*</span>':''}</td>
      <td style="padding:9px 6px;font-size:0.82rem;color:${isOngoing?'#00d4ff':'var(--muted)'}">
        ${isOngoing && r['_expected_date']
          ? `<div style="display:flex;flex-direction:column;gap:1px;">
               <span style="font-weight:700;">${fmtDate(r['_expected_date'])}</span>
               <span style="font-size:0.70rem;color:var(--muted);">from ${fmtDate(r['Planned'])}</span>
             </div>`
          : fmtDate(r['Planned'])
        }
      </td>
      <td style="padding:9px 6px;font-size:0.82rem;color:${r['Actual']?'#00d4aa':'var(--muted)'}">${fmtDateTime(r['Actual'])}</td>
      <td style="padding:9px 6px;">${remarkCell}</td>
      <td style="padding:7px 5px;" id="act_${r['Task ID']||''}">${actionCell}</td>
      <td style="padding:7px 5px;" id="ong_td_${r['Task ID']||''}">${ongoingCell}</td>
      <td style="padding:8px 4px;text-align:center;">${uploadCell}</td>
    </tr>`;
  }).join('');

  const tp=Math.ceil((tFiltered.length||1)/T_PER_PAGE);
  let h=`<span class="page-info">Page ${tPage} of ${tp}</span>`;
  h+=`<button class="page-btn" onclick="tGoPage(${tPage-1})" ${tPage===1?'disabled':''}>‹</button>`;
  for(let p=1;p<=Math.min(tp,7);p++) h+=`<button class="page-btn ${p===tPage?'active':''}" onclick="tGoPage(${p})">${p}</button>`;
  h+=`<button class="page-btn" onclick="tGoPage(${tPage+1})" ${tPage===tp?'disabled':''}>›</button>`;
  document.getElementById('tPagBar').innerHTML=h;
}

// ── Task Delete Functions ──────────────────────────────────────
let _tSelectedIds = new Set();

function tOnCheckChange(){
  _tSelectedIds = new Set();
  document.querySelectorAll('.t-row-cb:checked').forEach(cb => {
    _tSelectedIds.add(Number(cb.dataset.id));
  });
  const btn = document.getElementById('tDeleteBtn');
  const cnt = document.getElementById('tDelCount');
  const all = document.getElementById('tSelectAll');
  if(btn) btn.style.display = _tSelectedIds.size > 0 ? 'inline-flex' : 'none';
  if(cnt) cnt.textContent = _tSelectedIds.size;
  const total = document.querySelectorAll('.t-row-cb').length;
  if(all) all.indeterminate = _tSelectedIds.size > 0 && _tSelectedIds.size < total;
  if(all) all.checked = _tSelectedIds.size === total && total > 0;
}

function tToggleSelectAll(checked){
  _tSelectedIds = new Set();
  document.querySelectorAll('.t-row-cb').forEach(cb => {
    cb.checked = checked;
    if(checked) _tSelectedIds.add(Number(cb.dataset.id));
  });
  const btn = document.getElementById('tDeleteBtn');
  const cnt = document.getElementById('tDelCount');
  if(btn) btn.style.display = _tSelectedIds.size > 0 ? 'inline-flex' : 'none';
  if(cnt) cnt.textContent = _tSelectedIds.size;
}

async function tDeleteSelected(){
  if(PERMISSIONS.can_delete_tasks !== 'true'){
    alert('❌ You do not have permission to delete tasks.');
    return;
  }
  if(_tSelectedIds.size === 0) return;
  const confirmed = confirm(`⚠️ Are you sure you want to delete ${_tSelectedIds.size} task(s)? This cannot be undone.`);
  if(!confirmed) return;

  const ids = [..._tSelectedIds];
  let deleted = 0;
  let failed  = 0;

 try {
    const idList = ids.join(',');
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/employee_checklists?id=in.(${idList})`,
      { method: 'DELETE', headers: SB_HDRS() }
    );
    if(res.ok) deleted = ids.length;
    else failed = ids.length;
  } catch(e){
    failed = ids.length;
  }

  _tSelectedIds = new Set();
  const btn = document.getElementById('tDeleteBtn');
  const all = document.getElementById('tSelectAll');
  if(btn) btn.style.display = 'none';
  if(all) all.checked = false;

  await tFetchTasks();

  if(failed > 0) alert(`✅ ${deleted} deleted, ❌ ${failed} failed.`);
}  

function tGoPage(p){
  const tp=Math.ceil((tFiltered.length||1)/T_PER_PAGE);
  if(p<1||p>tp) return;
  tPage=p; tRenderTable();
  document.querySelector('#panel-tasks .table-card').scrollIntoView({behavior:'smooth',block:'start'});
}

// ── Mark Done — Local update only ─
// ── LocalStorage persistence for done tasks ──────────────────────────
function tSaveDoneTask(taskId, actualTime){
  try{
    const key='aditiDoneTasks';
    const saved=JSON.parse(localStorage.getItem(key)||'{}');
    // Store actual time + savedAt timestamp so tApplyDoneTasks can check age
    saved[String(taskId)]={actual:actualTime, savedAt:Date.now()};
    localStorage.setItem(key,JSON.stringify(saved));
  }catch(e){}
}

function tApplyDoneTasks(){
  // Locally-saved done states sirf click ke turant baad visual feedback ke liye.
  // 60s TTL — agar user form submit kare aur sheet se confirm aa jaye, pehle se
  // "Done" dikhta rahega. Agar user submit na kare, 60s baad task wapas Pending.
  // Live sync har ~45s pe chalti hai — sheet = source of truth always.
  try{
    const key='aditiDoneTasks';
    const saved=JSON.parse(localStorage.getItem(key)||'{}');
    if(!Object.keys(saved).length) return;
    const nowMs=Date.now();
    const MAX_AGE_MS=0; // 0 = disabled — sheet is ALWAYS source of truth (row delete = turant Pending)
    const stillNeeded={};
    tAllData.forEach(r=>{
      const tid=String(r['Task ID']);
      const entry=saved[tid];
      if(!entry) return;
      if(tIsDone(r)){
        return; // Sheet already confirmed done — remove from cache
      }
      // Sheet says NOT done. Check how old this local entry is.
      const savedAt = typeof entry === 'object' ? (entry.savedAt||0) : 0;
      const actualTime = typeof entry === 'object' ? (entry.actual||entry) : entry;
      const ageMs = nowMs - savedAt;
      if(savedAt && ageMs <= MAX_AGE_MS){
        // Very recent (within 90s) — sheet might not have updated yet from form
        r['Status']='done';
        r['Actual']=actualTime;
        stillNeeded[tid]=entry;
      }
      // else: too old OR no timestamp → sheet wins → task shows as Pending/Not Done
    });
    localStorage.setItem(key,JSON.stringify(stillNeeded));
  }catch(e){}
}

// ── Date-aware base data for KPI & Charts ────────────────────────────
// ── DB Sync: DB se NULL aane par localStorage bhi clear karo ────────────
function tSyncLocalStorageWithDB(dataArr){
  try{
    const ongoingStore = JSON.parse(localStorage.getItem(ONGOING_KEY)||'{}');
    const uploadStore  = JSON.parse(localStorage.getItem('aditiTaskUploads')||'{}');
    let ongoingChanged = false, uploadChanged = false;
    dataArr.forEach(r=>{
      const tid = String(r['Task ID']||'');
      if(!tid) return;
      // DB mein ongoing NULL hai → localStorage se bhi hatao
      if(!r['_expected_date'] && ongoingStore[tid]){
        delete ongoingStore[tid];
        ongoingChanged = true;
      }
      // DB mein upload NULL hai → localStorage se bhi hatao
      if(!r['_upload_url'] && uploadStore[tid]){
        delete uploadStore[tid];
        uploadChanged = true;
      }
    });
    if(ongoingChanged) localStorage.setItem(ONGOING_KEY, JSON.stringify(ongoingStore));
    if(uploadChanged)  localStorage.setItem('aditiTaskUploads', JSON.stringify(uploadStore));
  }catch(e){}
}

// ── Ongoing Task Date Range Check ───────────────────────────────────────
// Ongoing task un tamam dinon mein dikhega jab tak expected date na aa jaye
// r['_tDate'] = planned date (YYYY-MM-DD)
// r['_expected_date'] = expected completion date (YYYY-MM-DD)
function tIsVisibleOnDate(r, dateStr){
  const planned = r['_tDate'];
  if(!planned) return false;

  if(tIsDone(r)){
    // Done task: sirf apni planned_date pe dikhao
    // actual_timestamp se match karne se task doosre din bhi dikh raha tha — FIX
    return planned === dateStr;
  }

  if(tIsOngoing(r)){
    // Ongoing task: sirf expected date pe dikhao (original planned date se HAAT jao)
    const exp = r['_expected_date'];
    if(!exp) return planned === dateStr;
    return exp === dateStr; // exact match only
  }

  // Normal pending: sirf planned date pe
  return planned === dateStr;
}

// ── Ongoing done = us din +1 task count ─────────────────────────────────
// Returns tasks that should be counted on a given date for score calculation
function tGetCountableForDate(dateStr, dataArr){
  return (dataArr||tAllData).filter(r=>{
    if(tIsOngoing(r)) return false; // active ongoing = count nahi
    if(tIsDone(r)){
      // Done tasks: agar actual date = dateStr → count (even if planned != dateStr)
      const actualRaw = String(r['Actual']||'').trim();
      if(actualRaw){
        const actualDate = actualRaw.slice(0,10);
        if(actualDate === dateStr) return true; // completed today
        // Original planned date pe bhi count (agar actual date match nahi)
        return r['_tDate'] === dateStr;
      }
      return r['_tDate'] === dateStr;
    }
    // Pending: sirf planned date pe count
    return r['_tDate'] === dateStr;
  });
}


function tGetDateFiltered(){
  // KPI & Charts base data: date + person + dept + freq + location (NO status/kpi filter)
  return tAllData.filter(r=>{
    if(tActivePerson&&r['Name']!==tActivePerson) return false;
    if(tActiveDept&&r['Department']!==tActiveDept) return false;
    if(tActiveLocation&&(r['_location']||'')!==tActiveLocation) return false;
    if(tActiveFreq&&String(r['Freq']||'').trim()!==tActiveFreq) return false;
    // ── Date filter — ongoing: sirf expected date pe dikhao; done: actual date pe ──
    if(tActiveDateFrom || tActiveDateTo){
      const df = tActiveDateFrom || '0000-01-01';
      const dt = tActiveDateTo   || '9999-12-31';
      if(tIsOngoing(r)){
        // Ongoing task: original planned date se HAAT ke expected date (ongoing column) pe aao
        const exp = r['_expected_date'] || r['_tDate'] || '';
        if(exp < df || exp > dt) return false;
      } else if(tIsDone(r)){
        // Done task: sirf apni planned_date pe dikhao (actual_date se nahi)
        if((r['_tDate']||'') < df || (r['_tDate']||'') > dt) return false;
      } else {
        if((r['_tDate']||'') < df || (r['_tDate']||'') > dt) return false;
      }
    }
    const q=(document.getElementById('tSearch')?document.getElementById('tSearch').value||'':'').toLowerCase();
    if(q&&!((r['Name']||'').toLowerCase().includes(q)||(r['Task']||'').toLowerCase().includes(q)||(r['Department']||'').toLowerCase().includes(q))) return false;
    return true;
  });
}
// ─────────────────────────────────────────────────────────────────────



// ── Mandatory attachment missing — Mark Done block karo, upload ki taraf guide karo ──
function tBlockedMarkDone(taskId){
  const tid = String(taskId);
  showToast && showToast('📎 This task cannot be marked Done without the mandatory attachment! Please upload a file/PDF in the 📎 column first.', 'error', 4000);
  // Highlight the upload button so the employee knows where to click
  const upBtn = document.getElementById('tfu_btn_' + tid);
  if(upBtn){
    upBtn.style.transition = 'box-shadow 0.3s';
    upBtn.style.boxShadow  = '0 0 0 4px rgba(255,92,124,0.35)';
    setTimeout(()=>{ if(upBtn) upBtn.style.boxShadow = ''; }, 1400);
    upBtn.scrollIntoView({behavior:'smooth', block:'center', inline:'center'});
  }
}

// ── All Departments: Inline Remarks Input ───────────────────────────

function deptShowRemarksInput(taskId, src){
  const tid = String(taskId);
  // Find the button's TD — try data-dept-tid attribute first, then onclick match
  let td = null;
  const allBtns = document.querySelectorAll('[data-dept-tid="'+tid+'"]');
  if(allBtns.length) td = allBtns[0].closest('td');
  if(!td){
    const all = document.querySelectorAll('button');
    for(const b of all){
      if((b.getAttribute('onclick')||'').includes("deptShowRemarksInput('"+tid+"'")){
        td = b.closest('td'); break;
      }
    }
  }
  if(!td) return;
  td.style.whiteSpace = 'normal';
  td.style.minWidth   = '0';
  td.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:4px;width:100%;box-sizing:border-box;">
      <input type="text" id="dept_rem_${tid}"
             placeholder="Remarks (optional)..."
             style="padding:5px 7px;border-radius:6px;border:1.5px solid var(--border);
                    background:var(--surface2);color:var(--text);font-size:0.80rem;
                    width:100%;box-sizing:border-box;outline:none;font-family:inherit;"
             onkeydown="if(event.key==='Enter') deptSubmitDone('${tid}','${src}')">
      <div style="display:flex;gap:4px;width:100%;">
        <button onclick="deptSubmitDone('${tid}','${src}')"
                style="flex:1;background:#00d4aa;color:#000;border:none;border-radius:6px;
                       padding:4px 6px;font-size:0.78rem;font-weight:700;cursor:pointer;
                       white-space:nowrap;">✅ Submit</button>
        <button onclick="tRenderTable()"
                style="flex:0 0 auto;background:var(--surface2);color:var(--text2);
                       border:1px solid var(--border);border-radius:6px;
                       padding:4px 8px;font-size:0.78rem;cursor:pointer;">✕</button>
      </div>
    </div>`;
  try{ document.getElementById('dept_rem_'+tid).focus(); }catch(e){}
}

function deptSubmitDone(taskId, src){
  const tid = String(taskId);

  // ── Safety net: mandatory attachment wale task ko bina file ke Done mat hone do ──
  const _row = tAllData.find(r => String(r['Task ID']) === tid);
  if(_row && tTaskRequiresAttachment(_row['Task']) && !tHasAttachment(_row)){
    showToast && showToast('📎 This task cannot be marked Done without the mandatory attachment! Please upload a file/PDF in the 📎 column first.', 'error', 4000);
    tRenderTable();
    return;
  }

  const inp = document.getElementById('dept_rem_'+tid);
  const remarks = (inp ? inp.value : '').trim();

  const now = new Date();
  const day=String(now.getDate()).padStart(2,'0');
  const mon=String(now.getMonth()+1).padStart(2,'0');
  const yr=now.getFullYear();
  const hr=String(now.getHours()).padStart(2,'0');
  const mn=String(now.getMinutes()).padStart(2,'0');
  const sc=String(now.getSeconds()).padStart(2,'0');
  const actualForDisplay = day+'/'+mon+'/'+yr+' '+hr+':'+mn+':'+sc;

  // Turant UI update — sab arrays mein done mark karo
  [tAllData, tFiltered].forEach(arr=>{
    arr.forEach(r=>{
      if(String(r['Task ID'])===tid){
        r['Status']='Done';
        r['Actual']=actualForDisplay;
        r['Remarks']=remarks;
      }
    });
  });
  // Surgical DOM update — sirf is row ke cells update, puri table re-render nahi (no jerk)
  const _actEl = document.getElementById('act_' + tid);
  if(_actEl){
    _actEl.innerHTML = '<span style="color:#00d4aa;font-size:0.85rem;font-weight:700;display:flex;align-items:center;gap:4px;">✅ Done</span>';
    const _row = _actEl.closest('tr');
    if(_row){
      const _acTd = _row.cells[4]; // Actual column (index 4)
      if(_acTd){ _acTd.style.color='#00d4aa'; _acTd.textContent=fmtDateTime(now.toISOString()); }
      const _remTd = _row.cells[5]; // Remarks column (index 5, STATUS hata diya)
      if(_remTd){
        if(remarks){
          _remTd.innerHTML = '<span style="font-size:0.82rem;color:var(--text);background:var(--surface2);padding:3px 7px;border-radius:5px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+remarks.replace(/"/g,'')+'">'+ remarks +'</span>';
        } else {
          _remTd.innerHTML = '<span style="color:var(--muted);font-size:0.82rem">—</span>';
        }
      }
      // Ongoing column bhi Done dikhao
      const _ongTd = _row.cells[7]; // Ongoing column (index 7)
      if(_ongTd) _ongTd.innerHTML = '<span style="color:#00d4aa;font-size:0.82rem;font-weight:600">✅ Done</span>';
    }
  }
  setTimeout(()=>{ tRenderKPIs(); updateHomeTaskBanner&&updateHomeTaskBanner(); }, 200);
  tSaveDoneTask(tid, actualForDisplay);

  // ── Supabase REST API se update karo (id se match karke) ──
  const rowId = (tAllData.find(r=>String(r['Task ID'])===tid)||{})['_id'];
  if(rowId){
    fetch(
      `${SUPABASE_URL}/rest/v1/employee_checklists?id=eq.${encodeURIComponent(rowId)}`,
      {
        method: 'PATCH',
        headers: SB_HDRS_JSON(),
        body: JSON.stringify({
          actual_timestamp: now.toISOString(),
          remarks: remarks || null
        })
      }
    ).then(res => {
      if(res.ok) setTimeout(()=>{ _tasksLastSync=0; tSilentRefresh(); }, 3000);
    }).catch(()=>{});
  }
}

// ── Undo Access: Sirf MIS aur PC ko allowed ─────────────────────────────
function _canUndoTask(){
  if(typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return false;
  const r = String(CURRENT_USER.rawRole || '').toLowerCase().trim();
  return r === 'mis' || r === 'pc' || r === 'executive assistant' || r === 'ea';
}

// ── Undo Done Task — Supabase mein actual_timestamp + remarks NULL karo ──
function tUndoTask(taskId){
  if(!_canUndoTask()){
    showToast && showToast('⛔ Undo access is restricted to MIS and PC only.', 'error', 3000);
    return;
  }
  const tid = String(taskId);
  const row = tAllData.find(r => String(r['Task ID']) === tid);
  if(!row){ return; }

  // ─── Immediate local update ───────────────────────────────────────────
  [tAllData, tFiltered].forEach(arr => {
    arr.forEach(r => {
      if(String(r['Task ID']) === tid){
        r['Status']  = 'Pending';
        r['Actual']  = '';
        r['Remarks'] = '';
      }
    });
  });

  // Clear from localStorage done cache
  try{
    const saved = JSON.parse(localStorage.getItem('aditiDoneTasks') || '{}');
    delete saved[tid];
    localStorage.setItem('aditiDoneTasks', JSON.stringify(saved));
  }catch(e){}

  // ─── DOM: instantly flip row back to pending state ────────────────────
  const actEl = document.getElementById('act_' + tid);
  if(actEl){
    actEl.innerHTML = `<button data-dept-tid="${tid}" onclick="deptShowRemarksInput('${tid}','${String(row['_source']||'').toLowerCase()}')"
      style="background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;border-radius:8px;padding:6px 8px;font-size:0.78rem;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap;width:100%;box-shadow:0 2px 6px rgba(168,85,247,0.3);transition:all 0.18s;">
      ✅ Mark Done
    </button>`;
    const tr = actEl.closest('tr');
    if(tr){
      // Actual column
      const acTd = tr.cells[4];
      if(acTd){ acTd.style.color = 'var(--muted)'; acTd.textContent = '—'; }
      // Remarks column
      const remTd = tr.cells[5];
      if(remTd) remTd.innerHTML = '<span style="color:var(--muted);font-size:0.82rem">—</span>';
      // Ongoing column — wapas button
      const ongTd = tr.cells[7];
      if(ongTd) ongTd.innerHTML = `<button id="ong_${tid}" onclick="tShowOngoing('${tid}','${String(row['_source']||'').toLowerCase()}')"
        style="background:rgba(0,212,255,0.08);border:1.5px solid rgba(0,212,255,0.3);color:#00d4ff;border-radius:8px;padding:6px 8px;font-size:0.78rem;font-weight:700;cursor:pointer;white-space:nowrap;width:100%;display:flex;align-items:center;justify-content:center;gap:4px;transition:all 0.18s;">🔄 Ongoing</button>`;
    }
  }

  // Re-render KPIs + Charts immediately
  tRenderKPIs();
  tRenderCharts();
  updateHomeTaskBanner && updateHomeTaskBanner();

  // ─── Supabase PATCH: actual_timestamp + remarks = NULL ───────────────
  const rowId = row['_id'];
  if(rowId){
    fetch(
      `${SUPABASE_URL}/rest/v1/employee_checklists?id=eq.${encodeURIComponent(rowId)}`,
      {
        method: 'PATCH',
        headers: SB_HDRS_JSON(),
        body: JSON.stringify({ actual_timestamp: null, remarks: null })
      }
    ).then(res => {
      if(res.ok){
        showToast && showToast('↩️ Task undone & database updated!', 'success', 3000);
        setTimeout(() => { _tasksLastSync = 0; tSilentRefresh(); }, 3000);
      } else {
        showToast && showToast('⚠️ UI updated but DB sync failed. Refresh karain.', 'error', 4000);
      }
    }).catch(() => {
      showToast && showToast('⚠️ Network error — DB update failed.', 'error', 4000);
    });
  } else {
    showToast && showToast('↩️ Task locally undone. (No DB row ID found)', 'warning', 3000);
  }
}

// Legacy aliases — purane calls break na ho
function salesShowRemarksInput(taskId){ deptShowRemarksInput(taskId,'sales'); }
function salesSubmitDone(taskId){ deptSubmitDone(taskId,'sales'); }

// ═══════════════════════════════════════════════════════════════════════
// ONGOING STATUS — localStorage mein store karo
// ═══════════════════════════════════════════════════════════════════════

const ONGOING_KEY = 'aditiOngoingTasks';

function tGetOngoingData(taskId){
  // Pehle Supabase data check karo (row mein _expected_date field)
  const row = tAllData.find(r=>String(r['Task ID'])===String(taskId));
  if(row && row['_expected_date']){
    return { expectedDate: row['_expected_display'] || row['_expected_date'] };
  }
  // Fallback: localStorage
  try{
    const saved = JSON.parse(localStorage.getItem(ONGOING_KEY)||'{}');
    return saved[String(taskId)] || null;
  }catch(e){ return null; }
}

function tIsOngoing(r){
  if(tIsDone(r)) return false;
  // Supabase column check
  if(r['_expected_date']) return true;
  // localStorage fallback
  const data = tGetOngoingData(r['Task ID']);
  return !!(data && data.expectedDate);
}

function tGetUploadCount(taskId){
  try{
    const saved = JSON.parse(localStorage.getItem('aditiTaskUploads')||'{}');
    const files = saved[String(taskId)];
    return Array.isArray(files) ? files.length : 0;
  }catch(e){ return 0; }
}

function tSaveOngoingTask(taskId, expectedDate){
  try{
    const saved = JSON.parse(localStorage.getItem(ONGOING_KEY)||'{}');
    saved[String(taskId)] = { expectedDate, savedAt: Date.now() };
    localStorage.setItem(ONGOING_KEY, JSON.stringify(saved));
  }catch(e){}
}

function tRemoveOngoingTask(taskId){
  try{
    const saved = JSON.parse(localStorage.getItem(ONGOING_KEY)||'{}');
    delete saved[String(taskId)];
    localStorage.setItem(ONGOING_KEY, JSON.stringify(saved));
  }catch(e){}
}

function tShowOngoing(taskId, src){
  const tid = String(taskId);
  const td = document.getElementById('ong_td_' + tid);
  if(!td) return;
  // Default date: kal
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
  const tomorrowStr = tomorrow.toISOString().slice(0,10);
  td.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:4px;min-width:110px;box-sizing:border-box;">
      <label style="font-size:0.68rem;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Expected Completion Date</label>
      <input type="date" id="ong_date_${tid}" value="${tomorrowStr}" min="${new Date().toISOString().slice(0,10)}"
        style="padding:4px 6px;border-radius:6px;border:1.5px solid rgba(0,212,255,0.4);
               background:var(--surface2);color:var(--text);font-size:0.80rem;
               width:100%;box-sizing:border-box;outline:none;font-family:inherit;">
      <div style="display:flex;gap:4px;">
        <button onclick="tSubmitOngoing('${tid}','${src}')"
          style="flex:1;background:#00d4ff;color:#000;border:none;border-radius:6px;
                 padding:4px 0;font-size:0.76rem;font-weight:700;cursor:pointer;">✓ Set</button>
        <button onclick="tRenderTable()"
          style="flex:0 0 auto;background:var(--surface2);color:var(--text2);
                 border:1px solid var(--border);border-radius:6px;
                 padding:4px 7px;font-size:0.76rem;cursor:pointer;">✕</button>
      </div>
    </div>`;
  try{ document.getElementById('ong_date_'+tid).focus(); }catch(e){}
}

function tSubmitOngoing(taskId, src){
  const tid = String(taskId);
  const inp = document.getElementById('ong_date_'+tid);
  if(!inp || !inp.value){ alert('Please select a date!'); return; }
  const rawDate = inp.value; // YYYY-MM-DD
  const parts = rawDate.split('-');
  const displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY

  tSaveOngoingTask(tid, displayDate);

  // Immediate DOM update — status badge bhi update karo
  const td = document.getElementById('ong_td_'+tid);
  if(td){
    td.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start">
        <span style="color:#00d4ff;font-size:0.80rem;font-weight:700">🔄 Ongoing</span>
        <span style="color:var(--muted);font-size:0.71rem;font-weight:500">📅 ${displayDate}</span>
      </div>`;
  }
  const row = td ? td.closest('tr') : null;
  if(row){
    const stTd = row.cells[6]; // ACTION column — ongoing ke baad status reflect karne ki zaroorat nahi (STATUS column hata diya)
    // no-op: STATUS column removed
  }

  // ✅ Supabase mein expected_date column directly update karo
  const rowId = (tAllData.find(r=>String(r['Task ID'])===tid)||{})['_id'];
  if(rowId){
    fetch(
      `${SUPABASE_URL}/rest/v1/employee_checklists?id=eq.${encodeURIComponent(rowId)}`,
      { method:'PATCH', headers:SB_HDRS_JSON(), body:JSON.stringify({ ongoing: rawDate }) }
    ).catch(()=>{});
    // Local data update
    [tAllData, tFiltered].forEach(arr=>{
      arr.forEach(r=>{ if(String(r['Task ID'])===tid){ r['_expected_date']=rawDate; r['_expected_display']=displayDate; } });
    });
  }
  setTimeout(()=>{ tRenderKPIs(); updateHomeTaskBanner&&updateHomeTaskBanner(); }, 150);
}

function tCancelOngoing(taskId){
  const tid = String(taskId);
  tRemoveOngoingTask(tid);

  // ✅ Supabase mein expected_date NULL karo
  const rowId = (tAllData.find(r=>String(r['Task ID'])===tid)||{})['_id'];
  if(rowId){
    fetch(
      `${SUPABASE_URL}/rest/v1/employee_checklists?id=eq.${encodeURIComponent(rowId)}`,
      { method:'PATCH', headers:SB_HDRS_JSON(), body:JSON.stringify({ ongoing: null }) }
    ).catch(()=>{});
    [tAllData, tFiltered].forEach(arr=>{
      arr.forEach(r=>{ if(String(r['Task ID'])===tid){ r['_expected_date']=null; r['_expected_display']=null; } });
    });
  }
  tFiltered=tGetFiltered(); tRenderKPIs(); tRenderTable();
}

// ── Uploaded Files Viewer — owner / MIS / Saajan Jain access ──────────
function tCanViewUploads(){
  if(!CURRENT_USER) return false;
  const role = String(CURRENT_USER.rawRole||CURRENT_USER.role||'').toLowerCase().trim();
  if(CURRENT_USER.role==='owner' || role==='owner' || role==='mis') return true;
  // Saajan Jain special access
  const name = String(CURRENT_USER.name||'').trim().toLowerCase();
  return name==='saajan jain';
}

function tInitUploadsButton(){
  const btn = document.getElementById('tasksUploadViewBtn');
  if(btn) btn.style.display = tCanViewUploads() ? 'flex' : 'none';
}

// Sab uploaded files gather karo — Supabase data + localStorage
let _allUploadsCache = [];

function tShowAllUploads(){
  if(!tCanViewUploads()) return;
  document.getElementById('taskAllUploadsModal').style.display='flex';
  document.body.style.overflow='hidden';
  document.getElementById('uploadsSearchInput').value='';
  document.getElementById('uploadsNameFilter').value='';
  // Default: aaj ki date dono fields mein
  const todayISO = new Date().toISOString().slice(0,10);
  document.getElementById('uploadsDateFrom').value = todayISO;
  document.getElementById('uploadsDateTo').value   = todayISO;
  _allUploadsCache = [];
  tFetchAndRenderUploads();
}

function tResetUploadsFilter(){
  document.getElementById('uploadsSearchInput').value='';
  document.getElementById('uploadsNameFilter').value='';
  document.getElementById('uploadsDateFrom').value='';
  document.getElementById('uploadsDateTo').value='';
  tFetchAndRenderUploads();
}

function tPopulateUploadsNameFilter(){
  const sel = document.getElementById('uploadsNameFilter');
  if(!sel) return;
  const curVal = sel.value;
  const names = [...new Set(_allUploadsCache.map(f=>f.employee).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">All Employees</option>' +
    names.map(n=>`<option value="${n}"${n===curVal?' selected':''} >${n}</option>`).join('');
}

// ── Main fetch: Supabase se date-range ke hisaab se upload wale tasks laao ──
async function tFetchAndRenderUploads(){
  const listEl = document.getElementById('taskAllUploadsList');
  if(!listEl) return;
  listEl.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--muted);font-size:0.9rem;">⏳ Loading…</div>';

  const df = document.getElementById('uploadsDateFrom').value || '';
  const dt = document.getElementById('uploadsDateTo').value   || '';

  try {
    // Step 1: Upload wale tasks fetch karo with date filter
    let url = `${SUPABASE_URL}/rest/v1/employee_checklists?select=*&upload=not.is.null`;
    if(df) url += `&planned_date=gte.${df}`;
    if(dt) url += `&planned_date=lte.${dt}`;
    url += `&order=planned_date.desc,id.desc&limit=500`;

    const res  = await fetch(url, { headers: SB_HDRS() });
    const rows = await res.json();
    if(!Array.isArray(rows)) throw new Error('Bad response');

    // Step 2: Employee details cache (emp_id → name, dept)
    // tAllData mein already loaded hai — usse map banao
    const empMap = {};
    tAllData.forEach(r => {
      const eid = String(r['_id']||'');
      // emp_id se bhi map karo
      if(r['Name']) empMap[String(r['emp_id']||r['_emp_id']||'')] = { name: r['Name'], dept: r['Department']||'' };
    });

    // Fallback: employee_details table se bhi try karo if empMap empty
    let edCache = {};
    try {
      const edRes  = await fetch(`${SUPABASE_URL}/rest/v1/Employee_details?select=Emp_id,Employee_name,Employee_Dept&limit=500`, { headers: SB_HDRS() });
      const edRows = await edRes.json();
      if(Array.isArray(edRows)){
        edRows.forEach(e => {
          edCache[String(e.Emp_id||'')] = { name: e.Employee_name||'', dept: e.Employee_Dept||'' };
        });
      }
    } catch(_){}

    _allUploadsCache = rows.map(r => {
      const cloudUrl  = r.upload ? String(r.upload).trim() : null;
      if(!cloudUrl) return null;
      const rawName   = cloudUrl.split('/').pop().replace(/^\d+_/,'').replace(/_/g,' ');
      const pd        = String(r.planned_date||'').slice(0,10);
      let uploadedAt  = '';
      if(pd && pd.length===10){
        const [yy,mm,dd] = pd.split('-');
        uploadedAt = `${dd}/${mm}/${yy} 00:00`;
      }
      // Employee info — edCache se lo
      const empId = String(r.emp_id||'');
      const ed    = edCache[empId] || empMap[empId] || {};
      const employeeName = ed.name || r.employee_name || empId || '—';
      const deptName     = ed.dept || r.department || '—';

      const ext  = rawName.split('.').pop().toLowerCase();
      const icon = ['pdf'].includes(ext) ? '📄'
        : ['png','jpg','jpeg','gif','webp'].includes(ext) ? '🖼️'
        : ['xls','xlsx','csv'].includes(ext) ? '📊'
        : ['doc','docx'].includes(ext) ? '📝' : '📎';
      return {
        taskId:     String(r.id||''),
        task:       String(r.task_name||r.task||'—').trim(),
        employee:   employeeName,
        dept:       deptName,
        fileName:   rawName,
        fileUrl:    cloudUrl,
        uploadedAt: uploadedAt,
        plannedDate: pd,
        icon:       icon,
        fromCloud:  true
      };
    }).filter(Boolean);

    tPopulateUploadsNameFilter();
    tFilterUploadsModal();
  } catch(e) {
    listEl.innerHTML = `<div style="text-align:center;padding:40px 0;color:#ff3b30;font-size:0.87rem;">❌ Error loading: ${e.message}</div>`;
  }
}

function tFilterUploadsModal(){
  const q    = (document.getElementById('uploadsSearchInput').value||'').toLowerCase();
  const name = (document.getElementById('uploadsNameFilter').value||'').toLowerCase();

  const filtered = _allUploadsCache.filter(f=>{
    if(q && !(f.employee.toLowerCase().includes(q)||f.task.toLowerCase().includes(q)||
              f.dept.toLowerCase().includes(q)||f.fileName.toLowerCase().includes(q))) return false;
    if(name && f.employee.toLowerCase() !== name) return false;
    return true;
  });
  tRenderAllUploads(filtered);
}

function tRenderAllUploads(list){
  const el = document.getElementById('taskAllUploadsList');
  if(!el) return;
  if(!list.length){
    el.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--muted);font-size:0.9rem;">📭 No uploaded files found</div>';
    return;
  }
  el.innerHTML = list.map((f,i)=>`
    <div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border);${i===list.length-1?'border-bottom:none;':''}">
      <!-- Icon -->
      <div style="width:38px;height:38px;border-radius:10px;background:${f.fromCloud?'rgba(0,212,170,0.1)':'rgba(240,165,0,0.1)'};
           border:1.5px solid ${f.fromCloud?'rgba(0,212,170,0.3)':'rgba(240,165,0,0.3)'};
           display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">${f.icon}</div>
      <!-- Info -->
      <div style="flex:1;min-width:0;">
        <div style="font-size:0.85rem;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${f.fileName}">${f.fileName}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:3px;align-items:center;">
          <span style="font-size:0.74rem;background:rgba(168,85,247,0.1);color:#a855f7;border:1px solid rgba(168,85,247,0.2);border-radius:5px;padding:1px 7px;font-weight:600;">👤 ${f.employee}</span>
          <span style="font-size:0.74rem;color:var(--muted);">${f.dept}</span>

        </div>
        <div style="font-size:0.77rem;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📋 ${f.task}</div>
      </div>
      <!-- View button -->
      ${f.fileUrl?`<a href="${f.fileUrl}" target="_blank" rel="noopener"
        style="background:rgba(0,212,170,0.1);border:1px solid rgba(0,212,170,0.3);color:#00d4aa;
               border-radius:8px;padding:7px 13px;font-size:0.78rem;font-weight:700;text-decoration:none;white-space:nowrap;flex-shrink:0;">
        ⬇ View
      </a>`:'<span style="font-size:0.72rem;color:var(--muted);flex-shrink:0;">No URL</span>'}
    </div>`).join('');
}


// ── File select hote hi turant "uploaded" dikhao + Mark Done unlock karo ──
// (asli cloud upload background mein chalta rehta hai, baad mein silently real URL se update ho jata hai)
function tUnlockMarkDoneIfReady(taskId){
  const tid = String(taskId);
  const _rowRef = tAllData.find(r=>String(r['Task ID'])===tid);
  if(_rowRef && tTaskRequiresAttachment(_rowRef['Task']) && !tIsDone(_rowRef)){
    const _actTd = document.getElementById('act_'+tid);
    if(_actTd){
      const _srcVal = String(_rowRef['_source']||'').toLowerCase();
      _actTd.innerHTML = `<button data-dept-tid="${tid}" onclick="deptShowRemarksInput('${tid}','${_srcVal}')"
        style="background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;border-radius:8px;padding:6px 8px;font-size:0.78rem;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap;width:100%;box-shadow:0 2px 6px rgba(168,85,247,0.3);transition:all 0.18s;">
        ✅ Mark Done
      </button>`;
    }
  }
}

async function tDirectUpload(input, taskId){
  const file = input.files[0];
  if(!file) return;
  const tid = String(taskId);

  const btn = document.getElementById('tfu_btn_'+tid);
  const td  = btn ? btn.closest('td') : null;

  // ══ INSTANT FEEDBACK — file select karte hi turant dikhao "file daal di" ══
  let _localPreviewUrl = null;
  try{ _localPreviewUrl = URL.createObjectURL(file); }catch(e){}

  if(td){
    td.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;">
        <a href="${_localPreviewUrl||'#'}" target="_blank" rel="noopener" title="${file.name} — syncing to cloud…"
           style="position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px;
                  background:rgba(0,212,170,0.12);border:1.5px solid rgba(0,212,170,0.4);
                  border-radius:8px;text-decoration:none;font-size:1rem;">📄<span style="position:absolute;bottom:-3px;right:-3px;font-size:0.6rem;">⏳</span></a>
      </div>`;
  }

  const _now0 = new Date();
  const _uploadedAt0 = `${String(_now0.getDate()).padStart(2,'0')}/${String(_now0.getMonth()+1).padStart(2,'0')}/${_now0.getFullYear()} ${String(_now0.getHours()).padStart(2,'0')}:${String(_now0.getMinutes()).padStart(2,'0')}`;
  // localStorage mein turant save — isse tHasAttachment() abhi se TRUE ho jaata hai
  try{
    const _saved0 = JSON.parse(localStorage.getItem('aditiTaskUploads')||'{}');
    _saved0[tid] = [{ name: file.name, url: _localPreviewUrl, uploadedAt: _uploadedAt0, size: file.size, _pendingSync: true }];
    localStorage.setItem('aditiTaskUploads', JSON.stringify(_saved0));
  }catch(e){}

  // Mandatory task ho aur abhi Done nahi hua to "Mark Done" turant unlock karo
  tUnlockMarkDoneIfReady(tid);

  try{
    const ts       = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    const bucket   = 'files';
    const filePath = `task_docs/task_${tid}/${ts}_${safeName}`;

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`,
      {
        method : 'POST',
        headers: {
          'apikey'        : SUPABASE_ANON,
          'Authorization' : `Bearer ${_currentToken}`,
          'Content-Type'  : file.type || 'application/octet-stream',
          'Cache-Control' : '3600',
          'x-upsert'      : 'true'
        },
        body: file
      }
    );

    let fileUrl = null;
    if(uploadRes.ok){
      fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
    }

    // Save to Supabase upload column — URL if upload succeeded, else just filename
    const saveValue = fileUrl || file.name;
    const rowId = (tAllData.find(r=>String(r['Task ID'])===tid)||{})['_id'];
    if(rowId){
      fetch(
        `${SUPABASE_URL}/rest/v1/employee_checklists?id=eq.${encodeURIComponent(rowId)}`,
        { method:'PATCH', headers:SB_HDRS_JSON(), body:JSON.stringify({ upload: saveValue }) }
      ).catch(()=>{});
      [tAllData, tFiltered].forEach(arr=>{
        arr.forEach(r=>{ if(String(r['Task ID'])===tid) r['_upload_url']=saveValue; });
      });
    }

    // localStorage ko ab real (final) value se overwrite karo — pending hata do
    try{
      const saved2 = JSON.parse(localStorage.getItem('aditiTaskUploads')||'{}');
      saved2[tid] = [{ name: file.name, url: fileUrl, uploadedAt: _uploadedAt0, size: file.size }];
      localStorage.setItem('aditiTaskUploads', JSON.stringify(saved2));
    }catch(e){}

    // Icon ko silently real cloud URL se refresh karo — 📄 green if URL received, orange if filename only
    if(td){
      const isCloud = !!fileUrl;
      td.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;">
          <a href="${fileUrl||'#'}" target="${isCloud?'_blank':'_self'}" rel="noopener" title="${file.name}"
             style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;
                    background:${isCloud?'rgba(0,212,170,0.12)':'rgba(240,165,0,0.12)'};
                    border:1.5px solid ${isCloud?'rgba(0,212,170,0.4)':'rgba(240,165,0,0.4)'};
                    border-radius:8px;text-decoration:none;font-size:1rem;transition:all 0.18s;">📄</a>
        </div>`;
    }

    tUnlockMarkDoneIfReady(tid);
    if(isCloudUploadDone(fileUrl) && _localPreviewUrl){ try{ URL.revokeObjectURL(_localPreviewUrl); }catch(e){} }

  }catch(err){
    // Network/exception fail — file already locally save ho chuki hai (filename ke saath),
    // isliye "gayab" jaisa na dikhao — sirf filename-only (local) state mein rakho.
    try{
      const rowId = (tAllData.find(r=>String(r['Task ID'])===tid)||{})['_id'];
      if(rowId){
        fetch(
          `${SUPABASE_URL}/rest/v1/employee_checklists?id=eq.${encodeURIComponent(rowId)}`,
          { method:'PATCH', headers:SB_HDRS_JSON(), body:JSON.stringify({ upload: file.name }) }
        ).catch(()=>{});
        [tAllData, tFiltered].forEach(arr=>{
          arr.forEach(r=>{ if(String(r['Task ID'])===tid) r['_upload_url']=file.name; });
        });
      }
    }catch(e2){}
    const tdx = document.getElementById('tfu_btn_'+tid) ? document.getElementById('tfu_btn_'+tid).closest('td') : td;
    if(tdx){
      tdx.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;">
          <a href="#" rel="noopener" title="${file.name} (cloud sync failed — local copy saved)"
             style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;
                    background:rgba(240,165,0,0.12);border:1.5px solid rgba(240,165,0,0.4);
                    border-radius:8px;text-decoration:none;font-size:1rem;">📄</a>
        </div>`;
    }
    tUnlockMarkDoneIfReady(tid);
    console.error('Upload error:', err);
  }
  input.value='';
}
function isCloudUploadDone(u){ return !!u; }

let _taskUploadId   = null;
let _taskUploadName = '';
let _taskUploadFile = null;

function tOpenTaskUpload(taskId, taskName){
  _taskUploadId   = String(taskId);
  _taskUploadName = taskName;
  _taskUploadFile = null;

  document.getElementById('taskUploadTaskId').textContent   = 'Task #' + taskId;
  document.getElementById('taskUploadTaskName').textContent = taskName;
  document.getElementById('taskUploadStatus').style.display = 'none';
  document.getElementById('taskUploadFileInput').value      = '';
  document.getElementById('taskUploadDropLabel').textContent= 'Click or drag a file here';
  document.getElementById('taskUploadDropMeta').textContent = 'PDF, Image, Doc — any format';
  document.getElementById('taskUploadDropZone').style.borderColor = '';
  document.getElementById('taskUploadDropZone').style.background  = '';

  // Existing files dikhao
  tRenderTaskFileList(taskId);

  document.getElementById('taskUploadModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function tCloseTaskUpload(){
  document.getElementById('taskUploadModal').style.display = 'none';
  document.body.style.overflow = '';
  _taskUploadFile = null; _taskUploadId = null;
}

function tRenderTaskFileList(taskId){
  const list = document.getElementById('taskUploadFileList');
  if(!list) return;
  try{
    // Supabase se file URL
    const row = tAllData.find(r=>String(r['Task ID'])===String(taskId));
    const cloudUrl = row ? row['_upload_url'] : null;

    // localStorage se bhi check
    const saved = JSON.parse(localStorage.getItem('aditiTaskUploads')||'{}');
    const localFiles = saved[String(taskId)] || [];

    // Cloud URL ko prefer karo
    const allFiles = [];
    if(cloudUrl){
      const localMatch = localFiles.find(f=>f.url===cloudUrl);
      allFiles.push({
        name: localMatch ? localMatch.name : cloudUrl.split('/').pop().replace(/^\d+_/,''),
        url: cloudUrl,
        uploadedAt: localMatch ? localMatch.uploadedAt : '—',
        size: localMatch ? localMatch.size : null,
        fromCloud: true
      });
    } else if(localFiles.length){
      allFiles.push(...localFiles);
    }

    if(!allFiles.length){
      list.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:0.82rem;padding:14px 0;">No files uploaded yet</div>';
      return;
    }
    list.innerHTML = allFiles.map((f,i)=>`
      <div style="display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:1.2rem;flex-shrink:0">${f.name&&f.name.match(/\.(pdf)$/i)?'📄':f.name&&f.name.match(/\.(png|jpg|jpeg|gif|webp)$/i)?'🖼️':'📎'}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.83rem;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${f.name}">${f.name}</div>
          <div style="font-size:0.71rem;color:var(--muted);margin-top:1px;">${f.uploadedAt||'—'} ${f.fromCloud?'<span style="color:#00d4aa;font-weight:600">☁ Cloud</span>':''}</div>
        </div>
        ${f.url?`<a href="${f.url}" target="_blank" rel="noopener"
          style="background:rgba(0,212,170,0.1);border:1px solid rgba(0,212,170,0.3);color:#00d4aa;
                 border-radius:7px;padding:5px 10px;font-size:0.76rem;font-weight:700;text-decoration:none;white-space:nowrap;flex-shrink:0;">
          ⬇ View
        </a>`:'<span style="font-size:0.72rem;color:var(--muted)">No URL</span>'}
      </div>`).join('');
  }catch(e){ list.innerHTML='<div style="color:var(--hot);font-size:0.82rem;">Error loading files</div>'; }
}

function tDeleteTaskFile(taskId, idx){
  if(!confirm('Delete this file?')) return;
  try{
    const saved = JSON.parse(localStorage.getItem('aditiTaskUploads')||'{}');
    const files = saved[String(taskId)] || [];
    files.splice(idx, 1);
    saved[String(taskId)] = files;
    localStorage.setItem('aditiTaskUploads', JSON.stringify(saved));
    tRenderTaskFileList(taskId);
    tRenderTable();
  }catch(e){}
}

function tHandleTaskFileSelect(e){
  const file = e.target.files[0];
  if(!file) return;
  _taskUploadFile = file;
  document.getElementById('taskUploadDropLabel').textContent = file.name;
  document.getElementById('taskUploadDropMeta').textContent  = (file.size/1024).toFixed(1)+' KB';
  document.getElementById('taskUploadDropZone').style.borderColor = '#a855f7';
  document.getElementById('taskUploadDropZone').style.background  = 'rgba(168,85,247,0.06)';
}

async function tSubmitTaskUpload(){
  if(!_taskUploadFile){ alert('Please select a file first!'); return; }
  if(!_taskUploadId){ return; }

  const statusEl = document.getElementById('taskUploadStatus');
  const btn      = document.getElementById('taskUploadSubmitBtn');
  btn.disabled   = true;
  statusEl.style.display    = 'block';
  statusEl.style.color      = '#00d4ff';
  statusEl.style.background = 'rgba(0,212,255,0.06)';
  statusEl.style.border     = '1px solid rgba(0,212,255,0.2)';
  statusEl.textContent      = '⏳ Uploading...';

  try{
    const file = _taskUploadFile;
    const ts   = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    const bucket   = 'files';
    const filePath = `task_docs/task_${_taskUploadId}/${ts}_${safeName}`;

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`,
      {
        method : 'POST',
        headers: {
          'apikey'        : SUPABASE_ANON,
          'Authorization' : `Bearer ${_currentToken}`,
          'Content-Type'  : file.type || 'application/octet-stream',
          'Cache-Control' : '3600',
          'x-upsert'      : 'true'
        },
        body: file
      }
    );

    let fileUrl = null;
    if(uploadRes.ok){
      fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;

      // ✅ Supabase mein task_doc_urls column update karo
      const rowId = (tAllData.find(r=>String(r['Task ID'])===_taskUploadId)||{})['_id'];
      if(rowId){
        await fetch(
          `${SUPABASE_URL}/rest/v1/employee_checklists?id=eq.${encodeURIComponent(rowId)}`,
          { method:'PATCH', headers:SB_HDRS_JSON(), body:JSON.stringify({ upload: fileUrl }) }
        ).catch(()=>{});
        // Local data update
        [tAllData, tFiltered].forEach(arr=>{
          arr.forEach(r=>{ if(String(r['Task ID'])===_taskUploadId) r['_upload_url']=fileUrl; });
        });
      }

      statusEl.style.color = '#00d4aa';
      statusEl.style.background = 'rgba(0,212,170,0.06)';
      statusEl.style.border = '1px solid rgba(0,212,170,0.2)';
      statusEl.textContent = '✅ Upload successful! File saved to cloud.';
    } else {
      statusEl.style.color = '#f0a500';
      statusEl.style.background = 'rgba(240,165,0,0.06)';
      statusEl.style.border = '1px solid rgba(240,165,0,0.2)';
      statusEl.textContent = '⚠️ Cloud upload failed — saved locally only';
    }

    // localStorage mein bhi save karo (offline fallback)
    const saved = JSON.parse(localStorage.getItem('aditiTaskUploads')||'{}');
    const now2 = new Date();
    const uploadedAt = `${String(now2.getDate()).padStart(2,'0')}/${String(now2.getMonth()+1).padStart(2,'0')}/${now2.getFullYear()} ${String(now2.getHours()).padStart(2,'0')}:${String(now2.getMinutes()).padStart(2,'0')}`;
    saved[_taskUploadId] = [{ name: file.name, url: fileUrl, uploadedAt, size: file.size }];
    localStorage.setItem('aditiTaskUploads', JSON.stringify(saved));

    // UI refresh
    tRenderTaskFileList(_taskUploadId);
    tRenderTable();
    document.getElementById('taskUploadFileInput').value = '';
    _taskUploadFile = null;
    document.getElementById('taskUploadDropLabel').textContent = 'Click or drag a file here';
    document.getElementById('taskUploadDropMeta').textContent  = 'PDF, Image, Doc — any format';
    document.getElementById('taskUploadDropZone').style.borderColor = '';
    document.getElementById('taskUploadDropZone').style.background  = '';

  } catch(err){
    statusEl.style.color = '#ff5c7c';
    statusEl.style.background = 'rgba(255,92,124,0.06)';
    statusEl.style.border = '1px solid rgba(255,92,124,0.2)';
    statusEl.textContent = '❌ Error: ' + err.message;
  } finally {
    btn.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// LIVE SYNC — portal aur sheet real-time sync mein rahein
// ═══════════════════════════════════════════════════════════════════════
// Background mein silently fresh data fetch karta hai bina spinner ya filter
// reset kare. Jab user tab pe wapas aata hai ya har 45 sec pe automatically
// chalta hai. Isse sheet ka har change (add karo ya delete karo) ~45s mein
// portal pe reflect ho jayega.
let _tasksLastSync = 0;
let _tasksSyncing = false;
const TASKS_LIVE_POLL_MS = 15*1000;     // 15 seconds polling — row delete ~15s mein reflect hoga
const TASKS_LIVE_MIN_GAP_MS = 8*1000;   // Minimum 8s gap between syncs

async function tSilentRefresh(){
  if(_tasksSyncing || !tLoaded) return;
  _tasksSyncing = true;
  try {
    const isOwner = PERMISSIONS.checklist_scope === 'all';
    const myEmail = CURRENT_USER ? String(CURRENT_USER.email||'').trim().toLowerCase() : '';

    // Dono ke liye current active date use karo (default today)
    const _todaySync = new Date().toISOString().slice(0,10);
    const fetchFrom = tActiveDateFrom || _todaySync;
    const fetchTo   = tActiveDateTo   || _todaySync;

    // Employee: emp_id lookup
    let myEmpId = null;
    if(!isOwner && myEmail){
      const empRes = await fetch(
        `${SUPABASE_URL}/rest/v1/Employee_details?select=Emp_id&Email_Id=ilike.${encodeURIComponent(myEmail)}&limit=1`,
        { headers: SB_HDRS() }
      );
      const empRows = await empRes.json();
      myEmpId = empRows && empRows[0] ? String(empRows[0].Emp_id || empRows[0].emp_id || '').trim() : null;
      if(!myEmpId){ _tasksSyncing=false; return; }
    }

    // Tasks fetch - single OR query (planned tasks + pending ongoing tasks)
    // OR condition: planned tasks + ongoing tasks due IN this date range + tasks completed on view date
    const orFilter2 = `or=(and(planned_date.gte.${fetchFrom},planned_date.lte.${fetchTo}),and(ongoing.gte.${fetchFrom},ongoing.lte.${fetchTo},actual_timestamp.is.null),and(actual_timestamp.gte.${fetchFrom},actual_timestamp.lte.${fetchTo}T23:59:59))`;
    let tasksBaseUrl2;
    if(isOwner){
      tasksBaseUrl2 = `${SUPABASE_URL}/rest/v1/employee_checklists?select=*`
               + `&${orFilter2}`
               + `&order=planned_date.desc,id.asc`;
    } else {
      tasksBaseUrl2 = `${SUPABASE_URL}/rest/v1/employee_checklists?select=*`
               + `&emp_id=eq.${encodeURIComponent(myEmpId)}`
               + `&${orFilter2}`
               + `&order=planned_date.desc,id.asc`;
    }

    const tasks = await tFetchAllPages(tasksBaseUrl2);
    if(!Array.isArray(tasks)) throw new Error('Bad response');

    // ── Silent Refresh: Ongoing tasks bhi fetch karo (jo future mein due hain) ──
    let ongoingTasksSync = [];
    try{
      let ongoingUrlSync;
      if(isOwner){
        ongoingUrlSync = `${SUPABASE_URL}/rest/v1/employee_checklists?select=*`
                       + `&ongoing=gte.${fetchFrom}&actual_timestamp=is.null`
                       + `&order=planned_date.desc,id.asc`;
      } else if(myEmpId){
        ongoingUrlSync = `${SUPABASE_URL}/rest/v1/employee_checklists?select=*`
                       + `&emp_id=eq.${encodeURIComponent(myEmpId)}`
                       + `&ongoing=gte.${fetchFrom}&actual_timestamp=is.null`
                       + `&order=planned_date.desc,id.asc`;
      }
      if(ongoingUrlSync){
        const ogRes2 = await fetch(ongoingUrlSync + '&limit=500', { headers: SB_HDRS() });
        const ogRows2 = await ogRes2.json();
        if(Array.isArray(ogRows2)) ongoingTasksSync = ogRows2;
      }
    }catch(e){ console.warn('Ongoing sync fetch failed:', e); }

    // Merge: dedup by id
    const taskIdSet2 = new Set(tasks.map(r=>r.id));
    const mergedTasksSync = [...tasks];
    ongoingTasksSync.forEach(r=>{ if(!taskIdSet2.has(r.id)){ mergedTasksSync.push(r); } });

    // Employee_details batch fetch
    const empIdSet = [...new Set(mergedTasksSync.map(r=>String(r.emp_id||'').trim()).filter(Boolean))];
    let empMap = {};
    if(empIdSet.length > 0){
      const edRes = await fetch(
        `${SUPABASE_URL}/rest/v1/Employee_details?select=Emp_id,Employee_name,Employee_Dept,Email_Id,Location&Emp_id=in.(${empIdSet.join(',')})`,
        { headers: SB_HDRS() }
      );
      const edRows = await edRes.json();
      if(Array.isArray(edRows)){
        edRows.forEach(r=>{
          const id = String(r.Emp_id || r.emp_id || '').trim();
          if(id) empMap[id] = {
            name:  String(r.Employee_name || '').trim(),
            dept:  String(r.Employee_Dept || '').trim(),
            email: String(r.Email_Id || '').trim(),
            loc:   String(r.Location || '').trim(),
          };
        });
      }
    }

    const newData = mergedTasksSync.map(r => {
      const empId = String(r.emp_id || '').trim();
      const ed = empMap[empId] || {};
      const expRaw = r.ongoing ? String(r.ongoing).trim() : null;
      const expParts = expRaw ? expRaw.split('-') : null;
      const expDisplay = expParts && expParts.length===3 ? `${expParts[2]}/${expParts[1]}/${expParts[0]}` : null;
      return {
        'Name':             ed.name  || empId || '',
        'Email':            ed.email || '',
        'Department':       ed.dept  || '',
        'Task ID':          String(r.sheet_task_id || '').trim(),
        'Freq':             String(r.frequency || '').trim(),
        'Task':             String(r.task_name || '').trim(),
        'Planned':          String(r.planned_date || r.planned_data || '').trim(),
        'Actual':           String(r.actual_timestamp || '').trim(),
        'Status':           r.actual_timestamp ? 'Done' : 'Pending',
        'Remarks':          String(r.remarks || '').trim(),
        '_location':        ed.loc || String(r.branch_id || '').trim(),
        '_id':              r.id,
        '_expected_date':   expRaw,
        '_expected_display':expDisplay,
        '_upload_url':      r.upload ? String(r.upload).trim() : null,
      };
    });

    newData.forEach(r=>{ r['_tDate']=tParseDate(r['Planned']); });

    // ── DB Sync: silent refresh ke baad bhi localStorage clear karo ──
    tSyncLocalStorageWithDB(newData);

    // FIX: In-place merge — existing rows ki position preserve karo (niche shift nahi hoga)
    const newDataMap = new Map(newData.map(r => [r['_id'], r]));
    const existingIds = new Set(tAllData.map(r => r['_id']));
    // Existing rows in-place update karo
    tAllData.forEach((r, i) => {
      const updated = newDataMap.get(r['_id']);
      if(updated) Object.assign(tAllData[i], updated);
    });
    // Naye rows add karo (jo pehle nahi the)
    newData.forEach(r => { if(!existingIds.has(r['_id'])) tAllData.push(r); });
    // Delete hue rows hatao — LEKIN done tasks mat hatao
    // Ongoing task done hone ke baad planned_date purana hota hai isliye server se nahi aata
    // Aise tasks ko view mein rakho agar aaj complete kiya ho
    const newIds = new Set(newData.map(r => r['_id']));
    const _vFrom = tActiveDateFrom || new Date().toISOString().slice(0,10);
    const _vTo   = tActiveDateTo   || _vFrom;
    tAllData = tAllData.filter(r => {
      if(newIds.has(r['_id'])) return true;
      // Server se nahi aaya — recently done task hai toh rakho
      if(r['Actual'] && String(r['Actual']).trim()){
        try{
          const actDate = String(r['Actual']).trim().slice(0,10);
          if(actDate >= _vFrom && actDate <= _vTo) return true;
        }catch(e){}
      }
      return false;
    });

    tApplyDoneTasks();

    const _notOwner = !isOwner;
    if(CURRENT_USER && _notOwner){
      const hasTasks = tAllData.length > 0;
      // Dashboards visible if user has ANY of: CRM/Leads/Collection/FMS/IMS permission, OR has tasks assigned (Task Checklist)
      const hasDashAccess=
        PERMISSIONS.can_view_crm==='true'||
        PERMISSIONS.can_view_leads==='true'||
        PERMISSIONS.can_view_collection==='true'||
        PERMISSIONS.can_view_fms==='true'||
        PERMISSIONS.can_view_ims==='true'||
        hasTasks;
      const navDash=document.getElementById('nav-dashboards-trigger');
      if(navDash)navDash.style.display=hasDashAccess?'':'none';
      const dashGroup=document.getElementById('dashboardSubGroup');
      if(dashGroup)dashGroup.style.display=hasDashAccess?'':'none';
      if(!hasTasks){
        const navTasks=document.getElementById('nav-tasks');
        if(navTasks)navTasks.style.display='none';
        document.querySelectorAll('#panel-home .home-card').forEach(card=>{
          if(card.textContent.includes('Task Checklist'))card.style.display='none';
        });
      } else {
        const navTasks=document.getElementById('nav-tasks');
        if(navTasks)navTasks.style.display='';
        document.querySelectorAll('#panel-home .home-card').forEach(card=>{
          if(card.textContent.includes('Task Checklist'))card.style.display='';
        });
      }
    }
    const prevPage = tPage || 1;
    tFiltered = tGetFiltered();
    const maxPage = Math.max(1, Math.ceil(tFiltered.length / T_PER_PAGE));
    tPage = Math.min(prevPage, maxPage);

    Object.values(tCharts).forEach(c=>c&&c.destroy&&c.destroy()); tCharts={};
    tRenderKPIs(); tRenderCharts();
    // FIX: Agar koi remarks input active hai (user type kar raha hai), table re-render skip karo
    // — warna user ka inline input gayab ho jayega (task "disappears" bug)
    const _hasActiveInput = !!document.querySelector('[id^="dept_rem_"]');
    if(!_hasActiveInput){ tRenderTable(); }
    tUpdateBadge();
    updateHomeTaskBanner();
    const syncBadge = document.getElementById('tLastSyncBadge');
    if(syncBadge) syncBadge.textContent = '✓ Synced ' + new Date().toLocaleTimeString();
    const refreshBtn = document.getElementById('tForceRefreshBtn');
    if(refreshBtn){ refreshBtn.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Refresh'; refreshBtn.disabled=false; refreshBtn.style.opacity='1'; }
    const sync = document.getElementById('tasksSync');
    if(sync) sync.textContent='Live · '+new Date().toLocaleTimeString();
    _tasksLastSync = Date.now();
  } catch(e){
  } finally {
    _tasksSyncing = false;
  }
}

// Manual force refresh — user button click se
async function tForceRefresh(){
  const btn = document.getElementById('tForceRefreshBtn');
  if(btn){ btn.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.8s linear infinite"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Fetching...'; btn.disabled=true; btn.style.opacity='0.6'; }
  const syncBadge = document.getElementById('tLastSyncBadge');
  if(syncBadge) syncBadge.textContent = '⟳ Fetching from Sheet...';
  _tasksLastSync = 0; // Force bypass min-gap check
  await tSilentRefresh();
}

function tMaybeLiveSync(){
  if(!tLoaded) return;
  if(Date.now() - _tasksLastSync < TASKS_LIVE_MIN_GAP_MS) return;
  tSilentRefresh();
}

// Tab visible hone pe (form submit karke wapas aane pe)
document.addEventListener('visibilitychange', function(){
  if(!document.hidden) tMaybeLiveSync();
});
// Window focus milne pe
window.addEventListener('focus', tMaybeLiveSync);

// Har 45 seconds pe background sync — sheet ka koi bhi change ~45s mein dikhega
setInterval(function(){
  if(!document.hidden) tMaybeLiveSync();
}, TASKS_LIVE_POLL_MS);


// ============================================================


// ╔══════════════════════════════════════════════════════════════════════════
// ║  [AUTH / LOGIN JS] — Login, logout, session management
// ║  doLogin()    = Email+password se Supabase Auth se login karo
// ║  doLogout()   = Session clear karo, login page dikhao
// ║  _currentToken = Login ke baad user JWT yahan store hota hai
// ║  CURRENT_USER  = Logged-in user ka object (name, email, role etc.)
// ║  PERMISSIONS   = User ki permissions ka object (loaded after login)
// ║  Agar login na ho raha ho: Supabase Auth > Users check karo
// ╚══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════
// LOGIN SYSTEM
// ═══════════════════════════════════
// USERS_URL (Google Sheet) removed — employee data now fetched from Supabase Employee_details table

// ── Supabase Auth Client ──
const _sbAuth = window.supabase.createClient(
  'https://rramdtpabwjsndgkohbi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyYW1kdHBhYndqc25kZ2tvaGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDQ4ODUsImV4cCI6MjA5MTQ4MDg4NX0.hpdTOkhRrbqmbPM6VJWEtz2oEjkeXAjYJQS9rgzheec'
);

// ── Auth state listener (token refresh, logout detect) ──
_sbAuth.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    CURRENT_USER = null;
    _currentToken = SUPABASE_ANON; // reset to anon on logout
  }
  if (session?.access_token) {
    _currentToken = session.access_token; // ✅ user JWT save — RLS authenticated policies kaam karengi
  }
  if (event === 'TOKEN_REFRESHED') {
    console.log('✅ Supabase session refreshed');
  }
});

// Cache for pre-fetched user list
let CURRENT_USER = null;
let PERMISSIONS  = {};   // populated from Python backend after login

function warmupAPIs(){
  // Warm-up ping to Google Apps Scripts (fire & forget)
  [L_URL,C_URL,FMS_API].forEach(url=>{
    fetch(url+'?ping=1',{method:'GET',mode:'cors'}).catch(()=>{});
  });
}

window.addEventListener('load', async function(){
  try {
    const { data: { session } } = await _sbAuth.auth.getSession();
    if (session) {
      _currentToken = session.access_token; // ✅ page reload pe bhi token set karo
      await _loadUserProfile(session.user);
      return;
    }
  } catch(e) { console.warn('Session check error:', e); }
  // Always warm up APIs in background
  warmupAPIs();
});

function togglePass(){
  const p=document.getElementById('loginPass');
  const e=document.getElementById('eyeIcon');
  if(p.type==='password'){p.type='text';e.textContent='🙈';}
  else{p.type='password';e.textContent='👁️';}
}

// Fallback — builds PERMISSIONS from rawRole if Python backend unreachable
function _buildFallbackPermissions(rawRole) {
  const r       = (rawRole || 'employee').toLowerCase();
  const isOwner = r === 'owner' || r === 'managing director';
  const isMIS   = r === 'mis';
  const isPC    = r === 'pc' || r === 'executive assistant' || r === 'ea';
  const hasAll  = isOwner || isMIS || isPC;
  return {
    can_view_leads:         String(hasAll),
    can_view_collection:    String(hasAll),
    can_view_fms:           String(hasAll),
    can_view_ims:           String(isMIS || isPC || isOwner),
    can_view_crm:           String(isOwner || isPC),
    can_view_activitylog:   String(isOwner || isMIS),
    can_view_announcements: 'true',
    can_post_announcements: String(isMIS),
    can_upload_files:       String(isMIS),
    can_upload_quiz:        String(isMIS),
    can_download_video:     String(isOwner || isMIS),
    checklist_scope:        hasAll ? 'all' : 'own',
    can_view_open_roles:        'true',
    can_view_my_referrals:      'true',
    can_view_referral_pipeline: String(isOwner || isMIS),
    can_post_referral_role:     String(isOwner || isMIS),
  };
}

// ── Load user profile — Auth + Data both from Supabase Employee_details ──
async function _loadUserProfile(authUser) {
  try {
    let empData = null;

    // Supabase Employee_details table se email match karke data lo
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/Employee_details?select=Employee_name,Employee_Dept,Location,Email_Id&Email_Id=ilike.${encodeURIComponent(authUser.email)}&limit=1`,
        { headers: SB_HDRS() }
      );
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        empData = rows[0];
      }
    } catch(e) {
      console.warn('Supabase Employee_details fetch failed:', e);
    }

    const _rawR = String(
      (empData && empData['Employee_Dept']) || 'employee'
    ).trim().toLowerCase();
    const _fullAccessRoles = ['managing director','mis','pc','executive assistant','ea'];

    CURRENT_USER = {
      email:          authUser.email,
      role:           _fullAccessRoles.includes(_rawR) ? 'owner' : 'employee',
      rawRole:        _rawR === 'managing director' ? 'owner'
                      : _rawR === 'ea' ? 'executive assistant'
                      : _rawR,
      name:           empData
                        ? String(empData['Employee_name'] || authUser.email.split('@')[0])
                        : authUser.email.split('@')[0],
      location:       empData
                        ? String(empData['Location'] || '').trim()
                        : ''
    };

    // ── Fetch permissions from Python backend ──────────────
    const _PAPI = 'https://knowlege-based-portal-production.up.railway.app';
    try {
      const _pr = await fetch(`${_PAPI}/api/permissions?email=${encodeURIComponent(authUser.email)}`);
      if (_pr.ok) {
        const _pd = await _pr.json();
        PERMISSIONS = _pd.permissions || {};
        if (_pd.rawRole) CURRENT_USER.rawRole = _pd.rawRole;
        if (_pd.role)    CURRENT_USER.role    = _pd.role === 'owner' ? 'owner' : 'employee';
      } else {
        PERMISSIONS = _buildFallbackPermissions(CURRENT_USER.rawRole);
      }
    } catch(_pe) {
      console.warn('Permissions fetch failed, using fallback:', _pe);
      PERMISSIONS = _buildFallbackPermissions(CURRENT_USER.rawRole);
    }

    // Show/hide Purchase Request button based on vendor_access permission
    if(typeof _vrCheckBtnAccess==='function') _vrCheckBtnAccess();

    showPortal();
    warmupAPIs();
    _actLoginTime = Date.now();
    _fetchAndCacheEmpId().then(() => {
      logActivity({
        event_type:   'login',
        event_detail: `User logged in: ${CURRENT_USER.name || CURRENT_USER.email}`,
        page_name:    'home',
        metadata:     { role: CURRENT_USER.rawRole, location: CURRENT_USER.location }
      });
    });
    setTimeout(maybeLoadHolidayCard, 800);

  } catch(e) {
    console.error('Profile load error:', e);
    // Fallback — basic info se portal dikhao
    CURRENT_USER = {
      email:    authUser.email,
      role:     'employee',
      rawRole:  'employee',
      name:     authUser.email.split('@')[0],
      location: ''
    };
    PERMISSIONS = _buildFallbackPermissions('employee');
    showPortal();
    warmupAPIs();
  }
}

async function doLogin(){
  const email=document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass=document.getElementById('loginPass').value.trim();
  const btn=document.getElementById('loginBtn');
  const err=document.getElementById('loginErr');

  if(!email||!pass){
    err.style.display='block';
    err.textContent='⚠️ Please enter both email and password!';
    return;
  }

  btn.innerHTML='<span class="lp-btn-text"><span>Signing in…</span></span>';
  btn.style.opacity='0.8';
  btn.disabled=true;
  err.style.display='none';

  const resetBtn=()=>{
    btn.innerHTML='<span class="lp-btn-text"><span>Sign In</span><svg width="22" height="22" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
    btn.style.opacity='1';
    btn.disabled=false;
  };

  try {
    // ✅ Supabase Auth — secure, hashed passwords
    const { data, error } = await _sbAuth.auth.signInWithPassword({
      email: email,
      password: pass
    });

    if (error) {
      err.style.display='block';
      if (error.message.includes('Invalid login') || error.message.includes('invalid_grant')) {
        err.textContent = '❌ Incorrect email or password. Please try again.';
      } else if (error.message.includes('Email not confirmed')) {
        err.textContent = '📧 Please confirm your email address before logging in.';
      } else {
        err.textContent = '❌ Login failed: ' + error.message;
      }
      resetBtn();
      return;
    }

    // Login successful — token pehle set karo, phir profile load karo
    _currentToken = data.session.access_token; // ✅ PEHLE token set — RLS pass hogi
    await _loadUserProfile(data.user);

  } catch(e) {
    err.style.display='block';
    err.innerHTML='⚠️ Network error.<br><small style="opacity:0.8">Please check your internet connection and try again.</small>';
    resetBtn();
  }
}

function showGreetingAnimation(name){
  const overlay=document.createElement('div');
  overlay.id='greetingOverlay';
  overlay.style.cssText=`
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.85);z-index:99999;
    display:flex;align-items:center;justify-content:center;
    flex-direction:column;gap:12px;
    animation:greetFadeIn 0.4s ease;
  `;
  overlay.innerHTML=`
    <div id="greetText" style="
      font-size:clamp(2rem,7vw,4rem);font-weight:800;
      color:#f0a500;text-align:center;padding:0 20px;
      font-family:'DM Sans',sans-serif;letter-spacing:1px;
      animation:greetBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both;
      text-shadow:0 0 40px rgba(240,165,0,0.6),0 0 80px rgba(240,165,0,0.3);
    ">👋 Hello, ${name}!</div>
    <div style="
      font-size:clamp(0.9rem,3vw,1.2rem);color:rgba(240,165,0,0.7);
      font-family:'DM Sans',sans-serif;letter-spacing:2px;
      animation:greetBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.4s both;
    ">Welcome back ✨</div>
  `;
  // Inject keyframes
  if(!document.getElementById('greetKeyframes')){
    const style=document.createElement('style');
    style.id='greetKeyframes';
    style.textContent=`
      @keyframes greetFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes greetBounce{from{opacity:0;transform:scale(0.5) translateY(30px)}to{opacity:1;transform:scale(1) translateY(0)}}
      @keyframes greetFadeOut{from{opacity:1}to{opacity:0}}
    `;
    document.head.appendChild(style);
  }
  document.body.appendChild(overlay);
  // Auto remove after 2.2s with fade out
  setTimeout(()=>{
    overlay.style.animation='greetFadeOut 0.5s ease forwards';
    setTimeout(()=>overlay.remove(),500);
  },2200);
}

function showPortal(){
  document.getElementById('loginPage').style.display='none';
  const portal=document.getElementById('mainPortal');
  portal.classList.add('visible');
  // Sync profile UI (sidebar + bottom nav) — synchronous so name shows immediately
  _syncProfileUI();
  // Init browser history so back button goes to home, not logout
  initHistory();
  // Update home welcome text with user name
  const welcomeEl=document.getElementById('homeWelcomeText');
  if(welcomeEl){
    const firstName=(CURRENT_USER.name||CURRENT_USER.email.split('@')[0]).split(' ')[0];
    welcomeEl.innerHTML=`Welcome, <span class="hw-name">${firstName}!</span>`;
  }
  // Show greeting animation
  showGreetingAnimation(CURRENT_USER.name||CURRENT_USER.email.split('@')[0]);
  // Add user info + logout to sidebar
  const sb=document.getElementById('sidebarBottom');
  if(sb){
    const roleLabel = CURRENT_USER.rawRole==='owner'?'👑 Managing Director':CURRENT_USER.rawRole==='mis'?'📊 MIS':CURRENT_USER.rawRole==='pc'?'💼 PC':CURRENT_USER.rawRole==='executive assistant'?'🤝 Executive Assistant':CURRENT_USER.role==='owner'?'👑 Managing Director':'👤 '+((CURRENT_USER.rawRole&&CURRENT_USER.rawRole!=='employee')?CURRENT_USER.rawRole.charAt(0).toUpperCase()+CURRENT_USER.rawRole.slice(1):'Employee');
    const avColor = CURRENT_USER.role==='owner'?'#f0a500':'#00d4aa';
    const avBg    = CURRENT_USER.role==='owner'?'rgba(240,165,0,0.2)':'rgba(0,212,170,0.2)';
    sb.innerHTML=`
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div id="sidebarUserAvatar" style="background:${avBg};color:${avColor};width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.91rem;font-weight:700;flex-shrink:0;overflow:hidden;">${(CURRENT_USER.name||CURRENT_USER.email)[0].toUpperCase()}</div>
        <div style="overflow:hidden;flex:1;">
          <div class="user-name-text" style="font-size:0.82rem;color:var(--text);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${CURRENT_USER.name||CURRENT_USER.email.split('@')[0]}</div>
          <div style="font-size:0.71rem;color:var(--text2);">${roleLabel}</div>
        </div>
      </div>
      <button onclick="doLogout()" style="width:100%;background:rgba(255,92,124,0.1);border:1px solid rgba(255,92,124,0.25);color:#ff5c7c;border-radius:8px;padding:8px;font-size:0.82rem;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,92,124,0.25)'" onmouseout="this.style.background='rgba(255,92,124,0.1)'">
        🚪 Logout
      </button>`;
  }
  // Populate mobile bottom nav user profile button
  const bnProf=document.getElementById('bnUserProfile');
  if(bnProf){
    const isO3=CURRENT_USER.role==='owner';
    const uN3=CURRENT_USER.name||CURRENT_USER.email.split('@')[0];
    const rr3=CURRENT_USER.rawRole||'';
    let rl3=isO3?'👑 Managing Director':'👤 Employee';
    if(rr3==='owner') rl3='👑 Managing Director';
    else if(rr3==='mis') rl3='📊 MIS';
    else if(rr3==='pc') rl3='💼 PC';
    else if(rr3==='support') rl3='🎧 Support';
    else if(rr3==='sales') rl3='📈 Sales';
    else if(rr3&&rr3!=='employee') rl3='👤 '+rr3.charAt(0).toUpperCase()+rr3.slice(1);
    const avBg3=isO3?'rgba(240,165,0,0.18)':'rgba(0,212,170,0.18)';
    const avClr3=isO3?'#f0a500':'#00d4aa';
    const avBdr3=isO3?'rgba(240,165,0,0.5)':'rgba(0,212,170,0.5)';
    const avL3=uN3[0].toUpperCase();
    // Bottom nav button avatar + name
    const ba3=document.getElementById('bnpAvatar');
    if(ba3){ba3.style.background=avBg3;ba3.style.color=avClr3;ba3.style.borderColor=avBdr3;ba3.textContent=avL3;}
    const bn3=document.getElementById('bnpName');
    if(bn3) bn3.textContent=uN3;
    // Popup avatar + name + role
    const pa3=document.getElementById('bupAvatar');
    if(pa3){pa3.style.background=avBg3;pa3.style.color=avClr3;pa3.style.borderColor=avBdr3;pa3.textContent=avL3;}
    const pn3=document.getElementById('bupName');
    if(pn3) pn3.textContent=uN3;
    const pr3=document.getElementById('bupRole');
    if(pr3) pr3.textContent=rl3;
  }
  // Sync theme button label after portal shows
  const isLight = document.body.classList.contains('light-mode');
  const sb2 = document.getElementById('sidebarThemeBtn');
  if(sb2) sb2.textContent = (isLight ? '☀️ Light Mode' : '🌙 Dark Mode');
  const mobBtn2 = document.getElementById('mobThemeBtn');
  if(mobBtn2) mobBtn2.textContent = (isLight ? '☀️ Light' : '🌙 Dark');
  // Employee restrictions
  if(CURRENT_USER.role!=='owner'){restrictEmployee();}
  // Upload buttons — sirf MIS aur Managing Director ke liye dikhao
  _applyUploadVisibility();
  // IMS nav — sirf MIS, Managing Director, PC ke liye dikhao
  _applyIMSNavVisibility();
  _applyCRMNavVisibility();
  _applyMappingNavVisibility();

  _applyFinanceNavVisibility();
  // Activity Log nav — sirf MIS aur Managing Director ke liye
  _applyActLogNavVisibility();
  // Access Control nav — only for owner or MIS role
  const _acpNav = document.getElementById('nav-adminperms');
  if (_acpNav) {
    const _rawRole = String((CURRENT_USER && (CURRENT_USER.rawRole || CURRENT_USER.role)) || '').toLowerCase().trim();
    _acpNav.style.display = (_rawRole === 'owner' || _rawRole === 'mis') ? '' : 'none';
  }
  // Fetch employee profile photo from Supabase → home page pe dikhao
  fetchUserProfilePhoto();
  // Performer of the Month cards load karo
  loadPerformers();
  // New Joiners cards load karo
  loadNewJoiners();
  // Pre-fetch all dashboard data in background
  setTimeout(prefetchAllData, 0);
}

function restrictEmployee(){
  // Nav items — controlled by PERMISSIONS from database
  const navPermMap = {
    'nav-leads':      'can_view_leads',
    'nav-collection': 'can_view_collection',
    'nav-fms':        'can_view_fms',
    'bn-leads':       'can_view_leads',
    'bn-collection':  'can_view_collection',
    'bn-fms':         'can_view_fms',
    'mm-leads':       'can_view_leads',
    'mm-collection':  'can_view_collection',
    'mm-fms':         'can_view_fms',
  };
  Object.entries(navPermMap).forEach(([id, perm]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = (PERMISSIONS[perm] === 'true') ? '' : 'none';
  });

  // Home page dashboard cards — show/hide based on permissions
  document.querySelectorAll('#panel-home .home-card:not(.disabled)').forEach(card => {
    const txt = card.textContent;
    let show  = true;
    if (txt.includes('Lead Tracking') && PERMISSIONS.can_view_leads      !== 'true') show = false;
    if (txt.includes('Collection')    && PERMISSIONS.can_view_collection  !== 'true') show = false;
    if (txt.includes('FMS')           && PERMISSIONS.can_view_fms         !== 'true') show = false;
    if (txt.includes('IMS')           && PERMISSIONS.can_view_ims         !== 'true') show = false;
    card.style.display = show ? '' : 'none';
  });

  if (CURRENT_USER) window.EMPLOYEE_EMAIL = CURRENT_USER.email;

  // Referral Programme nav item — hide entirely if user has none of the 4 referral permissions
  if (typeof _applyReferralNavVisibility === 'function') _applyReferralNavVisibility();
}

// ── Upload & Delete button visibility — controlled by PERMISSIONS ──────────
function _applyUploadVisibility() {
  const canUpload = PERMISSIONS.can_upload_files === 'true';
  if (!canUpload) {
    // Hide every upload button
    document.querySelectorAll('button').forEach(btn => {
      const oc = btn.getAttribute('onclick') || '';
      if (btn.textContent.trim() === 'Upload' || oc.includes('openUploadModal')) {
        btn.style.display = 'none';
      }
    });
    // Hide delete buttons (cn-del-btn class + any button calling confirmDelete*)
    document.querySelectorAll('.cn-del-btn').forEach(btn => btn.style.display = 'none');
    // Also intercept dynamically-rendered delete buttons via MutationObserver
    const _hideDelBtns = (root) => {
      (root || document).querySelectorAll('button').forEach(btn => {
        const oc = btn.getAttribute('onclick') || '';
        if (oc.includes('confirmDeleteCard') || oc.includes('confirmDeleteFile') || oc.includes('confirmDeleteTraining')) {
          btn.style.display = 'none';
        }
      });
    };
    _hideDelBtns();
    // Watch for dynamically added cards (CN loads async)
    const _obs = new MutationObserver(() => _hideDelBtns());
    _obs.observe(document.getElementById('mainPortal') || document.body, { childList: true, subtree: true });
  }
}

function toggleTheme(){
  const isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('aditiTheme', isLight ? 'light' : 'dark');
  const icon = isLight ? '☀️' : '🌙';
  const label = isLight ? 'Light Mode' : 'Dark Mode';
  const loginBtn = document.getElementById('loginThemeBtn');
  const sidebarBtn = document.getElementById('sidebarThemeBtn');
  const mobBtn = document.getElementById('mobThemeBtn');
  if(loginBtn) loginBtn.textContent = icon + ' ' + label;
  if(sidebarBtn) sidebarBtn.textContent = icon + ' ' + label;
  if(mobBtn) mobBtn.textContent = icon + ' ' + (isLight ? 'Light' : 'Dark');
  // Redraw all charts so axis/label colors update immediately
  // First destroy existing charts, then re-render with new colors
  try{
    if(typeof L!=='undefined'&&L.length){
      Object.values(Lch||{}).forEach(c=>c&&c.destroy&&c.destroy()); Lch={};
      if(typeof lRenderCharts==='function') lRenderCharts();
      if(typeof lRenderLB==='function') lRenderLB();
    }
  }catch(e){}
  try{
    if(typeof C!=='undefined'&&C.length){
      Object.values(Cch||{}).forEach(c=>c&&c.destroy&&c.destroy()); Cch={};
      const cD=typeof cGetFiltered==='function'?cGetFiltered():(C||[]);
      if(typeof cRenderCharts==='function') cRenderCharts(cD);
      if(typeof cRenderLB==='function') cRenderLB(cD);
    }
  }catch(e){}
  try{
    if(typeof fmsCharts!=='undefined'&&Object.keys(fmsCharts||{}).length){
      Object.values(fmsCharts).forEach(c=>c&&c.destroy&&c.destroy()); fmsCharts={};
      if(typeof fmsRenderCharts==='function') fmsRenderCharts();
    }
  }catch(e){}
  try{
    if(typeof tCharts!=='undefined'&&Object.keys(tCharts||{}).length){
      Object.values(tCharts).forEach(c=>c&&c.destroy&&c.destroy()); tCharts={};
      if(typeof tRenderCharts==='function') tRenderCharts();
    }
  }catch(e){}
}

// Apply saved theme on load
(function(){
  const saved = localStorage.getItem('aditiTheme');
  if(saved === 'dark'){
    // Dark mode only if explicitly saved as dark
  } else {
    // Default is light mode
    document.body.classList.add('light-mode');
    const loginBtn = document.getElementById('loginThemeBtn');
    if(loginBtn) loginBtn.textContent = '☀️ Light Mode';
    const mobBtn = document.getElementById('mobThemeBtn');
    if(mobBtn) mobBtn.textContent = '☀️ Light';
  }
})();

/* ══ ABOUT ORGANISATION — tab switcher ══ */
function switchAbout(tab){
  document.querySelectorAll('.about-section').forEach(s=>s.style.display='none');
  document.querySelectorAll('#aboutTabs .about-tab').forEach(t=>t.classList.remove('active'));
  var el=document.getElementById('about-'+tab);
  if(el)el.style.display='block';
  var idx={'overview':0,'locations':1,'milestones':2,'certifications':3}[tab];
  if(idx===undefined)idx=0;
  var tabs=document.querySelectorAll('#aboutTabs .about-tab');
  if(tabs[idx])tabs[idx].classList.add('active');
}

/* ── MOBILE MENU SHEET ── */
function toggleMobMenu(){
  var sheet=document.getElementById('mobMenuSheet');
  var overlay=document.getElementById('mobMenuOverlay');
  if(sheet.style.display==='none'||sheet.style.display===''){
    sheet.style.display='block';
    overlay.style.display='block';
    requestAnimationFrame(function(){
      sheet.style.transform='translateY(0)';
    });
  } else {
    closeMobMenu();
  }
}
function closeMobMenu(){
  var sheet=document.getElementById('mobMenuSheet');
  var overlay=document.getElementById('mobMenuOverlay');
  sheet.style.transform='translateY(100%)';
  setTimeout(function(){
    sheet.style.display='none';
    overlay.style.display='none';
  },280);
}
function toggleMMDash(){
  var sub=document.getElementById('mmDashSub');
  var arrow=document.getElementById('mmDashArrow');
  if(sub.style.display==='none'||sub.style.display===''){
    sub.style.display='block';
    arrow.style.transform='rotate(180deg)';
  } else {
    sub.style.display='none';
    arrow.style.transform='rotate(0deg)';
  }
}
function doLogout(){
  try {
    const totalSecs = Math.round((Date.now() - _actLoginTime) / 1000);
    const pageSecs  = Math.round((Date.now() - _actPageStart) / 1000);
    if (pageSecs > 30) logActivity({ event_type:'page_view', event_detail:'Last page: '+_actPageName, page_name:_actPageName, duration_seconds:pageSecs }); // 30s threshold — matches _actOnPageSwitch
    _actStopVideoTracking();
    logActivity({ event_type:'logout', event_detail:'User logged out: '+(CURRENT_USER?(CURRENT_USER.name||CURRENT_USER.email):''),
                  session_duration_seconds:totalSecs, logout_at: new Date().toISOString() });
  } catch(e) {}
  setTimeout(async ()=>{ 
    try { await _sbAuth.auth.signOut(); } catch(e) {}
    localStorage.removeItem('aditiUser'); 
    localStorage.removeItem('aditiLoginTime'); 
    CURRENT_USER=null; 
    location.reload(); 
  }, 400);
}
function mobMenuGo(panel){
  // update active highlight in mobile menu
  document.querySelectorAll('.mm-nav-item').forEach(function(el){el.classList.remove('mm-active');});
  var target=document.getElementById('mm-'+panel);
  if(target) target.classList.add('mm-active');
  closeMobMenu();
  switchDB(panel);
}








/* ═══════════════════════════════════════════
   OTHER MODULE QUIZZES (Odoo, PC, Click Task, Cool Bus, Smart Fleet)
═══════════════════════════════════════════ */

const MODULE_QUIZZES = {
  presales: {
    title: 'Pre-Sales Training',
    subtitle: 'Pre-Sales Process',
    color: '#e879f9',
    icon: '🤝',
    supabaseModule: 'Pre-Sales',
    driveUrl: 'https://drive.google.com/drive/folders/',
    questions: []
  },
  odoo: {
    title: 'Odoo Quiz',
    subtitle: 'Odoo ERP System',
    color: '#00d4ff',
    icon: '🔷',
    supabaseModule: 'Odoo',
    driveUrl: 'https://drive.google.com/drive/folders/187nbxRXlOR2D-HpIlhAN3lJRu8tv66qC',
    questions: []
  },
  pc: {
    title: 'PC Training Quiz',
    subtitle: 'Process Coordinator',
    color: '#00d4aa',
    icon: '💼',
    supabaseModule: 'PC',
    driveUrl: 'https://drive.google.com/drive/folders/1dhF8EERqrulmyBh7hIUMGOg9ppLTEHKD',
    questions: []
  },
  clicktask: {
    title: 'Click Task Quiz',
    subtitle: 'Click Task App',
    color: '#a855f7',
    icon: '✔️',
    supabaseModule: 'Click Task',
    driveUrl: 'https://drive.google.com/drive/folders/1ojAyM6eGOm7xZ2eVzmn7d2vu-ZrPuglO',
    questions: []
  },
  coolbus: {
    title: 'Cool Bus Quiz',
    subtitle: 'Cool Bus Operations',
    color: '#f97316',
    icon: '🚌',
    driveUrl: 'https://drive.google.com/drive/folders/10HnwdiyB3AKUcOatkmSXrdw1hf8Nrbf3',
    questions: []
  },
  smartfleet: {
    title: 'Smart Fleet Quiz',
    subtitle: 'Smart Fleet System',
    color: '#22c55e',
    icon: '🚛',
    supabaseModule: 'Smart Fleet',
    driveUrl: 'https://drive.google.com/drive/folders/1dMDdfvZRwoneI0YDYlQ9mYoNttiNSHaW',
    questions: []
  }
};

let moduleQuizActive = null;
let moduleQuizQIndex = 0;
let moduleQuizAnswers = [];
let moduleQuizCurrentKey = null;

/* ═══════════════════════════════════════════
   ODOO MODULE-WISE VIDEO SYSTEM
═══════════════════════════════════════════ */
const ODOO_SUB_MODULES = [
  { key: 'purchase',   label: 'Purchase',       icon: '🛒', color: '#f97316', desc: 'Vendor orders, RFQ, purchase orders and procurement management.' },
  { key: 'sales',      label: 'Pre Sales',       icon: '🤝', color: '#e879f9', desc: 'Pre-Sales process — lead handling, demos, proposals and client communication.', moduleOverride: 'Pre Sales' },
  { key: 'inventory',  label: 'Inventory',      icon: '📦', color: '#3b82f6', desc: 'Stock management, warehouse operations and product transfers.' },
  { key: 'accounting', label: 'Accounting',     icon: '💳', color: '#a855f7', desc: 'Invoices, payments, journal entries and financial reports.' },
  { key: 'crm',        label: 'CRM',            icon: '🤝', color: '#e879f9', desc: 'Customer pipeline, leads, opportunities and follow-ups.' },
  { key: 'pos',        label: 'Point of Sale',  icon: '🏪', color: '#f0a500', desc: 'Retail counter sales and POS session management.' },
  { key: 'hr',         label: 'HR',             icon: '👥', color: '#00d4aa', desc: 'Employee records, attendance, leaves and payroll.' },
  { key: 'all',        label: 'All Videos',     icon: '🎬', color: '#00d4ff', desc: 'All Odoo training videos in one place.' },
];

// Videos data store for each odoo sub-module
const odooSubModuleVideosData = {};

function openOdooModuleSelect() {
  logActivity({event_type:'training_module_open',event_detail:'Opened Odoo Training',page_name:'training',card_name:'Odoo Training'});
  const ov = document.getElementById('module-quiz-overlay');
  ov.style.display = 'flex';
  const screen = document.getElementById('module-quiz-screen');
  screen.innerHTML = `
    <div style="margin-bottom:18px;display:flex;align-items:center;gap:12px;">
      <div style="width:44px;height:44px;border-radius:12px;background:rgba(0,212,255,0.15);border:1.5px solid rgba(0,212,255,0.35);display:flex;align-items:center;justify-content:center;font-size:1.5rem;">🔷</div>
      <div>
        <div style="font-size:1.1rem;font-weight:800;color:var(--text);">Odoo Training</div>
        <div style="font-size:0.83rem;color:var(--muted);">Choose a module to watch videos</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${ODOO_SUB_MODULES.map(m => `
        <div onclick="openOdooSubModuleVideos('${m.key}')"
          style="cursor:pointer;padding:14px 16px;border-radius:12px;border:1.5px solid ${m.color}44;background:${m.color}12;display:flex;align-items:center;gap:14px;transition:all 0.18s;"
          onmouseover="this.style.borderColor='${m.color}bb';this.style.background='${m.color}22'"
          onmouseout="this.style.borderColor='${m.color}44';this.style.background='${m.color}12'">
          <div style="width:44px;height:44px;border-radius:10px;background:${m.color}28;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;">${m.icon}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;color:var(--text);font-size:0.96rem;">${m.label}</div>
            <div style="font-size:0.79rem;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.desc}</div>
          </div>
          <div style="width:32px;height:32px;border-radius:50%;background:${m.color};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="color:#fff;font-size:0.8rem;margin-left:2px;">▶</span>
          </div>
        </div>
      `).join('')}
    </div>
    <!-- Quiz Button -->
    <div style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px;">
      <button onclick="openModuleQuiz('odoo')" style="width:100%;padding:13px;border-radius:12px;border:1.5px solid rgba(0,212,255,0.4);background:rgba(0,212,255,0.1);cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:12px;transition:all 0.18s;"
        onmouseover="this.style.borderColor='rgba(0,212,255,0.9)';this.style.background='rgba(0,212,255,0.18)'"
        onmouseout="this.style.borderColor='rgba(0,212,255,0.4)';this.style.background='rgba(0,212,255,0.1)'">
        <span style="font-size:1.4rem;">📝</span>
        <div style="flex:1;text-align:left;">
          <div style="font-weight:700;color:var(--text);font-size:0.94rem;">Odoo Quiz</div>
          <div style="font-size:0.78rem;color:var(--muted);margin-top:1px;">10 Questions • Multiple Choice</div>
        </div>
        <span style="color:#00d4ff;font-size:1.1rem;">→</span>
      </button>
    </div>
  `;
}

function openOdooSubModuleVideos(subKey) {
  const sub = ODOO_SUB_MODULES.find(m => m.key === subKey);
  if (!sub) return;
  // training_submodule_open removed — module_open is sufficient
  const screen = document.getElementById('module-quiz-screen');
  screen.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
      <button onclick="openOdooModuleSelect()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.3rem;padding:0;line-height:1;">←</button>
      <div style="width:38px;height:38px;border-radius:10px;background:${sub.color}28;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">${sub.icon}</div>
      <div>
        <div style="font-size:1.02rem;font-weight:800;color:var(--text);">${sub.label}</div>
        <div style="font-size:0.79rem;color:var(--muted);">Odoo Training Videos</div>
      </div>
    </div>
    <div style="position:relative;margin-bottom:12px;">
      <input type="text" id="odoo-sub-search-${subKey}"
        placeholder="Search videos..."
        oninput="filterOdooSubVideos('${subKey}')"
        style="width:100%;padding:10px 14px 10px 38px;border-radius:10px;border:1.5px solid ${sub.color}40;background:var(--surface2);color:var(--text);font-size:0.9rem;font-family:inherit;outline:none;transition:border-color 0.18s;box-sizing:border-box;"
        onfocus="this.style.borderColor='${sub.color}bb'" onblur="this.style.borderColor='${sub.color}40'">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${sub.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);pointer-events:none;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
    </div>
    <div id="odoo-sub-cards-${subKey}" style="display:flex;flex-direction:column;gap:10px;">
      <div style="text-align:center;padding:24px;color:var(--muted);font-size:0.92rem;">Loading...</div>
    </div>
    <div id="odoo-sub-playerbox-${subKey}" style="display:none;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <button onclick="backToOdooSubList('${subKey}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.3rem;padding:0;line-height:1;">←</button>
        <div>
          <div id="odoo-sub-vtitle-${subKey}" style="font-size:1.02rem;font-weight:800;color:var(--text);"></div>
          <div style="font-size:0.8rem;color:var(--muted);margin-top:2px;">Odoo — ${sub.label}</div>
        </div>
      </div>
      <video id="odoo-sub-player-${subKey}" controls controlsList="nodownload noplaybackrate" disablePictureInPicture
        style="width:100%;border-radius:12px;background:#000;max-height:55vh;" preload="metadata">
        Your browser does not support the video tag.
      </video>
      <div id="odoo-sub-vdesc-${subKey}" style="margin-top:12px;font-size:0.87rem;color:var(--muted);line-height:1.65;"></div>
    </div>
  `;
  // Hide player box (cards is default)
  document.getElementById(`odoo-sub-playerbox-${subKey}`).style.display = 'none';
  fetchOdooSubVideos(subKey);
}

async function fetchOdooSubVideos(subKey) {
  const sub = ODOO_SUB_MODULES.find(m => m.key === subKey);
  const cardsEl = document.getElementById(`odoo-sub-cards-${subKey}`);
  if (!cardsEl) return;

  try {
    await CN.load();
    const section  = CN.getSection('Training');
    const odooNode = section
      ? CN.getCategories(section.id).find(c => (c.name||'').toLowerCase().includes('odoo'))
      : null;

    let files = [];
    if (odooNode) {
      if (subKey === 'all') {
        // All files directly under Odoo Training node
        files = CN.getFiles(odooNode.id);
      } else {
        // Try to find matching sub-node (e.g. "Purchase", "Sales", "Inventory"…)
        const subNode = CN.getCategories(odooNode.id).find(c =>
          (c.name||'').toLowerCase() === (sub.label||'').toLowerCase()
        );
        files = subNode ? CN.getFiles(subNode.id) : CN.getFiles(odooNode.id);
      }
    }

    odooSubModuleVideosData[subKey] = files.map(f => ({ id: f.id, Title: f.name, Video_URL: f.url }));
    renderOdooSubCards(subKey);
  } catch(err) {
    if (cardsEl) cardsEl.innerHTML = `<div style="text-align:center;padding:20px;color:#ef4444;font-size:0.9rem;">Failed to load videos.<br><span style="font-size:0.78rem;color:var(--muted);">${err.message}</span></div>`;
  }
}

function renderOdooSubCards(subKey) {
  const sub = ODOO_SUB_MODULES.find(m => m.key === subKey);
  const cardsEl = document.getElementById(`odoo-sub-cards-${subKey}`);
  if (!cardsEl) return;
  const data = odooSubModuleVideosData[subKey] || [];
  if (!data.length) {
    cardsEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted);font-size:0.9rem;">No videos found for this module.<br><span style="font-size:0.78rem;">Add SubModule = '${sub.label}' in Supabase.</span></div>`;
    return;
  }
  cardsEl.innerHTML = data.map((row, idx) => {
    const safeTitle = (row.Title||'').toLowerCase().replace(/"/g,'&quot;');
    const rowId = row.id || row.ID || '';
    const delBtnHtml = rowId ? `<button onclick="event.stopPropagation();confirmDeleteTrainingVideo(${rowId},'${safeTitle}','${subKey}')" title="Delete video"
      style="width:28px;height:28px;border-radius:8px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;"
      onmouseover="this.style.background='rgba(239,68,68,0.28)'" onmouseout="this.style.background='rgba(239,68,68,0.12)'">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
    </button>` : '';
    return `
      <div data-vtitle="${safeTitle}" onclick="playOdooSubVideo('${subKey}',${idx})"
        style="cursor:pointer;padding:14px;border-radius:12px;border:1.5px solid ${sub.color}44;background:${sub.color}12;transition:all 0.18s;"
        onmouseover="this.style.borderColor='${sub.color}bb';this.style.background='${sub.color}22'"
        onmouseout="this.style.borderColor='${sub.color}44';this.style.background='${sub.color}12'">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:44px;height:44px;border-radius:10px;background:${sub.color}28;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">${sub.icon}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;color:var(--text);font-size:0.94rem;">${row.Title||'Untitled'}</div>
            <div style="font-size:0.79rem;color:var(--muted);margin-top:2px;">Odoo — ${sub.label}</div>
          </div>
          ${delBtnHtml}
          <div style="width:34px;height:34px;border-radius:50%;background:${sub.color};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="color:#fff;font-size:0.8rem;margin-left:2px;">▶</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

function playOdooSubVideo(subKey, idx) {
  const row = (odooSubModuleVideosData[subKey]||[])[idx];
  if (!row) return;
  const sub = ODOO_SUB_MODULES.find(m => m.key === subKey);
  document.getElementById(`odoo-sub-vtitle-${subKey}`).textContent = `${sub.icon} ${row.Title}`;
  document.getElementById(`odoo-sub-vdesc-${subKey}`).textContent = sub.desc;
  document.getElementById(`odoo-sub-cards-${subKey}`).style.display = 'none';
  const searchWrap = document.querySelector(`#odoo-sub-search-${subKey}`)?.parentElement;
  if (searchWrap) searchWrap.style.display = 'none';
  document.getElementById(`odoo-sub-playerbox-${subKey}`).style.display = 'block';

  const url = row.Video_URL || '';
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const videoEl = document.getElementById(`odoo-sub-player-${subKey}`);

  if (ytMatch) {
    // YouTube: show thumbnail + watch button (embedding often restricted)
    const videoId = ytMatch[1];
    const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    if (videoEl) videoEl.style.display = 'none';
    // Remove old iframe if any
    const oldIframe = document.getElementById(`odoo-sub-yt-${subKey}`);
    if (oldIframe) oldIframe.remove();
    // Create or update YT card
    let ytCard = document.getElementById(`odoo-sub-ytcard-${subKey}`);
    if (!ytCard) {
      ytCard = document.createElement('div');
      ytCard.id = `odoo-sub-ytcard-${subKey}`;
      if (videoEl) videoEl.after(ytCard);
    }
    ytCard.style.display = 'block';
    ytCard.innerHTML = `
      <div style="position:relative;border-radius:12px;overflow:hidden;cursor:pointer;background:#000;" onclick="logActivity({event_type:'video_play',event_detail:'YouTube: ${row.Title}',video_title:'${row.Title}',page_name:'training',card_name:'Odoo - ${subKey}',metadata:{source:'youtube',url:'${watchUrl}'}});window.open('${watchUrl}','_blank')">
        <img src="${thumbUrl}" alt="${row.Title}" style="width:100%;display:block;border-radius:12px;max-height:55vh;object-fit:cover;" onerror="this.style.minHeight='180px';this.style.background='#111';">
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);border-radius:12px;">
          <div style="width:64px;height:64px;background:#ff0000;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:12px;box-shadow:0 4px 20px rgba(255,0,0,0.5);">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <div style="color:#fff;font-weight:700;font-size:0.95rem;text-align:center;padding:0 16px;">Watch on YouTube</div>
          <div style="color:rgba(255,255,255,0.7);font-size:0.78rem;margin-top:4px;">Click to open in new tab</div>
        </div>
      </div>
      <a href="${watchUrl}" target="_blank" rel="noopener"
        onclick="logActivity({event_type:'video_play',event_detail:'YouTube: ${row.Title}',video_title:'${row.Title}',page_name:'training',card_name:'Odoo - ${subKey}',metadata:{source:'youtube',url:'${watchUrl}'}})"
        style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;padding:12px;border-radius:10px;background:#ff0000;color:#fff;font-weight:700;font-size:0.92rem;text-decoration:none;transition:opacity 0.18s;"
        onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        YouTube par Dekhein
      </a>`;
  } else {
    // Supabase/direct video
    pauseAllVideosExcept(`odoo-sub-player-${subKey}`);
    const ytCard = document.getElementById(`odoo-sub-ytcard-${subKey}`);
    if (ytCard) ytCard.style.display = 'none';
    const oldIframe = document.getElementById(`odoo-sub-yt-${subKey}`);
    if (oldIframe) { oldIframe.src = ''; oldIframe.style.display = 'none'; }
    if (videoEl) { videoEl.style.display = ''; videoEl.src = url; videoEl.load();
      _actTrackVideo(videoEl, row.Title || subKey); } // ACTIVITY TRACKING
  }
}

function backToOdooSubList(subKey) {
  const v = document.getElementById(`odoo-sub-player-${subKey}`);
  if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
  const iframeEl = document.getElementById(`odoo-sub-yt-${subKey}`);
  if (iframeEl) { iframeEl.src = ''; iframeEl.style.display = 'none'; }
  const ytCard = document.getElementById(`odoo-sub-ytcard-${subKey}`);
  if (ytCard) ytCard.style.display = 'none';
  document.getElementById(`odoo-sub-playerbox-${subKey}`).style.display = 'none';
  document.getElementById(`odoo-sub-cards-${subKey}`).style.display = 'flex';
  const searchWrap = document.querySelector(`#odoo-sub-search-${subKey}`)?.parentElement;
  if (searchWrap) searchWrap.style.display = 'block';
}

function filterOdooSubVideos(subKey) {
  const inp = document.getElementById(`odoo-sub-search-${subKey}`);
  if (!inp) return;
  const q = inp.value.toLowerCase().trim();
  const container = document.getElementById(`odoo-sub-cards-${subKey}`);
  if (!container) return;
  const cards = container.querySelectorAll('[data-vtitle]');
  let visible = 0;
  cards.forEach(c => {
    const t = c.getAttribute('data-vtitle') || '';
    if (!q || t.includes(q)) { c.style.display = ''; visible++; } else { c.style.display = 'none'; }
  });
}

function openModuleQuiz(moduleKey) {
  moduleQuizCurrentKey = moduleKey;
  moduleQuizActive = MODULE_QUIZZES[moduleKey];
  const _modMeta = MODULE_QUIZZES[moduleKey];
  if (_modMeta) logActivity({event_type:'training_module_open',event_detail:'Opened module: '+_modMeta.title,page_name:'training',card_name:_modMeta.title});
  const ov = document.getElementById('module-quiz-overlay');
  ov.style.display = 'flex';
  showModuleQuizMenu();
}

// ── Per-module video data store ──
const moduleVideosData = {};

// ── Generic: fetch videos for a module from content_nodes + files ──
async function fetchModuleVideos(key) {
  const mod = MODULE_QUIZZES[key];
  const cardsEl = document.getElementById(`modvid-cards-${key}`);
  if (!cardsEl) return;
  cardsEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted);font-size:0.92rem;">Loading...</div>`;
  try {
    await CN.load();
    const section = CN.getSection('Training');
    const label   = (mod.label || key).toLowerCase();
    const cat     = section
      ? CN.getCategories(section.id).find(c => (c.name||'').toLowerCase().includes(label))
      : null;
    const files = cat ? CN.getFiles(cat.id) : [];
    moduleVideosData[key] = files.map(f => ({ id: f.id, Title: f.name, Video_URL: f.url }));
    renderModuleVideoCards(key);
  } catch(err) {
    if (cardsEl) cardsEl.innerHTML = `<div style="text-align:center;padding:20px;color:#ef4444;font-size:0.9rem;">Failed to load videos.<br><span style="font-size:0.78rem;color:var(--muted);">${err.message}</span></div>`;
  }
}

// ── Search filter for generic module video lists (Odoo, PC, ClickTask, CoolBus, SmartFleet) ──
function filterModuleVideos(key) {
  const inp = document.getElementById('modvid-search-' + key);
  if (!inp) return;
  const q = inp.value.toLowerCase().trim();
  const container = document.getElementById('modvid-cards-' + key);
  if (!container) return;
  const cards = container.querySelectorAll('[data-vtitle]');
  let visible = 0;
  cards.forEach(c => {
    const title = c.getAttribute('data-vtitle') || '';
    if (!q || title.includes(q)) { c.style.display = ''; visible++; }
    else { c.style.display = 'none'; }
  });
  // No-results message
  let nrEl = document.getElementById('modvid-nores-' + key);
  if (visible === 0 && q && cards.length > 0) {
    if (!nrEl) {
      nrEl = document.createElement('div');
      nrEl.id = 'modvid-nores-' + key;
      nrEl.style.cssText = 'text-align:center;padding:20px;color:var(--muted);font-size:0.9rem;';
      container.appendChild(nrEl);
    }
    nrEl.textContent = 'No videos found for "' + inp.value.trim() + '".';
    nrEl.style.display = '';
  } else if (nrEl) {
    nrEl.style.display = 'none';
  }
}

// ── Search filter for MIS video list ──
function filterMISVideos() {
  const inp = document.getElementById('mis-video-search');
  if (!inp) return;
  const q = inp.value.toLowerCase().trim();
  const container = document.getElementById('mis-video-cards');
  if (!container) return;
  const cards = container.querySelectorAll('[data-vtitle]');
  let visible = 0;
  cards.forEach(c => {
    const title = c.getAttribute('data-vtitle') || '';
    if (!q || title.includes(q)) { c.style.display = ''; visible++; }
    else { c.style.display = 'none'; }
  });
  let nrEl = document.getElementById('mis-video-nores');
  if (visible === 0 && q && cards.length > 0) {
    if (!nrEl) {
      nrEl = document.createElement('div');
      nrEl.id = 'mis-video-nores';
      nrEl.style.cssText = 'text-align:center;padding:20px;color:var(--muted);font-size:0.9rem;';
      container.appendChild(nrEl);
    }
    nrEl.textContent = 'No videos found for "' + inp.value.trim() + '".';
    nrEl.style.display = '';
  } else if (nrEl) {
    nrEl.style.display = 'none';
  }
}

function renderModuleVideoCards(key) {
  const mod = MODULE_QUIZZES[key];
  const cardsEl = document.getElementById(`modvid-cards-${key}`);
  if (!cardsEl) return;
  const data = moduleVideosData[key] || [];
  if (!data.length) {
    cardsEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);">No videos found.<br><span style="font-size:0.8rem;">Add videos with Module = '${mod.supabaseModule}' in Supabase.</span></div>`;
    return;
  }
  cardsEl.innerHTML = data.map((row, idx) => {
    const meta = getMISVideoMeta(row.Title);
    const safeTitle = (row.Title||'').toLowerCase().replace(/"/g,'&quot;');
    const rowId = row.id || row.ID || '';
    return `
      <div data-vtitle="${safeTitle}" onclick="playModuleVideo('${key}',${idx})"
           style="cursor:pointer;padding:16px;border-radius:12px;border:1.5px solid ${mod.color}44;background:${mod.color}12;transition:all 0.18s;"
           onmouseover="this.style.borderColor='${mod.color}bb';this.style.background='${mod.color}22'"
           onmouseout="this.style.borderColor='${mod.color}44';this.style.background='${mod.color}12'">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:48px;height:48px;border-radius:10px;background:${mod.color}28;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">${meta.icon}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;color:var(--text);font-size:0.97rem;">${row.Title}</div>
            <div style="font-size:0.81rem;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Training Video</div>
          </div>
          ${rowId ? '<button onclick="event.stopPropagation();confirmDeleteTrainingVideo('+rowId+',\''+safeTitle+'\',\''+key+'\');" title="Delete" style="width:28px;height:28px;border-radius:8px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;" onmouseover="this.style.background=\'rgba(239,68,68,0.28)\'" onmouseout="this.style.background=\'rgba(239,68,68,0.12)\'"><svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6\"/><path d=\"M10 11v6M14 11v6\"/><path d=\"M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2\"/></svg></button>' : ''}
          <div style="width:36px;height:36px;border-radius:50%;background:${mod.color};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="color:#fff;font-size:0.85rem;margin-left:2px;">▶</span>
          </div>
        </div>
      </div>`;
  }).join('');
  // Re-apply search filter if user already typed something before re-render
  if (typeof filterModuleVideos === 'function') filterModuleVideos(key);
}

function playModuleVideo(key, idx) {
  const row = (moduleVideosData[key] || [])[idx];
  if (!row) return;
  const meta = getMISVideoMeta(row.Title);
  document.getElementById(`modvid-title-${key}`).textContent = `${meta.icon} ${row.Title}`;
  document.getElementById(`modvid-desc-${key}`).textContent = meta.desc;
  document.getElementById(`modvid-list-${key}`).style.display = 'none';
  document.getElementById(`modvid-playerbox-${key}`).style.display = 'block';

  // ── YouTube URL detect karo ──
  const url = row.Video_URL || '';
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const playerBox = document.getElementById(`modvid-player-wrap-${key}`) || document.getElementById(`modvid-player-${key}`)?.parentElement;

  if (ytMatch) {
    // YouTube: show thumbnail + watch button (embedding often restricted)
    const videoId = ytMatch[1];
    const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const videoEl = document.getElementById(`modvid-player-${key}`);
    if (videoEl) videoEl.style.display = 'none';
    const oldIframe = document.getElementById(`modvid-yt-iframe-${key}`);
    if (oldIframe) oldIframe.remove();
    let ytCard = document.getElementById(`modvid-ytcard-${key}`);
    if (!ytCard) {
      ytCard = document.createElement('div');
      ytCard.id = `modvid-ytcard-${key}`;
      if (videoEl) videoEl.after(ytCard);
    }
    ytCard.style.display = 'block';
    ytCard.innerHTML = `
      <div style="position:relative;border-radius:12px;overflow:hidden;cursor:pointer;background:#000;" onclick="logActivity({event_type:'video_play',event_detail:'YouTube: ${row.Title}',video_title:'${row.Title}',page_name:'training',card_name:'${key}',metadata:{source:'youtube',url:'${watchUrl}'}});window.open('${watchUrl}','_blank')">
        <img src="${thumbUrl}" alt="${row.Title}" style="width:100%;display:block;border-radius:12px;max-height:55vh;object-fit:cover;" onerror="this.style.minHeight='180px';this.style.background='#111';">
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);border-radius:12px;">
          <div style="width:64px;height:64px;background:#ff0000;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:12px;box-shadow:0 4px 20px rgba(255,0,0,0.5);">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <div style="color:#fff;font-weight:700;font-size:0.95rem;text-align:center;padding:0 16px;">Watch on YouTube</div>
          <div style="color:rgba(255,255,255,0.7);font-size:0.78rem;margin-top:4px;">Click to open in new tab</div>
        </div>
      </div>
      <a href="${watchUrl}" target="_blank" rel="noopener"
        onclick="logActivity({event_type:'video_play',event_detail:'YouTube: ${row.Title}',video_title:'${row.Title}',page_name:'training',card_name:'${key}',metadata:{source:'youtube',url:'${watchUrl}'}})"
        style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;padding:12px;border-radius:10px;background:#ff0000;color:#fff;font-weight:700;font-size:0.92rem;text-decoration:none;transition:opacity 0.18s;"
        onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        YouTube par Dekhein
      </a>`;
  } else {
    // Supabase/direct video URL
    pauseAllVideosExcept(`modvid-player-${key}`);
    const videoEl = document.getElementById(`modvid-player-${key}`);
    const iframeEl = document.getElementById(`modvid-yt-iframe-${key}`);
    if (iframeEl) { iframeEl.src = ''; iframeEl.style.display = 'none'; }
    if (videoEl) { videoEl.style.display = ''; videoEl.src = url; videoEl.load();
      _actTrackVideo(videoEl, row.Title || key); } // ACTIVITY TRACKING

    // Download button — sirf allowed users ke liye
    const dlWrap = document.getElementById(`modvid-dl-wrap-${key}`);
    if (dlWrap && _canDownloadVideo() && url) {
      dlWrap.innerHTML = `<a href="${url}" download="${row.Title || 'video'}.mp4" target="_blank"
        style="display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;background:rgba(0,212,170,0.12);border:1px solid rgba(0,212,170,0.35);color:#00d4aa;font-size:0.82rem;font-weight:700;text-decoration:none;">
        ⬇️ Download Video
      </a>`;
    }
  }
}

function backToModuleVideoList(key) {
  const v = document.getElementById(`modvid-player-${key}`);
  if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
  const iframeEl = document.getElementById(`modvid-yt-iframe-${key}`);
  if (iframeEl) { iframeEl.src = ''; iframeEl.style.display = 'none'; }
  const ytCard = document.getElementById(`modvid-ytcard-${key}`);
  if (ytCard) ytCard.style.display = 'none';
  document.getElementById(`modvid-playerbox-${key}`).style.display = 'none';
  document.getElementById(`modvid-list-${key}`).style.display = 'block';
}

function switchModuleTab(key, tab) {
  const vTab = document.getElementById(`modvid-vtab-${key}`);
  const qTab = document.getElementById(`modvid-qtab-${key}`);
  const btnV = document.getElementById(`modvid-btn-v-${key}`);
  const btnQ = document.getElementById(`modvid-btn-q-${key}`);
  const mod = MODULE_QUIZZES[key];
  if (!vTab || !qTab) return;
  if (tab === 'videos') {
    vTab.style.display = 'block'; qTab.style.display = 'none';
    btnV.style.background = `${mod.color}2e`; btnV.style.color = mod.color; btnV.style.fontWeight = '800';
    btnQ.style.background = 'transparent'; btnQ.style.color = 'var(--muted)'; btnQ.style.fontWeight = '700';
    const v = document.getElementById(`modvid-player-${key}`);
    if (v) v.pause();
  } else {
    vTab.style.display = 'none'; qTab.style.display = 'block';
    btnQ.style.background = `${mod.color}2e`; btnQ.style.color = mod.color; btnQ.style.fontWeight = '800';
    btnV.style.background = 'transparent'; btnV.style.color = 'var(--muted)'; btnV.style.fontWeight = '700';
  }
}

function showModuleQuizMenu() {
  const mod = moduleQuizActive;
  const key = moduleQuizCurrentKey;
  const borderColor = mod.color + '55';
  const bgColor = mod.color + '14';
  const quizOnly = _quizOnlyMode;

  // ── Modules with Supabase videos → Videos + Quiz tabs ──
  if (mod.supabaseModule) {
    document.getElementById('module-quiz-screen').innerHTML = `
      <div style="margin-bottom:16px;">
        <div style="font-size:1.15rem;font-weight:800;color:var(--text);margin-bottom:4px;">${mod.icon} ${mod.title.replace(' Quiz','')}</div>
        <div style="font-size:0.85rem;color:var(--muted);">${quizOnly ? 'Test your knowledge!' : 'Watch videos or test your knowledge!'}</div>
      </div>
      ${quizOnly ? '' : `
      <div style="display:flex;gap:0;margin-bottom:18px;border-radius:12px;overflow:hidden;border:1.5px solid ${mod.color}40;">
        <button id="modvid-btn-v-${key}" onclick="switchModuleTab('${key}','videos')"
          style="flex:1;padding:10px 0;border:none;background:${mod.color}2e;color:${mod.color};font-weight:800;font-size:0.95rem;cursor:pointer;font-family:inherit;">▶ Videos</button>
        <button id="modvid-btn-q-${key}" onclick="switchModuleTab('${key}','quiz')"
          style="flex:1;padding:10px 0;border:none;background:transparent;color:var(--muted);font-weight:700;font-size:0.95rem;cursor:pointer;font-family:inherit;">📝 Quiz</button>
      </div>
      <!-- Videos Tab -->
      <div id="modvid-vtab-${key}">
        <div id="modvid-list-${key}">
          <div style="font-size:0.82rem;font-weight:700;color:var(--muted);letter-spacing:0.05em;text-transform:uppercase;margin-bottom:12px;">Training Videos</div>
          <div style="position:relative;margin-bottom:12px;">
            <input type="text" id="modvid-search-${key}"
              placeholder="Search videos..."
              oninput="filterModuleVideos('${key}')"
              style="width:100%;padding:10px 14px 10px 38px;border-radius:10px;border:1.5px solid ${mod.color}40;background:var(--surface2);color:var(--text);font-size:0.9rem;font-family:inherit;outline:none;transition:border-color 0.18s;box-sizing:border-box;"
              onfocus="this.style.borderColor='${mod.color}bb'" onblur="this.style.borderColor='${mod.color}40'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${mod.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);pointer-events:none;">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <div id="modvid-cards-${key}" style="display:flex;flex-direction:column;gap:10px;">
            <div style="text-align:center;padding:24px;color:var(--muted);font-size:0.92rem;">Loading...</div>
          </div>
        </div>
        <div id="modvid-playerbox-${key}" style="display:none;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
            <button onclick="backToModuleVideoList('${key}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.3rem;padding:0;line-height:1;">←</button>
            <div>
              <div id="modvid-title-${key}" style="font-size:1.02rem;font-weight:800;color:var(--text);"></div>
              <div style="font-size:0.8rem;color:var(--muted);margin-top:2px;">Training Video</div>
            </div>
          </div>
          <video id="modvid-player-${key}" controls
            controlsList="nodownload noplaybackrate" disablePictureInPicture
            style="width:100%;border-radius:12px;background:#000;max-height:55vh;" preload="metadata">
            Your browser does not support the video tag.
          </video>
          ${_canDownloadVideo() ? `<div id="modvid-dl-wrap-${key}" style="margin-top:10px;text-align:right;"></div>` : ''}
          <div id="modvid-desc-${key}" style="margin-top:12px;font-size:0.87rem;color:var(--muted);line-height:1.65;"></div>
        </div>
      </div>`}

      <!-- Quiz Tab -->
      <div id="modvid-qtab-${key}" style="display:block;">
        <div style="font-size:0.80rem;font-weight:700;color:var(--muted);letter-spacing:0.05em;text-transform:uppercase;margin-bottom:12px;">Take the Quiz</div>
        <button onclick="startModuleQuiz()" style="width:100%;text-align:left;padding:18px;border-radius:12px;border:1.5px solid ${borderColor};background:${bgColor};cursor:pointer;font-family:inherit;transition:all 0.18s;" onmouseover="this.style.borderColor='${mod.color}'" onmouseout="this.style.borderColor='${borderColor}'">
          <div style="display:flex;align-items:center;gap:14px;">
            <span style="font-size:2rem;">${mod.icon}</span>
            <div style="flex:1;">
              <div style="font-weight:700;color:var(--text);font-size:0.97rem;margin-bottom:3px;">${mod.subtitle}</div>
              <div style="font-size:0.78rem;color:var(--muted);">10 Questions • Multiple Choice</div>
            </div>
            <span style="color:${mod.color};font-size:1.2rem;">→</span>
          </div>
        </button>
      </div>
    `;
    if (!quizOnly) fetchModuleVideos(key);
    _quizOnlyMode = false;
    return;
  }

  // ── Other modules (PC, Click Task, Cool Bus, SmartFleet) → Drive button + Quiz ──
  document.getElementById('module-quiz-screen').innerHTML = `
    <div style="margin-bottom:20px;">
      <div style="font-size:1.15rem;font-weight:800;color:var(--text);margin-bottom:4px;">${mod.icon} ${mod.title.replace(' Quiz','')}</div>
      <div style="font-size:0.85rem;color:var(--muted);">${quizOnly ? 'Test your knowledge!' : 'Watch the videos, then test your knowledge!'}</div>
    </div>
    ${quizOnly ? '' : `
    <div style="margin-bottom:20px;">
      <a href="${mod.driveUrl}" target="_blank" style="text-decoration:none;">
        <button style="width:100%;padding:12px;border-radius:10px;border:1.5px solid rgba(240,165,0,0.4);background:rgba(240,165,0,0.1);color:#f0a500;font-weight:700;font-size:0.88rem;cursor:pointer;font-family:inherit;">📁 Open Drive Videos</button>
      </a>
    </div>`}
    <div style="font-size:0.80rem;font-weight:700;color:var(--muted);letter-spacing:0.05em;text-transform:uppercase;margin-bottom:12px;">Take the Quiz</div>
    <button onclick="startModuleQuiz()" style="width:100%;text-align:left;padding:18px;border-radius:12px;border:1.5px solid ${borderColor};background:${bgColor};cursor:pointer;font-family:inherit;transition:all 0.18s;" onmouseover="this.style.borderColor='${mod.color}'" onmouseout="this.style.borderColor='${borderColor}'">
      <div style="display:flex;align-items:center;gap:14px;">
        <span style="font-size:2rem;">${mod.icon}</span>
        <div style="flex:1;">
          <div style="font-weight:700;color:var(--text);font-size:0.97rem;margin-bottom:3px;">${mod.subtitle}</div>
          <div style="font-size:0.78rem;color:var(--muted);">10 Questions • Multiple Choice</div>
        </div>
        <span style="color:${mod.color};font-size:1.2rem;">→</span>
      </div>
    </button>
  `;
  _quizOnlyMode = false;
}

function startModuleQuiz() {
  moduleQuizQIndex = 0;
  moduleQuizAnswers = [];
  renderModuleQuestion();
}

function closeModuleQuiz() {
  _quizOnlyMode = false;
  document.getElementById('module-quiz-overlay').style.display = 'none';
  // Stop any playing module video
  document.querySelectorAll('[id^="modvid-player-"]').forEach(v => {
    if (v && v.pause) { v.pause(); v.removeAttribute('src'); v.load(); }
  });
}

function renderModuleQuestion() {
  const mod = moduleQuizActive;
  const q = mod.questions[moduleQuizQIndex];
  const total = mod.questions.length;
  const screen = document.getElementById('module-quiz-screen');
  screen.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
      <button onclick="showModuleQuizMenu()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.3rem;padding:0;">←</button>
      <div>
        <div style="font-weight:700;font-size:1.05rem;color:var(--text);">${mod.icon} ${mod.title}</div>
        <div style="font-size:0.80rem;color:var(--muted);">${mod.subtitle}</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <span style="font-size:0.82rem;color:var(--muted);">Question ${moduleQuizQIndex+1} of ${total}</span>
      <span style="font-size:0.82rem;font-weight:700;color:${mod.color};">${Math.round((moduleQuizQIndex/total)*100)}% done</span>
    </div>
    <div style="background:var(--border);border-radius:4px;height:5px;margin-bottom:22px;">
      <div style="background:${mod.color};height:5px;border-radius:4px;width:${(moduleQuizQIndex/total)*100}%;transition:width 0.3s;"></div>
    </div>
    <div style="font-size:1.03rem;font-weight:600;color:var(--text);margin-bottom:20px;line-height:1.55;">${q.q}</div>
    <div style="display:flex;flex-direction:column;gap:10px;" id="mq-options">
      ${q.opts.map((opt,i)=>`
        <button onclick="selectModuleAnswer(${i})" id="mq-opt-${i}" style="text-align:left;padding:13px 16px;border-radius:10px;border:1.5px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;font-size:0.91rem;transition:all 0.18s;font-family:inherit;">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--border);font-weight:700;font-size:0.75rem;margin-right:10px;">${['A','B','C','D'][i]}</span>${opt}
        </button>
      `).join('')}
    </div>
    <div id="mq-next-area" style="margin-top:18px;display:none;">
      <button onclick="nextModuleQuestion()" style="width:100%;padding:13px;border-radius:10px;border:none;background:${mod.color};color:#fff;font-weight:700;font-size:0.97rem;cursor:pointer;font-family:inherit;">
        ${moduleQuizQIndex < total-1 ? 'Next Question →' : 'Submit Quiz 🎯'}
      </button>
    </div>
  `;
}

function selectModuleAnswer(idx) {
  const mod = moduleQuizActive;
  const q = mod.questions[moduleQuizQIndex];
  moduleQuizAnswers[moduleQuizQIndex] = idx;
  document.querySelectorAll('[id^="mq-opt-"]').forEach((btn,i)=>{
    btn.disabled = true;
    if(i===q.ans){ btn.style.background='rgba(34,197,94,0.15)';btn.style.borderColor='#22c55e';btn.style.color='#22c55e'; }
    else if(i===idx && idx!==q.ans){ btn.style.background='rgba(239,68,68,0.15)';btn.style.borderColor='#ef4444';btn.style.color='#ef4444'; }
  });
  document.getElementById('mq-next-area').style.display='block';
}

function nextModuleQuestion() {
  moduleQuizQIndex++;
  if(moduleQuizQIndex < moduleQuizActive.questions.length){ renderModuleQuestion(); }
  else { showModuleResult(); }
}

function showModuleResult() {
  const mod = moduleQuizActive;
  const total = mod.questions.length;
  let score = 0;
  moduleQuizAnswers.forEach((ans,i)=>{ if(ans===mod.questions[i].ans) score++; });
  const pct = Math.round((score/total)*100);
  const emoji = pct>=80?'🏆':pct>=60?'👍':'📚';
  const msg = pct>=80?'Excellent Work!':pct>=60?'Good Job!':'Keep Learning!';
  const msgColor = pct>=80?'#22c55e':pct>=60?'#f0a500':'#ef4444';
  const modKey = Object.keys(MODULE_QUIZZES).find(k=>MODULE_QUIZZES[k].title===mod.title);
  document.getElementById('module-quiz-screen').innerHTML = `
    <div style="text-align:center;padding:10px 0;">
      <div style="font-size:3.5rem;margin-bottom:10px;">${emoji}</div>
      <div style="font-size:1.3rem;font-weight:800;color:${msgColor};margin-bottom:4px;">${msg}</div>
      <div style="font-size:0.85rem;color:var(--muted);margin-bottom:24px;">${mod.icon} ${mod.title}</div>
      <div style="display:inline-flex;align-items:center;justify-content:center;width:110px;height:110px;border-radius:50%;border:6px solid ${msgColor};margin:0 auto 22px;">
        <div>
          <div style="font-size:1.85rem;font-weight:900;color:${msgColor};">${score}/${total}</div>
          <div style="font-size:0.78rem;color:var(--muted);">${pct}%</div>
        </div>
      </div>
      <div style="background:var(--surface2);border-radius:12px;padding:14px;margin-bottom:18px;max-height:220px;overflow-y:auto;">
        <div style="font-size:0.82rem;font-weight:700;color:var(--text);margin-bottom:10px;text-align:left;">Review Answers</div>
        ${mod.questions.map((q,i)=>`
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:10px;text-align:left;">
            <span style="font-size:0.90rem;">${moduleQuizAnswers[i]===q.ans?'✅':'❌'}</span>
            <div>
              <div style="font-size:0.78rem;color:var(--text);font-weight:600;">Q${i+1}: ${q.q}</div>
              <div style="font-size:0.75rem;color:${moduleQuizAnswers[i]===q.ans?'#22c55e':'#ef4444'};">Your answer: ${q.opts[moduleQuizAnswers[i]]}</div>
              ${moduleQuizAnswers[i]!==q.ans?`<div style="font-size:0.75rem;color:#22c55e;">Correct: ${q.opts[q.ans]}</div>`:''}
            </div>
          </div>
        `).join('')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
        <button onclick="startModuleQuiz()" style="flex:1;min-width:110px;padding:11px 14px;border-radius:10px;border:1.5px solid ${mod.color};background:transparent;color:${mod.color};font-weight:700;font-size:0.88rem;cursor:pointer;font-family:inherit;">🔄 Retry</button>
        <button onclick="showModuleQuizMenu()" style="flex:1;min-width:110px;padding:11px 14px;border-radius:10px;border:none;background:var(--surface2);color:var(--text);font-weight:600;font-size:0.85rem;cursor:pointer;font-family:inherit;">← Back</button>
        <a href="${mod.driveUrl}" target="_blank" style="flex:1;min-width:110px;text-decoration:none;"><button style="width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid var(--border);background:var(--surface2);color:var(--text);font-weight:600;font-size:0.85rem;cursor:pointer;font-family:inherit;">📁 Drive</button></a>
      </div>
    </div>
  `;
}



const MIS_QUIZ_MODULES = {
  fms: {
    title: 'FMS Quiz',
    subtitle: 'Fleet Management System',
    color: '#f0a500',
    icon: '🚗',
    driveUrl: 'https://drive.google.com/drive/folders/1kJxI0w9_IfT6_dfkBlXUkjTfx47eGwcz',
    questions: []
  },
  checklist: {
    title: 'Checklist Quiz',
    subtitle: 'Daily Operational Checklist',
    color: '#00d4aa',
    icon: '✅',
    driveUrl: 'https://drive.google.com/drive/folders/1kJxI0w9_IfT6_dfkBlXUkjTfx47eGwcz',
    questions: []
  },
  mis: {
    title: 'MIS Quiz',
    subtitle: 'Management Information System',
    color: '#f0a500',
    icon: '📊',
    driveUrl: 'https://drive.google.com/drive/folders/1kJxI0w9_IfT6_dfkBlXUkjTfx47eGwcz',
    questions: []
  },
  looker: {
    title: 'Looker Studio Quiz',
    subtitle: 'Checklist Reports in Looker Studio',
    color: '#a855f7',
    icon: '📈',
    driveUrl: 'https://drive.google.com/drive/folders/1kJxI0w9_IfT6_dfkBlXUkjTfx47eGwcz',
    questions: []
  }
};

let currentQuizModule = null;
let currentQuestionIndex = 0;
let userAnswers = [];

function openMISQuizMenu() {
  logActivity({event_type:'training_module_open',event_detail:'Opened MIS Training',page_name:'training',card_name:'MIS Training'});
  console.log('[ACT] MIS Training opened');
  document.getElementById('mis-quiz-overlay').style.display = 'flex';
  switchMISTab('videos');
  fetchMISVideos();   // load from Supabase table on open
}

function closeMISQuiz() {
  document.getElementById('mis-quiz-overlay').style.display = 'none';
  const v = document.getElementById('mis-main-video');
  if(v) { v.pause(); v.removeAttribute('src'); v.load(); }
  _misQuizzesLoaded = false; // allow fresh reload next open
}

// ── Tab switching ──
function switchMISTab(tab) {
  const vTab = document.getElementById('mis-videos-tab');
  const qTab = document.getElementById('mis-quiz-tab');
  const btnV = document.getElementById('mis-tab-videos');
  const btnQ = document.getElementById('mis-tab-quiz');
  if(tab === 'videos') {
    vTab.style.display = 'block'; qTab.style.display = 'none';
    btnV.style.background = 'rgba(240,165,0,0.18)'; btnV.style.color = '#f0a500'; btnV.style.fontWeight = '800';
    btnQ.style.background = 'transparent'; btnQ.style.color = 'var(--muted)'; btnQ.style.fontWeight = '700';
    document.getElementById('mis-video-list').style.display = 'block';
    document.getElementById('mis-video-player').style.display = 'none';
    const v = document.getElementById('mis-main-video');
    if(v) v.pause();
  } else {
    vTab.style.display = 'none'; qTab.style.display = 'block';
    btnQ.style.background = 'rgba(168,85,247,0.18)'; btnQ.style.color = '#a855f7'; btnQ.style.fontWeight = '800';
    btnV.style.background = 'transparent'; btnV.style.color = 'var(--muted)'; btnV.style.fontWeight = '700';
    loadMISDBQuizzes();  // load quizzes from Supabase
  }
}

// ── Load DB quizzes inside MIS overlay Quiz tab ──
let _misQuizzesLoaded = false;
async function loadMISDBQuizzes() {
  if (_misQuizzesLoaded) return;  // already loaded, no re-fetch
  _misQuizzesLoaded = true;

  const loadEl  = document.getElementById('mis-db-quiz-loading');
  const listEl  = document.getElementById('mis-db-quiz-list');
  const emptyEl = document.getElementById('mis-db-quiz-empty');
  if (!loadEl) return;

  // Show Create Quiz button only to authorised MIS members
  const createBtn = document.getElementById('mis-create-quiz-btn');
  if (createBtn && _canUploadQuiz()) createBtn.style.display = 'inline-block';

  loadEl.style.display = 'block';
  listEl.innerHTML = '';
  emptyEl.style.display = 'none';

  // Inline headers — QZ_HDRS not yet defined at this point in the file
  const _hdrs = SB_HDRS_JSON();

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/quizzes?select=*,content_nodes(name),questions(marks)&is_active=eq.true&order=id.desc`,
      { headers: _hdrs }
    );
    let quizzes = await res.json();
    // Only show quizzes linked to MIS Training node
    quizzes = quizzes.filter(q =>
      (q.content_nodes?.name || '').toLowerCase().trim() === 'mis training'
    );
    loadEl.style.display = 'none';

    if (!Array.isArray(quizzes) || !quizzes.length) {
      emptyEl.style.display = 'block';
      return;
    }

    const colors = ['#a855f7','#f0a500','#00d4aa','#4e9af1','#f97316','#e879f9','#22c55e'];
    listEl.innerHTML = quizzes.map((q, i) => {
      const col        = colors[i % colors.length];
      const mod        = q.content_nodes?.name || 'General';
      const tl         = q.time_limit ? `⏱ ${q.time_limit} min` : '';
      const totalMarks = (q.questions || []).reduce((s, qq) => s + (qq.marks || 1), 0);
      const passingPct = q.passing_score || 60;
      const passingMks = totalMarks > 0 ? Math.ceil((passingPct / 100) * totalMarks) : null;
      const pass       = passingMks ? `🎯 Pass: ${passingMks}/${totalMarks} marks` : `🎯 Pass: ${passingPct}%`;
      return `
        <button onclick="openQuizPreview(${q.id})"
          style="text-align:left;padding:15px 16px;border-radius:13px;border:1.5px solid ${col}33;border-top:2.5px solid ${col};background:${col}0d;cursor:pointer;font-family:inherit;width:100%;transition:all 0.18s;"
          onmouseover="this.style.background='${col}1a';this.style.transform='translateY(-2px)'"
          onmouseout="this.style.background='${col}0d';this.style.transform=''">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;border-radius:10px;background:${col}22;border:1px solid ${col}44;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">📝</div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;color:var(--text);font-size:0.96rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${q.title}</div>
              <div style="font-size:0.76rem;color:var(--muted);margin-top:3px;">📚 ${mod}${tl ? ' · ' + tl : ''} · ${pass}</div>
            </div>
            <span style="color:${col};font-size:1.1rem;flex-shrink:0;">→</span>
          </div>
        </button>`;
    }).join('');

  } catch(e) {
    loadEl.style.display = 'none';
    listEl.innerHTML = `<div style="color:#ef4444;text-align:center;padding:20px;font-size:0.83rem;">⚠️ Could not load quizzes: ${e.message}</div>`;
    _misQuizzesLoaded = false; // allow retry
  }
}

// ── Supabase Config ──
// ── Global Supabase header helpers (defined early — see initHistory block above) ──

/* ═══════════════════════════════════════════════════════════════════════════
   ACTIVITY TRACKING SYSTEM
   Tracks: login, logout, page views, card opens/closes, video watching
   Table: activity_logs
   Columns needed in Supabase:
     emp_id text, event_type text, event_detail text, session_id text,
     device text, page_name text, card_name text, duration_seconds int,
     video_title text, video_watch_seconds int, video_watch_percent int,
     file_name text, logout_at timestamptz, session_duration_seconds int,
     metadata jsonb, created_at timestamptz (default now())
═══════════════════════════════════════════════════════════════════════════ */

const _ACT_SESSION_ID = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2,9);
let _actEmpId    = null; // numeric Emp_id (FK) — fetched after login
let _actNameMap      = {};  // email (lowercase) → Employee_name cache
let _actEmpIdNameMap = {};  // numeric Emp_id → Employee_name cache

// Fetch Employee names from Employee_details using email list (for table display)
// Fetch Employee names using emp_id (numeric FK) — reliable since Email_Id
// in Employee_details may differ from the login email stored in activity_logs
async function _fetchEmpNames(rows) {
  // Collect unique numeric emp_ids not yet in cache
  const empIds = [...new Set(rows.map(r => r.emp_id).filter(id => id && typeof id === 'number'))];
  const needIds  = empIds.filter(id => !_actEmpIdNameMap[id]);

  // Also try Email_Id lookup for any rows that have employee_email
  const emails  = [...new Set(rows.map(r => (r.employee_email||'').toLowerCase()).filter(Boolean))];
  const needEmails = emails.filter(e => !_actNameMap[e]);

  const fetches = [];

  if (needIds.length) {
    const idFilter = needIds.join(',');
    fetches.push(
      fetch(`${SUPABASE_URL}/rest/v1/Employee_details?select=Emp_id,Employee_name,Email_Id&Emp_id=in.(${idFilter})`, { headers: SB_HDRS() })
        .then(r => r.ok ? r.json() : [])
        .then(arr => arr.forEach(r => {
          if (r.Emp_id) _actEmpIdNameMap[r.Emp_id] = r.Employee_name || '';
          // Also cache by email if available
          const em = (r.Email_Id || '').toLowerCase().trim();
          if (em && r.Employee_name) _actNameMap[em] = r.Employee_name;
        }))
        .catch(() => {})
    );
  }

  if (needEmails.length) {
    const orFilter = needEmails.map(e => `Email_Id.ilike.${encodeURIComponent(e)}`).join(',');
    fetches.push(
      fetch(`${SUPABASE_URL}/rest/v1/Employee_details?select=Email_Id,Employee_name&or=(${orFilter})`, { headers: SB_HDRS() })
        .then(r => r.ok ? r.json() : [])
        .then(arr => arr.forEach(r => {
          const key = (r.Email_Id || '').toLowerCase().trim();
          if (key && r.Employee_name) _actNameMap[key] = r.Employee_name;
        }))
        .catch(() => {})
    );
  }

  await Promise.all(fetches);
}

// Helper: get display name for a row (tries emp_id FK first, then email lookup)
function _getEmpDisplayName(row) {
  if (row.emp_id && _actEmpIdNameMap[row.emp_id]) return _actEmpIdNameMap[row.emp_id];
  const email = (row.employee_email || '').toLowerCase();
  if (email && _actNameMap[email]) return _actNameMap[email];
  if (row.employee?.Employee_name) return row.employee.Employee_name;
  return email ? email.split('@')[0] : '—';
}

// Fetch numeric Emp_id after login (emp_id column is now int FK)
async function _fetchAndCacheEmpId() {
  if (_actEmpId || !CURRENT_USER?.email) return;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/Employee_details?select=Emp_id&Email_Id=ilike.${encodeURIComponent(CURRENT_USER.email)}&limit=1`,
      { headers: SB_HDRS() }
    );
    if (res.ok) {
      const arr = await res.json();
      if (arr.length) {
        _actEmpId = arr[0].Emp_id;
        // CURRENT_USER mein bhi store karo taaki _canUploadQuiz use kar sake
        if (CURRENT_USER) CURRENT_USER.empId = _actEmpId;
        localStorage.setItem('aditiUser', JSON.stringify(CURRENT_USER));
      }
    }
  } catch(e) {}
}
let _actLoginTime     = Date.now();
let _actPageName      = 'home';
let _actPageStart     = Date.now();
let _actCardName      = null;
let _actCardStart     = null;
let _actVideoTitle    = null;
let _actVideoStart    = null;
let _actVideoEl       = null; // currently tracked <video> element

// Core logger — fire-and-forget, never disrupts UI
async function logActivity(data) {
  try {
    if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return;
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const fullPayload = {
      emp_id:                  _actEmpId || undefined,               // numeric FK (int)
      employee_email:          CURRENT_USER.email || null,           // new email column
      event_type:              data.event_type              || 'unknown',
      event_detail:            data.event_detail            || '',
      session_id:              _ACT_SESSION_ID,
      device:                  isMobile ? 'mobile' : 'desktop',
      page_name:               data.page_name               || _actPageName || '',
      card_name:               data.card_name               || null,
      duration_seconds:        data.duration_seconds        ?? null,
      video_title:             data.video_title             || null,
      video_watch_seconds:     data.video_watch_seconds     ?? null,
      video_watch_percent:     data.video_watch_percent     ?? null,
      file_name:               data.file_name               || null,
      logout_at:               data.logout_at               || null,
      session_duration_seconds:data.session_duration_seconds ?? null,
      metadata:                data.metadata || null
    };
    // Remove null/undefined values to avoid column errors
    Object.keys(fullPayload).forEach(k => { if (fullPayload[k] === null || fullPayload[k] === undefined) delete fullPayload[k]; });

    const hdrs = {
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${_currentToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };

    // Try full payload first
    const res = await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
      method: 'POST', headers: hdrs, body: JSON.stringify(fullPayload)
    });

    // Fallback to basic columns if new columns don't exist yet
    if (!res.ok) {
      const basicPayload = {
        emp_id:       fullPayload.emp_id || undefined,   // numeric FK
        employee_email: fullPayload.employee_email || undefined,
        event_type:   fullPayload.event_type,
        event_detail: [
          fullPayload.event_detail,
          fullPayload.page_name   ? 'page:'+fullPayload.page_name   : '',
          fullPayload.card_name   ? 'card:'+fullPayload.card_name   : '',
          fullPayload.video_title ? 'video:'+fullPayload.video_title : '',
          fullPayload.duration_seconds != null ? 'dur:'+fullPayload.duration_seconds+'s' : ''
        ].filter(Boolean).join(' | '),
        session_id: fullPayload.session_id,
        device:     fullPayload.device
      };
      fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
        method: 'POST', headers: hdrs, body: JSON.stringify(basicPayload)
      }).catch(()=>{});
    }
  } catch(e) { /* silent fail — never break UI */ }
}

// Called on every panel switch — logs previous page time, starts new page timer
function _actOnPageSwitch(newPage) {
  const secs = Math.round((Date.now() - _actPageStart) / 1000);
  if (_actPageName && secs > 30) { // Skip page_view under 30s — reduces noise
    logActivity({ event_type:'page_view', event_detail:`Visited: ${_actPageName}`, page_name:_actPageName, duration_seconds:secs });
  }
  _actPageName  = newPage;
  _actPageStart = Date.now();
  _actStopVideoTracking(); // stop video tracking on page leave
}

// Called when a card or overlay opens
function _actOnCardOpen(cardName) {
  _actOnCardClose();
  _actCardName  = cardName;
  _actCardStart = Date.now();
  // card_open not logged — generated too many rows
}

// Called when a card or overlay closes
function _actOnCardClose() {
  // card_close not logged — just reset state
  _actCardName  = null;
  _actCardStart = null;
}

// Attach video tracking to a <video> element
function _actTrackVideo(videoEl, title) {
  if (!videoEl) return;
  _actStopVideoTracking();
  _actVideoEl    = videoEl;
  _actVideoTitle = title || 'Unknown Video';
  _actVideoStart = null;

  const onPlay = () => {
    _actVideoStart = Date.now();
    logActivity({ event_type:'video_play', event_detail:`Playing: ${_actVideoTitle}`, video_title:_actVideoTitle });
  };
  const onPause = () => {
    // video_pause not logged — only track play and complete
    _actVideoStart = null;
  };
  const onEnded = () => {
    const secs = videoEl.duration ? Math.round(videoEl.duration) : null;
    logActivity({ event_type:'video_complete', event_detail:`Completed: ${_actVideoTitle}`,
                  video_title:_actVideoTitle, video_watch_seconds:secs, video_watch_percent:100 });
    _actVideoStart = null;
  };

  videoEl._actHandlers = { onPlay, onPause, onEnded };
  videoEl.addEventListener('play',  onPlay);
  videoEl.addEventListener('pause', onPause);
  videoEl.addEventListener('ended', onEnded);
}

// Detach video tracking from previous element
function _actStopVideoTracking() {
  if (!_actVideoEl) return;
  if (_actVideoEl._actHandlers) {
    _actVideoEl.removeEventListener('play',  _actVideoEl._actHandlers.onPlay);
    _actVideoEl.removeEventListener('pause', _actVideoEl._actHandlers.onPause);
    _actVideoEl.removeEventListener('ended', _actVideoEl._actHandlers.onEnded);
    delete _actVideoEl._actHandlers;
  }
  // Left-video pause not logged — reduces noise
  _actVideoStart = null;
  _actVideoEl    = null;
  _actVideoTitle = null;
  _actVideoStart = null;
}

// Log file open
function _actOnFileOpen(fileName, cardName) {
  logActivity({ event_type:'file_open', event_detail:`Opened file: ${fileName}`,
                card_name: cardName || _actCardName || '', file_name: fileName });
}

// Log before page unload (best effort)
window.addEventListener('beforeunload', () => {
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return;
  const totalSecs = Math.round((Date.now() - _actLoginTime) / 1000);
  _actStopVideoTracking();
  // sendBeacon can't send auth headers — use fetch with keepalive instead (RLS ke liye zaroori)
  fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
    method: 'POST',
    keepalive: true,
    headers: {
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${_currentToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      emp_id: CURRENT_USER.email || CURRENT_USER.name,
      event_type: 'page_unload', event_detail: 'Browser tab closed / navigated away',
      session_id: _ACT_SESSION_ID, device: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)?'mobile':'desktop',
      page_name: _actPageName, session_duration_seconds: totalSecs,
      logout_at: new Date().toISOString(), metadata: { unload: true }
    })
  }).catch(()=>{});
});

// ╔══════════════════════════════════════════════════════════════════════════
// ║  [CONTENT NODES SYSTEM] — Universal CMS for all department panels
// ║  Yeh system HR, Sales, After Sales, Products, IT Admin, Resources etc.
// ║  sab ke cards/files manage karta hai
// ║  Tables:
// ║    content_nodes : sections aur categories (id, name, type, parent_id)
// ║    files         : uploaded files (id, node_id FK, name, url)
// ║  CN object = central data store + loading logic
// ║  Naya section ya category add karna ho toh Supabase mein content_nodes
// ║  table mein row add karo — code automatically pick kar lega
// ╚══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// CONTENT NODES — Universal CMS (content_nodes + files tables)
// Tables:
//   content_nodes : id, name, type (section/category), parent_id
//   files         : id, node_id (FK → content_nodes.id), name, url
// ═══════════════════════════════════════════════════════════════════════════
const CN = {
  nodes: [],      // all content_nodes rows
  files: [],      // all files rows
  loaded: false,
  loading: false,
  callbacks: [],

  _hdrs() {
    return SB_HDRS();
  },

  // ── Flexible column getter ───────────────────────────────────────────
  _get(row, ...names) {
    const keys = Object.keys(row);
    for (const n of names) {
      const k = keys.find(k => k.toLowerCase() === n.toLowerCase());
      if (k !== undefined && row[k] !== null && row[k] !== undefined) return String(row[k]).trim();
    }
    return '';
  },

  // ── Fetch both tables ────────────────────────────────────────────────
  async load() {
    // ✅ Smart reset: agar pehle load empty aaya tha (anon token se) toh dobara fetch karo
    if (this.loaded && this.nodes.length === 0) {
      this.loaded = false;
    }
    if (this.loaded) return;
    if (this.loading) return new Promise(res => this.callbacks.push(res));
    this.loading = true;
    try {
      const [nodesRes, filesRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/content_nodes?select=*&order=id.asc`, { headers: this._hdrs() }),
        fetch(`${SUPABASE_URL}/rest/v1/files?select=*&order=id.asc`,         { headers: this._hdrs() })
      ]);
      if (!nodesRes.ok) throw new Error('content_nodes: HTTP ' + nodesRes.status);
      if (!filesRes.ok) throw new Error('files: HTTP ' + filesRes.status);
      this.nodes = await nodesRes.json();
      this.files = await filesRes.json();
      this.loaded = true;
    } catch(e) {
      throw e;
    } finally {
      this.loading = false;
      this.callbacks.splice(0).forEach(cb => cb());
    }
  },

  // ── Get all sections (type = section) ───────────────────────────────
  getSections() {
    return this.nodes.filter(n => (n.type || n.Type || '').toLowerCase() === 'section');
  },

  // ── Get a section by name (case-insensitive) ─────────────────────────
  getSection(name) {
    return this.nodes.find(n =>
      (n.type || n.Type || '').toLowerCase() === 'section' &&
      (n.name || n.Name || '').trim().toLowerCase() === name.trim().toLowerCase()
    );
  },

  // ── Get direct children categories of a parent id ───────────────────
  getCategories(parentId) {
    return this.nodes.filter(n => {
      const pid = n.parent_id !== undefined ? n.parent_id : n.Parent_id;
      return String(pid) === String(parentId);
    });
  },

  // ── Get files for a node id ──────────────────────────────────────────
  getFiles(nodeId) {
    return this.files.filter(f => {
      const nid = f.node_id !== undefined ? f.node_id
                : f.Node_id !== undefined ? f.Node_id
                : f.content_node_id !== undefined ? f.content_node_id
                : null;
      return String(nid) === String(nodeId);
    }).map(f => ({
      id:   f.id,
      name: this._get(f, 'name', 'title', 'file_name', 'Doc_Name') || 'Document',
      url:  this._get(f, 'file_url', 'url', 'link', 'Doc_Link', 'file_link')
    }));
  },

  // ── Node name → node obj ─────────────────────────────────────────────
  getNodeById(id) {
    return this.nodes.find(n => String(n.id) === String(id));
  },

  // ── All files count for a node (including children) ──────────────────
  totalFiles(nodeId) {
    const direct = this.getFiles(nodeId).length;
    const kids   = this.getCategories(nodeId).reduce((s, c) => s + this.getFiles(c.id).length, 0);
    return direct + kids;
  }
};

// ── Section colour themes ────────────────────────────────────────────────
const CN_SECTION_THEMES = {
  default: [
    { color:'#00d4ff', bg:'rgba(0,212,255,0.12)',  border:'rgba(0,212,255,0.3)'  },
    { color:'#f0a500', bg:'rgba(240,165,0,0.12)',  border:'rgba(240,165,0,0.3)'  },
    { color:'#00d4aa', bg:'rgba(0,212,170,0.12)',  border:'rgba(0,212,170,0.3)'  },
    { color:'#a855f7', bg:'rgba(168,85,247,0.12)', border:'rgba(168,85,247,0.3)' },
    { color:'#f97316', bg:'rgba(249,115,22,0.12)', border:'rgba(249,115,22,0.3)' },
    { color:'#e879f9', bg:'rgba(232,121,249,0.12)',border:'rgba(232,121,249,0.3)'},
    { color:'#22c55e', bg:'rgba(34,197,94,0.12)',  border:'rgba(34,197,94,0.3)'  },
    { color:'#0ea5e9', bg:'rgba(14,165,233,0.12)', border:'rgba(14,165,233,0.3)' },
  ]
};

function cnTheme(i) {
  const t = CN_SECTION_THEMES.default;
  return t[i % t.length];
}

// ── Generic category grid renderer ───────────────────────────────────────
// ── Role helper — sirf MIS ko manage karne ka haq hai ───────────────────
function _isMIS() {
  return PERMISSIONS.can_upload_files === 'true';
}

// Quiz admin access — email (Hemant & Krishna) + Emp_id (Pranali & Saajan Jain)
const _QUIZ_UPLOAD_EMAILS = [
  'mis@adititracking.com',   // Hemant
  'mis1@adititracking.com',  // Krishna
];
// Emp_id se access — Chirag (1), Hemant (2), Krishna (3), Pranali (15), Saajan Jain (19), Hetal (34), Savita (35)
const _QUIZ_UPLOAD_EMP_IDS = [1, 2, 3, 15, 19, 34, 35];

function _canUploadQuiz() {
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return false;
  return PERMISSIONS.can_upload_quiz === 'true';
}

// ── Card descriptions — naam se description milta hai ────────────────────
const CN_CARD_DESCRIPTIONS = {
  // ── HR ──
  'sop':                      'Standard Operating Procedures — step-by-step documented processes to ensure consistent and efficient operations.',
  'mediclaim':                'Employee health insurance documents — claim forms, policy details, coverage information and reimbursement guidelines.',
  'hr policy':                'Company HR policies — leave rules, attendance guidelines, code of conduct and employee benefits information.',
  'organization chart':       'Complete team structure of Aditi Tracking — departments, roles and reporting hierarchy across all offices.',
  'directory':                'Employee, Support & Vendor directories — contacts, roles and resources all in one place.',
  'branch office':            'Branch office details — location, contacts, team structure and operational information for all branches.',
  'holiday list':             'Company holiday calendar — upcoming holidays, branch-wise list and next holiday countdown.',

  // ── Sales ──
  'target audience':          'Customer profiles and segmentation — understand who to target, buyer personas and effective approach strategies.',
  'qualify leads':            'Lead qualification framework and SQL criteria — know when a prospect is truly ready to buy.',
  'sales pitch':              'Ready-to-use pitch scripts and presentation decks — present Aditi Tracking value proposition with confidence.',
  'objection handling':       'Common objections and proven responses — turn customer hesitations into opportunities and close more deals.',
  'intro and follow up':      'Introduction scripts and follow-up message templates — make the right first impression and stay top of mind.',
  'intro & follow-up':        'Introduction scripts and follow-up message templates — make the right first impression and stay top of mind.',

  // ── After Sales ──
  'api docs':                 'Technical API documentation — integration guides, endpoint references and developer resources for Aditi systems.',
  'hardware configuration':   'Hardware setup and configuration guides — device installation, calibration, troubleshooting and maintenance steps.',

  // ── Training ──
  'mis training':             'Management Information System training — reports, dashboards, data analysis and MIS workflows for the team.',
  'odoo training':            'Odoo ERP system training — modules, workflows, daily operations and best practices across all departments.',
  'pc training':              'Process Coordinator training — coordination workflows, closing procedures and client follow-up best practices.',
  'click task training':      'Click Task app training — task creation, assignments, tracking and completion workflows for field teams.',
  'cool bus training':        'Cool Bus operations training — booking management, customer service and operational procedures.',
  'smart fleet training':     'Smart Fleet monitoring training — GPS tracking, fleet operations, alerts and reporting dashboards.',
  'pre-sales training':       'Pre-Sales process training — lead handling, CRM pipeline management and opportunity conversion techniques.',

  // ── IT & Admin ──
  'company docs & certifications': 'ISO certificates, company registrations, GST, EPFO, ESIC, NSIC and all official government documents.',
  'company docs and certifications': 'ISO certificates, company registrations, GST, EPFO, ESIC, NSIC and all official government documents.',
  "nda's":                    'Non-Disclosure Agreements — confidential contracts with employees, clients and business partners.',
  'ndas':                     'Non-Disclosure Agreements — confidential contracts with employees, clients and business partners.',
  '2025 iso certificates':    'Latest ISO certification documents — quality management and compliance certificates valid for 2025.',
  'company docs':             'Core company documents — registrations, licences and official records.',
  'gst epfo esic certification': 'GST, EPFO & ESIC statutory compliance certificates and related government filings.',
  'nsic certificate 25-27':   'National Small Industries Corporation certificate — valid 2025 to 2027.',
  'prof tax & certificate':   'Professional tax registration and related compliance certificates.',

  // ── Finance ──
  'invoices':                 'Client and vendor invoices — billing records, payment status and invoice tracking.',
  'budgets':                  'Annual and quarterly budget documents — expense plans, allocations and financial targets.',
  'reports':                  'Financial reports — monthly P&L, balance sheets and expense summaries.',
  'expenses':                 'Company expense records — reimbursements, petty cash and department-wise spending.',

  // ── Compliance ──
  'legal':                    'Legal documents — contracts, agreements and regulatory compliance filings.',
  'licenses':                 'Company licences and permits — trade licences, operating permits and renewal records.',
  'audits':                   'Audit reports and compliance checklists — internal and external audit documentation.',

  // ── Referral ──
  'referral policy':          'Employee referral programme policy — eligibility, reward structure and referral submission process.',
  'referral forms':           'Referral submission forms and tracking sheets for the employee referral programme.',
};

// ── Get description for a card name (case-insensitive match) ──────────────
function getCNCardDesc(name) {
  const key = (name || '').trim().toLowerCase();
  if (CN_CARD_DESCRIPTIONS[key]) return CN_CARD_DESCRIPTIONS[key];
  // Partial match fallback
  for (const k of Object.keys(CN_CARD_DESCRIPTIONS)) {
    if (key.includes(k) || k.includes(key)) return CN_CARD_DESCRIPTIONS[k];
  }
  // Smart generic fallback based on keywords
  if (key.includes('training') || key.includes('video')) return `${name} training materials — videos, guides and learning resources for the team.`;
  if (key.includes('policy') || key.includes('policies')) return `${name} — guidelines, rules and procedures to follow.`;
  if (key.includes('report') || key.includes('mis')) return `${name} — reports, data and analysis documents.`;
  if (key.includes('form') || key.includes('template')) return `${name} — ready-to-use templates and forms.`;
  if (key.includes('doc') || key.includes('cert')) return `${name} — official documents and certificates.`;
  return `${name} — all related files, documents and resources in one place.`;
}

function cnRenderCatGrid(gridEl, categories, loadingEl, errorEl, overlayFn) {
  if (loadingEl) loadingEl.style.display = 'none';
  if (!categories.length) {
    if (errorEl) { errorEl.style.display='block'; errorEl.innerHTML='<div style="text-align:center;padding:32px 16px;color:var(--muted);">No categories found.</div>'; }
    return;
  }
  gridEl.innerHTML = categories.map((cat, i) => {
    const th    = cnTheme(i);
    const name  = cat.name || cat.Name || 'Category';
    const count = CN.totalFiles(cat.id);
    const safe  = name.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    const delBtn = _isMIS() ? `<button onclick="event.stopPropagation();confirmDeleteCard(${cat.id},'${safe}')" title="Delete card"
        style="position:absolute;top:10px;right:10px;z-index:3;width:28px;height:28px;border-radius:8px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;"
        onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.12)'">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
      </button>` : '';
    return `
    <div style="position:relative;">
      ${delBtn}
    <div class="home-card" style="--card-top:${th.color};cursor:pointer;"
         onclick="${overlayFn}(${cat.id}, '${safe}')"
         onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 36px rgba(0,0,0,0.3)';this.style.borderColor='${th.color}'"
         onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor=''">
      <div class="hc-icon" style="background:${th.bg};border-color:${th.border};color:${th.color};">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </div>
      <div class="hc-name">${name}</div>
      <div class="hc-desc" style="font-size:0.88rem;line-height:1.55;color:var(--muted);">${getCNCardDesc(name)}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;">
        <span class="hc-status live" style="background:${th.bg};color:${th.color};border:1px solid ${th.border};">📂 ${count} file${count===1?'':'s'}</span>
        <span style="font-size:0.78rem;font-weight:600;color:${th.color};">View →</span>
      </div>
    </div></div>`;
  }).join('');
  gridEl.style.display = 'grid';
}

// ── Generic file overlay opener ───────────────────────────────────────────
function cnOpenOverlay(nodeId, catName, overlayId, titleId, subId, gridId, loaderId, emptyId) {
  const i   = CN.nodes.indexOf(CN.getNodeById(nodeId));
  const th  = cnTheme(Math.max(0, i) % 8);

  document.getElementById(titleId).textContent   = catName;
  if (loaderId) document.getElementById(loaderId).style.display = 'none';
  document.getElementById(emptyId).style.display  = 'none';
  document.getElementById(overlayId).style.display = 'block';
  document.body.style.overflow = 'hidden';

  _cnRenderOverlayContent(nodeId, catName, th, gridId, subId, emptyId, null);
}

// ── Render overlay content: sub-cards + files ────────────────────────────
function _cnRenderOverlayContent(nodeId, catName, th, gridId, subId, emptyId, parentInfo) {
  const subCards = CN.getCategories(nodeId);
  const files    = CN.getFiles(nodeId);
  const grid     = document.getElementById(gridId);
  const subEl    = document.getElementById(subId);

  const totalItems = subCards.length + files.length;
  subEl.textContent = (subCards.length ? subCards.length + ' sub-card' + (subCards.length>1?'s':'') + (files.length?' · ':'') : '') +
                      (files.length ? files.length + ' file' + (files.length>1?'s':'') : '') ||
                      '0 items';

  // Update video count badge in the split overlay header
  const vcEl = document.getElementById('mktVideoCount');
  if (vcEl) vcEl.textContent = totalItems ? `${totalItems} item${totalItems>1?'s':''}` : '';
  // Hide loader
  const loaderEl = document.getElementById('mktOverlayLoader');
  if (loaderEl) loaderEl.style.display = 'none';

  if (!totalItems) {
    document.getElementById(emptyId).style.display = 'block';
    grid.innerHTML = parentInfo ? `<div style="grid-column:1/-1;margin-bottom:8px;">
      <button onclick="_cnNavBack_${gridId}()" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:7px 14px;border-radius:8px;cursor:pointer;font-size:0.83rem;font-weight:600;font-family:inherit;">← Back</button>
    </div>` : '';
    return;
  }

  // Back button if navigated into a sub-card
  const backBtn = parentInfo ? `<div style="grid-column:1/-1;margin-bottom:8px;">
    <button onclick="_cnNavBack_${gridId}()" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:7px 14px;border-radius:8px;cursor:pointer;font-size:0.83rem;font-weight:600;font-family:inherit;">← Back to ${parentInfo.name}</button>
  </div>` : '';

  // Sub-card tiles
  const subCardHtml = subCards.map((sc, si) => {
    const scTh    = cnTheme(si);
    const scName  = sc.name || sc.Name || 'Sub-card';
    const scCount = CN.totalFiles(sc.id);
    const scSafe  = scName.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    return `
    <div style="position:relative;">
      ${_isMIS() ? `<button onclick="event.stopPropagation();confirmDeleteCard(${sc.id},'${scSafe}')" title="Delete sub-card"
        style="position:absolute;top:8px;right:8px;z-index:3;width:24px;height:24px;border-radius:6px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;"
        onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.12)'">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
      </button>` : ''}
      <div onclick="_cnDrillDown_${gridId}(${sc.id},'${scSafe}',${nodeId},'${catName.replace(/'/g,"\\'")}')"
        style="background:var(--surface2);border:1.5px solid ${scTh.border};border-left:4px solid ${scTh.color};border-radius:12px;padding:14px 14px 14px 16px;cursor:pointer;transition:all 0.18s;display:flex;align-items:center;gap:12px;"
        onmouseover="this.style.background='${scTh.bg}';this.style.borderColor='${scTh.color}'"
        onmouseout="this.style.background='var(--surface2)';this.style.borderColor='${scTh.border}'">
        <div style="width:38px;height:38px;min-width:38px;border-radius:10px;background:${scTh.bg};border:1px solid ${scTh.border};display:flex;align-items:center;justify-content:center;color:${scTh.color};">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.93rem;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${scName}</div>
          <div style="font-size:0.78rem;color:var(--muted);margin-top:2px;">📂 ${scCount} file${scCount===1?'':'s'}</div>
        </div>
        <span style="color:${scTh.color};font-weight:700;font-size:1rem;flex-shrink:0;">→</span>
      </div>
    </div>`;
  }).join('');

  // Direct files
  const filesHtml = files.map(f => renderOverlayCard(f.name, f.url, th, f.id)).join('');

  // Section label if both sub-cards and files exist
  const subLabel  = subCards.length ? `<div style="grid-column:1/-1;font-size:0.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">📂 Sub-Cards</div>` : '';
  const fileLabel = (subCards.length && files.length) ? `<div style="grid-column:1/-1;font-size:0.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-top:8px;margin-bottom:2px;">📄 Files</div>` : '';

  grid.innerHTML = backBtn + subLabel + subCardHtml + fileLabel + filesHtml;

  // Attach drill-down and back functions dynamically
  window[`_cnDrillDown_${gridId}`] = function(scId, scName, parentId, parentName) {
    // training_submodule_open removed — module_open is sufficient
    const scTh = cnTheme(subCards.findIndex(s => s.id === scId) % 8);
    _cnRenderOverlayContent(scId, scName, scTh, gridId, subId, emptyId, {id: parentId, name: parentName});
  };
  // Back: if parentInfo exists go UP to the parent node, else stay at top
  window[`_cnNavBack_${gridId}`] = function() {
    if (parentInfo) {
      // parentInfo is {id, name} of the card that contains the current sub-cards
      // Going back means rendering parentInfo's node with NO further parentInfo (top level)
      _cnRenderOverlayContent(parentInfo.id, parentInfo.name, th, gridId, subId, emptyId, null);
    } else {
      _cnRenderOverlayContent(nodeId, catName, th, gridId, subId, emptyId, null);
    }
  };
}



// ═══════════════════════════════════════════════════════════
// EMPLOYEE PROFILE PHOTO — Supabase Employee_details
// Employee_name se match karo, photo home page pe dikhao
// ═══════════════════════════════════════════════════════════
async function fetchUserProfilePhoto() {
  const banner  = document.getElementById('empProfileBanner');
  const photoEl = document.getElementById('empPhotoContainer');
  const nameEl  = document.getElementById('empProfileName');
  const deptEl  = document.getElementById('empProfileDept');
  const hintEl  = document.getElementById('empNoPhotoHint');
  if (!banner || !CURRENT_USER) return;

  // Banner show karo (loading state ke saath)
  banner.style.display = 'flex';

  // User ka naam Supabase format mein
  const userName = (CURRENT_USER.name || '').trim();
  const userEmail = String(CURRENT_USER.email || '').trim();
  if (!userName) return;

  try {
    // Step 1 – Email_Id se filter karo (most reliable — email unique hota hai)
    let row = null;
    const _hdrs = SB_HDRS();

    if (userEmail) {
      const urlE = `${SUPABASE_URL}/rest/v1/Employee_details?select=*&Email_Id=ilike.${encodeURIComponent(userEmail)}&limit=1`;
      const resE = await fetch(urlE, { headers: _hdrs });
      const dataE = await resE.json();
      if (Array.isArray(dataE) && dataE.length > 0) row = dataE[0];
    }

    // Step 2 – Email se nahi mila toh Employee_name se try karo (case-insensitive)
    if (!row) {
      const encodedName = encodeURIComponent(userName);
      const url = `${SUPABASE_URL}/rest/v1/Employee_details?select=*&Employee_name=ilike.${encodedName}&limit=1`;
      const res = await fetch(url, { headers: _hdrs });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) row = data[0];
    }

    // Name aur dept fill karo (DB se mila toh DB ka naam, warna login wala)
    nameEl.textContent = (row && row['Employee_name']) ? row['Employee_name'] : userName;
    const dept = row ? (row['Employee_Dept'] || CURRENT_USER.rawRole || 'Employee') : (CURRENT_USER.rawRole || 'Employee');
    deptEl.textContent = '🏢 ' + dept.charAt(0).toUpperCase() + dept.slice(1);

    if (row && (row['avatar_url'] || row['Link'])) {
      // Photo mili — img tag banao
      const photoUrl = row['avatar_url'] || row['Link'];
      const img = document.createElement('img');
      img.src = photoUrl;
      img.alt = userName;
      img.style.cssText = 'width:90px;height:90px;object-fit:cover;border-radius:50%;';
      img.onerror = function() {
        // URL broken hai — silently initials placeholder dikhao, error message nahi
        const wrap = this.closest('.emp-photo-wrap');
        const placeholder = document.createElement('div');
        placeholder.className = 'emp-photo-placeholder';
        placeholder.textContent = (userName || 'U')[0].toUpperCase();
        if (wrap) { wrap.innerHTML = ''; wrap.appendChild(placeholder); }
        else { _showPhotoPlaceholder(photoEl, userName); }
        hintEl.style.display = 'none';
      };
      // Replace loading div with actual photo
      const wrap = document.createElement('div');
      wrap.className = 'emp-photo-wrap';
      wrap.appendChild(img);
      photoEl.replaceWith(wrap);
      hintEl.style.display = 'none';
    } else {
      // Koi photo nahi mili — naam ka pehla letter dikhao
      _showPhotoPlaceholder(photoEl, userName);
      hintEl.style.display = 'block';
    }

  } catch (err) {
    _showPhotoPlaceholder(photoEl, userName);
    nameEl.textContent = userName;
    deptEl.textContent = '🏢 ' + (CURRENT_USER.rawRole || 'Employee').charAt(0).toUpperCase() + (CURRENT_USER.rawRole || 'Employee').slice(1);
  }
}

function _showPhotoPlaceholder(el, name) {
  const placeholder = document.createElement('div');
  placeholder.className = 'emp-photo-placeholder';
  placeholder.textContent = (name || 'U')[0].toUpperCase();
  el.replaceWith(placeholder);
}

// ═══════════════════════════════════════════════════════════
// SPOTLIGHT OF THE MONTH — Soloni Raut (Support)
// ═══════════════════════════════════════════════════════════
const POTM_NAMES = ['Soloni Raut']; // kept for any reference, not used below



async function loadPerformers() {
  const slot = document.getElementById('soloni-img-slot');
  if (!slot) return;
  try {
    const url = `${SUPABASE_URL}/rest/v1/Employee_details?select=avatar_url,Link&Emp_id=eq.7&limit=1`;
    const res = await fetch(url, { headers: SB_HDRS() });
    const rows = await res.json();
    const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
    const link = row ? (row['avatar_url'] || row['Link']) : null;
    if (link) {
      const img = document.createElement('img');
      img.className = 'potm-photo';
      img.alt = 'Soloni Raut';
      img.src = link;
      img.onerror = function() {
        const av = document.createElement('div');
        av.className = 'potm-avatar';
        av.textContent = 'S';
        img.replaceWith(av);
      };
      slot.replaceWith(img);
    } else {
      const av = document.createElement('div');
      av.className = 'potm-avatar';
      av.textContent = 'S';
      slot.replaceWith(av);
    }
  } catch(e) {
    const av = document.createElement('div');
    av.className = 'potm-avatar';
    av.textContent = 'S';
    if (slot) slot.replaceWith(av);
  }
}

// ═══════════════════════════════════════════════════════════
// NEW JOINERS — Emp_id 66 to 77
// ═══════════════════════════════════════════════════════════
async function loadNewJoiners() {
  const grid = document.getElementById('newJoinersGrid');
  if (!grid) return;
  try {
    const url = `${SUPABASE_URL}/rest/v1/Employee_details?select=Emp_id,Employee_name,Employee_Dept,Location,avatar_url,Link&Emp_id=gte.66&Emp_id=lte.77&order=Emp_id.asc`;
    const res = await fetch(url, { headers: SB_HDRS() });
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      grid.innerHTML = '<div style="color:var(--muted);font-size:0.84rem;padding:10px 0;">No new joiners to show right now.</div>';
      return;
    }
    grid.innerHTML = '';
    rows.forEach(row => {
      const name = row['Employee_name'] || 'New Joiner';
      const dept = row['Employee_Dept'] || '';
      const loc = row['Location'] || '';
      const photo = row['avatar_url'] || row['Link'] || null;
      const initial = (name || 'N')[0].toUpperCase();

      const card = document.createElement('div');
      card.className = 'potm-card nj-card';

      const bar = document.createElement('div');
      bar.className = 'potm-card-bar';
      bar.style.background = '#00d4aa';
      bar.style.opacity = '0.8';
      card.appendChild(bar);

      if (photo) {
        const img = document.createElement('img');
        img.className = 'potm-photo';
        img.alt = name;
        img.src = photo;
        img.onerror = function() {
          const av = document.createElement('div');
          av.className = 'potm-avatar';
          av.textContent = initial;
          img.replaceWith(av);
        };
        card.appendChild(img);
      } else {
        const av = document.createElement('div');
        av.className = 'potm-avatar';
        av.textContent = initial;
        card.appendChild(av);
      }

      const nameEl = document.createElement('div');
      nameEl.className = 'potm-name';
      nameEl.textContent = name;
      card.appendChild(nameEl);

      if (dept) {
        const deptEl = document.createElement('div');
        deptEl.className = 'potm-dept';
        deptEl.style.background = 'rgba(0,212,170,0.12)';
        deptEl.style.color = '#00d4aa';
        deptEl.style.border = '1px solid rgba(0,212,170,0.3)';
        deptEl.textContent = '🏢 ' + dept;
        card.appendChild(deptEl);
      }

      if (loc) {
        const locEl = document.createElement('div');
        locEl.className = 'potm-location';
        locEl.textContent = '📍 ' + loc;
        card.appendChild(locEl);
      }

      grid.appendChild(card);
    });
  } catch(e) {
    grid.innerHTML = '<div style="color:var(--muted);font-size:0.84rem;padding:10px 0;">Couldn\'t load new joiners.</div>';
  }
}


// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// AFTER SALES PANEL — Supabase After_Sales table
// ═══════════════════════════════════════════════════════════
let afterSalesLoaded = false;
let afterSalesData   = [];

const AS_CAT_COLORS = [
  { color:'#22c55e', bg:'rgba(34,197,94,0.12)',  border:'rgba(34,197,94,0.3)',
    icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
    desc:'Step-by-step hardware setup guides and configuration docs for all Aditi Tracking devices.' },
  { color:'#f0a500', bg:'rgba(240,165,0,0.12)',  border:'rgba(240,165,0,0.3)',
    icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    desc:'After sales documentation and support resources.' },
  { color:'#4e9af1', bg:'rgba(78,154,241,0.12)', border:'rgba(78,154,241,0.3)',
    icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
    desc:'After sales support and service resources.' },
  { color:'#a855f7', bg:'rgba(168,85,247,0.12)', border:'rgba(168,85,247,0.3)',
    icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    desc:'After sales resources.' },
];


// ═══════════════════════════════════════════════════════════════
// HR SECTION — Dynamic cards from content_nodes
// ═══════════════════════════════════════════════════════════════
let hrSectionLoaded = false;

async function loadHRSection() {
  if (hrSectionLoaded) return;
  const loadEl = document.getElementById('hr-loading');
  const gridEl = document.getElementById('hr-doc-grid');
  try {
    await CN.load();
    const hrSection = CN.getSection('HR');
    if (!hrSection) { if (loadEl) loadEl.style.display='none'; return; }

    // Get all direct children of HR section
    const cats = CN.getCategories(hrSection.id);

    // Special cards handled separately — skip them from dynamic render
    const SPECIAL = ['organization chart', 'directory', 'holiday list', 'branch office'];
    const docCats = cats.filter(c => !SPECIAL.includes((c.name||'').toLowerCase().trim()));

    if (loadEl) loadEl.style.display = 'none';

    // Known HR doc cards → shown ABOVE special cards (Org Chart, Directory, Holiday List)
    // Any NEW card added later → shown BELOW special cards (after Holiday List)
    const KNOWN_FIRST = ['sop', 'mediclaim', 'hr policy'];
    const knownCats = docCats.filter(c => KNOWN_FIRST.includes((c.name||'').toLowerCase().trim()));
    const newCats   = docCats.filter(c => !KNOWN_FIRST.includes((c.name||'').toLowerCase().trim()));

    const specialGrid = document.getElementById('hr-special-grid');
    const specialHTML = specialGrid ? specialGrid.innerHTML : '';

    // Order: [SOP, Mediclaim, HR Policy] → [Org Chart, Directory, Holiday List] → [new cards]
    const renderCatCards = (list, indexOffset) => list.map((cat, i) => {
      const th    = cnTheme(i + indexOffset);
      const name  = cat.name || 'Category';
      const count = CN.totalFiles(cat.id);
      const safe  = name.replace(/'/g, "\'").replace(/"/g, '&quot;');
      return `
      <div style="position:relative;">
        ${_isMIS() ? `        <button onclick="event.stopPropagation();confirmDeleteCard(${cat.id},'${safe}')" title="Delete card"
          style="position:absolute;top:10px;right:10px;z-index:3;width:28px;height:28px;border-radius:8px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;"
          onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.12)'">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>` : ''}
        <div onclick="openHRDocsOverlay('${safe}')" style="height:100%;display:flex;cursor:pointer;">
        <div class="home-card" style="--card-top:${th.color};cursor:pointer;padding:1.5rem;width:100%;">
          <div class="hc-icon" style="background:${th.bg};border-color:${th.border};width:52px;height:52px;border-radius:14px;margin-bottom:16px;color:${th.color};">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div class="hc-name" style="font-size:1.12rem;">${name}</div>
          <div class="hc-desc" style="font-size:0.91rem;line-height:1.6;color:var(--muted);">${getCNCardDesc(name)}</div>
          <div style="margin-top:14px;">
            <span style="font-size:0.82rem;font-weight:600;color:${th.color};background:${th.bg};border:1px solid ${th.border};padding:4px 12px;border-radius:20px;">📂 ${count} file${count===1?'':'s'}</span>
          </div>
        </div>
        </div>
      </div>`;
    }).join('');

    if (!knownCats.length && !newCats.length) { gridEl.style.display = 'none'; return; }

    gridEl.innerHTML = renderCatCards(knownCats, 0) + specialHTML + renderCatCards(newCats, knownCats.length);

    if (specialGrid) specialGrid.style.display = 'none';

    gridEl.style.display = 'grid';
    hrSectionLoaded = true;
    // Inject delete buttons on special cards (now inside hr-doc-grid)
    injectDeleteBtns('HR', gridEl);
  } catch(e) {
    if (loadEl) loadEl.style.display = 'none';
  }
}

async function loadAfterSales() {
  if (afterSalesLoaded) return;
  const loading = document.getElementById('aftersales-loading');
  const errEl   = document.getElementById('aftersales-error');
  const grid    = document.getElementById('aftersales-cat-grid');
  if (loading) loading.style.display = 'block';
  try {
    await CN.load();
    const section = CN.getSection('After Sales');
    if (!section) throw new Error('After Sales section not found in content_nodes');
    const cats = CN.getCategories(section.id);
    afterSalesLoaded = true;
    cnRenderCatGrid(grid, cats, loading, errEl, 'cnOpenAfterSalesOverlay');
  } catch(e) {
    if (loading) loading.style.display = 'none';
    if (errEl)   { errEl.style.display = 'block'; errEl.innerHTML = '<div style="text-align:center;padding:32px 16px;color:var(--muted);">⚠️ ' + e.message + '</div>'; }
  }
}

function cnOpenAfterSalesOverlay(nodeId, catName) {
  cnOpenOverlay(nodeId, catName, 'afterSalesOverlay', 'asOverlayTitle', 'asOverlaySub',
                'asOverlayGrid', 'asOverlayLoader', 'asOverlayEmpty');
}

function renderAfterSalesCats() {
  document.getElementById('aftersales-loading').style.display = 'none';
  if (!afterSalesData || !afterSalesData.length) {
    document.getElementById('aftersales-error').style.display = 'block';
    document.getElementById('aftersales-error-msg').textContent = 'No data found.';
    return;
  }
  const cats = {};
  afterSalesData.forEach(row => {
    const cat = (row.Category || 'General').trim();
    if (!cats[cat]) cats[cat] = [];
    cats[cat].push(row);
  });
  const catNames = Object.keys(cats);
  const grid = document.getElementById('aftersales-cat-grid');
  grid.innerHTML = catNames.map((cat, i) => {
    const th    = AS_CAT_COLORS[i % AS_CAT_COLORS.length];
    const count = cats[cat].length;
    const safecat = cat.replace(/'/g,"\\'");
    return `
    <div class="home-card" style="--card-top:${th.color};cursor:pointer;"
         onclick="openAfterSalesOverlay('${safecat}')">
      <div class="hc-icon" style="background:${th.bg};border-color:${th.border};color:${th.color};">${th.icon}</div>
      <div class="hc-name">${cat}</div>
      <div class="hc-desc">${th.desc}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;">
        <span class="hc-status live" style="background:${th.bg};color:${th.color};border:1px solid ${th.border};">📂 ${count} file${count===1?'':'s'}</span>
        <span style="font-size:0.78rem;font-weight:600;color:${th.color};">View →</span>
      </div>
    </div>`;
  }).join('');
  grid.style.display = 'grid';
}

function openAfterSalesOverlay(cat) {
  const items = afterSalesData.filter(r => (r.Category||'General').trim() === cat);
  const i     = Object.keys(afterSalesData.reduce((a,r)=>{a[(r.Category||'General').trim()]=1;return a;},{})).indexOf(cat);
  const th    = AS_CAT_COLORS[Math.max(0,i) % AS_CAT_COLORS.length];
  document.getElementById('asOverlayTitle').textContent  = cat;
  document.getElementById('asOverlaySub').textContent    = items.length + ' file' + (items.length===1?'':'s');
  document.getElementById('asCatIcon').style.background  = th.bg;
  document.getElementById('asCatIcon').style.border      = '1px solid ' + th.border;
  document.getElementById('asCatIcon').innerHTML         = `<span style="color:${th.color}">${th.icon}</span>`;
  document.getElementById('asOverlayLoader').style.display = 'none';
  document.getElementById('asOverlayEmpty').style.display  = 'none';
  document.getElementById('afterSalesOverlay').style.display = 'block';
  document.body.style.overflow = 'hidden';
  const grid = document.getElementById('asOverlayGrid');
  if (!items.length) { document.getElementById('asOverlayEmpty').style.display='block'; grid.innerHTML=''; return; }
  grid.innerHTML = items.map(row => {
    const module = (row.Module || 'Document').trim();
    const link   = (row.Link   || '').trim();
    return renderOverlayCard(module, link, th);
  }).join('');
}

function closeAfterSalesOverlay() {
  document.getElementById('afterSalesOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

// ═══════════════════════════════════════════════════════════
// SHARED OVERLAY CARD RENDERER — used by HR, Sales, After Sales
// ═══════════════════════════════════════════════════════════
function renderOverlayCard(name, link, th, fileId, nodeId) {
  const ext   = (link||'').split('?')[0].split('.').pop().toLowerCase();
  const isYt  = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/.test(link||'');
  const ytId  = isYt ? (link||'').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)?.[1] : null;
  const isVid = ['mp4','webm','mov'].includes(ext);
  const isPdf = ext === 'pdf';
  const label = isYt ? '▶ YouTube' : isVid ? '🎬 Video' : isPdf ? '📄 PDF' : '📁 Open';
  const fileIcon = isYt
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="#ff0000"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/></svg>`
    : isVid
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`
    : isPdf
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;

  const safeLink = (link||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');
  const safeName = (name||'Document').replace(/'/g,"\\'").replace(/"/g,'&quot;');
  const delFileBtn = (fileId && _isMIS()) ? `<button onclick="event.stopPropagation();event.preventDefault();confirmDeleteFile(${fileId},'${safeLink}')" title="Delete file"
    style="position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:8px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2;transition:all 0.18s;"
    onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.12)'">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
  </button>` : '';

  // YouTube card — show thumbnail prominently
  if (isYt && ytId) {
    return `
    <div style="position:relative;display:flex;flex-direction:column;" data-file-id="${fileId||''}">
      ${delFileBtn}
      <div onclick="openFileViewer('${safeLink}','${safeName}')" style="cursor:pointer;border-radius:16px;overflow:hidden;border:1.5px solid var(--border);border-top:3px solid #ff0000;transition:all 0.22s;background:var(--surface2);"
        onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 10px 30px rgba(0,0,0,0.22)';this.style.borderColor='#ff0000'"
        onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor=''">
        <div style="position:relative;">
          <img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" alt="${name}" style="width:100%;display:block;aspect-ratio:16/9;object-fit:cover;" onerror="this.style.display='none'"/>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
            <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,0,0,0.88);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.4);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="6 4 20 12 6 20 6 4"/></svg>
            </div>
          </div>
        </div>
        <div style="padding:12px 14px;">
          <div style="font-size:0.87rem;font-weight:700;color:var(--text);line-height:1.4;margin-bottom:8px;">${name}</div>
          <span style="font-size:0.70rem;font-weight:700;padding:3px 10px;border-radius:20px;background:rgba(255,0,0,0.1);color:#ff4444;border:1px solid rgba(255,0,0,0.25);">▶ YouTube</span>
        </div>
      </div>
    </div>`;
  }

  return `
  <div style="position:relative;display:flex;flex-direction:column;" data-file-id="${fileId||''}">
    ${delFileBtn}
    <a href="${link}" onclick="openFileViewer('${safeLink}','${safeName}');return false;" style="text-decoration:none;display:flex;cursor:pointer;">
      <div style="background:var(--surface2);border:1.5px solid var(--border);border-radius:16px;
                  padding:20px 16px;cursor:pointer;transition:all 0.22s;
                  border-top:3px solid ${th.color};
                  display:flex;flex-direction:column;width:100%;min-height:148px;"
           onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 10px 30px rgba(0,0,0,0.22)';this.style.borderColor='${th.color}'"
           onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor=''">
        <div style="width:42px;height:42px;border-radius:11px;background:${th.bg};border:1px solid ${th.border};
                    display:flex;align-items:center;justify-content:center;margin-bottom:14px;
                    flex-shrink:0;color:${th.color};">${fileIcon}</div>
        <div style="font-size:0.87rem;font-weight:700;color:var(--text);line-height:1.45;
                    flex:1;margin-bottom:14px;">${name}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;">
          <span style="font-size:0.70rem;font-weight:700;padding:4px 11px;border-radius:20px;
                       background:${th.bg};color:${th.color};border:1px solid ${th.border};">${label}</span>
          <span style="font-size:0.78rem;font-weight:600;color:${th.color};">↗</span>
        </div>
      </div>
    </a>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// HR DOCS OVERLAY — Supabase Documents table (SOP / HR Policy)
// ═══════════════════════════════════════════════════════════
let hrDocsCache = {};

const HR_DOC_THEMES = {
  'SOP':       { color:'#00d4ff', bg:'rgba(0,212,255,0.12)',  border:'rgba(0,212,255,0.3)',
    icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>` },
  'HR Policy': { color:'#f0a500', bg:'rgba(240,165,0,0.12)',  border:'rgba(240,165,0,0.3)',
    icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>` },
  'Mediclaim': { color:'#ef4444', bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.3)',
    icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-8-4.5-8-11.5a5.5 5.5 0 0111-1 5.5 5.5 0 0111 1c0 7-8 11.5-8 11.5"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/></svg>` },
  'Employee Dir': { color:'#06b6d4', bg:'rgba(6,182,212,0.12)', border:'rgba(6,182,212,0.3)',
    icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` },
  'Support Dir': { color:'#0ea5e9', bg:'rgba(14,165,233,0.12)', border:'rgba(14,165,233,0.3)',
    icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.02 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>` },
  'Vendor Dir': { color:'#8b5cf6', bg:'rgba(139,92,246,0.12)', border:'rgba(139,92,246,0.3)',
    icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>` },
};

async function openHRDocsOverlay(module) {
  _actOnCardOpen(module); // ACTIVITY TRACKING
  const th = HR_DOC_THEMES[module] || HR_DOC_THEMES['SOP'];
  document.getElementById('hrDocsTitle').textContent  = module;
  document.getElementById('hrDocsSub').textContent    = '';
  document.getElementById('hrDocsIcon').style.background = th.bg;
  document.getElementById('hrDocsIcon').style.border     = '1px solid ' + th.border;
  document.getElementById('hrDocsIcon').innerHTML        = `<span style="color:${th.color}">${th.icon}</span>`;
  document.getElementById('hrDocsLoader').style.display  = 'block';
  document.getElementById('hrDocsGrid').innerHTML        = '';
  document.getElementById('hrDocsEmpty').style.display   = 'none';
  document.getElementById('hrDocsOverlay').style.display = 'block';

  // Show upload section only for Mediclaim
  const uploadSec = document.getElementById('hrDocsUploadSection');
  if (uploadSec) {
    uploadSec.style.display = (module === 'Mediclaim') ? 'block' : 'none';
    document.getElementById('hrDocsUploadStatus').style.display = 'none';
    document.getElementById('hrDocsFileInput').value = '';
  }

  try {
    await CN.load();
    const hrSection = CN.getSection('HR');
    let node = null;
    if (hrSection) {
      const cats = CN.getCategories(hrSection.id);
      node = cats.find(c => (c.name||'').trim().toLowerCase() === module.trim().toLowerCase());
      if (!node) {
        for (const cat of cats) {
          const sub = CN.getCategories(cat.id).find(s => (s.name||'').trim().toLowerCase() === module.trim().toLowerCase());
          if (sub) { node = sub; break; }
        }
      }
    }

    document.getElementById('hrDocsLoader').style.display = 'none';

    if (!node) {
      document.getElementById('hrDocsEmpty').style.display = 'block';
      return;
    }

    // Use shared renderer — handles sub-cards + direct files
    _cnRenderOverlayContent(
      node.id, module, th,
      'hrDocsGrid', 'hrDocsSub', 'hrDocsEmpty', null
    );

  } catch(e) {
    document.getElementById('hrDocsLoader').style.display = 'none';
    document.getElementById('hrDocsEmpty').style.display  = 'block';
    document.getElementById('hrDocsEmpty').textContent    = 'Failed to load: ' + e.message;
  }
}

function renderHRDocs(items, th, module) {
  document.getElementById('hrDocsLoader').style.display = 'none';
  document.getElementById('hrDocsSub').textContent = items.length + ' file' + (items.length===1?'':'s');
  if (!items.length) { document.getElementById('hrDocsEmpty').style.display='block'; return; }
  const grid = document.getElementById('hrDocsGrid');
  grid.innerHTML = items.map(row => {
    const name  = (row.Doc_Name || row.name || 'Document').trim();
    const link  = (row.Doc_Link || row.url  || '').trim();
    const fid   = row.id || row.fileId || undefined;
    return renderOverlayCard(name, link, th, fid);
  }).join('');
}

function closeHRDocsOverlay() {
  _actOnCardClose(); // ACTIVITY TRACKING
  document.getElementById('hrDocsOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

// ═══════════════════════════════════════════════════════════
// MEDICLAIM UPLOAD — HR can upload files directly
// ═══════════════════════════════════════════════════════════
const MEDICLAIM_UPLOAD_PASSWORD = 'hr@aditi2026';  // Change this to your preferred password
const MEDICLAIM_BUCKET = 'Documents';
const MEDICLAIM_FOLDER = 'Mediclaim';

function triggerMediclaimUpload() {
  alert('Mediclaim upload is being migrated to the new system. Coming soon!');
  return;
  // --- original code below (disabled) ---
  // Password gate
  const pwd = prompt('Enter HR password to upload:');
  if (pwd === null) return;  // User cancelled
  if (pwd !== MEDICLAIM_UPLOAD_PASSWORD) {
    alert('Incorrect password. Upload cancelled.');
    return;
  }
  // Trigger file picker
  document.getElementById('hrDocsFileInput').click();
}

// Wire up file input change handler after DOM ready
document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById('hrDocsFileInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleMediclaimFileSelected);
  }
});
// Also bind immediately in case DOMContentLoaded already fired
(function() {
  const fileInput = document.getElementById('hrDocsFileInput');
  if (fileInput && !fileInput._mediclaimBound) {
    fileInput.addEventListener('change', handleMediclaimFileSelected);
    fileInput._mediclaimBound = true;
  }
})();

async function handleMediclaimFileSelected(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('hrDocsUploadStatus');
  const uploadBtn = document.getElementById('hrDocsUploadBtn');
  const setStatus = (msg, color) => {
    statusEl.style.display = 'block';
    statusEl.style.color = color || 'var(--muted)';
    statusEl.textContent = msg;
  };

  // Ask for display name (default = file name without extension)
  const defaultName = file.name.replace(/\.[^.]+$/, '');
  const displayName = prompt('Display name for this document:', defaultName);
  if (displayName === null || !displayName.trim()) {
    e.target.value = '';
    return;
  }

  try {
    uploadBtn.disabled = true;
    uploadBtn.style.opacity = '0.6';
    uploadBtn.style.cursor = 'wait';
    setStatus('⏳ Uploading file…', '#f0a500');

    // 1. Build unique storage path: Mediclaim/<timestamp>_<filename>
    const ts = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${MEDICLAIM_FOLDER}/${ts}_${safeName}`;

    // 2. Upload file to Supabase Storage
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${MEDICLAIM_BUCKET}/${encodeURIComponent(storagePath)}`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${_currentToken}`,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'false'
      },
      body: file
    });
    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '');
      throw new Error('Storage upload fail: HTTP ' + uploadRes.status + (errText ? ' — ' + errText.slice(0, 200) : ''));
    }

    // 3. Build public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${MEDICLAIM_BUCKET}/${storagePath}`;

    setStatus('⏳ Saving to database…', '#f0a500');

    // 4. Find Mediclaim content_node and insert into files table
    await CN.load();
    const hrSection   = CN.getSection('HR');
    const mediclaimNode = hrSection
      ? CN.getCategories(hrSection.id).find(c => (c.name||'').toLowerCase() === 'mediclaim')
      : null;
    const nodeId = mediclaimNode ? mediclaimNode.id : null;

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/files`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${_currentToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ node_id: nodeId, name: displayName.trim(), file_url: publicUrl })
    });
    if (!insertRes.ok) {
      const errText = await insertRes.text().catch(() => '');
      throw new Error('DB insert fail: HTTP ' + insertRes.status + (errText ? ' — ' + errText.slice(0, 200) : ''));
    }

    setStatus('✅ Upload successful! Refreshing list…', '#00d4aa');

    // 5. Clear cache and reload overlay
    delete hrDocsCache['Mediclaim'];
    e.target.value = '';
    setTimeout(() => {
      openHRDocsOverlay('Mediclaim');
    }, 800);

  } catch (err) {
    setStatus('❌ ' + err.message, '#ff5c7c');
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.style.opacity = '';
    uploadBtn.style.cursor = 'pointer';
  }
}

// ═══════════════════════════════════════════════════════════
// SALES PANEL — Supabase Sales table → category cards → overlay
// ═══════════════════════════════════════════════════════════
let salesDocsLoaded = false;
let salesAllData    = [];

const SALES_CAT_THEME = {
  'SOP':                { color:'#00d4aa', bg:'rgba(0,212,170,0.12)',  border:'rgba(0,212,170,0.3)',
    desc:'Standard Operating Procedures — step-by-step documented processes for the Sales team.',
    icon:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>` },
  'Target Audience':    { color:'#4e9af1', bg:'rgba(78,154,241,0.12)', border:'rgba(78,154,241,0.3)',
    desc:'Customer profiles and segmentation — understand who to target and how to approach them effectively.',
    icon:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>` },
  'Qualify Leads':      { color:'#f0a500', bg:'rgba(240,165,0,0.12)',  border:'rgba(240,165,0,0.3)',
    desc:'Lead qualification framework and SQL criteria — know when a prospect is truly ready to buy.',
    icon:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` },
  'Sales Pitch':        { color:'#a855f7', bg:'rgba(168,85,247,0.12)', border:'rgba(168,85,247,0.3)',
    desc:'Ready-to-use pitch scripts and decks — present Aditi Tracking value proposition with confidence.',
    icon:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` },
  'Objection Handling': { color:'#ff5c7c', bg:'rgba(255,92,124,0.12)', border:'rgba(255,92,124,0.3)',
    desc:'Common objections and proven responses — turn hesitations into opportunities.',
    icon:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>` },
  'Intro & Follow-up':  { color:'#00d4ff', bg:'rgba(0,212,255,0.12)',  border:'rgba(0,212,255,0.3)',
    desc:'Email and message templates for introductions and follow-ups — make the right first impression.',
    icon:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>` },
};
const SALES_FALLBACK_COLORS = [
  { color:'#f0a500', bg:'rgba(240,165,0,0.12)',  border:'rgba(240,165,0,0.3)'  },
  { color:'#a855f7', bg:'rgba(168,85,247,0.12)', border:'rgba(168,85,247,0.3)' },
  { color:'#00d4aa', bg:'rgba(0,212,170,0.12)',  border:'rgba(0,212,170,0.3)'  },
  { color:'#4e9af1', bg:'rgba(78,154,241,0.12)', border:'rgba(78,154,241,0.3)' },
  { color:'#ff5c7c', bg:'rgba(255,92,124,0.12)', border:'rgba(255,92,124,0.3)' },
  { color:'#00d4ff', bg:'rgba(0,212,255,0.12)',  border:'rgba(0,212,255,0.3)'  },
];
function getSalesCatTheme(cat, idx) {
  // exact match
  if (SALES_CAT_THEME[cat]) return SALES_CAT_THEME[cat];
  // fuzzy match
  for (const key of Object.keys(SALES_CAT_THEME)) {
    if (cat.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(cat.toLowerCase()))
      return SALES_CAT_THEME[key];
  }
  const fb = SALES_FALLBACK_COLORS[(idx||0) % SALES_FALLBACK_COLORS.length];
  return { ...fb, desc: 'Sales resources for ' + cat + '.', icon:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>` };
}

async function loadSalesDocs(force) {
  if (salesDocsLoaded && !force) return;
  const loading = document.getElementById('sales-loading');
  const errEl   = document.getElementById('sales-error');
  const grid    = document.getElementById('sales-cat-grid');
  if (loading) { loading.style.display = 'block'; }
  if (grid)    grid.style.display = 'none';
  if (errEl)   errEl.style.display = 'none';
  try {
    await CN.load();
    const section = CN.getSection('Sales');
    if (!section) throw new Error('Sales section not found in content_nodes');
    const cats = CN.getCategories(section.id);
    salesDocsLoaded = true;
    cnRenderCatGrid(grid, cats, loading, errEl, 'cnOpenSalesOverlay');
  } catch(e) {
    if (loading) loading.style.display = 'none';
    if (errEl)   { errEl.style.display = 'block'; errEl.innerHTML = '<div style="text-align:center;padding:32px 16px;color:var(--muted);">⚠️ ' + e.message + '</div>'; }
  }
}

function cnOpenSalesOverlay(nodeId, catName) {
  cnOpenOverlay(nodeId, catName, 'salesDocsOverlay', 'salesOverlayTitle', 'salesOverlaySub',
                'salesOverlayGrid', 'salesOverlayLoader', 'salesOverlayEmpty');
}

function renderSalesCatCards() {
  document.getElementById('sales-loading').style.display = 'none';
  if (!salesAllData || !salesAllData.length) {
    document.getElementById('sales-error').style.display = 'block';
    document.getElementById('sales-error-msg').textContent = 'No data found.';
    return;
  }
  // group by Category
  const cats = {};
  salesAllData.forEach(row => {
    const cat = (row.Category || 'General').trim();
    if (!cats[cat]) cats[cat] = [];
    cats[cat].push(row);
  });
  // Fixed order for sales cards
  const SALES_CAT_ORDER = ['SOP', 'Target Audience', 'Qualify Leads', 'Sales Pitch', 'Objection Handling', 'Intro & Follow-up'];
  const catNames = Object.keys(cats).sort((a, b) => {
    let idxA = SALES_CAT_ORDER.findIndex(o => a.toLowerCase().includes(o.toLowerCase()) || o.toLowerCase().includes(a.toLowerCase()));
    let idxB = SALES_CAT_ORDER.findIndex(o => b.toLowerCase().includes(o.toLowerCase()) || o.toLowerCase().includes(b.toLowerCase()));
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    return idxA - idxB;
  });
  const grid = document.getElementById('sales-cat-grid');
  grid.innerHTML = catNames.map((cat, i) => {
    const th    = getSalesCatTheme(cat, i);
    const count = cats[cat].length;
    const safecat = cat.replace(/'/g,"\\'");
    return `
    <div class="home-card" style="--card-top:${th.color};cursor:pointer;"
         onclick="openSalesOverlay('${safecat}')"
         onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 36px rgba(0,0,0,0.3)';this.style.borderColor='${th.color}'"
         onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor=''">
      <div class="hc-icon" style="background:${th.bg};border-color:${th.border};color:${th.color};">${th.icon}</div>
      <div class="hc-name">${cat}</div>
      <div class="hc-desc">${th.desc}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;">
        <span class="hc-status live" style="background:${th.bg};color:${th.color};border:1px solid ${th.border};">📂 ${count} file${count===1?'':'s'}</span>
        <span style="font-size:0.78rem;font-weight:600;color:${th.color};">View →</span>
      </div>
    </div>`;
  }).join('');
  grid.style.display = 'grid';
}

function openSalesOverlay(cat) {
  _actOnCardOpen(cat); // ACTIVITY TRACKING
  const items = salesAllData.filter(r => (r.Category||'General').trim() === cat);
  const th    = getSalesCatTheme(cat);
  // Set header
  document.getElementById('salesOverlayTitle').textContent = cat;
  document.getElementById('salesOverlaySub').textContent   = items.length + ' file' + (items.length===1?'':'s');
  const iconEl = document.getElementById('salesOverlayCatIcon');
  iconEl.style.background = th.bg;
  iconEl.style.border     = '1px solid ' + th.border;
  iconEl.innerHTML = `<span style="color:${th.color}">${th.icon}</span>`;
  // Show overlay immediately, loader visible
  document.getElementById('salesOverlayLoader').style.display = 'block';
  document.getElementById('salesOverlayGrid').innerHTML       = '';
  document.getElementById('salesOverlayEmpty').style.display  = 'none';
  document.getElementById('salesDocsOverlay').style.display   = 'block';
  document.body.style.overflow = 'hidden';
  // Render cards
  setTimeout(() => {
    document.getElementById('salesOverlayLoader').style.display = 'none';
    if (!items.length) { document.getElementById('salesOverlayEmpty').style.display = 'block'; return; }
    const grid = document.getElementById('salesOverlayGrid');
    grid.innerHTML = items.map(row => {
      const module = (row.Module || 'Document').trim();
      const link   = (row.Link   || '').trim();
      return renderOverlayCard(module, link, th);
    }).join('');
  }, 100);
}

function closeSalesOverlay() {
  _actOnCardClose(); // ACTIVITY TRACKING
  document.getElementById('salesDocsOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

// ═══════════════════════════════════════════════════════════
// MARKETING PANEL — Supabase Marketing table → overlay
// Table: Marketing | Columns: Type, Category, Module, Link
// Filter: Category = 'Marketing Brochure'
// ═══════════════════════════════════════════════════════════
let marketingDataCache = {};
let marketingInitLoaded = false;

const MKT_THEME = {
  color: '#f0a500',
  bg:    'rgba(240,165,0,0.12)',
  border:'rgba(240,165,0,0.3)'
};

// Category → theme color map
const MKT_CAT_THEME = {
  'Marketing Brochure': { color:'#f0a500', bg:'rgba(240,165,0,0.12)',   border:'rgba(240,165,0,0.3)',   icon:'📄' },
  'Solution Videos':    { color:'#a855f7', bg:'rgba(168,85,247,0.12)',  border:'rgba(168,85,247,0.3)',  icon:'🎬' },
  'Short Explainer':    { color:'#00d4aa', bg:'rgba(0,212,170,0.12)',   border:'rgba(0,212,170,0.3)',   icon:'▶️' },
};

// Marketing panel khulte hi count badge update karo — teeno categories ke liye
async function loadMarketingCounts() {
  if (marketingInitLoaded) return;
  marketingInitLoaded = true;
  try {
    await CN.load();
    const section = CN.getSection('Marketing');
    if (!section) return;
    const cats = CN.getCategories(section.id);

    // Map known hardcoded card names to badge IDs
    const badgeMap = {
      'marketing brochure': 'mkt-brochure-count',
      'solution videos':    'mkt-solution-count',
      'short explainer':    'mkt-explainer-count',
    };

    // Update badge counts for hardcoded cards
    cats.forEach(cat => {
      const key = (cat.name || '').toLowerCase().trim();
      const bid = badgeMap[key];
      if (bid) {
        const el = document.getElementById(bid);
        const count = CN.totalFiles(cat.id);
        if (el) el.textContent = '📂 ' + count + ' file' + (count===1?'':'s');
      }
    });

    // Store cats for overlay use
    window._cnMktCats = cats;

    // ── Render NEW dynamic cards (not in hardcoded set) ──────────────────
    const hardcoded = new Set(Object.keys(badgeMap));
    const newCats = cats.filter(c => !hardcoded.has((c.name||'').toLowerCase().trim()));
    const mainGrid = document.getElementById('mkt-main-grid');

    if (newCats.length && mainGrid) {
      newCats.forEach((cat, i) => {
        const th    = cnTheme(i);
        const name  = cat.name || 'Category';
        const count = CN.totalFiles(cat.id);
        const safe  = name.replace(/'/g,"\\'").replace(/"/g,'&quot;');
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.innerHTML = `
          ${_isMIS() ? `          <button onclick="event.stopPropagation();confirmDeleteCard(${cat.id},'${safe}')" title="Delete card"
            style="position:absolute;top:10px;right:10px;z-index:3;width:28px;height:28px;border-radius:8px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;"
            onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.12)'">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>` : ''}
          <div class="home-card" style="--card-top:${th.color};cursor:pointer;"
            onclick="cnOpenMktDynOverlay(${cat.id},'${safe}')"
            onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 36px rgba(0,0,0,0.3)';this.style.borderColor='${th.color}'"
            onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor=''">
            <div class="hc-icon" style="background:${th.bg};border-color:${th.border};color:${th.color};">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <div class="hc-name">${name}</div>
            <div class="hc-desc" style="font-size:0.88rem;color:var(--muted);line-height:1.55;">${getCNCardDesc(name)}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;">
              <span class="hc-status live" style="background:${th.bg};color:${th.color};border:1px solid ${th.border};">📂 ${count} file${count===1?'':'s'}</span>
              <span style="font-size:0.78rem;font-weight:600;color:${th.color};">View →</span>
            </div>
          </div>`;
        mainGrid.appendChild(wrapper);
      });
    }

    // Inject delete buttons on hardcoded marketing cards
    injectDeleteBtns('Marketing', document.querySelector('#panel-marketing .db-content'));
  } catch(e) {
  }
}

function cnOpenMktDynOverlay(nodeId, catName) {
  _hideAssessmentTab(); // Marketing — Assessment tab nahi dikhana
  switchMktTab('videos');
  cnOpenOverlay(nodeId, catName, 'marketingOverlay', 'mktOverlayTitle', 'mktOverlaySub',
                'mktOverlayGrid', 'mktOverlayLoader', 'mktOverlayEmpty');
}

async function openMarketingOverlay(category) {
  const th = MKT_CAT_THEME[category] || MKT_THEME;
  const iconEl = document.getElementById('mktOverlayIcon');
  if (iconEl) {
    iconEl.style.background  = th.bg;
    iconEl.style.borderColor = th.border;
    iconEl.innerHTML = `<span style="font-size:1.4rem;">${th.icon}</span>`;
  }
  document.getElementById('mktOverlayTitle').textContent     = category;
  document.getElementById('mktOverlaySub').textContent       = '';
  document.getElementById('mktOverlayLoader').style.display  = 'block';
  document.getElementById('mktOverlayGrid').innerHTML        = '';
  document.getElementById('mktOverlayEmpty').style.display   = 'none';
  document.getElementById('marketingOverlay').style.display  = 'block';
  document.body.style.overflow = 'hidden';
  _hideAssessmentTab(); // Marketing — Assessment tab nahi dikhana
  switchMktTab('videos');

  try {
    await CN.load();
    const section = CN.getSection('Marketing');
    const cats    = section ? CN.getCategories(section.id) : [];
    const cat     = cats.find(c => (c.name||'').trim().toLowerCase() === category.trim().toLowerCase());
    document.getElementById('mktOverlayLoader').style.display = 'none';
    if (!cat) {
      document.getElementById('mktOverlayEmpty').style.display = 'block';
      return;
    }
    // Use shared renderer — handles sub-cards + direct files
    _cnRenderOverlayContent(cat.id, category, th, 'mktOverlayGrid', 'mktOverlaySub', 'mktOverlayEmpty', null);
  } catch(e) {
    document.getElementById('mktOverlayLoader').style.display = 'none';
    const ee = document.getElementById('mktOverlayEmpty');
    if (ee) { ee.style.display='block'; ee.textContent='Failed to load: ' + e.message; }
  }
}

function renderMarketingDocs(items, th) {
  document.getElementById('mktOverlayLoader').style.display = 'none';
  document.getElementById('mktOverlaySub').textContent = items.length + ' file' + (items.length === 1 ? '' : 's');
  if (!items.length) {
    document.getElementById('mktOverlayEmpty').style.display = 'block';
    return;
  }
  const grid = document.getElementById('mktOverlayGrid');
  grid.innerHTML = items.map(row => {
    const name = (row.Module || 'Document').trim();
    const link = (row.Link   || '').trim();
    return renderOverlayCard(name, link, th);
  }).join('');
}

function closeMarketingOverlay() {
  document.getElementById('marketingOverlay').style.display = 'none';
  document.body.style.overflow = '';
  const qBtn = document.getElementById('mkt-overlay-quiz-btn');
  if (qBtn) qBtn.remove();
}

// Wrapper called from overlay quiz cards — closes overlay first then starts quiz
function startDBQuizFromOverlay(quizId) {
  closeMarketingOverlay();
  // Small delay so overlay closes before quiz overlay opens
  setTimeout(() => startDBQuiz(quizId), 80);
}

// Wrapper for My Results from overlay — closes overlay first
function openMyResultsFromOverlay(nodeId) {
  closeMarketingOverlay();
  setTimeout(() => openMyQuizResults(nodeId), 80);
}

// ═══════════════════════════════════════════════════════════
// PRODUCTS PANEL — Supabase Videos Only
// ═══════════════════════════════════════════════════════════
let prodLoaded = false;

// ── Generic CN panel loader (Finance / Compliance / Referral) ─────────────
// Loads content_nodes cards for a section name into a standard panel layout.
const _simplePanelLoaded = {};
async function loadSimpleCNPanel(panelKey, sectionName) {
  if (_simplePanelLoaded[panelKey]) return;
  _simplePanelLoaded[panelKey] = true;

  const loadingEl = document.getElementById(panelKey + '-loading');
  const gridEl    = document.getElementById(panelKey + '-grid');
  const emptyEl   = document.getElementById(panelKey + '-empty');

  try {
    await CN.load();
    const section = CN.getSection(sectionName);
    if (!section) {
      if (loadingEl) loadingEl.style.display = 'none';
      if (emptyEl)   emptyEl.style.display = 'block';
      return;
    }
    const cats = CN.getCategories(section.id);
    if (!cats.length) {
      if (loadingEl) loadingEl.style.display = 'none';
      if (emptyEl)   emptyEl.style.display = 'block';
      return;
    }
    if (loadingEl) loadingEl.style.display = 'none';
    gridEl.innerHTML = cats.map((cat, i) => {
      const th    = cnTheme(i);
      const name  = cat.name || 'Category';
      const count = CN.totalFiles(cat.id);
      const safe  = name.replace(/'/g,"\\'").replace(/"/g,'&quot;');
      return `
      <div style="position:relative;">
        ${_isMIS() ? `        <button onclick="event.stopPropagation();confirmDeleteCard(${cat.id},'${safe}')" title="Delete"
          style="position:absolute;top:10px;right:10px;z-index:3;width:28px;height:28px;border-radius:8px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;"
          onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.12)'">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>` : ''}
        <div class="home-card" style="--card-top:${th.color};cursor:pointer;"
          onclick="_hideAssessmentTab();switchMktTab('videos');cnOpenOverlay(${cat.id},'${safe}','marketingOverlay','mktOverlayTitle','mktOverlaySub','mktOverlayGrid','mktOverlayLoader','mktOverlayEmpty')"
          onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 36px rgba(0,0,0,0.3)';this.style.borderColor='${th.color}'"
          onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor=''">
          <div class="hc-icon" style="background:${th.bg};border-color:${th.border};color:${th.color};">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div class="hc-name">${name}</div>
          <div class="hc-desc" style="font-size:0.88rem;line-height:1.55;color:var(--muted);">${getCNCardDesc(name)}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;">
            <span class="hc-status live" style="background:${th.bg};color:${th.color};border:1px solid ${th.border};">📂 ${count} file${count===1?'':'s'}</span>
            <span style="font-size:0.78rem;font-weight:600;color:${th.color};">View →</span>
          </div>
        </div>
      </div>`;
    }).join('');
    gridEl.style.display = 'grid';
  } catch(e) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (emptyEl)   { emptyEl.style.display = 'block'; emptyEl.textContent = '⚠️ ' + e.message; }
  }
}

// ═══════════════════════════════════════════════════════════
// REFERRAL PROGRAMME — "Refer & Earn" (₹2,000 per successful referral)
// Tables (Supabase): job_openings, referrals
// See /referral_programme_schema.sql for table + RLS + storage setup
// ═══════════════════════════════════════════════════════════
let _refOpenings        = [];
let _myReferrals        = [];
let _refOpeningsLoaded  = false;
let _myReferralsLoaded  = false;

function _isReferralAdmin(){
  if (!CURRENT_USER) return false;
  if (CURRENT_USER.role === 'owner') return true;
  const r = String(CURRENT_USER.rawRole || '').toLowerCase().trim();
  return r === 'hr' || r === 'mis';
}

// Access Control toggle wins if set; otherwise fall back to legacy HR/MIS/owner check
function _canSeeReferralPipeline(){
  return PERMISSIONS.can_view_referral_pipeline === 'true' || _isReferralAdmin();
}
function _canPostReferralRole(){
  return PERMISSIONS.can_post_referral_role === 'true' || _isReferralAdmin();
}

// Nav item + tab visibility for Referral Programme — runs at login and again on tab open
function _applyReferralNavVisibility(){
  const canRoles = PERMISSIONS.can_view_open_roles        !== 'false';
  const canMine  = PERMISSIONS.can_view_my_referrals      !== 'false';
  const canPipe  = _canSeeReferralPipeline();
  const canPost  = _canPostReferralRole();
  const anyTab   = canRoles || canMine || canPipe || canPost;

  const refNav = document.getElementById('nav-referral');
  const refMM  = document.getElementById('mm-referral');
  if (refNav) refNav.style.display = anyTab ? '' : 'none';
  if (refMM)  refMM.style.display  = anyTab ? '' : 'none';

  return { canRoles, canMine, canPipe, canPost };
}

function initReferralProgramme(){
  const rolesBtn = document.getElementById('refTabBtn-roles');
  const mineBtn  = document.getElementById('refTabBtn-mine');
  const postBtn  = document.getElementById('refTabBtn-post');
  const pipeBtn  = document.getElementById('refTabBtn-pipeline');

  // Each tab controlled by its own permission key from Access Control.
  // Open Roles / My Referrals default to visible (everyone can refer a friend)
  // unless an admin explicitly switches them off for a person.
  const { canRoles, canMine, canPipe, canPost } = _applyReferralNavVisibility();

  if (rolesBtn) rolesBtn.style.display = canRoles ? '' : 'none';
  if (mineBtn)  mineBtn.style.display  = canMine  ? '' : 'none';
  if (postBtn)  postBtn.style.display  = canPost  ? '' : 'none';
  if (pipeBtn)  pipeBtn.style.display  = canPipe  ? '' : 'none';

  // If the currently-active tab just got hidden, jump to the first visible one
  const order = [['roles',canRoles],['mine',canMine],['pipeline',canPipe],['post',canPost]];
  const activeBtn = document.querySelector('#panel-referral .ref-subnav button.active');
  const activeTab = activeBtn ? activeBtn.id.replace('refTabBtn-','') : 'roles';
  const activeStillVisible = order.some(([t,v]) => t === activeTab && v);
  if (!activeStillVisible) {
    const fallback = order.find(([,v]) => v);
    if (fallback) switchReferralTab(fallback[0]);
  }

  loadReferralOpenings();
  loadMyReferrals();
}

function switchReferralTab(tab){
  ['roles','mine','pipeline','post'].forEach(t=>{
    const tabEl = document.getElementById('refTab-' + t);
    const btnEl = document.getElementById('refTabBtn-' + t);
    if (tabEl) tabEl.classList.toggle('active', t === tab);
    if (btnEl) btnEl.classList.toggle('active', t === tab);
  });
  if (tab === 'mine' && !_myReferralsLoaded) loadMyReferrals();
  if (tab === 'pipeline' && _canSeeReferralPipeline()) loadReferralPipeline();
  if (tab === 'post' && _canPostReferralRole())  loadAdminOpeningsList();
}

// ── Open Roles ───────────────────────────────────────────────
async function loadReferralOpenings(){
  const loadingEl = document.getElementById('refOpenings-loading');
  const gridEl    = document.getElementById('refOpenings-grid');
  const emptyEl   = document.getElementById('refOpenings-empty');
  try{
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/job_openings?select=*&status=eq.Open&order=posted_date.desc`,
      { headers: SB_HDRS() }
    );
    if (!res.ok) throw new Error('Could not load openings (' + res.status + ')');
    _refOpenings = await res.json();
    _refOpeningsLoaded = true;
    if (loadingEl) loadingEl.style.display = 'none';
    if (!_refOpenings.length) { if (emptyEl) emptyEl.style.display = 'block'; return; }
    _populateReferralFilters();
    renderReferralOpenings();
  } catch(e){
    if (loadingEl) loadingEl.style.display = 'none';
    if (emptyEl) {
      emptyEl.style.display = 'block';
      emptyEl.innerHTML = '⚠️ Could not load openings.<br><span style="font-size:0.78rem;">' + e.message + ' — has the job_openings table been created in Supabase?</span>';
    }
  }
}

function _populateReferralFilters(){
  const locSel  = document.getElementById('refFilterLoc');
  const deptSel = document.getElementById('refFilterDept');
  if (!locSel || !deptSel) return;
  const curLoc  = locSel.value, curDept = deptSel.value;
  const locs    = [...new Set(_refOpenings.map(o=>o.location).filter(Boolean))].sort();
  const depts   = [...new Set(_refOpenings.map(o=>o.department).filter(Boolean))].sort();
  locSel.innerHTML  = '<option value="">All Locations</option>'  + locs.map(l=>`<option value="${l}">${l}</option>`).join('');
  deptSel.innerHTML = '<option value="">All Departments</option>' + depts.map(d=>`<option value="${d}">${d}</option>`).join('');
  locSel.value  = curLoc;
  deptSel.value = curDept;
}

function renderReferralOpenings(){
  const gridEl  = document.getElementById('refOpenings-grid');
  const emptyEl = document.getElementById('refOpenings-empty');
  if (!gridEl) return;
  const locF  = document.getElementById('refFilterLoc')  ? document.getElementById('refFilterLoc').value  : '';
  const deptF = document.getElementById('refFilterDept') ? document.getElementById('refFilterDept').value : '';
  const rows  = _refOpenings.filter(o => (!locF || o.location === locF) && (!deptF || o.department === deptF));

  if (!rows.length){
    gridEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  gridEl.style.display = 'grid';

  const colors = ['#f0a500','#00d4aa','#4e9af1','#a78bfa','#ff5c7c'];
  gridEl.innerHTML = rows.map((o,i)=>{
    const c = colors[i % colors.length];
    const safeTitle = String(o.role_title || 'Role').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const jdPreview = (o.jd_text || 'See the full JD for details.').slice(0,140);
    const jdMore    = (o.jd_text || '').length > 140 ? '…' : '';
    return `
      <div class="home-card" style="--card-top:${c};cursor:default;">
        <div class="hc-icon" style="color:${c};border-color:${c}40;background:${c}1a;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
        </div>
        <div class="hc-name">${o.role_title || 'Role'}</div>
        <div class="ref-opening-meta">
          <span class="ref-chip">📍 ${o.location || '—'}</span>
          ${o.department ? `<span class="ref-chip">${o.department}</span>` : ''}
          <span class="ref-chip">${o.openings_count || 1} opening${(o.openings_count||1)===1?'':'s'}</span>
        </div>
        <div class="hc-desc" style="font-size:0.84rem;min-height:40px;">${jdPreview}${jdMore}</div>
        <div class="ref-card-actions">
          <button class="ref-btn ref-btn-primary" onclick="openReferModal(${o.id},'${safeTitle}')">🤝 Refer a Friend</button>
          ${o.jd_url ? `<a class="ref-btn ref-btn-ghost" href="${o.jd_url}" target="_blank">Full JD</a>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ── Refer a Friend modal ─────────────────────────────────────
function openReferModal(openingId, openingTitle){
  if (!CURRENT_USER){ alert('Please log in first.'); return; }
  document.getElementById('referOpeningId').value       = openingId;
  document.getElementById('referOpeningTitle').textContent = openingTitle;
  document.getElementById('referCandName').value    = '';
  document.getElementById('referCandMobile').value  = '';
  document.getElementById('referCandEmail').value   = '';
  document.getElementById('referCandCity').value     = '';
  document.getElementById('referResume').value      = '';
  document.getElementById('referModalStatus').style.display = 'none';
  document.getElementById('referSubmitBtn').disabled = false;
  document.getElementById('referModal').style.display = 'block';
  document.body.style.overflow = 'hidden';
}
function closeReferModal(){
  document.getElementById('referModal').style.display = 'none';
  document.body.style.overflow = '';
}
function _refMsg(text, color){
  const el = document.getElementById('referModalStatus');
  el.style.display    = 'block';
  el.style.background = color + '1f';
  el.style.color      = color;
  el.textContent      = text;
}

async function submitReferralForm(){
  const openingId    = document.getElementById('referOpeningId').value;
  const openingTitle = document.getElementById('referOpeningTitle').textContent;
  const name     = document.getElementById('referCandName').value.trim();
  const mobile   = document.getElementById('referCandMobile').value.trim();
  const email    = document.getElementById('referCandEmail').value.trim();
  const city     = document.getElementById('referCandCity').value.trim();
  const fileInput = document.getElementById('referResume');

  if (!name || !mobile || !email || !city) { _refMsg('⚠️ Please fill in all fields.', '#ff5c7c'); return; }
  if (!/^[0-9]{10}$/.test(mobile.replace(/\D/g,''))) { _refMsg('⚠️ Please enter a valid 10-digit mobile number.', '#ff5c7c'); return; }
  if (!/^\S+@\S+\.\S+$/.test(email)) { _refMsg('⚠️ Please enter a valid email address.', '#ff5c7c'); return; }
  if (!fileInput.files || !fileInput.files[0]) { _refMsg('⚠️ Please attach the candidate\'s resume.', '#ff5c7c'); return; }
  if (!CURRENT_USER) { _refMsg('⚠️ Please log in again.', '#ff5c7c'); return; }
  if (!CURRENT_USER.empId) { _refMsg('⚠️ Could not find your Employee ID. Please refresh the page and try again.', '#ff5c7c'); return; }

  document.getElementById('referSubmitBtn').disabled = true;
  _refMsg('⏳ Submitting referral…', '#f0a500');

  let resumeUploadError = null;
  try{
    let resumeUrl = null;
    if (fileInput.files && fileInput.files[0]){
      const file     = fileInput.files[0];
      const ext      = (file.name.split('.').pop() || 'pdf').toLowerCase();
      const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filePath = `${openingId}/${Date.now()}_${safeName}.${ext}`;
      const bucket   = 'referral_resumes';
      _refMsg('⏳ Uploading resume…', '#f0a500');
      const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${_currentToken}`,
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'true'
        },
        body: file
      });
      if (upRes.ok) {
        resumeUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
      } else {
        const errText = await upRes.text();
        resumeUploadError = errText || ('Resume upload failed (' + upRes.status + ')');
        console.warn('Resume upload failed:', resumeUploadError);
      }
    }
    _refMsg('⏳ Submitting referral…', '#f0a500');

    const payload = {
      opening_id:        openingId ? Number(openingId) : null,
      opening_title:      openingTitle,
      referrer_emp_id:     CURRENT_USER.empId,
      referrer_name:       CURRENT_USER.name    || '',
      referrer_email:      CURRENT_USER.email   || '',
      referrer_dept:       CURRENT_USER.rawRole || '',
      referrer_branch:     CURRENT_USER.location || '',
      candidate_name:      name,
      candidate_mobile:    mobile,
      candidate_email:     email,
      candidate_city:      city,
      resume_url:          resumeUrl,
      is_friend_declared:  true,
      status:              'Submitted'
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/referrals`, {
      method: 'POST',
      headers: { ...SB_HDRS(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) { const t = await res.text(); throw new Error(t || ('Could not save referral (' + res.status + ')')); }

    if (resumeUploadError) {
      _refMsg('⚠️ Referral submitted, but resume upload failed: ' + resumeUploadError, '#f0a500');
    } else {
      _refMsg('✅ Referral submitted! You will be notified as it progresses.', '#00d4aa');
    }
    _myReferralsLoaded = false;
    loadMyReferrals();
    setTimeout(closeReferModal, resumeUploadError ? 3500 : 1400);
  } catch(e){
    _refMsg('❌ ' + e.message, '#ff5c7c');
    document.getElementById('referSubmitBtn').disabled = false;
  }
}

// ── My Referrals ─────────────────────────────────────────────
function _refStageColor(status){
  const map = {
    'Submitted':              '#4e9af1',
    'Under Review':           '#f0a500',
    'Shortlisted/Interview':  '#f0a500',
    'Selected/Offered':       '#a78bfa',
    'Joined':                 '#a78bfa',
    '90-Day Completed':       '#00d4aa',
    'Incentive Paid':         '#00d4aa',
    'Closed-Not Eligible':    '#ff5c7c'
  };
  return map[status] || '#b0b8cc';
}

function _refStageDesc(status){
  const map = {
    'Submitted':             'HR has received your referral and will review it shortly.',
    'Under Review':          'HR is screening the candidate.',
    'Shortlisted/Interview': 'Candidate is progressing through the interview process.',
    'Selected/Offered':      'An offer has been extended to the candidate.',
    'Joined':                'Candidate has joined — the 90-day clock has started.',
    '90-Day Completed':      'Candidate completed 90 days — incentive eligible, payout pending.',
    'Incentive Paid':        'Your ₹2,000 incentive has been released.',
    'Closed-Not Eligible':   'Not eligible for incentive (did not join, exited early, or duplicate).'
  };
  return map[status] || '';
}

async function loadMyReferrals(){
  if (!CURRENT_USER || !CURRENT_USER.email) return;
  const loadingEl = document.getElementById('refMine-loading');
  const listEl    = document.getElementById('refMine-list');
  const emptyEl   = document.getElementById('refMine-empty');
  try{
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/referrals?select=*&referrer_email=ilike.${encodeURIComponent(CURRENT_USER.email)}&order=submitted_at.desc`,
      { headers: SB_HDRS() }
    );
    if (!res.ok) throw new Error('Could not load your referrals (' + res.status + ')');
    _myReferrals = await res.json();
    _myReferralsLoaded = true;
    if (loadingEl) loadingEl.style.display = 'none';
    if (!_myReferrals.length) { if (emptyEl) emptyEl.style.display = 'block'; return; }
    if (emptyEl) emptyEl.style.display = 'none';
    listEl.style.display = 'block';
    listEl.innerHTML = _myReferrals.map(r=>{
      const c = _refStageColor(r.status);
      let extra = '';
      if (r.status === 'Joined' && r.ninety_day_date){
        extra = `<div style="font-size:0.76rem;color:var(--muted);margin-top:4px;">Eligible on ${new Date(r.ninety_day_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>`;
      } else if (r.status === 'Incentive Paid' && r.paid_date){
        extra = `<div style="font-size:0.76rem;color:var(--won);margin-top:4px;">Paid on ${new Date(r.paid_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} · ₹${r.paid_amount || 2000}</div>`;
      } else {
        const desc = _refStageDesc(r.status);
        if (desc) extra = `<div style="font-size:0.76rem;color:var(--muted);margin-top:4px;">${desc}</div>`;
      }
      return `
        <div class="ref-mine-row">
          <div class="ref-mine-main">
            <div class="ref-mine-cand">${r.candidate_name}</div>
            <div class="ref-mine-role">for ${r.opening_title || '—'}</div>
            ${extra}
          </div>
          <span class="ref-stage-badge" style="background:${c}1f;color:${c};border:1px solid ${c}40;">${r.status}</span>
        </div>`;
    }).join('');
  } catch(e){
    if (loadingEl) loadingEl.style.display = 'none';
    if (emptyEl) { emptyEl.style.display = 'block'; emptyEl.innerHTML = '⚠️ ' + e.message; }
  }
}

// ── HR / MIS: Pipeline — every referral with full details + status control ──
const REF_STATUS_OPTIONS = [
  'Submitted','Under Review','Shortlisted/Interview','Selected/Offered',
  'Joined','90-Day Completed','Incentive Paid','Closed-Not Eligible'
];

async function loadReferralPipeline(){
  if (!_canSeeReferralPipeline()) return;
  const loadingEl = document.getElementById('refPipeline-loading');
  const listEl    = document.getElementById('refPipeline-list');
  const emptyEl   = document.getElementById('refPipeline-empty');
  loadingEl.style.display = 'block'; listEl.style.display = 'none'; emptyEl.style.display = 'none';
  try{
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/referrals?select=*&order=submitted_at.desc`,
      { headers: SB_HDRS() }
    );
    if (!res.ok) throw new Error('Could not load referrals (' + res.status + ')');
    const rows = await res.json();
    loadingEl.style.display = 'none';
    if (!rows.length){ emptyEl.style.display = 'block'; return; }
    listEl.style.display = 'block';
    listEl.innerHTML = rows.map(r => _renderPipelineRow(r)).join('');
  } catch(e){
    loadingEl.style.display = 'none';
    emptyEl.style.display = 'block';
    emptyEl.innerHTML = '⚠️ ' + e.message;
  }
}

function _renderPipelineRow(r){
  const c = _refStageColor(r.status);
  const submitted = r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—';
  const statusOpts = REF_STATUS_OPTIONS.map(s => `<option value="${s}" ${s===r.status?'selected':''}>${s}</option>`).join('');
  const showJoining = (r.status === 'Joined' || r.status === '90-Day Completed' || r.status === 'Incentive Paid');
  const showPayout  = (r.status === 'Incentive Paid' || r.status === '90-Day Completed');
  return `
    <div class="ref-pipe-row" id="refPipeRow-${r.id}">
      <div class="ref-pipe-top">
        <div>
          <div class="ref-pipe-cand">${r.candidate_name}</div>
          <div class="ref-pipe-role">for ${r.opening_title || '—'}</div>
        </div>
        <span class="ref-stage-badge" style="background:${c}1f;color:${c};border:1px solid ${c}40;">${r.status}</span>
      </div>

      <div class="ref-pipe-cols">
        <div class="ref-pipe-block">
          <div class="ref-pipe-block-title">Candidate</div>
          <div>🙋 ${r.candidate_name}</div>
          <div>📱 ${r.candidate_mobile}</div>
          ${r.candidate_email ? `<div>✉️ <a href="mailto:${r.candidate_email}">${r.candidate_email}</a></div>` : ''}
          ${r.candidate_city ? `<div>📍 ${r.candidate_city}</div>` : ''}
          ${r.resume_url ? `<div><a href="${r.resume_url}" target="_blank">📎 View Resume</a></div>` : ''}
        </div>
        <div class="ref-pipe-block">
          <div class="ref-pipe-block-title">Referred By</div>
          <div>👤 ${r.referrer_name}</div>
          <div>📍 ${r.referrer_branch || r.referrer_dept || '—'}</div>
          <div>🗓️ Submitted ${submitted}</div>
        </div>
      </div>

      ${r.note ? `<div class="ref-pipe-note">📝 ${r.note}</div>` : ''}
      <div class="ref-pipe-controls">
        <label>Status</label>
        <select id="refPipeStatus-${r.id}" onchange="_refPipeToggleFields(${r.id})">${statusOpts}</select>
        <span id="refPipeJoinWrap-${r.id}" style="display:${showJoining ? 'inline-flex' : 'none'};align-items:center;gap:6px;">
          <label>Joining Date</label>
          <input type="date" id="refPipeJoinDate-${r.id}" value="${r.joining_date || ''}">
        </span>
        <span id="refPipePayWrap-${r.id}" style="display:${showPayout ? 'inline-flex' : 'none'};align-items:center;gap:6px;">
          <label>Paid ₹</label>
          <input type="number" id="refPipePaidAmt-${r.id}" value="${r.paid_amount || 2000}" style="width:80px;">
          <label>Paid Date</label>
          <input type="date" id="refPipePaidDate-${r.id}" value="${r.paid_date || ''}">
        </span>
        <button class="ref-pipe-save" onclick="saveReferralPipelineRow(${r.id})">Save</button>
        <span id="refPipeMsg-${r.id}" style="font-size:0.76rem;font-weight:600;"></span>
      </div>
    </div>`;
}

function _refPipeToggleFields(id){
  const status   = document.getElementById('refPipeStatus-' + id).value;
  const joinWrap = document.getElementById('refPipeJoinWrap-' + id);
  const payWrap  = document.getElementById('refPipePayWrap-' + id);
  if (joinWrap) joinWrap.style.display = (status === 'Joined' || status === '90-Day Completed' || status === 'Incentive Paid') ? 'inline-flex' : 'none';
  if (payWrap)  payWrap.style.display  = (status === 'Incentive Paid' || status === '90-Day Completed') ? 'inline-flex' : 'none';
}

async function saveReferralPipelineRow(id){
  const msgEl   = document.getElementById('refPipeMsg-' + id);
  const status  = document.getElementById('refPipeStatus-' + id).value;
  const joinEl  = document.getElementById('refPipeJoinDate-' + id);
  const paidAmtEl  = document.getElementById('refPipePaidAmt-' + id);
  const paidDateEl = document.getElementById('refPipePaidDate-' + id);

  const patch = { status };
  if (joinEl && joinEl.value) patch.joining_date = joinEl.value;
  if (status === 'Incentive Paid'){
    patch.paid_flag = true;
    if (paidAmtEl  && paidAmtEl.value)  patch.paid_amount = Number(paidAmtEl.value);
    if (paidDateEl && paidDateEl.value) patch.paid_date   = paidDateEl.value;
  }
  if (status === '90-Day Completed') patch.eligible_flag = true;

  msgEl.style.color = 'var(--accent)'; msgEl.textContent = 'Saving…';
  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/referrals?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...SB_HDRS(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify(patch)
    });
    if (!res.ok) { const t = await res.text(); throw new Error(t || ('Failed (' + res.status + ')')); }
    msgEl.style.color = 'var(--won)'; msgEl.textContent = '✅ Saved';
    setTimeout(()=>{ if (msgEl) msgEl.textContent = ''; }, 2500);
  } catch(e){
    msgEl.style.color = '#ff5c7c'; msgEl.textContent = '⚠️ ' + e.message;
  }
}

// ── HR / MIS: Post & manage openings ──────────────────────────
async function submitNewOpening(){
  if (!_canPostReferralRole()) { alert('⛔ You do not have permission to post a role.'); return; }
  const title  = document.getElementById('refNewTitle').value.trim();
  const count  = parseInt(document.getElementById('refNewCount').value) || 1;
  const dept   = document.getElementById('refNewDept').value.trim();
  const loc    = document.getElementById('refNewLoc').value.trim();
  const jd     = document.getElementById('refNewJD').value.trim();
  const jdUrl  = document.getElementById('refNewJdUrl').value.trim();
  const statusEl = document.getElementById('refNewStatus');

  if (!title || !loc){
    statusEl.style.display = 'block'; statusEl.style.background = '#ff5c7c1f'; statusEl.style.color = '#ff5c7c';
    statusEl.textContent = '⚠️ Role title and location are required.';
    return;
  }
  statusEl.style.display = 'block'; statusEl.style.background = '#f0a5001f'; statusEl.style.color = '#f0a500';
  statusEl.textContent = '⏳ Posting…';

  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/job_openings`, {
      method: 'POST',
      headers: { ...SB_HDRS(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        role_title: title, department: dept || null, location: loc, openings_count: count,
        jd_text: jd || null, jd_url: jdUrl || null, status: 'Open'
      })
    });
    if (!res.ok) { const t = await res.text(); throw new Error(t || ('Failed (' + res.status + ')')); }
    statusEl.style.background = '#00d4aa1f'; statusEl.style.color = '#00d4aa';
    statusEl.textContent = '✅ Opening posted!';
    ['refNewTitle','refNewDept','refNewLoc','refNewJD','refNewJdUrl'].forEach(id=>{ const el=document.getElementById(id); if (el) el.value=''; });
    document.getElementById('refNewCount').value = 1;
    _refOpeningsLoaded = false;
    loadReferralOpenings();
    loadAdminOpeningsList();
  } catch(e){
    statusEl.style.background = '#ff5c7c1f'; statusEl.style.color = '#ff5c7c';
    statusEl.textContent = '❌ ' + e.message;
  }
}

async function loadAdminOpeningsList(){
  if (!_canPostReferralRole()) return;
  const wrap = document.getElementById('refAdminList');
  if (!wrap) return;
  wrap.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;">Loading…</div>';
  try{
    const res  = await fetch(`${SUPABASE_URL}/rest/v1/job_openings?select=*&order=posted_date.desc`, { headers: SB_HDRS() });
    const rows = await res.json();
    if (!rows.length) { wrap.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;">No openings posted yet.</div>'; return; }
    wrap.innerHTML = rows.map(o=>`
      <div style="display:flex;align-items:center;gap:14px;padding:12px 16px;border:1px solid var(--border);border-radius:12px;margin-bottom:10px;background:var(--surface);flex-wrap:wrap;">
        <div style="flex:1;min-width:180px;">
          <div style="font-weight:700;font-size:0.9rem;color:var(--text);">${o.role_title}</div>
          <div style="font-size:0.78rem;color:var(--muted);">${o.location || '—'} · ${o.department || '—'} · ${o.openings_count || 1} opening${(o.openings_count||1)===1?'':'s'}</div>
        </div>
        <span class="badge ${o.status === 'Open' ? 'badge-won' : 'badge-open'}">${o.status}</span>
        <button onclick="deleteOpening(${o.id},'${(o.role_title||'').replace(/'/g,"\\'")}')" style="padding:7px 12px;border-radius:8px;border:1.5px solid rgba(255,92,124,0.4);background:rgba(255,92,124,0.08);color:#ff5c7c;font-size:0.78rem;font-weight:700;cursor:pointer;font-family:inherit;">
          Delete
        </button>
      </div>`).join('');
  } catch(e){
    wrap.innerHTML = '⚠️ ' + e.message;
  }
}

async function toggleOpeningStatus(id, newStatus){
  try{
    await fetch(`${SUPABASE_URL}/rest/v1/job_openings?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...SB_HDRS(), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ status: newStatus })
    });
    _refOpeningsLoaded = false;
    loadReferralOpenings();
    loadAdminOpeningsList();
  } catch(e){ alert('Could not update: ' + e.message); }
}

async function deleteOpening(id, title){
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/job_openings?id=eq.${id}`, {
      method: 'DELETE',
      headers: { ...SB_HDRS(), 'Prefer': 'return=minimal' }
    });
    if (!res.ok) { const t = await res.text(); throw new Error(t || ('Failed (' + res.status + ')')); }
    _refOpeningsLoaded = false;
    loadReferralOpenings();
    loadAdminOpeningsList();
  } catch(e){ alert('Could not delete: ' + e.message); }
}

async function loadProducts() {
  if (prodLoaded) return;
  prodLoaded = true;

  try {
    await CN.load();
    const section = CN.getSection('Products');
    const loading = document.getElementById('prod-vid-loading');
    const errEl   = document.getElementById('prod-vid-error');

    if (!section) {
      if (loading) loading.style.display = 'none';
      if (errEl)   { errEl.style.display='block'; errEl.innerHTML='<div style="padding:2rem;text-align:center;color:var(--muted);">No Products section found in content_nodes.</div>'; }
      return;
    }

    const cats = CN.getCategories(section.id);

    // ── Render category cards ─────────────────────────────────────────────
    const catSection = document.getElementById('prod-cat-section');
    const catGrid    = document.getElementById('prod-cat-grid');
    if (cats.length && catGrid) {
      catGrid.innerHTML = cats.map((cat, i) => {
        const th    = cnTheme(i);
        const name  = cat.name || 'Category';
        const count = CN.totalFiles(cat.id);
        const safe  = name.replace(/'/g,"\\'").replace(/"/g,'&quot;');
        return `
        <div style="position:relative;">
          ${_isMIS() ? `          <button onclick="event.stopPropagation();confirmDeleteCard(${cat.id},'${safe}')" title="Delete card"
            style="position:absolute;top:10px;right:10px;z-index:3;width:28px;height:28px;border-radius:8px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;"
            onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.12)'">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>` : ''}
          <div class="home-card" style="--card-top:${th.color};cursor:pointer;"
            onclick="cnOpenProdOverlay(${cat.id},'${safe}')"
            onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 36px rgba(0,0,0,0.3)';this.style.borderColor='${th.color}'"
            onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor=''">
            <div class="hc-icon" style="background:${th.bg};border-color:${th.border};color:${th.color};">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div class="hc-name">${name}</div>
            <div class="hc-desc" style="font-size:0.88rem;color:var(--muted);line-height:1.55;">${getCNCardDesc(name)}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;">
              <span class="hc-status live" style="background:${th.bg};color:${th.color};border:1px solid ${th.border};">📂 ${count} file${count===1?'':'s'}</span>
              <span style="font-size:0.78rem;font-weight:600;color:${th.color};">View →</span>
            </div>
          </div>
        </div>`;
      }).join('');
      if (catSection) catSection.style.display = 'block';
    }

    // ── Render flat video list (direct files only, not inside categories) ─
    const directFiles = CN.getFiles(section.id);
    const allCatFiles = cats.flatMap(c => CN.getFiles(c.id));
    const allFiles    = [...directFiles, ...allCatFiles];
    if (loading) loading.style.display = 'none';
    if (allFiles.length) {
      renderProdVideos(allFiles.map(f => ({ Product_name: f.name, Product_Url: f.url, fileId: f.id })));
    } else {
      if (loading) loading.style.display = 'none';
    }

  } catch(e) {
    const loading = document.getElementById('prod-vid-loading');
    const errEl   = document.getElementById('prod-vid-error');
    if (loading) loading.style.display = 'none';
    if (errEl)   { errEl.style.display='block'; errEl.innerHTML='<div style="padding:2rem;text-align:center;color:var(--muted);">⚠️ ' + e.message + '</div>'; }
  }
}

// Products overlay using shared renderer
function cnOpenProdOverlay(nodeId, catName) {
  // Reuse marketing overlay for products (same structure)
  const th = cnTheme(0);
  const iconEl = document.getElementById('mktOverlayIcon');
  if (iconEl) { iconEl.style.background = th.bg; iconEl.style.borderColor = th.border; iconEl.innerHTML = `<span style="font-size:1.4rem;">📂</span>`; }
  document.getElementById('mktOverlayTitle').textContent    = catName;
  document.getElementById('mktOverlaySub').textContent      = '';
  document.getElementById('mktOverlayLoader').style.display = 'none';
  document.getElementById('mktOverlayGrid').innerHTML       = '';
  document.getElementById('mktOverlayEmpty').style.display  = 'none';
  document.getElementById('marketingOverlay').style.display = 'block';
  document.body.style.overflow = 'hidden';
  _cnRenderOverlayContent(nodeId, catName, th, 'mktOverlayGrid', 'mktOverlaySub', 'mktOverlayEmpty', null);
}

function renderProdVideos(videos) {
  const loadEl = document.getElementById('prod-vid-loading');
  const gridEl = document.getElementById('prod-vid-grid');
  if (loadEl) loadEl.style.display = 'none';

  if (!videos || videos.length === 0) {
    const errEl = document.getElementById('prod-vid-error');
    if (errEl) { errEl.style.display = 'block'; document.getElementById('prod-vid-error-msg').textContent = 'No training videos found.'; }
    return;
  }

  const vidColors = ['#a855f7','#00d4aa','#4e9af1','#f0a500'];
  gridEl.style.display = 'grid';
  gridEl.innerHTML = videos.map((row, i) => {
    const name  = (row.Product_name || 'Video').trim();
    const url   = (row.Product_Url  || '').trim();
    const color = vidColors[i % vidColors.length];
    const bg    = color + '18';
    const border= color + '44';
    // Determine if URL is a direct video file or an embed link
    const isDirectVideo = url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i);
    const isYouTube     = url.includes('youtube.com') || url.includes('youtu.be');
    const isSupabase    = url.includes('supabase.co');
    let mediaHtml = '';
    if (isDirectVideo || isSupabase) {
      mediaHtml = `<video id="prod-vid-${i}" controls controlsList="nodownload noplaybackrate" disablePictureInPicture preload="metadata"
        onplay="pauseAllVideosExcept('prod-vid-${i}')"
        style="width:100%;height:100%;object-fit:cover;border-radius:12px 12px 0 0;display:block;background:#000;">
        <source src="${url}" type="video/mp4">
        <source src="${url}" type="video/webm">
        Your browser does not support the video tag.
      </video>`;
    } else if (isYouTube) {
      const ytId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || '';
      mediaHtml = ytId
        ? `<iframe src="https://www.youtube.com/embed/${ytId}" frameborder="0" allowfullscreen
            style="width:100%;height:100%;border-radius:12px 12px 0 0;display:block;"></iframe>`
        : `<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:0.85rem;color:var(--muted);">Preview unavailable</div>`;
    } else if (url) {
      mediaHtml = `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:${bg};">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="${color}" stroke="none"/></svg>
        <div style="font-size:0.78rem;color:var(--muted);text-align:center;padding:0 16px;">Click below to open video</div>
      </div>`;
    } else {
      mediaHtml = `<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:2.5rem;background:${bg};">🎥</div>`;
    }
    const fid = row.fileId;
    const delBtn = (fid && _isMIS()) ? `<button onclick="confirmDeleteFile(${fid},'${url.replace(/'/g,"\'")}')" title="Delete"
      style="position:absolute;top:8px;right:8px;z-index:3;width:30px;height:30px;border-radius:8px;background:rgba(239,68,68,0.85);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;"
      onmouseover="this.style.background='rgba(239,68,68,1)'" onmouseout="this.style.background='rgba(239,68,68,0.85)'">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
    </button>` : '';
    return `
    <div style="position:relative;background:var(--surface);border:1.5px solid ${border};border-radius:14px;overflow:hidden;
                box-shadow:0 4px 20px rgba(0,0,0,0.2);transition:transform 0.22s,box-shadow 0.22s;"
         onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 36px rgba(0,0,0,0.35)'"
         onmouseout="this.style.transform='';this.style.boxShadow='0 4px 20px rgba(0,0,0,0.2)'">
      ${delBtn}
      <div style="width:100%;height:200px;overflow:hidden;position:relative;background:#000;">${mediaHtml}</div>
      <div style="padding:14px 16px 16px;border-top:1px solid var(--border);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="width:32px;height:32px;border-radius:8px;background:${bg};border:1px solid ${border};
                      display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          </div>
          <div style="font-weight:700;font-size:0.95rem;color:var(--text);line-height:1.3;">${name}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ---- ORG CHART OVERLAY (Supabase Documents) ----
function openOrgChartPicker() {
  _actOnCardOpen('Organization Chart'); // ACTIVITY TRACKING
  document.getElementById('orgChartOverlay').style.display = 'flex';
  document.getElementById('orgChartPicker').style.display = 'block';
  document.getElementById('orgChartDocScreen').style.display = 'none';
  document.body.style.overflow = 'hidden';
}

function backToOrgChartPicker() {
  document.getElementById('orgChartPicker').style.display = 'block';
  document.getElementById('orgChartDocScreen').style.display = 'none';
}

async function openOrgChartOverlay(moduleType) {
  const isHead    = moduleType === 'Head Office';
  const accentClr = isHead ? '#14b8a6' : '#6366f1';

  const loader  = document.getElementById('orgChartOverlayLoader');
  const grid    = document.getElementById('orgChartOverlayGrid');
  const emptyEl = document.getElementById('orgChartOverlayEmpty');
  const errorEl = document.getElementById('orgChartOverlayError');

  try {
    // Show loader briefly while fetching
    document.getElementById('orgChartPicker').style.display = 'none';
    const docScreen = document.getElementById('orgChartDocScreen');
    docScreen.style.display = 'block';
    loader.style.display  = 'block';
    grid.style.display    = 'none';
    emptyEl.style.display = 'none';
    errorEl.style.display = 'none';
    grid.innerHTML        = '';

    document.getElementById('orgChartOverlayTitle').textContent = isHead ? '🏢 Head Office — Org Charts' : '🏬 Branch Offices — Org Charts';
    document.getElementById('orgChartOverlaySub').textContent   = isHead
      ? 'Mumbai Head Office organizational structure.'
      : 'Goa, Bengaluru, Ahmedabad and other branch office org charts.';

    // Use CN — content_nodes + files
    await CN.load();
    const hrSection = CN.getSection('HR');
    let docs = [];
    if (hrSection) {
      const cats = CN.getCategories(hrSection.id);
      const orgCat = cats.find(c => (c.name||'').toLowerCase().includes('organization') || (c.name||'').toLowerCase().includes('org chart'));
      if (orgCat) {
        if (isHead) {
          // Direct files of Organisation Chart node
          const directFiles = CN.getFiles(orgCat.id);
          docs = directFiles.map(f => ({ Doc_Name: f.name, Doc_Link: f.url }));
        } else {
          // Branch Office sub-category
          const subCats = CN.getCategories(orgCat.id);
          const branchCat = subCats.find(c => (c.name||'').toLowerCase().includes('branch'));
          if (branchCat) {
            docs = CN.getFiles(branchCat.id).map(f => ({ Doc_Name: f.name, Doc_Link: f.url }));
          }
        }
      }
    }

    loader.style.display = 'none';

    if (!docs.length) {
      emptyEl.style.display = 'block';
      return;
    }

    // Head Office — if only 1 doc, open directly
    if (isHead && docs.length === 1) {
      closeOrgChartOverlay();
      openFileViewer(docs[0].Doc_Link, docs[0].Doc_Name || 'Org Chart');
      return;
    }

    // Branch Office (ya multiple docs) — compact horizontal cards
    grid.style.display = 'flex';
    grid.style.flexDirection = 'column';
    grid.style.gap = '10px';
    grid.innerHTML = docs.map(doc => {
      const safeLink = (doc.Doc_Link||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');
      const safeName = (doc.Doc_Name||'Org Chart').replace(/'/g,"\\'").replace(/"/g,'&quot;');
      return `
      <a href="${doc.Doc_Link}" onclick="openFileViewer('${safeLink}','${safeName}');return false;" style="text-decoration:none;cursor:pointer;">
        <div style="background:var(--surface2);border:1.5px solid ${accentClr}33;border-left:4px solid ${accentClr};border-radius:12px;padding:14px 16px;cursor:pointer;transition:all 0.18s;display:flex;align-items:center;gap:14px;"
             onmouseover="this.style.background='${accentClr}12';this.style.borderColor='${accentClr}88';"
             onmouseout="this.style.background='var(--surface2)';this.style.borderColor='${accentClr}33';">
          <div style="width:40px;height:40px;min-width:40px;border-radius:10px;background:${accentClr}18;border:1px solid ${accentClr}44;display:flex;align-items:center;justify-content:center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${accentClr}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><rect x="1" y="17" width="6" height="4" rx="1"/><rect x="9" y="17" width="6" height="4" rx="1"/><rect x="17" y="17" width="6" height="4" rx="1"/><path d="M12 6v4M4 17v-3a2 2 0 012-2h12a2 2 0 012 2v3"/><line x1="12" y1="10" x2="12" y2="12"/></svg>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.95rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${doc.Doc_Name}</div>
            <div style="font-size:0.78rem;color:${accentClr};margin-top:3px;">🔗 Open Document</div>
          </div>
          <span style="color:${accentClr};font-size:1.1rem;flex-shrink:0;">→</span>
        </div>
      </a>`;
    }).join('');

  } catch(e) {
    loader.style.display  = 'none';
    errorEl.style.display = 'block';
    errorEl.textContent   = 'Error loading documents: ' + e.message;
  }
}

function closeOrgChartOverlay() {
  document.getElementById('orgChartOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

function openDirectoryOverlay() {
  _actOnCardOpen('Directory'); // ACTIVITY TRACKING
  document.getElementById('directoryOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeDirectoryOverlay() {
  document.getElementById('directoryOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

// Icon/color map keyed by lowercase title keywords
function getMISVideoMeta(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('checklist') || t.includes('task'))
    return { icon: '✅', color: '#00d4aa', desc: 'Task Checklist — training on how to use checklists in daily operations.' };
  if (t.includes('how to') && (t.includes('fms') || t.includes('fleet')))
    return { icon: '🎯', color: '#3b82f6', desc: 'FMS step-by-step guide — learn how to use it practically.' };
  if (t.includes('fms') || t.includes('fleet'))
    return { icon: '🚗', color: '#f0a500', desc: 'Fleet Management System — training on vehicle tracking, trips and fuel monitoring.' };
  if (t.includes('odoo'))
    return { icon: '🏢', color: '#a855f7', desc: 'Odoo ERP — training on purchase, sales and inventory management.' };
  if (t.includes('pre-sales') || t.includes('presales') || t.includes('pre sales') || t.includes('lead') || t.includes('demo') || t.includes('proposal'))
    return { icon: '🤝', color: '#e879f9', desc: 'Pre-Sales — training on lead handling, demos, proposals and client communication.' };
  if (t.includes('looker'))
    return { icon: '📈', color: '#3b82f6', desc: 'Looker Studio — training on building data visualizations and dashboards.' };
  if (t.includes('cool bus') || t.includes('coolbus'))
    return { icon: '🚌', color: '#22c55e', desc: 'Cool Bus — training on vehicle tracking and route management.' };
  if (t.includes('smart fleet') || t.includes('smartfleet'))
    return { icon: '🛰️', color: '#f97316', desc: 'Smart Fleet — training on fleet monitoring and operations.' };
  if (t.includes('pc') || t.includes('process'))
    return { icon: '💼', color: '#ec4899', desc: 'Process Coordinator — training on coordination workflows and closing procedures.' };
  if (t.includes('part'))
    return { icon: '📹', color: '#6366f1', desc: 'Training video — step-by-step guide.' };
  return { icon: '🎬', color: '#f0a500', desc: 'Training video.' };
}

// Loaded videos (array of {id, Title, Video_URL})
let misVideosData = [];

// ── Fetch MIS videos from content_nodes + files tables ──
async function fetchMISVideos() {
  const cardsEl = document.getElementById('mis-video-cards');
  cardsEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted);font-size:0.92rem;">Loading...</div>`;
  try {
    await CN.load();
    const section = CN.getSection('Training');
    const cat = section
      ? CN.getCategories(section.id).find(c => (c.name||'').toLowerCase().includes('mis'))
      : null;
    const files = cat ? CN.getFiles(cat.id) : [];
    misVideosData = files.map(f => ({ id: f.id, Title: f.name, Video_URL: f.url }));
    renderMISVideoCards(misVideosData);
  } catch(err) {
    cardsEl.innerHTML = `<div style="text-align:center;padding:20px;color:#ef4444;font-size:0.9rem;">Failed to load videos.<br><span style="font-size:0.78rem;color:var(--muted);">${err.message}</span></div>`;
  }
}

function renderMISVideoCards(data) {
  const cardsEl = document.getElementById('mis-video-cards');
  if (!data || data.length === 0) {
    cardsEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);">No videos found.</div>`;
    return;
  }

  cardsEl.innerHTML = data.map((row, idx) => {
    const meta = getMISVideoMeta(row.Title);
    const safeTitle = (row.Title||'').toLowerCase().replace(/"/g,'&quot;');
    const rowId = row.id || row.ID || '';
    const delBtnHtml = rowId ? `<button onclick="event.stopPropagation();confirmDeleteTrainingVideo(${rowId},'${safeTitle}',null)" title="Delete video"
      style="width:28px;height:28px;border-radius:8px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;"
      onmouseover="this.style.background='rgba(239,68,68,0.28)'" onmouseout="this.style.background='rgba(239,68,68,0.12)'">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
    </button>` : '';
    return `
      <div data-vtitle="${safeTitle}" onclick="playMISVideo(${idx})"
           style="cursor:pointer;padding:16px;border-radius:12px;border:1.5px solid ${meta.color}44;background:${meta.color}12;transition:all 0.18s;"
           onmouseover="this.style.borderColor='${meta.color}bb';this.style.background='${meta.color}22'"
           onmouseout="this.style.borderColor='${meta.color}44';this.style.background='${meta.color}12'">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:48px;height:48px;border-radius:10px;background:${meta.color}28;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">${meta.icon}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;color:var(--text);font-size:1.00rem;">${row.Title}</div>
            <div style="font-size:0.81rem;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Training Video</div>
          </div>
          ${delBtnHtml}
          <div style="width:36px;height:36px;border-radius:50%;background:${meta.color};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="color:#fff;font-size:0.85rem;margin-left:2px;">▶</span>
          </div>
        </div>
      </div>`;
  }).join('');
  // Re-apply search filter if user already typed something before re-render
  if (typeof filterMISVideos === 'function') filterMISVideos();
}

// ── Play video by index ──
function playMISVideo(idx) {
  const row  = misVideosData[idx];
  if (!row) return;
  const meta = getMISVideoMeta(row.Title);

  document.getElementById('mis-video-title').textContent    = `${meta.icon} ${row.Title}`;
  document.getElementById('mis-video-subtitle').textContent = 'Training Video';
  document.getElementById('mis-video-desc').textContent     = meta.desc;

  const videoEl = document.getElementById('mis-main-video');
  pauseAllVideosExcept('mis-main-video');
  videoEl.src = row.Video_URL;   // direct URL from DB column
  videoEl.load();

  document.getElementById('mis-video-list').style.display   = 'none';
  document.getElementById('mis-video-player').style.display = 'block';
}

function backToMISVideoList() {
  const v = document.getElementById('mis-main-video');
  if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
  document.getElementById('mis-video-player').style.display = 'none';
  document.getElementById('mis-video-list').style.display   = 'block';
}

function startQuiz(moduleKey) {
  currentQuizModule = MIS_QUIZ_MODULES[moduleKey];
  currentQuestionIndex = 0;
  userAnswers = [];
  document.getElementById('mis-quiz-menu').style.display = 'none';
  document.getElementById('mis-quiz-question-screen').style.display = 'block';
  document.getElementById('mis-quiz-result-screen').style.display = 'none';
  renderQuestion();
}

function renderQuestion() {
  const mod = currentQuizModule;
  const q = mod.questions[currentQuestionIndex];
  const total = mod.questions.length;
  const screen = document.getElementById('mis-quiz-question-screen');
  screen.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
      <button onclick="document.getElementById('mis-quiz-menu').style.display='block';document.getElementById('mis-quiz-question-screen').style.display='none';" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.26rem;padding:0;">←</button>
      <div>
        <div style="font-weight:700;font-size:1rem;color:var(--text);">${mod.icon} ${mod.title}</div>
        <div style="font-size:0.82rem;color:var(--muted);">${mod.subtitle}</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <span style="font-size:0.88rem;color:var(--muted);">Question ${currentQuestionIndex+1} of ${total}</span>
      <span style="font-size:0.88rem;font-weight:700;color:${mod.color};">${Math.round(((currentQuestionIndex)/total)*100)}% done</span>
    </div>
    <div style="background:var(--border);border-radius:4px;height:5px;margin-bottom:20px;">
      <div style="background:${mod.color};height:5px;border-radius:4px;width:${((currentQuestionIndex)/total)*100}%;transition:width 0.3s;"></div>
    </div>
    <div style="font-size:1rem;font-weight:600;color:var(--text);margin-bottom:20px;line-height:1.5;">${q.q}</div>
    <div style="display:flex;flex-direction:column;gap:10px;" id="quiz-options">
      ${q.opts.map((opt,i)=>`
        <button onclick="selectAnswer(${i})" id="opt-btn-${i}" style="text-align:left;padding:12px 16px;border-radius:10px;border:1.5px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;font-size:0.97rem;transition:all 0.18s;font-family:inherit;">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:var(--border);font-weight:700;font-size:0.82rem;margin-right:10px;">${['A','B','C','D'][i]}</span>
          ${opt}
        </button>
      `).join('')}
    </div>
    <div id="quiz-next-area" style="margin-top:18px;display:none;">
      <button onclick="nextQuestion()" style="width:100%;padding:12px;border-radius:10px;border:none;background:${mod.color};color:#fff;font-weight:700;font-size:1.03rem;cursor:pointer;font-family:inherit;">
        ${currentQuestionIndex < total-1 ? 'Next Question →' : 'Submit Quiz 🎯'}
      </button>
    </div>
  `;
}

function selectAnswer(selectedIndex) {
  const mod = currentQuizModule;
  const q = mod.questions[currentQuestionIndex];
  const isCorrect = selectedIndex === q.ans;
  userAnswers[currentQuestionIndex] = selectedIndex;

  // Disable all buttons and show correct/wrong
  const opts = document.querySelectorAll('[id^="opt-btn-"]');
  opts.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.ans) {
      btn.style.background = 'rgba(34,197,94,0.15)';
      btn.style.borderColor = '#22c55e';
      btn.style.color = '#22c55e';
    } else if (i === selectedIndex && !isCorrect) {
      btn.style.background = 'rgba(239,68,68,0.15)';
      btn.style.borderColor = '#ef4444';
      btn.style.color = '#ef4444';
    }
  });
  document.getElementById('quiz-next-area').style.display = 'block';
}

function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex < currentQuizModule.questions.length) {
    renderQuestion();
  } else {
    showResult();
  }
}

function showResult() {
  const mod = currentQuizModule;
  const total = mod.questions.length;
  let score = 0;
  userAnswers.forEach((ans, i) => { if (ans === mod.questions[i].ans) score++; });
  const pct = Math.round((score/total)*100);
  let emoji = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚';
  let msg = pct >= 80 ? 'Excellent Work!' : pct >= 60 ? 'Good Job!' : 'Keep Learning!';
  let msgColor = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f0a500' : '#ef4444';

  document.getElementById('mis-quiz-question-screen').style.display = 'none';
  const result = document.getElementById('mis-quiz-result-screen');
  result.style.display = 'block';
  result.innerHTML = `
    <div style="text-align:center;padding:10px 0;">
      <div style="font-size:3.5rem;margin-bottom:10px;">${emoji}</div>
      <div style="font-size:1.36rem;font-weight:800;color:${msgColor};margin-bottom:4px;">${msg}</div>
      <div style="font-size:0.91rem;color:var(--muted);margin-bottom:24px;">${mod.icon} ${mod.title}</div>
      <div style="display:inline-flex;align-items:center;justify-content:center;width:110px;height:110px;border-radius:50%;border:6px solid ${msgColor};margin:0 auto 20px;">
        <div>
          <div style="font-size:1.8rem;font-weight:900;color:${msgColor};">${score}/${total}</div>
          <div style="font-size:0.85rem;color:var(--muted);">${pct}%</div>
        </div>
      </div>
      <div style="background:var(--surface2);border-radius:12px;padding:14px;margin-bottom:18px;max-height:220px;overflow-y:auto;">
        <div style="font-size:0.88rem;font-weight:700;color:var(--text);margin-bottom:10px;text-align:left;">Review Answers</div>
        ${mod.questions.map((q,i)=>`
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:10px;text-align:left;">
            <span style="font-size:0.94rem;">${userAnswers[i]===q.ans?'✅':'❌'}</span>
            <div>
              <div style="font-size:0.85rem;color:var(--text);font-weight:600;">Q${i+1}: ${q.q}</div>
              <div style="font-size:0.82rem;color:${userAnswers[i]===q.ans?'#22c55e':'#ef4444'};">Your answer: ${q.opts[userAnswers[i]]}</div>
              ${userAnswers[i]!==q.ans?`<div style="font-size:0.82rem;color:#22c55e;">Correct: ${q.opts[q.ans]}</div>`:''}
            </div>
          </div>
        `).join('')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
        <button onclick="startQuiz('${Object.keys(MIS_QUIZ_MODULES).find(k=>MIS_QUIZ_MODULES[k].title===mod.title)}')" style="flex:1;min-width:120px;padding:10px 16px;border-radius:10px;border:1.5px solid ${mod.color};background:transparent;color:${mod.color};font-weight:700;font-size:0.94rem;cursor:pointer;font-family:inherit;">🔄 Retry</button>
        <button onclick="document.getElementById('mis-quiz-menu').style.display='block';document.getElementById('mis-quiz-result-screen').style.display='none';" style="flex:1;min-width:120px;padding:10px 16px;border-radius:10px;border:none;background:${mod.color};color:#fff;font-weight:700;font-size:0.94rem;cursor:pointer;font-family:inherit;">← Other Quizzes</button>
        <a href="${mod.driveUrl}" target="_blank" style="flex:1;min-width:120px;text-decoration:none;"><button style="width:100%;padding:10px 16px;border-radius:10px;border:1.5px solid var(--border);background:var(--surface2);color:var(--text);font-weight:600;font-size:0.91rem;cursor:pointer;font-family:inherit;">📁 Open Drive</button></a>
      </div>
    </div>
  `;
}



// ============================================================


/* ────────────────────────────────────────────────────────────
   FILE VIEWER — opens Google Drive folders/files inside portal
   ──────────────────────────────────────────────────────────── */

// Convert any Google Drive URL to its embeddable form
function toDriveEmbedUrl(url){
  if(!url) return url;
  try{
    // 1) Folder URL:  /drive/folders/FOLDER_ID  →  embeddedfolderview
    var folderMatch = url.match(/\/drive\/folders\/([a-zA-Z0-9_-]+)/);
    if(folderMatch){
      return 'https://drive.google.com/embeddedfolderview?id=' + folderMatch[1] + '#grid';
    }
    // 2) File URL:  /file/d/FILE_ID/...  →  /preview
    var fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if(fileMatch){
      return 'https://drive.google.com/file/d/' + fileMatch[1] + '/preview';
    }
    // 3) Google Docs / Sheets / Slides  →  /preview
    var docMatch = url.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
    if(docMatch){
      return 'https://docs.google.com/' + docMatch[1] + '/d/' + docMatch[2] + '/preview';
    }
    // 4) open?id=ID  →  file preview
    var openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if(openMatch && url.indexOf('drive.google.com')>=0){
      return 'https://drive.google.com/file/d/' + openMatch[1] + '/preview';
    }
  }catch(e){}
  return url; // fallback: raw URL
}

// Detect direct video file from URL
function isDirectVideoUrl(url){
  if(!url) return false;
  var ext = url.split('?')[0].split('#')[0].split('.').pop().toLowerCase();
  return ['mp4','webm','mov','m4v','ogg','ogv'].indexOf(ext) >= 0;
}

// Open any URL inside the in-page viewer modal

// ═══════════════════════════════════════════════════════════
// DIRECTORY DOC — Seedha Supabase se link fetch karke open karo
// ═══════════════════════════════════════════════════════════
async function openDirectoryDoc(module, displayName) {
  closeDirectoryOverlay();
  try {
    await CN.load();
    const hrSection = CN.getSection('HR');
    let fileData = null;
    if (hrSection) {
      const cats = CN.getCategories(hrSection.id);
      const dirCat = cats.find(c => (c.name||'').toLowerCase().includes('director'));
      if (dirCat) {
        const subCats = CN.getCategories(dirCat.id);
        const match = subCats.find(c => (c.name||'').toLowerCase().includes(module.trim().toLowerCase()));
        if (match) {
          const files = CN.getFiles(match.id);
          if (files.length) fileData = files[0];
        }
        // Also try direct files of directory node
        if (!fileData) {
          const direct = CN.getFiles(dirCat.id);
          if (direct.length) fileData = direct[0];
        }
      }
    }
    if (fileData && fileData.url) {
      openFileViewer(fileData.url, fileData.name || displayName || 'Document');
    } else {
      alert('No file found for ' + (displayName || module) + '. Please add files in the files table.');
    }
  } catch(e) {
    alert('Error: ' + e.message);
  }
}

function openFileViewer(url, title){
  if(!url) return;

  // Track file/video open
  const _isYT  = /(?:youtube\.com|youtu\.be)/i.test(url);
  const _isVid = /\.(mp4|webm|mov)(\?|$)/i.test(url);
  const _isPdf = /\.pdf(\?|$)/i.test(url);
  const _evType = _isYT || _isVid ? 'video_play' : 'file_open';
  logActivity({
    event_type:   _evType,
    event_detail: (_isYT ? 'YouTube: ' : _isVid ? 'Video: ' : _isPdf ? 'PDF: ' : 'File: ') + (title||url),
    page_name:    _actPageName || 'unknown',
    card_name:    _actCardName || '',
    video_title:  (_isYT || _isVid) ? (title||url) : null,
    file_name:    (!_isYT && !_isVid) ? (title||url) : null,
  });

  // YouTube link → seedha new tab mein kholo (iframe mein nahi chalega)
  if(_isYT) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  var ov = document.getElementById('file-viewer-overlay');
  if(!ov) return;

  document.getElementById('file-viewer-title').textContent = title || 'Documents';

  var body    = document.getElementById('file-viewer-body');
  var frame   = document.getElementById('file-viewer-frame');
  var loading = document.getElementById('file-viewer-loading');
  var mask    = document.getElementById('file-viewer-dl-mask');
  var mask2   = document.getElementById('file-viewer-dl-mask2');

  // If it's a direct video file, render a <video> tag instead of iframe
  if(isDirectVideoUrl(url)){
    frame.src = 'about:blank';
    frame.style.display = 'none';
    loading.style.display = 'none';
    if(mask)  mask.style.display  = 'none';
    if(mask2) mask2.style.display = 'none';
    // Training video jaisa exact approach — static HTML element, direct src set, sirf load()
    var vid = document.getElementById('file-viewer-video');
    vid.style.display = 'block';
    pauseAllVideosExcept('file-viewer-video');
    vid.src = url;   // playModuleVideo jaisa — seedha src assign
    vid.load();      // sirf load — no autoplay (training video approach)
  } else {
    // Document / folder → iframe with embeddable URL
    var vid = document.getElementById('file-viewer-video');
    if(vid){ try{vid.pause();}catch(e){} vid.removeAttribute('src'); vid.load(); vid.style.display='none'; }

    // Mobile/PWA detect: Android Chrome iframe mein PDF "Open" button + pencil aata hai
    // Fix: mobile par seedha Google Drive preview new tab mein kholo
    var isIPad = /iPad/i.test(navigator.userAgent)
             || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isPhone = /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent) && !isIPad;
    var isMobile = isPhone;

    if(isMobile){
      // Modal band karo aur Google Drive preview seedha new tab mein kholo
      ov.style.display = 'none';
      document.body.style.overflow = '';
      // Drive embed URL ki jagah original preview URL use karo
      var mobileUrl = toDriveEmbedUrl(url);
      window.open(mobileUrl, '_blank');
      return;
    }

    frame.style.display = 'block';
    loading.style.display = 'flex';
    var embedUrl = toDriveEmbedUrl(url);
    // Add #toolbar=0 hint (works on Chrome native PDF viewer; harmless otherwise)
    if(embedUrl.indexOf('#') === -1) embedUrl += '#toolbar=0';
    frame.src = embedUrl;

    var isGoogle = /drive\.google\.com|docs\.google\.com/.test(embedUrl);
    // Safari detect karo
    var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if(isGoogle){
      if(isSafari){
        // Safari fix: toolbar clip nahi karte — seedha normal size rakhte hain
        // Safari mein calc(100% + 128px) scroll tod deta hai
        frame.style.top    = '0';
        frame.style.height = '100%';
        if(mask)  mask.style.display  = 'none';
        if(mask2) mask2.style.display = 'none';
      } else {
        // 🔒 CLIP TOOLBAR: shift iframe UP by 64px so Google's toolbar is outside visible area.
        //     Parent has overflow:hidden so the shifted-off part is invisible & unclickable.
        frame.style.top    = '-64px';
        frame.style.height = 'calc(100% + 128px)'; // extend bottom too to hide any bottom bar
        if(mask)  mask.style.display  = 'block';   // backup mask in case clip fails
        if(mask2) mask2.style.display = 'block';
      }
    } else {
      frame.style.top    = '0';
      frame.style.height = '100%';
      if(mask)  mask.style.display  = 'none';
      if(mask2) mask2.style.display = 'none';
    }
  }

  ov.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeFileViewer(){
  var frame = document.getElementById('file-viewer-frame');
  if(frame) frame.src = 'about:blank';
  var vid = document.getElementById('file-viewer-video');
  if(vid){ try{vid.pause();}catch(e){} vid.removeAttribute('src'); vid.load(); vid.style.display='none'; }
  document.getElementById('file-viewer-overlay').style.display = 'none';
  document.body.style.overflow = '';
}

// Click outside modal to close
document.getElementById('file-viewer-overlay').addEventListener('click', function(e){
  if(e.target === this) closeFileViewer();
});

// Escape key closes file viewer
document.addEventListener('keydown', function(e){
  var ov = document.getElementById('file-viewer-overlay');
  var isOpen = ov && ov.style.display === 'flex';
  if(e.key === 'Escape' && isOpen){ closeFileViewer(); return; }
});

/* Auto-intercept: any <a> tag pointing to drive.google.com or docs.google.com
   with a data-inline-view attribute (or matching folder/file pattern) opens
   inside the viewer instead of a new tab. This is a safety net — primary
   hookup is the onclick handler added on each link below. */
document.addEventListener('click', function(e){
  var a = e.target.closest && e.target.closest('a[data-inline-view]');
  if(!a) return;
  e.preventDefault();
  var title = a.getAttribute('data-title') ||
              (a.querySelector('.hc-name') ? a.querySelector('.hc-name').textContent.trim() : 'Documents');
  openFileViewer(a.href, title);
});

// ══════════════════════════════════════════════════════════
// HOLIDAY LIST  — Supabase fetch, location-wise filter
// ══════════════════════════════════════════════════════════
let _holidayAllData = [];   // raw data from Supabase
let _holidayFetched = false;

async function loadHolidayCard() {
  if (_holidayFetched) { renderHolidayCard(); return; }
  try {
    // Holiday List RLS policy is on 'anon' role — always use anon key (not user JWT)
    const anonHdrs = { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}`, 'Accept': 'application/json' };
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/Holiday%20List?select=*&order=Date.asc`,
      { headers: anonHdrs }
    );
    if (!res.ok) throw new Error('HTTP ' + res.status);
    _holidayAllData = await res.json();
    _holidayFetched = true;
  } catch(e) {
    document.getElementById('holidayLoading').innerHTML =
      `<span style="color:var(--accent3);">⚠️ Failed to load holiday data. (${e.message})</span>`;
    return;
  }
  renderHolidayCard();
}

function _holLocClass(loc) {
  const l = (loc||'').toLowerCase();
  if (l.includes('goa'))       return 'hol-branch-goa';
  if (l.includes('bangalore') || l.includes('bengaluru')) return 'hol-branch-bangalore';
  if (l.includes('gujarat'))   return 'hol-branch-gujarat';
  if (l.includes('mumbai'))    return 'hol-branch-mumbai';
  return 'hol-branch-all';
}

function _holNormLoc(loc) {
  const l = (loc||'').toLowerCase().trim();
  if (l.includes('goa'))       return 'Goa';
  if (l.includes('bangalore') || l.includes('bengaluru')) return 'Bangalore';
  if (l.includes('gujarat') || l.includes('surat') || l.includes('ahmedabad')) return 'Gujarat';
  if (l.includes('mumbai') || l.includes('head office')) return 'Mumbai';
  return loc || 'All';
}

function renderHolidayCard(branchFilter) {
  const isOwner = CURRENT_USER && (CURRENT_USER.role === 'owner' ||
    ['managing director','mis','pc','executive assistant','ea'].includes((CURRENT_USER.rawRole||'').toLowerCase()));

  // Show branch tabs for Managing Director/mis/pc
  const tabsEl = document.getElementById('holidayBranchTabs');
  if (isOwner) tabsEl.style.display = 'flex';

  // Determine which location to show
  const empLoc = _holNormLoc(
    (CURRENT_USER && CURRENT_USER.location) ? CURRENT_USER.location : 'Mumbai'
  );

  // Badge
  const badgeEl = document.getElementById('holidayBranchBadge');
  if (isOwner) {
    const bf = branchFilter || 'Mumbai';
    badgeEl.textContent = '📍 ' + bf;
  } else {
    badgeEl.textContent = '📍 ' + empLoc;
  }

  // Filter data
  let rows = _holidayAllData;
  if (isOwner) {
    const bf = branchFilter || 'Mumbai';
    rows = rows.filter(r => _holNormLoc(r['Location']) === bf);
  } else if (!isOwner) {
    // Employee: sirf apni location ke holidays
    rows = rows.filter(r => {
      const rl = _holNormLoc(r['Location']);
      return rl === empLoc;
    });
  }

  // Sort by date
  rows = [...rows].sort((a,b) => new Date(a['Date']) - new Date(b['Date']));

  // Build table
  const today = new Date();
  today.setHours(0,0,0,0);
  let nextHol = null;

  const tbody = document.getElementById('holidayTbody');
  if (!rows.length) {
    tbody.innerHTML = '';
    document.getElementById('holidayLoading').style.display = 'none';
    document.getElementById('holidayTableWrap').style.display = 'none';
    document.getElementById('holidayEmpty').style.display = 'block';
    document.getElementById('nextHolidayBanner').style.display = 'none';
    return;
  }

  let html = '';
  let sr = 1;
  rows.forEach(r => {
    const hDate = new Date(r['Date']);
    hDate.setHours(0,0,0,0);
    const diff = Math.round((hDate - today) / 86400000);
    let statusClass, statusLabel, rowClass = 'hol-row';

    if (diff < 0) {
      statusClass = 'hol-status-past'; statusLabel = 'Past'; rowClass += ' past';
    } else if (diff === 0) {
      statusClass = 'hol-status-today'; statusLabel = '🎉 Today!'; rowClass += ' today';
    } else {
      statusClass = 'hol-status-upcoming'; statusLabel = 'Upcoming';
      if (!nextHol) nextHol = { ...r, diff };
    }

    const locNorm = _holNormLoc(r['Location']);
    const locClass = _holLocClass(r['Location']);
    const dateStr = hDate.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

    html += `<tr class="${rowClass}">
      <td style="padding:9px 12px;color:var(--muted);font-size:0.78rem;">${sr++}</td>
      <td style="padding:9px 12px;font-weight:600;color:var(--text);">${r['Holiday']||'—'}</td>
      <td style="padding:9px 12px;color:var(--text2);white-space:nowrap;">${dateStr}</td>
      <td style="padding:9px 12px;color:var(--text2);">${r['Day']||'—'}</td>
      <td style="padding:9px 12px;"><span class="hol-branch-pill ${locClass}">${locNorm}</span></td>
      <td style="padding:9px 12px;"><span class="hol-status-badge ${statusClass}">${statusLabel}</span></td>
    </tr>`;
  });

  tbody.innerHTML = html;
  document.getElementById('holidayLoading').style.display = 'none';
  document.getElementById('holidayTableWrap').style.display = 'block';
  document.getElementById('holidayEmpty').style.display = 'none';

  // Next holiday banner
  if (nextHol) {
    const nd = new Date(nextHol['Date']);
    const dateStr2 = nd.toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
    document.getElementById('nextHolName').textContent = nextHol['Holiday'];
    document.getElementById('nextHolMeta').textContent = `${nextHol['Day']}, ${dateStr2} • ${_holNormLoc(nextHol['Location'])}`;
    document.getElementById('nextHolDays').textContent = nextHol.diff;
    document.getElementById('nextHolidayBanner').style.display = 'flex';
  } else {
    document.getElementById('nextHolidayBanner').style.display = 'none';
  }
}

function filterHolidayBranch(branch) {
  // Update active tab
  document.querySelectorAll('.hol-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.branch === branch);
  });
  renderHolidayCard(branch);
}

// Auto-load when home panel is shown
(function() {
  const _origShowPortal = typeof showPortal === 'function' ? showPortal : null;
  // Hook into panel navigation
  const _origNavClick = typeof navClick === 'function' ? navClick : null;
  // Watch for home panel visibility
  const _homeObs = new MutationObserver(() => {
    const hp = document.getElementById('panel-home');
    if (hp && hp.classList.contains('active')) {
      if (!_holidayFetched && typeof SUPABASE_URL !== 'undefined') {
        loadHolidayCard();
      }
    }
  });
  const hpEl = document.getElementById('panel-home');
  if (hpEl) {
    _homeObs.observe(hpEl, { attributes: true, attributeFilter: ['class'] });
  }
  // Also try on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        if (typeof SUPABASE_URL !== 'undefined' && typeof CURRENT_USER !== 'undefined' && CURRENT_USER) {
          loadHolidayCard();
        }
      }, 1500);
    });
  } else {
    setTimeout(() => {
      const hp2 = document.getElementById('panel-home');
      if (hp2 && hp2.classList.contains('active') && typeof SUPABASE_URL !== 'undefined') {
        if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER) loadHolidayCard();
      }
    }, 1500);
  }
})();

// Also expose so showPortal can call it
function maybeLoadHolidayCard() {
  if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER && typeof SUPABASE_URL !== 'undefined') {
    loadHolidayCard();
  }
}

function openHolidayOverlay() {
  _actOnCardOpen('Holiday List'); // ACTIVITY TRACKING
  const overlay = document.getElementById('holidayOverlay');
  if (overlay) {
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
    if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER && typeof SUPABASE_URL !== 'undefined') {
      loadHolidayCard();
    }
  }
}

function closeHolidayOverlay() {
  _actOnCardClose(); // ACTIVITY TRACKING
  const overlay = document.getElementById('holidayOverlay');
  if (overlay) {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// Close holiday overlay on backdrop click
document.addEventListener('DOMContentLoaded', function() {
  const hOverlay = document.getElementById('holidayOverlay');
  if (hOverlay) {
    hOverlay.addEventListener('click', function(e) {
      if (e.target === hOverlay) closeHolidayOverlay();
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// UNIVERSAL UPLOAD SYSTEM
// Flow: choose section → pick/create card → pick file → upload to
//       Supabase Storage bucket "files" → insert row in "files" table
// ═══════════════════════════════════════════════════════════════════════════
const UPLOAD_PASSWORD = 'aditi@upload2026'; // change as needed

let _uploadSection  = null;   // e.g. 'Sales'
let _uploadMode     = 'existing';  // 'existing' | 'new'
let _uploadFile     = null;   // File object
let _uploadCats     = [];     // content_node categories for this section

// ── Open modal ───────────────────────────────────────────────────────────
async function openUploadModal(sectionName) {
  // Role gate — only MIS can upload
  const _role = CURRENT_USER ? String(CURRENT_USER.rawRole || CURRENT_USER.role || '').toLowerCase().trim() : '';
  if (_role !== 'mis') {
    alert('⛔ Upload access is restricted to MIS users only.');
    return;
  }
  _uploadSection = sectionName;
  _uploadFile    = null;
  _uploadFiles   = [];
  _uploadMode    = 'existing';
  _uploadType    = 'file';

  document.getElementById('uploadModalTitle').textContent = 'Upload to ' + sectionName;
  document.getElementById('uploadModalSub').textContent   = 'Choose a card then pick your file';
  document.getElementById('uploadStatus').style.display   = 'none';
  document.getElementById('uploadProgress').style.display = 'none';
  document.getElementById('uploadDropLabel').textContent  = 'Click to choose or drag & drop a file';
  document.getElementById('uploadDropMeta').textContent   = 'PDF, Video, Image, Doc — any format';
  document.getElementById('uploadFileName').value         = '';
  document.getElementById('uploadNewCardName').value      = '';
  document.getElementById('uploadProgressBar').style.width = '0%';
  document.getElementById('uploadSubmitBtn').disabled     = false;
  document.getElementById('uploadFileInput').value        = '';
  document.getElementById('uploadDropZone').style.borderColor = '';
  document.getElementById('uploadDropZone').style.background  = '';
  const mflReset = document.getElementById('multiFileList');
  if (mflReset) mflReset.style.display = 'none';
  const subW = document.getElementById('uploadSubCardWrap');
  if (subW) subW.style.display = 'none';

  setUploadMode('existing');
  document.getElementById('uploadModal').style.display = 'block';
  document.body.style.overflow = 'hidden';

  // Load categories for this section
  await _loadUploadCats();
}

function closeUploadModal() {
  document.getElementById('uploadModal').style.display = 'none';
  document.body.style.overflow = '';
  _uploadFile = null;
}

// ── Load categories into the dropdown ────────────────────────────────────
async function _loadUploadCats() {
  const sel = document.getElementById('uploadCardSelect');
  sel.innerHTML = '<option value="">Loading…</option>';
  try {
    await CN.load();
    const section = CN.getSection(_uploadSection);
    if (!section) {
      // Section not in content_nodes yet — only allow new card
      _uploadCats = [];
      sel.innerHTML = '<option value="">No cards yet — create one</option>';
      return;
    }
    _uploadCats = CN.getCategories(section.id);
    sel.innerHTML = _uploadCats.length
      ? _uploadCats.map(c => `<option value="${c.id}">${c.name || c.Name}</option>`).join('')
      : '<option value="">No cards yet — create one below</option>';
    // Hide sub-card wrap initially, trigger check for first option
    document.getElementById('uploadSubCardWrap').style.display = 'none';
    if (_uploadCats.length) onUploadCardChange(_uploadCats[0].id);
  } catch(e) {
    sel.innerHTML = '<option value="">Error loading cards</option>';
  }
}

// ── Called when user changes the card selection ───────────────────────────
function onUploadCardChange(parentId) {
  const subWrap   = document.getElementById('uploadSubCardWrap');
  const subSelect = document.getElementById('uploadSubCardSelect');
  if (!parentId || !CN.loaded) { subWrap.style.display = 'none'; return; }

  const subCats = CN.getCategories(parseInt(parentId));
  if (!subCats.length) {
    subWrap.style.display = 'none';
    return;
  }
  // Show sub-card dropdown
  subSelect.innerHTML =
    '<option value="__parent__">— Upload directly to parent card —</option>' +
    subCats.map(c => `<option value="${c.id}">${c.name || c.Name}</option>`).join('');
  subWrap.style.display = 'block';
}

// ── Toggle existing / new mode ────────────────────────────────────────────
function setUploadMode(mode) {
  _uploadMode = mode;
  const btnEx  = document.getElementById('uploadModeExisting');
  const btnNew = document.getElementById('uploadModeNew');
  const exWrap = document.getElementById('uploadExistingWrap');
  const newWrap= document.getElementById('uploadNewWrap');

  const activeStyle  = 'flex:1;padding:10px;border-radius:10px;border:1.5px solid rgba(0,212,170,0.5);background:rgba(0,212,170,0.1);color:#00d4aa;font-weight:700;font-size:0.84rem;cursor:pointer;font-family:inherit;';
  const inactiveStyle= 'flex:1;padding:10px;border-radius:10px;border:1.5px solid var(--border);background:transparent;color:var(--muted);font-weight:700;font-size:0.84rem;cursor:pointer;font-family:inherit;';

  if (mode === 'existing') {
    btnEx.style.cssText   = activeStyle;
    btnNew.style.cssText  = inactiveStyle;
    exWrap.style.display  = 'block';
    newWrap.style.display = 'none';
  } else {
    btnNew.style.cssText  = activeStyle;
    btnEx.style.cssText   = inactiveStyle;
    exWrap.style.display  = 'none';
    newWrap.style.display = 'block';
    // Reset to top-level card type by default
    _newCardType = 'top';
    setNewCardType('top');
    const csEl = document.getElementById('createCardStatus');
    if (csEl) csEl.style.display = 'none';
  }
}

// ── New Card: toggle top-level vs sub-card ────────────────────────────────
let _newCardType = 'top'; // 'top' or 'sub'

function setNewCardType(type) {
  _newCardType = type;
  const topBtn     = document.getElementById('cardTypeTopBtn');
  const subBtn     = document.getElementById('cardTypeSubBtn');
  const parentWrap = document.getElementById('newSubParentWrap');
  const nameLabel  = document.getElementById('newCardNameLabel');

  const active   = 'flex:1;padding:9px;border-radius:10px;border:1.5px solid rgba(0,212,170,0.5);background:rgba(0,212,170,0.1);color:#00d4aa;font-weight:700;font-size:0.8rem;cursor:pointer;font-family:inherit;';
  const inactive = 'flex:1;padding:9px;border-radius:10px;border:1.5px solid var(--border);background:transparent;color:var(--muted);font-weight:700;font-size:0.8rem;cursor:pointer;font-family:inherit;';
  const activeS  = 'flex:1;padding:9px;border-radius:10px;border:1.5px solid rgba(167,139,250,0.5);background:rgba(167,139,250,0.1);color:#a78bfa;font-weight:700;font-size:0.8rem;cursor:pointer;font-family:inherit;';

  if (type === 'top') {
    topBtn.style.cssText = active;
    subBtn.style.cssText = inactive;
    parentWrap.style.display = 'none';
    nameLabel.textContent = 'New Card Name';
  } else {
    subBtn.style.cssText = activeS;
    topBtn.style.cssText = inactive;
    parentWrap.style.display = 'block';
    nameLabel.textContent = 'Sub-Card Name';
    // Populate parent dropdown with existing top-level cards
    _populateNewSubParent();
  }
}

async function _populateNewSubParent() {
  const sel = document.getElementById('newSubParentSelect');
  sel.innerHTML = '<option value="">Loading cards…</option>';
  try {
    await CN.load();
    const section = CN.getSection(_uploadSection);
    if (!section) { sel.innerHTML = '<option value="">No cards yet</option>'; return; }
    const cats = CN.getCategories(section.id);
    sel.innerHTML = cats.length
      ? cats.map(c => `<option value="${c.id}">${c.name || c.Name}</option>`).join('')
      : '<option value="">No cards yet in this section</option>';
  } catch(e) {
    sel.innerHTML = '<option value="">Error loading</option>';
  }
}

// ── Create Card Only (no file upload) ────────────────────────────────────
async function createCardOnly() {
  const cardName = document.getElementById('uploadNewCardName').value.trim();
  const statusEl = document.getElementById('createCardStatus');
  const btn      = document.getElementById('createCardOnlyBtn');

  if (!cardName) {
    statusEl.style.display = 'block';
    statusEl.style.color = '#f0a500';
    statusEl.style.background = 'rgba(240,165,0,0.1)';
    statusEl.style.border = '1px solid #f0a500';
    statusEl.textContent = '⚠️ Please enter a card name first.';
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Creating…';
  statusEl.style.display = 'none';

  const hdrs = {
    'apikey':        SUPABASE_ANON,
    'Authorization': `Bearer ${_currentToken}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation'
  };

  try {
    await CN.load();
    let parentId = null;

    if (_newCardType === 'sub') {
      const selVal = document.getElementById('newSubParentSelect').value;
      if (!selVal) {
        statusEl.style.display = 'block';
        statusEl.style.color = '#f0a500';
        statusEl.style.background = 'rgba(240,165,0,0.1)';
        statusEl.style.border = '1px solid #f0a500';
        statusEl.textContent = '⚠️ Please select a parent card.';
        btn.disabled = false;
        btn.textContent = '✨ Create Card Only (no file)';
        return;
      }
      parentId = parseInt(selVal);
    } else {
      // Top-level: parent is section
      let section = CN.getSection(_uploadSection);
      if (!section) {
        // Create section first
        const secRes = await fetch(`${SUPABASE_URL}/rest/v1/content_nodes`, {
          method: 'POST', headers: hdrs,
          body: JSON.stringify({ name: _uploadSection, type: 'section', parent_id: null })
        });
        if (!secRes.ok) throw new Error('Section create failed: HTTP ' + secRes.status);
        const secData = await secRes.json();
        parentId = Array.isArray(secData) ? secData[0].id : secData.id;
      } else {
        parentId = section.id;
      }
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/content_nodes`, {
      method: 'POST', headers: hdrs,
      body: JSON.stringify({ name: cardName, type: 'category', parent_id: parentId })
    });
    if (!res.ok) {
      const txt = await res.text().catch(()=>'');
      throw new Error('HTTP ' + res.status + ' — ' + txt.slice(0,200));
    }

    // Success
    statusEl.style.display = 'block';
    statusEl.style.color = '#00d4aa';
    statusEl.style.background = 'rgba(0,212,170,0.1)';
    statusEl.style.border = '1px solid #00d4aa';
    const typeLabel = _newCardType === 'sub' ? 'Sub-card' : 'Card';
    statusEl.textContent = `✅ ${typeLabel} "${cardName}" created successfully!`;

    // Reset CN cache
    CN.loaded = false; CN.nodes = []; CN.files = [];
    window.hrSectionLoaded = false; window.afterSalesLoaded = false;
    window.salesDocsLoaded = false; window.marketingInitLoaded = false;
    window.prodLoaded = false; window.trainingDynLoaded = false; window.hrDocsCache = {};

    // Clear name, refresh parent dropdown if sub
    document.getElementById('uploadNewCardName').value = '';
    if (_newCardType === 'sub') await _populateNewSubParent();

    // Reload section after a moment
    setTimeout(() => {
      const panelMap = {
        'HR':          () => { hrSectionLoaded=false; loadHRSection(); },
        'Sales':       () => loadSalesDocs(true),
        'After Sales': () => { afterSalesLoaded=false; loadAfterSales(); },
        'Marketing':   () => { marketingInitLoaded=false; loadMarketingCounts(); },
        'Products':    () => { prodLoaded=false; loadProducts(); },
        'Training':    () => { trainingDynLoaded=false; loadTrainingSection(); },
      };
      if (panelMap[_uploadSection]) panelMap[_uploadSection]();
    }, 1200);

  } catch(e) {
    statusEl.style.display = 'block';
    statusEl.style.color = '#ef4444';
    statusEl.style.background = 'rgba(239,68,68,0.1)';
    statusEl.style.border = '1px solid #ef4444';
    statusEl.textContent = '❌ ' + e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ Create Card Only (no file)';
  }
}

// ── Upload type: 'file' or 'youtube' ────────────────────────────────────
let _uploadType = 'file';
let _uploadFiles = []; // Array for multiple file support

function setUploadType(type) {
  _uploadType = type;
  const fileBtn = document.getElementById('upTypeFileBtn');
  const ytBtn   = document.getElementById('upTypeYtBtn');
  const dropZ   = document.getElementById('uploadDropZone');
  const ytWrap  = document.getElementById('uploadYtWrap');
  const submitBtn = document.getElementById('uploadSubmitBtn');
  const active   = 'flex:1;padding:9px;border-radius:10px;border:1.5px solid rgba(0,212,170,0.5);background:rgba(0,212,170,0.1);color:#00d4aa;font-weight:700;font-size:0.82rem;cursor:pointer;font-family:inherit;';
  const inactive = 'flex:1;padding:9px;border-radius:10px;border:1.5px solid var(--border);background:transparent;color:var(--muted);font-weight:700;font-size:0.82rem;cursor:pointer;font-family:inherit;';
  const ytActive = 'flex:1;padding:9px;border-radius:10px;border:1.5px solid rgba(255,0,0,0.4);background:rgba(255,0,0,0.06);color:#ff4444;font-weight:700;font-size:0.82rem;cursor:pointer;font-family:inherit;';
  if (type === 'file') {
    fileBtn.style.cssText = active; ytBtn.style.cssText = inactive;
    dropZ.style.display = 'block'; ytWrap.style.display = 'none';
    submitBtn.textContent = 'Upload File';
  } else {
    ytBtn.style.cssText = ytActive; fileBtn.style.cssText = inactive;
    dropZ.style.display = 'none'; ytWrap.style.display = 'block';
    submitBtn.textContent = 'Save YouTube Link';
  }
}

function onYtUrlInput(val) {
  const preview = document.getElementById('uploadYtPreview');
  const thumb   = document.getElementById('uploadYtThumb');
  const nameEl  = document.getElementById('uploadFileName');
  const ytId = _extractYtId(val);
  if (ytId) {
    thumb.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    preview.style.display = 'block';
    if (!nameEl.value.trim()) nameEl.value = 'YouTube Video';
  } else {
    preview.style.display = 'none';
  }
}

function _extractYtId(url) {
  const m = (url||'').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

// ── File selected (from input or drop) ───────────────────────────────────
function uploadFileSelected(filesOrFile) {
  // Accept FileList, File[], or single File
  let files = [];
  if (filesOrFile instanceof FileList || Array.isArray(filesOrFile)) {
    files = Array.from(filesOrFile);
  } else if (filesOrFile instanceof File) {
    files = [filesOrFile];
  }
  if (!files.length) return;
  _uploadFiles = files;
  _uploadFile  = files[0]; // backward compat

  const label = document.getElementById('uploadDropLabel');
  const meta  = document.getElementById('uploadDropMeta');

  if (files.length === 1) {
    label.textContent = '✅ ' + files[0].name;
    meta.textContent  = (files[0].size / 1024 / 1024).toFixed(2) + ' MB — ' + (files[0].type || 'unknown type');
    // Auto-fill display name
    const nameInput = document.getElementById('uploadFileName');
    if (!nameInput.value.trim()) {
      nameInput.value = files[0].name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
    }
    // Hide multi-file list if shown
    const mfl = document.getElementById('multiFileList');
    if (mfl) mfl.style.display = 'none';
  } else {
    label.textContent = `✅ ${files.length} files selected`;
    const totalMB = files.reduce((s, f) => s + f.size, 0) / 1024 / 1024;
    meta.textContent  = `Total: ${totalMB.toFixed(2)} MB — Names will be auto-filled from filenames`;
    // Show file list
    let mfl = document.getElementById('multiFileList');
    if (!mfl) {
      mfl = document.createElement('div');
      mfl.id = 'multiFileList';
      mfl.style.cssText = 'margin-top:10px;max-height:140px;overflow-y:auto;display:flex;flex-direction:column;gap:5px;';
      document.getElementById('uploadDropZone').after(mfl);
    }
    mfl.style.display = 'flex';
    mfl.innerHTML = files.map((f, i) =>
      `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);font-size:0.80rem;">
        <span style="color:var(--accent2);font-weight:700;min-width:20px;">${i+1}.</span>
        <span style="flex:1;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.name}</span>
        <span style="color:var(--muted);flex-shrink:0;">${(f.size/1024/1024).toFixed(1)}MB</span>
      </div>`
    ).join('');
    // Clear display name field — multi mode uses auto-names
    document.getElementById('uploadFileName').value = '';
  }

  document.getElementById('uploadDropZone').style.borderColor = '#00d4aa';
  document.getElementById('uploadDropZone').style.background  = 'rgba(0,212,170,0.04)';
}

function uploadHandleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadDropZone').style.borderColor = '';
  document.getElementById('uploadDropZone').style.background  = '';
  const files = e.dataTransfer.files;
  if (files && files.length) uploadFileSelected(files);
}

// ── Set upload status message ─────────────────────────────────────────────
function _uploadSetStatus(msg, color) {
  const el = document.getElementById('uploadStatus');
  el.style.display    = 'block';
  el.style.color      = color || 'var(--text)';
  el.style.background = color ? (color === '#ef4444' ? 'rgba(239,68,68,0.1)' : 'rgba(0,212,170,0.1)') : 'var(--surface2)';
  el.style.border     = '1px solid ' + (color || 'var(--border)');
  el.textContent      = msg;
}

function _uploadSetProgress(pct, label) {
  document.getElementById('uploadProgress').style.display = 'block';
  document.getElementById('uploadProgressBar').style.width = pct + '%';
  document.getElementById('uploadProgressLabel').textContent = label || 'Uploading…';
}

// ── Main submit ───────────────────────────────────────────────────────────
async function submitUpload() {
  const submitBtn   = document.getElementById('uploadSubmitBtn');
  const displayName = document.getElementById('uploadFileName').value.trim();
  const newCardName = document.getElementById('uploadNewCardName').value.trim();

  // DOM se check karo — YouTube wrap visible hai toh YouTube mode hai
  const ytWrap = document.getElementById('uploadYtWrap');
  const isYoutubeMode = ytWrap && ytWrap.style.display !== 'none';

  // YouTube mode validation
  if (isYoutubeMode) {
    const ytUrl = document.getElementById('uploadYtUrl').value.trim();
    const ytId  = _extractYtId(ytUrl);
    if (!ytId)        { _uploadSetStatus('⚠️ Please enter a valid YouTube link.', '#f0a500'); return; }
    if (!displayName) { _uploadSetStatus('⚠️ Please enter a display name.', '#f0a500'); return; }
    if (_uploadMode === 'new' && !newCardName) { _uploadSetStatus('⚠️ Please enter a card name.', '#f0a500'); return; }
    submitBtn.disabled = true;
    document.getElementById('uploadStatus').style.display = 'none';
    await _submitYoutubeLink(ytUrl, displayName, newCardName, submitBtn);
    return;
  }

  // File mode validation
  const filesToUpload = (_uploadFiles && _uploadFiles.length) ? _uploadFiles : (_uploadFile ? [_uploadFile] : []);
  if (!filesToUpload.length) { _uploadSetStatus('⚠️ Please select a file first.', '#f0a500'); return; }
  const isMulti = filesToUpload.length > 1;
  if (!isMulti && !displayName) { _uploadSetStatus('⚠️ Please enter a display name for the file.', '#f0a500'); return; }
  if (_uploadMode === 'new' && !newCardName) { _uploadSetStatus('⚠️ Please enter a card name.', '#f0a500'); return; }

  submitBtn.disabled = true;
  document.getElementById('uploadStatus').style.display = 'none';

  const hdrs = SB_HDRS();

  try {
    // ── Step 1: Resolve or create target node ─────────────────────────
    let nodeId = null;

    if (_uploadMode === 'new') {
      _uploadSetProgress(10, 'Creating new card…');
      await CN.load();
      let parentId = null;

      if (_newCardType === 'sub') {
        const selVal = document.getElementById('newSubParentSelect').value;
        if (!selVal) { _uploadSetStatus('⚠️ Please select a parent card for the sub-card.', '#f0a500'); submitBtn.disabled=false; return; }
        parentId = parseInt(selVal);
      } else {
        const section = CN.getSection(_uploadSection);
        if (!section) {
          _uploadSetProgress(15, 'Creating section…');
          const secRes = await fetch(`${SUPABASE_URL}/rest/v1/content_nodes`, {
            method: 'POST',
            headers: { ...hdrs, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify({ name: _uploadSection, type: 'section', parent_id: null })
          });
          if (!secRes.ok) {
            const e401 = secRes.status === 401 || secRes.status === 403;
            throw new Error(e401
              ? 'Permission denied (HTTP ' + secRes.status + '). Run this in Supabase SQL Editor:\nCREATE POLICY "allow_anon_insert" ON "content_nodes" FOR INSERT TO anon WITH CHECK (true);'
              : 'Section create: HTTP ' + secRes.status);
          }
          const secData = await secRes.json();
          parentId = Array.isArray(secData) ? secData[0].id : secData.id;
        } else {
          parentId = section.id;
        }
      }

      const catRes = await fetch(`${SUPABASE_URL}/rest/v1/content_nodes`, {
        method: 'POST',
        headers: { ...hdrs, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ name: newCardName, type: 'category', parent_id: parentId })
      });
      if (!catRes.ok) {
        const e401 = catRes.status === 401 || catRes.status === 403;
        throw new Error(e401
          ? 'Permission denied (HTTP ' + catRes.status + '). In Supabase SQL Editor run:\nCREATE POLICY "allow_anon_insert" ON "content_nodes" FOR INSERT TO anon WITH CHECK (true);'
          : 'Card create: HTTP ' + catRes.status);
      }
      const catData = await catRes.json();
      nodeId = Array.isArray(catData) ? catData[0].id : catData.id;

    } else {
      const mainCardId = parseInt(document.getElementById('uploadCardSelect').value);
      if (!mainCardId) { _uploadSetStatus('⚠️ Please select a card.', '#f0a500'); submitBtn.disabled=false; return; }
      const subWrap   = document.getElementById('uploadSubCardWrap');
      const subVal    = document.getElementById('uploadSubCardSelect').value;
      const useSubCard = subWrap.style.display !== 'none' && subVal && subVal !== '__parent__';
      nodeId = useSubCard ? parseInt(subVal) : mainCardId;
      if (!nodeId) { _uploadSetStatus('⚠️ Please select a valid card.', '#f0a500'); submitBtn.disabled=false; return; }
    }

    // ── Step 2: Upload all files one by one ────────────────────────────
    let successCount = 0;
    for (let fi = 0; fi < filesToUpload.length; fi++) {
      const currentFile = filesToUpload[fi];
      const fileDisplayName = isMulti
        ? currentFile.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')
        : displayName;

      _uploadSetProgress(
        Math.round(((fi) / filesToUpload.length) * 80) + 10,
        isMulti ? `Uploading file ${fi+1} of ${filesToUpload.length}: ${currentFile.name}` : 'Uploading file…'
      );

      const ts       = Date.now();
      const safeName = currentFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path     = `${_uploadSection.replace(/\s+/g,'_')}/${nodeId}/${ts}_${safeName}`;
      const storageUrl = `${SUPABASE_URL}/storage/v1/object/files/${encodeURIComponent(path)}`;

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', storageUrl);
        xhr.setRequestHeader('apikey', SUPABASE_ANON);
        xhr.setRequestHeader('Authorization', `Bearer ${_currentToken}`);
        xhr.setRequestHeader('Content-Type', currentFile.type || 'application/octet-stream');
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const base = Math.round(((fi) / filesToUpload.length) * 80) + 10;
            const chunk = Math.round((ev.loaded / ev.total) * (80 / filesToUpload.length));
            _uploadSetProgress(base + chunk,
              isMulti ? `Uploading ${fi+1}/${filesToUpload.length}: ${Math.round(ev.loaded/1024)}KB / ${Math.round(ev.total/1024)}KB` :
              `Uploading… ${Math.round(ev.loaded/1024)}KB / ${Math.round(ev.total/1024)}KB`
            );
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error('Storage upload: HTTP ' + xhr.status + ' — ' + xhr.responseText.slice(0,200)));
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(currentFile);
      });

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/files/${path}`;
      const _ext2 = (currentFile.name.split('.').pop() || '').toLowerCase();
      const _fileType2 = (
        ['pdf'].includes(_ext2)                                  ? 'pdf'   :
        ['jpg','jpeg','png','gif','webp','svg'].includes(_ext2)  ? 'image' :
        ['mp4','webm','mov','avi','mkv'].includes(_ext2)         ? 'video' :
        ['mp3','wav','aac','ogg'].includes(_ext2)                ? 'audio' :
        ['doc','docx','xls','xlsx','ppt','pptx'].includes(_ext2) ? 'doc'   :
        'file'
      );

      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/files`, {
        method: 'POST',
        headers: { ...hdrs, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ node_id: nodeId, name: fileDisplayName, file_type: _fileType2, file_url: publicUrl })
      });
      if (!insertRes.ok) {
        const errText = await insertRes.text().catch(() => '');
        throw new Error('DB insert: HTTP ' + insertRes.status + ' — ' + errText.slice(0, 300));
      }
      successCount++;
    }

    // ── Step 3: Success ────────────────────────────────────────────────
    _uploadSetProgress(100, 'Done!');
    _uploadSetStatus(
      isMulti ? `✅ ${successCount} files uploaded successfully!` : '✅ File uploaded successfully!',
      '#00d4aa'
    );

    // ── Step 4: Refresh caches and reload ────────────────────────────
    CN.loaded  = false;
    CN.nodes   = [];
    CN.files   = [];

    // Reset section loaders so they re-fetch
    window.hrSectionLoaded       = false;
    window.afterSalesLoaded     = false;
    window.salesDocsLoaded      = false;
    window.marketingInitLoaded  = false;
    window.prodLoaded = false; window.trainingDynLoaded = false;
    window.hrDocsCache          = {};

    // Auto-close and reload after 1.5s
    setTimeout(() => {
      closeUploadModal();
      // Re-trigger the current section
      const panelMap = {
        'HR':          () => { hrSectionLoaded=false; loadHRSection(); },
        'Sales':       () => loadSalesDocs(true),
        'After Sales': () => { afterSalesLoaded=false; loadAfterSales(); },
        'Marketing':   () => { marketingInitLoaded=false; loadMarketingCounts(); },
        'Products':    () => { prodLoaded=false; loadProducts(); },
        'Training':    () => { trainingDynLoaded=false; loadTrainingSection(); },
      };
      if (panelMap[_uploadSection]) panelMap[_uploadSection]();
    }, 1600);

  } catch(e) {
    _uploadSetStatus('❌ ' + e.message, '#ef4444');
    submitBtn.disabled = false;
  }
}
// ═══════════════════════════════════════════════════════════════════════════

// ── YouTube Link Save (no file upload — directly saves URL to DB) ─────────
async function _submitYoutubeLink(ytUrl, displayName, newCardName, submitBtn) {
  const hdrs = SB_HDRS();
  try {
    _uploadSetProgress(20, 'Resolving card…');

    // Step 1: Get or create node
    let nodeId = null;
    await CN.load();

    if (_uploadMode === 'new') {
      let parentId = null;
      if (_newCardType === 'sub') {
        parentId = parseInt(document.getElementById('newSubParentSelect').value);
        if (!parentId) { _uploadSetStatus('⚠️ Please select a parent card.', '#f0a500'); submitBtn.disabled=false; return; }
      } else {
        let section = CN.getSection(_uploadSection);
        if (!section) {
          const sr = await fetch(`${SUPABASE_URL}/rest/v1/content_nodes`, {
            method:'POST', headers:{...hdrs,'Content-Type':'application/json','Prefer':'return=representation'},
            body: JSON.stringify({name:_uploadSection, type:'section', parent_id:null})
          });
          const sd = await sr.json(); parentId = Array.isArray(sd)?sd[0].id:sd.id;
        } else { parentId = section.id; }
      }
      const cr = await fetch(`${SUPABASE_URL}/rest/v1/content_nodes`, {
        method:'POST', headers:{...hdrs,'Content-Type':'application/json','Prefer':'return=representation'},
        body: JSON.stringify({name:newCardName, type:'category', parent_id:parentId})
      });
      const cd = await cr.json(); nodeId = Array.isArray(cd)?cd[0].id:cd.id;
    } else {
      const mainCardId = parseInt(document.getElementById('uploadCardSelect').value);
      if (!mainCardId) { _uploadSetStatus('⚠️ Please select a card.', '#f0a500'); submitBtn.disabled=false; return; }
      const subWrap = document.getElementById('uploadSubCardWrap');
      const subVal  = document.getElementById('uploadSubCardSelect').value;
      const useSubCard = subWrap.style.display !== 'none' && subVal && subVal !== '__parent__';
      nodeId = useSubCard ? parseInt(subVal) : mainCardId;
    }

    _uploadSetProgress(70, 'Saving link…');

    // Step 2: Insert YouTube URL directly into files table
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/files`, {
      method: 'POST',
      headers: { ...hdrs, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ node_id: nodeId, name: displayName, file_type: 'video', file_url: ytUrl })
    });
    if (!insertRes.ok) {
      const errText = await insertRes.text().catch(()=>'');
      throw new Error('DB insert: HTTP ' + insertRes.status + ' — ' + errText.slice(0,200));
    }

    _uploadSetProgress(100, 'Done!');
    _uploadSetStatus('✅ YouTube link saved successfully!', '#00d4aa');

    CN.loaded=false; CN.nodes=[]; CN.files=[];
    window.hrSectionLoaded=false; window.afterSalesLoaded=false; window.salesDocsLoaded=false;
    window.marketingInitLoaded=false; window.prodLoaded=false; window.trainingDynLoaded=false; window.hrDocsCache={};

    setTimeout(() => {
      closeUploadModal();
      const panelMap = {
        'HR':          () => { hrSectionLoaded=false; loadHRSection(); },
        'Sales':       () => loadSalesDocs(true),
        'After Sales': () => { afterSalesLoaded=false; loadAfterSales(); },
        'Marketing':   () => { marketingInitLoaded=false; loadMarketingCounts(); },
        'Products':    () => { prodLoaded=false; loadProducts(); },
        'Training':    () => { trainingDynLoaded=false; loadTrainingSection(); },
      };
      if (panelMap[_uploadSection]) panelMap[_uploadSection]();
    }, 1400);

  } catch(e) {
    _uploadSetStatus('❌ ' + e.message, '#ef4444');
    submitBtn.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// DELETE SYSTEM — Cards (content_nodes) and Files (files table + storage)
// ═══════════════════════════════════════════════════════════════════════════

async function confirmDeleteCard(nodeId, cardName) {
  const _role = CURRENT_USER ? String(CURRENT_USER.rawRole || CURRENT_USER.role || '').toLowerCase().trim() : '';
  if (_role !== 'mis') { alert('⛔ Delete access is restricted to MIS users only.'); return; }
  if (!confirm(`⚠️ "${cardName}" and all its files will be permanently deleted.\nAre you sure?`)) return;
  await _doDeleteCard(nodeId, cardName);
}

async function _doDeleteCard(nodeId, cardName) {
  const hdrs = SB_HDRS();

  // ── Helper: delete files (storage + DB) for a single node ──────────────
  async function _deleteFilesOfNode(nid) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/files?node_id=eq.${nid}`, { headers: hdrs });
    const files = r.ok ? await r.json() : [];
    for (const f of files) {
      const fileUrl = f.file_url || f.url || f.link || '';
      if (fileUrl.includes('/storage/v1/object/public/files/')) {
        const path = fileUrl.split('/storage/v1/object/public/files/')[1];
        if (path) {
          await fetch(`${SUPABASE_URL}/storage/v1/object/files/${encodeURIComponent(path)}`, {
            method: 'DELETE',
            headers: SB_HDRS()
          }).catch(() => {});
        }
      }
    }
    if (files.length) {
      await fetch(`${SUPABASE_URL}/rest/v1/files?node_id=eq.${nid}`, {
        method: 'DELETE', headers: hdrs
      }).catch(() => {});
    }
  }

  // ── Helper: recursively collect all descendant node IDs (BFS) ──────────
  async function _collectDescendants(rootId) {
    const allIds = [];
    const queue = [rootId];
    while (queue.length) {
      const cur = queue.shift();
      // find children
      const cr = await fetch(`${SUPABASE_URL}/rest/v1/content_nodes?parent_id=eq.${cur}&select=id`, { headers: hdrs });
      const children = cr.ok ? await cr.json() : [];
      for (const c of children) {
        allIds.push(c.id);
        queue.push(c.id);
      }
    }
    return allIds; // deepest first to be safe
  }

  try {
    // 1. Find all descendant nodes (sub-cards, sub-sub-cards...)
    const descendants = await _collectDescendants(nodeId);
    // Delete deepest first
    const deleteOrder = [...descendants].reverse();

    // 2. Delete files + node records for all descendants
    for (const did of deleteOrder) {
      await _deleteFilesOfNode(did);
      const dr = await fetch(`${SUPABASE_URL}/rest/v1/content_nodes?id=eq.${did}`, {
        method: 'DELETE', headers: hdrs
      });
      if (!dr.ok) {
        const errTxt = await dr.text().catch(() => '');
        // Check for RLS / permission error
        if (dr.status === 401 || dr.status === 403 || errTxt.toLowerCase().includes('policy')) {
          alert(`❌ Permission denied when deleting sub-card (HTTP ${dr.status}).\n\nFix in Supabase SQL Editor:\nCREATE POLICY "allow_anon_delete" ON "content_nodes" FOR DELETE TO anon USING (true);\nCREATE POLICY "allow_anon_delete_files" ON "files" FOR DELETE TO anon USING (true);`);
          return;
        }
      }
    }

    // 3. Delete files + node record for the root card itself
    await _deleteFilesOfNode(nodeId);

    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/content_nodes?id=eq.${nodeId}`, {
      method: 'DELETE', headers: hdrs
    });

    if (!delRes.ok) {
      const err = await delRes.text().catch(() => '');
      if (delRes.status === 401 || delRes.status === 403 || err.toLowerCase().includes('policy')) {
        alert(`❌ Permission denied (HTTP ${delRes.status}).\n\nYou need to enable DELETE policy in Supabase.\nGo to Supabase → SQL Editor and run:\n\nCREATE POLICY "allow_anon_delete" ON "content_nodes" FOR DELETE TO anon USING (true);\nCREATE POLICY "allow_anon_delete_files" ON "files" FOR DELETE TO anon USING (true);`);
      } else {
        alert(`❌ Delete failed (HTTP ${delRes.status}):\n${err.slice(0, 300)}`);
      }
      return;
    }

    // 4. Refresh caches
    CN.loaded = false; CN.nodes = []; CN.files = [];
    window.hrSectionLoaded = false;
    window.afterSalesLoaded = false;
    window.salesDocsLoaded = false;
    window.marketingInitLoaded = false;
    window.prodLoaded = false;
    window.trainingDynLoaded = false;
    window.hrDocsCache = {};

    // 5. Close any open overlay
    ['hrDocsOverlay','salesDocsOverlay','afterSalesOverlay','marketingOverlay'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.style.display !== 'none') { el.style.display = 'none'; document.body.style.overflow = ''; }
    });

    // 6. Re-render current active section
    const activePanel = document.querySelector('.dashboard-panel.active');
    const panelId = activePanel ? activePanel.id : '';
    if      (panelId === 'panel-hr')         loadHRSection();
    else if (panelId === 'panel-sales')      loadSalesDocs(true);
    else if (panelId === 'panel-aftersales') { afterSalesLoaded=false; loadAfterSales(); }
    else if (panelId === 'panel-marketing')  { marketingInitLoaded=false; loadMarketingCounts(); }
    else if (panelId === 'panel-products')   { prodLoaded=false; loadProducts(); }
    else if (panelId === 'panel-training')   { trainingDynLoaded=false; loadTrainingSection(); }

    alert(`✅ "${cardName}" and all its files have been deleted!`);

  } catch(e) {
    alert('❌ Error: ' + e.message);
  }
}

async function confirmDeleteFile(fileId, fileUrl) {
  const _role = CURRENT_USER ? String(CURRENT_USER.rawRole || CURRENT_USER.role || '').toLowerCase().trim() : '';
  if (_role !== 'mis') { alert('⛔ Delete access is restricted to MIS users only.'); return; }
  if (!confirm('⚠️ This file will be permanently deleted. Are you sure?')) return;
  await _doDeleteFile(fileId, fileUrl);
}

async function _doDeleteFile(fileId, fileUrl) {
  const hdrs = SB_HDRS();
  try {
    // 1. Delete from storage
    if (fileUrl && fileUrl.includes('/storage/v1/object/public/')) {
      const path = fileUrl.split('/storage/v1/object/public/files/')[1];
      if (path) {
        await fetch(`${SUPABASE_URL}/storage/v1/object/files/${path}`, {
          method: 'DELETE',
          headers: SB_HDRS()
        }).catch(() => {});
      }
    }

    // 2. Delete from files table
    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/files?id=eq.${fileId}`, {
      method: 'DELETE',
      headers: hdrs
    });
    if (!delRes.ok) {
      const err = await delRes.text().catch(() => '');
      alert('Delete failed: ' + err.slice(0, 200));
      return;
    }

    // 3. Refresh CN cache
    CN.loaded = false; CN.nodes = []; CN.files = [];
    window.hrDocsCache = {};
    window.hrSectionLoaded = false;
    window.afterSalesLoaded = false;
    window.salesDocsLoaded = false;
    window.marketingInitLoaded = false;
    window.prodLoaded = false;
    window.trainingDynLoaded = false;

    // 4. Remove card from DOM immediately
    const card = document.querySelector(`[data-file-id="${fileId}"]`);
    if (card) card.remove();

    // 5. Close overlay and reload section
    ['hrDocsOverlay','salesDocsOverlay','afterSalesOverlay','marketingOverlay'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.style.display !== 'none') { el.style.display = 'none'; document.body.style.overflow = ''; }
    });

    const activePanel = document.querySelector('.dashboard-panel.active');
    const panelId = activePanel ? activePanel.id : '';
    if (panelId === 'panel-hr')         loadHRSection();
    else if (panelId === 'panel-sales') loadSalesDocs(true);
    else if (panelId === 'panel-aftersales') { afterSalesLoaded=false; loadAfterSales(); }
    else if (panelId === 'panel-marketing')  { marketingInitLoaded=false; loadMarketingCounts(); }
    else if (panelId === 'panel-products')   { prodLoaded=false; loadProducts(); }

    alert('✅ File deleted successfully.');
  } catch(e) {
    alert('Error: ' + e.message);
  }
}
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// UNIVERSAL DELETE BUTTON INJECTOR
// Finds all [data-cn-name] cards in a container and adds delete buttons
// by looking up matching content_nodes entries.
// ═══════════════════════════════════════════════════════════════════════════
const DEL_BTN_HTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="3 6 5 6 21 6"/>
  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
  <path d="M10 11v6M14 11v6"/>
  <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
</svg>`;

async function injectDeleteBtns(sectionName, containerEl) {
  if (!containerEl) return;
  if (!_isMIS()) return; // Only MIS can delete
  try {
    await CN.load();
    const section = CN.getSection(sectionName);
    if (!section) return;
    // Search direct children AND one level deeper (for Training sub-sections etc.)
    const cats = [
      ...CN.getCategories(section.id),
      ...CN.getCategories(section.id).flatMap(c => CN.getCategories(c.id))
    ];

    containerEl.querySelectorAll('[data-cn-name]').forEach(outerCard => {
      if (outerCard.querySelector('.cn-del-btn')) return;
      const cnName = outerCard.getAttribute('data-cn-name');
      const node   = cats.find(c => (c.name||'').trim().toLowerCase() === cnName.trim().toLowerCase());
      if (!node) return;

      // Inject INTO the inner .home-card so it works even when outer has display:flex
      const target = outerCard.querySelector('.home-card') || outerCard;
      if (target.querySelector('.cn-del-btn')) return;
      target.style.position = 'relative';

      const btn = document.createElement('button');
      btn.className = 'cn-del-btn';
      btn.title     = 'Delete ' + cnName;
      btn.innerHTML = DEL_BTN_HTML;
      btn.style.cssText = 'position:absolute;top:10px;right:10px;z-index:10;width:28px;height:28px;border-radius:8px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.18s;';
      btn.onmouseover = () => btn.style.background = 'rgba(239,68,68,0.28)';
      btn.onmouseout  = () => btn.style.background = 'rgba(239,68,68,0.12)';
      btn.onclick     = (e) => { e.stopPropagation(); e.preventDefault(); confirmDeleteCard(node.id, cnName); };
      target.appendChild(btn);
    });
  } catch(e) { }
}

// ── Training: load dynamic cards from content_nodes ──────────────────────
let trainingDynLoaded = false;

// Quiz function map — card name (lowercase) → quiz function call string
const TRAINING_QUIZ_MAP = {
  'mis training':         `openMISQuizMenu()`,
  'odoo training':        `openOdooModuleSelect()`,
  'pc training':          `openModuleQuiz('pc')`,
  'click task training':  `openModuleQuiz('clicktask')`,
  'cool bus training':    `openModuleQuiz('coolbus')`,
  'smart fleet training': `openModuleQuiz('smartfleet')`,
};

async function loadTrainingSection() {
  if (trainingDynLoaded) return;
  trainingDynLoaded = true;

  const loadingEl = document.getElementById('training-dynamic-loading');
  const gridEl    = document.getElementById('training-dynamic-grid');
  const emptyEl   = document.getElementById('training-dynamic-empty');

  try {
    await CN.load();
    const section = CN.getSection('Training');

    if (!section || !CN.getCategories(section.id).length) {
      if (loadingEl) loadingEl.style.display = 'none';
      if (emptyEl)   emptyEl.style.display = 'block';
      return;
    }

    const cats = CN.getCategories(section.id);
    if (loadingEl) loadingEl.style.display = 'none';

    gridEl.innerHTML = cats.map((cat, i) => {
      const th      = cnTheme(i);
      const name    = cat.name || 'Module';
      const count   = CN.totalFiles(cat.id);
      const safe    = name.replace(/'/g,"\\'").replace(/"/g,'&quot;');
      const quizFn  = TRAINING_QUIZ_MAP[name.toLowerCase().trim()];

      return `
      <div style="position:relative;">
        ${_isMIS() ? `        <button onclick="event.stopPropagation();confirmDeleteCard(${cat.id},'${safe}')" title="Delete card"
          style="position:absolute;top:10px;right:10px;z-index:3;width:28px;height:28px;border-radius:8px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;"
          onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.12)'">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>` : ''}
        <div class="home-card" style="--card-top:${th.color};cursor:pointer;"
          onclick="cnOpenTrainingOverlay(${cat.id},'${safe}')"
          onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 36px rgba(0,0,0,0.3)';this.style.borderColor='${th.color}'"
          onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor=''">
          <div class="hc-icon" style="background:${th.bg};border-color:${th.border};color:${th.color};">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          </div>
          <div class="hc-name">${name}</div>
          <div class="hc-desc" style="font-size:0.88rem;color:var(--muted);line-height:1.55;">${getCNCardDesc(name)}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;">
            <span class="hc-status live" style="background:${th.bg};color:${th.color};border:1px solid ${th.border};">📂 ${count} file${count===1?'':'s'}</span>
            <span style="font-size:0.78rem;font-weight:600;color:${th.color};">View →</span>
          </div>
        </div>
      </div>`;
    }).join('');

    gridEl.style.display = 'grid';

  } catch(e) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (emptyEl)   { emptyEl.style.display = 'block'; emptyEl.textContent = '⚠️ ' + e.message; }
  }
}

// ── Overlay tab switch ───────────────────────────────────────────────────
let _currentMktNodeId = null;
function switchMktTab(tab) {
  const vTab = document.getElementById('mkt-tab-videos');
  const aTab = document.getElementById('mkt-tab-assessment');
  const btnV = document.getElementById('mkt-tab-btn-videos');
  const btnA = document.getElementById('mkt-tab-btn-assessment');
  if (!vTab) return;
  if (tab === 'videos') {
    vTab.style.display = 'block'; if(aTab) aTab.style.display = 'none';
    btnV.style.borderBottomColor = '#00d4ff'; btnV.style.color = '#00d4ff';
    btnV.style.background = 'rgba(0,212,255,0.08)'; btnV.style.fontWeight = '800';
    if(btnA){ btnA.style.borderBottomColor = 'transparent'; btnA.style.color = 'var(--muted)'; btnA.style.background = 'transparent'; btnA.style.fontWeight = '700'; }
  } else {
    vTab.style.display = 'none'; if(aTab) aTab.style.display = 'block';
    if(btnA){ btnA.style.borderBottomColor = '#a855f7'; btnA.style.color = '#a855f7'; btnA.style.background = 'rgba(168,85,247,0.08)'; btnA.style.fontWeight = '800'; }
    btnV.style.borderBottomColor = 'transparent'; btnV.style.color = 'var(--muted)'; btnV.style.background = 'transparent'; btnV.style.fontWeight = '700';
  }
}

// Hide Assessment tab — used when overlay is opened from IT Admin or Marketing
function _hideAssessmentTab() {
  const bar = document.getElementById('mkt-tab-bar');
  if (bar) bar.style.display = 'none';
  const btn = document.getElementById('mkt-tab-btn-assessment');
  if (btn) btn.style.display = 'none';
}

// Show Assessment tab — used when overlay is opened from Training
function _showAssessmentTab() {
  const bar = document.getElementById('mkt-tab-bar');
  if (bar) bar.style.display = 'flex';
  const btn = document.getElementById('mkt-tab-btn-assessment');
  if (btn) btn.style.display = 'flex';
}

// Training cards → show Assessment tab + load quizzes
function cnOpenTrainingOverlay(nodeId, catName) {
  _currentMktNodeId = nodeId;
  logActivity({event_type:'training_module_open', event_detail:'Opened training card: '+catName, page_name:'training', card_name:catName});
  const th = cnTheme(0);
  const iconEl = document.getElementById('mktOverlayIcon');
  if (iconEl) { iconEl.style.background = th.bg; iconEl.style.borderColor = th.border; iconEl.innerHTML = `<span style="font-size:1.4rem;">🎬</span>`; }
  document.getElementById('mktOverlayTitle').textContent    = catName;
  document.getElementById('mktOverlaySub').textContent      = '';
  document.getElementById('mktOverlayLoader').style.display = 'block';
  document.getElementById('mktOverlayGrid').innerHTML       = '';
  document.getElementById('mktOverlayEmpty').style.display  = 'none';
  document.getElementById('mkt-quiz-loading').style.display = 'block';
  document.getElementById('mkt-quiz-list').innerHTML        = '';
  document.getElementById('mkt-quiz-empty').style.display   = 'none';

  _showAssessmentTab(); // Training mein Assessment tab dikhao
  document.getElementById('marketingOverlay').style.display = 'block';
  document.body.style.overflow = 'hidden';
  switchMktTab('videos');
  _cnRenderOverlayContent(nodeId, catName, th, 'mktOverlayGrid', 'mktOverlaySub', 'mktOverlayEmpty', null);
  _loadMktQuizPanel(catName, nodeId);
}

// Load DB quizzes into Assessment panel
async function _loadMktQuizPanel(catName, nodeId) {
  const loadEl  = document.getElementById('mkt-quiz-loading');
  const listEl  = document.getElementById('mkt-quiz-list');
  const emptyEl = document.getElementById('mkt-quiz-empty');
  const _hdrs = SB_HDRS_JSON;
  try {
    const nodeFilter = nodeId ? `&node_id=eq.${nodeId}` : '';
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/quizzes?select=*,content_nodes(name),questions(marks)&is_active=eq.true${nodeFilter}&order=id.desc`,
      { headers: _hdrs() }
    );
    const quizzes = await res.json();
    if(loadEl) loadEl.style.display = 'none';
    if (!Array.isArray(quizzes) || !quizzes.length) { if(emptyEl) emptyEl.style.display = 'block'; return; }
    const colors = ['#a855f7','#f0a500','#00d4aa','#4e9af1','#f97316','#e879f9','#22c55e'];
    if(listEl) listEl.innerHTML = quizzes.map((q, i) => {
      const col        = colors[i % colors.length];
      const mod        = q.content_nodes?.name || 'General';
      const tl         = q.time_limit ? `⏱ ${q.time_limit} min` : '';
      const totalMarks = (q.questions || []).reduce((s, qq) => s + (qq.marks || 1), 0);
      const passingPct = q.passing_score || 60;
      const passingMks = totalMarks > 0 ? Math.ceil((passingPct / 100) * totalMarks) : null;
      const pass       = passingMks ? `🎯 Pass: ${passingMks}/${totalMarks} marks` : `🎯 Pass: ${passingPct}%`;
      const qCount     = q.question_count ? `📋 ${q.question_count} Qs` : '';
      return `
        <button onclick="openQuizPreviewFromOverlay(${q.id})"
          style="text-align:left;padding:14px 15px;border-radius:13px;border:1.5px solid ${col}33;border-left:3px solid ${col};background:${col}0a;cursor:pointer;font-family:inherit;width:100%;transition:all 0.18s;"
          onmouseover="this.style.background='${col}18';this.style.transform='translateX(3px)'"
          onmouseout="this.style.background='${col}0a';this.style.transform=''">
          <div style="display:flex;align-items:center;gap:11px;">
            <div style="width:36px;height:36px;border-radius:9px;background:${col}20;border:1px solid ${col}40;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">📝</div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;color:var(--text);font-size:0.9rem;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${q.title}</div>
              <div style="font-size:0.72rem;color:var(--muted);">${[mod,tl,pass,qCount].filter(Boolean).join(' · ')}</div>
            </div>
            <span style="color:${col};font-size:1rem;flex-shrink:0;">→</span>
          </div>
        </button>`;
    }).join('');
  } catch(e) {
    if(loadEl) loadEl.style.display = 'none';
    if(listEl) listEl.innerHTML = `<div style="color:#ef4444;font-size:0.82rem;padding:16px;">⚠️ ${e.message}</div>`;
  }
}

// ── Open quiz directly — no Videos tab shown ─────────────────────────────
let _quizOnlyMode = false;

function openQuizOnlyMode(cardName) {
  const key = cardName.toLowerCase().trim();
  _quizOnlyMode = true;

  if (key === 'mis training') {
    document.getElementById('mis-quiz-overlay').style.display = 'flex';
    const tabBar = document.getElementById('mis-main-tabs');
    if (tabBar) tabBar.style.display = 'none';
    switchMISTab('quiz');

  } else if (key === 'odoo training') {
    openModuleQuiz('odoo');

  } else {
    const keyMap = {
      'pc training':          'pc',
      'click task training':  'clicktask',
      'cool bus training':    'coolbus',
      'smart fleet training': 'smartfleet',
    };
    const moduleKey = keyMap[key];
    if (moduleKey) openModuleQuiz(moduleKey);
  }
}

// Restore MIS tabs visibility when quiz is closed normally
const _origCloseMISQuiz = window.closeMISQuiz;
window.closeMISQuiz = function() {
  const tabBar = document.getElementById('mis-main-tabs');
  if (tabBar) tabBar.style.display = 'flex';
  if (_origCloseMISQuiz) _origCloseMISQuiz();
  else {
    document.getElementById('mis-quiz-overlay').style.display = 'none';
    const v = document.getElementById('mis-main-video');
    if(v) { v.pause(); v.removeAttribute('src'); v.load(); }
  }
};

// ── Training module card delete is handled by CN.confirmDeleteCard()
// injected directly inside loadTrainingSection() cards — no separate
// Training_Videos table needed.


// Delete a single video from files table
async function confirmDeleteTrainingVideo(videoId, videoTitle, subKey) {
  if (!confirm('Delete "' + videoTitle + '"? This cannot be undone.')) return;
  // Look up URL from cached data
  let videoUrl = '';
  if (subKey && window.odooSubModuleVideosData && odooSubModuleVideosData[subKey]) {
    const row = odooSubModuleVideosData[subKey].find(r => String(r.id) === String(videoId));
    if (row) videoUrl = row.Video_URL || '';
  } else {
    const row = (misVideosData || []).find(r => String(r.id) === String(videoId));
    if (row) videoUrl = row.Video_URL || '';
    if (!videoUrl && window.moduleVideosData) {
      for (const k of Object.keys(moduleVideosData)) {
        const r = (moduleVideosData[k]||[]).find(r => String(r.id) === String(videoId));
        if (r) { videoUrl = r.Video_URL || ''; break; }
      }
    }
  }
  // Remove card from DOM immediately
  const card = document.querySelector('[data-vtitle="' + videoTitle.toLowerCase() + '"]');
  if (card) card.remove();
  // Invalidate caches so next open is fresh
  if (subKey && window.odooSubModuleVideosData) delete odooSubModuleVideosData[subKey];
  window.misVideosData = [];
  CN.loaded = false; CN.nodes = []; CN.files = [];
  await _doDeleteFile(videoId, videoUrl);
}

// ═══════════════════════════════════════════════════════════════════
// IMS DASHBOARD
// Access: MIS · Managing Director · PC
// ═══════════════════════════════════════════════════════════════════

// ── CONFIG ────────────────────────────────────────────────────────
const IMS_API_URL = 'https://script.googleusercontent.com/a/macros/adititracking.com/echo?user_content_key=AUkAhnRwPJXjjaqs1u_J4CxLrg0gPh0_f-Bn0eIwcG057_dzfUQD7818GSfHbdrphDwGuazt3_EAFC9apDz48LUFYJGD2oUaZcS-FAek-YJhYNCgMR1wWw7a2_fIMl46tEXcV7QgRA2zZ_C19MN9P5qQywh535O06mnLKJhFQokIW7Cb34YeI445kSF_gM8St_D0HgqPG7s_CRM64WCi3IVHwqdQ54P_yH1d9cfqG-7s8KSdbuLpyAv2rxxJkMOs3F-_PCOdfmpyEHGZ8hoo1uYiYu4BKvgYxQ5rma3qeIOSVqfY_AU4Qx0&lib=MeRHp2Bf7LTWgUgAzsd8SbI7QKfk-2PaQ'; // HQ

// ── Location-specific API URLs ─────────────────────────────────────
// ⚠️ REPLACE these with actual Google Apps Script URLs for each location
const IMS_GOA_API       = 'https://script.google.com/macros/s/AKfycbyJdOUvUvSDgRkFtVUlFahtABXzR-H1nrcv-Syj--wf1ehNoQIteTLuoXTZIwWBPQtByg/exec';
const IMS_GUJARAT_API   = 'https://script.google.com/macros/s/AKfycbz3m_D7OETa5BIX1JBL8wj4rZ_kVELBOzhqRpZSeSQi-gEBnCoHKCp9p4ir3TNwfFiR/exec';
const IMS_BANGALORE_API = 'https://script.google.com/macros/s/AKfycbz6NrjwVJxfivZfTlbeolSXy3Azsq0kdrHbMDgDT9UioBOQ4Gl-0Ypd--QtpvJjM3Sf_w/exec';

// ── STATE ─────────────────────────────────────────────────────────
let _imsLoaded       = false;
let _imsAllRows      = [];
let _imsDateHdrs     = [];
let _imsMaxStock     = 1;
let _imsFilter       = 'all';
let _imsDateIdx      = -1;   // -1 = latest date (default); index into _imsDateHdrs
let _imsBarChart     = null;
let _imsDonutChart   = null;
let _imsRefInterval  = null;
let _imsLocation     = 'hq'; // 'hq' | 'goa' | 'gujarat' | 'bangalore'

// ── Location API map ──────────────────────────────────────────────
function _imsGetAPI() {
  if (_imsLocation === 'goa')       return IMS_GOA_API;
  if (_imsLocation === 'gujarat')   return IMS_GUJARAT_API;
  if (_imsLocation === 'bangalore') return IMS_BANGALORE_API;
  return IMS_API_URL; // HQ
}

// ── Role ──────────────────────────────────────────────────────────
function _canAccessIMS() {
  return PERMISSIONS.can_view_ims === 'true';
}

/* ═══════════════════════════════════════════════════════════════
   ACTIVITY LOG — JS (MIS & Managing Director only)
═══════════════════════════════════════════════════════════════ */
let _actLogAllRows = [];
let _actLogFiltered = [];
let _actLogPage = 1;
const _ACT_LOG_PER_PAGE = 50;


async function actLogTestConnection() {
  const res_el = document.getElementById('actlog-test-result');
  if (res_el) res_el.innerHTML = '<span style="color:var(--muted);">⏳ Testing...</span>';
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/activity_logs?select=id,emp_id,event_type,page_name,card_name&limit=1`, { headers: SB_HDRS_AUTH() });
    if (r.ok) {
      const d = await r.json();
      // Check if new columns exist
      const hasNewCols = d.length === 0 || ('page_name' in d[0]);
      if (hasNewCols) {
        if (res_el) res_el.innerHTML = '<span style="color:#00d4aa;">✅ Connected! New columns also exist. Data should come through.</span>';
        document.getElementById('actlog-sql-banner').style.display = 'none';
      } else {
        if (res_el) res_el.innerHTML = '<span style="color:#f0a500;">⚠️ Connected, but new columns are missing. Run the SQL above.</span>';
        document.getElementById('actlog-sql-banner').style.display = 'block';
      }
    } else {
      const err = await r.text();
      if (r.status === 401 || r.status === 403) {
        if (res_el) res_el.innerHTML = '<span style="color:#ff5c7c;">❌ RLS is blocking this! Add an RLS policy in Supabase (see the SQL above).</span>';
        document.getElementById('actlog-sql-banner').style.display = 'block';
      } else {
        if (res_el) res_el.innerHTML = `<span style="color:#ff5c7c;">❌ Error ${r.status}: ${err.substring(0,80)}</span>`;
      }
    }
  } catch(e) {
    if (res_el) res_el.innerHTML = '<span style="color:#ff5c7c;">❌ Network error: ' + e.message + '</span>';
  }
}

async function actLogSendTestEvent() {
  const res_el = document.getElementById('actlog-test-result');
  if (res_el) res_el.innerHTML = '<span style="color:var(--muted);">⏳ Sending test log...</span>';
  try {
    const hdrs = { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${_currentToken}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' };

    // Try full payload
    const fullP = { emp_id: CURRENT_USER?.email || 'test', event_type: 'login', event_detail: 'Test event from Activity Log panel',
      session_id: _ACT_SESSION_ID, device: 'desktop', page_name: 'activitylog', card_name: 'Test Card', duration_seconds: 5 };
    const r1 = await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, { method:'POST', headers:hdrs, body:JSON.stringify(fullP) });

    if (r1.ok || r1.status === 201) {
      if (res_el) res_el.innerHTML = '<span style="color:#00d4aa;">✅ Test log sent! Refresh — data should show up.</span>';
      document.getElementById('actlog-sql-banner').style.display = 'none';
    } else {
      const errText = await r1.text();
      // Fallback to basic columns
      const basicP = { emp_id: CURRENT_USER?.email || 'test', event_type: 'login',
        event_detail: 'Test | page:activitylog | card:Test Card | dur:5s', session_id: _ACT_SESSION_ID, device: 'desktop' };
      const r2 = await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, { method:'POST', headers:hdrs, body:JSON.stringify(basicP) });
      if (r2.ok || r2.status === 201) {
        if (res_el) res_el.innerHTML = '<span style="color:#f0a500;">⚠️ Basic log saved (new columns are missing). Run the SQL above for full data. Refresh!</span>';
        document.getElementById('actlog-sql-banner').style.display = 'block';
      } else {
        const err2 = await r2.text();
        if (r2.status === 401 || r2.status === 403) {
          if (res_el) res_el.innerHTML = '<span style="color:#ff5c7c;">❌ RLS policy is blocking the INSERT. Add an INSERT policy in Supabase!</span>';
        } else {
          if (res_el) res_el.innerHTML = `<span style="color:#ff5c7c;">❌ Failed ${r2.status}: ${err2.substring(0,100)}</span>`;
        }
        document.getElementById('actlog-sql-banner').style.display = 'block';
      }
    }
  } catch(e) {
    if (res_el) res_el.innerHTML = '<span style="color:#ff5c7c;">❌ ' + e.message + '</span>';
  }
}

// If user is already logged in (page reload), fetch Emp_id
if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER?.email) {
  _fetchAndCacheEmpId();
}

function _canAccessActLog() {
  return PERMISSIONS.can_view_activitylog === 'true';
}

function _applyActLogNavVisibility() {
  const el = document.getElementById('nav-activitylog');
  if (el) el.style.display = _canAccessActLog() ? 'flex' : 'none';
}

async function loadActivityLog(forceRefresh) {
  if (!_canAccessActLog()) return;
  const loading = document.getElementById('actlog-loading');
  const table   = document.getElementById('actlog-table');
  const empty   = document.getElementById('actlog-empty');
  const stats   = document.getElementById('actlog-stats');
  if (loading) loading.style.display = 'block';
  if (table)   table.style.display   = 'none';
  if (empty)   empty.style.display   = 'none';

  // Hide SQL migration banner — columns already exist
  const sqlBanner = document.getElementById('actlog-sql-banner');
  if (sqlBanner) sqlBanner.style.display = 'none';

  try {
    // Try with FK JOIN first (explicit hint to avoid PostgREST ambiguity)
    let rows = null;
    try {
      const res1 = await fetch(
        `${SUPABASE_URL}/rest/v1/activity_logs?select=*,employee:Employee_details!emp_id(Employee_name)&order=created_at.desc&limit=2000`,
        { headers: SB_HDRS_AUTH() }
      );
      if (res1.ok) {
        const data = await res1.json();
        if (Array.isArray(data)) rows = data;
      }
    } catch(e1) {}

    // Fallback: simple select without JOIN if FK hint fails
    if (!rows) {
      const res2 = await fetch(
        `${SUPABASE_URL}/rest/v1/activity_logs?select=*&order=created_at.desc&limit=2000`,
        { headers: SB_HDRS_AUTH() }
      );
      if (!res2.ok) throw new Error('HTTP ' + res2.status);
      const data2 = await res2.json();
      rows = Array.isArray(data2) ? data2 : [];
    }

    _actLogAllRows = rows;
    _actLogPage = 1;
    await _actLogPopulateEmpDropdown(_actLogAllRows); // async — fetches real names by emp_id

    // Default: set today's date if no filter is already set
    const dtFrom = document.getElementById('actlog-filter-date-from');
    const dtTo   = document.getElementById('actlog-filter-date-to');
    if (dtFrom && !dtFrom.value) {
      const today = new Date().toISOString().split('T')[0];
      dtFrom.value = today;
      dtTo.value   = today;
    }

    applyActLogFilters(); // show filtered data (today by default, KPI also updates)
  } catch(e) {
    if (loading) loading.style.display = 'none';
    if (empty) { empty.style.display = 'block'; empty.innerHTML = '<div style="text-align:center;padding:48px;color:#ff5c7c;">⚠️ Error loading logs: ' + e.message + '</div>'; }
  }
}

// MIS and Managing Director emails — excluded from employee filter dropdown
const _ACT_EXCLUDE_ROLES = []; // No exclusions — all employees shown in filter
// emp_id is now a numeric FK; employee_email holds the email directly
// Employee names fetched via JOIN or _actNameMap cache — no separate fetch needed

function _actLogIsExcluded(email) {
  const e = (email||'').toLowerCase();
  return _ACT_EXCLUDE_ROLES.some(r => e.startsWith(r+'@'));
}

// Populate dropdown — async so we can fetch real names from Employee_details
async function _actLogPopulateEmpDropdown(rows) {
  const sel = document.getElementById('actlog-filter-emp-select');
  if (!sel) return;

  // Fetch all names first (by emp_id FK — most reliable)
  await _fetchEmpNames(rows);

  // Build unique email → name map
  const seen = new Map();
  rows.forEach(r => {
    const email = (r.employee_email || '').toLowerCase().trim();
    if (!email || seen.has(email)) return;
    const name = _getEmpDisplayName(r); // uses emp_id FK lookup
    seen.set(email, name);
  });

  if (!seen.size) return;

  const current = sel.value;
  const sorted = [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));

  sel.innerHTML = '<option value="">All Employees</option>' +
    sorted.map(([email, name]) =>
      `<option value="${email}" ${email===current?'selected':''}>${name}</option>`
    ).join('');
}

function applyActLogFilters() {
  const eventF   = (document.getElementById('actlog-filter-event')?.value || '').toLowerCase();
  const empF     = (document.getElementById('actlog-filter-emp-select')?.value || '').toLowerCase().trim();
  const dateFrom = document.getElementById('actlog-filter-date-from')?.value || '';
  const dateTo   = document.getElementById('actlog-filter-date-to')?.value || '';

  _actLogFiltered = _actLogAllRows.filter(row => {
    const matchEvent = !eventF || (row.event_type||'').toLowerCase() === eventF;
    const matchEmp   = !empF   || (row.employee_email||'').toLowerCase() === empF;
    let   matchDate  = true;
    if (dateFrom || dateTo) {
      const rowDate = row.created_at ? row.created_at.substring(0, 10) : '';
      if (dateFrom && rowDate < dateFrom) matchDate = false;
      if (dateTo   && rowDate > dateTo)   matchDate = false;
    }
    return matchEvent && matchEmp && matchDate;
  });
  _actLogPage = 1;
  renderActLogTable();
  renderActLogStats(_actLogFiltered); // KPI cards update with filtered data

  // Update filter summary
  const parts = [];
  if (empF) { const sel = document.getElementById('actlog-filter-emp-select'); parts.push('👤 ' + (sel?.options[sel.selectedIndex]?.text || empF)); }
  if (eventF) parts.push('⚡ ' + eventF.replace(/_/g,' '));
  if (dateFrom) parts.push('📅 From: ' + dateFrom);
  if (dateTo)   parts.push('📅 To: ' + dateTo);
  const sumEl = document.getElementById('actlog-filter-summary');
  if (sumEl) {
    if (parts.length) {
      sumEl.style.display = 'flex';
      sumEl.innerHTML = '<span style="color:var(--accent2);font-weight:600;">Filtering:' + parts.map(p => `<span style="background:var(--surface2);border:1px solid var(--border);padding:2px 8px;border-radius:20px;">${p}</span>`).join('') + '</span>';
    } else {
      sumEl.style.display = 'none';
    }
  }
}

function actLogClearFilters() {
  const selEmp  = document.getElementById('actlog-filter-emp-select');
  const selEvt  = document.getElementById('actlog-filter-event');
  const dtFrom  = document.getElementById('actlog-filter-date-from');
  const dtTo    = document.getElementById('actlog-filter-date-to');
  if (selEmp) selEmp.value = '';
  if (selEvt) selEvt.value = '';
  if (dtFrom) dtFrom.value = '';
  if (dtTo)   dtTo.value   = '';
  applyActLogFilters();
}

function renderActLogTable() {
  const loading = document.getElementById('actlog-loading');
  const table   = document.getElementById('actlog-table');
  const empty   = document.getElementById('actlog-empty');
  const tbody   = document.getElementById('actlog-tbody');
  const pgInfo  = document.getElementById('actlog-page-info');
  const pgEl    = document.getElementById('actlog-pagination');
  const prev    = document.getElementById('actlog-prev');
  const next    = document.getElementById('actlog-next');

  if (loading) loading.style.display = 'none';

  if (!_actLogFiltered.length) {
    if (table) table.style.display = 'none';
    if (empty) {
      empty.style.display = 'block';
      const dtFrom = document.getElementById('actlog-filter-date-from')?.value || '';
      const dtTo   = document.getElementById('actlog-filter-date-to')?.value   || '';
      const dateMsg = (dtFrom || dtTo)
        ? `<div style="font-size:0.85rem;color:var(--muted);margin-top:6px;">No activity found for the selected date: <b>${dtFrom}${dtTo && dtTo!==dtFrom?' → '+dtTo:''}</b>.</div><div style="font-size:0.8rem;color:var(--muted);margin-top:4px;">Change the date filter to view past data.</div>`
        : '';
      empty.innerHTML = '<div style="text-align:center;padding:48px;color:var(--muted);"><div style="font-size:2.5rem;margin-bottom:10px;">🗒️</div><div>No records found.</div>' + dateMsg + '</div>';
    }
    if (pgEl)  pgEl.style.display = 'none';
    return;
  }
  if (empty) empty.style.display = 'none';

  const total = _actLogFiltered.length;
  const totalPages = Math.ceil(total / _ACT_LOG_PER_PAGE);
  const start = (_actLogPage - 1) * _ACT_LOG_PER_PAGE;
  const rows  = _actLogFiltered.slice(start, start + _ACT_LOG_PER_PAGE);

  const EVENT_STYLE = {
    login:          { bg:'rgba(0,212,170,0.12)',    color:'#00d4aa',  icon:'🔐' },
    logout:         { bg:'rgba(255,92,124,0.12)',   color:'#ff5c7c',  icon:'🚪' },
    page_view:      { bg:'rgba(78,154,241,0.12)',   color:'#4e9af1',  icon:'👁️' },
    card_open:      { bg:'rgba(240,165,0,0.12)',    color:'#f0a500',  icon:'📂' },
    video_play:     { bg:'rgba(168,85,247,0.12)',   color:'#a855f7',  icon:'▶️' },
    video_pause:    { bg:'rgba(168,85,247,0.08)',   color:'#8b40e8',  icon:'⏸️' },
    video_complete: { bg:'rgba(0,212,170,0.15)',    color:'#00b894',  icon:'✅' },
    file_open:      { bg:'rgba(99,102,241,0.12)',   color:'#6366f1',  icon:'📄' },
    page_unload:           { bg:'rgba(156,163,175,0.12)',  color:'#9ca3af',  icon:'💤' },
    training_module_open:  { bg:'rgba(99,102,241,0.12)',  color:'#6366f1',  icon:'📚' },
    training_submodule_open:{ bg:'rgba(99,102,241,0.08)', color:'#818cf8',  icon:'📖' },

  };

  // Fetch missing employee names by emp_id FK, then render
  _fetchEmpNames(rows).then(() => {
    tbody.innerHTML = _renderActLogRows(rows);
    if (table) table.style.display = 'table';
    if (pgInfo) pgInfo.textContent = `Showing ${start+1}–${Math.min(start+_ACT_LOG_PER_PAGE,total)} of ${total} records`;
    if (pgEl)  pgEl.style.display = 'flex';
    if (prev)  prev.disabled = _actLogPage <= 1;
    if (next)  next.disabled = _actLogPage >= totalPages;
  });
}

function _renderActLogRows(rows) {
  const EVENT_STYLE2 = {
    login:{ bg:'rgba(0,212,170,0.12)', color:'#00d4aa', icon:'🔐' },
    logout:{ bg:'rgba(255,92,124,0.12)', color:'#ff5c7c', icon:'🚪' },
    page_view:{ bg:'rgba(78,154,241,0.12)', color:'#4e9af1', icon:'👁️' },
    card_open:{ bg:'rgba(240,165,0,0.12)', color:'#f0a500', icon:'📋' },
    file_open:{ bg:'rgba(0,212,170,0.10)', color:'#00c49a', icon:'📄' },
    training_module_open:{ bg:'rgba(99,102,241,0.12)', color:'#818cf8', icon:'🎓' },
    training_submodule_open:{ bg:'rgba(99,102,241,0.08)', color:'#818cf8', icon:'📖' },
    video_play:{ bg:'rgba(168,85,247,0.12)', color:'#a855f7', icon:'▶️' },
    video_pause:{ bg:'rgba(168,85,247,0.08)', color:'#8b40e8', icon:'⏸️' },
    video_complete:{ bg:'rgba(0,212,170,0.15)', color:'#00d4aa', icon:'✅' },
  };
  return rows.map(row => {
    const s = EVENT_STYLE2[row.event_type] || { bg:'rgba(255,255,255,0.05)', color:'var(--muted)', icon:'📌' };
    const dt = row.created_at ? new Date(row.created_at) : null;
    const dateStr = dt ? dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) + '<br><span style="color:var(--muted);font-size:0.75rem;">' + dt.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) + '</span>' : '—';
    const emp     = row.employee_email || '—';
    const empName = _getEmpDisplayName(row);  // uses emp_id FK → Employee_name
    const dur = row.duration_seconds != null ? (row.duration_seconds >= 60 ? Math.floor(row.duration_seconds/60)+'m '+( row.duration_seconds%60)+'s' : row.duration_seconds+'s') : '—';
    const vid = row.video_title ? `<span title="${row.video_title}" style="display:block;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${row.video_title}</span>${row.video_watch_percent != null ? '<span style=\'color:var(--muted);font-size:0.75rem;\'>' + row.video_watch_percent + '% watched</span>' : ''}` : '—';
    const cardDetail = row.card_name || row.event_detail || '—';
    const devIcon = row.device === 'mobile' ? '📱' : '💻';

    return `<tr style="border-bottom:1px solid var(--border);transition:background 0.15s;" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
      <td style="padding:10px 14px;white-space:nowrap;color:var(--text2);font-size:0.79rem;">${dateStr}</td>
      <td style="padding:10px 14px;">
        <div style="font-weight:700;color:var(--text);font-size:0.84rem;">${empName}</div>
        <div style="color:var(--muted);font-size:0.73rem;">${emp !== '—' ? emp : ''}</div>
      </td>
      <td style="padding:10px 14px;">
        <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:0.75rem;font-weight:600;background:${s.bg};color:${s.color};">
          ${s.icon} ${(row.event_type||'').replace(/_/g,' ')}
        </span>
        ${row.session_duration_seconds ? '<div style="color:var(--muted);font-size:0.73rem;margin-top:3px;">Session: ' + (row.session_duration_seconds >= 60 ? Math.floor(row.session_duration_seconds/60)+'m' : row.session_duration_seconds+'s') + '</div>' : ''}
      </td>
      <td style="padding:10px 14px;color:var(--text2);font-size:0.81rem;white-space:nowrap;">${row.page_name || '—'}</td>
      <td style="padding:10px 14px;color:var(--text2);font-size:0.80rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${cardDetail}">${cardDetail}</td>
      <td style="padding:10px 14px;color:${dur!=='—'?'var(--accent2)':'var(--muted)'};font-weight:${dur!=='—'?'600':'400'};font-size:0.81rem;white-space:nowrap;">${dur}</td>
      <td style="padding:10px 14px;font-size:0.80rem;min-width:160px;max-width:220px;">${vid}</td>
      <td style="padding:10px 14px;text-align:center;font-size:1rem;" title="${row.device||''}">${devIcon}</td>
    </tr>`;
  }).join('');
}

function actLogPrevPage() { if (_actLogPage > 1) { _actLogPage--; renderActLogTable(); } }
function actLogNextPage() {
  const totalPages = Math.ceil(_actLogFiltered.length / _ACT_LOG_PER_PAGE);
  if (_actLogPage < totalPages) { _actLogPage++; renderActLogTable(); }
}

function renderActLogStats(rows) {
  const statsEl = document.getElementById('actlog-stats');
  if (!statsEl) return;
  const logins    = rows.filter(r => r.event_type === 'login').length;
  const logouts   = rows.filter(r => r.event_type === 'logout').length;
  const pageViews = rows.filter(r => r.event_type === 'page_view').length;
  const cardOpens = rows.filter(r => r.event_type === 'card_open').length;
  const videoPlay    = rows.filter(r => r.event_type === 'video_play').length;

  const trainingOpen = rows.filter(r => r.event_type === 'training_module_open' || r.event_type === 'training_submodule_open').length;
  const uniqueEmps   = new Set(rows.map(r=>r.employee_email || String(r.emp_id||'')).filter(Boolean)).size;

  const cards = [
    { icon:'🔐', label:'Total Logins',     value: logins,       color:'#00d4aa' },
    { icon:'👥', label:'Unique Users',     value: uniqueEmps,   color:'#4e9af1' },
    { icon:'📚', label:'Training Opens',   value: trainingOpen, color:'#6366f1' },
    { icon:'▶️', label:'Videos Played',   value: videoPlay,    color:'#a855f7' },

    { icon:'📂', label:'Cards Opened',     value: cardOpens,    color:'#f0a500' },
    { icon:'📊', label:'Total Events',     value: rows.length,  color:'#ff5c7c'},
  ];
  statsEl.innerHTML = cards.map(c => `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 16px;border-top:3px solid ${c.color};">
      <div style="font-size:1.5rem;margin-bottom:4px;">${c.icon}</div>
      <div style="font-size:1.5rem;font-weight:800;color:${c.color};">${c.value}</div>
      <div style="font-size:0.78rem;color:var(--muted);margin-top:2px;">${c.label}</div>
    </div>`).join('');
}


function _applyIMSNavVisibility() {
  const show = PERMISSIONS.can_view_ims === 'true';
  const el   = document.getElementById('nav-ims');
  const mmEl = document.getElementById('mm-ims');
  if (el)   el.style.display   = show ? 'flex' : 'none';
  if (mmEl) mmEl.style.display = show ? 'flex' : 'none';
}
  
function _applyFinanceNavVisibility() {
  const el   = document.getElementById('nav-finance');
  const mmEl = document.getElementById('mm-finance');
  if (el)   el.style.display   = '';
  if (mmEl) mmEl.style.display = 'flex';
}
/* ═══════════════════════════════════════════════════
   CRM VEHICLE DASHBOARD
═══════════════════════════════════════════════════ */
let _crmLoaded=false, _crmServer='both', _crmTier='', _crmStatus='';
let _crmData=[], _crmSelectedIdx=null;

function _canAccessCRM(){
  if(!CURRENT_USER)return false;
  return (PERMISSIONS.can_view_crm||'false')!=='false';
}
function _getCRMAccessLevel(){
  if(!CURRENT_USER)return'none';
  const p=PERMISSIONS.can_view_crm||'false';
  if(p==='false')return'none';
  // Check if ALL individual server permissions are ON (meaning truly full access)
  const rawRole=String(CURRENT_USER.rawRole||CURRENT_USER.role||'').toLowerCase().trim();
  const isSuperAdmin=(rawRole==='owner'||rawRole==='managing director'||rawRole==='mis');
  // Super admins with can_view_crm=true AND no explicit server restrictions = full access
  // But if any server toggle is explicitly set to 'true', we check them all
  const hasAnyServerPerm=(
    PERMISSIONS.crm_server_premium==='true'||
    PERMISSIONS.crm_server_pro==='true'||
    PERMISSIONS.crm_server_goa==='true'||
    PERMISSIONS.crm_server_bangalore==='true'||
    PERMISSIONS.crm_server_gujarat==='true'
  );
  // Super admins with NO server-level toggles set = full access (default)
  if(isSuperAdmin&&!hasAnyServerPerm)return'all';
  // Super admins WITH server toggles set = respect those toggles
  if(isSuperAdmin&&hasAnyServerPerm)return'restricted';
  // Regular users with can_view_crm=true = restricted (must have explicit server perms)
  if(p==='true')return'restricted';
  return p;
}
function _canViewCRMChanges(){
  if(!CURRENT_USER)return false;
  // Full access users always see it
  if(_getCRMAccessLevel()==='all') return true;
  return (PERMISSIONS.can_view_crm_changes||'false')==='true';
}
function _getCRMAllowedServers(){
  const lvl=_getCRMAccessLevel();
  if(lvl==='all')return['both','Premium Server','PRO Server','Goa Server','Bangalore Server','Gujarat Server'];
  if(lvl==='none')return[];
  // For restricted — always check individual server permissions
  const map={
    'Premium Server':  PERMISSIONS.crm_server_premium    ||'false',
    'PRO Server':      PERMISSIONS.crm_server_pro        ||'false',
    'Goa Server':      PERMISSIONS.crm_server_goa        ||'false',
    'Bangalore Server':PERMISSIONS.crm_server_bangalore  ||'false',
    'Gujarat Server':  PERMISSIONS.crm_server_gujarat    ||'false',
  };
  const allowed=Object.keys(map).filter(k=>map[k]==='true');
  if(allowed.length>1)allowed.unshift('both');
  return allowed;
}
// ═══════════════════════════════════════════════════════════════
// CUSTOMER MAPPING — JS
// ═══════════════════════════════════════════════════════════════
const _MAPI = 'https://knowlege-based-portal-production.up.railway.app';
let _mpData        = [];
let _mpFiltered    = [];
let _mpRegion      = 'All';
let _mpStatus      = 'all';
let _mpAllowedRgns = [];
let _mpCanEdit     = false;
let _mpLoaded      = false;
let _mpInlineTimer = null;

function _applyMappingNavVisibility(){
  const canView = PERMISSIONS.can_view_mapping === 'true';
  const el = document.getElementById('nav-mapping');
  const mm = document.getElementById('mm-mapping');
  if(el) el.style.display = canView ? 'flex' : 'none';
  if(mm) mm.style.display = canView ? 'flex' : 'none';
}

async function loadMappingDashboard(){
  if(_mpLoaded) return;
  _mpLoaded = true;
  _mpCanEdit = PERMISSIONS.can_edit_mapping === 'true';

  // Fetch allowed regions from PERMISSIONS (Option A)
  _mpAllowedRgns = [];
  if(PERMISSIONS.mapping_region_headoffice === 'true') _mpAllowedRgns.push('HeadOffice');
  if(PERMISSIONS.mapping_region_goa        === 'true') _mpAllowedRgns.push('Goa');
  if(PERMISSIONS.mapping_region_bangalore  === 'true') _mpAllowedRgns.push('Bangalore');
  if(PERMISSIONS.mapping_region_gujarat    === 'true') _mpAllowedRgns.push('Gujarat');
  if(!_mpAllowedRgns.length) _mpAllowedRgns = ['HeadOffice','Goa','Bangalore','Gujarat'];

  // Render region buttons
  const rbDiv = document.getElementById('mp-region-btns');
  if(rbDiv){
    rbDiv.innerHTML = ['All',..._mpAllowedRgns].map(r=>
      `<button class="mp-region-btn${r==='All'?' active':''}" onclick="mpSwitchRegion('${r}')" id="mp-rgn-${r}">${r}</button>`
    ).join('');
  }
  await mpLoadData();
}

async function mpLoadData(){
  document.getElementById('mp-loading').style.display = 'block';
  document.getElementById('mp-empty').style.display   = 'none';
  document.getElementById('mp-tbody').innerHTML       = '';
  try {
    const region = _mpRegion === 'All' ? '' : _mpRegion;
    const r = await fetch(`${_MAPI}/api/mapping-data?region=${encodeURIComponent(region)}`);
    _mpData = r.ok ? await r.json() : [];
  } catch(e){ _mpData = []; }
  document.getElementById('mp-loading').style.display = 'none';
  mpUpdateProgress();
  mpRenderTable();
}

function mpSwitchRegion(region){
  _mpRegion = region;
  document.querySelectorAll('.mp-region-btn').forEach(b=>b.classList.remove('active'));
  const btn = document.getElementById(`mp-rgn-${region}`);
  if(btn) btn.classList.add('active');
  _mpLoaded = false;
  mpLoadData();
  _mpLoaded = true;
}

function mpFilterStatus(status){
  _mpStatus = status;
  ['all','mapped','unmapped'].forEach(s=>{
    const b = document.getElementById(`mp-st-${s}`);
    if(b) b.classList.toggle('active', s===status);
  });
  mpRenderTable();
}

function mpUpdateProgress(){
  const total    = _mpData.length;
  const mapped   = _mpData.filter(r=>r.is_mapped).length;
  const unmapped = total - mapped;
  const pct      = total ? Math.round(mapped/total*100) : 0;
  const unpct    = total ? Math.round(unmapped/total*100) : 0;
  const vehicles = _mpData.filter(r=>r.is_mapped).reduce((s,r)=>s+(r.total_vehicles||0),0);

  const set = (id,val) => { const e=document.getElementById(id); if(e) e.textContent=val; };
  set('mp-kpi-total-val',   total.toLocaleString());
  set('mp-kpi-mapped-val',  mapped.toLocaleString());
  set('mp-kpi-unmapped-val',unmapped.toLocaleString());
  set('mp-kpi-vehicles-val',vehicles.toLocaleString());
  set('mp-kpi-mapped-pct',  `${pct}% complete`);
  set('mp-kpi-unmapped-pct',`${unpct}% remaining`);

  const mb = document.getElementById('mp-kpi-mapped-bar');
  const ub = document.getElementById('mp-kpi-unmapped-bar');
  if(mb) mb.style.width = `${pct}%`;
  if(ub) ub.style.width = `${unpct}%`;

  // Active KPI highlight
  ['mp-kpi-total','mp-kpi-mapped','mp-kpi-unmapped'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.classList.remove('active');
  });
  const activeMap = {all:'mp-kpi-total', mapped:'mp-kpi-mapped', unmapped:'mp-kpi-unmapped'};
  const activeEl  = document.getElementById(activeMap[_mpStatus]);
  if(activeEl) activeEl.classList.add('active');
}

function mpRenderTable(){
  const search = (document.getElementById('mp-search-input')?.value||'').toLowerCase();
  _mpFiltered = _mpData.filter(r=>{
    if(_mpStatus==='mapped'   && !r.is_mapped) return false;
    if(_mpStatus==='unmapped' &&  r.is_mapped) return false;
    if(search && !r.gps_name.toLowerCase().includes(search)) return false;
    return true;
  }).sort((a,b)=>(b.total_vehicles||0)-(a.total_vehicles||0));

  const tbody = document.getElementById('mp-tbody');
  const empty = document.getElementById('mp-empty');
  if(!_mpFiltered.length){ tbody.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';

  const tierClass = t => t==='Platinum'?'mp-tier-plat':t==='Gold'?'mp-tier-gold':'mp-tier-silv';

  tbody.innerHTML = _mpFiltered.map((r,i)=>{
    const tierBadge = r.tier
      ? `<span class="mp-tier-badge ${tierClass(r.tier)}">${r.tier}</span>`
      : '<span style="color:var(--muted);font-size:12px;">—</span>';

    const statusBadge = r.is_mapped
      ? `<span class="mp-mapped-badge mp-mapped-yes">✅ Mapped</span>`
      : `<span class="mp-mapped-badge mp-mapped-no">❌ Unmapped</span>`;

    const odooCell = _mpCanEdit
      ? `<div style="position:relative;" id="mp-wrap-${i}">
          <div style="display:flex;align-items:center;border:1.5px solid var(--border);border-radius:6px;background:var(--surface2);overflow:hidden;">
            <input class="mp-inline-search" type="text"
              value="${(r.canonical_name||'').replace(/"/g,'&quot;')}"
              placeholder="Search Odoo customer..."
              data-idx="${i}"
              oninput="mpInlineSearch(this,${i})"
              onclick="mpInlineClick(this,${i})"
              onblur="mpInlineBlur(this,${i})"
              autocomplete="off"
              style="flex:1;padding:5px 8px;border:none;background:transparent;color:var(--text);font-size:12px;outline:none;">
            ${r.canonical_name ? `<span onclick="mpClearMapping(${i})" title="Clear mapping" style="padding:0 8px;cursor:pointer;color:#ef4444;font-size:16px;line-height:1;flex-shrink:0;">✕</span>` : ''}
          </div>
          <div id="mp-dd-${i}" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--surface);border:1px solid var(--border);border-radius:8px;z-index:9999;max-height:200px;overflow-y:auto;box-shadow:0 4px 16px rgba(0,0,0,0.18);margin-top:2px;"></div>
        </div>`
      : `<span style="font-size:12px;color:${r.canonical_name?'var(--text)':'var(--muted)'};font-style:${r.canonical_name?'normal':'italic'};">${r.canonical_name||'Not mapped'}</span>`;

    return `<tr>
      <td style="color:var(--muted);font-size:12px;">${i+1}</td>
      <td style="font-weight:600;max-width:180px;">${r.gps_name}</td>
      <td style="font-size:12px;color:var(--muted);">${r.region||'—'}</td>
      <td>${tierBadge}</td>
      <td style="font-weight:600;color:#10b981;">${r.total_vehicles||0}</td>
      <td style="min-width:200px;">${odooCell}</td>
      <td>${statusBadge}</td>
    </tr>`;
  }).join('');
}

async function mpInlineSearch(input, idx){
  const q  = input.value.trim();
  const dd = document.getElementById(`mp-dd-${idx}`);
  if(!dd) return;
  clearTimeout(_mpInlineTimer);
  // Show all if empty, search if has text
  _mpInlineTimer = setTimeout(async()=>{
    try {
      const searchQ = q.length > 0 ? q : ' ';
      const r    = await fetch(`${_MAPI}/api/odoo-search?q=${encodeURIComponent(searchQ)}`);
      const data = r.ok ? await r.json() : [];
      if(!data.length){ dd.style.display='none'; return; }
      dd.style.display = 'block';
      dd.innerHTML = data.map(o=>
        `<div onmousedown="mpInlineSelect(${idx},${o.id},'${o.odoo_name.replace(/'/g,"\\'").replace(/"/g,'&quot;')}')"
          style="padding:9px 12px;cursor:pointer;font-size:13px;color:var(--text);border-bottom:1px solid var(--border);"
          onmouseover="this.style.background='var(--surface2)'"
          onmouseout="this.style.background=''">
          ${o.odoo_name}
        </div>`
      ).join('');
    } catch(e){}
  }, 200);
}

// Click on input — show dropdown with current value or all
async function mpInlineClick(input, idx){
  const q  = input.value.trim();
  const dd = document.getElementById(`mp-dd-${idx}`);
  if(!dd) return;
  // Already open — don't refetch
  if(dd.style.display === 'block') return;
  try {
    const searchQ = q.length > 0 ? q : 'a'; // show some results
    const r    = await fetch(`${_MAPI}/api/odoo-search?q=${encodeURIComponent(searchQ)}`);
    const data = r.ok ? await r.json() : [];
    if(!data.length){ return; }
    dd.style.display = 'block';
    dd.innerHTML = data.map(o=>
      `<div onmousedown="mpInlineSelect(${idx},${o.id},'${o.odoo_name.replace(/'/g,"\\'").replace(/"/g,'&quot;')}')"
        style="padding:9px 12px;cursor:pointer;font-size:13px;color:var(--text);border-bottom:1px solid var(--border);"
        onmouseover="this.style.background='var(--surface2)'"
        onmouseout="this.style.background=''">
        ${o.odoo_name}
      </div>`
    ).join('');
  } catch(e){}
}

async function mpInlineSelect(idx, odooId, odooName){
  const row = _mpFiltered[idx];
  if(!row) return;
  const dd    = document.getElementById(`mp-dd-${idx}`);
  const input = document.querySelector(`.mp-inline-search[data-idx="${idx}"]`);
  if(dd)    dd.style.display = 'none';
  if(input) input.value      = odooName;

  try {
    const res = await fetch(`${_MAPI}/api/save-mapping`, {
      method:  'POST',
      headers: { 'Content-Type':'application/json', 'X-User-Email': CURRENT_USER?.email||'' },
      body: JSON.stringify({
        gps_alias_id:   row.gps_alias_id,
        gps_name:       row.gps_name,
        odoo_alias_ids: [odooId],
        canonical_name: odooName,
        tier:           row.tier||''
      })
    });
    if(res.ok){
      const di = _mpData.findIndex(r=>r.gps_alias_id===row.gps_alias_id);
      if(di>=0){ _mpData[di].is_mapped=true; _mpData[di].canonical_name=odooName; }
      const fi = _mpFiltered.findIndex(r=>r.gps_alias_id===row.gps_alias_id);
      if(fi>=0){ _mpFiltered[fi].is_mapped=true; _mpFiltered[fi].canonical_name=odooName; }
      // Update status + add clear button in DOM
      const rows = document.querySelectorAll('#mp-tbody tr');
      if(rows[idx]){
        const cells = rows[idx].querySelectorAll('td');
        if(cells[6]) cells[6].innerHTML='<span class="mp-mapped-badge mp-mapped-yes">✅ Mapped</span>';
        // Add clear button
        const wrap = document.getElementById(`mp-wrap-${idx}`);
        if(wrap){
          const existX = wrap.querySelector('.mp-clear-btn');
          if(!existX){
            const xBtn = document.createElement('span');
            xBtn.className = 'mp-clear-btn';
            xBtn.title = 'Clear mapping';
            xBtn.innerHTML = '✕';
            xBtn.style.cssText = 'padding:0 8px;cursor:pointer;color:#ef4444;font-size:16px;line-height:1;flex-shrink:0;';
            xBtn.onclick = ()=> mpClearMapping(idx);
            wrap.querySelector('div').appendChild(xBtn);
          }
        }
      }
      mpUpdateProgress();
    } else {
      alert('Save failed!');
      if(input) input.value = row.canonical_name||'';
    }
  } catch(e){
    alert('Network error: '+e.message);
    if(input) input.value = row.canonical_name||'';
  }
}

// Clear mapping for a row
async function mpClearMapping(idx){
  const row = _mpFiltered[idx];
  if(!row || !row.customer_id) return;
  if(!confirm(`Clear the mapping for "${row.gps_name}"?`)) return;

  try {
    // GPS alias se customer_id remove karo
    const res = await fetch(`${_MAPI}/api/clear-mapping`, {
      method:  'POST',
      headers: { 'Content-Type':'application/json', 'X-User-Email': CURRENT_USER?.email||'' },
      body: JSON.stringify({ gps_alias_id: row.gps_alias_id })
    });
    if(res.ok){
      const di = _mpData.findIndex(r=>r.gps_alias_id===row.gps_alias_id);
      if(di>=0){ _mpData[di].is_mapped=false; _mpData[di].canonical_name=''; _mpData[di].customer_id=null; }
      const fi = _mpFiltered.findIndex(r=>r.gps_alias_id===row.gps_alias_id);
      if(fi>=0){ _mpFiltered[fi].is_mapped=false; _mpFiltered[fi].canonical_name=''; _mpFiltered[fi].customer_id=null; }
      // Update DOM
      const input = document.querySelector(`.mp-inline-search[data-idx="${idx}"]`);
      if(input) input.value = '';
      const wrap = document.getElementById(`mp-wrap-${idx}`);
      if(wrap){ const x = wrap.querySelector('.mp-clear-btn'); if(x) x.remove(); }
      const rows = document.querySelectorAll('#mp-tbody tr');
      if(rows[idx]){
        const cells = rows[idx].querySelectorAll('td');
        if(cells[6]) cells[6].innerHTML='<span class="mp-mapped-badge mp-mapped-no">❌ Unmapped</span>';
      }
      mpUpdateProgress();
    } else {
      alert('Clear failed!');
    }
  } catch(e){ alert('Network error: '+e.message); }
}

// Blur — close dropdown only (don't reset — onmousedown on item fires before onblur)
function mpInlineBlur(input, idx){
  setTimeout(()=>{
    const dd = document.getElementById(`mp-dd-${idx}`);
    if(dd) dd.style.display='none';
  }, 250);
}

// Close dropdowns on outside click
document.addEventListener('DOMContentLoaded', function(){
  window.addEventListener('click', function(e){
    if(!e.target.classList.contains('mp-inline-search')){
      document.querySelectorAll('[id^="mp-dd-"]').forEach(d=>d.style.display='none');
    }
  });
});
// ── end Customer Mapping JS ───────────────────────────────────

function _applyCRMNavVisibility(){
  const el=document.getElementById('nav-crm'),mm=document.getElementById('mm-crm'),show=_canAccessCRM();
  if(el)el.style.display=show?'flex':'none';
  if(mm)mm.style.display=show?'flex':'none';
}
function _applyCRMServerButtons(){
  const allowed=_getCRMAllowedServers();
  const btnMap={
    'both':'crm-btn-both','Premium Server':'crm-btn-prem','PRO Server':'crm-btn-pro',
    'Goa Server':'crm-btn-goa','Bangalore Server':'crm-btn-bang','Gujarat Server':'crm-btn-guj'
  };
  Object.keys(btnMap).forEach(srv=>{
    const el=document.getElementById(btnMap[srv]);
    if(el)el.style.display=allowed.includes(srv)?'':'none';
  });
  if(!allowed.includes(_crmServer)){
    const first=allowed.find(s=>s!=='both')||allowed[0];
    if(first)_crmServer=first;
  }
  // Show/hide changes section based on permission
  const sec=document.getElementById('crm-changes-section');
  if(sec)sec.style.display=_canViewCRMChanges()?'block':'none';
}
function _crmAnim(el,val,dur=600){
  if(!el)return;
  const t0=performance.now();
  function step(now){const p=Math.min((now-t0)/dur,1),e=1-Math.pow(1-p,3);el.textContent=Math.round(e*val).toLocaleString();if(p<1)requestAnimationFrame(step);}
  requestAnimationFrame(step);
}

/* Paginated fetch — bypasses Supabase 1000 row default limit */
async function _crmFetchAll(baseUrl){
  const pageSize=1000, hdrs=SB_HDRS();
  let allRows=[], offset=0;
  while(true){
    const res=await fetch(`${baseUrl}&limit=${pageSize}&offset=${offset}`,{
      headers:{...hdrs,'Range-Unit':'items','Range':`${offset}-${offset+pageSize-1}`}
    });
    const batch=await res.json();
    if(!Array.isArray(batch)||batch.length===0)break;
    allRows=[...allRows,...batch];
    if(batch.length<pageSize)break;
    offset+=pageSize;
  }
  return allRows;
}

async function loadCRMDashboard(){
  if(!_canAccessCRM()){switchDB('home');return;}
  _applyCRMServerButtons();
  const acc=_getCRMAccessLevel();
  const pw=document.getElementById('crm-access-pill-wrap');
  if(pw){
    if(acc==='all')pw.innerHTML='<span class="crm-access-pill crm-pill-all">✅ Full Access</span>';
    else if(acc==='restricted')pw.innerHTML='<span class="crm-access-pill crm-pill-tier">🔒 Server Restricted</span>';
    else if(acc!=='none'){
      pw.innerHTML=`<span class="crm-access-pill crm-pill-tier">🔒 ${acc} Only</span>`;
      crmSwitchTier(acc);
      document.querySelectorAll('#panel-crm .crm-tier-btn').forEach(b=>b.style.pointerEvents='none');
    }
  }
  const tb=document.getElementById('crm-tbl-body');
  if(tb)tb.innerHTML='<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--muted);">Loading data...</td></tr>';
  crmClearSelection();
  try{
    const baseUrl=_crmServer==='both'
      ?`${SUPABASE_URL}/rest/v1/server_customer_summary?order=total_vehicles.desc`
      :`${SUPABASE_URL}/rest/v1/server_customer_summary?region=eq.${encodeURIComponent(_crmServer)}&order=total_vehicles.desc`;
    let data=await _crmFetchAll(baseUrl);
    // For restricted users: filter data to only allowed servers
    if(acc==='restricted'){
      const allowedSrvs=_getCRMAllowedServers().filter(s=>s!=='both');
      if(allowedSrvs.length>0) data=data.filter(r=>allowedSrvs.includes(r.region));
    }
    if(acc!=='all'&&acc!=='none'&&acc!=='restricted')data=data.filter(r=>r.tier===acc);
    _crmData=data; _crmLoaded=true;
    const si=document.getElementById('crm-sync-info');
    if(si)si.textContent='Last loaded: '+new Date().toLocaleTimeString()+' — syncs every 5 min · Click any row to see details';
    // Auto-load today's vehicle changes if user has access
    if(_canViewCRMChanges()){
      crmChgQuick('yesterday');
    }
    loadCustomerAlerts();
    crmApplyFilters();
  }catch(e){
    console.error('CRM load error:',e);
    const tb2=document.getElementById('crm-tbl-body');
    if(tb2)tb2.innerHTML='<tr><td colspan="11" style="text-align:center;padding:40px;color:#ef4444;">Failed to load. Check console.</td></tr>';
  }
}

function crmApplyFilters(){
  const s=(document.getElementById('crm-search')?.value||'').toLowerCase();
  let f=_crmData.filter(r=>(!s||(r.company||'').toLowerCase().includes(s))&&(!_crmTier||r.tier===_crmTier));
  if(_crmStatus){const km={RUNNING:'running_count',IDLE:'idle_count',STOP:'stop_count',INACTIVE:'inactive_count'};f=f.filter(r=>(r[km[_crmStatus]]||0)>0);}
  crmRenderCards(f);
  crmRenderTable(f);
  const c=document.getElementById('crm-count'); if(c)c.textContent=f.length;
}

function crmRenderCards(data){
  const tot =data.reduce((s,r)=>s+(r.total_vehicles||0),0);
  const run =data.reduce((s,r)=>s+(r.running_count||0),0);
  const idl =data.reduce((s,r)=>s+(r.idle_count||0),0);
  const stp =data.reduce((s,r)=>s+(r.stop_count||0),0);
  const ina =data.reduce((s,r)=>s+(r.inactive_count||0),0);
  const act =run+idl+stp;
  const cust=data.length;
  const g=id=>document.getElementById(id);
  _crmAnim(g('crm-s-customers'),cust);
  _crmAnim(g('crm-s-total'),tot);
  _crmAnim(g('crm-s-active'),act);
  _crmAnim(g('crm-s-run'),run);
  _crmAnim(g('crm-s-idle'),idl);
  _crmAnim(g('crm-s-stop'),stp);
  _crmAnim(g('crm-s-inac'),ina);
  if(g('crm-ap-run')) g('crm-ap-run').textContent=run.toLocaleString();
  if(g('crm-ap-idle'))g('crm-ap-idle').textContent=idl.toLocaleString();
  if(g('crm-ap-stop'))g('crm-ap-stop').textContent=stp.toLocaleString();
  const srv=_crmServer==='both'?'all servers':_crmServer.replace(' Server','');
  if(g('crm-ss-customers'))g('crm-ss-customers').textContent=_crmTier?_crmTier+' tier':'all servers';
  if(g('crm-ss-total'))g('crm-ss-total').textContent=cust+' companies';
  if(g('crm-ss-active'))g('crm-ss-active').textContent=tot?Math.round(act/tot*100)+'% of total fleet':'running+idle+stop';
  if(g('crm-ss-run'))g('crm-ss-run').textContent=act?Math.round(run/act*100)+'% of active':'in motion';
  if(g('crm-ss-idle'))g('crm-ss-idle').textContent=act?Math.round(idl/act*100)+'% of active':'engine on';
  if(g('crm-ss-stop'))g('crm-ss-stop').textContent=act?Math.round(stp/act*100)+'% of active':'parked';
  if(g('crm-ss-inac'))g('crm-ss-inac').textContent=tot?Math.round(ina/tot*100)+'% of fleet':'no signal';
}

/* Clicking a table row highlights it + updates KPI cards with that company's data */
function crmSelectRow(idx, rowEl){
  const r=_crmData[idx];
  if(!r)return;
  // Deselect previous
  document.querySelectorAll('#crm-tbl-body tr.crm-row-selected').forEach(tr=>tr.classList.remove('crm-row-selected'));
  // If same row clicked again — deselect
  if(_crmSelectedIdx===idx){
    _crmSelectedIdx=null;
    crmClearSelection();
    crmApplyFilters(); // restore full cards
    return;
  }
  _crmSelectedIdx=idx;
  rowEl.classList.add('crm-row-selected');
  // Update KPI cards to show this company's data
  const act=(r.running_count||0)+(r.idle_count||0)+(r.stop_count||0);
  const tot=r.total_vehicles||0;
  const g=id=>document.getElementById(id);
  _crmAnim(g('crm-s-customers'),1,300);
  _crmAnim(g('crm-s-total'),tot,300);
  _crmAnim(g('crm-s-active'),act,300);
  _crmAnim(g('crm-s-run'),r.running_count||0,300);
  _crmAnim(g('crm-s-idle'),r.idle_count||0,300);
  _crmAnim(g('crm-s-stop'),r.stop_count||0,300);
  _crmAnim(g('crm-s-inac'),r.inactive_count||0,300);
  if(g('crm-ap-run')) g('crm-ap-run').textContent=(r.running_count||0).toLocaleString();
  if(g('crm-ap-idle'))g('crm-ap-idle').textContent=(r.idle_count||0).toLocaleString();
  if(g('crm-ap-stop'))g('crm-ap-stop').textContent=(r.stop_count||0).toLocaleString();
  if(g('crm-ss-customers'))g('crm-ss-customers').textContent='selected company';
  if(g('crm-ss-total'))g('crm-ss-total').textContent=r.company||'—';
  if(g('crm-ss-active'))g('crm-ss-active').textContent=tot?Math.round(act/tot*100)+'% of this company':'running+idle+stop';
  if(g('crm-ss-run'))g('crm-ss-run').textContent=act?Math.round((r.running_count||0)/act*100)+'% of active':'—';
  if(g('crm-ss-idle'))g('crm-ss-idle').textContent=act?Math.round((r.idle_count||0)/act*100)+'% of active':'—';
  if(g('crm-ss-stop'))g('crm-ss-stop').textContent=act?Math.round((r.stop_count||0)/act*100)+'% of active':'—';
  if(g('crm-ss-inac'))g('crm-ss-inac').textContent=tot?Math.round((r.inactive_count||0)/tot*100)+'% of company':'—';
  // Show selected company bar
  const bar=document.getElementById('crm-selected-bar');
  const nm=document.getElementById('crm-sel-name');
  const st=document.getElementById('crm-sel-stats');
  if(bar)bar.classList.add('show');
  if(nm)nm.textContent=r.company||'—';
  if(st)st.innerHTML=`
    <span class="crm-sel-stat" style="color:#0a7bc4">🚗 ${(r.total_vehicles||0).toLocaleString()} Total</span>
    <span class="crm-sel-stat" style="color:#10b981">🟢 ${(r.running_count||0).toLocaleString()} Running</span>
    <span class="crm-sel-stat" style="color:#f59e0b">🟡 ${(r.idle_count||0).toLocaleString()} Idle</span>
    <span class="crm-sel-stat" style="color:#64748b">⚫ ${(r.stop_count||0).toLocaleString()} Stop</span>
    <span class="crm-sel-stat" style="color:#ef4444">🔴 ${(r.inactive_count||0).toLocaleString()} Inactive</span>
    <span class="crm-sel-stat" style="color:#7c3aed">${r.tier||'—'}</span>
  `;
}

function crmClearSelection(){
  _crmSelectedIdx=null;
  document.querySelectorAll('#crm-tbl-body tr.crm-row-selected').forEach(tr=>tr.classList.remove('crm-row-selected'));
  const bar=document.getElementById('crm-selected-bar');
  if(bar)bar.classList.remove('show');
}

function crmRenderTable(data){
  const tb=document.getElementById('crm-tbl-body'); if(!tb)return;
  if(!data.length){tb.innerHTML='<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--muted);">No companies found</td></tr>';return;}
  const ec={'guddu':'#6366f1','darshil':'#f59e0b','nitasha':'#10b981'};
  tb.innerHTML=data.map((r,i)=>{
    const tc=r.tier==='Platinum'?'tb-plat':r.tier==='Gold'?'tb-gold':'tb-silv';
    const ti=r.tier==='Platinum'?'💎':r.tier==='Gold'?'🥇':'🥈';
    const t=r.total_vehicles||1;
    const bR=Math.round((r.running_count||0)/t*80),bI=Math.round((r.idle_count||0)/t*80),bS=Math.round((r.stop_count||0)/t*80),bN=Math.max(0,80-bR-bI-bS);
    const syn=r.last_synced?new Date(r.last_synced).toLocaleString():'—';
    const en=r.assigned_to||'—',ek=Object.keys(ec).find(k=>en.toLowerCase().includes(k)),ecol=ek?ec[ek]:'var(--muted)';
    // Find original index in _crmData for selection
    const dataIdx=_crmData.indexOf(r);
    return`<tr onclick="crmSelectRow(${dataIdx},this)" title="Click to see ${r.company||''} details in cards">
      <td style="color:var(--muted);font-weight:500">${i+1}</td>
      <td style="font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;" title="${r.company||''}">${r.company||'—'}</td>
      <td><span class="crm-tier-badge ${tc}">${ti} ${r.tier||'—'}</span></td>
      <td style="font-weight:700;color:#0a7bc4;">${(r.total_vehicles||0).toLocaleString()}</td>
      <td style="font-weight:600;color:#10b981;">${(r.running_count||0).toLocaleString()}</td>
      <td style="font-weight:600;color:#f59e0b;">${(r.idle_count||0).toLocaleString()}</td>
      <td style="font-weight:600;color:#64748b;">${(r.stop_count||0).toLocaleString()}</td>
      <td style="font-weight:600;color:#ef4444;">${(r.inactive_count||0).toLocaleString()}</td>
      <td><div class="crm-bar"><div class="crm-bar-run" style="width:${bR}px"></div><div class="crm-bar-idle" style="width:${bI}px"></div><div class="crm-bar-stop" style="width:${bS}px"></div><div class="crm-bar-inac" style="width:${bN}px"></div></div></td>
      <td><span class="crm-emp-chip"><span class="crm-emp-dot" style="background:${ecol}"></span>${en}</span></td>
      <td style="font-size:11px;color:var(--muted);">${syn}</td>
    </tr>`;
  }).join('');
}

function crmSwitchServer(s){
  _crmServer=s; _crmLoaded=false;
  ['crm-btn-both','crm-btn-prem','crm-btn-pro','crm-btn-goa','crm-btn-bang','crm-btn-guj'].forEach(id=>{
    const el=document.getElementById(id); if(el)el.className='crm-srv-btn';
  });
  const map={
    'both':'crm-btn-both','Premium Server':'crm-btn-prem','PRO Server':'crm-btn-pro',
    'Goa Server':'crm-btn-goa','Bangalore Server':'crm-btn-bang','Gujarat Server':'crm-btn-guj'
  };
  const activeId=map[s];
  if(activeId){const el=document.getElementById(activeId);if(el)el.className='crm-srv-btn'+(s==='both'?' both-active':' active');}
  loadCRMDashboard();
}

// ── VEHICLE CHANGES ───────────────────────────────────────────
let _chgAddedAll=[], _chgRemovedAll=[];

function _fmtDate(d){
  // IST = UTC+5:30
  const ist = new Date(d.getTime() + (5*60+30)*60000);
  return ist.toISOString().split('T')[0];
}

function crmChgQuick(period){
  // Highlight active button
  ['chg-q-yesterday','chg-q-7d','chg-q-30d'].forEach(id=>{
    const el=document.getElementById(id); if(el)el.className='crm-chg-qbtn';
  });
  const activeMap={'yesterday':'chg-q-yesterday','7d':'chg-q-7d','30d':'chg-q-30d'};
  const btn=document.getElementById(activeMap[period]); if(btn)btn.className='crm-chg-qbtn active';

  // IST today
const now = new Date();
const istOffset = 5*60+30; // minutes
const istNow = new Date(now.getTime() + istOffset*60000);
const today = new Date(istNow.toISOString().split('T')[0]+'T00:00:00.000Z');
  let fromDate, toDate, periodLabel, isLiveToday=false;

  if(period==='yesterday'){
    // Yesterday = literally yesterday's change_date batch
    const yest=new Date(today); yest.setDate(yest.getDate()-1);
    fromDate=_fmtDate(yest); toDate=_fmtDate(yest);
    periodLabel='Yesterday\'s changes ('+_fmtDate(yest)+')';
  } else if(period==='7d'){
    const d=new Date(today); d.setDate(d.getDate()-7);
    fromDate=_fmtDate(d); toDate=_fmtDate(today);
    periodLabel='Last 7 days — '+_fmtDate(d)+' → Today';
  } else if(period==='30d'){
    const d=new Date(today); d.setDate(d.getDate()-30);
    fromDate=_fmtDate(d); toDate=_fmtDate(today);
    periodLabel='Last 30 days — '+_fmtDate(d)+' → Today';
  }

  // Set date pickers to reflect selection
  const fi=document.getElementById('chg-date-from');
  const ti=document.getElementById('chg-date-to');
  if(fi)fi.value=fromDate;
  if(ti)ti.value=toDate==='live'?_fmtDate(today):toDate;

  crmChgLoad(fromDate, toDate, periodLabel, isLiveToday);
}

function crmChgCustom(){
  const from=document.getElementById('chg-date-from')?.value;
  const to=document.getElementById('chg-date-to')?.value;
  if(!from||!to)return;
  if(from>to){alert('From date must be before To date');return;}
  // Deactivate quick buttons
  ['chg-q-yesterday','chg-q-7d','chg-q-30d'].forEach(id=>{
    const el=document.getElementById(id); if(el)el.className='crm-chg-qbtn';
  });
  const todayStr=_fmtDate(new Date());
  const toVal=to===todayStr?'live':to;
  const label=from+' 11:50PM → '+(toVal==='live'?'Now (live)':to+' 11:50PM');
  const isLiveToday=(from===to && to===todayStr);
  crmChgLoad(from, toVal, label, isLiveToday);
}

// ── VEHICLE CHANGES — new logic using vehicle_changes table ──
let _chgDetailType='added', _chgDetailData=[], _chgFromDate='', _chgToDate='';

async function crmChgLoad(fromDate, toDate, periodLabel, isLiveToday){
  const g=id=>document.getElementById(id);
  if(g('chg-added-count'))  g('chg-added-count').textContent='...';
  if(g('chg-removed-count'))g('chg-removed-count').textContent='...';
  if(g('chg-added-pct'))    g('chg-added-pct').textContent='';
  if(g('chg-removed-pct'))  g('chg-removed-pct').textContent='';
  if(g('chg-period-label')) g('chg-period-label').textContent=periodLabel||'—';
  if(g('chg-server-label')) g('chg-server-label').textContent=_crmServer==='both'?'All Servers':_crmServer.replace(' Server','');
  if(g('chg-detail-panel')) g('chg-detail-panel').style.display='none';

  _chgFromDate=fromDate; _chgToDate=toDate==='live'?_fmtDate(new Date()):toDate;

  // Also update KPI deltas to match selected date range
  crmLoadKpiDeltas(fromDate, toDate==='live'?_fmtDate(new Date()):toDate, isLiveToday);

  try{
    const hdrs={...SB_HDRS()};

    // Fetch from vehicle_changes table for the date range
    async function fetchChanges(type){
      let url=`${SUPABASE_URL}/rest/v1/vehicle_changes?select=imeino,vehicle_no,vehicle_name,company,tier,region,change_date&change_type=eq.${type}&change_date=gte.${fromDate}&change_date=lte.${_chgToDate}`;
      if(_crmServer!=='both'){
        url+=`&region=eq.${encodeURIComponent(_crmServer)}`;
      } else {
        const allowedSrvs=_getCRMAllowedServers().filter(s=>s!=='both');
        if(allowedSrvs.length>0 && allowedSrvs.length<5){
          url+=`&region=in.(${allowedSrvs.map(s=>encodeURIComponent(s)).join(',')})`;
        }
      }
      if(_crmTier) url+=`&tier=eq.${encodeURIComponent(_crmTier)}`;
      url+=`&order=change_date.desc&limit=5000`;
      const res=await fetch(url,{headers:hdrs});
      return await res.json();
    }

    const [addedRows, removedRows] = await Promise.all([
      fetchChanges('added'),
      fetchChanges('removed')
    ]);

    const added   = Array.isArray(addedRows)   ? addedRows   : [];
    const removed = Array.isArray(removedRows) ? removedRows : [];

    // Get total vehicles for % calculation
    const totalVehicles = parseInt(g('crm-s-total')?.textContent?.replace(/,/g,'')||'0')||0;

    // Update counts
    if(g('chg-added-count'))   g('chg-added-count').textContent=added.length.toLocaleString();
    if(g('chg-removed-count')) g('chg-removed-count').textContent=removed.length.toLocaleString();

    // Show percentage
    if(totalVehicles>0){
      const addPct=((added.length/totalVehicles)*100).toFixed(1);
      const remPct=((removed.length/totalVehicles)*100).toFixed(1);
      if(g('chg-added-pct'))   g('chg-added-pct').textContent=`+${addPct}% of fleet`;
      if(g('chg-removed-pct')) g('chg-removed-pct').textContent=`-${remPct}% of fleet`;
    }

    // Store for detail view
    window._chgAdded   = added;
    window._chgRemoved = removed;

  }catch(e){
    console.error('Vehicle changes error:',e);
    if(g('chg-added-count'))   g('chg-added-count').textContent='—';
    if(g('chg-removed-count')) g('chg-removed-count').textContent='—';
  }
}
async function crmLoadKpiDeltas(fromDate, toDate, isLiveToday){
  try{
    const hdrs={...SB_HDRS()};
    const g=id=>document.getElementById(id);

    // ── 1. Total Vehicles delta — vehicle_changes se ──
    async function fetchCount(type){
      let url=`${SUPABASE_URL}/rest/v1/vehicle_changes?select=imeino&change_type=eq.${type}&change_date=gte.${fromDate}&change_date=lte.${toDate}`;
      if(_crmServer!=='both'){
        url+=`&region=eq.${encodeURIComponent(_crmServer)}`;
      } else {
        const allowedSrvs=_getCRMAllowedServers().filter(s=>s!=='both');
        if(allowedSrvs.length>0 && allowedSrvs.length<5)
          url+=`&region=in.(${allowedSrvs.map(s=>encodeURIComponent(s)).join(',')})`;
      }
      url+=`&limit=5000`;
      const res=await fetch(url,{headers:hdrs});
      const data=await res.json();
      return Array.isArray(data)?data.length:0;
    }

    // ── 2. Stats delta — daily_fleet_stats se ──
    let statsUrl=`${SUPABASE_URL}/rest/v1/daily_fleet_stats?select=snapshot_date,region,tier,total_vehicles,active_vehicles,running_vehicles,idle_vehicles,stop_vehicles,inactive_vehicles&tier=eq.All&order=snapshot_date.asc&limit=500`;
    if(_crmServer!=='both') statsUrl+=`&region=eq.${encodeURIComponent(_crmServer)}`;

    const [addedCount, removedCount, statsRes] = await Promise.all([
      fetchCount('added'),
      fetchCount('removed'),
      fetch(statsUrl,{headers:hdrs})
    ]);
    const statsRows = await statsRes.json();

    // Total Vehicles arrow
    const net = addedCount - removedCount;
    const totalEl=g('crm-delta-total');
    if(totalEl){
      if(net===0){totalEl.textContent='No change';totalEl.className='crm-kpi-delta neutral';}
      else{
        const arrow=net>0?'▲':'▼';
        const sign=net>0?'+':'';
        totalEl.className='crm-kpi-delta '+(net>0?'up':'down');
        totalEl.textContent=`${arrow} ${sign}${net.toLocaleString()} vehicles`;
      }
    }

    // ── Stats comparison ──
    if(!Array.isArray(statsRows)||!statsRows.length) return;

    const byDate={};
    statsRows.forEach(r=>{
      if(!byDate[r.snapshot_date]) byDate[r.snapshot_date]={active:0,running:0,idle:0,stop:0,inactive:0};
      byDate[r.snapshot_date].active   += r.active_vehicles   ||0;
      byDate[r.snapshot_date].running  += r.running_vehicles  ||0;
      byDate[r.snapshot_date].idle     += r.idle_vehicles     ||0;
      byDate[r.snapshot_date].stop     += r.stop_vehicles     ||0;
      byDate[r.snapshot_date].inactive += r.inactive_vehicles ||0;
    });

    const dates=Object.keys(byDate).sort();
    if(!dates.length) return;

    // FIX (16-Jun-2026): earlier, "base" and "current" were BOTH resolved as
    // "nearest snapshot <= date" using the same date whenever fromDate===toDate —
    // which happens for BOTH "Today" and "Yesterday" quick filters by design.
    // That made base accidentally equal current for "Yesterday" too, wrongly
    // triggering the live-data fallback (meant ONLY for "Today") — comparing
    // live-right-now numbers against a snapshot from several days back, which
    // produced fake 700%+ jumps. Now each mode is resolved explicitly so base
    // and current always land on the correct, distinct dates.
    let current, baseDate;

    if(isLiveToday){
      // "Today": current = LIVE right now, base = most recent snapshot on/before fromDate
      current={
        active:   parseInt((g('crm-s-active')?.textContent||'0').replace(/,/g,''))||0,
        running:  parseInt((g('crm-s-run')?.textContent||'0').replace(/,/g,''))   ||0,
        idle:     parseInt((g('crm-s-idle')?.textContent||'0').replace(/,/g,''))  ||0,
        stop:     parseInt((g('crm-s-stop')?.textContent||'0').replace(/,/g,''))  ||0,
        inactive: parseInt((g('crm-s-inac')?.textContent||'0').replace(/,/g,''))  ||0,
      };
      const baseDates=dates.filter(d=>d<=fromDate);
      baseDate=baseDates.length?baseDates[baseDates.length-1]:dates[0];
    } else if(fromDate===toDate){
      // Single specific historical day (e.g. "Yesterday", or a custom single-day pick):
      // current = that day's OWN snapshot, base = nearest snapshot STRICTLY BEFORE it
      // (never the same date as current, even across a multi-day gap)
      const currDates=dates.filter(d=>d<=toDate);
      const currDate=currDates.length?currDates[currDates.length-1]:null;
      if(!currDate) return;
      current=byDate[currDate];
      const baseDates=dates.filter(d=>d<currDate);
      baseDate=baseDates.length?baseDates[baseDates.length-1]:null;
      if(!baseDate) return;
    } else {
      // Multi-day range (Last 7/30 days, custom range)
      const currDates=dates.filter(d=>d<=toDate);
      const currDate=currDates.length?currDates[currDates.length-1]:null;
      if(!currDate) return;
      current=byDate[currDate];
      const baseDates=dates.filter(d=>d<=fromDate);
      baseDate=baseDates.length?baseDates[baseDates.length-1]:dates[0];
    }

    const base=baseDate?byDate[baseDate]:null;
    if(!base||!current) return;

    const fields=[
      {key:'active',  elId:'crm-delta-active'},
      {key:'running', elId:'crm-delta-run'},
      {key:'idle',    elId:'crm-delta-idle'},
      {key:'stop',    elId:'crm-delta-stop'},
      {key:'inactive',elId:'crm-delta-inac'},
    ];
    fields.forEach(({key,elId})=>{
      const el=g(elId); if(!el) return;
      const diff=current[key]-base[key];
      if(diff===0){el.textContent='No change';el.className='crm-kpi-delta neutral';return;}
      const pct=base[key]>0?((Math.abs(diff)/base[key])*100).toFixed(1):'—';
      const arrow=diff>0?'▲':'▼';
      const sign=diff>0?'+':'';
      el.className='crm-kpi-delta '+(diff>0?'up':'down');
      el.textContent=`${arrow} ${sign}${diff.toLocaleString()} (${pct}%)`;
    });

  }catch(e){
    console.error('KPI delta error:',e);
  }
}

// ── PLATINUM CUSTOMER VEHICLE-REDUCTION ALERTS ──────────────────
async function loadCustomerAlerts(){
  const wrap=document.getElementById('crm-alerts-banner');
  const list=document.getElementById('crm-alerts-list');
  if(!wrap||!list) return;
  try{
    const hdrs={...SB_HDRS()};
    const url=`${SUPABASE_URL}/rest/v1/customer_alerts?select=*&acknowledged=eq.false&order=pct_drop.desc&limit=20`;
    const res=await fetch(url,{headers:hdrs});
    const rows=await res.json();
    if(!Array.isArray(rows)||!rows.length){
      wrap.style.display='none';
      list.innerHTML='';
      return;
    }
    wrap.style.display='block';
    list.innerHTML=rows.map(r=>`
      <div class="crm-alert-card">
        <div class="crm-alert-left">
          <div class="crm-alert-icon">⚠️</div>
          <div>
            <div class="crm-alert-text">💎 <b>${r.company_name}</b>'s vehicle count dropped <b>${r.pct_drop}%</b></div>
            <div class="crm-alert-sub">${Math.round(r.baseline_avg)} (7-day average) → ${r.current_count} vehicles · ${r.alert_date}</div>
          </div>
        </div>
        <button class="crm-alert-ack-btn" onclick="crmAcknowledgeAlert(${r.id})">Acknowledge</button>
      </div>
    `).join('');
  }catch(e){
    console.error('Customer alerts load error:',e);
  }
}

async function crmAcknowledgeAlert(id){
  try{
    const hdrs={...SB_HDRS_MIN()};
    const url=`${SUPABASE_URL}/rest/v1/customer_alerts?id=eq.${id}`;
    await fetch(url,{
      method:'PATCH',
      headers:hdrs,
      body:JSON.stringify({
        acknowledged: true,
        acknowledged_by: (typeof CURRENT_USER!=='undefined'&&CURRENT_USER&&CURRENT_USER.name)||'Unknown',
        acknowledged_at: new Date().toISOString()
      })
    });
    loadCustomerAlerts();
  }catch(e){
    console.error('Acknowledge alert error:',e);
  }
}

function crmChgShowDetail(type){
  const g=id=>document.getElementById(id);
  const panel=g('chg-detail-panel');
  if(!panel)return;

  _chgDetailType=type;
  const rows=type==='added'?(window._chgAdded||[]):(window._chgRemoved||[]);
  _chgDetailData=rows;

  const color=type==='added'?'#10b981':'#ef4444';
  const emoji=type==='added'?'🟢':'🔴';
  if(g('chg-detail-title')) g('chg-detail-title').innerHTML=`${emoji} <span style="color:${color}">${rows.length.toLocaleString()} Vehicles ${type==='added'?'Added':'Removed'}</span> — Company Breakdown`;
  if(g('chg-detail-search')) g('chg-detail-search').value='';

  panel.style.display='block';
  crmChgRenderDetail(rows, type);
}

function crmChgFilterDetail(){
  const q=(document.getElementById('chg-detail-search')?.value||'').toLowerCase();
  const rows=_chgDetailType==='added'?(window._chgAdded||[]):(window._chgRemoved||[]);
  const filtered=q?rows.filter(r=>(r.company||'').toLowerCase().includes(q)||(r.vehicle_no||'').toLowerCase().includes(q)):rows;
  crmChgRenderDetail(filtered,_chgDetailType);
}

function crmChgRenderDetail(rows, type){
  const body=document.getElementById('chg-detail-body');
  if(!body)return;
  if(!rows.length){
    body.innerHTML=`<div style="text-align:center;padding:24px;color:var(--muted);font-size:0.84rem;">No data found</div>`;
    return;
  }

  // Group by company
  const companyMap={};
  rows.forEach(r=>{
    const co=r.company||'Unknown';
    if(!companyMap[co]) companyMap[co]={count:0,tier:r.tier||'',region:r.region||''};
    companyMap[co].count++;
  });

  const sorted=Object.entries(companyMap).sort((a,b)=>b[1].count-a[1].count);
  const color=type==='added'?'#10b981':'#ef4444';
  const sign =type==='added'?'+':'-';

  body.innerHTML=sorted.map(([company,info])=>`
    <div class="chg-company-row">
      <div>
        <div class="chg-company-name">${company}</div>
        <div style="font-size:0.70rem;color:var(--muted);">${info.tier?info.tier+' · ':''}${(info.region||'').replace(' Server','')}</div>
      </div>
      <div class="chg-company-count ${type}" style="color:${color};">${sign}${info.count}</div>
    </div>`).join('');
}

// Legacy stubs so nothing breaks
function crmChgRenderTable(){}
function crmChgFilterTable(){}
// ── END VEHICLE CHANGES ───────────────────────────────────────
function crmSwitchTier(t){
  _crmTier=t;
  document.querySelectorAll('#panel-crm .crm-tier-btn').forEach(b=>b.classList.remove('active'));
  const m={'':'crm-tf-all','Platinum':'crm-tf-plat','Gold':'crm-tf-gold','Silver':'crm-tf-silv'};
  const el=document.getElementById(m[t]); if(el)el.classList.add('active');
  crmApplyFilters();
}
function crmFilterStatus(s){
  _crmStatus=s;
  document.querySelectorAll('#panel-crm .crm-card').forEach(c=>c.classList.remove('active-filter'));
  if(s){const m={RUNNING:'crm-card-run',IDLE:'crm-card-idle',STOP:'crm-card-stop',INACTIVE:'crm-card-inac'};const el=document.getElementById(m[s]);if(el)el.classList.add('active-filter');}
  crmClearSelection();
  crmApplyFilters();
}
setInterval(()=>{if(_crmLoaded&&!_crmSelectedIdx)loadCRMDashboard();},5*60*1000);


// ── Get effective date index ──────────────────────────────────────
function _imsEffDateIdx() {
  if (!_imsDateHdrs.length) return null;
  if (_imsDateIdx >= 0 && _imsDateIdx < _imsDateHdrs.length) return _imsDateIdx;
  return _imsDateHdrs.length - 1;
}

// ── Get stock value for a row based on selected date ─────────────
function _imsStock(row) {
  const di = _imsEffDateIdx();
  if (di === null) return row.closing;
  // If all date values are 0/missing, fall back to closing stock
  const v = row.dates[di];
  return (v !== undefined && v !== null) ? v : row.closing;
}

// ── Status based on selected date's stock ────────────────────────
function _imsSt(row) {
  const stock = _imsStock(row);
  if (stock === 0) return 'zero';
  if (row.maxLevel > 0 && stock <= row.maxLevel * 10) return 'low';
  return 'ok';
}

// ── Location switch ───────────────────────────────────────────────
function imsSetLocation(loc) {
  if (_imsLocation === loc) return;
  _imsLocation = loc;
  _imsLoaded   = false;
  _imsDateIdx  = -1;  // Reset date index so today is auto-selected for new location
  _imsDateHdrs = [];  // Clear old date headers
  _imsAllRows  = [];  // Clear old rows
  // Sync dropdown value
  const dd = document.querySelector('#imsControls select');
  if (dd) dd.value = loc;
  // Update breadcrumb title
  const labels = { hq:'Head Quarter', goa:'Goa', gujarat:'Gujarat', bangalore:'Bangalore' };
  const titleEl = document.querySelector('#panel-ims .db-breadcrumb');
  if (titleEl) titleEl.textContent = 'Home › IMS — ' + (labels[loc] || loc);
  loadIMSDashboard();
}

// ── Refresh ───────────────────────────────────────────────────────
function imsRefresh() { _imsLoaded = false; loadIMSDashboard(); }

// ── Load ──────────────────────────────────────────────────────────
async function loadIMSDashboard() {
  if (_imsLoaded) return;
  if (!_canAccessIMS()) { switchDB('home'); return; }
  // Validate all location APIs
  const _apiCheck = _imsGetAPI();
  if (!_apiCheck || _apiCheck.includes('PASTE_')) {
    const _locNames = { hq: 'HQ', goa: 'Goa', gujarat: 'Gujarat', bangalore: 'Bangalore' };
    _imsShowError(`IMS ${_locNames[_imsLocation] || _imsLocation} API URL is not configured. Please add the Google Apps Script URL in the HTML file.`);
    document.getElementById('imsLoader').style.display = 'none';
    return;
  }
  _imsShowLoader();
  const ico = document.getElementById('imsRefIco');
  if (ico) ico.style.animation = 'spin 0.8s linear infinite';
  try {
    const apiUrl = _imsGetAPI();
    const res  = await fetch(apiUrl);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'API error');
    _imsParseData(json);
    _imsLoaded = true;
    document.getElementById('imsLastSync').textContent =
      'Updated ' + new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
    document.getElementById('imsError').style.display = 'none';
    if (_imsRefInterval) clearInterval(_imsRefInterval);
    _imsRefInterval = setInterval(() => { _imsLoaded = false; loadIMSDashboard(); }, 5 * 60 * 1000);
  } catch(e) {
    _imsShowError(e.message);
    document.getElementById('imsLoader').style.display = 'none';
  } finally {
    if (ico) ico.style.animation = '';
  }
}

// ── Parse ─────────────────────────────────────────────────────────
function _imsParseData(json) {
  const headers = json.headers || [];
  const rows    = json.data    || [];

  _imsDateHdrs = headers.slice(5).filter(h => h && String(h).trim());

  _imsAllRows = rows
    .filter(r => r[headers[0]] || r[headers[1]])
    .map(r => ({
      skuCode:   _s(r[headers[0]]),
      itemName:  _s(r[headers[1]]),
      maxLevel:  _n(r[headers[2]]),
      inTransit: _n(r[headers[3]]),
      closing:   _n(r[headers[4]]),
      dates:     _imsDateHdrs.map(h => _n(r[h]))
    }));

  // Auto-select today's date, or closest past date, or latest
  _imsDateIdx = _imsFindTodayIdx();

  _imsRecalcMax();
  _imsBuildDateFilter();
  _imsRenderKPIs();
  _imsRenderTable();

  // Show containers FIRST so Canvas gets correct width before Chart.js renders
  document.getElementById('imsLoader').style.display    = 'none';
  document.getElementById('imsKpiGrid').style.display   = 'grid';
  document.getElementById('imsChartsRow').style.display = 'grid';
  document.getElementById('imsControls').style.display  = 'flex';
  document.getElementById('imsTableCard').style.display = 'block';

  // Render charts AFTER containers are visible so canvas dimensions are correct
  requestAnimationFrame(() => _imsRenderCharts());
}

function _s(v) { return v !== null && v !== undefined ? String(v) : ''; }
function _n(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

// ── Date formatter — any format → DD/MM/YYYY ──────────────────────
function _imsFmtDate(raw) {
  if (!raw) return '—';
  const s = String(raw).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return s;
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    const dd   = String(dt.getDate()).padStart(2, '0');
    const mm   = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return s;
}

// ── Parse any date string (handles dd/MM/yyyy AND ISO formats) ────
function _imsParseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  // dd/MM/yyyy or d/M/yyyy (06/05/2026 or 6/5/2026) — Indian format used by branch sheets
  const ddmm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmm) {
    const d = parseInt(ddmm[1]), m = parseInt(ddmm[2]), y = parseInt(ddmm[3]);
    // Validate: day 1-31, month 1-12
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const dt = new Date(y, m - 1, d);
      if (!isNaN(dt.getTime())) return dt;
    }
  }

  // yyyy-MM-dd (ISO date: 2026-05-06)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const dt = new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
    if (!isNaN(dt.getTime())) return dt;
  }

  // dd-MM-yyyy (06-05-2026)
  const ddmmDash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmDash) {
    const d = parseInt(ddmmDash[1]), m = parseInt(ddmmDash[2]), y = parseInt(ddmmDash[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const dt = new Date(y, m - 1, d);
      if (!isNaN(dt.getTime())) return dt;
    }
  }

  // Excel serial number (e.g. 46747)
  if (/^\d{5}$/.test(s)) {
    const serial = parseInt(s);
    const dt = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    if (!isNaN(dt.getTime())) return dt;
  }

  // Fallback: JS native parse (handles "May 6, 2026", RFC2822, etc.)
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

// ── Find index of today's date (or closest past date, else latest) ─
function _imsFindTodayIdx() {
  if (!_imsDateHdrs.length) return -1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parse all header dates — supports dd/MM/yyyy + ISO (all locations)
  const parsed = _imsDateHdrs.map((h, i) => {
    const dt = _imsParseDate(h);
    if (dt) dt.setHours(0, 0, 0, 0);
    return { i, dt };
  });

  // Exact match for today
  const exact = parsed.find(p => p.dt && p.dt.getTime() === today.getTime());
  if (exact) return exact.i;

  // Closest past date (most recent date <= today)
  const past = parsed.filter(p => p.dt && p.dt <= today);
  if (past.length) return past[past.length - 1].i;

  // Fallback: latest available
  return _imsDateHdrs.length - 1;
}

// ── Recalculate max stock for progress bars ───────────────────────
function _imsRecalcMax() {
  _imsMaxStock = Math.max(1, ..._imsAllRows.map(r => _imsStock(r)));
}

// ── Build date filter dropdown ────────────────────────────────────
function _imsBuildDateFilter() {
  const wrap = document.getElementById('imsDateFilterWrap');
  if (!wrap || !_imsDateHdrs.length) return;

  // Ensure today is auto-selected for all locations (HQ, Goa, Gujarat, Bangalore)
  if (_imsDateIdx < 0) _imsDateIdx = _imsFindTodayIdx();
  const todayIdx = _imsFindTodayIdx();

  let opts = '';
  _imsDateHdrs.forEach((d, i) => {
    const isSelected = (i === _imsDateIdx) ? 'selected' : '';
    const isToday    = (i === todayIdx);
    const label      = _imsFmtDate(d) + (isToday ? ' ★' : '');
    opts += '<option value="' + i + '" ' + isSelected + '>' + label + '</option>';
  });

  wrap.innerHTML =
    '<select id="imsDateSelect" onchange="imsOnDateChange(this.value)"' +
    ' style="padding:7px 12px;background:var(--surface2);border:1px solid var(--border);' +
    'border-radius:8px;color:var(--text);font-size:0.82rem;font-family:\'DM Sans\',sans-serif;' +
    'outline:none;cursor:pointer;min-width:140px;transition:border-color 0.18s;"' +
    ' onfocus="this.style.borderColor=\'rgba(240,165,0,0.5)\'"' +
    ' onblur="this.style.borderColor=\'var(--border)\'">' +
    opts +
    '</select>' +
    '<span style="font-size:0.73rem;color:var(--muted);">Date</span>';
}

// ── On date change ────────────────────────────────────────────────
function imsOnDateChange(val) {
  _imsDateIdx = parseInt(val);
  _imsRecalcMax();
  _imsRenderAll();
}

// ── Render everything ─────────────────────────────────────────────
function _imsRenderAll() {
  _imsRenderKPIs();
  _imsRenderCharts();
  _imsRenderTable();
}

// ── KPI Cards ─────────────────────────────────────────────────────
function _imsRenderKPIs() {
  const total  = _imsAllRows.length;
  const zero   = _imsAllRows.filter(r => _imsSt(r) === 'zero').length;
  const low    = _imsAllRows.filter(r => _imsSt(r) === 'low').length;
  const ok     = _imsAllRows.filter(r => _imsSt(r) === 'ok').length;
  const totQty = _imsAllRows.reduce((s, r) => s + _imsStock(r), 0);
  const di     = _imsEffDateIdx();
  const dateLbl = di !== null ? _imsFmtDate(_imsDateHdrs[di]) : '—';

  const kpis = [
    { lbl:'Total SKUs',     val:total,                         sub:'All inventory items',              c:'#4e9af1', ico:'📦', filter:'all'  },
    { lbl:'Zero Stock',     val:zero,                          sub:Math.round(zero/total*100)+'% items',c:'#ff5c7c', ico:'🚨', filter:'zero' },
    { lbl:'Low Stock',      val:low,                           sub:'Below threshold',                   c:'#f0a500', ico:'⚠️', filter:'low'  },
    { lbl:'Healthy Stock',  val:ok,                            sub:Math.round(ok/total*100)+'% items',  c:'#00d4aa', ico:'✅', filter:'ok'   },
    { lbl:'Total Stock',    val:totQty.toLocaleString('en-IN'),sub:'Units on ' + dateLbl,               c:'#a78bfa', ico:'🏭', filter:'all'  },
  ];
  document.getElementById('imsKpiGrid').innerHTML = kpis.map((k, idx) => `
    <div class="ims-kpi" style="--ik:${k.c};cursor:pointer;transition:transform 0.18s,box-shadow 0.18s;"
      onclick="imsKpiClick('${k.filter}', this)"
      onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.15)'"
      onmouseout="this.style.transform='';this.style.boxShadow=''">
      <div class="ims-kpi-label">${k.lbl}</div>
      <div class="ims-kpi-val">${k.val}</div>
      <div class="ims-kpi-sub">${k.sub}</div>
      <div class="ims-kpi-ico">${k.ico}</div>
    </div>`).join('');
}

// ── Charts ────────────────────────────────────────────────────────
function _imsRenderCharts() {
  const isLight = document.body.classList.contains('light-mode');
  const tickClr  = isLight ? '#5a6070' : '#8b93b0';
  const gridClr  = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
  const legendClr= isLight ? '#4a5060' : '#8b93b0';

  const sorted = [..._imsAllRows]
    .sort((a, b) => _imsStock(b) - _imsStock(a))
    .slice(0, 15);

  const labels = sorted.map(r => r.itemName.length > 18 ? r.itemName.slice(0,16)+'…' : r.itemName);
  const data   = sorted.map(r => _imsStock(r));
  const colors = sorted.map(r => {
    const s = _imsSt(r);
    return s==='zero' ? 'rgba(255,92,124,0.78)' : s==='low' ? 'rgba(240,165,0,0.78)' : 'rgba(0,212,170,0.68)';
  });

  const di     = _imsEffDateIdx();
  const dateLbl = di !== null ? _imsFmtDate(_imsDateHdrs[di]) : 'Closing Stock';

  if (_imsBarChart) _imsBarChart.destroy();
  const barCtx = document.getElementById('imsBarChart');
  if (barCtx) {
    // Update chart title
    const titleEl = barCtx.closest('.ims-chart-card')?.querySelector('.ims-chart-title');
    if (titleEl) titleEl.innerHTML = `<span class="dot"></span> Stock by Item — <span style="color:var(--accent);font-size:0.82rem;">${dateLbl}</span>`;

    _imsBarChart = new Chart(barCtx, {
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 4, borderSkipped: false }] },
      options: {
        indexAxis:'y', responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: ctx => ' '+ctx.raw+' units' } } },
        scales:{
          x:{ grid:{color:gridClr}, ticks:{color:tickClr} },
          y:{ grid:{display:false}, ticks:{color:tickClr, font:{size:11}} }
        }
      }
    });
  }

  const zeroC = _imsAllRows.filter(r => _imsSt(r)==='zero').length;
  const lowC  = _imsAllRows.filter(r => _imsSt(r)==='low').length;
  const okC   = _imsAllRows.filter(r => _imsSt(r)==='ok').length;

  if (_imsDonutChart) _imsDonutChart.destroy();
  const donutCtx = document.getElementById('imsDonut');
  if (donutCtx) {
    _imsDonutChart = new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: ['Zero Stock','Low Stock','Healthy'],
        datasets: [{ data:[zeroC,lowC,okC], backgroundColor:['rgba(255,92,124,0.8)','rgba(240,165,0,0.8)','rgba(0,212,170,0.8)'], borderWidth:0, hoverOffset:6 }]
      },
      options: {
        responsive:true, maintainAspectRatio:false, cutout:'68%',
        plugins:{
          legend:{ position:'bottom', labels:{color:legendClr, padding:12, font:{size:11}} },
          tooltip:{ callbacks:{ label: ctx => ` ${ctx.label}: ${ctx.raw}` } }
        }
      }
    });
  }
}

// ── Table ─────────────────────────────────────────────────────────
function _imsRenderTable() {
  const di       = _imsEffDateIdx();
  const dateLbl  = di !== null ? _imsFmtDate(_imsDateHdrs[di]) : '—';

  // Build header — selected date column highlighted
  document.getElementById('imsTHead').innerHTML = `<tr>
    <th>Item Name</th><th>SKU Code</th>
    <th class="r" style="color:var(--accent);">📅 ${dateLbl} (Stock)</th>
    <th>Status</th>
  </tr>`;
  imsApplyFilter();
}

function imsApplyFilter() {
  const q = (document.getElementById('imsSearch')?.value || '').toLowerCase().trim();
  let rows = _imsAllRows;
  if (_imsFilter !== 'all') rows = rows.filter(r => _imsSt(r) === _imsFilter);
  if (q) rows = rows.filter(r => r.itemName.toLowerCase().includes(q) || r.skuCode.toLowerCase().includes(q));

  document.getElementById('imsTableCount').textContent = rows.length + ' / ' + _imsAllRows.length + ' items';

  if (!rows.length) {
    document.getElementById('imsTBody').innerHTML = `<tr><td colspan="4" class="ims-no-rows">No items found</td></tr>`;
    return;
  }

  document.getElementById('imsTBody').innerHTML = rows.map((r, i) => {
    const stock  = _imsStock(r);
    const st     = _imsSt(r);
    const rowCls = st==='zero' ? 'ims-zero' : st==='low' ? 'ims-low' : '';
    const pct    = Math.round(Math.min(stock / _imsMaxStock, 1) * 100);
    const fill   = st==='zero' ? '#ff5c7c' : st==='low' ? '#f0a500' : '#00d4aa';
    const badge  = st==='zero' ? '<span class="ibadge ibadge-z">Zero</span>'
                 : st==='low'  ? '<span class="ibadge ibadge-l">Low</span>'
                 :                '<span class="ibadge ibadge-ok">OK</span>';

    return `<tr class="${rowCls}">
      <td><div class="ims-name">${r.itemName||'—'}</div></td>
      <td><span class="ims-sku">${r.skuCode}</span></td>
      <td class="r">
        <div class="sbar-wrap">
          <div class="sbar"><div class="sbar-fill" style="width:${pct}%;background:${fill}"></div></div>
          <span style="color:${fill};font-weight:700">${stock}</span>
        </div>
      </td>
      <td>${badge}</td>
    </tr>`;
  }).join('');
}

function imsSetFilter(el, f) {
  document.querySelectorAll('.ims-fbtn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  _imsFilter = f;
  imsApplyFilter();
}

function imsKpiClick(filter, kpiEl) {
  // Highlight active KPI card
  document.querySelectorAll('#imsKpiGrid .ims-kpi').forEach(k => {
    k.style.outline = '';
    k.style.boxShadow = '';
  });
  if (filter !== 'all' || kpiEl.querySelector('.ims-kpi-label').textContent === 'Total SKUs') {
    kpiEl.style.outline = '2px solid var(--ik, var(--accent))';
    kpiEl.style.boxShadow = '0 0 0 4px rgba(var(--ik, 78,154,241), 0.15)';
  }
  // Sync filter buttons
  document.querySelectorAll('.ims-fbtn').forEach(b => b.classList.remove('active'));
  const matchBtn = [...document.querySelectorAll('.ims-fbtn')].find(b => b.getAttribute('onclick')?.includes(`'${filter}'`));
  if (matchBtn) matchBtn.classList.add('active');
  // Apply filter to table
  _imsFilter = filter;
  imsApplyFilter();
  // Re-render charts filtered to same subset
  _imsRenderChartsFiltered(filter);
}

function _imsRenderChartsFiltered(filter) {
  const isLight   = document.body.classList.contains('light-mode');
  const tickClr   = isLight ? '#5a6070' : '#8b93b0';
  const gridClr   = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
  const legendClr = isLight ? '#4a5060' : '#8b93b0';

  const subset = filter === 'all' ? _imsAllRows : _imsAllRows.filter(r => _imsSt(r) === filter);
  const sorted = [...subset].sort((a, b) => _imsStock(b) - _imsStock(a)).slice(0, 15);

  const labels = sorted.map(r => r.itemName.length > 18 ? r.itemName.slice(0,16)+'…' : r.itemName);
  const data   = sorted.map(r => _imsStock(r));
  const colors = sorted.map(r => {
    const s = _imsSt(r);
    return s==='zero' ? 'rgba(255,92,124,0.78)' : s==='low' ? 'rgba(240,165,0,0.78)' : 'rgba(0,212,170,0.68)';
  });

  const di = _imsEffDateIdx();
  const dateLbl = di !== null ? _imsFmtDate(_imsDateHdrs[di]) : 'Closing Stock';

  if (_imsBarChart) _imsBarChart.destroy();
  const barCtx = document.getElementById('imsBarChart');
  if (barCtx) {
    const titleEl = barCtx.closest('.ims-chart-card')?.querySelector('.ims-chart-title');
    if (titleEl) titleEl.innerHTML = `<span class="dot"></span> Stock by Item — <span style="color:var(--accent);font-size:0.82rem;">${dateLbl}</span>`;
    _imsBarChart = new Chart(barCtx, {
      type:'bar',
      data:{ labels, datasets:[{ data, backgroundColor:colors, borderRadius:4, borderSkipped:false }] },
      options:{
        indexAxis:'y', responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: ctx => ' '+ctx.raw+' units' } } },
        scales:{
          x:{ grid:{color:gridClr}, ticks:{color:tickClr} },
          y:{ grid:{display:false}, ticks:{color:tickClr, font:{size:11}} }
        }
      }
    });
  }

  const zeroC = subset.filter(r => _imsSt(r)==='zero').length;
  const lowC  = subset.filter(r => _imsSt(r)==='low').length;
  const okC   = subset.filter(r => _imsSt(r)==='ok').length;

  if (_imsDonutChart) _imsDonutChart.destroy();
  const donutCtx = document.getElementById('imsDonut');
  if (donutCtx) {
    _imsDonutChart = new Chart(donutCtx, {
      type:'doughnut',
      data:{
        labels:['Zero Stock','Low Stock','Healthy'],
        datasets:[{ data:[zeroC,lowC,okC], backgroundColor:['rgba(255,92,124,0.8)','rgba(240,165,0,0.8)','rgba(0,212,170,0.8)'], borderWidth:0, hoverOffset:6 }]
      },
      options:{
        responsive:true, maintainAspectRatio:false, cutout:'68%',
        plugins:{
          legend:{ position:'bottom', labels:{color:legendClr, padding:12, font:{size:11}} },
          tooltip:{ callbacks:{ label: ctx => ` ${ctx.label}: ${ctx.raw}` } }
        }
      }
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function _imsShowLoader() {
  document.getElementById('imsLoader').style.display    = 'flex';
  document.getElementById('imsKpiGrid').style.display   = 'none';
  document.getElementById('imsChartsRow').style.display = 'none';
  document.getElementById('imsControls').style.display  = 'none';
  document.getElementById('imsTableCard').style.display = 'none';
  document.getElementById('imsError').style.display     = 'none';
}
function _imsShowError(msg) {
  document.getElementById('imsError').style.display = 'block';
  document.getElementById('imsErrMsg').textContent  = msg;
}

// ===== next block =====

// ╔══════════════════════════════════════════════════════════════════════════
// ║  [CELEBRATIONS JS] — Birthday & Anniversary system
// ║  Home page pe banner dikhata hai jab kisi ka birthday/anniversary ho
// ║  Wish popup: text likh ke send karo, birthday wala dekh sakta hai
// ║  "See Your Wishes" button: birthday person apne wishes dekhe
// ║  Reply to all wishers: ek saath sab ko reply bhejo
// ║  Tables used: Employee_details (DOB/DOJ), employee_wishes (Supabase)
// ║  Key functions:
// ║    loadCelebrations()    = Home pe banner load karo
// ║    openCelebPopup()      = Wish popup open karo
// ║    sendWish()            = Wish Supabase mein save karo
// ║    openMyWishesModal()   = Birthday person ke liye wish viewer
// ╚══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// BIRTHDAY & ANNIVERSARY SYSTEM
// ═══════════════════════════════════════════════════════════════

let _celebCurrentPerson = null; // person whose popup is open (for wish feature)

// ── Global _isMe — checks if a person record matches the logged-in user ──
function _isMe(p) {
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return false;
  const myEmail = (CURRENT_USER.email || '').toLowerCase().trim();
  const myName  = (CURRENT_USER.name  || '').toLowerCase().trim();
  if (myEmail && p.email && p.email.toLowerCase().trim() === myEmail) return true;
  if (myName  && p.name  && p.name.toLowerCase().trim()  === myName)  return true;
  // partial first-name fallback (min 3 chars to avoid false matches)
  const myFirst = myName.split(' ')[0];
  const pFirst  = (p.name || '').toLowerCase().split(' ')[0];
  return myFirst && pFirst && myFirst === pFirst && myFirst.length > 2;
}

// ── Helper: parse date string safely (handles all formats) ────
function _celebParseDate(str) {
  if (!str) return null;
  try {
    const s = String(str).trim();
    // DD/MM/YYYY  e.g. "07/05/2004"
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split('/');
      const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      return isNaN(dt.getTime()) ? null : dt;
    }
    // DD-MM-YYYY  e.g. "07-05-2004"
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
      const [d, m, y] = s.split('-');
      const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      return isNaN(dt.getTime()) ? null : dt;
    }
    // YYYY-MM-DD (ISO) e.g. "2004-05-07" — use local interpretation
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const parts = s.substring(0, 10).split('-');
      const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return isNaN(dt.getTime()) ? null : dt;
    }
    // Fallback: natural parse
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt;
  } catch { return null; }
}

// ── Get DOB/DOJ value from employee row (handles all column name variants) ──
function _celebGetField(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return String(row[k]).trim();
  }
  return '';
}

// ── Check if date matches today (only day + month) ────────────
function _celebIsToday(dateStr) {
  const d = _celebParseDate(dateStr);
  if (!d) return false;
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
}

// ── Calculate completed years since date ─────────────────────
function _celebYearsSince(dateStr) {
  const d = _celebParseDate(dateStr);
  if (!d) return 0;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() ||
      (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) {
    years--;
  }
  return Math.max(0, years);
}

// ── Ordinal number (1st, 2nd, 3rd…) ──────────────────────────
function _celebOrdinal(n) {
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ── Prevent duplicate runs ────────────────────────────────────
let _celebLoaded = false;

// ── Main loader — called after login ─────────────────────────
async function loadCelebrations() {
  if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON === 'undefined') return;
  if (!CURRENT_USER) return;
  if (_celebLoaded) return;   // run only once per session
  _celebLoaded = true;

  try {
    const hdrs = SB_HDRS();

    // Use select=* so we get actual column names regardless of spelling/case/spaces
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/Employee_details?select=*&limit=500`,
      { headers: hdrs }
    );
    if (!res.ok) {
      return;
    }
    const employees = await res.json();
    if (!Array.isArray(employees) || employees.length === 0) {
      return;
    }


    // ── Global employee cache with Emp_id (FK ke liye use hoga) ──
    window._empFullList = employees; // { Emp_id, Employee_name, Email_Id, ... }

    const birthdays    = [];
    const anniversaries = [];

    employees.forEach(emp => {
      // Try all known column name variants for employee name
      const name = _celebGetField(emp, ['Employee_name','employee_name','Name','name','EMPLOYEE_NAME']);
      if (!name) return;

      const email  = _celebGetField(emp, ['Email_Id','email_id','Email','email','EMAIL_ID']);
      const dept   = _celebGetField(emp, ['Employee_Dept','employee_dept','Emp_Dept','Department','dept']);
      const avatar = _celebGetField(emp, ['avatar_url','Avatar_url','Link','link','Photo','photo']);
      const empId  = emp['Emp_id'] || emp['emp_id'] || emp['EMP_ID'] || null;  // Primary Key

      // Try all DOB variants
      const dob = _celebGetField(emp, [
        'Date of Birth','Date_of_Birth','date_of_birth','DOB','dob',
        'DateOfBirth','date of birth','Date Of Birth','DATEOFBIRTH'
      ]);

      // Try all DOJ variants
      const doj = _celebGetField(emp, [
        'Date Of Joining','Date_Of_Joining','date_of_joining','DOJ','doj',
        'DateOfJoining','date of joining','Date of Joining','DATEOFJOING','Joining Date','joining_date'
      ]);

      if (dob) {
        if (_celebIsToday(dob)) {
          birthdays.push({ name, email, dept, avatar, empId });
        }
      }

      if (doj) {
        if (_celebIsToday(doj)) {
          const years = _celebYearsSince(doj);
          if (years > 0) anniversaries.push({ name, email, dept, avatar, years, empId });
        }
      }
    });


    // Show home banner for everyone
    _renderCelebBanner(birthdays, anniversaries);

    // Check if current user is one of the celebrants
    const myBday = birthdays.find(_isMe);
    const myAnni = anniversaries.find(_isMe);

    if (myBday || myAnni) {
      // Small delay so portal UI is fully rendered before popup shows
      setTimeout(() => {
        if (myBday) _openCelebPopup('birthday-self', myBday, null);
        else         _openCelebPopup('anniversary-self', myAnni, myAnni.years);
      }, 1000);
    }

  } catch (e) {
  }
}

// ── Render home banner ────────────────────────────────────────
function _renderCelebBanner(birthdays, anniversaries) {
  const banner = document.getElementById('celebrationHomeBanner');
  if (!banner) return;
  if (birthdays.length === 0 && anniversaries.length === 0) {
    banner.style.display = 'none';
    return;
  }

  const hasBday = birthdays.length > 0;
  const hasAnni = anniversaries.length > 0;
  const bothTypes = hasBday && hasAnni;
  const onlyAnni = !hasBday && hasAnni;

  // Store globally — avoids JSON-in-onclick parse errors
  window._celebBannerBdays = birthdays;
  window._celebBannerAnnis = anniversaries;

  // Detect if logged-in user is one of today's celebrants
  const iAmCelebrant = birthdays.some(_isMe) || anniversaries.some(_isMe);

  let titleHTML = '';
  let subText = '';
  let mainEmoji = '';
  let cardClass = '';

  if (iAmCelebrant) {
    // Self view — birthday/anniversary is mine
    const isBday = birthdays.some(_isMe);
    mainEmoji = isBday ? '🎂' : '🥳';
    titleHTML = isBday
      ? `🎉 <span class="celeb-highlight">It's Your Birthday Today!</span>`
      : `🌟 <span class="celeb-highlight">It's Your Work Anniversary Today!</span>`;
    subText = isBday
      ? 'Wishing you a day full of joy and celebration! The entire Aditi Tracking family is thinking of you. 🎊'
      : 'Congratulations on your work anniversary! Your journey inspires us all. 🚀';
    cardClass = isBday ? '' : 'anni-only';
  } else if (bothTypes) {
    mainEmoji = '🎉';
    titleHTML = `<span class="celeb-highlight">Birthdays & Anniversaries</span> Today!`;
    subText = 'Spread some love — wish your teammates on their special day! 💛';
    cardClass = '';
  } else if (hasBday) {
    mainEmoji = '🎂';
    titleHTML = `<span class="celeb-highlight">${birthdays.length === 1 ? birthdays[0].name.split(' ')[0] : birthdays.length + ' teammates'}</span> ${birthdays.length === 1 ? 'has' : 'have'} a Birthday Today!`;
    subText = 'Make their day extra special — send your warmest wishes! 🎊';
    cardClass = '';
  } else {
    mainEmoji = '🥳';
    titleHTML = `Work Anniversary${anniversaries.length > 1 ? 'ies' : ''} Today!`;
    subText = 'Celebrate the journey — wish your colleagues on their work anniversary! ⭐';
    cardClass = 'anni-only';
  }

  // Build person chips — use index refs into window arrays, no inline JSON
  let chipsHTML = '<div class="celeb-person-chips">';
  birthdays.forEach((p, i) => {
    chipsHTML += `<span class="celeb-chip" onclick="_openCelebPopup('birthday-others', window._celebBannerBdays[${i}], null)" title="Click to wish ${p.name}">
      <span class="celeb-chip-confetti celeb-chip-emoji">🎂</span> ${p.name}
    </span>`;
  });
  anniversaries.forEach((p, i) => {
    chipsHTML += `<span class="celeb-chip celeb-chip-anni" onclick="_openCelebPopup('anniversary-others', window._celebBannerAnnis[${i}], ${p.years})" title="Click to wish ${p.name}">
      <span class="celeb-chip-emoji">🥳</span> ${p.name} <span style="opacity:0.7;font-size:0.75rem;">${_celebOrdinal(p.years)} Year</span>
    </span>`;
  });
  chipsHTML += '</div>';

  // Action button: "See Your Wishes" for celebrant, "Wished ✓" if already wished, else "Wish Them!"
  let actionBtnHTML;
  if (iAmCelebrant) {
    actionBtnHTML = `<button class="celeb-wish-all-btn" onclick="_openMyWishesModal()" style="background:linear-gradient(135deg,#4e9af1,#00d4aa);display:flex;align-items:center;gap:8px;">
         🎁 See Your Wishes
         <span id="bannerSeeWishesBadge" style="background:rgba(255,255,255,0.3);color:#fff;border-radius:20px;padding:1px 8px;font-size:0.78rem;font-weight:800;min-width:20px;text-align:center;">...</span>
       </button>`;
  } else {
    // Check if user has already wished ALL celebrants today
    const allCelebs = [
      ...birthdays.map(p => ({ ...p, celebType: 'birthday' })),
      ...anniversaries.map(p => ({ ...p, celebType: 'anniversary' }))
    ];
    const alreadyWishedAll = allCelebs.length > 0 && allCelebs.every(p =>
      localStorage.getItem(_wishKey(p.email || p.name, p.celebType))
    );
    if (alreadyWishedAll) {
      actionBtnHTML = `<button class="celeb-wish-all-btn" disabled
        style="background:linear-gradient(135deg,#00d4aa,#22c55e);cursor:default;opacity:0.9;display:flex;align-items:center;gap:8px;">
        ✅ Wished!
      </button>`;
    } else {
      actionBtnHTML = `<button class="celeb-wish-all-btn" onclick="_openWishAllPopup()">
        🎉 Wish Them!
      </button>`;
    }
  }

  banner.innerHTML = `
    <div class="celeb-banner-card ${cardClass}">
      <div class="celeb-banner-inner">
        <div class="celeb-banner-icon">${mainEmoji}</div>
        <div class="celeb-banner-body">
          <div class="celeb-banner-title">${titleHTML}</div>
          <div class="celeb-banner-sub">${subText}</div>
          ${chipsHTML}
        </div>
        <div class="celeb-banner-actions">
          ${actionBtnHTML}
        </div>
      </div>
    </div>`;
  banner.style.display = 'block';

  // For users who have already wished, check if birthday person replied
  if (!iAmCelebrant) {
    _checkAndShowReplyOnHome(birthdays, anniversaries);
  }
}

// ── Show birthday person's reply on home page for wishers ─────
async function _checkAndShowReplyOnHome(birthdays, anniversaries) {
  const notif = document.getElementById('celebReplyNotif');
  if (!notif || !CURRENT_USER) return;

  const today = new Date().toISOString().split('T')[0];
  const hdrs = SB_HDRS();

  // Check each birthday/anniversary person
  const allPeople = [
    ...birthdays.map(p => ({ ...p, celebType: 'birthday' })),
    ...anniversaries.map(p => ({ ...p, celebType: 'anniversary' }))
  ];

  for (const person of allPeople) {
    const wKey = _wishKey(person.email || person.name, person.celebType);
    if (!localStorage.getItem(wKey)) continue; // user hasn't wished this person

    try {
      const fromEmpId = _getEmpId(CURRENT_USER.email || CURRENT_USER.name);
      const toEmpId   = person.empId || _getEmpId(person.email || person.name);
      let url;
      if (fromEmpId && toEmpId) {
        url = `${SUPABASE_URL}/rest/v1/birthday_wishes?select=reply_text,wish_text&from_emp_id=eq.${fromEmpId}&to_emp_id=eq.${toEmpId}&wish_date=eq.${today}&type=eq.${person.celebType}&order=created_at.desc&limit=1`;
      } else {
        const fe = encodeURIComponent((CURRENT_USER.email || '').trim());
        const te = encodeURIComponent((person.email || '').trim());
        url = `${SUPABASE_URL}/rest/v1/birthday_wishes?select=reply_text,wish_text&from_email=ilike.${fe}&to_email=ilike.${te}&wish_date=eq.${today}&type=eq.${person.celebType}&order=created_at.desc&limit=1`;
      }

      const res = await fetch(url, { headers: hdrs });
      if (!res.ok) continue;
      const rows = await res.json();
      if (!Array.isArray(rows) || !rows.length || !rows[0].reply_text) continue;

      const { reply_text, wish_text } = rows[0];
      const firstName = (person.name || '').split(' ')[0];
      const typeLabel = person.celebType === 'birthday' ? '🎂' : '🥳';

      notif.innerHTML = `
        <div style="background:var(--surface);border:1.5px solid rgba(240,165,0,0.35);border-radius:16px;padding:14px 18px;display:flex;gap:12px;align-items:flex-start;animation:celebFadeIn 0.4s ease both;">
          <div style="font-size:1.6rem;flex-shrink:0;">${typeLabel}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.80rem;font-weight:700;color:#f0a500;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">${firstName} replied to your wish!</div>
            <div style="font-size:0.82rem;color:var(--muted);margin-bottom:8px;font-style:italic;">"${wish_text}"</div>
            <div style="padding:9px 13px;background:rgba(240,165,0,0.09);border-left:3px solid #f0a500;border-radius:0 10px 10px 0;font-size:0.88rem;color:var(--text);line-height:1.5;">${reply_text}</div>
          </div>
        </div>`;
      notif.style.display = 'block';
      break; // show one at a time
    } catch(e) {
    }
  }
}

// ── Wish key for localStorage (prevent duplicate wishes) ──────
function _wishKey(toEmail, type) {
  const d = new Date();
  return `wish_${type}_${toEmail}_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
}

// ── Open popup (type: birthday-self / birthday-others / anniversary-self / anniversary-others) ──
function _openCelebPopup(type, person, years) {
  _celebCurrentPerson = person;
  const overlay      = document.getElementById('celebPopupOverlay');
  const emojiEl      = document.getElementById('celebEmoji');
  const titleEl      = document.getElementById('celebTitle');
  const nameEl       = document.getElementById('celebName');
  const subEl        = document.getElementById('celebSubtitle');
  const msBox        = document.getElementById('celebMilestone');
  const msBadge      = document.getElementById('celebMilestoneBadge');
  const wishBox      = document.getElementById('celebWishBox');
  const wishSent     = document.getElementById('celebWishSent');
  const alreadyEl    = document.getElementById('celebAlreadyWished');
  const topBar       = document.getElementById('celebTopBar');
  if (!overlay) return;

  // Reset all sections
  if (wishBox)    wishBox.style.display    = 'none';
  if (wishSent)   wishSent.style.display   = 'none';
  if (alreadyEl)  alreadyEl.style.display  = 'none';
  if (msBox)      msBox.style.display      = 'none';

  const inp = document.getElementById('celebWishInput');
  if (inp) { inp.value = ''; inp.style.borderColor = 'var(--border)'; }
  const cnt = document.getElementById('celebWishCharCount');
  if (cnt) cnt.textContent = '0/200';

  // Char counter
  if (inp) {
    inp.oninput = function() {
      const c = document.getElementById('celebWishCharCount');
      if (c) c.textContent = inp.value.length + '/200';
      if (inp.value.length > 200) inp.value = inp.value.substring(0, 200);
    };
  }

  const firstName = (person.name || '').split(' ')[0];
  const celebType = type.includes('birthday') ? 'birthday' : 'anniversary';

  if (type === 'birthday-self') {
    emojiEl.textContent = '🎂';
    titleEl.textContent = '🎉 Happy Birthday!';
    nameEl.textContent  = person.name || CURRENT_USER.name;
    subEl.textContent   = `Wishing you a wonderful birthday filled with joy, laughter, and all the happiness in the world! 🎈✨ The entire Aditi Tracking family wishes you the best!`;
    topBar.style.background    = 'linear-gradient(90deg,#f0a500,#ffcc44,#ff5c7c,#f0a500)';
    topBar.style.backgroundSize = '300%';
    // Preload wish count for banner badge
    _preloadWishCount(person.email || CURRENT_USER.email, 'birthday', person.empId || null);

  } else if (type === 'anniversary-self') {
    emojiEl.textContent = '🥳';
    const y = years || 0;
    titleEl.textContent = `🌟 Work Anniversary!`;
    nameEl.textContent  = person.name || CURRENT_USER.name;
    subEl.textContent   = `Congratulations on completing ${_celebOrdinal(y)} year${y > 1 ? 's' : ''} with Aditi Tracking! Your dedication and hard work inspire us all. Here's to many more years of growth and success! 🚀`;
    if (y > 0) { msBox.style.display = 'block'; msBadge.innerHTML = `🏆 ${_celebOrdinal(y)} Work Anniversary`; }
    topBar.style.background    = 'linear-gradient(90deg,#4e9af1,#00d4aa,#4e9af1)';
    topBar.style.backgroundSize = '300%';
    // Preload wish count for banner badge
    _preloadWishCount(person.email || CURRENT_USER.email, 'anniversary', person.empId || null);

  } else if (type === 'birthday-others') {
    emojiEl.textContent = '🎂';
    titleEl.textContent = `Happy Birthday, ${firstName}!`;
    nameEl.textContent  = person.name;
    subEl.textContent   = `Today is ${firstName}'s special day! 🎊 Send a warm wish and make their birthday extra special!`;
    topBar.style.background    = 'linear-gradient(90deg,#f0a500,#ffcc44,#ff5c7c,#f0a500)';
    topBar.style.backgroundSize = '300%';
    // Check already wished
    const wKey = _wishKey(person.email || person.name, 'birthday');
    if (localStorage.getItem(wKey)) {
      alreadyEl.style.display = 'block';
      
    } else {
      wishBox.style.display = 'block';
    }

  } else if (type === 'anniversary-others') {
    emojiEl.textContent = '🥳';
    const y = years || 0;
    titleEl.textContent = `Work Anniversary!`;
    nameEl.textContent  = person.name;
    subEl.textContent   = `${firstName} is celebrating their ${_celebOrdinal(y)} work anniversary today! 🎊 Appreciate their journey and send your best wishes!`;
    if (y > 0) { msBox.style.display = 'block'; msBadge.innerHTML = `⭐ ${_celebOrdinal(y)} Work Anniversary`; }
    topBar.style.background    = 'linear-gradient(90deg,#4e9af1,#00d4aa,#4e9af1)';
    topBar.style.backgroundSize = '300%';
    // Check already wished
    const wKey2 = _wishKey(person.email || person.name, 'anniversary');
    if (localStorage.getItem(wKey2)) {
      alreadyEl.style.display = 'block';
      
    } else {
      wishBox.style.display = 'block';
    }
  }

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  _startConfetti(type.includes('birthday'));
}

// ── Emp_id lookup helper ──────────────────────────────────────
function _getEmpId(emailOrName) {
  const list = window._empFullList;
  if (!list || !list.length) return null;
  const key = (emailOrName || '').toLowerCase().trim();
  // Email match first (most reliable)
  let found = list.find(e => {
    const em = _celebGetField(e, ['Email_Id','email_id','Email','email']);
    return em && em.toLowerCase().trim() === key;
  });
  // Name match fallback
  if (!found) {
    found = list.find(e => {
      const nm = _celebGetField(e, ['Employee_name','employee_name','Name']);
      return nm && nm.toLowerCase().trim() === key;
    });
  }
  if (!found) return null;
  return found['Emp_id'] || found['emp_id'] || found['EMP_ID'] || null;
}

// ── Load wishes for the birthday/anniversary person (self view) ─
async function _loadWishesForSelf(toEmail, type, toEmpId) {
  const listEl    = document.getElementById('celebWishersList');
  const loadingEl = document.getElementById('celebWishersLoading');
  const emptyEl   = document.getElementById('celebWishersEmpty');
  const countEl   = document.getElementById('celebWishCount');
  if (!listEl) return;

  // Show loading
  listEl.innerHTML = '';
  if (loadingEl) loadingEl.style.display = 'block';
  if (emptyEl)   emptyEl.style.display   = 'none';
  if (countEl)   countEl.textContent     = '';

  try {
    const hdrs = SB_HDRS();
    const today = new Date().toISOString().split('T')[0];

    // Prefer Emp_id FK query; fallback to email
    let url;
    if (toEmpId) {
      // FK join: get wish + from_employee details (name, avatar, dept) in one call
      url = `${SUPABASE_URL}/rest/v1/birthday_wishes?select=*,from_employee:Employee_details!birthday_wishes_from_emp_id_fkey(Employee_name,Employee_Dept,avatar_url,Link)&to_emp_id=eq.${toEmpId}&wish_date=eq.${today}&type=eq.${type}&order=created_at.asc`;
    } else {
      url = `${SUPABASE_URL}/rest/v1/birthday_wishes?select=*&to_email=eq.${encodeURIComponent(toEmail)}&wish_date=eq.${today}&type=eq.${type}&order=created_at.asc`;
    }

    const res = await fetch(url, { headers: hdrs });

    if (loadingEl) loadingEl.style.display = 'none';

    if (!res.ok) {
      if (emptyEl) { emptyEl.style.display = 'block'; emptyEl.textContent = 'Could not load wishes. 😕'; }
      return;
    }

    const wishes = await res.json();
    if (!Array.isArray(wishes) || wishes.length === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (countEl) countEl.textContent = wishes.length;

    // Render each wish
    listEl.innerHTML = wishes.map(w => {
      // Name: from joined employee table (FK) OR fallback to stored from_name
      const fromEmpData = w.from_employee || {};
      const fromName = fromEmpData['Employee_name'] || w.from_name || 'Colleague';
      const fromDept = fromEmpData['Employee_Dept'] || '';
      const fromAvatar = fromEmpData['avatar_url'] || fromEmpData['Link'] || null;
      const msg      = w.wish_text || '🎉';
      const timeStr  = w.created_at ? _celebFmtTime(w.created_at) : '';
      const initial  = fromName.charAt(0).toUpperCase();
      const colors   = ['#f0a500','#00d4aa','#4e9af1','#ff5c7c','#a855f7','#f97316'];
      const col      = colors[fromName.charCodeAt(0) % colors.length];
      const avatarHTML = fromAvatar
        ? `<img src="${fromAvatar}" alt="${fromName}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`
          + `<span style="display:none;width:32px;height:32px;border-radius:50%;background:${col}22;color:${col};border:1.5px solid ${col}55;align-items:center;justify-content:center;font-size:0.82rem;font-weight:800;font-family:'DM Sans',sans-serif;">${initial}</span>`
        : `<span style="display:flex;width:32px;height:32px;border-radius:50%;background:${col}22;color:${col};border:1.5px solid ${col}55;align-items:center;justify-content:center;font-size:0.82rem;font-weight:800;font-family:'DM Sans',sans-serif;">${initial}</span>`;

      return `<div style="display:flex;gap:10px;align-items:flex-start;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:10px 12px;animation:celebFadeIn 0.4s ease both;">
        <div style="flex-shrink:0;">${avatarHTML}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <span style="font-size:0.82rem;font-weight:700;color:var(--text);">${fromName}</span>
            ${fromDept ? `<span style="font-size:0.70rem;color:var(--muted);background:var(--surface);border:1px solid var(--border);padding:1px 6px;border-radius:20px;">${fromDept}</span>` : ''}
            ${timeStr ? `<span style="font-size:0.70rem;color:var(--muted);margin-left:auto;white-space:nowrap;">${timeStr}</span>` : ''}
          </div>
          <div style="font-size:0.83rem;color:var(--text2);line-height:1.5;word-break:break-word;">${msg}</div>
        </div>
      </div>`;
    }).join('');

  } catch(e) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (emptyEl)   { emptyEl.style.display = 'block'; emptyEl.textContent = 'Network error. 😕'; }
  }
}

// ── Format time from ISO string ───────────────────────────────
function _celebFmtTime(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true });
  } catch { return ''; }
}

// ── Preload wish count for the "See Your Wishes" badge ───────
let _selfWishData = { email: null, type: null, empId: null, wishes: null };
async function _preloadWishCount(toEmail, type, toEmpId) {
  _selfWishData = { email: toEmail, type, empId: toEmpId, wishes: null };
  try {
    const hdrs = SB_HDRS();
    const today = new Date().toISOString().split('T')[0];
    let url;
    if (toEmpId) {
      url = `${SUPABASE_URL}/rest/v1/birthday_wishes?select=*,from_employee:Employee_details!birthday_wishes_from_emp_id_fkey(Employee_name,Employee_Dept,avatar_url,Link)&to_emp_id=eq.${toEmpId}&wish_date=eq.${today}&type=eq.${type}&order=created_at.asc`;
    } else {
      url = `${SUPABASE_URL}/rest/v1/birthday_wishes?select=*&to_email=eq.${encodeURIComponent(toEmail)}&wish_date=eq.${today}&type=eq.${type}&order=created_at.asc`;
    }
    const res = await fetch(url, { headers: hdrs });
    if (res.ok) {
      const data = await res.json();
      _selfWishData.wishes = Array.isArray(data) ? data : [];
      // Update banner button badge count
      const bannerBadge = document.getElementById('bannerSeeWishesBadge');
      if (bannerBadge) bannerBadge.textContent = _selfWishData.wishes.length;
    }
  } catch(e) {
  }
}

// ── Open My Wishes Modal (for birthday/anniversary person) ───
function _openMyWishesModal() {
  // If _selfWishData is not yet set (e.g. user clicked banner button directly),
  // populate it from the global banner data
  if (!_selfWishData.email && !_selfWishData.empId) {
    const bdays = window._celebBannerBdays || [];
    const annis = window._celebBannerAnnis || [];
    const meBday = bdays.find(_isMe);
    const meAnni = annis.find(_isMe);
    const me = meBday || meAnni;
    if (me) {
      _selfWishData = {
        email:  me.email || (CURRENT_USER && CURRENT_USER.email) || null,
        type:   meBday ? 'birthday' : 'anniversary',
        empId:  me.empId || null,
        wishes: null
      };
    }
  }
  const overlay = document.getElementById('myWishesOverlay');
  if (!overlay) return;
  const listEl   = document.getElementById('myWishesList');
  const loadEl   = document.getElementById('myWishesLoading');
  const emptyEl  = document.getElementById('myWishesEmpty');
  const badge    = document.getElementById('myWishesBadge');
  const subtitle = document.getElementById('myWishesSubtitle');
  const topBar   = document.getElementById('myWishesTopBar');

  // Set subtitle
  const typeLabel = _selfWishData.type === 'anniversary' ? 'Work Anniversary' : 'Birthday';
  if (subtitle) subtitle.textContent = `Wishes received on your ${typeLabel} today`;
  if (topBar && _selfWishData.type === 'anniversary') {
    topBar.style.background = 'linear-gradient(90deg,#4e9af1,#00d4aa,#4e9af1)';
  }

  overlay.style.display = 'flex';

  // Reset Reply to Everyone section
  const revBox  = document.getElementById('replyEveryoneBox');
  const revDone = document.getElementById('replyEveryoneDone');
  const revInp  = document.getElementById('replyEveryoneInput');
  if (revBox)  revBox.style.display  = 'none';
  if (revDone) revDone.style.display = 'none';
  if (revInp)  revInp.value = '';

  // Use cached wishes if available
  if (_selfWishData.wishes !== null) {
    _renderMyWishes(_selfWishData.wishes, listEl, loadEl, emptyEl, badge);
    return;
  }

  // Otherwise fetch
  listEl.innerHTML = '';
  if (loadEl)  loadEl.style.display  = 'block';
  if (emptyEl) emptyEl.style.display = 'none';
  if (badge)   badge.textContent     = '';

  _preloadWishCount(_selfWishData.email, _selfWishData.type, _selfWishData.empId).then(() => {
    _renderMyWishes(_selfWishData.wishes || [], listEl, loadEl, emptyEl, badge);
  });
}

function _renderMyWishes(wishes, listEl, loadEl, emptyEl, badge) {
  if (loadEl)  loadEl.style.display  = 'none';
  if (badge)   badge.textContent     = wishes.length;
  if (!listEl) return;

  if (wishes.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }

  const colors = ['#f0a500','#00d4aa','#4e9af1','#ff5c7c','#a855f7','#f97316'];
  listEl.innerHTML = wishes.map((w, idx) => {
    const fromEmpData  = w.from_employee || {};
    const fromName     = fromEmpData['Employee_name'] || w.from_name || 'Colleague';
    const fromDept     = fromEmpData['Employee_Dept'] || '';
    const fromAvatar   = fromEmpData['avatar_url'] || fromEmpData['Link'] || null;
    const msg          = w.wish_text || '🎉';
    const timeStr      = w.created_at ? _celebFmtTime(w.created_at) : '';
    const initial      = fromName.charAt(0).toUpperCase();
    const col          = colors[fromName.charCodeAt(0) % colors.length];
    const wishId       = w.id || '';
    const existingReply = w.reply_text || '';

    const avatarHTML = fromAvatar
      ? `<img src="${fromAvatar}" alt="${fromName}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none';this.nextSibling.style.display='flex'">
         <span style="display:none;width:36px;height:36px;border-radius:50%;background:${col}22;color:${col};border:1.5px solid ${col}55;align-items:center;justify-content:center;font-size:0.88rem;font-weight:800;font-family:'DM Sans',sans-serif;">${initial}</span>`
      : `<span style="display:flex;width:36px;height:36px;border-radius:50%;background:${col}22;color:${col};border:1.5px solid ${col}55;align-items:center;justify-content:center;font-size:0.88rem;font-weight:800;font-family:'DM Sans',sans-serif;">${initial}</span>`;

    const replyDisplayHTML = existingReply
      ? `<div style="margin-top:8px;padding:8px 12px;background:rgba(240,165,0,0.08);border-left:3px solid #f0a500;border-radius:0 8px 8px 0;">
           <div style="font-size:0.72rem;font-weight:700;color:#f0a500;margin-bottom:3px;">🎂 Your Reply</div>
           <div style="font-size:0.84rem;color:var(--text2);line-height:1.5;">${existingReply}</div>
         </div>`
      : `<div id="replyBox_${idx}" style="display:none;margin-top:8px;">
           <textarea id="replyInput_${idx}" placeholder="Write your reply..." maxlength="200"
             style="width:100%;background:var(--surface);border:1.5px solid var(--border);border-radius:10px;padding:8px 10px;font-size:0.84rem;color:var(--text);font-family:DM Sans,sans-serif;resize:none;height:70px;outline:none;box-sizing:border-box;transition:border-color 0.2s;"
             onfocus="this.style.borderColor='#f0a500'" onblur="this.style.borderColor='var(--border)'"></textarea>
           <div style="display:flex;gap:8px;margin-top:6px;">
             <button onclick="_sendReply('${wishId}', ${idx})"
               style="flex:1;padding:7px;border-radius:8px;border:none;background:linear-gradient(135deg,#f0a500,#ffcc44);color:#000;font-size:0.82rem;font-weight:700;cursor:pointer;font-family:DM Sans,sans-serif;">
               Send Reply 💬
             </button>
             <button onclick="document.getElementById('replyBox_${idx}').style.display='none'"
               style="padding:7px 14px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--muted);font-size:0.82rem;cursor:pointer;font-family:DM Sans,sans-serif;">
               Cancel
             </button>
           </div>
         </div>`;

    const replyBtnHTML = existingReply ? '' :
      `<button onclick="document.getElementById('replyBox_${idx}').style.display='block';document.getElementById('replyInput_${idx}').focus()"
         style="margin-top:7px;padding:4px 12px;border-radius:20px;border:1px solid rgba(240,165,0,0.4);background:rgba(240,165,0,0.08);color:#f0a500;font-size:0.78rem;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;transition:all 0.15s;"
         onmouseover="this.style.background='rgba(240,165,0,0.18)'" onmouseout="this.style.background='rgba(240,165,0,0.08)'">
         💬 Reply
       </button>`;

    return `<div id="wishCard_${idx}" style="background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;animation:celebFadeIn 0.4s ease both;">
      <div style="display:flex;gap:11px;align-items:flex-start;">
        <div style="flex-shrink:0;">${avatarHTML}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap;">
            <span style="font-size:0.88rem;font-weight:700;color:var(--text);">${fromName}</span>
            ${fromDept ? `<span style="font-size:0.72rem;color:var(--muted);background:var(--surface);border:1px solid var(--border);padding:1px 7px;border-radius:20px;">${fromDept}</span>` : ""}
            ${timeStr  ? `<span style="font-size:0.72rem;color:var(--muted);margin-left:auto;white-space:nowrap;">${timeStr}</span>` : ""}
          </div>
          <div style="font-size:0.87rem;color:var(--text2);line-height:1.55;word-break:break-word;">${msg}</div>
          ${replyBtnHTML}
          ${replyDisplayHTML}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Toggle Reply to Everyone box ─────────────────────────────
function _toggleReplyEveryone() {
  const box = document.getElementById('replyEveryoneBox');
  const inp = document.getElementById('replyEveryoneInput');
  if (!box) return;
  const isOpen = box.style.display !== 'none';
  box.style.display = isOpen ? 'none' : 'block';
  if (!isOpen && inp) inp.focus();
}

// ── Send same reply to ALL wishers ───────────────────────────
async function _sendReplyToEveryone() {
  const inp     = document.getElementById('replyEveryoneInput');
  const sendBtn = document.getElementById('replyEveryoneSendBtn');
  const doneEl  = document.getElementById('replyEveryoneDone');
  if (!inp) return;

  const replyText = inp.value.trim();
  if (!replyText) { inp.style.borderColor = '#ff5c7c'; inp.placeholder = 'Please write something...'; return; }

  const wishes = _selfWishData.wishes;
  if (!wishes || wishes.length === 0) return;

  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Sending...'; }

  const hdrs = SB_HDRS_MIN();

  let successCount = 0;
  for (const w of wishes) {
    if (!w.id) continue;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/birthday_wishes?id=eq.${w.id}`,
        { method: 'PATCH', headers: hdrs, body: JSON.stringify({ reply_text: replyText }) }
      );
      if (res.ok || res.status === 204) {
        w.reply_text = replyText; // update cache
        successCount++;
      }
    } catch(e) { }
  }

  if (successCount > 0) {
    // Update all wish cards in the modal to show the reply
    const listEl = document.getElementById('myWishesList');
    if (listEl) {
      // Re-render the list with updated wishes
      _renderMyWishes(_selfWishData.wishes, listEl, null, null,
        document.getElementById('myWishesBadge'));
    }
    // Show success
    if (doneEl) doneEl.style.display = 'block';
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send to All 💌'; }
    inp.value = '';
    setTimeout(() => {
      const box = document.getElementById('replyEveryoneBox');
      if (box) box.style.display = 'none';
      if (doneEl) doneEl.style.display = 'none';
    }, 2500);
  } else {
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send to All 💌'; }
    alert('Could not send replies. Please try again.');
  }
}
async function _sendReply(wishId, idx) {
  const inp = document.getElementById('replyInput_' + idx);
  if (!inp) return;
  const replyText = inp.value.trim();
  if (!replyText) { inp.style.borderColor = '#ff5c7c'; inp.placeholder = 'Please write something...'; return; }

  const box = document.getElementById('replyBox_' + idx);
  const btns = box ? box.querySelectorAll('button') : [];
  btns.forEach(b => { b.disabled = true; });

  try {
    const hdrs = SB_HDRS_MIN();
    const res = await fetch(
      SUPABASE_URL + '/rest/v1/birthday_wishes?id=eq.' + wishId,
      { method: 'PATCH', headers: hdrs, body: JSON.stringify({ reply_text: replyText }) }
    );

    if (res.ok || res.status === 204) {
      // Replace with saved reply display
      const card = document.getElementById('wishCard_' + idx);
      if (card) {
        const replyBtn = card.querySelector('button[onclick*="replyBox"]');
        if (replyBtn) replyBtn.remove();
        const replyBox = document.getElementById('replyBox_' + idx);
        if (replyBox) {
          replyBox.outerHTML = '<div style="margin-top:8px;padding:8px 12px;background:rgba(240,165,0,0.08);border-left:3px solid #f0a500;border-radius:0 8px 8px 0;">'
            + '<div style="font-size:0.72rem;font-weight:700;color:#f0a500;margin-bottom:3px;">🎂 Your Reply</div>'
            + '<div style="font-size:0.84rem;color:var(--text2);line-height:1.5;">' + replyText + '</div>'
            + '</div>';
        }
      }
      // Update cache
      if (_selfWishData.wishes) {
        const w = _selfWishData.wishes.find(x => String(x.id) === String(wishId));
        if (w) w.reply_text = replyText;
      }
    } else {
      btns.forEach(b => { b.disabled = false; });
      alert('Could not save reply. Please try again.');
    }
  } catch(e) {
    btns.forEach(b => { b.disabled = false; });
    alert('Network error. Please try again.');
  }
}

// ── Load wisher's own wish + birthday person's reply ─────────
async function _loadMyWishAndReply(toPerson, type, containerEl) {
  if (!CURRENT_USER) return;
  const today = new Date().toISOString().split('T')[0];
  const hdrs = SB_HDRS();
  const toFirstName = (toPerson.name || '').split(' ')[0];

  // Show a loading state immediately
  containerEl.innerHTML = `<div style="font-size:0.82rem;font-weight:700;color:#4e9af1;margin-bottom:4px;">✅ You've already sent a wish!</div>
    <div style="font-size:0.78rem;color:var(--muted);">Loading reply... ⏳</div>`;

  let rows = null;

  // ── Strategy 1: both emp_ids (most reliable) ──────────────────
  const fromEmpId = _getEmpId(CURRENT_USER.email || CURRENT_USER.name);
  const toEmpId   = toPerson.empId || _getEmpId(toPerson.email || toPerson.name);

  try {
    if (fromEmpId && toEmpId) {
      const url = `${SUPABASE_URL}/rest/v1/birthday_wishes?select=wish_text,reply_text&from_emp_id=eq.${fromEmpId}&to_emp_id=eq.${toEmpId}&wish_date=eq.${today}&type=eq.${type}&order=created_at.desc&limit=1`;
      const res = await fetch(url, { headers: hdrs });
      if (res.ok) { const data = await res.json(); if (Array.isArray(data) && data.length) rows = data; }
    }

    // ── Strategy 2: email-based ────────────────────────────────
    if (!rows) {
      const fromEmail = encodeURIComponent((CURRENT_USER.email || '').trim());
      const toEmail   = encodeURIComponent((toPerson.email   || '').trim());
      if (fromEmail && toEmail) {
        const url2 = `${SUPABASE_URL}/rest/v1/birthday_wishes?select=wish_text,reply_text&from_email=ilike.${fromEmail}&to_email=ilike.${toEmail}&wish_date=eq.${today}&type=eq.${type}&order=created_at.desc&limit=1`;
        const res2 = await fetch(url2, { headers: hdrs });
        if (res2.ok) { const data2 = await res2.json(); if (Array.isArray(data2) && data2.length) rows = data2; }
      }
    }

    // ── Strategy 3: fetch all today's wishes for this person, match by name ─
    if (!rows && toEmpId) {
      const url3 = `${SUPABASE_URL}/rest/v1/birthday_wishes?select=wish_text,reply_text,from_name&to_emp_id=eq.${toEmpId}&wish_date=eq.${today}&type=eq.${type}&order=created_at.desc`;
      const res3 = await fetch(url3, { headers: hdrs });
      if (res3.ok) {
        const all = await res3.json();
        if (Array.isArray(all)) {
          const myName = (CURRENT_USER.name || '').toLowerCase().trim();
          const match  = all.find(r => (r.from_name || '').toLowerCase().trim() === myName);
          if (match) rows = [match];
        }
      }
    }

    if (!rows || rows.length === 0) {
      containerEl.innerHTML = `<div style="font-size:0.82rem;font-weight:700;color:#4e9af1;">✅ You've already sent a wish!</div>`;
      return;
    }

    const { wish_text, reply_text } = rows[0];

    const replyHTML = reply_text
      ? `<div style="margin-top:9px;padding:10px 13px;background:rgba(240,165,0,0.10);border-left:3px solid #f0a500;border-radius:0 10px 10px 0;">
           <div style="font-size:0.72rem;font-weight:700;color:#f0a500;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.05em;">🎂 ${toFirstName} replied</div>
           <div style="font-size:0.86rem;color:var(--text);line-height:1.5;">${reply_text}</div>
         </div>`
      : `<div style="margin-top:6px;font-size:0.78rem;color:var(--muted);font-style:italic;">No reply yet — check back later 🕐</div>`;

    containerEl.innerHTML = `
      <div style="font-size:0.82rem;font-weight:700;color:#4e9af1;margin-bottom:6px;">✅ You've already sent a wish!</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 13px;font-size:0.85rem;color:var(--text2);line-height:1.5;">${wish_text || ''}</div>
      ${replyHTML}`;

  } catch(e) {
    containerEl.innerHTML = `<div style="font-size:0.82rem;font-weight:700;color:#4e9af1;">✅ You've already sent a wish!</div>`;
  }
}

// ── "Wish All" shortcut — first person ───────────────────────
function _openWishAllPopup(birthdays, anniversaries) {
  // Use passed args if provided, otherwise fall back to globally stored banner data
  const bdays = (birthdays && birthdays.length) ? birthdays : (window._celebBannerBdays || []);
  const annis = (anniversaries && anniversaries.length) ? anniversaries : (window._celebBannerAnnis || []);
  if (bdays.length > 0) {
    _openCelebPopup('birthday-others', bdays[0], null);
  } else if (annis.length > 0) {
    _openCelebPopup('anniversary-others', annis[0], annis[0].years);
  }
}

// ── Close popup ───────────────────────────────────────────────
function closeCelebPopup() {
  const overlay = document.getElementById('celebPopupOverlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
  _stopConfetti();
  _celebCurrentPerson = null;
}

// Close on backdrop click
document.addEventListener('DOMContentLoaded', function() {
  const ov = document.getElementById('celebPopupOverlay');
  if (ov) ov.addEventListener('click', function(e) {
    if (e.target === ov) closeCelebPopup();
  });
});

// ── Send wish → Supabase mein save karo (with FK) ────────────
async function sendWish() {
  const inp      = document.getElementById('celebWishInput');
  const wishText = inp ? inp.value.trim() : '';
  const wishBox  = document.getElementById('celebWishBox');
  const wishSent = document.getElementById('celebWishSent');
  const sendBtn  = document.getElementById('celebSendBtn');

  // Validate
  if (!wishText) {
    if (inp) { inp.style.borderColor = '#ff5c7c'; inp.focus(); }
    return;
  }
  if (!_celebCurrentPerson) return;

  // Disable button
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '⏳ Sending...'; }

  // Detect wish type from popup title
  const titleEl   = document.getElementById('celebTitle');
  const titleTxt  = titleEl ? titleEl.textContent.toLowerCase() : '';
  const finalType = titleTxt.includes('anniversary') ? 'anniversary' : 'birthday';

  const today     = new Date().toISOString().split('T')[0];
  const fromName  = (CURRENT_USER && CURRENT_USER.name)  ? CURRENT_USER.name  : 'Colleague';
  const fromEmail = (CURRENT_USER && CURRENT_USER.email) ? CURRENT_USER.email : '';
  const toName    = _celebCurrentPerson.name  || '';
  const toEmail   = _celebCurrentPerson.email || '';

  // ── FK Emp_ids lookup ──
  const fromEmpId = _getEmpId(fromEmail || fromName) || null;
  const toEmpId   = _celebCurrentPerson.empId
                    || _getEmpId(toEmail || toName)
                    || null;


  const payload = {
    from_emp_id: fromEmpId,   // FK → Employee_details(Emp_id)
    to_emp_id:   toEmpId,     // FK → Employee_details(Emp_id)
    from_name:   fromName,    // backup display
    from_email:  fromEmail,   // backup lookup
    to_name:     toName,      // backup display
    to_email:    toEmail,     // backup lookup
    wish_text:   wishText,
    type:        finalType,
    wish_date:   today
  };

  try {
    const hdrs = SB_HDRS_MIN();

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/birthday_wishes`,
      { method: 'POST', headers: hdrs, body: JSON.stringify(payload) }
    );

    if (res.ok || res.status === 201) {
      // Prevent duplicate wish today
      const wKey = _wishKey(toEmail || toName, finalType);
      localStorage.setItem(wKey, '1');
      // Update banner button to "Wished ✅" without page reload
      const wishBannerBtn = document.querySelector('.celeb-wish-all-btn');
      if (wishBannerBtn && !wishBannerBtn.disabled) {
        // Check if all celebrants are now wished
        const allC = [
          ...(window._celebBannerBdays||[]).map(p=>({...p,celebType:'birthday'})),
          ...(window._celebBannerAnnis||[]).map(p=>({...p,celebType:'anniversary'}))
        ];
        const allDone = allC.every(p => localStorage.getItem(_wishKey(p.email||p.name, p.celebType)));
        if (allDone) {
          wishBannerBtn.innerHTML = '✅ Wished!';
          wishBannerBtn.disabled = true;
          wishBannerBtn.style.background = 'linear-gradient(135deg,#00d4aa,#22c55e)';
          wishBannerBtn.style.cursor = 'default';
          wishBannerBtn.style.opacity = '0.9';
          wishBannerBtn.onclick = null;
        }
      }

      // Show success
      if (wishBox) wishBox.style.display = 'none';
      if (wishSent) {
        wishSent.style.display = 'block';
        wishSent.innerHTML = `✅ Your wish has been sent! 🎊<br>
          <span style="font-size:0.79rem;opacity:0.85;">— "${wishText.length > 60 ? wishText.substring(0,60)+'…' : wishText}"</span>`;
      }
      setTimeout(() => closeCelebPopup(), 2500);

    } else {
      const errText = await res.text();
      if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '🎉 Send Wish!'; }
      if (wishBox) {
        const e = document.createElement('div');
        e.style.cssText = 'font-size:0.80rem;color:#ff5c7c;margin-top:6px;padding:8px;border-radius:8px;background:rgba(255,92,124,0.1);border:1px solid rgba(255,92,124,0.25);';
        e.textContent = '⚠️ Error: ' + (errText.length < 120 ? errText : 'Table was not created. Run the SQL below.');
        wishBox.appendChild(e);
        setTimeout(() => e.remove(), 5000);
      }
    }
  } catch(e) {
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '🎉 Send Wish!'; }
  }
}

// ═══════════════════════════════════════════════════════════════
// CONFETTI ENGINE (lightweight canvas-based)
// ═══════════════════════════════════════════════════════════════
let _confettiFrame = null;
let _confettiParts = [];

function _startConfetti(isBirthday) {
  const canvas = document.getElementById('celebConfetti');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = canvas.offsetWidth  || 480;
  canvas.height = canvas.offsetHeight || 400;

  const colors = isBirthday
    ? ['#f0a500','#ffcc44','#ff5c7c','#00d4aa','#4e9af1','#ff9f43','#ff6b9d']
    : ['#4e9af1','#00d4aa','#f0a500','#b8e0ff','#48dbfb'];

  _confettiParts = Array.from({length: 60}, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    w: 7 + Math.random() * 9,
    h: 5 + Math.random() * 7,
    color: colors[Math.floor(Math.random() * colors.length)],
    speed: 1.2 + Math.random() * 2.2,
    angle: Math.random() * 360,
    spin:  (Math.random() - 0.5) * 4,
    swing: (Math.random() - 0.5) * 1.5,
    opacity: 0.7 + Math.random() * 0.3
  }));

  _stopConfetti();
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    _confettiParts.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
      p.y     += p.speed;
      p.x     += p.swing;
      p.angle += p.spin;
      if (p.y > canvas.height) {
        p.y = -10;
        p.x = Math.random() * canvas.width;
      }
    });
    _confettiFrame = requestAnimationFrame(draw);
  }
  draw();
}

function _stopConfetti() {
  if (_confettiFrame) { cancelAnimationFrame(_confettiFrame); _confettiFrame = null; }
  const canvas = document.getElementById('celebConfetti');
  if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height); }
}

// ═══════════════════════════════════════════════════════════════
// HOOK INTO showPortal + MULTIPLE FALLBACK TRIGGERS
// ═══════════════════════════════════════════════════════════════
(function() {
  // 1. Wrap showPortal so celebrations load whenever portal shows
  const _origSP = window.showPortal;
  window.showPortal = function() {
    if (_origSP) _origSP.apply(this, arguments);
    // Trigger after portal renders (600ms is enough for DOM)
    setTimeout(function() {
      if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER) {
        loadCelebrations();
      }
    }, 600);
  };

  // 2. Fallback: if localStorage session exists, portal loads on window.load
  //    The load handler calls the original showPortal by name — which now points
  //    to our override because we assigned window.showPortal. But just in case,
  //    also try via MutationObserver watching portal visibility.
  const _celebObs = new MutationObserver(function() {
    const portal = document.getElementById('mainPortal');
    if (portal && portal.classList.contains('visible')) {
      if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER) {
        setTimeout(loadCelebrations, 800);
      }
    }
  });

  document.addEventListener('DOMContentLoaded', function() {
    const portal = document.getElementById('mainPortal');
    if (portal) {
      _celebObs.observe(portal, { attributes: true, attributeFilter: ['class'] });
    }
    // 3. Extra fallback: check 3 seconds after page load
    setTimeout(function() {
      const p2 = document.getElementById('mainPortal');
      if (p2 && p2.classList.contains('visible') &&
          typeof CURRENT_USER !== 'undefined' && CURRENT_USER) {
        loadCelebrations();
      }
    }, 3000);
  });
})();

// ═══════════════════════════════════════════════════════════════
// ANNOUNCEMENTS PANEL — Full System
// ═══════════════════════════════════════════════════════════════

let _annCurrentFilter = 'all';
let _annLoaded = false;

// ── Filter button handler ────────────────────────────────────
function annFilter(btn, filter) {
  _annCurrentFilter = filter;
  document.querySelectorAll('.ann-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _renderAnnFeed();
}

// ══════════════════════════════════════════════════════════════
//  ANNOUNCEMENT OVERLAY SYSTEM — v2 (Right Drawer from Home)
//  Supabase table: announcements
//  Columns: id, title, body, type (update/celeb/general),
//           posted_by (text, e.g. "MIS Team"), created_at,
//           pinned (boolean), active (boolean)
// ══════════════════════════════════════════════════════════════

let _annDrwLoaded   = false;
let _annDrwUpdates  = [];   // from Supabase announcements table
let _annDrwCelebs   = [];   // birthdays / anniversaries
let _annDrwFilter   = 'update'; // default to Updates tab

/* ── Badge count helpers ─────────────────────────────────── */
function _annGetSeenIds() {
  try { return JSON.parse(localStorage.getItem('annSeenIds') || '[]'); } catch(e) { return []; }
}
// Stable key for celebrations: use name+celebType+today (no .id on employee rows)
function _annCelebKey(c) {
  return 'c_' + (c.name || '').replace(/\s+/g,'_') + '_' + (c.celebType || 'bday');
}
function _annMarkAllSeen() {
  const allIds = [
    ..._annDrwUpdates.map(a => 'u_' + a.id),
    ..._annDrwCelebs.map(c => _annCelebKey(c))
  ];
  localStorage.setItem('annSeenIds', JSON.stringify(allIds));
  // Also set day-level seen flag so dot stays gone all day
  localStorage.setItem('annSeen_' + _annTodayKey(), '1');
  _annUpdateBadge();
}
function _annUpdateBadge() {
  const badge = document.getElementById('annBellDot');
  if (!badge) return;
  // If user has opened the overlay today, hide dot immediately
  if (localStorage.getItem('annSeen_' + _annTodayKey()) === '1') {
    badge.style.display = 'none';
    return;
  }
  const seenIds = _annGetSeenIds();
  const unseenUpdates = _annDrwUpdates.filter(a => !seenIds.includes('u_' + a.id));
  const unseenCelebs  = _annDrwCelebs.filter(c => !seenIds.includes(_annCelebKey(c)));
  const count = unseenUpdates.length + unseenCelebs.length;
  if (count <= 0) {
    badge.style.display = 'none';
  } else {
    badge.style.display = 'inline-flex';
    badge.textContent = count > 99 ? '99+' : String(count);
  }
}

/* ── Open / Close overlay ────────────────────────────────── */
let _annChatPollInterval = null;
let _annLastMsgId = 0; // track last seen message id for incremental fetch

function _annStartChatPoll() {
  _annStopChatPoll();
  // Update _annLastMsgId from current data
  if (_annDrwWishes.length) _annLastMsgId = Math.max(..._annDrwWishes.map(w => w.id || 0));

  _annChatPollInterval = setInterval(async () => {
    if (_annDrwFilter !== 'celeb') { _annStopChatPoll(); return; }
    try {
      const today = new Date().toISOString().slice(0,10);
      // Only fetch messages newer than last known id
      const idFilter = _annLastMsgId > 0 ? `&id=gt.${_annLastMsgId}` : '';
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/birthday_wishes?select=id,wish_text,from_email,from_name,type,to_email,to_name,created_at&wish_date=eq.${today}${idFilter}&order=created_at.asc&limit=50`,
        { headers: SB_HDRS() }
      );
      if (!res.ok) return;
      const newMsgs = await res.json();
      if (!newMsgs.length) return;

      // Append only truly new messages
      const existingIds = new Set(_annDrwWishes.map(w => w.id));
      const toAdd = newMsgs.filter(w => !existingIds.has(w.id)).map(w => ({
        ...w,
        _senderName:   w.from_name || (w.from_email ? w.from_email.split('@')[0] : 'Someone'),
        _senderAvatar: _annAvatarCache[( w.from_email||'').toLowerCase()] || null
      }));
      if (!toAdd.length) return;

      _annDrwWishes.push(...toAdd);
      _annLastMsgId = Math.max(..._annDrwWishes.map(w => w.id || 0));
      _annDrwRender();
      // Load any missing avatars for new senders
      _annLoadMissingAvatars();
      // Scroll to bottom if user is near bottom
      const feed = document.getElementById('annDrwFeed');
      if (feed && (feed.scrollHeight - feed.scrollTop - feed.clientHeight) < 140) {
        setTimeout(() => { feed.scrollTop = feed.scrollHeight; }, 60);
      }
    } catch(e) {}
  }, 5000); // poll every 5 seconds
}

function _annStopChatPoll() {
  if (_annChatPollInterval) { clearInterval(_annChatPollInterval); _annChatPollInterval = null; }
}

function openAnnOverlay() {
  const backdrop = document.getElementById('annOverlayBackdrop');
  const drawer   = document.getElementById('annOverlayDrawer');
  if (!backdrop || !drawer) return;
  backdrop.style.display = 'block';
  drawer.style.display   = 'flex';
  requestAnimationFrame(() => {
    backdrop.style.opacity = '1';
    drawer.style.transform = 'translateX(0)';
  });
  document.body.style.overflow = 'hidden';
  if (_annDrwLoaded) {
    _annDrwRender();
    _annMarkAllSeen();
  } else {
    _annDrwLoad();
  }
  localStorage.setItem('annSeen_' + _annTodayKey(), '1');
  if (_annDrwLoaded) _annMarkAllSeen(); // ensure badge stays off after viewing
  annDrwFilter(_annDrwFilter || 'update');
}

function closeAnnOverlay() {
  const backdrop = document.getElementById('annOverlayBackdrop');
  const drawer   = document.getElementById('annOverlayDrawer');
  if (!backdrop || !drawer) return;
  _annStopChatPoll(); // stop polling when drawer closes
  drawer.style.transform = 'translateX(100%)';
  backdrop.style.opacity = '0';
  setTimeout(() => {
    drawer.style.display   = 'none';
    backdrop.style.display = 'none';
    document.body.style.overflow = '';
  }, 320);
}

/* ── Filter tabs ─────────────────────────────────────────── */
function annDrwFilter(f) {
  _annDrwFilter = f;
  document.querySelectorAll('.ann-drw-tab').forEach(b => {
    const isActive = b.id === 'ann-drw-tab-' + f;
    const col = f === 'celeb' ? '#f0a500' : '#4e9af1';
    b.style.borderBottomColor = isActive ? col : 'transparent';
    b.style.color   = isActive ? col : 'var(--muted)';
    b.style.fontWeight = isActive ? '700' : '600';
    b.style.background = isActive ? (f==='celeb'?'rgba(240,165,0,0.06)':'rgba(78,154,241,0.06)') : 'transparent';
    if (isActive) b.classList.add('active'); else b.classList.remove('active');
  });

  // Footer: Updates → Post Update btn | Celebrations → chat input
  const updFooter  = document.getElementById('annFooterUpdates');
  const chatFooter = document.getElementById('annFooterChat');
  const postBtn    = document.getElementById('annPostUpdateBtn');
  const isMIS      = PERMISSIONS.can_post_announcements === 'true';

  const feed = document.getElementById('annDrwFeed');

  if (f === 'celeb') {
    if (updFooter)  updFooter.style.display  = 'none';
    if (chatFooter) chatFooter.style.display = 'flex';
    _annSetSelfAvatar();
    // Fun celebration background
    if (feed) {
      feed.style.background = 'linear-gradient(135deg,rgba(255,220,100,0.08) 0%,rgba(255,100,150,0.06) 33%,rgba(150,100,255,0.06) 66%,rgba(100,200,255,0.07) 100%)';
      feed.style.padding    = '14px 14px';
    }
    _annStartChatPoll(); // start real-time polling
  } else {
    if (updFooter)  updFooter.style.display  = 'flex';
    if (chatFooter) chatFooter.style.display = 'none';
    if (postBtn) postBtn.style.display = isMIS ? 'flex' : 'none';
    if (feed) { feed.style.background = ''; feed.style.padding = '16px 20px'; }
    _annStopChatPoll(); // stop polling when not on celeb tab
  }

  _annDrwRender();
}

/* ── Load data ───────────────────────────────────────────── */
async function _annDrwLoad() {
  const feed = document.getElementById('annDrwFeed');
  if (!feed) return;

  // Show loading skeleton immediately — don't make user wait
  feed.innerHTML = '<div style="padding:32px;text-align:center;color:var(--muted);font-size:0.87rem;">⏳ Loading...</div>';

  // Fetch all data in parallel (not sequential)
  await Promise.allSettled([
    _annDrwFetchUpdates(),
    _annDrwFetchCelebrations(),
    _annDrwFetchWishes()
  ]);

  _annDrwLoaded = true;
  _annDrwRender();
  _annUpdateBadge();
  _annMarkAllSeen();
}

/* ── Fetch announcements from Supabase ───────────────────── */
async function _annDrwFetchUpdates() {
  try {
    const hdrs = SB_HDRS();
    // Dedicated portal_update_text table se fetch karo
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/portal_update_text?select=id,title,body,posted_by,created_at&order=created_at.desc&limit=50`,
      { headers: hdrs }
    );
    if (!res.ok) { _annDrwUpdates = []; return; }
    const data = await res.json();
    _annDrwUpdates = (Array.isArray(data) ? data : [])
      .filter(r => r.title && r.title.trim())
      .map(r => ({
        id:         r.id,
        title:      r.title || 'Portal Update',
        body:       r.body || '',
        posted_by:  r.posted_by || 'MIS Team',
        pinned:     false,
        type:       'update',
        created_at: r.created_at
      }));
  } catch(e) { _annDrwUpdates = []; }
}

/* ── Fetch birthdays/anniversaries ───────────────────────── */
async function _annDrwFetchCelebrations() {
  try {
    const hdrs = SB_HDRS();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/Employee_details?select=*&limit=500`, { headers: hdrs });
    if (!res.ok) return;
    const employees = await res.json();
    if (!Array.isArray(employees)) return;
    _annDrwCelebs = [];
    employees.forEach(emp => {
      const name   = _annGetField(emp, ['Employee_name','employee_name','Name']);
      if (!name) return;
      const email  = _annGetField(emp, ['Email_Id','email_id','Email','email']);
      const dept   = _annGetField(emp, ['Employee_Dept','employee_dept','Department']);
      const avatar = _annGetField(emp, ['avatar_url','Link','link','Photo']);
      const dob    = _annGetField(emp, ['Date of Birth','Date_of_Birth','date_of_birth','DOB']);
      const doj    = _annGetField(emp, ['Date Of Joining','Date_Of_Joining','date_of_joining','DOJ']);
      if (dob && typeof _celebIsToday === 'function' && _celebIsToday(dob))
        _annDrwCelebs.push({ name, email, dept, avatar, celebType:'birthday' });
      if (doj && typeof _celebIsToday === 'function' && _celebIsToday(doj)) {
        const years = typeof _celebYearsSince === 'function' ? _celebYearsSince(doj) : 0;
        if (years > 0) _annDrwCelebs.push({ name, email, dept, avatar, celebType:'anniversary', years });
      }
    });
  } catch(e) {}
}

/* ── Safe body renderer: escape HTML → newlines → clickable links ── */
function _safeBody(text) {
  if (!text) return '';
  // 1. HTML entities escape karo — agar user ne </div> ya < > type kiya ho toh layout nahi tootega
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  // 2. Newlines ko <br> mein convert karo
  const withBreaks = escaped.replace(/\n/g, '<br>');
  // 3. URLs ko clickable <a> links mein convert karo
  return withBreaks.replace(
    /(https?:\/\/[^\s<>"'\]]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#4e9af1;text-decoration:underline;word-break:break-all;display:inline;">$1</a>'
  );
}

/* ── Render all cards in drawer ─────────────────────────── */
function _annDrwRender() {
  const feed = document.getElementById('annDrwFeed');
  if (!feed) return;

  const f = _annDrwFilter;
  let html = '';

  // ─ Portal Updates from Supabase ─
  if (f === 'all' || f === 'update') {
    if (_annDrwUpdates.length > 0) {
      _annDrwUpdates.forEach((ann, i) => {
        const typeClr = ann.type === 'celeb' ? '#f0a500'
                      : ann.type === 'general' ? '#ff5c7c'
                      : '#4e9af1';
        const typeBg  = ann.type === 'celeb' ? 'rgba(240,165,0,0.1)'
                      : ann.type === 'general' ? 'rgba(255,92,124,0.1)'
                      : 'rgba(78,154,241,0.1)';
        const typeIcon = ann.type === 'celeb' ? '🎉' : ann.type === 'general' ? '📣' : '✨';
        const timeAgo = ann.created_at ? _annTimeLabel(ann.created_at) : '';
        const pinnedBadge = ann.pinned
          ? `<span style="font-size:0.68rem;padding:2px 8px;border-radius:20px;background:rgba(240,165,0,0.15);color:#f0a500;font-weight:700;border:1px solid rgba(240,165,0,0.3);">📌 Pinned</span>` : '';
        const _isMIS = PERMISSIONS.can_post_announcements === 'true';
        const _delBtn = _isMIS
          ? `<button onclick="editPortalUpdate(${ann.id})" style="background:rgba(78,154,241,0.08);border:1px solid rgba(78,154,241,0.25);color:#4e9af1;border-radius:7px;padding:2px 9px;font-size:0.68rem;font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.18s;margin-right:4px;" onmouseover="this.style.background='rgba(78,154,241,0.2)'" onmouseout="this.style.background='rgba(78,154,241,0.08)'">✏️ Edit</button><button onclick="deletePortalUpdate(${ann.id})" style="background:rgba(255,59,48,0.08);border:1px solid rgba(255,59,48,0.22);color:#ff3b30;border-radius:7px;padding:2px 9px;font-size:0.68rem;font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.18s;" onmouseover="this.style.background='rgba(255,59,48,0.2)'" onmouseout="this.style.background='rgba(255,59,48,0.08)'">🗑 Delete</button>`
          : '';
        html += `
        <div id="ann-card-${ann.id}" style="background:var(--surface2);border:1px solid var(--border);border-radius:14px;border-left:3px solid ${typeClr};flex-shrink:0;animation:annCardIn 0.35s cubic-bezier(0.22,1,0.36,1) both;animation-delay:${i*0.06}s;">
          <div style="padding:14px 16px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
              <span style="font-size:1.1rem;">${typeIcon}</span>
              <span style="font-size:0.72rem;font-weight:700;padding:2px 9px;border-radius:20px;background:${typeBg};color:${typeClr};border:1px solid ${typeClr}40;">Portal Update</span>
              ${pinnedBadge}
              <span style="font-size:0.72rem;color:var(--muted);margin-left:auto;">${timeAgo}</span>
              ${_delBtn}
            </div>
            <div style="font-family:'Playfair Display',serif;font-size:0.95rem;font-weight:700;color:var(--text);margin-bottom:6px;line-height:1.35;">${ann.title || 'Update'}</div>
            <div style="font-size:0.83rem;color:var(--text2);line-height:1.7;word-break:break-word;overflow-wrap:break-word;width:100%;">${_safeBody(ann.body)}</div>
            ${ann.posted_by ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:0.75rem;color:var(--muted);display:flex;align-items:center;gap:6px;"><span style="width:22px;height:22px;border-radius:6px;background:rgba(78,154,241,0.15);color:#4e9af1;display:inline-flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:800;">${(ann.posted_by||'M')[0].toUpperCase()}</span><span>Posted by <strong style="color:var(--text2);">${ann.posted_by}</strong></span></div>` : ''}
          </div>
        </div>`;
      });
    } else if (f === 'update') {
      html += _annDrwEmpty('✨', 'No portal updates yet.', 'MIS Team will post updates here soon.');
    }
  }

  // ─ Celebrations tab — always show (chat works even without celebrations) ─
  if (f === 'all' || f === 'celeb') {
    const bdays = _annDrwCelebs.filter(c => c.celebType === 'birthday');
    const annis = _annDrwCelebs.filter(c => c.celebType === 'anniversary');
    let celebHTML = '';

    // ── Celebration banner (only when someone has birthday/anniversary) ──
    if (_annDrwCelebs.length > 0) {
      celebHTML += `
    <div style="background:var(--surface2);border:1px solid rgba(240,165,0,0.3);border-radius:14px;overflow:hidden;border-left:3px solid #f0a500;">
      <div style="padding:14px 16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span style="font-size:1.2rem;">${bdays.length > 0 && annis.length > 0 ? '🎉' : bdays.length > 0 ? '🎂' : '🥳'}</span>
          <span style="font-size:0.72rem;font-weight:700;padding:2px 9px;border-radius:20px;background:rgba(240,165,0,0.12);color:#f0a500;border:1px solid rgba(240,165,0,0.3);">Celebrations</span>
          <span style="font-size:0.72rem;color:#ff3b30;font-weight:700;margin-left:auto;">🔴 Today</span>
        </div>
        <div style="font-family:'Playfair Display',serif;font-size:0.95rem;font-weight:700;color:var(--text);margin-bottom:8px;">
          ${bdays.length > 0 && annis.length > 0 ? 'Birthdays & Anniversaries Today!' :
            bdays.length > 0 ? (bdays.length === 1 ? `Happy Birthday, ${bdays[0].name.split(' ')[0]}! 🎂` : `${bdays.length} Birthdays Today!`) :
            (annis.length === 1 ? `Happy Anniversary, ${annis[0].name.split(' ')[0]}! 🥳` : `${annis.length} Work Anniversaries!`)}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">`;
      bdays.forEach(p => {
        const ini = (p.name||'?')[0].toUpperCase();
      celebHTML += `<div style="display:flex;align-items:center;gap:7px;padding:6px 10px;border-radius:10px;background:rgba(240,165,0,0.08);border:1px solid rgba(240,165,0,0.2);">
        ${p.avatar ? `<img src="${p.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" onerror="this.outerHTML='<span style=width:28px;height:28px;border-radius:50%;background:rgba(240,165,0,0.2);color:#f0a500;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;>${ini}</span>'">`
          : `<span style="width:28px;height:28px;border-radius:50%;background:rgba(240,165,0,0.2);color:#f0a500;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;">${ini}</span>`}
        <div><div style="font-size:0.81rem;font-weight:700;color:var(--text);">🎂 ${p.name.split(' ')[0]}</div><div style="font-size:0.70rem;color:var(--muted);">Birthday</div></div>
      </div>`;
    });
    annis.forEach(p => {
      const ini = (p.name||'?')[0].toUpperCase();
      celebHTML += `<div style="display:flex;align-items:center;gap:7px;padding:6px 10px;border-radius:10px;background:rgba(78,154,241,0.08);border:1px solid rgba(78,154,241,0.2);">
        ${p.avatar ? `<img src="${p.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" onerror="this.outerHTML='<span style=width:28px;height:28px;border-radius:50%;background:rgba(78,154,241,0.2);color:#4e9af1;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;>${ini}</span>'">`
          : `<span style="width:28px;height:28px;border-radius:50%;background:rgba(78,154,241,0.2);color:#4e9af1;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;">${ini}</span>`}
        <div><div style="font-size:0.81rem;font-weight:700;color:var(--text);">🥳 ${p.name.split(' ')[0]}</div><div style="font-size:0.70rem;color:var(--muted);">${p.years ? p.years + ' yr' : ''} Anniversary</div></div>
      </div>`;
    });
    celebHTML += `</div>
        <div style="font-size:0.80rem;color:var(--muted);">Spread some love and wish your teammates on their special day! 💛</div>
      </div>
    </div>`; // end celebration banner
    } // end if (_annDrwCelebs.length > 0)

    // WhatsApp-style group chat — always visible in celeb tab
    // Colorful palette for other senders (cycles through fun colors)
    const _chatPalette = [
      {bg:'rgba(168,85,247,0.13)',border:'rgba(168,85,247,0.3)',name:'#a855f7',bubble:'rgba(168,85,247,0.1)'},
      {bg:'rgba(236,72,153,0.12)',border:'rgba(236,72,153,0.3)',name:'#ec4899',bubble:'rgba(236,72,153,0.09)'},
      {bg:'rgba(59,130,246,0.13)',border:'rgba(59,130,246,0.3)',name:'#3b82f6',bubble:'rgba(59,130,246,0.1)'},
      {bg:'rgba(20,184,166,0.13)',border:'rgba(20,184,166,0.3)',name:'#14b8a6',bubble:'rgba(20,184,166,0.1)'},
      {bg:'rgba(234,179,8,0.13)', border:'rgba(234,179,8,0.3)', name:'#ca8a04',bubble:'rgba(234,179,8,0.08)'},
    ];
    // Build sender→color map so each person always gets same color
    const _senderColorMap = {};
    let _colorIdx = 0;

    celebHTML += `<div id="annCelebChat" style="display:flex;flex-direction:column;gap:8px;">
      <div style="text-align:center;margin-bottom:4px;">
        <span style="font-size:0.68rem;font-weight:700;color:var(--muted);background:rgba(240,165,0,0.1);padding:4px 14px;border-radius:20px;border:1px solid rgba(240,165,0,0.2);letter-spacing:0.05em;">✨ GROUP WISHES ✨ <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#22c55e;margin-left:4px;vertical-align:middle;animation:pulse 2s infinite;" title="Live"></span></span>
      </div>`;

    if (_annDrwWishes.length > 0) {
      _annDrwWishes.forEach(w => {
        const me       = CURRENT_USER?.email && w.from_email && w.from_email.toLowerCase() === CURRENT_USER.email.toLowerCase();
        const sender   = w._senderName || w.from_name || (w.from_email ? w.from_email.split('@')[0] : 'Someone');
        const initials = sender[0]?.toUpperCase() || '?';
        const avatar   = w._senderAvatar || null;
        const timeStr  = w.created_at ? new Date(w.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '';
        const target   = _annDrwCelebs.find(c => c.email === w.to_email);
        const toName   = target ? target.name.split(' ')[0] : (w.to_name && w.to_name !== 'Team' ? w.to_name.split(' ')[0] : '');
        const typeEmoji= (w.type === 'birthday') ? '🎂' : (w.type === 'anniversary') ? '🥳' : '🎉';

        // Assign stable color per sender
        if (!_senderColorMap[sender]) { _senderColorMap[sender] = _chatPalette[_colorIdx++ % _chatPalette.length]; }
        const pal = _senderColorMap[sender];

        // Avatar
        const avatarDiv = avatar
          ? `<img src="${avatar}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;margin-top:2px;border:2px solid ${pal.border};" onerror="this.style.display='none'">`
          : `<div style="width:32px;height:32px;border-radius:50%;background:${pal.bg};color:${pal.name};display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:900;flex-shrink:0;margin-top:2px;border:2px solid ${pal.border};">${initials}</div>`;

        if (me) {
          // My message — right side, golden gradient bubble
          celebHTML += `
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;">
              <div style="max-width:85%;background:linear-gradient(135deg,#f0a500,#f97316);border-radius:18px 3px 18px 18px;padding:10px 14px;box-shadow:0 2px 10px rgba(240,165,0,0.35);">
                ${toName?`<div style="font-size:0.67rem;color:rgba(255,255,255,0.85);font-weight:800;margin-bottom:4px;letter-spacing:0.02em;">${typeEmoji} To ${toName}</div>`:''}
                <div style="font-size:0.92rem;font-weight:700;color:#fff;line-height:1.5;letter-spacing:0.01em;">${w.wish_text}</div>
                <div style="font-size:0.62rem;color:rgba(255,255,255,0.75);text-align:right;margin-top:5px;">${timeStr} ✓✓</div>
              </div>
            </div>`;
        } else {
          // Others — left side, colorful per-sender bubble
          celebHTML += `
            <div style="display:flex;align-items:flex-start;gap:8px;">
              ${avatarDiv}
              <div style="max-width:82%;">
                <div style="font-size:0.7rem;font-weight:800;color:${pal.name};margin-bottom:3px;letter-spacing:0.01em;">${sender}</div>
                <div style="background:${pal.bubble};border:1.5px solid ${pal.border};border-radius:3px 18px 18px 18px;padding:10px 14px;box-shadow:0 1px 6px rgba(0,0,0,0.08);">
                  ${toName?`<div style="font-size:0.67rem;color:${pal.name};font-weight:800;margin-bottom:4px;">${typeEmoji} To ${toName}</div>`:''}
                  <div style="font-size:0.92rem;font-weight:700;color:var(--text);line-height:1.5;letter-spacing:0.01em;">${w.wish_text}</div>
                  <div style="font-size:0.62rem;color:var(--muted);margin-top:5px;">${timeStr}</div>
                </div>
              </div>
            </div>`;
        }
      });
      celebHTML += `</div>`; // close wishes list
    } else {
      celebHTML += `<div style="text-align:center;padding:30px 16px;">
        <div style="font-size:3rem;margin-bottom:10px;animation:livePulse 2s ease-in-out infinite;">🎊</div>
        <div style="font-size:0.92rem;font-weight:800;color:var(--text);margin-bottom:6px;">No messages yet!</div>
        <div style="font-size:0.8rem;color:var(--muted);">Be the first to spread some joy 🌟</div>
      </div>`;
    }
    celebHTML += `</div>`; // close annCelebChat
    html += celebHTML;
  }

  // ─ Empty state (only for updates tab when no updates) ─
  if (!html) {
    if (f === 'update') {
      html = _annDrwEmpty('✨', 'No updates yet.', 'MIS Team will post updates here soon.');
    }
  }

  feed.innerHTML = html;
  // Scroll chat to bottom when celeb tab is active
  if (_annDrwFilter === 'celeb') {
    setTimeout(() => { feed.scrollTop = feed.scrollHeight; }, 50);
  }
}

function _annDrwEmpty(icon, title, sub) {
  return `<div style="text-align:center;padding:40px 20px;color:var(--muted);">
    <div style="font-size:2.5rem;margin-bottom:10px;">${icon}</div>
    <div style="font-size:0.88rem;font-weight:600;color:var(--text2);margin-bottom:4px;">${title}</div>
    <div style="font-size:0.80rem;">${sub}</div>
  </div>`;
}

/* ── Wish Modal ─────────────────────────────────────────────── */
function openAnnWishModal() {
  if (!_annDrwCelebs.length) { alert('No celebrations today to wish!'); return; }
  // Populate target dropdown
  const sel = document.getElementById('annWishTarget');
  if (sel) {
    sel.innerHTML = '<option value="">— Select Person —</option>' +
      _annDrwCelebs.map(c =>
        `<option value="${c.email}|${c.celebType}">${c.name} — ${c.celebType === 'birthday' ? '🎂 Birthday' : '🥳 Work Anniversary'}</option>`
      ).join('');
  }
  document.getElementById('annWishMessage').value = '';
  document.getElementById('annWishError').style.display = 'none';
  document.getElementById('annWishBackdrop').style.display = 'block';
  document.getElementById('annWishModal').style.display = 'block';
}

function closeAnnWishModal() {
  document.getElementById('annWishBackdrop').style.display = 'none';
  document.getElementById('annWishModal').style.display = 'none';
}

async function submitAnnWish() {
  const sel  = document.getElementById('annWishTarget');
  const msg  = document.getElementById('annWishMessage').value.trim();
  const errEl= document.getElementById('annWishError');
  const btn  = document.getElementById('annWishSubmitBtn');
  errEl.style.display = 'none';

  if (!sel.value) { errEl.textContent = 'Please select who you want to wish.'; errEl.style.display='block'; return; }
  if (!msg)       { errEl.textContent = 'Please write a message.'; errEl.style.display='block'; return; }

  const [toEmail, celebType] = sel.value.split('|');
  const senderName = CURRENT_USER?.name || CURRENT_USER?.email || 'A teammate';
  const today = new Date().toISOString().slice(0,10);

  btn.disabled = true; btn.textContent = 'Sending…';
  try {
    const body = {
      to_email:    toEmail,
      wish_text:   msg,
      type:        celebType,
      wish_date:   today,
      from_email:  CURRENT_USER?.email || null,
    };
    // Try to add from_emp_id if available
    if (_qzEmpId) body.from_emp_id = _qzEmpId;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/birthday_wishes`, {
      method: 'POST',
      headers: { ...SB_HDRS_JSON(), 'Prefer': 'return=minimal' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const e = await res.text();
      throw new Error(e.substring(0,120));
    }
    closeAnnWishModal();
    // Reload celeb wishes in drawer
    await _annDrwFetchWishes();
    _annDrwRender();
    // Show success toast
    _annToast('💌 Wish sent! Your message has been delivered.');
  } catch(e) {
    errEl.textContent = 'Could not send wish: ' + e.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = '💌 Send Wish';
  }
}

/* ── Fetch today's wishes for celebrations in drawer ─────── */
let _annDrwWishes = []; // wishes for today's celebrants
// Avatar cache: email → avatar_url (populated lazily)
const _annAvatarCache = {};

async function _annDrwFetchWishes() {
  try {
    const today = new Date().toISOString().slice(0,10);
    // Simple fast query — no JOIN, uses from_name saved at send time
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/birthday_wishes?select=id,wish_text,from_email,from_name,type,to_email,to_name,created_at&wish_date=eq.${today}&order=created_at.asc&limit=100`,
      { headers: SB_HDRS() }
    );
    const raw = res.ok ? (await res.json()) : [];
    _annDrwWishes = raw.map(w => ({
      ...w,
      _senderName:   w.from_name || (w.from_email ? w.from_email.split('@')[0] : 'Someone'),
      _senderAvatar: _annAvatarCache[w.from_email] || null
    }));
    // Lazy-load avatars for senders we haven't cached yet
    _annLoadMissingAvatars();
  } catch(e) { _annDrwWishes = []; }
}

async function _annLoadMissingAvatars() {
  const uncached = [...new Set(
    _annDrwWishes.map(w => w.from_email).filter(e => e && !_annAvatarCache[e])
  )];
  if (!uncached.length) return;
  try {
    const emailList = uncached.slice(0,20).map(e => `"${e}"`).join(',');
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/Employee_details?select=Email_Id,avatar_url,Link&Email_Id=in.(${emailList})`,
      { headers: SB_HDRS() }
    );
    if (!res.ok) return;
    const rows = await res.json();
    let changed = false;
    rows.forEach(r => {
      const url = r.avatar_url || r.Link || null;
      const email = (r.Email_Id || '').toLowerCase();
      if (email && url && !_annAvatarCache[email]) {
        _annAvatarCache[email] = url;
        // Update cached wishes with avatar
        _annDrwWishes.forEach(w => {
          if ((w.from_email || '').toLowerCase() === email) { w._senderAvatar = url; changed = true; }
        });
      }
    });
    // Re-render only if avatars changed
    if (changed && _annDrwFilter === 'celeb') _annDrwRender();
  } catch(e) {}
}

/* ── Emoji picker helpers ─────────────────────────────────── */
function annToggleEmojiPicker() {
  const picker = document.getElementById('annEmojiPicker');
  if (!picker) return;
  picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
}

function annInsertEmoji(emoji) {
  const input = document.getElementById('annChatInput');
  if (!input) return;
  const pos = input.selectionStart ?? input.value.length;
  input.value = input.value.slice(0, pos) + emoji + input.value.slice(pos);
  input.focus();
  input.setSelectionRange(pos + emoji.length, pos + emoji.length);
}

/* ── Populate self avatar in chat input ────────────────────── */
function _annSetSelfAvatar() {
  const el = document.getElementById('annChatSelfAvatar');
  if (!el || !CURRENT_USER) return;
  const name   = CURRENT_USER.name || CURRENT_USER.email || '';
  const ini    = name[0]?.toUpperCase() || '?';
  const avatar = CURRENT_USER.avatar_url || CURRENT_USER.avatar || null;
  if (avatar) {
    el.innerHTML = `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent='${ini}'">`;
    el.style.padding = '0';
  } else {
    // Try fetching from DB if not cached
    if (CURRENT_USER.email && !CURRENT_USER._avatarFetched) {
      CURRENT_USER._avatarFetched = true;
      fetch(`${SUPABASE_URL}/rest/v1/Employee_details?select=Email_Id,avatar_url,Link&Email_Id=ilike.${encodeURIComponent(CURRENT_USER.email)}&limit=1`, { headers: SB_HDRS() })
        .then(r => r.json()).then(arr => {
          const url = arr[0]?.avatar_url || arr[0]?.Link || null;
          if (url) {
            CURRENT_USER.avatar_url = url;
            // Pre-cache for group chat avatars
            if (typeof _annAvatarCache !== 'undefined') _annAvatarCache[CURRENT_USER.email.toLowerCase()] = url;
            _annSetSelfAvatar();
          }
        }).catch(() => {});
    }
    el.textContent = ini;
  }
}

/* ── Inline chat send (Celebrations tab) ─────────────────── */
async function annSendChatWish() {
  const input = document.getElementById('annChatInput');
  const msg   = input?.value?.trim();
  if (!msg) return;

  const picker = document.getElementById('annEmojiPicker');
  if (picker) picker.style.display = 'none';

  // If celebration today, target first celebrant; otherwise send as general team message
  const target     = _annDrwCelebs[0] || null;
  const toEmail    = target?.email || 'team@celebrations'; // placeholder — avoids NOT NULL constraint
  const toName     = target?.name  || 'Team';
  const celebType  = target?.celebType || 'general';
  const today      = new Date().toISOString().slice(0,10);
  const senderName = CURRENT_USER?.name || CURRENT_USER?.email?.split('@')[0] || 'Someone';
  const senderAvatar = CURRENT_USER?.avatar_url || CURRENT_USER?.avatar || null;

  const body = {
    wish_text:  msg,
    type:       celebType,
    wish_date:  today,
    from_email: CURRENT_USER?.email || null,
    from_name:  senderName,
    to_name:    toName,
    to_email:   toEmail,  // always set — never null
  };
  if (_qzEmpId) body.from_emp_id = _qzEmpId;

  input.value = '';
  input.disabled = true;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/birthday_wishes`, {
      method: 'POST',
      headers: { ...SB_HDRS_JSON(), 'Prefer': 'return=minimal' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errTxt = await res.text().catch(() => res.status);
      throw new Error(errTxt.substring(0,120));
    }
    // Optimistically add to local list
    _annDrwWishes.push({
      id: Date.now(), wish_text: msg,
      from_email: CURRENT_USER?.email, from_name: senderName,
      type: celebType, to_email: toEmail, to_name: toName,
      created_at: new Date().toISOString(),
      _senderName:   senderName,
      _senderAvatar: senderAvatar
    });
    _annDrwRender();
    const feed = document.getElementById('annDrwFeed');
    if (feed) setTimeout(() => { feed.scrollTop = feed.scrollHeight; }, 80);
  } catch(e) {
    _annToast('⚠️ Could not send: ' + e.message);
    input.value = msg; // restore message on failure
  } finally {
    input.disabled = false;
    input.focus();
  }
}

function _annToast(msg) {
  let t = document.getElementById('annToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'annToast';
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#22c55e;color:#fff;padding:10px 20px;border-radius:10px;font-size:0.82rem;font-weight:700;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.3);opacity:0;transition:opacity 0.3s;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(() => { t.style.opacity = '0'; }, 3000);
}

// ── Main function called when switching to announcements ──────
async function loadAnnouncements() {
  if (_annLoaded) { _renderAnnFeed(); return; }

  // Show loading
  const container = document.getElementById('annFeedContainer');
  if (container) container.innerHTML = `<div style="text-align:center;padding:60px;color:var(--muted);">
    <div style="font-size:2rem;margin-bottom:12px;">⏳</div>
    <div style="font-size:0.9rem;">Loading announcements…</div>
  </div>`;

  // Fetch live data in parallel
  await Promise.allSettled([
    _annFetchCelebrations(),
  ]);

  _annLoaded = true;
  _renderAnnFeed();
  // Hide the red dot since user has seen it
  const dot = document.getElementById('announceDot');
  if (dot) { dot.style.display = 'none'; localStorage.setItem('annSeen_' + _annTodayKey(), '1'); }
}

function _annTodayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
}

// ── Cached live data ─────────────────────────────────────────
let _annBirthdays    = [];
let _annAnniversaries = [];

// ── Fetch birthdays & anniversaries from Supabase ─────────────
async function _annFetchCelebrations() {
  // Reuse data from celebration system if already loaded
  if (typeof _celebLoaded !== 'undefined' && _celebLoaded) {
    // Get from existing banner render — re-fetch fresh
  }
  try {
    const hdrs = SB_HDRS();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/Employee_details?select=*&limit=500`, { headers:hdrs });
    if (!res.ok) return;
    const employees = await res.json();
    if (!Array.isArray(employees)) return;

    _annBirthdays    = [];
    _annAnniversaries = [];

    employees.forEach(emp => {
      const name  = _annGetField(emp, ['Employee_name','employee_name','Name']);
      if (!name) return;
      const email  = _annGetField(emp, ['Email_Id','email_id','Email','email']);
      const dept   = _annGetField(emp, ['Employee_Dept','employee_dept','Department']);
      const avatar = _annGetField(emp, ['avatar_url','Link','link','Photo']);
      const dob    = _annGetField(emp, ['Date of Birth','Date_of_Birth','date_of_birth','DOB']);
      const doj    = _annGetField(emp, ['Date Of Joining','Date_Of_Joining','date_of_joining','DOJ']);

      if (dob && typeof _celebIsToday === 'function' && _celebIsToday(dob)) {
        _annBirthdays.push({ name, email, dept, avatar });
      }
      if (doj && typeof _celebIsToday === 'function' && _celebIsToday(doj)) {
        const years = typeof _celebYearsSince === 'function' ? _celebYearsSince(doj) : 0;
        if (years > 0) _annAnniversaries.push({ name, email, dept, avatar, years });
      }
    });
  } catch(e) { }
}

// ── Helper to safely get field ────────────────────────────────
function _annGetField(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return String(row[k]).trim();
  }
  return '';
}

// ── Format date nicely ────────────────────────────────────────
function _annFmtDate(str) {
  if (!str) return '';
  try {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  } catch { return str; }
}

// ── Days ago label ────────────────────────────────────────────
function _annTimeLabel(dateStr) {
  if (!dateStr) return '';
  // IST (UTC+5:30) mein compare karo — raw ms diff se galat din aata tha
  const toIST = dt => {
    const utc = dt.getTime() + dt.getTimezoneOffset() * 60000;
    return new Date(utc + 5.5 * 3600000);
  };
  const dIST   = toIST(new Date(dateStr));
  const nowIST = toIST(new Date());
  // Date-only strings compare karo (time ignore karo)
  const dDate   = dIST.toISOString().slice(0,10);
  const nowDate = nowIST.toISOString().slice(0,10);
  if (dDate === nowDate) return '🔴 Today';
  // Diff in calendar days
  const diffMs   = new Date(nowDate) - new Date(dDate);
  const diffDays = Math.round(diffMs / 86400000);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)  return diffDays + ' days ago';
  if (diffDays < 30) return Math.floor(diffDays/7) + ' weeks ago';
  if (diffDays < 365)return Math.floor(diffDays/30) + ' months ago';
  return Math.floor(diffDays/365) + ' years ago';
}

// ── Build tag HTML ────────────────────────────────────────────
function _annBuildTags(tags, color) {
  if (!tags || !tags.length) return '';
  const bg = color ? color + '18' : 'rgba(240,165,0,0.1)';
  const cl = color || '#f0a500';
  const brd = color ? color + '35' : 'rgba(240,165,0,0.25)';
  return tags.map(t => `<span class="ann-tag" style="background:${bg};color:${cl};border:1px solid ${brd};">${t}</span>`).join('');
}

// ── Build a person chip ───────────────────────────────────────
function _annPersonChip(p, emoji, extraText, clickFn, color) {
  const bg = color ? color + '15' : 'rgba(240,165,0,0.12)';
  const cl = color || '#f0a500';
  const first = (p.name||'?').charAt(0).toUpperCase();
  const imgHtml = p.avatar
    ? `<img src="${p.avatar}" alt="${p.name}" onerror="this.style.display='none';this.nextSibling.style.display='flex'" /><span style="display:none;width:26px;height:26px;border-radius:50%;background:${bg};color:${cl};align-items:center;justify-content:center;font-size:0.72rem;font-weight:800;">${first}</span>`
    : `<span style="display:flex;width:26px;height:26px;border-radius:50%;background:${bg};color:${cl};align-items:center;justify-content:center;font-size:0.72rem;font-weight:800;">${first}</span>`;
  return `<span class="ann-person-chip" onclick="${clickFn}" style="border-color:${cl}33;">
    <span class="ann-person-avatar">${imgHtml}</span>
    <span>
      <span class="ann-person-name">${emoji} ${p.name}</span>
      ${extraText ? `<br><span class="ann-person-sub">${extraText}</span>` : ''}
    </span>
  </span>`;
}

// ── Render all cards filtered ─────────────────────────────────
function _renderAnnFeed() {
  const container = document.getElementById('annFeedContainer');
  if (!container) return;

  const filter = _annCurrentFilter;
  let cards = [];

  // ─ 1. Celebrations (birthdays + anniversaries) ─
  if (true) { // always show celebrations
    if (_annBirthdays.length > 0 || _annAnniversaries.length > 0) {
      const hasBday = _annBirthdays.length > 0;
      const hasAnni = _annAnniversaries.length > 0;

      let pplHTML = '<div class="ann-people-row">';
      _annBirthdays.forEach(p => {
        pplHTML += _annPersonChip(p, '🎂', 'Birthday Today!',
          `_openCelebPopup('birthday-others',${JSON.stringify(p)},null)`, '#f0a500');
      });
      _annAnniversaries.forEach(p => {
        const yr = p.years;
        pplHTML += _annPersonChip(p, '🥳', (yr ? _celebOrdinal(yr) + ' Work Anniversary' : 'Work Anniversary'),
          `_openCelebPopup('anniversary-others',${JSON.stringify(p)},${yr||0})`, '#4e9af1');
      });
      pplHTML += '</div>';
      pplHTML += `<div style="margin-top:12px;">
        <button class="ann-wish-btn" onclick="switchDB('home')">🎉 Wish Them on Home Page</button>
      </div>`;

      cards.push({
        type:'celeb', date: new Date().toISOString().split('T')[0], color:'#f0a500',
        icon: hasBday && hasAnni ? '🎉' : hasBday ? '🎂' : '🥳',
        typeBadge:'Celebrations',
        title: hasBday && hasAnni ? "Birthdays & Anniversaries Today!" :
               hasBday ? (_annBirthdays.length===1 ? `Happy Birthday, ${_annBirthdays[0].name.split(' ')[0]}! 🎂` : `${_annBirthdays.length} Birthdays Today! 🎂`) :
               (_annAnniversaries.length===1 ? `Happy Anniversary, ${_annAnniversaries[0].name.split(' ')[0]}! 🥳` : `${_annAnniversaries.length} Work Anniversaries Today!`),
        body: 'Spread some love and wish your teammates on their special day! 💛',
        extraHTML: pplHTML,
        tags: ['🎊 Today'],
        sortKey: '9999-celeb'
      });
    }
  }

  // ─ Sort: latest first ─
  cards.sort((a,b) => (b.sortKey||'') > (a.sortKey||'') ? 1 : -1);

  if (cards.length === 0) {
    container.innerHTML = `<div class="ann-empty">
      <div class="ann-empty-icon">🔕</div>
      <div class="ann-empty-text">No announcements in this category yet.</div>
    </div>`;
    return;
  }

  // ─ Render cards ─
  let html = '';
  cards.forEach((c, i) => {
    const typeColors = {
      update:'rgba(78,154,241,0.12)', celeb:'rgba(240,165,0,0.12)',
      potm:'rgba(240,165,0,0.12)', holiday:'rgba(0,212,170,0.12)', general:'rgba(255,92,124,0.12)'
    };
    const typeTextColors = {
      update:'#4e9af1', celeb:'#f0a500', potm:'#f0a500', holiday:'#00d4aa', general:'#ff5c7c'
    };
    const typeType = c.type||'update';
    const badgeBg  = typeColors[typeType]  || 'rgba(240,165,0,0.12)';
    const badgeClr = typeTextColors[typeType] || '#f0a500';
    const timeLabel = c.sortKey && c.sortKey.startsWith('999') ? '🔴 Today' : _annTimeLabel(c.date);

    html += `<div class="ann-card" style="--ann-color:${c.color||'#f0a500'};animation-delay:${i*0.05}s;">
      <div class="ann-card-left-bar"></div>
      <div class="ann-card-inner">
        <div class="ann-card-head">
          <span style="font-size:1.4rem;line-height:1;">${c.icon||'📢'}</span>
          <span class="ann-type-badge" style="background:${badgeBg};color:${badgeClr};border-color:${c.color||'#f0a500'}40;">${c.typeBadge||c.type}</span>
          <span class="ann-card-time">${timeLabel}${c.date && !c.sortKey?.startsWith('999') ? ' · '+_annFmtDate(c.date) : ''}</span>
        </div>
        <div class="ann-card-title">${c.title}</div>
        <div class="ann-card-body">${c.body}</div>
        ${c.extraHTML ? `<div style="margin-top:10px;">${c.extraHTML}</div>` : ''}
      </div>
    </div>`;
  });

  container.innerHTML = html;
}

// ── Hook into switchDB for announcements ──────────────────────
(function() {
  const _origSwitchDB = window.switchDB;
  window.switchDB = function(id, fromPopState) {
    if (_origSwitchDB) _origSwitchDB.apply(this, arguments);
    if (id === 'announcements') {
      setTimeout(loadAnnouncements, 50);
    }
  };
})();

// ── On page load — fetch announcement count ───────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Sidebar dot (hidden nav)
  const dot = document.getElementById('announceDot');
  if (dot) dot.style.display = 'none';
  // Load announcements silently to show count badge
  (async () => {
    await Promise.allSettled([_annDrwFetchUpdates(), _annDrwFetchCelebrations()]);
    _annDrwLoaded = true;
    _annUpdateBadge();
  })();
  // Keyboard ESC to close overlay
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeAnnOverlay(); });
});

// ===== next block =====

// ─── Quiz System Config ────────────────────────────────────────────────────
// Base headers — no Prefer here (added per-request as needed)
// Aliases — use global SB_HDRS helpers defined near SUPABASE config
const QZ_HDRS         = SB_HDRS_JSON;
const QZ_HDRS_REPR    = SB_HDRS_REPR;
const QZ_HDRS_MINIMAL = SB_HDRS_MIN;

// ─── State ─────────────────────────────────────────────────────────────────
let _qzCurrentQuiz   = null;   // quiz row
let _qzQuestions     = [];     // array of {question, options[]}
let _qzCurrentIndex  = 0;
let _qzAnswers       = {};     // { question_id: selected_option_id }
let _qzTimerInterval = null;
let _qzSecondsLeft   = 0;
let _qzAttemptId     = null;
let _qzRetakeId      = null;
let _qzEmpId         = null;   // Employee Emp_id

// ─── Admin: question builder state ─────────────────────────────────────────
let _qaQuestions = [];  // [{text, marks, options:[{text,is_correct}]}]

// ══════════════════════════════════════════════════════════════
// LOAD QUIZZES for Training Section
// ══════════════════════════════════════════════════════════════
let _quizzesLoaded = false;

async function loadTrainingQuizzes() {
  if (_quizzesLoaded) return;
  _quizzesLoaded = true;

  // Show admin button only to Hemant & Krishna (authorised MIS members)
  if (_canUploadQuiz()) {
    const cb = document.getElementById('create-quiz-btn');
    if (cb) cb.style.display = 'inline-flex';
  }

  // Show "My Results" to all logged-in users
  const mrb = document.getElementById('quiz-my-results-btn');
  if (mrb && CURRENT_USER) mrb.style.display = 'inline-block';

  const loadEl  = document.getElementById('db-quiz-loading');
  const gridEl  = document.getElementById('db-quiz-grid');
  const emptyEl = document.getElementById('db-quiz-empty');

  try {
    const url = `${SUPABASE_URL}/rest/v1/quizzes?select=*,content_nodes(name)&is_active=eq.true&order=id.desc`;
    const res  = await fetch(url, { headers: QZ_HDRS() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const quizzes = await res.json();

    if (loadEl) loadEl.style.display = 'none';

    if (!quizzes.length) {
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    const colors = ['#a855f7','#f0a500','#00d4aa','#4e9af1','#f97316','#e879f9','#22c55e'];
    // db-quiz-grid is a legacy hidden element — quizzes are shown inside
    // the module overlay's Assessment tab via _loadMktQuizPanel().
    // We only cache the data here; do NOT make db-quiz-grid visible on
    // the main training page.
    gridEl.innerHTML = quizzes.map((q, i) => {
      const col   = colors[i % colors.length];
      const mod   = (q.content_nodes && q.content_nodes.name) ? q.content_nodes.name : 'General';
      const tl    = q.time_limit ? `${q.time_limit} min` : '—';
      const pass  = q.passing_score ? `${q.passing_score}%` : '60%';
      return `
        <div onclick="openQuizPreview(${q.id})" style="cursor:pointer;background:var(--surface);border:1.5px solid ${col}33;border-top:3px solid ${col};border-radius:14px;padding:20px;transition:all 0.2s;position:relative;"
          onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 10px 30px rgba(0,0,0,0.25)';this.style.borderColor='${col}88'"
          onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor='${col}33'">
          ${_canUploadQuiz()?`<button onclick="event.stopPropagation();toggleQuizActive(${q.id},false)" title="Deactivate quiz" style="position:absolute;top:10px;right:10px;width:26px;height:26px;border-radius:7px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;font-size:0.75rem;display:flex;align-items:center;justify-content:center;">🗑</button>`:''}
          <div style="width:44px;height:44px;border-radius:12px;background:${col}22;border:1px solid ${col}44;display:flex;align-items:center;justify-content:center;font-size:1.4rem;margin-bottom:14px;">📝</div>
          <div style="font-size:1rem;font-weight:800;color:var(--text);margin-bottom:6px;">${q.title}</div>
          <div style="font-size:0.79rem;color:var(--muted);line-height:1.5;margin-bottom:14px;">${q.description||'Test your knowledge on '+mod}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
            <span style="font-size:0.72rem;padding:3px 9px;border-radius:20px;background:${col}18;color:${col};font-weight:700;border:1px solid ${col}33;">⏱ ${tl}</span>
            <span style="font-size:0.72rem;padding:3px 9px;border-radius:20px;background:rgba(34,197,94,0.12);color:#22c55e;font-weight:700;border:1px solid rgba(34,197,94,0.3);">🎯 Pass: ${pass}</span>
            <span style="font-size:0.72rem;padding:3px 9px;border-radius:20px;background:rgba(78,154,241,0.12);color:#4e9af1;font-weight:700;border:1px solid rgba(78,154,241,0.3);">📚 ${mod}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:0.78rem;font-weight:800;color:${col};">Take Quiz →</span>
          </div>
        </div>`;
    }).join('');

    // ✅ FIX: Do NOT set gridEl.style.display = 'grid' here.
    // Quiz cards must only appear inside the overlay Assessment tab,
    // NOT as separate cards below module cards on the training main page.
    // gridEl stays display:none always.

  } catch(e) {
    if (loadEl) loadEl.style.display = 'none';
    // ✅ FIX: Do NOT show emptyEl on the main training page either.
  }
}

// ── Training page tab switch ─────────────────────────────────────────────
function switchTrainingTab(tab) {
  const vidTab  = document.getElementById('training-tab-videos');
  const assTab  = document.getElementById('training-tab-assessment');
  const btnVid  = document.getElementById('tab-btn-videos');
  const btnAss  = document.getElementById('tab-btn-assessment');
  if (!vidTab || !assTab) return;

  if (tab === 'videos') {
    vidTab.style.display = 'block';
    assTab.style.display = 'none';
    btnVid.style.background = 'rgba(0,212,255,0.15)';
    btnVid.style.color      = '#00d4ff';
    btnVid.style.fontWeight = '800';
    btnAss.style.background = 'transparent';
    btnAss.style.color      = 'var(--muted)';
    btnAss.style.fontWeight = '700';
  } else {
    vidTab.style.display = 'none';
    assTab.style.display = 'block';
    btnAss.style.background = 'rgba(168,85,247,0.15)';
    btnAss.style.color      = '#a855f7';
    btnAss.style.fontWeight = '800';
    btnVid.style.background = 'transparent';
    btnVid.style.color      = 'var(--muted)';
    btnVid.style.fontWeight = '700';
    // load quizzes the first time Assessment tab is opened
    if (!_quizzesLoaded) loadTrainingQuizzes();
  }
}

// Hook into training panel load
const _origLoadTraining = window.loadTrainingSection;
window.loadTrainingSection = async function() {
  if (_origLoadTraining) await _origLoadTraining.apply(this, arguments);
  // Show Create Quiz + Grade Attempts + Upload buttons in header only to Hemant & Krishna
  if (_canUploadQuiz()) {
    const hdrBtn = document.getElementById('training-create-quiz-btn');
    if (hdrBtn) hdrBtn.style.display = 'flex';
    const gradeBtn = document.getElementById('training-grade-btn');
    if (gradeBtn) gradeBtn.style.display = 'flex';
    const uploadBtn = document.getElementById('training-upload-btn');
    if (uploadBtn) uploadBtn.style.display = 'flex';
  }
};

// ══════════════════════════════════════════════════════════════
// QUIZ INFO PREVIEW POPUP
// ══════════════════════════════════════════════════════════════
let _previewQuizId       = null;
let _previewFromOverlay  = false;

async function openQuizPreview(quizId) {
  _previewQuizId      = quizId;
  _previewFromOverlay = false;

  // Show popup with loading state
  document.getElementById('quiz-preview-backdrop').style.display = 'block';
  document.getElementById('quiz-preview-modal').style.display    = 'block';
  document.body.style.overflow = 'hidden';

  document.getElementById('qp-title').textContent    = 'Loading…';
  document.getElementById('qp-module').textContent   = '';
  document.getElementById('qp-desc').textContent     = '';
  document.getElementById('qp-qs-count').textContent = '…';
  document.getElementById('qp-time-val').textContent = '…';
  document.getElementById('qp-pass-val').textContent = '…';
  document.getElementById('qp-types-wrap').style.display = 'none';
  document.getElementById('qp-start-btn').disabled   = true;

  try {
    // Fetch quiz meta
    const qRes  = await fetch(`${SUPABASE_URL}/rest/v1/quizzes?id=eq.${quizId}&select=*,content_nodes(name)`, { headers: QZ_HDRS() });
    const qArr  = await qRes.json();
    const quiz  = qArr[0];
    if (!quiz) throw new Error('Quiz not found');

    // Fetch question types + count
    const qqRes = await fetch(`${SUPABASE_URL}/rest/v1/questions?quiz_id=eq.${quizId}&select=id,question_type`, { headers: QZ_HDRS() });
    const qqArr = await qqRes.json();

    const mod   = quiz.content_nodes?.name || 'General';
    const col   = '#a855f7';

    // Populate popup
    document.getElementById('qp-top-bar').style.background   = `linear-gradient(90deg,${col},#7c3aed)`;
    document.getElementById('qp-icon').style.background       = `${col}22`;
    document.getElementById('qp-icon').style.borderColor      = `${col}55`;
    document.getElementById('qp-title').textContent           = quiz.title;
    document.getElementById('qp-module').textContent          = `📚 ${mod}`;
    document.getElementById('qp-desc').textContent            = quiz.description || 'No description provided.';
    document.getElementById('qp-qs-count').textContent        = qqArr.length || '—';
    document.getElementById('qp-time-val').textContent        = quiz.time_limit || '—';
    document.getElementById('qp-pass-val').textContent        = (quiz.passing_score || 60) + '%';

    // Question types badges
    if (qqArr.length) {
      const typeCounts = {};
      qqArr.forEach(q => {
        const t = q.question_type || 'mcq';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      });
      const typeLabels = { mcq:'MCQ', true_false:'True/False', descriptive:'Descriptive' };
      const typeColors = { mcq:'#a855f7', true_false:'#22c55e', descriptive:'#f0a500' };
      document.getElementById('qp-types').innerHTML = Object.entries(typeCounts).map(([t, cnt]) =>
        `<span style="font-size:0.75rem;padding:4px 11px;border-radius:20px;background:${typeColors[t]||'#4e9af1'}18;color:${typeColors[t]||'#4e9af1'};font-weight:700;border:1px solid ${typeColors[t]||'#4e9af1'}44;">${typeLabels[t]||t} ✕${cnt}</span>`
      ).join('');
      document.getElementById('qp-types-wrap').style.display = 'block';
    }

    document.getElementById('qp-start-btn').disabled = false;

  } catch(e) {
    document.getElementById('qp-desc').textContent     = '⚠️ ' + e.message;
    document.getElementById('qp-qs-count').textContent = '—';
    document.getElementById('qp-start-btn').disabled   = false;
  }
}

function openQuizPreviewFromOverlay(quizId) {
  _previewFromOverlay = true;
  closeMarketingOverlay();
  setTimeout(() => openQuizPreview(quizId), 80);
}

function closeQuizPreview() {
  document.getElementById('quiz-preview-backdrop').style.display = 'none';
  document.getElementById('quiz-preview-modal').style.display    = 'none';
  if (!document.getElementById('quiz-take-overlay') ||
      document.getElementById('quiz-take-overlay').style.display === 'none') {
    document.body.style.overflow = '';
  }
  _previewQuizId      = null;
  _previewFromOverlay = false;
}

function proceedFromPreview() {
  const qid = _previewQuizId;
  // Close preview popup (keep body scroll locked — quiz overlay will handle it)
  document.getElementById('quiz-preview-backdrop').style.display = 'none';
  document.getElementById('quiz-preview-modal').style.display    = 'none';
  _previewQuizId      = null;
  _previewFromOverlay = false;
  if (qid) startDBQuiz(qid);
}

// ══════════════════════════════════════════════════════════════
// START QUIZ
// ══════════════════════════════════════════════════════════════
async function startDBQuiz(quizId) {
  const overlay = document.getElementById('quiz-take-overlay');
  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden';

  // Reset state
  _qzAttemptId    = null;
  _qzCurrentIndex = 0;
  _qzAnswers      = {};

  // Loading UI
  document.getElementById('qt-quiz-title').textContent = 'Loading…';
  document.getElementById('qt-quiz-sub').textContent   = '';
  document.getElementById('qt-question-text').textContent = 'Loading quiz…';
  document.getElementById('qt-options-list').innerHTML  = '';
  document.getElementById('qt-progress-text').textContent = '…';

  try {
    // ── 1. Fetch quiz meta ──────────────────────────────────────────
    const qRes = await fetch(
      `${SUPABASE_URL}/rest/v1/quizzes?id=eq.${quizId}&select=*`,
      { headers: QZ_HDRS() }
    );
    const qArr = await qRes.json();
    if (!Array.isArray(qArr) || !qArr.length) throw new Error('Quiz not found');
    _qzCurrentQuiz = qArr[0];
    _qzRetakeId    = quizId;

    // ── 2. Fetch questions + options ────────────────────────────────
    const qqRes = await fetch(
      `${SUPABASE_URL}/rest/v1/questions?quiz_id=eq.${quizId}&select=*,options(*)&order=id.asc`,
      { headers: QZ_HDRS() }
    );
    _qzQuestions = await qqRes.json();
    if (!_qzQuestions.length) throw new Error('No questions added yet. Ask admin to add questions.');

    // ── 3. Get Employee Emp_id (for attempt tracking) ───────────────
    if (CURRENT_USER?.email && !_qzEmpId) {
      try {
        const eRes = await fetch(
          `${SUPABASE_URL}/rest/v1/Employee_details?select=Emp_id&Email_Id=ilike.${encodeURIComponent(CURRENT_USER.email)}&limit=1`,
          { headers: QZ_HDRS() }
        );
        const eArr = await eRes.json();
        if (eArr.length) _qzEmpId = eArr[0].Emp_id;
      } catch(e) { }
    }

    // ── 4. Count previous attempts → calculate attempt_number ───────
    // attempt_number = how many times this employee has taken this quiz before + 1
    let attemptNumber = 1;
    try {
      let countUrl = `${SUPABASE_URL}/rest/v1/quiz_attempts?quiz_id=eq.${quizId}&select=id`;
      if (_qzEmpId) countUrl += `&employee_id=eq.${_qzEmpId}`;
      const cRes  = await fetch(countUrl, {
        headers: { ...QZ_HDRS(), 'Prefer': 'count=exact', 'Range': '0-0' }
      });
      const cCount = parseInt(cRes.headers.get('Content-Range')?.split('/')[1] || '0');
      attemptNumber = cCount + 1;
    } catch(e) { }

    // ── 5. Create quiz_attempt record ───────────────────────────────
    // IMPORTANT: Do NOT send score/total_marks — DB Function 4 trigger sets these
    const attemptBody = {
      quiz_id:        quizId,
      attempt_number: attemptNumber,
      started_at:     new Date().toISOString()
    };
    // Only add employee_id if we have it (bigint column — must be number)
    if (_qzEmpId) attemptBody.employee_id = _qzEmpId;

    const attRes = await fetch(`${SUPABASE_URL}/rest/v1/quiz_attempts`, {
      method:  'POST',
      headers: QZ_HDRS_REPR(),
      body:    JSON.stringify(attemptBody)
    });

    // ── Error check on attempt INSERT ───────────────────────────────
    if (!attRes.ok) {
      const errBody = await attRes.text();
      throw new Error(`Could not start quiz (${attRes.status}). DB said: ${errBody.substring(0, 120)}`);
    }

    const attArr = await attRes.json();
    _qzAttemptId = Array.isArray(attArr) ? attArr[0]?.id : attArr?.id;

    if (!_qzAttemptId) {
      throw new Error('Quiz attempt record was not created. Check Supabase RLS on quiz_attempts table.');
    }


    // ── 6. Setup UI ─────────────────────────────────────────────────
    const attemptLabel  = attemptNumber > 1 ? ` · Attempt #${attemptNumber}` : '';
    const _qzTotalMarks = _qzQuestions.reduce((s, q) => s + (q.marks || 1), 0);
    const _qzPassPct    = _qzCurrentQuiz.passing_score || 60;
    const _qzPassMarks  = _qzTotalMarks > 0 ? Math.ceil((_qzPassPct / 100) * _qzTotalMarks) : null;
    const _qzPassLabel  = _qzPassMarks ? `Pass: ${_qzPassMarks}/${_qzTotalMarks} marks` : `Pass: ${_qzPassPct}%`;
    document.getElementById('qt-quiz-title').textContent = _qzCurrentQuiz.title;
    document.getElementById('qt-quiz-sub').textContent   =
      `${_qzQuestions.length} questions · ${_qzPassLabel}${attemptLabel}`;

    // ── 7. Start timer + render first question ──────────────────────
    _qzSecondsLeft = (_qzCurrentQuiz.time_limit || 15) * 60;
    startQuizTimer();
    renderQuizQuestion();

  } catch(e) {
    // Show error inside overlay (don't close it — user can see what went wrong)
    document.getElementById('qt-quiz-title').textContent = '⚠️ Failed to Start';
    document.getElementById('qt-question-text').textContent = e.message;
    document.getElementById('qt-options-list').innerHTML =
      `<div style="margin-top:16px;">
        <button onclick="document.getElementById('quiz-take-overlay').style.display='none';document.body.style.overflow='';"
          style="padding:10px 22px;border-radius:10px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:0.88rem;font-weight:600;cursor:pointer;font-family:inherit;">
          ← Close
        </button>
      </div>`;
  }
}

function renderQuizQuestion() {
  const total = _qzQuestions.length;
  const idx   = _qzCurrentIndex;
  const qData = _qzQuestions[idx];
  if (!qData) return;

  // Progress
  const pct = Math.round(((idx + 1) / total) * 100);
  document.getElementById('qt-progress-text').textContent = `${idx+1}/${total}`;
  document.getElementById('qt-progress-bar').style.width = pct + '%';
  document.getElementById('qt-q-label').textContent = `Question ${idx+1}`;
  document.getElementById('qt-question-text').textContent = qData.question_text;

  // Options — MCQ or Descriptive
  const qType = qData.question_type || 'mcq';
  const optsList = document.getElementById('qt-options-list');

  if (qType === 'true_false') {
    // ── True/False: show two big buttons ──
    const selId = _qzAnswers[qData.id];
    const opts  = qData.options || [];
    const trueOpt  = opts.find(o => o.option_text === 'True'  || o.option_text === 'true');
    const falseOpt = opts.find(o => o.option_text === 'False' || o.option_text === 'false');
    const trueId   = trueOpt?.id;
    const falseId  = falseOpt?.id;

    optsList.innerHTML = `
      <div style="display:flex;gap:14px;margin-top:6px;">
        <button onclick="selectQuizOption(${qData.id}, ${trueId}, null)" data-opt-id="${trueId}"
          style="flex:1;padding:20px;border-radius:14px;font-size:1.2rem;font-weight:800;cursor:pointer;font-family:inherit;
                 border:2.5px solid ${selId == trueId ? '#22c55e' : 'var(--border)'};
                 background:${selId == trueId ? 'rgba(34,197,94,0.14)' : 'var(--surface2)'};
                 color:${selId == trueId ? '#22c55e' : 'var(--text2)'};transition:all 0.18s;"
          onmouseover="this.style.borderColor='#22c55e';this.style.background='rgba(34,197,94,0.08)'"
          onmouseout="this.style.borderColor='${selId == trueId ? '#22c55e' : 'var(--border)'}';this.style.background='${selId == trueId ? 'rgba(34,197,94,0.14)' : 'var(--surface2)'}'">
          ✅ TRUE
        </button>
        <button onclick="selectQuizOption(${qData.id}, ${falseId}, null)" data-opt-id="${falseId}"
          style="flex:1;padding:20px;border-radius:14px;font-size:1.2rem;font-weight:800;cursor:pointer;font-family:inherit;
                 border:2.5px solid ${selId == falseId ? '#ef4444' : 'var(--border)'};
                 background:${selId == falseId ? 'rgba(239,68,68,0.12)' : 'var(--surface2)'};
                 color:${selId == falseId ? '#ef4444' : 'var(--text2)'};transition:all 0.18s;"
          onmouseover="this.style.borderColor='#ef4444';this.style.background='rgba(239,68,68,0.07)'"
          onmouseout="this.style.borderColor='${selId == falseId ? '#ef4444' : 'var(--border)'}';this.style.background='${selId == falseId ? 'rgba(239,68,68,0.12)' : 'var(--surface2)'}'">
          ❌ FALSE
        </button>
      </div>`;

  } else if (qType === 'descriptive') {
    // ── Descriptive: show textarea ──
    const existingAnswer = _qzAnswers[qData.id]?.text || '';
    optsList.innerHTML = `
      <div style="background:rgba(240,165,0,0.06);border:1.5px solid rgba(240,165,0,0.3);border-radius:12px;padding:14px;">
        <div style="font-size:0.75rem;font-weight:700;color:#f0a500;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">✏️ Write Your Answer</div>
        <textarea id="qt-desc-textarea-${qData.id}"
          oninput="saveDescriptiveAnswer(${qData.id}, this.value)"
          placeholder="Type your answer here…"
          rows="5"
          style="width:100%;padding:11px 13px;border-radius:9px;border:1px solid rgba(240,165,0,0.25);background:var(--surface);color:var(--text);font-size:0.9rem;font-family:inherit;outline:none;resize:vertical;line-height:1.6;"
        >${existingAnswer}</textarea>
        <div style="font-size:0.74rem;color:var(--muted);margin-top:8px;">Write a detailed answer. It will be reviewed by the admin.</div>
      </div>`;
  } else {
    // ── MCQ: show radio options ──
    const opts = qData.options || [];
    const selectedOptId = _qzAnswers[qData.id];
    optsList.innerHTML = opts.map(opt => {
      const isSelected = selectedOptId == opt.id;
      return `
        <div onclick="selectQuizOption(${qData.id}, ${opt.id}, this)" data-opt-id="${opt.id}"
          style="padding:13px 16px;border-radius:11px;border:2px solid ${isSelected ? '#a855f7' : 'var(--border)'};background:${isSelected ? 'rgba(168,85,247,0.12)' : 'var(--surface2)'};cursor:pointer;transition:all 0.18s;display:flex;align-items:center;gap:12px;"
          onmouseover="if(!this.classList.contains('selected')){this.style.borderColor='rgba(168,85,247,0.5)';this.style.background='rgba(168,85,247,0.06)';}"
          onmouseout="if(!this.classList.contains('selected')){this.style.borderColor='var(--border)';this.style.background='var(--surface2)';}">
          <div style="width:22px;height:22px;border-radius:50%;border:2px solid ${isSelected?'#a855f7':'var(--border)'};background:${isSelected?'#a855f7':'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.18s;">
            ${isSelected ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </div>
          <span style="font-size:0.9rem;color:var(--text);line-height:1.5;">${opt.option_text}</span>
        </div>`;
    }).join('');
  }

  // Navigation buttons
  document.getElementById('qt-prev-btn').style.opacity  = idx === 0 ? '0.3' : '1';
  document.getElementById('qt-prev-btn').disabled       = idx === 0;
  document.getElementById('qt-next-btn').style.display  = idx < total - 1 ? 'block' : 'none';
  document.getElementById('qt-submit-wrap').style.display = idx === total - 1 ? 'block' : 'none';

  // Answered count
  const answeredCount = Object.keys(_qzAnswers).length;
  document.getElementById('qt-answered-count').textContent = `${answeredCount}/${total} answered`;
}

function saveDescriptiveAnswer(questionId, text) {
  // Store as object with text key to distinguish from MCQ optionId
  _qzAnswers[questionId] = { text: text.trim() };
  // Update answered count
  const answeredCount = Object.keys(_qzAnswers).filter(k => {
    const v = _qzAnswers[k];
    if (typeof v === 'object') return v.text && v.text.length > 0;
    return !!v;
  }).length;
  const el = document.getElementById('qt-answered-count');
  if (el) el.textContent = `${answeredCount}/${_qzQuestions.length} answered`;
}

function selectQuizOption(questionId, optionId, el) {
  _qzAnswers[questionId] = optionId;
  // Refresh this question's options display
  const allOpts = document.getElementById('qt-options-list').querySelectorAll('[data-opt-id]');
  allOpts.forEach(div => {
    const isThis = parseInt(div.dataset.optId) === optionId;
    div.style.border     = `2px solid ${isThis ? '#a855f7' : 'var(--border)'}`;
    div.style.background = isThis ? 'rgba(168,85,247,0.12)' : 'var(--surface2)';
    div.classList.toggle('selected', isThis);
    const circle = div.querySelector('div');
    if (circle) {
      circle.style.border     = `2px solid ${isThis ? '#a855f7' : 'var(--border)'}`;
      circle.style.background = isThis ? '#a855f7' : 'transparent';
      circle.innerHTML = isThis ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : '';
    }
  });

  // Update answered count
  const answeredCount = Object.keys(_qzAnswers).filter(k => {
    const v = _qzAnswers[k];
    if (typeof v === 'object' && v !== null) return v.text && v.text.length > 0;
    return !!v;
  }).length;
  const acEl = document.getElementById('qt-answered-count');
  if (acEl) acEl.textContent = `${answeredCount}/${_qzQuestions.length} answered`;
}

function qtNavigate(dir) {
  const newIdx = _qzCurrentIndex + dir;
  if (newIdx < 0 || newIdx >= _qzQuestions.length) return;
  _qzCurrentIndex = newIdx;
  renderQuizQuestion();
}

// ── Timer ──
function startQuizTimer() {
  clearInterval(_qzTimerInterval);
  updateTimerDisplay();
  _qzTimerInterval = setInterval(() => {
    _qzSecondsLeft--;
    updateTimerDisplay();
    if (_qzSecondsLeft <= 0) {
      clearInterval(_qzTimerInterval);
      submitDBQuiz(true); // auto-submit on timeout
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(_qzSecondsLeft / 60).toString().padStart(2,'0');
  const s = (_qzSecondsLeft % 60).toString().padStart(2,'0');
  const el = document.getElementById('qt-timer-display');
  if (el) {
    el.textContent = `${m}:${s}`;
    el.style.color = _qzSecondsLeft <= 60 ? '#ef4444' : '#a855f7';
  }
}

// ── Submit Quiz ──
// ── DB Function names (match Supabase Dashboard > Database > Functions)
const QZ_RPC_BULK_ANSWERS = 'submit_quiz_answers'; // ← verify this name in Supabase

// Helper: fetch with a timeout (default 15 s) so we never hang forever
function _fetchWithTimeout(url, options, ms = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal })
    .finally(() => clearTimeout(timer));
}

async function submitDBQuiz(autoSubmit = false) {
  clearInterval(_qzTimerInterval);

  const answered = _qzQuestions.filter(q => {
    const v = _qzAnswers[q.id];
    if (typeof v === 'object' && v !== null) return v.text && v.text.trim().length > 0;
    return v !== undefined && v !== null;
  });

  if (!autoSubmit) {
    const unanswered = _qzQuestions.length - answered.length;
    if (unanswered > 0) {
      const go = confirm(`${unanswered} question(s) unanswered. Submit anyway?`);
      if (!go) return;
    }
  }

  const submitBtn = document.getElementById('qt-submit-btn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting…'; }

  try {
    if (!_qzAttemptId) throw new Error('Quiz attempt ID missing. Please restart the quiz.');

    // ── Build payloads
    const mcqRows  = [];
    const descRows = [];

    _qzQuestions.forEach(q => {
      const qType     = (q.question_type || 'mcq').toLowerCase();
      const answerVal = _qzAnswers[q.id];

      if (qType === 'descriptive') {
        const text = (typeof answerVal === 'object' && answerVal?.text)
          ? answerVal.text.trim() : null;
        descRows.push({ attempt_id: _qzAttemptId, question_id: q.id, answer_text: text });
      } else {
        const selId = (answerVal !== null && answerVal !== undefined
          && typeof answerVal !== 'object') ? parseInt(answerVal) : null;
        mcqRows.push({ attempt_id: _qzAttemptId, question_id: q.id, selected_option_id: selId });
      }
    });

    // ── Step 1: MCQ + True/False via RPC with fallback
    if (mcqRows.length > 0) {
      let rpcOk = false;
      try {
        const rpcRes = await _fetchWithTimeout(
          `${SUPABASE_URL}/rest/v1/rpc/${QZ_RPC_BULK_ANSWERS}`,
          { method: 'POST', headers: QZ_HDRS(), body: JSON.stringify({ payload: mcqRows }) }
        );
        rpcOk = rpcRes.ok || rpcRes.status === 204;
        if (!rpcOk) {
          const rb = await rpcRes.text().catch(() => '');
        }
      } catch(rpcErr) {
      }

      if (!rpcOk) {
        const insRes = await _fetchWithTimeout(
          `${SUPABASE_URL}/rest/v1/answers`,
          { method: 'POST', headers: QZ_HDRS_MINIMAL(), body: JSON.stringify(mcqRows) }
        );
        if (!insRes.ok) {
          const errTxt = await insRes.text().catch(() => String(insRes.status));
          throw new Error(`MCQ answers failed (${insRes.status}): ${errTxt}`);
        }
      }
    }

    // ── Step 2: Descriptive answers
    if (descRows.length > 0) {
      const dRes = await _fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/answers`,
        { method: 'POST', headers: QZ_HDRS_MINIMAL(), body: JSON.stringify(descRows) }
      );
      if (!dRes.ok) {
        const errTxt = await dRes.text().catch(() => String(dRes.status));
        throw new Error(`Descriptive answers failed (${dRes.status}): ${errTxt}`);
      }
    }

    // ── Step 3: Calculate correct MCQ score from local state (don't rely on DB trigger marks)
    let mcqScore = 0;
    let totalMarks = 0;
    _qzQuestions.forEach(q => {
      const qType = (q.question_type || 'mcq').toLowerCase();
      const qMarks = q.marks || 1;
      totalMarks += qMarks;
      if (qType === 'descriptive') return; // descriptive = 0 until manually graded
      const selId  = _qzAnswers[q.id];
      const corrOpt = (q.options || []).find(o => o.is_correct);
      if (selId && corrOpt && parseInt(selId) === corrOpt.id) {
        mcqScore += qMarks; // award full question marks for correct answer
      }
    });

    // Patch submitted_at + correct score + total_marks all in one call
    await _fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/quiz_attempts?id=eq.${_qzAttemptId}`,
      { method: 'PATCH', headers: QZ_HDRS_MINIMAL(), body: JSON.stringify({
          submitted_at: new Date().toISOString(),
          score:        mcqScore,
          total_marks:  totalMarks
        })
      }
    );

    // ── Step 4: Show result using our calculated score (no need to wait for DB)
    const dbScore = mcqScore;
    const dbTotal = totalMarks;

    document.getElementById('quiz-take-overlay').style.display = 'none';
    document.body.style.overflow = '';
    showQuizResult(dbScore, dbTotal, null, _qzQuestions.length);

  } catch(e) {
    const msg = e.name === 'AbortError'
      ? '⏱️ Request timed out. Please check your internet connection and try again.'
      : '⚠️ Error submitting quiz:\n' + e.message;
    alert(msg);
  } finally {
    // ALWAYS re-enable the button so the user is never stuck
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '✅ Submit Quiz'; }
  }
}

function showQuizResult(earned, total, correct, totalQ) {
  const mcqQs  = _qzQuestions.filter(q => (q.question_type||'mcq').toLowerCase() !== 'descriptive');
  const descQs = _qzQuestions.filter(q => (q.question_type||'mcq').toLowerCase() === 'descriptive');

  // Use total quiz marks (all questions) as denominator so score is out of full quiz
  // `total` comes from the patched total_marks on the attempt (sum of all question marks)
  // `earned` = MCQ marks earned (descriptive = 0 until MIS grades)
  const fullTotal    = total > 0 ? total : _qzQuestions.reduce((s,q) => s+(q.marks||1), 0);
  const pct          = fullTotal > 0 ? Math.round((earned / fullTotal) * 100) : 0;
  const passing      = _qzCurrentQuiz?.passing_score || 60;
  const passingMarks = fullTotal > 0 ? Math.ceil((passing / 100) * fullTotal) : null;
  const passed       = pct >= passing;

  // Count correct MCQ/TF from local state (for display only)
  let correctCount = 0;
  mcqQs.forEach(q => {
    const selId   = _qzAnswers[q.id];
    const corrOpt = (q.options || []).find(o => o.is_correct);
    if (selId && corrOpt && selId == corrOpt.id) correctCount++;
  });
  const wrongCount = mcqQs.length - correctCount;

  document.getElementById('qr-emoji').style.display = 'none';
  const banner = document.getElementById('qr-result-banner');
  if (descQs.length > 0) {
    banner.textContent = '📋 Submitted — Grading in Progress';
    banner.style.cssText = 'display:inline-block;padding:8px 24px;border-radius:30px;font-size:0.85rem;font-weight:800;letter-spacing:0.04em;margin-bottom:12px;background:rgba(240,165,0,0.12);color:#f0a500;border:1.5px solid rgba(240,165,0,0.35);';
  } else if (passed) {
    banner.textContent = '✅ Quiz Submitted Successfully';
    banner.style.cssText = 'display:inline-block;padding:8px 24px;border-radius:30px;font-size:0.85rem;font-weight:800;letter-spacing:0.04em;margin-bottom:12px;background:rgba(34,197,94,0.12);color:#22c55e;border:1.5px solid rgba(34,197,94,0.35);';
  } else {
    banner.textContent = '📝 Quiz Submitted Successfully';
    banner.style.cssText = 'display:inline-block;padding:8px 24px;border-radius:30px;font-size:0.85rem;font-weight:800;letter-spacing:0.04em;margin-bottom:12px;background:rgba(168,85,247,0.1);color:#a855f7;border:1.5px solid rgba(168,85,247,0.3);';
  }
  document.getElementById('qr-title').textContent = passed && !descQs.length ? 'Excellent! You Passed!' : 'Quiz Completed';
  const subEl = document.getElementById('qt-quiz-sub');
  const attMatch = subEl ? (subEl.textContent.match(/Attempt #(\d+)/) || []) : [];
  const attNumStr = attMatch[1] ? ` · Attempt #${attMatch[1]}` : '';
  document.getElementById('qr-subtitle').textContent = `${_qzCurrentQuiz?.title || 'Quiz'}${attNumStr} · ${passed ? '🎉 You cleared the passing score!' : `Need ${passingMarks ?? passing+'%'} marks to pass`}`;
  document.getElementById('qr-score-pct').textContent = pct + '%';
  document.getElementById('qr-score-pct').style.color = passed ? '#22c55e' : (descQs.length > 0 ? '#f0a500' : '#ef4444');
  const ptsEl = document.getElementById('qr-score-pts');
  if (ptsEl) ptsEl.textContent = `${earned}/${fullTotal} pts${descQs.length > 0 ? ' (partial)' : ''}`;
  document.getElementById('qr-correct').textContent   = correctCount;
  document.getElementById('qr-wrong').textContent     = wrongCount;

  const badge = document.getElementById('qr-badge');
  if (descQs.length > 0) {
    // Has descriptive — score is partial, show pending note
    badge.textContent = '⏳ Partial Score';
    badge.style.cssText = 'display:inline-block;padding:8px 28px;border-radius:30px;background:rgba(240,165,0,0.12);color:#f0a500;border:2px solid rgba(240,165,0,0.35);font-size:0.9rem;font-weight:800;margin-bottom:8px;letter-spacing:0.05em;';
    // Inject descriptive pending note below badge
    const noteId = 'qr-desc-pending-note';
    let noteEl = document.getElementById(noteId);
    if (!noteEl) {
      noteEl = document.createElement('div');
      noteEl.id = noteId;
      badge.parentNode.insertBefore(noteEl, badge.nextSibling);
    }
    noteEl.style.cssText = 'font-size:0.8rem;color:#f0a500;background:rgba(240,165,0,0.08);border:1px solid rgba(240,165,0,0.25);border-radius:9px;padding:8px 14px;margin-bottom:20px;text-align:center;';
    noteEl.innerHTML = `📝 ${descQs.length} descriptive question${descQs.length>1?'s':''} pending manual review by MIS.<br>Your final score will be updated after grading.`;
  } else {
    const noteEl = document.getElementById('qr-desc-pending-note');
    if (noteEl) noteEl.style.display = 'none';
    if (passed) {
      badge.textContent = '✅ PASSED';
      badge.style.cssText = 'display:inline-block;padding:8px 28px;border-radius:30px;background:rgba(34,197,94,0.15);color:#22c55e;border:2px solid rgba(34,197,94,0.4);font-size:0.9rem;font-weight:800;margin-bottom:24px;letter-spacing:0.05em;';
    } else {
      badge.textContent = '❌ FAILED';
      badge.style.cssText = 'display:inline-block;padding:8px 28px;border-radius:30px;background:rgba(239,68,68,0.12);color:#ef4444;border:2px solid rgba(239,68,68,0.35);font-size:0.9rem;font-weight:800;margin-bottom:24px;letter-spacing:0.05em;';
    }
  }

  // Answer review
  const reviewEl = document.getElementById('qr-review-list');
  reviewEl.innerHTML = _qzQuestions.map((q, i) => {
    const qType     = (q.question_type || 'mcq').toLowerCase();
    const answerVal = _qzAnswers[q.id];

    if (qType === 'true_false') {
      // ── True/False review ──
      const selId   = (typeof answerVal === 'number' || typeof answerVal === 'string') ? parseInt(answerVal) : null;
      const corrOpt = (q.options || []).find(o => o.is_correct);
      const selOpt  = (q.options || []).find(o => o.id == selId);
      const isOk    = !!(selId && corrOpt && selId == corrOpt.id);
      return `
        <div style="padding:12px 14px;border-radius:10px;background:var(--surface2);border-left:3px solid ${isOk?'#22c55e':'#ef4444'};">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
            <span style="font-size:0.72rem;padding:2px 8px;border-radius:20px;background:rgba(34,197,94,0.1);color:#22c55e;font-weight:700;">🔘 True/False</span>
          </div>
          <div style="font-size:0.82rem;font-weight:700;color:var(--text);margin-bottom:6px;">${i+1}. ${q.question_text}</div>
          <div style="font-size:0.78rem;margin-bottom:3px;">
            <span style="color:var(--muted);">Your answer: </span>
            <span style="color:${isOk?'#22c55e':'#ef4444'};font-weight:600;">${selOpt ? selOpt.option_text : '(not answered)'}</span>
          </div>
          ${!isOk && corrOpt ? `<div style="font-size:0.78rem;"><span style="color:var(--muted);">Correct: </span><span style="color:#22c55e;font-weight:600;">${corrOpt.option_text}</span></div>` : ''}
        </div>`;

    } else if (qType === 'descriptive') {
      // ── Descriptive review ──
      const text = (typeof answerVal === 'object' && answerVal?.text) ? answerVal.text : '(not answered)';
      return `
        <div style="padding:12px 14px;border-radius:10px;background:var(--surface2);border-left:3px solid #f0a500;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="font-size:0.75rem;padding:2px 8px;border-radius:20px;background:rgba(240,165,0,0.12);color:#f0a500;font-weight:700;">✏️ Descriptive</span>
          </div>
          <div style="font-size:0.82rem;font-weight:700;color:var(--text);margin-bottom:6px;">${i+1}. ${q.question_text}</div>
          <div style="font-size:0.79rem;color:var(--text2);background:var(--surface);padding:9px 11px;border-radius:8px;line-height:1.6;border:1px solid var(--border);">${text}</div>
          <div style="font-size:0.72rem;color:var(--muted);margin-top:5px;">📋 Admin will review this answer manually.</div>
        </div>`;

    } else {
      // ── MCQ review ──
      const selectedId  = (typeof answerVal === 'number' || typeof answerVal === 'string') ? parseInt(answerVal) : null;
      const correctOpt  = (q.options || []).find(o => o.is_correct);
      const selectedOpt = (q.options || []).find(o => o.id == selectedId);
      const isCorrect   = !!(selectedId && correctOpt && selectedId == correctOpt.id);
      return `
        <div style="padding:12px 14px;border-radius:10px;background:var(--surface2);border-left:3px solid ${isCorrect?'#22c55e':'#ef4444'};">
          <div style="font-size:0.82rem;font-weight:700;color:var(--text);margin-bottom:6px;">${i+1}. ${q.question_text}</div>
          <div style="font-size:0.78rem;margin-bottom:3px;">
            <span style="color:var(--muted);">Your answer: </span>
            <span style="color:${isCorrect?'#22c55e':'#ef4444'};font-weight:600;">${selectedOpt ? selectedOpt.option_text : '(not answered)'}</span>
          </div>
          ${!isCorrect && correctOpt ? `<div style="font-size:0.78rem;"><span style="color:var(--muted);">Correct: </span><span style="color:#22c55e;font-weight:600;">${correctOpt.option_text}</span></div>` : ''}
        </div>`;
    }
  }).join('');

  document.getElementById('quiz-result-overlay').style.display = 'block';
}

function closeQuizResult() {
  document.getElementById('quiz-result-overlay').style.display = 'none';
  _qzCurrentQuiz = null; _qzQuestions = []; _qzAttemptId = null;
}

function retakeQuiz() {
  document.getElementById('quiz-result-overlay').style.display = 'none';
  if (_qzRetakeId) startDBQuiz(_qzRetakeId);
}

function confirmQuitQuiz() {
  if (confirm('Are you sure you want to quit this quiz? Your progress will be lost.')) {
    clearInterval(_qzTimerInterval);
    document.getElementById('quiz-take-overlay').style.display = 'none';
    document.body.style.overflow = '';
    _qzCurrentQuiz = null; _qzQuestions = []; _qzAnswers = {};
  }
}

// ══════════════════════════════════════════════════════════════
// MY RESULTS
// ══════════════════════════════════════════════════════════════
let _mqrAllRows = [];

async function openMyQuizResults(nodeId) {
  const overlay = document.getElementById('my-quiz-results-overlay');
  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden';
  const loadEl      = document.getElementById('mqr-loading');
  const listEl      = document.getElementById('mqr-list');
  const emptyEl     = document.getElementById('mqr-empty');
  const statsEl     = document.getElementById('mqr-stats');
  const filterEl    = document.getElementById('mqr-quiz-filter');
  const nameFilterEl= document.getElementById('mqr-name-filter');

  loadEl.style.display = 'block'; listEl.innerHTML = ''; emptyEl.style.display = 'none';
  if (statsEl) statsEl.style.display = 'none';

  const isMIS = _canUploadQuiz();
  const titleEl = document.querySelector('#my-quiz-results-overlay .mqr-title');
  const subEl   = document.querySelector('#my-quiz-results-overlay .mqr-sub');
  if (titleEl) titleEl.textContent = isMIS ? 'All Quiz Results' : 'My Quiz Results';
  if (subEl)   subEl.textContent   = isMIS ? 'All employees quiz attempts and performance' : 'Your quiz attempts and performance';

  // ── Name filter: MIS ke liye turant dikhao (data aane se pehle bhi) ──
  if (nameFilterEl) {
    nameFilterEl.style.display = isMIS ? 'block' : 'none';
    nameFilterEl.innerHTML = '<option value="">👤 All Employees</option>';
    nameFilterEl.value = '';
  }
  if (filterEl) {
    filterEl.innerHTML = '<option value="">📝 All Quizzes</option>';
    filterEl.value = '';
  }

  try {
    let empFilter = '';
    if (!isMIS) {
      if (_qzEmpId) {
        empFilter = `&employee_id=eq.${_qzEmpId}`;
      } else if (CURRENT_USER?.email) {
        const eRes = await fetch(`${SUPABASE_URL}/rest/v1/Employee_details?select=Emp_id&Email_Id=ilike.${encodeURIComponent(CURRENT_USER.email)}&limit=1`, { headers: QZ_HDRS() });
        const eArr = await eRes.json();
        if (eArr.length) { _qzEmpId = eArr[0].Emp_id; empFilter = `&employee_id=eq.${_qzEmpId}`; }
      }
      // SAFETY GUARD: agar non-MIS user ka emp_id nahi mila toh
      // kisi aur ka data dikhne se rokne ke liye empty result return karo
      if (!empFilter) {
        loadEl.style.display = 'none';
        emptyEl.style.display = 'block';
        _mqrAllRows = [];
        return;
      }
    }
    const empSelect = isMIS ? ',Employee_details(Employee_name,Employee_Dept)' : '';
    const url = `${SUPABASE_URL}/rest/v1/quiz_attempts?select=id,quiz_id,employee_id,attempt_number,score,total_marks,started_at,submitted_at,quizzes(id,title,passing_score)${empSelect}${empFilter}&order=id.desc&limit=200`;
    const res  = await fetch(url, { headers: QZ_HDRS() });
    _mqrAllRows = await res.json();
    loadEl.style.display = 'none';

    // ── Quiz filter populate ──
    if (filterEl) {
      const quizMap = {};
      _mqrAllRows.forEach(r => { if (r.quizzes?.id) quizMap[r.quizzes.id] = r.quizzes.title; });
      filterEl.innerHTML = '<option value="">📝 All Quizzes</option>' +
        Object.entries(quizMap).map(([id, title]) => `<option value="${id}">${title}</option>`).join('');
    }

    // ── Name filter populate (MIS only) — data aane ke baad names fill karo ──
    if (isMIS && nameFilterEl && _mqrAllRows.length) {
      const nameSet = new Set();
      _mqrAllRows.forEach(r => {
        const n = r.Employee_details?.Employee_name;
        if (n) nameSet.add(n);
      });
      const sortedNames = [...nameSet].sort((a, b) => a.localeCompare(b));
      nameFilterEl.innerHTML = '<option value="">👤 All Employees</option>' +
        sortedNames.map(n => `<option value="${n}">${n}</option>`).join('');
    }

    if (!_mqrAllRows.length) { emptyEl.style.display = 'block'; return; }

    mqrRenderStats(_mqrAllRows);
    mqrRenderList(_mqrAllRows);
  } catch(e) {
    loadEl.style.display = 'none';
    listEl.innerHTML = `<div style="color:#ef4444;text-align:center;padding:20px;">Error: ${e.message}</div>`;
  }
}

function mqrApplyFilter() {
  const quizVal = document.getElementById('mqr-quiz-filter')?.value || '';
  const nameVal = document.getElementById('mqr-name-filter')?.value || '';
  let filtered = _mqrAllRows;
  if (quizVal) filtered = filtered.filter(r => String(r.quizzes?.id) === quizVal);
  if (nameVal) filtered = filtered.filter(r => (r.Employee_details?.Employee_name || '') === nameVal);
  mqrRenderStats(filtered);
  mqrRenderList(filtered);
}

function mqrClearFilters() {
  const qf = document.getElementById('mqr-quiz-filter');
  const nf = document.getElementById('mqr-name-filter');
  if (qf) qf.value = '';
  if (nf) nf.value = '';
  mqrRenderStats(_mqrAllRows);
  mqrRenderList(_mqrAllRows);
}

function mqrRenderStats(rows) {
  const statsEl = document.getElementById('mqr-stats');
  if (!statsEl) return;
  const sub     = rows.filter(r => r.submitted_at);
  const pending = sub.filter(r => (r.score??0) < (r.total_marks??0) && r.total_marks > 0);
  const passed  = sub.filter(r => {
    if ((r.score??0) < (r.total_marks??0) && r.total_marks > 0) return false;
    return r.total_marks>0 ? Math.round((r.score/r.total_marks)*100) >= (r.quizzes?.passing_score||60) : false;
  });
  const failed  = sub.filter(r => {
    if ((r.score??0) < (r.total_marks??0) && r.total_marks > 0) return false;
    return r.total_marks>0 ? Math.round((r.score/r.total_marks)*100) < (r.quizzes?.passing_score||60) : false;
  });
  const cards = [
    { label:'Total Attempts', value:rows.length,   icon:'📋', color:'#4e9af1', bg:'rgba(78,154,241,0.1)',  border:'rgba(78,154,241,0.25)' },
    { label:'Passed',         value:passed.length,  icon:'✅', color:'#22c55e', bg:'rgba(34,197,94,0.1)',   border:'rgba(34,197,94,0.25)'  },
    { label:'Failed',         value:failed.length,  icon:'❌', color:'#ef4444', bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.2)'   },
    { label:'Pending',        value:pending.length, icon:'⏳', color:'#f97316', bg:'rgba(249,115,22,0.08)', border:'rgba(249,115,22,0.2)'  },
  ];
  statsEl.innerHTML = cards.map(c =>
    `<div style="background:${c.bg};border:1px solid ${c.border};border-radius:12px;padding:14px 16px;text-align:center;">
      <div style="font-size:1.3rem;margin-bottom:4px;">${c.icon}</div>
      <div style="font-size:1.7rem;font-weight:900;color:${c.color};line-height:1;">${c.value}</div>
      <div style="font-size:0.69rem;color:var(--muted);font-weight:600;margin-top:5px;text-transform:uppercase;letter-spacing:0.05em;">${c.label}</div>
    </div>`).join('');
  statsEl.style.display = 'grid';
}

function mqrRenderList(rows) {
  const listEl  = document.getElementById('mqr-list');
  const emptyEl = document.getElementById('mqr-empty');
  listEl.innerHTML = '';
  if (!rows.length) { emptyEl.style.display = 'block'; return; }
  emptyEl.style.display = 'none';
  const isMIS = _canUploadQuiz();
  listEl.innerHTML = rows.map(r => {
    const pct       = r.total_marks>0 ? Math.round((r.score/r.total_marks)*100) : 0;
    const passScore = r.quizzes?.passing_score || 60;
    const inProg    = !r.submitted_at;
    const isPending = !inProg && (r.score??0) < (r.total_marks??0) && r.total_marks > 0;
    const passed    = !inProg && !isPending && pct >= passScore;
    const borderCol = inProg?'#f0a500':isPending?'#f97316':passed?'#22c55e':'#ef4444';
    const statusBg  = inProg?'rgba(240,165,0,0.1)':isPending?'rgba(249,115,22,0.1)':passed?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.08)';
    const statusTxt = inProg?'🔄 In Progress':isPending?'⏳ Pending':passed?'✅ Pass':'❌ Fail';
    const date = r.submitted_at
      ? new Date(r.submitted_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
      : r.started_at ? new Date(r.started_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';
    const empRow = isMIS && r.Employee_details?.Employee_name
      ? `<div style="font-size:0.7rem;color:#a855f7;font-weight:700;margin-bottom:3px;">👤 ${r.Employee_details.Employee_name}${r.Employee_details?.Employee_Dept?' · '+r.Employee_details.Employee_Dept:''}</div>`
      : '';
    return `
      <div style="border-radius:12px;border:1px solid var(--border);border-left:3px solid ${borderCol};background:var(--surface2);overflow:hidden;">
        <div onclick="mqrToggleDetail(${r.id})" style="display:flex;align-items:center;gap:12px;padding:13px 16px;cursor:pointer;transition:background 0.15s;flex-wrap:wrap;"
          onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background=''">
          <div style="flex:1;min-width:150px;">
            ${empRow}
            <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:2px;">
              <span style="font-size:0.87rem;font-weight:700;color:var(--text);">${r.quizzes?.title||'Quiz'}</span>
              <span style="font-size:0.67rem;padding:1px 7px;border-radius:10px;background:rgba(168,85,247,0.12);color:#a855f7;font-weight:700;border:1px solid rgba(168,85,247,0.2);white-space:nowrap;">Attempt #${r.attempt_number||1}</span>
            </div>
            <div style="font-size:0.71rem;color:var(--muted);">📅 ${date}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:1.1rem;font-weight:900;color:${borderCol};">${inProg?'—':pct+'%'}</div>
            <div style="font-size:0.67rem;color:var(--muted);">${r.score??0}/${r.total_marks??0} pts</div>
          </div>
          <div style="font-size:0.74rem;font-weight:800;padding:4px 12px;border-radius:20px;background:${statusBg};color:${borderCol};">${statusTxt}</div>
          <span id="mqr-chevron-${r.id}" style="font-size:0.72rem;color:var(--muted);transition:transform 0.2s;">▼</span>
        </div>
        <div id="mqr-detail-${r.id}" style="display:none;border-top:1px solid var(--border);padding:14px 16px;background:var(--surface);">
          <div id="mqr-detail-content-${r.id}">
            <div style="text-align:center;padding:14px;color:var(--muted);font-size:0.82rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite;display:block;margin:0 auto 6px;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Loading…
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

async function mqrToggleDetail(attemptId) {
  const panel = document.getElementById(`mqr-detail-${attemptId}`);
  const chev  = document.getElementById(`mqr-chevron-${attemptId}`);
  if (!panel) return;
  const open = panel.style.display === 'block';
  panel.style.display = open ? 'none' : 'block';
  if (chev) chev.style.transform = open ? '' : 'rotate(180deg)';
  if (!open) await mqrLoadAnswers(attemptId);
}

async function mqrLoadAnswers(attemptId) {
  const container = document.getElementById(`mqr-detail-content-${attemptId}`);
  if (!container) return;
  try {
    const ansRes = await fetch(
      `${SUPABASE_URL}/rest/v1/answers?select=id,answer_text,marks_awarded,selected_option_id,questions(id,question_text,question_type,marks,correct_answer_text),options!answers_selected_option_id_fkey(option_text,is_correct)&attempt_id=eq.${attemptId}&order=id.asc`,
      { headers: QZ_HDRS() }
    );
    const answers = await ansRes.json();
    if (!answers.length) { container.innerHTML = '<div style="text-align:center;padding:14px;color:var(--muted);font-size:0.82rem;">No answers recorded.</div>'; return; }

    const qIds = [...new Set(answers.map(a => a.questions?.id).filter(Boolean))];
    let allOpts = [];
    if (qIds.length) {
      const or = await fetch(`${SUPABASE_URL}/rest/v1/options?select=id,question_id,option_text,is_correct&question_id=in.(${qIds.join(',')})`, { headers: QZ_HDRS() });
      allOpts = await or.json();
    }

    let html = `<div style="font-size:0.73rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:10px;">Your Answers</div>`;
    answers.forEach((ans, idx) => {
      const qType  = (ans.questions?.question_type || 'mcq').toLowerCase();
      const qText  = ans.questions?.question_text || `Q${idx+1}`;
      const qMarks = ans.questions?.marks || 1;
      const qId    = ans.questions?.id;
      const selOptId = ans.selected_option_id;
      const selOpt   = ans.options;
      const isRight  = selOpt?.is_correct === true;
      const opts     = allOpts.filter(o => o.question_id === qId);
      const modelAns = ans.questions?.correct_answer_text || '';

      const badge = qType==='descriptive'
        ? `<span style="font-size:0.63rem;padding:1px 6px;border-radius:6px;background:rgba(240,165,0,0.12);color:#f0a500;font-weight:700;">✏️ Descriptive</span>`
        : qType==='true_false'
        ? `<span style="font-size:0.63rem;padding:1px 6px;border-radius:6px;background:rgba(34,197,94,0.12);color:#22c55e;font-weight:700;">🔘 T/F</span>`
        : `<span style="font-size:0.63rem;padding:1px 6px;border-radius:6px;background:rgba(168,85,247,0.12);color:#a855f7;font-weight:700;">☑ MCQ</span>`;

      if (qType === 'descriptive') {
        const awarded = ans.marks_awarded != null ? `${ans.marks_awarded}/${qMarks}` : `Pending/${qMarks}`;
        const aColor  = ans.marks_awarded != null ? '#22c55e' : '#f97316';
        html += `<div style="margin-bottom:9px;padding:11px 13px;border-radius:10px;background:var(--surface2);border:1px solid rgba(240,165,0,0.18);">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;"><span style="font-size:0.74rem;color:var(--muted);font-weight:700;">Q${idx+1}</span>${badge}<span style="margin-left:auto;font-size:0.7rem;color:${aColor};font-weight:700;">${awarded} marks</span></div>
          <div style="font-size:0.81rem;font-weight:700;color:var(--text);margin-bottom:5px;">${qText}</div>
          <div style="font-size:0.78rem;color:var(--text2);background:var(--surface);padding:7px 10px;border-radius:7px;border:1px solid var(--border);line-height:1.55;">
            <span style="font-weight:700;color:#00d4aa;">Your answer: </span>${ans.answer_text || '<em style="color:var(--muted)">Not answered</em>'}
          </div>
          ${modelAns?`<div style="font-size:0.73rem;color:var(--muted);margin-top:5px;"><span style="font-weight:700;color:#a855f7;">Model: </span>${modelAns}</div>`:''}
        </div>`;
      } else {
        const earnedMks = isRight ? qMarks : 0;
        const sCol = !selOptId?'var(--muted)':isRight?'#22c55e':'#ef4444';
        html += `<div style="margin-bottom:9px;padding:11px 13px;border-radius:10px;background:var(--surface2);border:1px solid ${isRight?'rgba(34,197,94,0.2)':selOptId?'rgba(239,68,68,0.15)':'var(--border)'};">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;"><span style="font-size:0.74rem;color:var(--muted);font-weight:700;">Q${idx+1}</span>${badge}<span style="margin-left:auto;font-size:0.7rem;color:${sCol};font-weight:700;">${isRight?'✅':'❌'} ${earnedMks}/${qMarks}</span></div>
          <div style="font-size:0.81rem;font-weight:700;color:var(--text);margin-bottom:7px;">${qText}</div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${opts.map(o => {
              const isSel=o.id===selOptId,isCorr=o.is_correct;
              let bg='var(--surface)',bdr='var(--border)',tc='var(--text2)';
              if(isSel&&isCorr){bg='rgba(34,197,94,0.1)';bdr='rgba(34,197,94,0.4)';tc='#22c55e';}
              if(isSel&&!isCorr){bg='rgba(239,68,68,0.07)';bdr='rgba(239,68,68,0.35)';tc='#ef4444';}
              if(!isSel&&isCorr){bg='rgba(34,197,94,0.05)';bdr='rgba(34,197,94,0.2)';tc='#22c55e';}
              return `<div style="padding:5px 10px;border-radius:7px;border:1px solid ${bdr};background:${bg};font-size:0.77rem;color:${tc};display:flex;align-items:center;gap:7px;"><span>${isSel?'●':'○'}</span><span style="flex:1;">${o.option_text}</span>${isSel&&isCorr?'<span style="font-weight:700;font-size:0.7rem;">✓</span>':''}${isSel&&!isCorr?'<span style="font-weight:700;font-size:0.7rem;">✗</span>':''}${!isSel&&isCorr?'<span style="font-size:0.67rem;">← Correct</span>':''}</div>`;
            }).join('')}
          </div>
        </div>`;
      }
    });
    container.innerHTML = html;
  } catch(e) {
    container.innerHTML = `<div style="color:#ef4444;padding:12px;font-size:0.8rem;">⚠️ ${e.message}</div>`;
  }
}



// ══════════════════════════════════════════════════════════════
// ADMIN: QUIZ MANAGEMENT
// ══════════════════════════════════════════════════════════════
async function openQuizAdmin() {
  if (!_canUploadQuiz()) {
    alert('⛔ ⛔ Access denied. Quiz management is restricted.');
    return;
  }
  _qaQuestions   = [];
  _editingQuizId = null;
  document.getElementById('quiz-admin-overlay').style.display = 'block';
  document.body.style.overflow = 'hidden';
  document.getElementById('qa-questions-list').innerHTML = '';
  document.getElementById('qa-no-questions').style.display = 'block';
  document.getElementById('qa-save-status').style.display = 'none';
  document.getElementById('qa-save-btn').textContent = '💾 Save Quiz';
  document.getElementById('qa-title').value = '';
  document.getElementById('qa-desc').value  = '';
  switchQuizAdminTab('create');

  // Load training modules into select
  await populateNodeSelect();
}

async function populateNodeSelect() {
  const sel = document.getElementById('qa-node');
  sel.innerHTML = '<option value="">— Select Training Module —</option>';
  try {
    await CN.load();
    const section = CN.getSection('Training');
    if (section) {
      const cats = CN.getCategories(section.id);
      cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id; opt.textContent = c.name;
        sel.appendChild(opt);
      });
    }
    // Also add quizzes node if no categories
    if (sel.options.length === 1) {
      const nodes = await fetch(`${SUPABASE_URL}/rest/v1/content_nodes?select=id,name&type=eq.section&order=name.asc`, { headers: QZ_HDRS() }).then(r=>r.json());
      nodes.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n.id; opt.textContent = n.name;
        sel.appendChild(opt);
      });
    }
  } catch(e) { }
}

function closeQuizAdmin() {
  document.getElementById('quiz-admin-overlay').style.display = 'none';
  document.body.style.overflow = '';
}

function switchQuizAdminTab(tab) {
  ['create','manage'].forEach(t => {
    document.getElementById(`qa-panel-${t}`).style.display = tab === t ? 'block' : 'none';
    document.getElementById(`qa-tab-${t}`).style.borderBottomColor = tab === t ? '#a855f7' : 'transparent';
    document.getElementById(`qa-tab-${t}`).style.color             = tab === t ? '#a855f7' : 'var(--muted)';
    document.getElementById(`qa-tab-${t}`).style.fontWeight        = tab === t ? '700' : '600';
  });
  if (tab === 'manage') loadAdminQuizList();
}

function addQuizQuestion() {
  const idx = _qaQuestions.length;
  _qaQuestions.push({
    text: '', marks: 1,
    type: 'mcq',
    correct_answer_text: '',
    tf_correct: 'true',
    options: [
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false }
    ]
  });
  document.getElementById('qa-no-questions').style.display = 'none';
  renderAdminQuestions();
  setTimeout(() => {
    const el = document.getElementById(`qa-q-${idx}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 50);
}

function changeQuestionType(idx, newType) {
  _qaQuestions[idx].type = newType;
  // NOTE: marks are intentionally NOT reset here — they stay as whatever the creator set.
  // Type change should never override the user's marks.
  if (newType === 'true_false') {
    _qaQuestions[idx].options = [
      { text: 'True',  is_correct: _qaQuestions[idx].tf_correct === 'true' },
      { text: 'False', is_correct: _qaQuestions[idx].tf_correct === 'false' }
    ];
  } else if (newType === 'mcq' && _qaQuestions[idx].options.length < 4) {
    _qaQuestions[idx].options = [
      { text: '', is_correct: false }, { text: '', is_correct: false },
      { text: '', is_correct: false }, { text: '', is_correct: false }
    ];
  }
  renderAdminQuestions();
}

function setTFCorrect(idx, which) {
  _qaQuestions[idx].tf_correct = which;
  _qaQuestions[idx].options = [
    { text: 'True',  is_correct: which === 'true'  },
    { text: 'False', is_correct: which === 'false' }
  ];
  renderAdminQuestions();
}

function removeQuizQuestion(idx) {
  _qaQuestions.splice(idx, 1);
  if (_qaQuestions.length === 0) document.getElementById('qa-no-questions').style.display = 'block';
  renderAdminQuestions();
}

function renderAdminQuestions() {
  const container = document.getElementById('qa-questions-list');
  container.innerHTML = _qaQuestions.map((q, idx) => {
    const qType = (q.type || 'mcq').toLowerCase();
    const isMCQ = qType === 'mcq';
    const isTF  = qType === 'true_false';
    const isDesc = qType === 'descriptive';
    return `
    <div id="qa-q-${idx}" style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px;border-left:3px solid ${qType==='mcq'?'#a855f7':qType==='true_false'?'#22c55e':'#f0a500'};">
      <!-- Row 1: number, question text, marks, delete -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <div style="width:24px;height:24px;border-radius:7px;background:${qType==='mcq'?'#a855f722':qType==='true_false'?'#22c55e22':'#f0a50022'};color:${qType==='mcq'?'#a855f7':qType==='true_false'?'#22c55e':'#f0a500'};font-size:0.75rem;font-weight:800;display:flex;align-items:center;justify-content:center;">${idx+1}</div>
        <input oninput="_qaQuestions[${idx}].text=this.value" value="${q.text.replace(/"/g,'&quot;')}" placeholder="Question text *" style="flex:1;padding:7px 11px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:0.86rem;font-family:inherit;outline:none;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0;">
          <span style="font-size:0.62rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;">Marks</span>
          <input oninput="_qaQuestions[${idx}].marks=Math.max(1,parseFloat(this.value)||1)" type="number" value="${q.marks}" min="1" step="1" title="Marks for this question (no upper limit)" style="width:65px;padding:6px 9px;border-radius:8px;border:1.5px solid rgba(240,165,0,0.4);background:var(--surface);color:#f0a500;font-size:0.9rem;font-weight:700;font-family:inherit;outline:none;text-align:center;">
        </div>
        <button onclick="removeQuizQuestion(${idx})" style="width:28px;height:28px;border-radius:8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#ef4444;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;justify-content:center;">✕</button>
      </div>
      <!-- Row 2: Question type selector -->
      <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;">
        <button onclick="changeQuestionType(${idx},'mcq')" style="padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;cursor:pointer;font-family:inherit;border:1.5px solid ${qType==='mcq'?'#a855f7':'var(--border)'};background:${qType==='mcq'?'rgba(168,85,247,0.12)':'transparent'};color:${qType==='mcq'?'#a855f7':'var(--muted)'};">
          ☑ MCQ
        </button>
        <button onclick="changeQuestionType(${idx},'true_false')" style="padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;cursor:pointer;font-family:inherit;border:1.5px solid ${qType==='true_false'?'#22c55e':'var(--border)'};background:${qType==='true_false'?'rgba(34,197,94,0.12)':'transparent'};color:${qType==='true_false'?'#22c55e':'var(--muted)'};">
          🔘 True/False
        </button>
        <button onclick="changeQuestionType(${idx},'descriptive')" style="padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;cursor:pointer;font-family:inherit;border:1.5px solid ${qType==='descriptive'?'#f0a500':'var(--border)'};background:${qType==='descriptive'?'rgba(240,165,0,0.12)':'transparent'};color:${qType==='descriptive'?'#f0a500':'var(--muted)'};">
          ✏️ Descriptive
        </button>
      </div>

      <!-- MCQ or True/False options -->
      ${isMCQ || isTF ? `
        ${isTF ? `
        <!-- True/False: just pick which is correct -->
        <div style="font-size:0.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Select Correct Answer</div>
        <div style="display:flex;gap:10px;">
          <button onclick="setTFCorrect(${idx},'true')" style="flex:1;padding:11px;border-radius:10px;font-size:0.9rem;font-weight:800;cursor:pointer;font-family:inherit;border:2px solid ${(q.tf_correct||'true')==='true'?'#22c55e':'var(--border)'};background:${(q.tf_correct||'true')==='true'?'rgba(34,197,94,0.12)':'var(--surface)'};color:${(q.tf_correct||'true')==='true'?'#22c55e':'var(--muted)'};">
            ✅ TRUE ${(q.tf_correct||'true')==='true'?'← Correct':''}
          </button>
          <button onclick="setTFCorrect(${idx},'false')" style="flex:1;padding:11px;border-radius:10px;font-size:0.9rem;font-weight:800;cursor:pointer;font-family:inherit;border:2px solid ${q.tf_correct==='false'?'#ef4444':'var(--border)'};background:${q.tf_correct==='false'?'rgba(239,68,68,0.1)':'var(--surface)'};color:${q.tf_correct==='false'?'#ef4444':'var(--muted)'};">
            ❌ FALSE ${q.tf_correct==='false'?'← Correct':''}
          </button>
        </div>` : `
        <!-- MCQ: 4 options -->
        <div style="font-size:0.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Options — Select correct answer (radio)</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${q.options.map((opt, oi) => `
            <div style="display:flex;align-items:center;gap:8px;">
              <input type="radio" name="correct-${idx}" ${opt.is_correct?'checked':''} onchange="setCorrectOption(${idx},${oi})" style="width:16px;height:16px;accent-color:#22c55e;flex-shrink:0;cursor:pointer;" title="Mark as correct">
              <input oninput="_qaQuestions[${idx}].options[${oi}].text=this.value" value="${opt.text.replace(/"/g,'&quot;')}" placeholder="Option ${oi+1} *" style="flex:1;padding:7px 11px;border-radius:8px;border:1px solid ${opt.is_correct?'rgba(34,197,94,0.4)':'var(--border)'};background:${opt.is_correct?'rgba(34,197,94,0.06)':'var(--surface)'};color:var(--text);font-size:0.84rem;font-family:inherit;outline:none;transition:all 0.15s;">
              <span style="font-size:0.7rem;color:${opt.is_correct?'#22c55e':'transparent'};">✓ Correct</span>
            </div>`).join('')}
        </div>` }` : `
        <!-- Descriptive: answer textarea for reference -->
        <div style="font-size:0.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Model Answer (for reference / manual review)</div>
        <textarea oninput="_qaQuestions[${idx}].correct_answer_text=this.value" placeholder="Write the expected/model answer here…" rows="3" style="width:100%;padding:9px 12px;border-radius:9px;border:1px solid rgba(240,165,0,0.35);background:rgba(240,165,0,0.05);color:var(--text);font-size:0.84rem;font-family:inherit;outline:none;resize:vertical;">${q.correct_answer_text||''}</textarea>
        <div style="font-size:0.73rem;color:var(--muted);margin-top:4px;">ℹ️ Employee will type their answer. Marked as "Submitted" — admin reviews manually.</div>
      `}
    </div>`;
  }).join('');
}

function setCorrectOption(qIdx, optIdx) {
  _qaQuestions[qIdx].options.forEach((o, i) => o.is_correct = i === optIdx);
  renderAdminQuestions();
}

async function saveQuizToDB() {
  if (!_canUploadQuiz()) {
    alert('⛔ ⛔ Access denied. Only authorised members can save quizzes.');
    return;
  }
  const title    = document.getElementById('qa-title').value.trim();
  const nodeId   = document.getElementById('qa-node').value;
  const passing  = parseInt(document.getElementById('qa-passing').value) || 60;
  const timeLimit= parseInt(document.getElementById('qa-timelimit').value) || 15;
  const desc     = document.getElementById('qa-desc').value.trim();
  const statusEl = document.getElementById('qa-save-status');
  const saveBtn  = document.getElementById('qa-save-btn');

  if (!title)  { alert('Please enter a quiz title'); return; }
  if (!nodeId) { alert('Please select a training module'); return; }
  if (!_qaQuestions.length) { alert('Please add at least one question'); return; }

  // Validate questions
  for (let i = 0; i < _qaQuestions.length; i++) {
    const q = _qaQuestions[i];
    if (!q.text.trim()) { alert(`Question ${i+1}: Please enter question text`); return; }
    const qType = q.type || 'mcq';
    if (qType === 'mcq') {
      const hasCorrect = q.options.some(o => o.is_correct);
      const filledOpts = q.options.filter(o => o.text.trim());
      if (filledOpts.length < 2) { alert(`Question ${i+1} (MCQ): Please fill at least 2 options`); return; }
      if (!hasCorrect) { alert(`Question ${i+1} (MCQ): Please select the correct option (green radio button)`); return; }
    } else if (qType === 'true_false') {
      if (!q.tf_correct) { alert(`Question ${i+1} (True/False): Please select which answer is correct`); return; }
    }
    // Descriptive: no options needed, model answer is optional
  }

  saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
  statusEl.style.display = 'none';

  try {
    // 0. Fetch admin's Emp_id for created_by (bigint column)
    let adminEmpId = _qzEmpId || null;
    if (!adminEmpId && CURRENT_USER?.email) {
      try {
        const eRes = await fetch(
          `${SUPABASE_URL}/rest/v1/Employee_details?select=Emp_id&Email_Id=ilike.${encodeURIComponent(CURRENT_USER.email)}&limit=1`,
          { headers: QZ_HDRS() }
        );
        const eArr = await eRes.json();
        if (eArr.length) { adminEmpId = eArr[0].Emp_id; _qzEmpId = adminEmpId; }
      } catch(e) { }
    }

    // ── Edit mode: PATCH existing quiz | Create mode: POST new quiz ──
    let quizId;
    const quizBody = {
      title, description: desc,
      node_id: parseInt(nodeId),
      passing_score: passing,
      time_limit: timeLimit
    };

    if (_editingQuizId) {
      // UPDATE existing quiz
      await fetch(`${SUPABASE_URL}/rest/v1/quizzes?id=eq.${_editingQuizId}`, {
        method: 'PATCH',
        headers: { ...QZ_HDRS(), 'Prefer': 'return=minimal' },
        body: JSON.stringify(quizBody)
      });
      quizId = _editingQuizId;

      // Purane questions + options delete karo (fresh insert)
      await fetch(`${SUPABASE_URL}/rest/v1/options?question_id=in.(select id from questions where quiz_id=eq.${quizId})`,
        { method: 'DELETE', headers: QZ_HDRS() }).catch(()=>{});
      await fetch(`${SUPABASE_URL}/rest/v1/questions?quiz_id=eq.${quizId}`,
        { method: 'DELETE', headers: QZ_HDRS() });

    } else {
      // CREATE new quiz
      quizBody.is_active = true;
      if (adminEmpId) quizBody.created_by = adminEmpId;

      const qRes = await fetch(`${SUPABASE_URL}/rest/v1/quizzes`, {
        method: 'POST',
        headers: QZ_HDRS_REPR(),
        body: JSON.stringify(quizBody)
      });
      const qArr = await qRes.json();
      quizId = Array.isArray(qArr) ? qArr[0]?.id : qArr?.id;
      if (!quizId) throw new Error('Quiz save failed: ' + JSON.stringify(qArr));
    }

    // 2. Questions + options save karo (same for create & edit)
    for (const q of _qaQuestions) {
      const qType = q.type || 'mcq';
      const qqBody = {
        quiz_id: quizId,
        question_text: q.text.trim(),
        question_type: qType,
        marks: q.marks || 1,
        correct_answer_text: qType === 'descriptive' ? (q.correct_answer_text || null) : null
      };
      if (adminEmpId && !_editingQuizId) qqBody.created_by = adminEmpId;

      const qqRes = await fetch(`${SUPABASE_URL}/rest/v1/questions`, {
        method: 'POST',
        headers: QZ_HDRS_REPR(),
        body: JSON.stringify(qqBody)
      });
      const qqArr = await qqRes.json();
      const qId   = Array.isArray(qqArr) ? qqArr[0]?.id : qqArr?.id;
      if (!qId) throw new Error('Question save failed: ' + JSON.stringify(qqArr));

      // MCQ + True/False: save options | Descriptive: skip
      if (qType === 'mcq') {
        const validOpts = q.options.filter(o => o.text.trim());
        if (validOpts.length) {
          await fetch(`${SUPABASE_URL}/rest/v1/options`, {
            method: 'POST',
            headers: QZ_HDRS_MINIMAL(),
            body: JSON.stringify(validOpts.map(o => ({
              question_id: qId,
              option_text: o.text.trim(),
              is_correct: o.is_correct
            })))
          });
        }
      } else if (qType === 'true_false') {
        const tfOpts = [
          { question_id: qId, option_text: 'True',  is_correct: (q.tf_correct || 'true') === 'true'  },
          { question_id: qId, option_text: 'False', is_correct: (q.tf_correct || 'true') === 'false' }
        ];
        await fetch(`${SUPABASE_URL}/rest/v1/options`, {
          method: 'POST',
          headers: QZ_HDRS_MINIMAL(),
          body: JSON.stringify(tfOpts)
        });
      }
    }

    statusEl.style.display = 'block';
    statusEl.style.color   = '#22c55e';
    statusEl.textContent   = _editingQuizId
      ? `✅ Quiz "${title}" updated with ${_qaQuestions.length} questions!`
      : `✅ Quiz "${title}" saved with ${_qaQuestions.length} questions!`;

    // Reset form + edit state
    _editingQuizId = null;
    _qaQuestions = [];
    document.getElementById('qa-title').value = '';
    document.getElementById('qa-desc').value  = '';
    document.getElementById('qa-questions-list').innerHTML = '';
    document.getElementById('qa-no-questions').style.display = 'block';

    // Reload quiz list in training section
    _quizzesLoaded = false;
    loadTrainingQuizzes();

  } catch(e) {
    statusEl.style.display = 'block';
    statusEl.style.color   = '#ef4444';
    statusEl.textContent   = '❌ Error: ' + e.message;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = _editingQuizId ? '✏️ Update Quiz' : '💾 Save Quiz';
  }
}

// ══════════════════════════════════════════════════════════════
// STANDALONE GRADE OVERLAY — filter tabs + direct attempts list
// ══════════════════════════════════════════════════════════════
let _goAllQuizzes   = [];   // all quiz rows
let _goAllAttempts  = [];   // all attempt rows
let _goAllQuestions = {};   // quizId → questions[]
let _goActiveFilter = null; // null = all, quizId = filtered
let _goActiveNameFilter = null; // null = all, name string = filtered

function openGradeOverlay() {
  if (!_canUploadQuiz()) { alert('⛔ Only authorised MIS members can access grading.'); return; }
  document.getElementById('grade-overlay').style.display = 'block';
  document.body.style.overflow = 'hidden';
  goLoadAll();
}

function closeGradeOverlay() {
  document.getElementById('grade-overlay').style.display = 'none';
  document.body.style.overflow = '';
}

function goGradeRefresh() {
  _goAllQuizzes = []; _goAllAttempts = []; _goAllQuestions = {};
  _goActiveFilter = null; _goActiveNameFilter = null;
  const ns = document.getElementById('go-filter-name');
  const qs = document.getElementById('go-filter-quiz');
  if (ns) ns.value = '';
  if (qs) qs.value = '';
  goLoadAll();
}

async function goLoadAll() {
  const loadEl = document.getElementById('go-list-loading');
  const listEl = document.getElementById('go-list');
  const emptyEl= document.getElementById('go-list-empty');
  const barEl  = document.getElementById('go-filter-bar');
  loadEl.style.display = 'block'; listEl.innerHTML = ''; emptyEl.style.display = 'none';

  try {
    const [qRes, aRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/quizzes?select=id,title,passing_score,content_nodes(name)&order=id.asc`, { headers: QZ_HDRS() }),
      fetch(`${SUPABASE_URL}/rest/v1/quiz_attempts?select=id,quiz_id,attempt_number,score,total_marks,started_at,submitted_at,Employee_details(Employee_name,Employee_Dept)&order=id.desc`, { headers: QZ_HDRS() })
    ]);
    _goAllQuizzes  = await qRes.json();
    _goAllAttempts = await aRes.json();

    // Fetch questions for all quizzes (to know which have descriptive)
    if (_goAllQuizzes.length) {
      const ids = _goAllQuizzes.map(q => q.id).join(',');
      const qqRes = await fetch(
        `${SUPABASE_URL}/rest/v1/questions?select=id,quiz_id,question_type,marks&quiz_id=in.(${ids})`,
        { headers: QZ_HDRS() }
      );
      const allQs = await qqRes.json();
      _goAllQuizzes.forEach(q => { _goAllQuestions[q.id] = allQs.filter(qq => qq.quiz_id === q.id); });
    }

    // Populate Employee dropdown
    const nameSelect = document.getElementById('go-filter-name');
    const quizSelect = document.getElementById('go-filter-quiz');
    if (nameSelect) {
      const names = [...new Set(
        _goAllAttempts.map(a => a.Employee_details?.Employee_name).filter(Boolean)
      )].sort();
      nameSelect.innerHTML = '<option value="">👤 All Employees</option>' +
        names.map(n => `<option value="${n.replace(/"/g,'&quot;')}">${n}</option>`).join('');
    }

    // Populate Quiz dropdown
    if (quizSelect) {
      quizSelect.innerHTML = '<option value="">📝 All Quizzes</option>' +
        _goAllQuizzes.map(q => `<option value="${q.id}">${q.title}</option>`).join('');
    }

    goApplyFilters();

  } catch(e) {
    loadEl.style.display = 'none';
    document.getElementById('go-list').innerHTML = `<div style="color:#ef4444;padding:20px;font-size:0.84rem;">⚠️ ${e.message}</div>`;
  }
}

function goApplyFilters() {
  const nameVal = document.getElementById('go-filter-name')?.value || '';
  const quizVal = document.getElementById('go-filter-quiz')?.value || '';
  _goActiveFilter   = quizVal ? parseInt(quizVal) : null;
  _goActiveNameFilter = nameVal || null;
  goRenderList();
}

async function goRenderList() {
  const loadEl = document.getElementById('go-list-loading');
  const listEl = document.getElementById('go-list');
  const emptyEl= document.getElementById('go-list-empty');
  loadEl.style.display = 'none'; listEl.innerHTML = ''; emptyEl.style.display = 'none';

  let filtered = _goAllAttempts;
  if (_goActiveFilter)     filtered = filtered.filter(a => a.quiz_id === _goActiveFilter);
  if (_goActiveNameFilter) filtered = filtered.filter(a =>
    (a.Employee_details?.Employee_name || '') === _goActiveNameFilter
  );

  if (!filtered.length) { emptyEl.style.display = 'block'; return; }

  // Build quiz lookup
  const quizMap = {};
  _goAllQuizzes.forEach(q => quizMap[q.id] = q);

  const colors = ['#a855f7','#f0a500','#00d4aa','#4e9af1','#f97316','#e879f9','#22c55e'];

  listEl.innerHTML = filtered.map(a => {
    const quiz    = quizMap[a.quiz_id] || {};
    const pass    = quiz.passing_score || 60;
    const qi      = _goAllQuizzes.findIndex(q => q.id === a.quiz_id);
    const col     = colors[qi >= 0 ? qi % colors.length : 0];
    const emp     = a.Employee_details?.Employee_name || 'Employee';
    const dept    = a.Employee_details?.Employee_Dept || '';
    const score   = a.score ?? 0;
    const total   = a.total_marks || 0;
    const pct     = total > 0 ? Math.round((score / total) * 100) : 0;
    const sub     = !!a.submitted_at;
    const ok      = sub && pct >= pass;
    const date    = a.submitted_at
      ? new Date(a.submitted_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})
      : a.started_at
        ? new Date(a.started_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})
        : '—';
    const hasDesc   = (_goAllQuestions[a.quiz_id] || []).some(q => (q.question_type||'').toLowerCase() === 'descriptive');
    const borderCol = !sub ? '#f0a500'
                    : hasDesc && !ok && (score === 0 || score < total) ? '#f97316'  // pending grading
                    : ok ? '#22c55e' : '#ef4444';

    const statusBg  = !sub               ? 'rgba(240,165,0,0.1)'
                    : hasDesc && !ok && (score === 0 || score < total) ? 'rgba(249,115,22,0.1)'
                    : ok                  ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';

    const statusTxt = !sub               ? '🔄 In Progress'
                    : hasDesc && !ok && (score === 0 || score < total) ? '⏳ Pending'
                    : ok                  ? '✅ Pass' : '❌ Fail';

    // Always show quiz label (no tabs anymore)
    const quizLabel = `<span style="font-size:0.7rem;padding:2px 8px;border-radius:10px;background:${col}18;color:${col};font-weight:700;border:1px solid ${col}33;white-space:nowrap;">${quiz.title||'Quiz'}</span>`;

    return `
      <div style="border-radius:12px;border:1px solid var(--border);border-left:3px solid ${borderCol};background:var(--surface2);overflow:hidden;" id="go-row-${a.id}">
        <!-- Clickable header row -->
        <div onclick="goToggleDetail(${a.id})" style="display:flex;align-items:center;gap:10px;padding:12px 16px;flex-wrap:wrap;cursor:pointer;transition:background 0.15s;"
          onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background=''">
          <div style="flex:1;min-width:150px;">
            <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:3px;">
              <span style="font-size:0.9rem;font-weight:700;color:var(--text);">${emp}</span>
              ${quizLabel}
            </div>
            <div style="font-size:0.72rem;color:var(--muted);">${dept} · Attempt #${a.attempt_number||1} · 📅 ${date}</div>
          </div>
          <div style="text-align:center;min-width:70px;">
            <div style="font-size:1.1rem;font-weight:900;color:${borderCol};">${sub ? pct+'%' : '—'}</div>
            <div style="font-size:0.68rem;color:var(--muted);">${score}/${total} pts</div>
          </div>
          <div style="font-size:0.75rem;font-weight:800;padding:4px 13px;border-radius:20px;
            background:${statusBg};color:${borderCol};">
            ${statusTxt}
          </div>
          <span id="go-chevron-${a.id}" style="font-size:0.75rem;color:var(--muted);transition:transform 0.2s;display:inline-block;">▼</span>
        </div>
        <!-- Expandable detail panel (all answers) -->
        <div id="go-detail-${a.id}" style="display:none;border-top:1px solid var(--border);padding:14px 16px;background:var(--surface);">
          <div id="go-detail-content-${a.id}" style="font-size:0.82rem;color:var(--muted);">
            <div style="text-align:center;padding:20px 0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f0a500" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite;display:block;margin:0 auto 8px;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Loading answers…
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// Toggle detail panel on card click
async function goToggleDetail(attemptId) {
  const panel   = document.getElementById(`go-detail-${attemptId}`);
  const chevron = document.getElementById(`go-chevron-${attemptId}`);
  if (!panel) return;
  const isOpen = panel.style.display === 'block';
  panel.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
  if (!isOpen) await goLoadAllAnswers(attemptId);
}

// Load ALL answers for an attempt (MCQ + TF + Descriptive)
async function goLoadAllAnswers(attemptId) {
  const container = document.getElementById(`go-detail-content-${attemptId}`);
  if (!container) return;

  // Find attempt's quiz to get question order
  const attempt = _goAllAttempts.find(a => a.id === attemptId);
  const quizQs  = attempt ? (_goAllQuestions[attempt.quiz_id] || []) : [];

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/answers?select=id,answer_text,marks_awarded,selected_option_id,` +
      `questions(id,question_text,question_type,marks,correct_answer_text),` +
      `options!answers_selected_option_id_fkey(option_text,is_correct)` +
      `&attempt_id=eq.${attemptId}&order=id.asc`,
      { headers: QZ_HDRS() }
    );
    const answers = await res.json();
    if (!answers.length) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:0.83rem;">No answers recorded yet.</div>';
      return;
    }

    // Also fetch all options for MCQ/TF questions to show all choices
    const qIds = [...new Set(answers.map(a => a.questions?.id).filter(Boolean))];
    let allOptions = [];
    if (qIds.length) {
      const optRes = await fetch(
        `${SUPABASE_URL}/rest/v1/options?select=id,question_id,option_text,is_correct&question_id=in.(${qIds.join(',')})`,
        { headers: QZ_HDRS() }
      );
      allOptions = await optRes.json();
    }

    let html = '';
    answers.forEach((ans, idx) => {
      const qType    = (ans.questions?.question_type || 'mcq').toLowerCase();
      const qText    = ans.questions?.question_text || `Question ${idx + 1}`;
      const qMarks   = ans.questions?.marks || 1;
      const qId      = ans.questions?.id;
      const modelAns = ans.questions?.correct_answer_text || '';

      // Type badge
      const typeBadge = qType === 'descriptive'
        ? `<span style="font-size:0.65rem;padding:1px 7px;border-radius:8px;background:rgba(240,165,0,0.12);color:#f0a500;font-weight:700;">✏️ Descriptive</span>`
        : qType === 'true_false'
        ? `<span style="font-size:0.65rem;padding:1px 7px;border-radius:8px;background:rgba(34,197,94,0.12);color:#22c55e;font-weight:700;">🔘 True/False</span>`
        : `<span style="font-size:0.65rem;padding:1px 7px;border-radius:8px;background:rgba(168,85,247,0.12);color:#a855f7;font-weight:700;">☑ MCQ</span>`;

      if (qType === 'descriptive') {
        // ── Descriptive ──
        const current = ans.marks_awarded ?? '';
        html += `
          <div style="margin-bottom:10px;padding:12px 14px;border-radius:10px;background:var(--surface2);border:1px solid rgba(240,165,0,0.2);">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px;">
              <span style="font-size:0.78rem;font-weight:700;color:var(--muted);">Q${idx+1}</span>
              ${typeBadge}
              <span style="font-size:0.7rem;color:var(--muted);margin-left:auto;">${qMarks} marks</span>
            </div>
            <div style="font-size:0.83rem;font-weight:700;color:var(--text);margin-bottom:6px;">${qText}</div>
            <div style="font-size:0.79rem;color:var(--text2);background:var(--surface);padding:8px 10px;border-radius:8px;border:1px solid var(--border);line-height:1.6;margin-bottom:6px;">
              <span style="font-weight:700;color:#00d4aa;">Answer: </span>${ans.answer_text || '<em style="color:var(--muted)">Not answered</em>'}
            </div>
            ${modelAns ? `<div style="font-size:0.75rem;color:var(--muted);margin-bottom:8px;"><span style="font-weight:700;color:#a855f7;">Model: </span>${modelAns}</div>` : ''}
            <div style="display:flex;align-items:center;gap:8px;background:rgba(240,165,0,0.06);border-radius:7px;padding:7px 10px;flex-wrap:wrap;">
              <span style="font-size:0.75rem;font-weight:700;color:#f0a500;">Award Marks:</span>
              <input type="number" id="go-marks-${ans.id}" min="0" max="${qMarks}" step="1" value="${current}" placeholder="0"
                oninput="if(parseFloat(this.value)>${qMarks})this.value=${qMarks};"
                style="width:60px;padding:4px 8px;border-radius:6px;border:1.5px solid rgba(240,165,0,0.4);background:var(--surface2);color:var(--text);font-size:0.85rem;font-family:inherit;outline:none;text-align:center;">
              <span style="font-size:0.72rem;color:var(--muted);">/ ${qMarks}</span>
              <button onclick="goSaveMark(${ans.id},${attemptId},${qMarks})"
                style="padding:4px 13px;border-radius:7px;border:none;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;font-size:0.76rem;font-weight:700;cursor:pointer;font-family:inherit;">
                💾 Save
              </button>
              <span id="go-saved-${ans.id}" style="font-size:0.72rem;color:#22c55e;font-weight:700;display:none;">✓ Saved!</span>
            </div>
          </div>`;

      } else {
        // ── MCQ / True/False ──
        const selectedOptId = ans.selected_option_id;
        const selOpt  = ans.options;  // joined via FK
        const isRight = selOpt?.is_correct === true;
        const selText = selOpt?.option_text || '(Not answered)';
        const opts    = allOptions.filter(o => o.question_id === qId);
        const correctOpt = opts.find(o => o.is_correct);
        const statusCol  = !selectedOptId ? 'var(--muted)' : isRight ? '#22c55e' : '#ef4444';
        const statusIcon = !selectedOptId ? '—' : isRight ? '✅' : '❌';
        const earnedMks  = isRight ? qMarks : 0;

        html += `
          <div style="margin-bottom:10px;padding:12px 14px;border-radius:10px;background:var(--surface2);border:1px solid ${isRight?'rgba(34,197,94,0.2)':selectedOptId?'rgba(239,68,68,0.2)':'var(--border)'};">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px;">
              <span style="font-size:0.78rem;font-weight:700;color:var(--muted);">Q${idx+1}</span>
              ${typeBadge}
              <span style="font-size:0.7rem;font-weight:700;color:${statusCol};margin-left:auto;">${statusIcon} ${earnedMks}/${qMarks} marks</span>
            </div>
            <div style="font-size:0.83rem;font-weight:700;color:var(--text);margin-bottom:8px;">${qText}</div>
            <div style="display:flex;flex-direction:column;gap:5px;">
              ${opts.map(o => {
                const isSel   = o.id === selectedOptId;
                const isCorr  = o.is_correct;
                let bg = 'var(--surface)'; let border = 'var(--border)'; let textCol = 'var(--text)';
                if (isSel && isCorr)  { bg='rgba(34,197,94,0.1)';  border='rgba(34,197,94,0.4)';  textCol='#22c55e'; }
                if (isSel && !isCorr) { bg='rgba(239,68,68,0.08)'; border='rgba(239,68,68,0.35)'; textCol='#ef4444'; }
                if (!isSel && isCorr) { bg='rgba(34,197,94,0.05)'; border='rgba(34,197,94,0.25)'; textCol='#22c55e'; }
                return `<div style="padding:6px 10px;border-radius:7px;border:1px solid ${border};background:${bg};font-size:0.78rem;color:${textCol};display:flex;align-items:center;gap:7px;">
                  <span>${isSel?'●':'○'}</span>
                  <span style="flex:1;">${o.option_text}</span>
                  ${isSel&&isCorr?'<span style="font-weight:700;">✓ Correct</span>':''}
                  ${isSel&&!isCorr?'<span style="font-weight:700;">✗ Wrong</span>':''}
                  ${!isSel&&isCorr?'<span style="font-weight:600;font-size:0.72rem;">← Correct answer</span>':''}
                </div>`;
              }).join('')}
            </div>
          </div>`;
      }
    });

    container.innerHTML = html;
  } catch(e) {
    container.innerHTML = `<div style="color:#ef4444;padding:12px;font-size:0.8rem;">⚠️ Error: ${e.message}</div>`;
  }
}

async function goSaveMark(answerId, attemptId, maxMark) {
  if (!_canUploadQuiz()) { alert('⛔ Only MIS members can grade.'); return; }
  const input   = document.getElementById(`go-marks-${answerId}`);
  const savedEl = document.getElementById(`go-saved-${answerId}`);
  const marks   = parseFloat(input?.value);
  if (isNaN(marks) || marks < 0) { alert('Please enter a valid mark.'); return; }
  if (maxMark > 0 && marks > maxMark) { alert(`⚠️ Marks cannot exceed ${maxMark} for this question.`); input.value = maxMark; return; }

  try {
    // 1. Save descriptive marks_awarded
    await fetch(`${SUPABASE_URL}/rest/v1/answers?id=eq.${answerId}`, {
      method: 'PATCH', headers: { ...QZ_HDRS(), 'Prefer': 'return=minimal' },
      body: JSON.stringify({ marks_awarded: marks })
    });

    // 2. Fetch all answers with question type + marks + selected option correctness
    const aRes   = await fetch(
      `${SUPABASE_URL}/rest/v1/answers?select=id,selected_option_id,marks_awarded,questions(marks,question_type),options!answers_selected_option_id_fkey(is_correct)&attempt_id=eq.${attemptId}`,
      { headers: QZ_HDRS() }
    );
    const allAns = await aRes.json();

    // 3. Recalculate score:
    //    MCQ/TF  → question.marks if correct option selected
    //    Descriptive → marks_awarded (just saved or previously saved)
    let newScore = 0;
    allAns.forEach(a => {
      const qType  = (a.questions?.question_type || 'mcq').toLowerCase();
      const qMarks = a.questions?.marks || 1;
      if (qType === 'descriptive') {
        // Use the freshly saved value for our answer, DB value for others
        newScore += (a.id === answerId ? marks : (a.marks_awarded || 0));
      } else {
        // MCQ/TF: award question.marks if the selected option is_correct
        if (a.options?.is_correct) newScore += qMarks;
      }
    });

    // 4. Patch corrected score
    await fetch(`${SUPABASE_URL}/rest/v1/quiz_attempts?id=eq.${attemptId}`, {
      method: 'PATCH', headers: { ...QZ_HDRS(), 'Prefer': 'return=minimal' },
      body: JSON.stringify({ score: newScore })
    });

    const cached = _goAllAttempts.find(a => a.id === attemptId);
    if (cached) cached.score = newScore;
    if (savedEl) { savedEl.style.display = 'inline'; setTimeout(() => { savedEl.style.display = 'none'; goRenderList(); }, 1500); }
  } catch(e) {
    alert('Error saving: ' + e.message);
  }
}



async function loadAdminQuizList() {
  const loadEl  = document.getElementById('qa-manage-loading');
  const listEl  = document.getElementById('qa-manage-list');
  const emptyEl = document.getElementById('qa-manage-empty');
  loadEl.style.display = 'block'; listEl.innerHTML = ''; emptyEl.style.display = 'none';

  try {
    const res   = await fetch(`${SUPABASE_URL}/rest/v1/quizzes?select=*,content_nodes(name)&order=id.desc`, { headers: QZ_HDRS() });
    const quizzes = await res.json();
    loadEl.style.display = 'none';

    if (!quizzes.length) { emptyEl.style.display = 'block'; return; }

    listEl.innerHTML = quizzes.map(q => {
      const mod  = q.content_nodes?.name || '—';
      const stat = q.is_active ? '🟢 Active' : '🔴 Inactive';
      return `
        <div style="padding:13px 15px;border-radius:11px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:150px;">
            <div style="font-size:0.88rem;font-weight:700;color:var(--text);">${q.title}</div>
            <div style="font-size:0.75rem;color:var(--muted);">📚 ${mod} · ⏱ ${q.time_limit||'—'}min</div>
          </div>
          <div style="font-size:0.76rem;font-weight:600;color:var(--muted);">${stat}</div>
          <button onclick="editQuizFromDB(${q.id})" style="padding:5px 12px;border-radius:7px;border:1px solid rgba(78,154,241,0.35);background:rgba(78,154,241,0.1);color:#4e9af1;font-size:0.76rem;cursor:pointer;font-family:inherit;">✏️ Edit</button>
          <button onclick="toggleQuizActive(${q.id},${!q.is_active})" style="padding:5px 12px;border-radius:7px;border:1px solid var(--border);background:none;color:var(--muted);font-size:0.76rem;cursor:pointer;font-family:inherit;">${q.is_active?'Deactivate':'Activate'}</button>
          <button onclick="deleteQuizFromDB(${q.id},'${q.title.replace(/'/g,"\\'")}')" style="padding:5px 10px;border-radius:7px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.08);color:#ef4444;font-size:0.76rem;cursor:pointer;font-family:inherit;">Delete</button>
        </div>`;
    }).join('');
  } catch(e) {
    loadEl.style.display = 'none';
    listEl.innerHTML = `<div style="color:#ef4444;font-size:0.83rem;">Error: ${e.message}</div>`;
  }
}

async function toggleQuizActive(quizId, newState) {
  if (!_canUploadQuiz()) { alert('⛔ Only authorised MIS members can modify quizzes.'); return; }
  await fetch(`${SUPABASE_URL}/rest/v1/quizzes?id=eq.${quizId}`, {
    method: 'PATCH',
    headers: { ...QZ_HDRS(), 'Prefer': 'return=minimal' },
    body: JSON.stringify({ is_active: newState })
  });
  _quizzesLoaded = false;
  loadAdminQuizList();
  loadTrainingQuizzes();
}

async function deleteQuizFromDB(quizId, title) {
  if (!_canUploadQuiz()) { alert('⛔ Only authorised MIS members can delete quizzes.'); return; }
  if (!confirm(`Delete quiz "${title}"? This will also delete all questions, options and attempt records.`)) return;
  // Delete in order: answers → attempts → options → questions → quiz
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/answers?attempt_id=in.(select id from quiz_attempts where quiz_id=eq.${quizId})`, { method:'DELETE', headers:QZ_HDRS() }).catch(()=>{});
    await fetch(`${SUPABASE_URL}/rest/v1/quiz_attempts?quiz_id=eq.${quizId}`, { method:'DELETE', headers:QZ_HDRS() });
    await fetch(`${SUPABASE_URL}/rest/v1/options?question_id=in.(select id from questions where quiz_id=eq.${quizId})`, { method:'DELETE', headers:QZ_HDRS() }).catch(()=>{});
    await fetch(`${SUPABASE_URL}/rest/v1/questions?quiz_id=eq.${quizId}`, { method:'DELETE', headers:QZ_HDRS() });
    await fetch(`${SUPABASE_URL}/rest/v1/quizzes?id=eq.${quizId}`, { method:'DELETE', headers:QZ_HDRS() });
    _quizzesLoaded = false;
    loadAdminQuizList();
    loadTrainingQuizzes();
  } catch(e) { alert('Delete error: ' + e.message); }
}

// ── Track which quiz is being edited (null = creating new) ──
let _editingQuizId = null;

async function editQuizFromDB(quizId) {
  if (!_canUploadQuiz()) { alert('⛔ Only authorised MIS members can edit quizzes.'); return; }

  const saveBtn  = document.getElementById('qa-save-btn');
  const statusEl = document.getElementById('qa-save-status');
  saveBtn.textContent = 'Loading…'; saveBtn.disabled = true;

  // Switch to Create tab (form dikhao)
  switchQuizAdminTab('create');

  try {
    // 1. Quiz details fetch karo
    const qRes  = await fetch(`${SUPABASE_URL}/rest/v1/quizzes?id=eq.${quizId}&select=*`, { headers: QZ_HDRS() });
    const qArr  = await qRes.json();
    const quiz  = qArr[0];
    if (!quiz) throw new Error('Quiz not found');

    // 2. Questions fetch karo
    const qqRes = await fetch(`${SUPABASE_URL}/rest/v1/questions?quiz_id=eq.${quizId}&select=*&order=id.asc`, { headers: QZ_HDRS() });
    const qqArr = await qqRes.json();

    // 3. Options fetch karo (agar questions hain)
    let optMap = {};
    if (qqArr.length) {
      const qIds  = qqArr.map(q => q.id).join(',');
      const opRes = await fetch(`${SUPABASE_URL}/rest/v1/options?question_id=in.(${qIds})&select=*&order=id.asc`, { headers: QZ_HDRS() });
      const opArr = await opRes.json();
      opArr.forEach(o => {
        if (!optMap[o.question_id]) optMap[o.question_id] = [];
        optMap[o.question_id].push(o);
      });
    }

    // 4. Form fields bharo
    await populateNodeSelect();
    document.getElementById('qa-title').value     = quiz.title        || '';
    document.getElementById('qa-desc').value      = quiz.description  || '';
    document.getElementById('qa-passing').value   = quiz.passing_score|| 60;
    document.getElementById('qa-timelimit').value = quiz.time_limit   || 15;
    if (quiz.node_id) document.getElementById('qa-node').value = String(quiz.node_id);

    // 5. _qaQuestions array rebuild karo
    _qaQuestions = qqArr.map(q => {
      const qType   = q.question_type || 'mcq';
      const opts    = optMap[q.id] || [];
      const tfCorr  = qType === 'true_false'
        ? (opts.find(o => o.is_correct)?.option_text?.toLowerCase() || 'true')
        : 'true';
      return {
        text:                q.question_text || '',
        marks:               q.marks || 1,
        type:                qType,
        correct_answer_text: q.correct_answer_text || '',
        tf_correct:          tfCorr,
        options: qType === 'mcq'
          ? (opts.length ? opts.map(o => ({ text: o.option_text, is_correct: o.is_correct }))
                         : [{ text:'',is_correct:false },{ text:'',is_correct:false },{ text:'',is_correct:false },{ text:'',is_correct:false }])
          : (qType === 'true_false'
              ? [{ text:'True', is_correct: tfCorr==='true' },{ text:'False', is_correct: tfCorr==='false' }]
              : [])
      };
    });

    // 6. Questions render karo
    document.getElementById('qa-questions-list').innerHTML = '';
    if (_qaQuestions.length) {
      document.getElementById('qa-no-questions').style.display = 'none';
      renderAdminQuestions();
    } else {
      document.getElementById('qa-no-questions').style.display = 'block';
    }

    // 7. Editing mode set karo
    _editingQuizId = quizId;
    saveBtn.textContent = '✏️ Update Quiz';
    saveBtn.disabled    = false;
    statusEl.style.display = 'none';

    // Form top tak scroll karo
    document.getElementById('qa-title').scrollIntoView({ behavior:'smooth', block:'center' });

  } catch(e) {
    saveBtn.textContent = '💾 Save Quiz';
    saveBtn.disabled    = false;
    alert('Edit load error: ' + e.message);
  }
}

/* ══ PORTAL UPDATE MODAL FUNCTIONS ══ */
let _editingAnnId = null; // null = new post, number = edit mode

function openPostUpdateModal() {
  _editingAnnId = null;
  document.getElementById('postUpdateTitle').value = '';
  document.getElementById('postUpdateBody').value = '';
  document.getElementById('postUpdateError').style.display = 'none';
  // Modal heading aur button text reset
  const heading = document.getElementById('postUpdateHeading');
  if (heading) heading.textContent = '✨ Post Update';
  const btn = document.getElementById('postUpdateSubmitBtn');
  if (btn) btn.textContent = '🚀 Publish Update';
  document.getElementById('postUpdateModal').style.display = 'block';
  document.getElementById('postUpdateBackdrop').style.display = 'block';
  setTimeout(()=>document.getElementById('postUpdateTitle').focus(), 100);
}

function editPortalUpdate(id) {
  if (!CURRENT_USER || PERMISSIONS.can_post_announcements !== 'true') return;
  const ann = _annDrwUpdates.find(a => a.id === id);
  if (!ann) { alert('Update not found.'); return; }
  _editingAnnId = id;
  document.getElementById('postUpdateTitle').value = ann.title || '';
  document.getElementById('postUpdateBody').value  = ann.body  || '';
  document.getElementById('postUpdateError').style.display = 'none';
  // Modal heading aur button update karo
  const heading = document.getElementById('postUpdateHeading');
  if (heading) heading.textContent = '✏️ Edit Update';
  const btn = document.getElementById('postUpdateSubmitBtn');
  if (btn) btn.textContent = '💾 Save Changes';
  document.getElementById('postUpdateModal').style.display = 'block';
  document.getElementById('postUpdateBackdrop').style.display = 'block';
  setTimeout(()=>document.getElementById('postUpdateTitle').focus(), 100);
}

function closePostUpdateModal() {
  document.getElementById('postUpdateModal').style.display = 'none';
  document.getElementById('postUpdateBackdrop').style.display = 'none';
}

async function submitPortalUpdate() {
  const title = (document.getElementById('postUpdateTitle').value || '').trim();
  const body  = (document.getElementById('postUpdateBody').value || '').trim();
  const errEl = document.getElementById('postUpdateError');
  const btn   = document.getElementById('postUpdateSubmitBtn');

  errEl.style.display = 'none';
  if (!title) { errEl.textContent = '⚠️ Title is required.'; errEl.style.display = 'block'; return; }
  if (!body)  { errEl.textContent = '⚠️ Message cannot be empty.'; errEl.style.display = 'block'; return; }

  const isEditing = !!_editingAnnId;
  btn.disabled = true;
  btn.textContent = isEditing ? 'Saving…' : 'Publishing…';

  try {
    const hdrs = {
      ...SB_HDRS(),
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };

    let res;
    if (isEditing) {
      // ── EDIT mode: PATCH existing row ──
      const payload = { title, body };
      res = await fetch(
        SUPABASE_URL + '/rest/v1/portal_update_text?id=eq.' + _editingAnnId,
        { method: 'PATCH', headers: hdrs, body: JSON.stringify(payload) }
      );
    } else {
      // ── NEW post: INSERT ──
      const postedBy = (CURRENT_USER && CURRENT_USER.name) || 'MIS Team';
      const payload = { title, body, posted_by: postedBy };
      res = await fetch(
        SUPABASE_URL + '/rest/v1/portal_update_text',
        { method: 'POST', headers: hdrs, body: JSON.stringify(payload) }
      );
    }

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || res.statusText);
    }

    // Local data bhi update karo (immediate UI refresh)
    if (isEditing) {
      const idx = _annDrwUpdates.findIndex(a => a.id === _editingAnnId);
      if (idx !== -1) { _annDrwUpdates[idx].title = title; _annDrwUpdates[idx].body = body; }
    }

    // Refresh the feed
    _annDrwLoaded = false;
    _annDrwUpdates = [];
    _editingAnnId = null;
    closePostUpdateModal();
    document.getElementById('annDrwFeed').innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted);font-size:0.85rem;">Refreshing…</div>';
    await _annDrwLoad();
    annDrwFilter('update');

    if (!isEditing) {
      // ── Push sirf new post pe ──
      osSendPush('New Announcement', title + '\nOpen the portal to view — learn.adititracking.com');
    }
  } catch(e) {
    errEl.textContent = '❌ Error: ' + (e.message || 'Please try again.');
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = isEditing ? '💾 Save Changes' : '🚀 Publish Update';
  }
}

/* ══ DELETE PORTAL UPDATE ══ */
async function deletePortalUpdate(id) {
  if (!CURRENT_USER || CURRENT_USER.rawRole !== 'mis') return;
  if (!confirm('Are you sure you want to delete this update?')) return;

  // Card turant fade karo
  const card = document.getElementById('ann-card-' + id);
  if (card) { card.style.opacity = '0.4'; card.style.pointerEvents = 'none'; }

  try {
    const hdrs = { ...SB_HDRS(), 'Content-Type': 'application/json' };
    const res = await fetch(
      SUPABASE_URL + '/rest/v1/portal_update_text?id=eq.' + id,
      { method: 'DELETE', headers: hdrs }
    );
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || res.statusText);
    }
    // Local list se bhi hatao
    _annDrwUpdates = _annDrwUpdates.filter(a => a.id !== id);
    _annDrwRender();
  } catch(e) {
    if (card) { card.style.opacity = '1'; card.style.pointerEvents = ''; }
    alert('Delete error: ' + (e.message || 'Please try again.'));
  }
}

// ===== next block =====

(function initIdleTimeout() {
  const IDLE_LIMIT  = 3 * 60 * 60 * 1000;  // 3 hours idle = logout
  const WARN_BEFORE = 5  * 60 * 1000;       // warn 5 minutes before logout

  let lastActivity = Date.now();
  let warnShown    = false;
  let logoutDone   = false;

  ['click', 'keydown', 'scroll', 'touchstart'].forEach(ev => {
    document.addEventListener(ev, () => {
      lastActivity = Date.now();
      if (warnShown) {
        warnShown  = false;
        logoutDone = false;
        const w = document.getElementById('_idleWarn');
        if (w) { w.style.opacity = '0'; setTimeout(() => w && w.remove(), 300); }
      }
    }, { passive: true });
  });

  function showIdleWarning() {
    if (warnShown) return;
    warnShown = true;
    const w = document.createElement('div');
    w.id = '_idleWarn';
    w.style.cssText = `
      position:fixed;bottom:28px;right:24px;z-index:999990;
      background:#1e1b14;border:1.5px solid #f0a500;
      border-radius:16px;padding:16px 20px;
      font-family:'DM Sans',sans-serif;
      box-shadow:0 8px 32px rgba(0,0,0,0.55);
      display:flex;align-items:flex-start;gap:13px;
      opacity:0;transition:opacity 0.35s;max-width:340px;
    `;
    w.innerHTML = `
      <span style="font-size:1.6rem;line-height:1;margin-top:2px;">⏱️</span>
      <div style="flex:1;">
        <div style="font-size:0.92rem;font-weight:700;color:#f0a500;margin-bottom:4px;">Session Expiring Soon</div>
        <div style="font-size:0.81rem;color:#c8cdd8;line-height:1.5;">
          You will be automatically logged out in <strong style="color:#fff;">5 minutes</strong> due to inactivity.
        </div>
        <div style="font-size:0.78rem;color:#8a909e;margin-top:5px;">Click anywhere to stay logged in.</div>
      </div>
      <button onclick="(function(){var w=document.getElementById('_idleWarn');if(w){w.style.opacity='0';setTimeout(function(){w&&w.remove();},300);}})()"
        style="background:none;border:none;color:#8a909e;cursor:pointer;font-size:1.1rem;padding:0;line-height:1;margin-top:2px;flex-shrink:0;">✕</button>
    `;
    document.body.appendChild(w);
    requestAnimationFrame(() => w.style.opacity = '1');
  }

  function doIdleLogout() {
    if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return;
    if (logoutDone) return;
    logoutDone = true;
    const w = document.getElementById('_idleWarn');
    if (w) w.remove();
    if (typeof showToast === 'function') {
      showToast('🔒 Session expired due to inactivity. Please log in again.', 'warning', 5000);
    }
    setTimeout(() => {
      if (typeof doLogout === 'function') doLogout();
      else { _sbAuth.auth.signOut().catch(() => {}); location.reload(); }
    }, 1800);
  }

  setInterval(() => {
    if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return;
    const idleMs = Date.now() - lastActivity;
    if (!warnShown  && idleMs >= (IDLE_LIMIT - WARN_BEFORE)) showIdleWarning();
    if (!logoutDone && idleMs >= IDLE_LIMIT)                  doIdleLogout();
  }, 10000);
})();

// ===== next block =====

// ╔══════════════════════════════════════════════════════════════════════════
// ║  [ACCESS CONTROL JS] — Permission panel logic (MIS ONLY)
// ║  _PAPI = Flask API URL on Railway (for /api/permissions endpoint)
// ║  _permLabels = Har permission key ka display name
// ║  loadAdminPermsPanel() = Supabase se sab users + permissions load karo
// ║  acpSave()             = Toggle change hone pe save karo
// ║  Agar naya permission add karna ho:
// ║    1. Supabase user_permissions table mein column add karo
// ║    2. _permLabels object mein label add karo yahan
// ║    3. Flask api.py mein bhi update karo
// ╚══════════════════════════════════════════════════════════════════════════

const _PAPI = 'https://knowlege-based-portal-production.up.railway.app';
let _acpUsers = [], _acpAllKeys = [], _acpLoaded = false;
const _permLabels = {
  can_view_leads:         '📊 Lead Tracking Dashboard',
  can_view_collection:    '💰 Collection Dashboard',
  can_view_fms:           '🚚 FMS O2D Dashboard',
  can_view_ims:           '📦 IMS Dashboard',
  can_view_mapping:             '🗺️ Customer Mapping — View',
  can_edit_mapping:             '🗺️ Customer Mapping — Edit',
  mapping_region_headoffice:    '🗺️ Mapping Region — HeadOffice',
  mapping_region_goa:           '🗺️ Mapping Region — Goa',
  mapping_region_bangalore:     '🗺️ Mapping Region — Bangalore',
  mapping_region_gujarat:       '🗺️ Mapping Region — Gujarat',
  can_view_crm:           '🚗 CRM Vehicle Dashboard',
  crm_server_premium:     '🚗 CRM — Premium Server',
  crm_server_pro:         '🚗 CRM — PRO Server',
  crm_server_goa:         '🚗 CRM — Goa Server',
  crm_server_bangalore:   '🚗 CRM — Bangalore Server',
  crm_server_gujarat:     '🚗 CRM — Gujarat Server',
  can_view_crm_changes:   '🔄 CRM — Vehicle Changes',
  can_view_activitylog:   '📋 Activity Log',
  can_view_announcements: '🔔 View Announcements',
  can_post_announcements: '📢 Post Announcements',
  can_upload_files:       '📤 Upload & Delete Files',
  can_upload_quiz:        '🎯 Create & Manage Quizzes',
  can_download_video:     '⬇️ Download Training Videos',
  checklist_scope:        '✅ Task Checklist Scope',
  can_delete_tasks:       '🗑️ Task Checklist — Delete Tasks',
  can_view_open_roles:        '📋 Referral — Open Roles',
  can_view_my_referrals:      '🧾 Referral — My Referrals',
  can_view_referral_pipeline: '📊 Referral — Pipeline (HR)',
  can_post_referral_role:     '➕ Referral — Post a Role (HR)',
};

async function loadAdminPermsPanel() {
  if (_acpLoaded) return;
  const loading = document.getElementById('acpLoading');
  const error   = document.getElementById('acpError');
  const table   = document.getElementById('acpTable');
  try {
    const res  = await fetch(`${_PAPI}/api/admin/all-users-permissions`, {
      headers: { 'X-User-Email': CURRENT_USER.email }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data  = await res.json();
    _acpUsers   = data.users || [];
    _acpAllKeys = data.all_permission_keys || [];
    _acpLoaded  = true;
    if (loading) loading.style.display = 'none';
    if (table)   table.style.display   = 'block';
    acpRender(_acpUsers);
  } catch(e) {
    if (loading) loading.style.display = 'none';
    if (error) { error.style.display = 'block'; error.textContent = '❌ ' + e.message; }
  }
}

function acpFilter() {
  const q = (document.getElementById('acpSearch').value || '').toLowerCase();
  acpRender(_acpUsers.filter(u => (u.name||'').toLowerCase().includes(q) || (u.email||'').includes(q)));
}

function acpRender(users) {
  const rows = document.getElementById('acpRows');
  if (!rows) return;
  if (!users.length) { rows.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);">No employees found</div>'; return; }
  rows.innerHTML = users.map(u => {
    const perms = u.permissions || {};
    const permHtml = _acpAllKeys.map(key => {
      const label = _permLabels[key] || key;
      const val   = perms[key] || 'false';
      if (key === 'checklist_scope') {
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:0.82rem;color:var(--text2);">${label}</span>
          <select onchange="acpSave('${u.email}','${key}',this.value)"
            style="padding:5px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:0.80rem;font-family:inherit;cursor:pointer;outline:none;">
            <option value="own" ${val==='own'?'selected':''}>Own data only</option>
            <option value="all" ${val==='all'?'selected':''}>All employees</option>
          </select></div>`;
      }
      const isOn = val === 'true';
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:0.82rem;color:var(--text2);">${label}</span>
        <label style="position:relative;display:inline-block;width:38px;height:22px;cursor:pointer;flex-shrink:0;">
          <input type="checkbox" ${isOn?'checked':''} style="opacity:0;width:0;height:0;position:absolute;"
            onchange="acpSave('${u.email}','${key}',this.checked?'true':'false');
                      this.parentElement.querySelector('span').style.background=this.checked?'#00d4aa':'var(--border)';
                      this.parentElement.querySelector('span span').style.left=this.checked?'18px':'2px';">
          <span style="position:absolute;inset:0;border-radius:22px;background:${isOn?'#00d4aa':'var(--border)'};transition:background 0.2s;">
            <span style="position:absolute;left:${isOn?'18px':'2px'};top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.2s;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></span>
          </span>
        </label></div>`;
    }).join('');
    const rc = u.role==='owner'?'#f0a500':u.role==='mis'?'#00d4aa':u.role==='pc'?'#a855f7':'#6b7280';
    return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:38px;height:38px;border-radius:50%;background:${rc}22;color:${rc};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0;border:1.5px solid ${rc}44;">${(u.name||'?')[0].toUpperCase()}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.92rem;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.name}</div>
          <div style="font-size:0.74rem;color:var(--muted);">${u.email}</div>
        </div>
        <span style="font-size:0.72rem;padding:3px 10px;border-radius:20px;background:${rc}18;color:${rc};font-weight:700;border:1px solid ${rc}33;">${u.role}</span>
      </div>
      ${permHtml}</div>`;
  }).join('');
}

async function acpSave(email, permission, value) {
  if (!CURRENT_USER || !CURRENT_USER.email) { alert('❌ Session expired. Please logout and login again.'); return; }
  if (!email) return;
  try {
    const res = await fetch(`${_PAPI}/api/admin/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Email': CURRENT_USER.email },
      body: JSON.stringify({ user_email: email, permission, value })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    if (typeof showToast === 'function') showToast('✅ Permission saved!', 'success', 2000);
    const user = _acpUsers.find(u => u.email === email);
    if (user) user.permissions[permission] = value;
  } catch(e) { alert('❌ Failed to save: ' + e.message); }
}

// ===== next block =====

// ╔══════════════════════════════════════════════════════════════════════════
// ║  [VENDOR MODULE JS] — Purchase Approval System logic
// ║  Tables used: vendors, vendor_requests (Supabase)
// ║  Key roles:
// ║    _vrIsEA()       = Hetal Ma'am — approve/decline decisions
// ║    _vrIsAccounts() = Ashish Sir (vendor_pay permission) — mark paid
// ║    _vrCanViewAll() = MIS/owner — all requests dekh sakte hain
// ║  Key functions:
// ║    loadVendorRequests() = Dashboard data load karo
// ║    submitVendorRequest() = Naya purchase request submit karo
// ║    vrSaveDecision()    = EA approve/decline kare
// ║    vrMarkPaid()        = Accounts mark as paid kare
// ║    vrBulkPay()         = Multiple checked rows ek saath pay karo
// ║    vrDeleteRequest()   = Request delete karo
// ║  _vrAll = All requests array (local cache)
// ╚══════════════════════════════════════════════════════════════════════════
// ── STATE ──────────────────────────────────────────
let _vrAll=[], _vrFiltered=[], _vrFilterMode='all', _vrCurId=null, _vrNameMap={}, _vrVendors=[], _vrLoaded=false, _vrRecurSourceId=null;
let _vrFilterVendor='', _vrFilterRequester='', _vrVendorFilterList=[], _vrRequesterFilterList=[];

// ── ROLE HELPERS ───────────────────────────────────
function _vrRole(){return(typeof CURRENT_USER!=='undefined'&&CURRENT_USER)?String(CURRENT_USER.rawRole||CURRENT_USER.role||'').toLowerCase().trim():'';}
function _vrCanViewAll(){if(typeof PERMISSIONS!=='undefined'&&PERMISSIONS&&PERMISSIONS.vendor_view_all==='true')return true;const r=_vrRole();return r==='owner'||r==='mis'||r==='executive assistant'||r==='ea';}
function _vrIsEA(){if(typeof PERMISSIONS!=='undefined'&&PERMISSIONS&&PERMISSIONS.vendor_review==='true')return true;const r=_vrRole();return r==='executive assistant'||r==='ea'||r==='owner'||r==='mis';}function _vrIsAccounts(){
  // Uses vendor_pay permission — set via Access Control panel for Ashish sir specifically
  // This is role-independent so any employee given this permission gets PAID button access
  if(typeof PERMISSIONS!=='undefined'&&PERMISSIONS&&PERMISSIONS.vendor_pay==='true')return true;
  // owner/mis always have pay access
  const r=_vrRole();return r==='owner'||r==='mis';
}
function _vrMyEmail(){return(typeof CURRENT_USER!=='undefined'&&CURRENT_USER&&CURRENT_USER.email)?String(CURRENT_USER.email).trim().toLowerCase():'';}

// ── LOAD ───────────────────────────────────────────
async function loadVendorRequests(force){
  if(_vrLoaded&&!force)return;
  _vrLoaded=true;
  const ldg=document.getElementById('vrLoading');
  const tw=document.getElementById('vrTableWrap');
  const em=document.getElementById('vrEmpty');
  if(ldg)ldg.style.display='block';
  if(tw)tw.style.display='none';
  if(em)em.style.display='none';
  document.getElementById('vrKpiRow').innerHTML='';
  try{
    const empRes=await fetch(`${SUPABASE_URL}/rest/v1/Employee_details?select=Email_Id,Employee_name`,{headers:SB_HDRS()});
    const empData=empRes.ok?await empRes.json():[];
    _vrNameMap={};
    (empData||[]).forEach(e=>{if(e.Email_Id)_vrNameMap[String(e.Email_Id).toLowerCase().trim()]=e.Employee_name||e.Email_Id;});
    await _vrLoadVendors();
    let url=`${SUPABASE_URL}/rest/v1/vendor_requests?select=*&order=created_at.desc`;
    if(!_vrCanViewAll())url+=`&submitted_by=eq.${encodeURIComponent(_vrMyEmail())}`;
    const vrRes=await fetch(url,{headers:SB_HDRS()});
    if(!vrRes.ok)throw new Error('HTTP '+vrRes.status);
    _vrAll=await vrRes.json();
    _vrBuildFilterOptions();
    _vrRenderKPIs();
    _vrLoadAmountKPIs();

    _vrApplyFilter();
  }catch(e){
    if(ldg)ldg.innerHTML=`<div style="color:#ef4444;font-size:0.84rem;">❌ ${e.message}</div>`;
    return;
  }
  if(ldg)ldg.style.display='none';
}

async function _vrLoadVendors(){
  const res=await fetch(`${SUPABASE_URL}/rest/v1/vendors?select=id,vendor_name&order=vendor_name.asc`,{headers:SB_HDRS()});
  _vrVendors=res.ok?await res.json():[];
  _vrPopulateVendorDropdown();
}
function _vrPopulateVendorDropdown(){
  const sel=document.getElementById('vfVendorSel');
  if(!sel)return;
  sel.innerHTML='<option value=""></option>';
  _vrVendors.forEach(v=>{const o=document.createElement('option');o.value=v.id;o.textContent=v.vendor_name;o.dataset.name=v.vendor_name;sel.appendChild(o);});
}
function _vfVendorFilter(){
  const q=(document.getElementById('vfVendorSearch').value||'').toLowerCase();
  _vfVendorRenderList(q);
  document.getElementById('vfVendorDropdown').style.display='block';
}
function _vfVendorOpen(){
  const q=(document.getElementById('vfVendorSearch').value||'').toLowerCase();
  _vfVendorRenderList(q);
  document.getElementById('vfVendorDropdown').style.display='block';
}
function _vfVendorBlur(){setTimeout(()=>{document.getElementById('vfVendorDropdown').style.display='none';},180);}
function _vfVendorRenderList(q){
  const dd=document.getElementById('vfVendorDropdown');
  const filtered=q?_vrVendors.filter(v=>v.vendor_name.toLowerCase().includes(q)):_vrVendors;
  dd.innerHTML=filtered.slice(0,100).map(v=>`<div class="vf-vendor-option" onmousedown="_vfVendorSelect(${v.id},'${v.vendor_name.replace(/'/g,"\\'")}')">${v.vendor_name}</div>`).join('');
}
function _vfVendorSelect(id,name){
  document.getElementById('vfVendorSearch').value=name;
  document.getElementById('vfVendorSel').value=id;
  document.getElementById('vfVendorDropdown').style.display='none';
}
function _vfVendorFilter(){
  const q=(document.getElementById('vfVendorSearch').value||'').toLowerCase();
  _vfVendorRenderList(q);
  document.getElementById('vfVendorDropdown').style.display='block';
}
function _vfVendorOpen(){
  const q=(document.getElementById('vfVendorSearch').value||'').toLowerCase();
  _vfVendorRenderList(q);
  document.getElementById('vfVendorDropdown').style.display='block';
}
function _vfVendorBlur(){setTimeout(()=>{document.getElementById('vfVendorDropdown').style.display='none';},180);}
function _vfVendorRenderList(q){
  const dd=document.getElementById('vfVendorDropdown');
  const filtered=q?_vrVendors.filter(v=>v.vendor_name.toLowerCase().includes(q)):_vrVendors;
  dd.innerHTML=filtered.slice(0,100).map(v=>`<div class="vf-vendor-option" onmousedown="_vfVendorSelect(${v.id},'${v.vendor_name.replace(/'/g,"\\'")}')">${v.vendor_name}</div>`).join('');
}
function _vfVendorSelect(id,name){
  document.getElementById('vfVendorSearch').value=name;
  document.getElementById('vfVendorSel').value=id;
  document.getElementById('vfVendorDropdown').style.display='none';
}

// ── KPIs ───────────────────────────────────────────
// KPIs are now computed from _vrFiltered so they update live with search/filters/row selection,
// instead of always reflecting the full unfiltered dataset.
function _vrRenderKPIs(){
  const rows=_vrFiltered;
  const kpis=[
    {label:'Total',val:rows.length,color:'#4e9af1',icon:'📋'},
    {label:'On Hold',val:rows.filter(r=>r.status==='On Hold').length,color:'#f59e0b',icon:'🔒'},
    {label:'Approved',val:rows.filter(r=>r.status==='Approved').length,color:'#22c55e',icon:'✅'},
    {label:'Paid',val:rows.filter(r=>r.payment_status==='Paid').length,color:'#a855f7',icon:'💳'},
  ];
document.getElementById('vrKpiRow').innerHTML=kpis.map(k=>`<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 12px;border-left:4px solid ${k.color};box-shadow:var(--shadow);"><div style="font-size:0.95rem;margin-bottom:3px;">${k.icon}</div><div style="font-size:1.3rem;font-weight:900;color:${k.color};line-height:1;">${k.val}</div><div style="font-size:0.62rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-top:2px;">${k.label}</div></div>`).join('');}
async function _vrLoadAmountKPIs(){
  try{
    const rows=_vrFiltered;
    const sum=(list)=>list.reduce((s,r)=>s+(Number(r.amount)||0),0);
    const totalAmt=sum(rows);
    const approvedAmt=sum(rows.filter(r=>r.status==='Approved'));
    const paidAmt=sum(rows.filter(r=>r.payment_status==='Paid'));
    const unpaidAmt=totalAmt-paidAmt;
    const amountKpis=[
      {label:'Total Requested (₹)',val:totalAmt,color:'#4e9af1',icon:'💰'},
      {label:'Approved Amount (₹)',val:approvedAmt,color:'#22c55e',icon:'✅'},
      {label:'Paid Amount (₹)',val:paidAmt,color:'#a855f7',icon:'💳'},
      {label:'Unpaid Amount (₹)',val:unpaidAmt,color:'#ef4444',icon:'⏳'},
    ];
    const html=amountKpis.map(k=>`<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 12px;border-left:4px solid ${k.color};box-shadow:var(--shadow);"><div style="font-size:0.95rem;margin-bottom:3px;">${k.icon}</div><div style="font-size:1.3rem;font-weight:900;color:${k.color};line-height:1;">₹${Number(k.val||0).toLocaleString('en-IN',{maximumFractionDigits:0})}</div><div style="font-size:0.62rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-top:2px;">${k.label}</div></div>`).join('');
    document.getElementById('vrKpiRow').insertAdjacentHTML('beforeend', html);
  }catch(e){
    console.error('Amount KPI render error:',e);
  }
}
// ── FILTER ─────────────────────────────────────────
function _vrBuildFilterOptions(){
  // Unique vendor names actually present in the loaded requests
  _vrVendorFilterList=[...new Set(_vrAll.map(r=>r.vendor_name).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  // Unique requesters (by email) actually present in the loaded requests, displayed via name map
  const reqMap={};
  _vrAll.forEach(r=>{
    const email=String(r.submitted_by||'').toLowerCase().trim();
    if(!email||reqMap[email])return;
    reqMap[email]={email,name:_vrNameMap[email]||r.submitted_by};
  });
  _vrRequesterFilterList=Object.values(reqMap).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
}
function _vrVendorFilterRender(q){
  const dd=document.getElementById('vrVendorFilterDropdown');if(!dd)return;
  const list=q?_vrVendorFilterList.filter(v=>v.toLowerCase().includes(q)):_vrVendorFilterList;
  let html=`<div class="vf-vendor-option" onmousedown="_vrVendorFilterSelect('')" style="font-weight:700;color:var(--muted);">— All Vendors —</div>`;
  html+=list.slice(0,100).map(v=>`<div class="vf-vendor-option" onmousedown="_vrVendorFilterSelect('${v.replace(/'/g,"\\'")}')">${v}</div>`).join('');
  dd.innerHTML=html;
  dd.style.display='block';
}
function _vrVendorFilterType(){_vrVendorFilterRender((document.getElementById('vrVendorFilterInput').value||'').toLowerCase());}
function _vrVendorFilterOpenFn(){_vrVendorFilterRender((document.getElementById('vrVendorFilterInput').value||'').toLowerCase());}
function _vrVendorFilterBlur(){setTimeout(()=>{const dd=document.getElementById('vrVendorFilterDropdown');if(dd)dd.style.display='none';},180);}
function _vrVendorFilterSelect(v){
  _vrFilterVendor=v;
  document.getElementById('vrVendorFilterInput').value=v;
  document.getElementById('vrVendorFilterDropdown').style.display='none';
  _vrApplyFilter();
}
function _vrReqFilterRender(q){
  const dd=document.getElementById('vrReqFilterDropdown');if(!dd)return;
  const list=q?_vrRequesterFilterList.filter(p=>String(p.name).toLowerCase().includes(q)):_vrRequesterFilterList;
  let html=`<div class="vf-vendor-option" onmousedown="_vrReqFilterSelect('','')" style="font-weight:700;color:var(--muted);">— All People —</div>`;
  html+=list.slice(0,100).map(p=>`<div class="vf-vendor-option" onmousedown="_vrReqFilterSelect('${p.email}','${String(p.name).replace(/'/g,"\\'")}')">${p.name}</div>`).join('');
  dd.innerHTML=html;
  dd.style.display='block';
}
function _vrReqFilterType(){_vrReqFilterRender((document.getElementById('vrReqFilterInput').value||'').toLowerCase());}
function _vrReqFilterOpenFn(){_vrReqFilterRender((document.getElementById('vrReqFilterInput').value||'').toLowerCase());}
function _vrReqFilterBlur(){setTimeout(()=>{const dd=document.getElementById('vrReqFilterDropdown');if(dd)dd.style.display='none';},180);}
function _vrReqFilterSelect(email,name){
  _vrFilterRequester=email;
  document.getElementById('vrReqFilterInput').value=name;
  document.getElementById('vrReqFilterDropdown').style.display='none';
  _vrApplyFilter();
}
function vrSetFilter(mode,btn){
  _vrFilterMode=mode;
  document.querySelectorAll('.vr-fbtn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  _vrApplyFilter();
}
function vrApplyFilter(){_vrApplyFilter();}
function _vrApplyFilter(){
  const q=(document.getElementById('vrSearch')?.value||'').toLowerCase().trim();
  _vrFiltered=_vrAll.filter(r=>{
    if(_vrFilterMode==='On Hold'&&r.status!=='On Hold')return false;
    if(_vrFilterMode==='Approved'&&r.status!=='Approved')return false;
    if(_vrFilterMode==='Declined'&&r.status!=='Declined')return false;
    if(_vrFilterMode==='Paid'&&r.payment_status!=='Paid')return false;
    if(_vrFilterVendor&&r.vendor_name!==_vrFilterVendor)return false;
    if(_vrFilterRequester&&String(r.submitted_by||'').toLowerCase().trim()!==_vrFilterRequester)return false;
    if(q){const name=(_vrNameMap[String(r.submitted_by||'').toLowerCase()]||r.submitted_by||'').toLowerCase();const hay=[r.vendor_name,r.product_name,r.location,r.submitted_by,name,String(r.amount||'')].join(' ').toLowerCase();if(!hay.includes(q))return false;}
    return true;
  });
  _vrRenderTable();
  _vrRenderKPIs();
  _vrLoadAmountKPIs();
}

// ── BADGES ─────────────────────────────────────────
function _vrStatusBadge(s){const m={Approved:{bg:'rgba(34,197,94,0.12)',c:'#22c55e'},Declined:{bg:'rgba(239,68,68,0.1)',c:'#ef4444'},'On Hold':{bg:'rgba(245,158,11,0.1)',c:'#f59e0b'}};const t=m[s]||m['On Hold'];return`<span class="vr-badge" style="background:${t.bg};color:${t.c};border:1px solid ${t.c}44;">${s||'On Hold'}</span>`;}
function _vrPayBadge(s){if(s==='Paid')return`<span class="vr-badge" style="background:rgba(168,85,247,0.12);color:#a855f7;border:1px solid rgba(168,85,247,0.3);">💳 Paid</span>`;return`<span class="vr-badge" style="background:rgba(107,114,128,0.1);color:var(--muted);border:1px solid var(--border);">Unpaid</span>`;}

// ── RENDER TABLE ───────────────────────────────────
function _vrRenderTable(){
  const tbody=document.getElementById('vrTbody');
  const tw=document.getElementById('vrTableWrap');
  const em=document.getElementById('vrEmpty');
  if(!tbody)return;
  if(!_vrFiltered.length){if(tw)tw.style.display='none';if(em)em.style.display='block';return;}
  if(em)em.style.display='none';
  if(tw)tw.style.display='block';
  tbody.innerHTML=_vrFiltered.map(r=>{
    const d=r.created_at?new Date(r.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';
    const nameDisplay=_vrNameMap[String(r.submitted_by||'').toLowerCase()]||r.submitted_by||'—';
    const status=r.status||'On Hold';
    // Row is selectable for bulk "Mark as Paid" if the viewer has EA or Accounts rights
    // and the request is Approved + still Unpaid. (Previously this checkbox only ever
    // appeared for non-EA accounts users, which is why it never showed up for EA/owner roles.)
    const canPay=(_vrIsAccounts()||_vrIsEA())&&status==='Approved'&&r.payment_status!=='Paid';
    const payCb=canPay?`<input type="checkbox" class="vr-row-cb" data-id="${r.id}" onclick="event.stopPropagation()" onchange="vrUpdateBulkBtn()" title="Select to mark as Paid" style="width:16px;height:16px;cursor:pointer;accent-color:#3b82f6;margin-right:6px;vertical-align:middle;">`:'';
    const canDelete=(typeof PERMISSIONS!=='undefined'&&PERMISSIONS&&PERMISSIONS.vendor_delete==='true')||_vrIsEA()||(String(r.submitted_by||'').toLowerCase()===_vrMyEmail());
    const canEdit=r.status==='On Hold'&&(_vrIsEA()||(String(r.submitted_by||'').toLowerCase()===_vrMyEmail()));
    const editBtn=canEdit?`<button class="vr-act" style="background:rgba(78,154,241,0.12);color:#4e9af1;border:1px solid rgba(78,154,241,0.35);margin-left:5px;" onclick="event.stopPropagation();openVendorEditForm(${r.id})" title="Edit request">✏️ Edit</button>`:'';
    const delBtn=canDelete?`<button class="vr-act" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.3);margin-left:5px;" onclick="vrDeleteRequest(${r.id},event)" title="Delete request">🗑</button>`:'';
    const attachCell=r.invoice_link
      ?`<a href="${r.invoice_link}" target="_blank" onclick="event.stopPropagation()" title="View uploaded invoice / quotation" style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:7px;background:rgba(78,154,241,0.12);border:1px solid rgba(78,154,241,0.3);color:#4e9af1;text-decoration:none;font-size:0.95rem;">📎</a>`
      :`<span style="color:var(--muted);font-size:0.8rem;">—</span>`;
    return`<tr onclick="openVrModal(${r.id})" title="Click row to view details" style="cursor:pointer;"><td style="color:var(--muted);font-size:0.78rem;white-space:nowrap;">${d}</td><td><div style="font-weight:700;font-size:0.85rem;color:var(--text);">${nameDisplay}</div></td><td><div style="font-weight:700;font-size:0.85rem;">${r.vendor_name||'—'}</div></td><td style="max-width:180px;"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.product_name||''}">${r.product_name||'—'}</div></td><td style="text-align:center;">${r.qty||'—'}</td><td style="font-weight:700;white-space:nowrap;text-align:right;">₹${r.amount!=null?Number(r.amount).toLocaleString('en-IN',{maximumFractionDigits:0}):'—'}</td><td style="font-size:0.82rem;">${r.location||'—'}</td><td>${_vrStatusBadge(status)}</td><td>${_vrPayBadge(r.payment_status)}</td><td style="text-align:center;">${attachCell}</td><td style="white-space:nowrap;">${payCb}${editBtn}${delBtn}</td></tr>`;
  }).join('');
}

// ── VENDOR BUTTON VISIBILITY ───────────────────────
// Called after PERMISSIONS loads — shows Purchase Request button if allowed
function _vrCheckBtnAccess(){
  const btn=document.getElementById('vendorPurchaseBtn');
  const r=_vrRole();
  const alwaysAllow=r==='mis';
  const hasPermission=typeof PERMISSIONS!=='undefined'&&PERMISSIONS&&PERMISSIONS.vendor_access==='true';
  if(btn){
    if(alwaysAllow||hasPermission){
      btn.style.display='flex';
    } else {
      btn.style.display='none';
    }
  }
  _injectPurchaseCard();
}

function _injectPurchaseCard() {
  if (document.getElementById('purchase-request-card')) return;
  const rawRole = String((CURRENT_USER && (CURRENT_USER.rawRole || CURRENT_USER.role)) || '').toLowerCase().trim();
  const isMIS = (rawRole === 'mis' || rawRole === 'managing director' || rawRole === 'owner');
  const hasVendorAccess = PERMISSIONS && PERMISSIONS.vendor_access === 'true';
  if (!isMIS && !hasVendorAccess) return;
  const gridEl = document.getElementById('finance-grid');
  if (!gridEl) return;
  const card = document.createElement('div');
  card.id = 'purchase-request-card';
  card.style.cssText = 'position:relative;';
  card.innerHTML = `
    <div class="home-card" style="--card-top:#f0a500;cursor:pointer;border-top:3px solid #f0a500;"
      onclick="openVrDash()"
      onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 36px rgba(0,0,0,0.3)';this.style.borderColor='#f0a500'"
      onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor=''">
      <div class="hc-icon" style="background:rgba(240,165,0,0.12);border-color:rgba(240,165,0,0.3);color:#f0a500;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
      </div>
      <div class="hc-name">Purchase Request</div>
      <div class="hc-desc" style="font-size:0.88rem;line-height:1.55;color:var(--muted);">Submit vendor payment requests, track approvals and manage purchase history.</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;">
        <span class="hc-status live" style="background:rgba(240,165,0,0.12);color:#f0a500;border:1px solid rgba(240,165,0,0.3);">💰 Vendor Payments</span>
        <span style="font-size:0.78rem;font-weight:600;color:#f0a500;">Open →</span>
      </div>
    </div>`;
  gridEl.insertBefore(card, gridEl.firstChild);
}  

// ── OPEN VENDOR DASHBOARD (called by Purchase Request button) ──
function openVrDash(){
  document.getElementById('vrDashOverlay').style.display='block';
  document.body.style.overflow='hidden';
  loadVendorRequests();
}
function closeVrDash(){
  document.getElementById('vrDashOverlay').style.display='none';
  document.body.style.overflow='';
}

// ── SUBMIT FORM ────────────────────────────────────
async function openVendorForm(){
  document.getElementById('vfErr').style.display='none';
  ['vfProduct','vfQty','vfAmount','vfInvNo','vfPoNo'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('vfLocation').value='';
  document.getElementById('vfVendorSel').value='';
  document.getElementById('vfVendorSearch').value='';
  document.getElementById('vfVendorSearch').value='';
  document.getElementById('vfNewVendorBox').style.display='none';
  const fi=document.getElementById('vfInvFile');if(fi)fi.value='';
  document.getElementById('vfInvFileName').textContent='No file chosen';
  const lbl=document.getElementById('vfInvUploadLabel');if(lbl)lbl.style.background='rgba(78,154,241,0.08)';

  await _vrLoadVendors();
  document.getElementById('vfOverlay').style.display='block';
}
function closeVendorForm(){document.getElementById('vfOverlay').style.display='none'; _vrResetFormToNew && _vrResetFormToNew();}
function vfToggleNewVendor(){
  const box=document.getElementById('vfNewVendorBox');
  box.style.display=box.style.display==='none'?'block':'none';
  if(box.style.display==='block'){['nvName','nvContact','nvNotes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById('nvErr').style.display='none';}
}
async function saveNewVendor(){
  const name=(document.getElementById('nvName').value||'').trim();
  const errEl=document.getElementById('nvErr');
  const btn=document.getElementById('nvSaveBtn');
  errEl.style.display='none';
  if(!name){errEl.textContent='⚠️ Vendor name is required.';errEl.style.display='block';return;}
  btn.disabled=true;btn.textContent='Saving…';
  try{
const payload={vendor_name:name,contact:document.getElementById('nvContact').value.trim()||null,notes:document.getElementById('nvNotes').value.trim()||null,created_by:_vrMyEmail()};    const res=await fetch(`${SUPABASE_URL}/rest/v1/vendors`,{method:'POST',headers:{...SB_HDRS_JSON(),'Prefer':'return=representation','Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!res.ok){const t=await res.text();throw new Error(t);}
    const newVendors=await res.json();
    const newV=newVendors[0];
    _vrVendors.push(newV);_vrVendors.sort((a,b)=>a.vendor_name.localeCompare(b.vendor_name));
    _vrPopulateVendorDropdown();
    document.getElementById('vfVendorSel').value=newV.id;
    document.getElementById('vfVendorSearch').value=newV.vendor_name;
    document.getElementById('vfVendorSearch').value=newV.vendor_name;
    document.getElementById('vfNewVendorBox').style.display='none';
    if(typeof showToast==='function')showToast('✅ Vendor added!','success',2000);
  }catch(e){
    errEl.textContent=(e.message&&e.message.toLowerCase().includes('unique'))?'⚠️ A vendor with this name already exists.':'❌ '+e.message;
    errEl.style.display='block';
  }finally{btn.disabled=false;btn.textContent='Save Vendor';}
}
async function submitVendorRequest(){
  const errEl=document.getElementById('vfErr');
  const btn=document.getElementById('vfSubmitBtn');
  errEl.style.display='none';
  const sel=document.getElementById('vfVendorSel');
  const vendorId=sel.value;
  const vendorName=sel.options[sel.selectedIndex]?.dataset?.name||'';
  const product=(document.getElementById('vfProduct').value||'').trim();
  const amount=document.getElementById('vfAmount').value;
  const location=document.getElementById('vfLocation').value;
  if(!vendorId){errEl.textContent='⚠️ Please select a vendor.';errEl.style.display='block';return;}
  if(!product){errEl.textContent='⚠️ Product / Service is required.';errEl.style.display='block';return;}
  if(!amount||isNaN(Number(amount))||Number(amount)<=0){errEl.textContent='⚠️ Please enter a valid amount.';errEl.style.display='block';return;}
  if(!location){errEl.textContent='⚠️ Please select a location.';errEl.style.display='block';return;}
  const invNo=(document.getElementById('vfInvNo').value||'').trim();
  const poNo=(document.getElementById('vfPoNo').value||'').trim();
  const invFile=document.getElementById('vfInvFile')?.files?.[0];
  if(!invNo){errEl.textContent='⚠️ Invoice Number is required.';errEl.style.display='block';return;}
  if(!poNo){errEl.textContent='⚠️ PO Number is required.';errEl.style.display='block';return;}
  if(!invFile){errEl.textContent='⚠️ Please upload an Invoice / Quotation file.';errEl.style.display='block';return;}
  btn.disabled=true;btn.textContent='Submitting…';
  try{
    let invoiceUrl=null;
    const invFile=document.getElementById('vfInvFile')?.files?.[0];
    if(invFile){
      btn.textContent='Uploading invoice…';
      try{
        invoiceUrl=await _vrUploadFile(invFile,'vendor-attachments','invoices');
      }catch(e){
        console.warn('Invoice upload failed, proceeding without it:',e.message);
        invoiceUrl=null;
      }
    }
    btn.textContent='Saving…';
    // Look up Emp_id from Employee_details to properly link to employee record
    let empId=null;
    try{
      const empLookup=await fetch(
        `${SUPABASE_URL}/rest/v1/Employee_details?select=Emp_id&Email_Id=ilike.${encodeURIComponent(_vrMyEmail())}&limit=1`,
        {headers:SB_HDRS()}
      );
      const empRows=empLookup.ok?await empLookup.json():[];
      if(empRows&&empRows[0])empId=empRows[0].Emp_id||null;
    }catch(e){ /* non-fatal, submit anyway */ }
    const payload={submitted_by:_vrMyEmail(),submitted_by_emp_id:empId,vendor_id:parseInt(vendorId),vendor_name:vendorName,product_name:product,qty:parseInt(document.getElementById('vfQty').value)||null,amount:parseFloat(amount),location,invoice_number:document.getElementById('vfInvNo').value.trim()||null,po_number:document.getElementById('vfPoNo').value.trim()||null,invoice_link:invoiceUrl,status:'On Hold',payment_status:'Unpaid'};
    const res=await fetch(`${SUPABASE_URL}/rest/v1/vendor_requests`,{method:'POST',headers:{...SB_HDRS_JSON(),'Prefer':'return=minimal'},body:JSON.stringify(payload)});
    if(!res.ok){const t=await res.text();throw new Error(t);}
    closeVendorForm();
    if(typeof showToast==='function')showToast('✅ Purchase request submitted!','success',3000);
    _vrLoaded=false;await loadVendorRequests(true);
  }catch(e){
  const msg=e.message||'';
  if(msg.includes('23505')||msg.includes('unique_vendor_invoice')){
    errEl.textContent='⚠️ This invoice number is already submitted for this vendor. Please check for duplicates.';
  } else {
    errEl.textContent='❌ '+msg;
  }
  errEl.style.display='block';
}
  finally{btn.disabled=false;btn.textContent='🚀 Submit for Approval';}
}

// ── EDIT PURCHASE REQUEST ───────────────────────────────────────────────
let _vrEditId = null;

async function openVendorEditForm(id){
  const r = _vrAll.find(x => x.id === id);
  if(!r){ return; }
  if(r.status !== 'On Hold'){
    if(typeof showToast==='function') showToast('⚠️ Only "On Hold" requests can be edited.','error',3000);
    return;
  }

  _vrEditId = id;

  // Load vendors first so dropdown is populated
  await _vrLoadVendors();

  // Switch form header to Edit mode
  document.querySelector('#vfBox .vfh-title').textContent = '✏️ Edit Purchase Request';
  document.querySelector('#vfBox .vfh-sub').textContent = 'Update the details and save changes';

  // Pre-fill fields
  const sel = document.getElementById('vfVendorSel');
  sel.value = r.vendor_id ? String(r.vendor_id) : '';
  document.getElementById('vfVendorSearch').value = r.vendor_name || '';
  // If vendor not in list (edge case), add a temporary option
  if(sel.value === '' && r.vendor_name){
    const opt = document.createElement('option');
    opt.value = r.vendor_id || 'existing';
    opt.textContent = r.vendor_name;
    opt.dataset.name = r.vendor_name;
    sel.appendChild(opt);
    sel.value = opt.value;
  }
  document.getElementById('vfVendorSearch').value = r.vendor_name || '';
  document.getElementById('vfProduct').value  = r.product_name || '';
  document.getElementById('vfQty').value      = r.qty != null ? r.qty : '';
  document.getElementById('vfAmount').value   = r.amount != null ? r.amount : '';
  document.getElementById('vfLocation').value = r.location || '';
  document.getElementById('vfInvNo').value    = r.invoice_number || '';
  document.getElementById('vfPoNo').value     = r.po_number || '';

  // Reset file input (existing invoice link shown as info)
  const fi = document.getElementById('vfInvFile'); if(fi) fi.value='';
  const fnEl = document.getElementById('vfInvFileName');
  if(fnEl) fnEl.textContent = r.invoice_link ? '📄 Existing file kept (upload to replace)' : 'No file chosen';

  // Hide new vendor box
  document.getElementById('vfNewVendorBox').style.display = 'none';
  document.getElementById('vfErr').style.display = 'none';

  // Swap submit button to update mode
  const btn = document.getElementById('vfSubmitBtn');
  btn.textContent = '💾 Save Changes';
  btn.onclick = () => submitVendorEdit();

  document.getElementById('vfOverlay').style.display = 'block';
}

async function submitVendorEdit(){
  const errEl = document.getElementById('vfErr');
  const btn   = document.getElementById('vfSubmitBtn');
  errEl.style.display = 'none';

  const sel       = document.getElementById('vfVendorSel');
  const vendorId  = sel.value;
  const vendorName= sel.options[sel.selectedIndex]?.dataset?.name || sel.options[sel.selectedIndex]?.textContent || '';
  const product   = (document.getElementById('vfProduct').value || '').trim();
  const amount    = document.getElementById('vfAmount').value;
  const location  = document.getElementById('vfLocation').value;

  if(!vendorId)   { errEl.textContent='⚠️ Please select a vendor.'; errEl.style.display='block'; return; }
  if(!product)    { errEl.textContent='⚠️ Product / Service is required.'; errEl.style.display='block'; return; }
  if(!amount || isNaN(Number(amount)) || Number(amount) <= 0){ errEl.textContent='⚠️ Please enter a valid amount.'; errEl.style.display='block'; return; }
  if(!location)   { errEl.textContent='⚠️ Please select a location.'; errEl.style.display='block'; return; }

  btn.disabled = true; btn.textContent = 'Saving…';

  try{
    // Check if a new invoice file was chosen
    let invoiceUrl = (_vrAll.find(x=>x.id===_vrEditId)||{}).invoice_link || null;
    const invFile = document.getElementById('vfInvFile')?.files?.[0];
    if(invFile){
      btn.textContent = 'Uploading invoice…';
      try{ invoiceUrl = await _vrUploadFile(invFile,'vendor-attachments','invoices'); }
      catch(e){ console.warn('Invoice upload failed:', e.message); }
    }

    btn.textContent = 'Saving…';
    const payload = {
      vendor_id:       parseInt(vendorId) || null,
      vendor_name:     vendorName,
      product_name:    product,
      qty:             parseInt(document.getElementById('vfQty').value) || null,
      amount:          parseFloat(amount),
      location,
      invoice_number:  document.getElementById('vfInvNo').value.trim() || null,
      po_number:       document.getElementById('vfPoNo').value.trim() || null,
      invoice_link:    invoiceUrl
    };

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/vendor_requests?id=eq.${_vrEditId}`,
      { method:'PATCH', headers:{...SB_HDRS_JSON(),'Prefer':'return=minimal'}, body:JSON.stringify(payload) }
    );
    if(!res.ok){ const t = await res.text(); throw new Error(t); }

    // Update local data
    const idx = _vrAll.findIndex(x => x.id === _vrEditId);
    if(idx !== -1) _vrAll[idx] = { ..._vrAll[idx], ...payload };

    // Reset form to new-request mode
    _vrResetFormToNew();
    closeVendorForm();
    if(typeof showToast==='function') showToast('✅ Request updated successfully!','success',3000);
    _vrApplyFilter();
    _vrRenderKPIs();
    _vrLoadAmountKPIs();
  }catch(e){
    errEl.textContent = '❌ ' + e.message;
    errEl.style.display = 'block';
  }finally{
    btn.disabled = false;
    btn.textContent = '💾 Save Changes';
  }
}

function _vrResetFormToNew(){
  _vrEditId = null;
  const titleEl = document.querySelector('#vfBox .vfh-title');
  const subEl   = document.querySelector('#vfBox .vfh-sub');
  if(titleEl) titleEl.textContent = '📦 New Purchase Request';
  if(subEl)   subEl.textContent   = 'Submit a vendor payment request for approval';
  const btn = document.getElementById('vfSubmitBtn');
  if(btn){ btn.textContent = '🚀 Submit for Approval'; btn.onclick = submitVendorRequest; }
}

function openVrModal(id){
  const r=_vrAll.find(x=>x.id===id);if(!r)return;
  _vrCurId=id;
  document.getElementById('vrmVendor').textContent=r.vendor_name||'—';
  document.getElementById('vrmProduct').textContent=r.product_name||'—';
  const nameDisplay=_vrNameMap[String(r.submitted_by||'').toLowerCase()]||r.submitted_by||'—';
  const d=r.created_at?new Date(r.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
  const details=[['Requested By',nameDisplay],['Date',d],['Amount',r.amount!=null?'₹'+Number(r.amount).toLocaleString('en-IN'):'—'],['Quantity',r.qty||'—'],['Location',r.location||'—'],['Invoice #',r.invoice_number||'—'],['PO No. (Odoo)',r.po_number||'—'],['Status',r.status||'On Hold'],['Payment',r.payment_status||'Unpaid'],...(r.remarks?[['Remarks',r.remarks]]:[]),...(r.reviewed_by?[['Reviewed By',_vrNameMap[String(r.reviewed_by||'').toLowerCase()]||r.reviewed_by]]:[]),...(r.utr_number?[['UTR Number',r.utr_number]]:[]),...(r.paid_by?[['Paid By',_vrNameMap[String(r.paid_by||'').toLowerCase()]||r.paid_by]]:[])];
  document.getElementById('vrmDetailsGrid').innerHTML=details.map(([l,v])=>`<div class="vrm-item"><div class="vrm-lbl">${l}</div><div class="vrm-val">${v}</div></div>`).join('');
  // Invoice attachment
  const invLinkWrap=document.getElementById('vrmInvLinkWrap');
  const invNoLink=document.getElementById('vrmInvNoLink');
  if(r.invoice_link){
    document.getElementById('vrmInvLink').href=r.invoice_link;
    invLinkWrap.style.display='block';
    invNoLink.style.display='none';
  }else{
    invLinkWrap.style.display='none';
    invNoLink.style.display='block';
  }
  // Payment attachment
  const payLinkWrap=document.getElementById('vrmPayAttachLinkWrap');
  const payNoLink=document.getElementById('vrmPayNoLink');
  if(r.payment_attachment){
    document.getElementById('vrmPayAttachLink').href=r.payment_attachment;
    payLinkWrap.style.display='block';
    payNoLink.style.display='none';
  }else{
    payLinkWrap.style.display='none';
    payNoLink.style.display='block';
  }
  const eaSect=document.getElementById('vrmEASection');
  const acctSect=document.getElementById('vrmAcctSection');
  eaSect.style.display='none';acctSect.style.display='none';
  if(_vrIsEA()){eaSect.style.display='block';document.getElementById('vrmStatus').value=r.status||'On Hold';document.getElementById('vrmRemarks').value=r.remarks||'';}
  if(_vrIsAccounts()&&r.status==='Approved'&&r.payment_status!=='Paid'){
    acctSect.style.display='block';
    document.getElementById('vrmUTR').value=r.utr_number||'';
    const paf=document.getElementById('vrmAttachFile');if(paf)paf.value='';
    document.getElementById('vrmAttachName').textContent='No file chosen';
  }
  document.getElementById('vrmMsg').style.display='none';
  const modal=document.getElementById('vrModal');modal.style.display='flex';document.body.style.overflow='hidden';
}
function closeVrModal(){document.getElementById('vrModal').style.display='none';}

// ── EA: SAVE DECISION ──────────────────────────────
async function vrSaveDecision(){
  if(!_vrCurId)return;
  const msgEl=document.getElementById('vrmMsg');msgEl.style.display='none';
  const status=document.getElementById('vrmStatus').value;
  const remarks=(document.getElementById('vrmRemarks').value||'').trim();
  try{
    const payload={status,remarks:remarks||null,reviewed_by:_vrMyEmail(),reviewed_at:new Date().toISOString()};
    const res=await fetch(`${SUPABASE_URL}/rest/v1/vendor_requests?id=eq.${_vrCurId}`,{method:'PATCH',headers:{...SB_HDRS_JSON(),'Prefer':'return=minimal'},body:JSON.stringify(payload)});
    if(!res.ok){const t=await res.text();throw new Error(t);}
    const idx=_vrAll.findIndex(x=>x.id===_vrCurId);if(idx!==-1)_vrAll[idx]={..._vrAll[idx],...payload};
    msgEl.style.cssText='display:block;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:9px;color:#22c55e;padding:10px;';msgEl.textContent='✅ Decision saved!';
    _vrRenderKPIs();_vrLoadAmountKPIs();_vrApplyFilter();
    if(typeof showToast==='function')showToast('✅ Decision saved!','success',2500);
    setTimeout(closeVrModal,1200);
  }catch(e){msgEl.style.cssText='display:block;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:9px;color:#ef4444;padding:10px;';msgEl.textContent='❌ '+e.message;}
}

// ── ACCOUNTS: MARK PAID ────────────────────────────
async function vrMarkPaid(){
  if(!_vrCurId)return;
  const msgEl=document.getElementById('vrmMsg');msgEl.style.display='none';
  const utr=(document.getElementById('vrmUTR').value||'').trim();
  try{
    let attachUrl=null;
    const attachFile=document.getElementById('vrmAttachFile')?.files?.[0];
    if(attachFile){
      msgEl.style.cssText='display:block;background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.3);border-radius:9px;color:#a855f7;padding:10px;';
      msgEl.textContent='⏳ Uploading payment proof…';
      try{
        attachUrl=await _vrUploadFile(attachFile,'vendor-attachments','payments');
      }catch(e){
        // Upload failed — proceed without attachment, can be added later
        console.warn('Attachment upload failed, proceeding without it:',e.message);
        attachUrl=null;
      }
    }
    msgEl.textContent='⏳ Saving…';
    const payload={payment_status:'Paid',utr_number:utr,payment_attachment:attachUrl,paid_by:_vrMyEmail(),paid_at:new Date().toISOString()};
    const res=await fetch(`${SUPABASE_URL}/rest/v1/vendor_requests?id=eq.${_vrCurId}`,{method:'PATCH',headers:{...SB_HDRS_JSON(),'Prefer':'return=minimal'},body:JSON.stringify(payload)});
    if(!res.ok){const t=await res.text();throw new Error(t);}
    const idx=_vrAll.findIndex(x=>x.id===_vrCurId);if(idx!==-1)_vrAll[idx]={..._vrAll[idx],...payload};
    msgEl.style.cssText='display:block;background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.3);border-radius:9px;color:#a855f7;padding:10px;';
    msgEl.textContent='💳 Marked as PAID!';
    _vrRenderKPIs();_vrLoadAmountKPIs();_vrApplyFilter();
    if(typeof showToast==='function')showToast('💳 Payment recorded!','success',2500);
    setTimeout(closeVrModal,1200);
  }catch(e){
    msgEl.style.cssText='display:block;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:9px;color:#ef4444;padding:10px;';
    msgEl.textContent='❌ '+e.message;
  }
}

// ── BULK PAY ───────────────────────────────────────
async function vrBulkPay(){
  const checked=[...document.querySelectorAll('.vr-row-cb:checked')];
  if(!checked.length){if(typeof showToast==='function')showToast('⚠️ No row selected','error',2000);return;}
  if(!confirm(`Mark ${checked.length} row(s) as Paid?`))return;
  const ids=checked.map(cb=>parseInt(cb.dataset.id));
  const payload={payment_status:'Paid',utr_number:'',paid_by:_vrMyEmail(),paid_at:new Date().toISOString()};
  let ok=0,fail=0;
  for(const id of ids){
    try{
      const res=await fetch(`${SUPABASE_URL}/rest/v1/vendor_requests?id=eq.${id}`,{method:'PATCH',headers:{...SB_HDRS_JSON(),'Prefer':'return=minimal'},body:JSON.stringify(payload)});
      if(!res.ok)throw new Error();
      const idx=_vrAll.findIndex(x=>x.id===id);if(idx!==-1)_vrAll[idx]={..._vrAll[idx],...payload};
      ok++;
    }catch{fail++;}
  }
  _vrRenderKPIs();_vrLoadAmountKPIs();_vrApplyFilter();
  if(typeof showToast==='function')showToast(`💳 ${ok} paid, ${fail} failed`,'success',3000);
}  
function vrUpdateBulkBtn(){
  const any=document.querySelector('.vr-row-cb:checked');
  document.getElementById('vrBulkPayBtn').style.display=any?'':'none';
}  

// ── FILE HELPERS ───────────────────────────────────
function vfInvFileChosen(input){
  const name=input.files[0]?input.files[0].name:'No file chosen';
  document.getElementById('vfInvFileName').textContent=name;
  const label=document.getElementById('vfInvUploadLabel');
  if(input.files[0])label.style.background='rgba(78,154,241,0.18)';
}
function vrmAttachFileChosen(input){
  document.getElementById('vrmAttachName').textContent=input.files[0]?input.files[0].name:'No file chosen';
}
async function _vrUploadFile(file, bucket, folder){
  if(!file)return null;
  const ext=file.name.split('.').pop().toLowerCase();
  const safeName=`${folder}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
  // Storage API needs apikey + Authorization but NOT Accept:application/json
  const res=await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${safeName}`,{
    method:'POST',
    headers:{
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${_currentToken}`,
      'Content-Type': file.type||'application/octet-stream',
      'x-upsert': 'true'
    },
    body:file
  });
  if(!res.ok){const t=await res.text();throw new Error('Upload failed: '+t);}
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${safeName}`;
}

// ── DELETE REQUEST ─────────────────────────────────
async function vrDeleteRequest(id, event){
  if(event)event.stopPropagation();
  const r=_vrAll.find(x=>x.id===id);
  if(!r)return;
  // Confirm before deleting
  const vendorName=r.vendor_name||'this request';
  const confirmed=confirm(`Delete purchase request from ${vendorName}?\n\nThis cannot be undone.`);
  if(!confirmed)return;
  try{
    const res=await fetch(`${SUPABASE_URL}/rest/v1/vendor_requests?id=eq.${id}`,{
      method:'DELETE',
      headers:SB_HDRS()
    });
    if(!res.ok){const t=await res.text();throw new Error(t);}
    // Remove from local state
    _vrAll=_vrAll.filter(x=>x.id!==id);
    _vrRenderKPIs();
    _vrLoadAmountKPIs();
    _vrApplyFilter();
    if(typeof showToast==='function')showToast('🗑 Request deleted','success',2000);
  }catch(e){
    if(typeof showToast==='function')showToast('❌ Delete failed: '+e.message,'error',3000);
    else alert('❌ Delete failed: '+e.message);
  }
}

// ── CLOSE ON BACKDROP CLICK ─────────────────────────────────────────────────────────
const _vfOv = document.getElementById('vfOverlay');
const _vrMo = document.getElementById('vrModal');
const _vrRe = document.getElementById('vrRecurModal');
if(_vfOv) _vfOv.addEventListener('click',function(e){if(e.target===this)closeVendorForm();});
if(_vrMo) _vrMo.addEventListener('click',function(e){if(e.target===this)closeVrModal();});
if(_vrRe) _vrRe.addEventListener('click',function(e){if(e.target===this)closeRecurringModal();});

// ── RECURRING REQUEST ───────────────────────────────────────────────────────────────

function openRecurringModal(id){
  const r = _vrAll.find(x => x.id === id);
  if(!r) return;
  _vrRecurSourceId = id;

  // Fill read-only preview fields
  document.getElementById('vrrVendor').textContent   = r.vendor_name  || '—';
  document.getElementById('vrrProduct').textContent  = r.product_name || '—';
  document.getElementById('vrrQty').textContent      = r.qty != null ? r.qty : '—';
  document.getElementById('vrrLocation').textContent = r.location     || '—';

  // Set amount to previous amount as default (user can change)
  document.getElementById('vrrAmount').value = r.amount != null ? r.amount : '';

  document.getElementById('vrrErr').style.display  = 'none';
  document.getElementById('vrrMsg').style.display  = 'none';
  const btn = document.getElementById('vrrSubmitBtn');
  btn.disabled = false; btn.textContent = '🔁 Submit Recurring Request';
  btn.onclick = submitRecurringRequest;

  document.getElementById('vrRecurModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeRecurringModal(){
  document.getElementById('vrRecurModal').style.display = 'none';
  document.body.style.overflow = '';
  _vrRecurSourceId = null;
}

async function submitRecurringRequest(){
  const errEl = document.getElementById('vrrErr');
  const msgEl = document.getElementById('vrrMsg');
  const btn   = document.getElementById('vrrSubmitBtn');
  errEl.style.display = 'none';
  msgEl.style.display = 'none';

  const amount = document.getElementById('vrrAmount').value;
  if(!amount || isNaN(Number(amount)) || Number(amount) <= 0){
    errEl.textContent = '⚠️ Please enter a valid amount.';
    errEl.style.display = 'block';
    return;
  }

  const src = _vrAll.find(x => x.id === _vrRecurSourceId);
  if(!src){ errEl.textContent = '❌ Source request not found.'; errEl.style.display='block'; return; }

  btn.disabled = true; btn.textContent = 'Submitting…';

  try{
    // Look up Emp_id
    let empId = null;
    try{
      const empLookup = await fetch(
        `${SUPABASE_URL}/rest/v1/Employee_details?select=Emp_id&Email_Id=ilike.${encodeURIComponent(_vrMyEmail())}&limit=1`,
        {headers: SB_HDRS()}
      );
      const empRows = empLookup.ok ? await empLookup.json() : [];
      if(empRows && empRows[0]) empId = empRows[0].Emp_id || null;
    }catch(e){ /* non-fatal */ }

    const payload = {
      submitted_by:         _vrMyEmail(),
      submitted_by_emp_id:  empId,
      vendor_id:            src.vendor_id   || null,
      vendor_name:          src.vendor_name || '',
      product_name:         src.product_name|| '',
      qty:                  src.qty         || null,
      location:             src.location    || '',
      invoice_number:       null,
      invoice_link:         null,
      amount:               parseFloat(amount),
      status:               'On Hold',
      payment_status:       'Unpaid'
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/vendor_requests`,{
      method:'POST',
      headers:{...SB_HDRS_JSON(),'Prefer':'return=minimal'},
      body: JSON.stringify(payload)
    });
    if(!res.ok){ const t = await res.text(); throw new Error(t); }

    msgEl.style.cssText = 'display:block;background:rgba(0,212,170,0.1);border:1px solid rgba(0,212,170,0.3);border-radius:9px;color:#00d4aa;padding:10px;font-size:0.84rem;margin-top:12px;';
    msgEl.textContent = '✅ Recurring request submitted successfully!';
    btn.textContent = '✅ Done';

    if(typeof showToast==='function') showToast('✅ Recurring request submitted!','success',3000);
    _vrLoaded = false;
    await loadVendorRequests(true);
    setTimeout(closeRecurringModal, 1400);
  }catch(e){
    errEl.textContent = '❌ ' + e.message;
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = '🔁 Submit Recurring Request';
  }
}

// ===== next block =====

// ============================================================
// SCROLL FIX — MacBook / Desktop scroll restore safety net
// Agar kisi modal ke baad body scroll band reh jaye toh yeh
// automatically restore kar deta hai.
// ============================================================
(function() {
  // Observe all fixed/overlay modals — jab bhi koi hide ho, scroll restore karo
  const observer = new MutationObserver(function(mutations) {
    // Check karo koi bhi visible modal hai ya nahi
    const allModals = document.querySelectorAll(
      '[id$="Modal"],[id$="Overlay"],[id$="modal"],[id$="overlay"],[id$="Panel"]'
    );
    let anyVisible = false;
    allModals.forEach(function(m) {
      const style = window.getComputedStyle(m);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        const pos = style.position;
        if (pos === 'fixed' || pos === 'absolute') {
          anyVisible = true;
        }
      }
    });
    if (!anyVisible) {
      document.body.style.overflow = '';
    }
  });

  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });

  // ESC key se bhi scroll restore ho
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      setTimeout(function() {
        const anyFixed = Array.from(document.querySelectorAll('*')).some(function(el) {
          const s = el.style;
          return s.position === 'fixed' && s.display === 'flex' && el.style.zIndex >= 999;
        });
        if (!anyFixed) {
          document.body.style.overflow = '';
        }
      }, 150);
    }
  });

  // Page switch (nav item click) pe bhi scroll restore karo
  document.addEventListener('click', function(e) {
    if (e.target.closest('.nav-item') || e.target.closest('.mob-nav-item')) {
      setTimeout(function() {
        document.body.style.overflow = '';
      }, 100);
    }
  });
})();