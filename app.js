const cfg = window.JOINBUY_CONFIG;

const client = window.supabase.createClient(
  cfg.supabaseUrl,
  cfg.supabaseKey
);

const els = {
  search: document.getElementById('searchInput'),
  categorySelect: document.getElementById('categorySelect'),
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
  detailDescription: document.getElementById('detailDescription'),

  detailVariants: document.getElementById('detailVariants'),
  detailVariantList: document.getElementById('detailVariantList')
};

let allProducts = [];
let allVariants = [];
let activeCategory = '全部';

const emojiMap = {
  '肉品':'🥩',
  '海鮮':'🦐',
  '火鍋料':'🍲',
  '早餐／麵食':'🥞',
  '點心／甜點':'🍗',
  '其他':'❄️'
};

function show(which){
  [
    els.loading,
    els.error,
    els.empty,
    els.grid
  ].forEach(el => el.classList.add('hidden'));

  which.classList.remove('hidden');
}

function escapeHtml(v=''){
  return String(v).replace(
    /[&<>"']/g,
    c => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#039;'
    }[c])
  );
}

function formatDate(value){
  if(!value) return '未提供';

  const parts = String(value).split('-');

  return parts.length === 3
    ? `${parts[0]}/${parts[1]}/${parts[2]}`
    : value;
}

function getVariantsForProduct(productId){
  return allVariants.filter(
    item =>
      Number(item.product_id) === Number(productId)
  );
}

function variantIsSoldOut(variant){
  return variant.stock_status === '庫存已售完';
}

function getProductDisplayInfo(product){
  const variants =
    getVariantsForProduct(product.id);

  if(!variants.length){
    return {
      variants: [],
      priceText:
        `$${Number(product.price || 0).toLocaleString()}`,
      sold:
        product.stock_status === 'sold_out',
      imageUrl:
        product.image_url || ''
    };
  }

  const prices = variants
    .map(item => Number(item.price || 0));

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const priceText =
    minPrice === maxPrice
      ? `$${minPrice.toLocaleString()}`
      : `$${minPrice.toLocaleString()}～$${maxPrice.toLocaleString()}`;

  const sold =
    variants.every(variantIsSoldOut);

  const imageUrl =
    variants.find(item => item.image_url)?.image_url ||
    product.image_url ||
    '';

  return {
    variants,
    priceText,
    sold,
    imageUrl
  };
}

// 2.0 快速分類：依目前已上架商品的分類自動建立，未辨識分類使用通用圖示。
const categoryVisuals = [
  {words:['餃','小籠包','水餃'],icon:'🥟',tone:'peach'},
  {words:['飲品','飲料','果汁','冰沙','茶飲'],icon:'🥤',tone:'pink'},
  {words:['早餐','麵包','吐司','饅頭'],icon:'🍞',tone:'butter'},
  {words:['湯底','火鍋','鍋物','鍋料'],icon:'🍲',tone:'mint'},
  {words:['乳製','起司','奶油','優格'],icon:'🧀',tone:'butter'},
  {words:['醬料','調味'],icon:'🥫',tone:'lavender'},
  {words:['熟食','料理','滷味'],icon:'🍱',tone:'peach'},
  {words:['海鮮','魚'],icon:'🦐',tone:'mint'},
  {words:['肉品','牛肉','豬肉','雞肉'],icon:'🥩',tone:'pink'},
  {words:['甜點','點心','蛋糕'],icon:'🍰',tone:'lavender'},
  {words:['蔬食','蔬菜','豆製'],icon:'🥬',tone:'mint'}
];
function categoryVisual(category){
  return categoryVisuals.find(v => v.words.some(word => category.includes(word))) || {icon:'🧊',tone:'lavender'};
}
function selectCategory(category, scroll=true){
  activeCategory=category;
  els.categorySelect.value=category;
  renderCategoryIcons();
  renderProducts();
  if(scroll) document.getElementById('productsHeading')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function shortCategoryLabel(name){
  if(name === '全部') return '全部分類';
  return name.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,'')
    .replace(/專區/g,'').replace(/\s+/g,'').trim() || name;
}
function renderCategoryIcons(){
  const root=document.getElementById('categoryIcons');
  if(!root)return;
  const categories=[...new Set(allProducts.map(p=>p.category).filter(Boolean))];
  const shown=categories.slice(0,7);
  const items=[...shown.map(name=>({name})),{name:'全部',all:true}];
  root.innerHTML=items.map(({name,all})=>{
    const visual=all?{icon:'▦',tone:'neutral'}:categoryVisual(name);
    const label=shortCategoryLabel(name);
    const selected=activeCategory===name;
    return `<button type="button" class="category-icon-item ${selected?'selected':''}" data-category="${escapeHtml(name)}" aria-pressed="${selected}"><span class="category-icon-art tone-${visual.tone}" aria-hidden="true">${visual.icon}</span><span class="category-icon-name">${escapeHtml(label)}</span></button>`;
  }).join('');
  root.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>selectCategory(button.dataset.category)));
}

