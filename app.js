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
      ? '全部現貨'
      : activeCategory;

  els.count.textContent =
    `共 ${list.length} 項商品`;

  if(!list.length){
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
    activeCategory = event.target.value;
    renderProducts();
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

async function loadActivity(){
  const activitySection =
    document.getElementById('activitySection');

  const activityBadge =
    document.getElementById('activityBadge');

  const activityTitle =
    document.getElementById('activityTitle');

  const activityDescription =
    document.getElementById('activityDescription');

  if(!activitySection){
    return;
  }

  // 沒有活動時，恢復原本首頁內容
  function showDefaultActivity(){
    if(activityBadge){
      activityBadge.textContent =
        '❄️ 新鮮冷凍・現貨供應';
    }

    if(activityTitle){
      activityTitle.textContent =
        '今天想吃什麼？';
    }

    if(activityDescription){
      activityDescription.textContent =
        '商品依門市實際庫存為主，售完為止。';
    }

    activitySection.classList.remove('hidden');
  }

  const { data, error } =
    await client
      .from('site_activity')
      .select(
        'enabled,badge,title,description,start_date,end_date'
      )
      .eq('id', 1)
      .maybeSingle();

  // 資料讀取失敗或沒有活動資料
  // → 顯示原本首頁內容
  if(error || !data){
    showDefaultActivity();
    return;
  }

  // 使用台灣／手機目前的本地日期
  const now = new Date();

  const today =
    `${now.getFullYear()}-` +
    `${String(now.getMonth() + 1).padStart(2, '0')}-` +
    `${String(now.getDate()).padStart(2, '0')}`;

  const started =
    !data.start_date ||
    today >= data.start_date;

  const notEnded =
    !data.end_date ||
    today <= data.end_date;

  const shouldShowActivity =
    data.enabled === true &&
    started &&
    notEnded;

  // 沒開活動、尚未開始、或已經結束
  // → 顯示原本「今天想吃什麼？」
  if(!shouldShowActivity){
    showDefaultActivity();
    return;
  }

  // 有活動而且日期符合
  // → 顯示後台設定的活動
  if(activityBadge){
    activityBadge.textContent =
      data.badge || '🎉 最新活動';
  }

  if(activityTitle){
    activityTitle.textContent =
      data.title || '揪愛買活動專區';
  }

  if(activityDescription){
    activityDescription.textContent =
      data.description || '';
  }

  activitySection.classList.remove('hidden');
}

loadActivity();
loadProducts();
