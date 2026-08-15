const cfg = window.JOINBUY_CONFIG;
const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

const els = {
  search: document.getElementById('searchInput'),
  tabs: document.getElementById('tabs'),
  grid: document.getElementById('grid'),
  loading: document.getElementById('loading'),
  error: document.getElementById('errorState'),
  errorText: document.getElementById('errorText'),
  empty: document.getElementById('emptyState'),
  count: document.getElementById('countText'),
  title: document.getElementById('headingTitle'),
  refresh: document.getElementById('refreshBtn'),
  retry: document.getElementById('retryBtn'),
  detailModal: document.getElementById('detailModal'),
  detailCloseBtn: document.getElementById('detailCloseBtn'),
  detailMedia: document.getElementById('detailMedia'),
  detailCategory: document.getElementById('detailCategory'),
  detailStock: document.getElementById('detailStock'),
  detailName: document.getElementById('detailName'),
  detailPrice: document.getElementById('detailPrice'),
  detailSpec: document.getElementById('detailSpec'),
  detailExpiry: document.getElementById('detailExpiry'),
  detailDescription: document.getElementById('detailDescription')
};

let allProducts = [];
let activeCategory = '全部';

const emojiMap = {
  '肉品':'🥩','海鮮':'🦐','火鍋料':'🍲','早餐／麵食':'🥞',
  '點心／甜點':'🍗','其他':'❄️'
};

function show(which){
  [els.loading,els.error,els.empty,els.grid].forEach(el=>el.classList.add('hidden'));
  which.classList.remove('hidden');
}

function escapeHtml(v=''){
  return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function formatDate(value){
  if(!value) return '未提供';
  const parts = String(value).split('-');
  return parts.length === 3 ? `${parts[0]}/${parts[1]}/${parts[2]}` : value;
}

function renderTabs(){
  const categories = ['全部', ...Array.from(new Set(allProducts.map(p=>p.category).filter(Boolean)))];
  els.tabs.innerHTML = '';
  categories.forEach(cat=>{
    const b=document.createElement('button');
    b.className='tab'+(cat===activeCategory?' active':'');
    b.textContent=cat;
    b.onclick=()=>{activeCategory=cat;renderTabs();renderProducts()};
    els.tabs.appendChild(b);
  });
}

function renderProducts(){
  const q=els.search.value.trim().toLowerCase();
  const list=allProducts.filter(p=>{
    const catOk=activeCategory==='全部'||p.category===activeCategory;
    const qOk=!q||String(p.name||'').toLowerCase().includes(q)||String(p.spec||'').toLowerCase().includes(q);
    return catOk&&qOk;
  });
  els.title.textContent=activeCategory==='全部'?'全部現貨':activeCategory;
  els.count.textContent=`共 ${list.length} 項商品`;

  if(!list.length){ show(els.empty); return; }

  els.grid.innerHTML=list.map(p=>{
    const image=p.image_url
      ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span class="fallback" style="display:none">${emojiMap[p.category]||'❄️'}</span>`
      : `<span class="fallback">${emojiMap[p.category]||'❄️'}</span>`;
    const sold=p.stock_status==='sold_out';
    return `<article class="card" data-product-id="${p.id}" tabindex="0" role="button" aria-label="查看 ${escapeHtml(p.name||'商品')} 詳細資訊">
      <div class="media">${image}</div>
      <div class="body">
        <div class="category">${escapeHtml(p.category||'')}</div>
        <h4 class="name">${escapeHtml(p.name||'未命名商品')}</h4>
        <p class="spec">${escapeHtml(p.spec||'')}</p>
        <div class="bottom">
          <div class="price">$${Number(p.price||0).toLocaleString()}</div>
          <span class="badge ${sold?'out':'in'}">${sold?'庫存已售完':'尚有庫存'}</span>
        </div>
        <div class="card-hint">點一下查看商品資訊</div>
      </div>
    </article>`;
  }).join('');

  els.grid.querySelectorAll('.card').forEach(card=>{
    const open=()=>openProductDetail(Number(card.dataset.productId));
    card.addEventListener('click',open);
    card.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}
    });
  });

  show(els.grid);
}

function openProductDetail(id){
  const p=allProducts.find(item=>Number(item.id)===Number(id));
  if(!p) return;

  els.detailMedia.innerHTML=p.image_url
    ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name||'商品圖片')}">`
    : `<span class="fallback">${emojiMap[p.category]||'❄️'}</span>`;

  els.detailCategory.textContent=p.category||'其他';
  els.detailName.textContent=p.name||'未命名商品';
  els.detailPrice.textContent=`$${Number(p.price||0).toLocaleString()}`;
  els.detailSpec.textContent=p.spec||'未提供';
  els.detailExpiry.textContent=formatDate(p.expiry_date);
  els.detailDescription.textContent=p.description||'目前沒有其他商品介紹。';

  const sold=p.stock_status==='sold_out';
  els.detailStock.textContent=sold?'庫存已售完':'尚有庫存';
  els.detailStock.className=`detail-stock ${sold?'out':'in'}`;

  els.detailModal.classList.remove('hidden');
  els.detailModal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
}

function closeProductDetail(){
  els.detailModal.classList.add('hidden');
  els.detailModal.setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
}

async function loadProducts(){
  show(els.loading);
  els.count.textContent='讀取商品中...';
  const { data, error } = await client
    .from('products')
    .select('id,name,category,price,spec,stock_status,listing_status,image_url,description,expiry_date,created_at')
    .eq('listing_status','listed')
    .order('created_at',{ascending:false});

  if(error){
    els.errorText.textContent='連線失敗：'+error.message;
    els.count.textContent='讀取失敗';
    show(els.error);
    return;
  }

  allProducts=data||[];
  if(!allProducts.some(p=>p.category===activeCategory)) activeCategory='全部';
  renderTabs();
  renderProducts();
}

els.search.addEventListener('input',renderProducts);
els.refresh.addEventListener('click',loadProducts);
els.retry.addEventListener('click',loadProducts);
els.detailCloseBtn.addEventListener('click',closeProductDetail);
els.detailModal.addEventListener('click',e=>{if(e.target===els.detailModal) closeProductDetail();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!els.detailModal.classList.contains('hidden')) closeProductDetail();});

loadProducts();