function renderCategorySelect(){
  const categories = [
    '全部',
    ...Array.from(
      new Set(
        allProducts
          .map(product => product.category)
          .filter(Boolean)
      )
    )
  ];

  els.categorySelect.innerHTML = '';

  categories.forEach(category => {
    const option = document.createElement('option');

    option.value = category;
    option.textContent =
      category === '全部'
        ? '全部分類'
        : category;

    els.categorySelect.appendChild(option);
  });

  els.categorySelect.value = activeCategory;
  renderCategoryIcons();
}

function renderProducts(){
  const q =
    els.search.value
      .trim()
      .toLowerCase();

  const list =
    allProducts.filter(product => {

      const variants =
        getVariantsForProduct(product.id);

      const catOk =
        activeCategory === '全部' ||
        product.category === activeCategory;

      const searchProduct =
        String(product.name || '')
          .toLowerCase()
          .includes(q) ||
        String(product.spec || '')
          .toLowerCase()
          .includes(q);

      const searchVariant =
        variants.some(item =>
          String(item.variant_name || '')
            .toLowerCase()
            .includes(q)
        );

      const qOk =
        !q ||
        searchProduct ||
        searchVariant;

      return catOk && qOk;
    });

  els.title.textContent =
    activeCategory === '全部'
      ? '❄️ 全部現貨'
      : activeCategory;

  els.count.textContent =
    `共 ${list.length} 項商品`;

  if(!list.length){
    els.grid.innerHTML = '';
    show(els.empty);
    return;
  }

  els.grid.innerHTML =
    list.map(product => {

      const display =
        getProductDisplayInfo(product);

      const image =
        display.imageUrl
          ? `
            <img
              src="${escapeHtml(display.imageUrl)}"
              alt="${escapeHtml(product.name)}"
              loading="lazy"
              onerror="this.style.display='none';this.nextElementSibling.style.display='block'"
            >
            <span
              class="fallback"
              style="display:none"
            >
              ${emojiMap[product.category] || '❄️'}
            </span>
          `
          : `
            <span class="fallback">
              ${emojiMap[product.category] || '❄️'}
            </span>
          `;

      const variantHint =
        display.variants.length
          ? `
            <div class="card-variant-hint">
              ${display.variants.length} 種口味／規格
            </div>
          `
          : '';

      const stockText =
        display.sold
          ? '庫存已售完'
          : (
              display.variants.length
                ? '有口味現貨'
                : '尚有庫存'
            );

      return `
        <article
          class="card"
          data-product-id="${product.id}"
          tabindex="0"
          role="button"
          aria-label="查看 ${escapeHtml(product.name || '商品')} 詳細資訊"
        >

          <div class="media">
            ${image}
          </div>

          <div class="body">

            <div class="category">
              ${escapeHtml(product.category || '')}
            </div>

            <h4 class="name">
              ${escapeHtml(product.name || '未命名商品')}
            </h4>

            <p class="spec">
              ${escapeHtml(product.spec || '')}
            </p>

            ${variantHint}

            <div class="bottom">

              <div class="price">
                ${display.priceText}
              </div>

              <span
                class="badge ${display.sold ? 'out' : 'in'}"
              >
                ${stockText}
              </span>

            </div>

            <div class="card-hint">
              點一下查看商品資訊
            </div>

          </div>
        </article>
      `;
    }).join('');

  els.grid
    .querySelectorAll('.card')
    .forEach(card => {

      const open = () =>
        openProductDetail(
          Number(card.dataset.productId)
        );

      card.addEventListener(
        'click',
        open
      );

      card.addEventListener(
        'keydown',
        event => {

          if(
            event.key === 'Enter' ||
            event.key === ' '
          ){
            event.preventDefault();
            open();
          }

        }
      );
    });

  show(els.grid);
}

