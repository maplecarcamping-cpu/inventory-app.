const KEY='inventory-pwa-v1';
const LOW_THRESHOLD=30;
let movementType='in';let deferredPrompt=null;
const $=id=>document.getElementById(id);
const makeId=()=>crypto.randomUUID();
const seed={categories:[{id:makeId(),name:'기본 카테고리'}],items:[],history:[]};
function load(){try{return JSON.parse(localStorage.getItem(KEY))||seed}catch{return seed}}
function save(data){localStorage.setItem(KEY,JSON.stringify(data))}
function migrate(d){
  if(!d.categories||!Array.isArray(d.categories)||!d.categories.length){d.categories=[{id:makeId(),name:'기본 카테고리'}]}
  if(!Array.isArray(d.items))d.items=[]; if(!Array.isArray(d.history))d.history=[];
  d.items.forEach(i=>{if(!i.categoryId)i.categoryId=d.categories[0].id; i.low=LOW_THRESHOLD});
  return d;
}
let data=migrate(load());save(data);
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function fmt(n){return Number(n||0).toLocaleString('ko-KR')}
function now(){return new Date().toLocaleString('ko-KR',{hour12:false})}
function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function catName(id){return data.categories.find(c=>c.id===id)?.name||'미지정'}
function isLow(i){return Number(i.stock||0)<LOW_THRESHOLD}
function optionCategories(selected=''){
  return data.categories.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${esc(c.name)}</option>`).join('')||'<option>카테고리 없음</option>';
}
function itemsInCat(catId){return data.items.filter(i=>i.categoryId===catId).sort((a,b)=>a.name.localeCompare(b.name,'ko'))}
function render(){
 $('totalItems').textContent=fmt(data.items.length);
 $('totalStock').textContent=fmt(data.items.reduce((s,i)=>s+Number(i.stock||0),0));
 $('lowItems').textContent=fmt(data.items.filter(isLow).length);

 const stockList=$('stockList');stockList.innerHTML=data.categories.length?'':'<div class="card">등록된 카테고리가 없습니다.</div>';
 data.categories.forEach(c=>{
   const items=itemsInCat(c.id); const total=items.reduce((s,i)=>s+Number(i.stock||0),0); const lowCnt=items.filter(isLow).length;
   stockList.insertAdjacentHTML('beforeend',`<div class="category-card"><div class="category-head"><div><div class="row-title">${esc(c.name)}</div><div class="row-sub">상세품목 ${fmt(items.length)}개 · 총 재고 ${fmt(total)}개 · 부족 ${fmt(lowCnt)}개</div></div></div><div class="inner-list" id="cat-${c.id}"></div></div>`);
   const box=document.getElementById(`cat-${c.id}`);
   box.innerHTML=items.length?'':'<div class="empty">등록된 상세품목이 없습니다.</div>';
   items.forEach(i=>{box.insertAdjacentHTML('beforeend',`<div class="row compact"><div class="row-main"><div class="row-title">${esc(i.name)}</div><div class="row-sub">부족 알림: 30개 미만</div></div><span class="badge ${isLow(i)?'low':''}">${fmt(i.stock)}개${isLow(i)?' ⚠️':''}</span></div>`)});
 });

 $('newItemCategory').innerHTML=optionCategories();
 $('movementCategory').innerHTML=optionCategories($('movementCategory').value||data.categories[0]?.id);
 renderMovementItems();

 const manage=$('itemManageList');manage.innerHTML=data.categories.length?'':'<div class="card">수정할 카테고리가 없습니다.</div>';
 data.categories.forEach(c=>{
   const items=itemsInCat(c.id);
   manage.insertAdjacentHTML('beforeend',`<div class="category-card"><div class="category-head"><div><div class="row-title">${esc(c.name)}</div><div class="row-sub">상세품목 ${fmt(items.length)}개</div></div><div class="actions"><button onclick="renameCategory('${c.id}')">카테고리명 변경</button><button class="delete" onclick="deleteCategory('${c.id}')">삭제</button></div></div><div class="inner-list" id="manage-${c.id}"></div></div>`);
   const box=document.getElementById(`manage-${c.id}`);box.innerHTML=items.length?'':'<div class="empty">상세품목 없음</div>';
   items.forEach(i=>box.insertAdjacentHTML('beforeend',`<div class="row compact"><div class="row-main"><div class="row-title">${esc(i.name)}</div><div class="row-sub">현재 ${fmt(i.stock)}개 · 부족 기준 30개 미만</div></div><div class="actions"><button onclick="renameItem('${i.id}')">품목명</button><button onclick="moveItem('${i.id}')">카테고리</button><button onclick="adjustItem('${i.id}')">재고</button><button class="delete" onclick="deleteItem('${i.id}')">삭제</button></div></div>`));
 });

 const hist=$('historyList');hist.innerHTML=data.history.length?'':'<div class="card">입출고 내역이 없습니다.</div>';
 data.history.slice().reverse().slice(0,100).forEach(h=>hist.insertAdjacentHTML('beforeend',`<div class="row"><div class="row-main"><div class="row-title">${esc(h.itemName)}</div><div class="row-sub">${esc(h.categoryName||'')} ${h.categoryName?'· ':''}${h.date}${h.memo?' · '+esc(h.memo):''}</div></div><span class="badge ${h.type}">${h.type==='in'?'입고':'출고'} ${fmt(h.qty)}</span></div>`));
}
function renderMovementItems(){
 const catId=$('movementCategory').value||data.categories[0]?.id; const items=itemsInCat(catId);
 $('movementItem').innerHTML=items.map(i=>`<option value="${i.id}">${esc(i.name)} / 현재 ${fmt(i.stock)}개</option>`).join('')||'<option value="">상세품목 없음</option>';
}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab,.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.tab).classList.add('active');render()});
$('movementCategory').onchange=renderMovementItems;
$('inBtn').onclick=()=>{movementType='in';$('inBtn').classList.add('selected');$('outBtn').classList.remove('selected')};$('outBtn').onclick=()=>{movementType='out';$('outBtn').classList.add('selected');$('inBtn').classList.remove('selected')};
$('addCategory').onclick=()=>{const name=$('newCategoryName').value.trim();if(!name)return toast('카테고리명을 입력하세요.');if(data.categories.some(c=>c.name===name))return toast('이미 있는 카테고리입니다.');data.categories.push({id:makeId(),name});save(data);$('newCategoryName').value='';render();toast('카테고리가 추가되었습니다.')};
$('addItem').onclick=()=>{const categoryId=$('newItemCategory').value;const name=$('newItemName').value.trim();const stock=Number($('newItemStock').value||0);if(!categoryId)return toast('카테고리를 먼저 추가하세요.');if(!name)return toast('상세품목명을 입력하세요.');if(data.items.some(i=>i.categoryId===categoryId&&i.name===name))return toast('해당 카테고리에 이미 있는 품목입니다.');data.items.push({id:makeId(),categoryId,name,stock,low:LOW_THRESHOLD});if(stock>0)data.history.push({categoryName:catName(categoryId),itemName:name,type:'in',qty:stock,memo:'초기 재고',date:now()});save(data);$('newItemName').value='';$('newItemStock').value='';render();toast('상세품목이 추가되었습니다.')};
$('saveMovement').onclick=()=>{if(!data.items.length)return toast('먼저 상세품목을 추가하세요.');const item=data.items.find(i=>i.id===$('movementItem').value);const qty=Number($('qtyInput').value);const memo=$('memoInput').value.trim();if(!item)return toast('상세품목을 선택하세요.');if(!qty||qty<1)return toast('수량을 확인하세요.');if(movementType==='out'&&item.stock<qty&&!confirm('현재 재고보다 출고 수량이 큽니다. 계속 진행할까요?'))return;item.stock+=movementType==='in'?qty:-qty;data.history.push({categoryName:catName(item.categoryId),itemName:item.name,type:movementType,qty,memo,date:now()});save(data);$('qtyInput').value='';$('memoInput').value='';render();toast(isLow(item)?'저장되었습니다. 재고 부족 품목입니다.':'저장되었습니다.')};
window.renameCategory=id=>{const c=data.categories.find(x=>x.id===id);const name=prompt('변경할 카테고리명을 입력하세요.',c.name);if(!name||!name.trim())return;c.name=name.trim();save(data);render();toast('카테고리명이 변경되었습니다.')}
window.deleteCategory=id=>{const c=data.categories.find(x=>x.id===id);const cnt=data.items.filter(i=>i.categoryId===id).length;if(cnt>0)return toast('상세품목이 있는 카테고리는 삭제할 수 없습니다.');if(!confirm(`${c.name} 카테고리를 삭제할까요?`))return;data.categories=data.categories.filter(c=>c.id!==id);save(data);render();toast('카테고리가 삭제되었습니다.')}
window.renameItem=id=>{const item=data.items.find(i=>i.id===id);const name=prompt('변경할 상세품목명을 입력하세요.',item.name);if(!name||!name.trim())return;item.name=name.trim();save(data);render();toast('상세품목명이 변경되었습니다.')}
window.moveItem=id=>{const item=data.items.find(i=>i.id===id);const names=data.categories.map((c,idx)=>`${idx+1}. ${c.name}`).join('\n');const n=prompt(`이동할 카테고리 번호를 입력하세요.\n${names}`);const idx=Number(n)-1;if(isNaN(idx)||!data.categories[idx])return;item.categoryId=data.categories[idx].id;save(data);render();toast('카테고리가 변경되었습니다.')}
window.adjustItem=id=>{const item=data.items.find(i=>i.id===id);const stock=prompt('현재 재고 수량을 입력하세요.',item.stock);if(stock===null||isNaN(Number(stock)))return;item.stock=Number(stock);save(data);render();toast('재고가 수정되었습니다.')}
window.deleteItem=id=>{const item=data.items.find(i=>i.id===id);if(!confirm(`${item.name} 상세품목을 삭제할까요?`))return;data.items=data.items.filter(i=>i.id!==id);save(data);render();toast('삭제되었습니다.')}
$('clearHistory').onclick=()=>{if(confirm('입출고 내역만 삭제할까요? 현재 재고는 유지됩니다.')){data.history=[];save(data);render();toast('내역이 삭제되었습니다.')}};
$('exportBtn').onclick=()=>{const rows=[['카테고리','상세품목명','현재재고','부족알림기준'],...data.items.map(i=>[catName(i.categoryId),i.name,i.stock,'30개 미만'])];const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='재고현황.csv';a.click()};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').classList.remove('hidden')});$('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;$('installBtn').classList.add('hidden')}};
if('serviceWorker'in navigator){navigator.serviceWorker.register('sw.js')}
render();
