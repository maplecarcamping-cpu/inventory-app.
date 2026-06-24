const KEY='inventory-pwa-v1';let movementType='in';let deferredPrompt=null;
const $=id=>document.getElementById(id);
const seed={items:[{id:crypto.randomUUID(),name:'샘플 품목',stock:10,low:3}],history:[]};
function load(){try{return JSON.parse(localStorage.getItem(KEY))||seed}catch{return seed}}
function save(data){localStorage.setItem(KEY,JSON.stringify(data))}
let data=load();
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function fmt(n){return Number(n||0).toLocaleString('ko-KR')}
function now(){return new Date().toLocaleString('ko-KR',{hour12:false})}
function render(){
 $('totalItems').textContent=fmt(data.items.length);$('totalStock').textContent=fmt(data.items.reduce((s,i)=>s+Number(i.stock||0),0));$('lowItems').textContent=fmt(data.items.filter(i=>Number(i.stock)<=Number(i.low||0)).length);
 const stockList=$('stockList');stockList.innerHTML=data.items.length?'':'<div class="card">등록된 품목이 없습니다.</div>';
 data.items.slice().sort((a,b)=>a.name.localeCompare(b.name,'ko')).forEach(i=>{const low=Number(i.stock)<=Number(i.low||0);stockList.insertAdjacentHTML('beforeend',`<div class="row"><div class="row-main"><div class="row-title">${esc(i.name)}</div><div class="row-sub">부족 기준: ${fmt(i.low)}개</div></div><span class="badge ${low?'low':''}">${fmt(i.stock)}개</span></div>`)});
 const sel=$('movementItem');sel.innerHTML=data.items.map(i=>`<option value="${i.id}">${esc(i.name)} / 현재 ${fmt(i.stock)}개</option>`).join('')||'<option>품목 없음</option>';
 const manage=$('itemManageList');manage.innerHTML=data.items.length?'':'<div class="card">수정할 품목이 없습니다.</div>';
 data.items.forEach(i=>manage.insertAdjacentHTML('beforeend',`<div class="row"><div class="row-main"><div class="row-title">${esc(i.name)}</div><div class="row-sub">현재 ${fmt(i.stock)}개 · 부족 기준 ${fmt(i.low)}개</div></div><div class="actions"><button onclick="renameItem('${i.id}')">이름변경</button><button onclick="adjustItem('${i.id}')">재고수정</button><button class="delete" onclick="deleteItem('${i.id}')">삭제</button></div></div>`));
 const hist=$('historyList');hist.innerHTML=data.history.length?'':'<div class="card">입출고 내역이 없습니다.</div>';
 data.history.slice().reverse().slice(0,100).forEach(h=>hist.insertAdjacentHTML('beforeend',`<div class="row"><div class="row-main"><div class="row-title">${esc(h.itemName)}</div><div class="row-sub">${h.date}${h.memo?' · '+esc(h.memo):''}</div></div><span class="badge ${h.type}">${h.type==='in'?'입고':'출고'} ${fmt(h.qty)}</span></div>`));
}
function esc(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab,.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.tab).classList.add('active');render()});
$('inBtn').onclick=()=>{movementType='in';$('inBtn').classList.add('selected');$('outBtn').classList.remove('selected')};$('outBtn').onclick=()=>{movementType='out';$('outBtn').classList.add('selected');$('inBtn').classList.remove('selected')};
$('addItem').onclick=()=>{const name=$('newItemName').value.trim();const stock=Number($('newItemStock').value||0);const low=Number($('newItemLow').value||0);if(!name)return toast('품목명을 입력하세요.');if(data.items.some(i=>i.name===name))return toast('이미 있는 품목명입니다.');data.items.push({id:crypto.randomUUID(),name,stock,low});data.history.push({itemName:name,type:'in',qty:stock,memo:'초기 재고',date:now()});save(data);$('newItemName').value='';$('newItemStock').value='';$('newItemLow').value='';render();toast('품목이 추가되었습니다.')};
$('saveMovement').onclick=()=>{if(!data.items.length)return toast('먼저 품목을 추가하세요.');const item=data.items.find(i=>i.id===$('movementItem').value);const qty=Number($('qtyInput').value);const memo=$('memoInput').value.trim();if(!item||!qty||qty<1)return toast('수량을 확인하세요.');if(movementType==='out'&&item.stock<qty&&!confirm('현재 재고보다 출고 수량이 큽니다. 계속 진행할까요?'))return;item.stock+=movementType==='in'?qty:-qty;data.history.push({itemName:item.name,type:movementType,qty,memo,date:now()});save(data);$('qtyInput').value='';$('memoInput').value='';render();toast('저장되었습니다.')};
window.renameItem=id=>{const item=data.items.find(i=>i.id===id);const name=prompt('변경할 품목명을 입력하세요.',item.name);if(!name||!name.trim())return;item.name=name.trim();save(data);render();toast('품목명이 변경되었습니다.')}
window.adjustItem=id=>{const item=data.items.find(i=>i.id===id);const stock=prompt('현재 재고 수량을 입력하세요.',item.stock);if(stock===null||isNaN(Number(stock)))return;item.stock=Number(stock);save(data);render();toast('재고가 수정되었습니다.')}
window.deleteItem=id=>{const item=data.items.find(i=>i.id===id);if(!confirm(`${item.name} 품목을 삭제할까요?`))return;data.items=data.items.filter(i=>i.id!==id);save(data);render();toast('삭제되었습니다.')}
$('clearHistory').onclick=()=>{if(confirm('입출고 내역만 삭제할까요? 현재 재고는 유지됩니다.')){data.history=[];save(data);render();toast('내역이 삭제되었습니다.')}};
$('exportBtn').onclick=()=>{const rows=[['품목명','현재재고','부족기준'],...data.items.map(i=>[i.name,i.stock,i.low])];const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='재고현황.csv';a.click()};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').classList.remove('hidden')});$('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;$('installBtn').classList.add('hidden')}};
if('serviceWorker'in navigator){navigator.serviceWorker.register('sw.js')}
render();