function renderVariantDetail(variants){
  if(!variants.length){
    els.detailVariants.classList.add('hidden');
    els.detailVariantList.innerHTML = '';
    return;
  }

  els.detailVariants.classList.remove('hidden');

  els.detailVariantList.innerHTML =
    variants.map(item => {

      const sold =
        variantIsSoldOut(item);

      const image =
        item.image_url
          ? `
            <img
              class="detail-variant-image"
              src="${escapeHtml(item.image_url)}"
              alt="${escapeHtml(item.variant_name || '口味圖片')}"
            >
          `
          : `
            <div class="detail-variant-image-fallback">
              ❄️
            </div>
          `;

      return `
        <div class="detail-variant-card">

          ${image}

          <div class="detail-variant-body">

            <div class="detail-variant-head">

              <strong class="detail-variant-name">
                ${escapeHtml(item.variant_name || '未命名')}
              </strong>

              <span
                class="detail-variant-stock ${sold ? 'out' : 'in'}"
              >
                ${sold ? '庫存已售完' : '尚有庫存'}
              </span>

            </div>

            <div class="detail-variant-price">
              $${Number(item.price || 0).toLocaleString()}
            </div>

            <div class="detail-variant-expiry">
              商品效期：
              ${formatDate(item.expiry_date)}
            </div>

          </div>

        </div>
      `;
    }).join('');
}

function openProductDetail(id){
  const product =
    allProducts.find(
      item =>
        Number(item.id) === Number(id)
    );

  if(!product) return;

  const display =
    getProductDisplayInfo(product);

  els.detailMedia.innerHTML =
    display.imageUrl
      ? `
        <img
          src="${escapeHtml(display.imageUrl)}"
          alt="${escapeHtml(product.name || '商品圖片')}"
        >
      `
      : `
        <span class="fallback">
          ${emojiMap[product.category] || '❄️'}
        </span>
      `;

  els.detailCategory.textContent =
    product.category || '其他';

  els.detailName.textContent =
    product.name || '未命名商品';

  els.detailPrice.textContent =
    display.priceText;

  els.detailSpec.textContent =
    product.spec || '未提供';

  els.detailExpiry.textContent =
    display.variants.length
      ? '依口味／規格不同'
      : formatDate(product.expiry_date);

  els.detailDescription.textContent =
    product.description ||
    '目前沒有其他商品介紹。';

  els.detailStock.textContent =
    display.sold
      ? '庫存已售完'
      : (
          display.variants.length
            ? '有口味現貨'
            : '尚有庫存'
        );

  els.detailStock.className =
    `detail-stock ${display.sold ? 'out' : 'in'}`;

  renderVariantDetail(
    display.variants
  );

  els.detailModal
    .classList
    .remove('hidden');

  els.detailModal
    .setAttribute(
      'aria-hidden',
      'false'
    );

  document.body
    .classList
    .add('modal-open');
}

function closeProductDetail(){
  els.detailModal
    .classList
    .add('hidden');

  els.detailModal
    .setAttribute(
      'aria-hidden',
      'true'
    );

  document.body
    .classList
    .remove('modal-open');
}

async function loadProducts(){
  show(els.loading);

  els.count.textContent =
    '讀取商品中...';

  const [
    productResult,
    variantResult
  ] = await Promise.all([

    client
      .from('products')
      .select(
        'id,name,category,price,spec,stock_status,listing_status,image_url,description,expiry_date,created_at'
      )
      .eq(
        'listing_status',
        'listed'
      )
      .order(
        'created_at',
        { ascending:false }
      ),

    client
      .from('product_variants')
      .select(
        'id,product_id,variant_name,price,expiry_date,warehouse,image_url,stock_status,listing_status,sort_order'
      )
      .eq(
        'listing_status',
        '上架'
      )
      .order(
        'sort_order',
        { ascending:true }
      )
      .order(
        'id',
        { ascending:true }
      )

  ]);

  if(productResult.error){

    els.errorText.textContent =
      '商品連線失敗：' +
      productResult.error.message;

    els.count.textContent =
      '讀取失敗';

    show(els.error);

    return;
  }

  if(variantResult.error){

    els.errorText.textContent =
      '口味／規格連線失敗：' +
      variantResult.error.message;

    els.count.textContent =
      '讀取失敗';

    show(els.error);

    return;
  }

  allProducts =
    productResult.data || [];

  allVariants =
    variantResult.data || [];

  if(
    !allProducts.some(
      product =>
        product.category === activeCategory
    )
  ){
    activeCategory = '全部';
  }

renderCategorySelect();
renderProducts();
}

