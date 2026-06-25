const STORE_KEY = 'inventory-app-v3';
const LOW_LIMIT = 30;
const defaultMajors = ['AF','CR','PO','EG','GI','PS','CO','HR','GC','AC'];
const defaultMinors = ['0.5','0.8','1','1.2','1.5','1.6','2.0','2.3','3','3.2','4','4.5','5','6','8','9','10','12','15','16','19','20'];

const $ = (id) => document.getElementById(id);
let state = loadState();
let deferredPrompt = null;

function loadState(){
  const saved = localStorage.getItem(STORE_KEY);
  if(saved){
    try { return JSON.parse(saved); } catch(e) {}
  }
  return { majors:[...defaultMajors], minors:[...defaultMinors], stocks:{}, history:[] };
}
function saveState(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function key(major, minor){ return `${major}__${minor}`; }
function labelFromKey(k){ return k.replace('__',' '); }
function stockQty(major, minor){ return Number(state.stocks[key(major, minor)] || 0); }
function setStock(major, minor, qty){ state.stocks[key(major, minor)] = Math.max(0, Number(qty)||0); }
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'),1800); }

function renderAll(){
  renderSelectors(); renderDashboard(); renderCategoryChips(); renderHistory();
}
function renderSelectors(){
  const selects = [$('moveMajor'), $('majorFilter')];
  selects.forEach(sel => {
    const current = sel.value;
    sel.innerHTML = sel.id === 'majorFilter' ? '<option value="">전체 대분류</option>' : '';
    state.majors.forEach(m => sel.insertAdjacentHTML('beforeend', `<option value="${m}">${m}</option>`));
    if([...sel.options].some(o=>o.value===current)) sel.value = current;
  });
  const minorSel = $('moveMinor');
  const currentMinor = minorSel.value;
  minorSel.innerHTML = '';
  state.minors.forEach(m => minorSel.insertAdjacentHTML('beforeend', `<option value="${m}">${m}</option>`));
  if([...minorSel.options].some(o=>o.value===currentMinor)) minorSel.value = currentMinor;
}
function allCombinations(){
  const rows=[];
  state.majors.forEach(major=>state.minors.forEach(minor=>rows.push({major,minor,name:`${major} ${minor}`,qty:stockQty(major,minor)})));
  return rows;
}
function renderDashboard(){
  const search = $('searchInput').value.trim().toLowerCase();
  const majorFilter = $('majorFilter').value;
  const rows = allCombinations();
  const totalStock = rows.reduce((a,r)=>a+r.qty,0);
  const lowRows = rows.filter(r=>r.qty < LOW_LIMIT);
  $('totalItems').textContent = rows.length;
  $('totalStock').textContent = totalStock.toLocaleString('ko-KR');
  $('lowCount').textContent = lowRows.length;
  const filtered = rows.filter(r=>(!majorFilter||r.major===majorFilter) && (!search||r.name.toLowerCase().includes(search)));
  $('stockList').innerHTML = filtered.length ? filtered.map(r=>`
    <article class="stock-card ${r.qty<LOW_LIMIT?'low':''}">
      <div class="name">${r.name}</div>
      <div class="qty ${r.qty<LOW_LIMIT?'low-text':''}">${r.qty.toLocaleString('ko-KR')}</div>
      <div class="sub">${r.qty<LOW_LIMIT?'부족 재고':'정상 재고'}</div>
    </article>`).join('') : '<p class="notice">표시할 품목이 없습니다.</p>';
  $('lowStockList').innerHTML = lowRows.length ? lowRows.slice(0,30).map(r=>`
    <div class="mini-row"><span>${r.name}</span><strong>${r.qty}</strong></div>`).join('') : '<p class="notice">부족 재고가 없습니다.</p>';
}
function renderCategoryChips(){
  $('majorChips').innerHTML = state.majors.map(v=>`<span class="chip">${v}<button data-type="major" data-value="${v}">×</button></span>`).join('');
  $('minorChips').innerHTML = state.minors.map(v=>`<span class="chip">${v}<button data-type="minor" data-value="${v}">×</button></span>`).join('');
}
function renderHistory(){
  $('historyList').innerHTML = state.history.length ? state.history.map(h=>`
    <div class="history-row">
      <div><b>${h.major} ${h.minor}</b><br><small>${h.date}${h.memo ? ' · '+escapeHtml(h.memo) : ''}</small></div>
      <span class="${h.type}">${h.type==='in' ? '+' : '-'}${Number(h.qty).toLocaleString('ko-KR')}</span>
    </div>`).join('') : '<p class="notice">입출고 내역이 없습니다.</p>';
}
function escapeHtml(str){ return String(str).replace(/[&<>'"]/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s])); }
function addUnique(list, value){
  const clean = value.trim().toUpperCase();
  if(!clean) return false;
  if(list.includes(clean)) return false;
  list.push(clean); list.sort((a,b)=>a.localeCompare(b, 'ko', {numeric:true})); return true;
}
function deleteCategory(type, value){
  if(!confirm(`${value} 삭제 시 관련 재고와 내역도 삭제됩니다. 진행할까요?`)) return;
  if(type==='major') state.majors = state.majors.filter(v=>v!==value);
  if(type==='minor') state.minors = state.minors.filter(v=>v!==value);
  Object.keys(state.stocks).forEach(k=>{
    const [mj,mn]=k.split('__');
    if((type==='major'&&mj===value)||(type==='minor'&&mn===value)) delete state.stocks[k];
  });
  state.history = state.history.filter(h=> type==='major' ? h.major!==value : h.minor!==value);
  saveState(); renderAll(); toast('삭제되었습니다.');
}

document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.tab,.view').forEach(el=>el.classList.remove('active'));
  btn.classList.add('active'); $(btn.dataset.view).classList.add('active');
  renderAll();
}));
$('searchInput').addEventListener('input', renderDashboard);
$('majorFilter').addEventListener('change', renderDashboard);
$('movementForm').addEventListener('submit', e=>{
  e.preventDefault();
  const major=$('moveMajor').value, minor=$('moveMinor').value, qty=Number($('moveQty').value), type=document.querySelector('input[name="type"]:checked').value, memo=$('moveMemo').value.trim();
  if(!major || !minor || !qty || qty < 1) return toast('입력값을 확인하세요.');
  const current = stockQty(major, minor);
  if(type==='out' && current < qty) return toast('출고 수량이 현재 재고보다 많습니다.');
  setStock(major, minor, type==='in' ? current + qty : current - qty);
  state.history.unshift({major, minor, qty, type, memo, date:new Date().toLocaleString('ko-KR')});
  state.history = state.history.slice(0,300);
  saveState(); e.target.reset(); renderAll(); toast(type==='in'?'입고 저장 완료':'출고 저장 완료');
});
$('majorForm').addEventListener('submit', e=>{ e.preventDefault(); if(addUnique(state.majors, $('majorName').value)){ saveState(); renderAll(); toast('대분류 추가 완료'); } $('majorName').value=''; });
$('minorForm').addEventListener('submit', e=>{ e.preventDefault(); const v=$('minorName').value.trim(); if(!v) return; if(!state.minors.includes(v)){ state.minors.push(v); state.minors.sort((a,b)=>Number(a)-Number(b)); saveState(); renderAll(); toast('소분류 추가 완료'); } $('minorName').value=''; });
document.addEventListener('click', e=>{ if(e.target.matches('.chip button')) deleteCategory(e.target.dataset.type, e.target.dataset.value); });
$('clearHistory').addEventListener('click',()=>{ if(confirm('입출고 내역만 삭제할까요? 재고 수량은 유지됩니다.')){ state.history=[]; saveState(); renderHistory(); toast('내역 삭제 완료'); }});

window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredPrompt=e; $('installBtn').classList.remove('hidden'); });
$('installBtn').addEventListener('click', async()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); deferredPrompt=null; $('installBtn').classList.add('hidden'); });
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{})); }
renderAll();