els.search.addEventListener(
  'input',
  renderProducts
);

els.categorySelect.addEventListener(
  'change',
  event => {
    selectCategory(event.target.value, false);
  }
);

els.refresh.addEventListener(
  'click',
  () => {
    loadActivity();
    loadProducts();
  }
);

els.retry.addEventListener(
  'click',
  loadProducts
);

els.detailCloseBtn.addEventListener(
  'click',
  closeProductDetail
);

els.detailModal.addEventListener(
  'click',
  event => {

    if(
      event.target === els.detailModal
    ){
      closeProductDetail();
    }

  }
);

document.addEventListener(
  'keydown',
  event => {

    if(
      event.key === 'Escape' &&
      !els.detailModal.classList.contains('hidden')
    ){
      closeProductDetail();
    }

  }
);

// 第四階段：多活動輪播；資料表未升級時保留舊版單筆活動讀取。
let carouselActivities=[];
let carouselIndex=0;
let carouselTimer=null;
let activityFocusBeforeModal=null;
const activityUI={
  section:document.getElementById('activitySection'),
  welcome:document.getElementById('welcomeSection'),
  slide:document.getElementById('activitySlide'),
  image:document.getElementById('activitySlideImage'),
  fallback:document.getElementById('activitySlideFallback'),
  counter:document.getElementById('activityCounter'),
  dots:document.getElementById('activityDots'),
  prev:document.getElementById('activityPrev'),
  next:document.getElementById('activityNext'),
  modal:document.getElementById('activityModal'),
  close:document.getElementById('activityModalClose'),
  badge:document.getElementById('activityModalBadge'),
  title:document.getElementById('activityModalTitle'),
  description:document.getElementById('activityModalDescription'),
  period:document.getElementById('activityModalPeriod'),
  products:document.getElementById('activityModalProducts')
};
function activityToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function activityVisible(a){const today=activityToday();return a.enabled===true && (!a.start_date||a.start_date<=today) && (!a.end_date||a.end_date>=today);}
function stopCarousel(){if(carouselTimer){clearInterval(carouselTimer);carouselTimer=null;}}
function startCarousel(){stopCarousel();if(carouselActivities.length>1 && !document.hidden && activityUI.modal.classList.contains('hidden') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){carouselTimer=setInterval(()=>moveCarousel(1),5000);}}
function moveCarousel(delta){if(carouselActivities.length<2)return;carouselIndex=(carouselIndex+delta+carouselActivities.length)%carouselActivities.length;renderCarousel();}
function renderCarousel(){
 const a=carouselActivities[carouselIndex];if(!a)return;
 activityUI.image.classList.toggle('hidden',!a.image_url);
 activityUI.fallback.classList.toggle('hidden',!!a.image_url);
 if(a.image_url){
  activityUI.image.src=a.image_url;
  activityUI.image.alt=a.title||'活動圖片';
  activityUI.slide.style.backgroundImage=`linear-gradient(#fff7ee88,#fff7ee88), url(${JSON.stringify(a.image_url)})`;
}else{
  activityUI.image.removeAttribute('src');
  activityUI.slide.style.backgroundImage='';
  activityUI.fallback.textContent=a.title||'最新優惠活動';
}
 activityUI.slide.setAttribute('aria-label',`查看「${a.title||'活動'}」詳細說明與注意事項`);
 activityUI.counter.textContent=carouselActivities.length>1?`${carouselIndex+1} / ${carouselActivities.length}`:'';
 const multi=carouselActivities.length>1;
 activityUI.prev.classList.toggle('hidden',!multi);activityUI.next.classList.toggle('hidden',!multi);
 activityUI.dots.innerHTML='';
 if(multi)carouselActivities.forEach((item,i)=>{const btn=document.createElement('button');btn.type='button';btn.className='activity-dot'+(i===carouselIndex?' active':'');btn.setAttribute('aria-label',`切換至第 ${i+1} 個活動：${item.title||''}`);btn.setAttribute('aria-current',i===carouselIndex?'true':'false');btn.addEventListener('click',()=>{carouselIndex=i;renderCarousel();startCarousel();});activityUI.dots.appendChild(btn);});
}
function closeActivityModal(){activityUI.modal.classList.add('hidden');activityUI.modal.setAttribute('aria-hidden','true');document.body.classList.remove('activity-modal-open');activityFocusBeforeModal?.focus?.();startCarousel();}
function openActivityModal(){const a=carouselActivities[carouselIndex];if(!a)return;activityFocusBeforeModal=document.activeElement;stopCarousel();
 activityUI.badge.textContent=a.badge||'🎉 最新活動';activityUI.title.textContent=a.title||'揪愛買活動專區';
 activityUI.description.textContent=a.description||'活動詳情請依門市公告為準。';
 const dates=[a.start_date,a.end_date].filter(Boolean);activityUI.period.textContent=dates.length?'活動期間：'+dates.join(' ～ '):'';activityUI.period.classList.toggle('hidden',!dates.length);
 const category=(a.target_category||'').trim();activityUI.products.textContent=a.button_text||'查看活動商品';activityUI.products.classList.toggle('hidden',!category);
 activityUI.products.onclick=()=>{const exists=[...els.categorySelect.options].some(x=>x.value===category);if(!exists){alert('目前此活動分類沒有上架商品，請稍後再查看。');return;}closeActivityModal();els.search.value='';selectCategory(category,true);};
 activityUI.modal.classList.remove('hidden');activityUI.modal.setAttribute('aria-hidden','false');document.body.classList.add('activity-modal-open');activityUI.close.focus();
}
async function loadActivity(){
 stopCarousel();let records=[];
 const multi=await client.from('site_activities').select('id,enabled,badge,title,description,start_date,end_date,image_url,button_text,target_category,sort_order').order('sort_order',{ascending:true}).order('id',{ascending:true});
 if(!multi.error){records=multi.data||[];}else{
  // SQL 尚未執行時使用舊活動資料，避免原有促銷消失。
  const legacy=await client.from('site_activity').select('id,enabled,badge,title,description,start_date,end_date,image_url,button_text,target_category').eq('id',1).maybeSingle();
  if(!legacy.error&&legacy.data)records=[legacy.data];
 }
 carouselActivities=records.filter(activityVisible);carouselIndex=0;
 const has=carouselActivities.length>0;
 activityUI.section.classList.toggle('hidden',!has);activityUI.welcome?.classList.toggle('hidden',has);
 if(has){renderCarousel();startCarousel();}
}
activityUI.slide.addEventListener('click',openActivityModal);
activityUI.prev.addEventListener('click',()=>{moveCarousel(-1);startCarousel();});
activityUI.next.addEventListener('click',()=>{moveCarousel(1);startCarousel();});
activityUI.close.addEventListener('click',closeActivityModal);
activityUI.modal.addEventListener('click',e=>{if(e.target===activityUI.modal)closeActivityModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!activityUI.modal.classList.contains('hidden'))closeActivityModal();if(!activityUI.modal.classList.contains('hidden')&&e.key==='Tab'){const focusable=[activityUI.close,...(!activityUI.products.classList.contains('hidden')?[activityUI.products]:[])];const i=focusable.indexOf(document.activeElement);if(e.shiftKey&&i===0){e.preventDefault();focusable.at(-1).focus();}else if(!e.shiftKey&&i===focusable.length-1){e.preventDefault();focusable[0].focus();}}});
let swipeStart=null;
activityUI.slide.addEventListener('touchstart',e=>{swipeStart={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};},{passive:true});
activityUI.slide.addEventListener('touchend',e=>{if(!swipeStart)return;const dx=e.changedTouches[0].clientX-swipeStart.x,dy=e.changedTouches[0].clientY-swipeStart.y;swipeStart=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){e.preventDefault();moveCarousel(dx<0?1:-1);startCarousel();activityUI.slide.dataset.swiped='1';setTimeout(()=>delete activityUI.slide.dataset.swiped,300);}}, {passive:false});
// 滑動結束後不要意外打開詳情。
activityUI.slide.addEventListener('click',e=>{if(activityUI.slide.dataset.swiped){e.stopImmediatePropagation();delete activityUI.slide.dataset.swiped;}},true);
activityUI.section.addEventListener('mouseenter',stopCarousel);
activityUI.section.addEventListener('mouseleave',startCarousel);
activityUI.section.addEventListener('focusin',stopCarousel);
activityUI.section.addEventListener('focusout',()=>{setTimeout(()=>{if(!activityUI.section.contains(document.activeElement))startCarousel();},0);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCarousel();else startCarousel();});
loadActivity();
loadProducts();
