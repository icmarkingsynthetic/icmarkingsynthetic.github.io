/* Local specimen browser. All displayed measurements come from generated data. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => Number(value).toLocaleString('en-US');
  const names = {good:'Defect-free',scratch:'Scratch',contamination:'Contamination',missing_text:'Missing text',smeared_text:'Smeared text',combined:'Combined'};
  const order = Object.keys(names);
  const colors = {scratch:'#ffb859',contamination:'#6df1b8',missing_text:'#c8a5ff',smeared_text:'#62cafa'};
  const cache = new Map();
  const displayPath = path => path.includes('/TVIC29_C000_') ? 'assets/display/' + path.split('/').pop().replace('.png', '.webp') : path;
  let stats, samples, sources, summary, paper, config, release, selectedClass = 'all', shown = 12, current = null, featured = null;
  let formatText = '', citationText = '';
  let heroRequest = 0, stepRequest = 0, viewerRequest = 0, currentStep = 0, tourTimer = null, comparisonFrame = null;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  async function json(path) { const response = await fetch(path); if (!response.ok) throw Error(`Could not load ${path}`); return response.json(); }
  async function detail(sample) { if (!cache.has(sample.id)) cache.set(sample.id, await json(sample.detail)); return cache.get(sample.id); }
  function credit(id) {
    const source = sources.find(s => s.id === id);
    return source ? `Adapted from <a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.author)}</a> · <a href="${esc(source.license_url)}" target="_blank" rel="noopener noreferrer">${esc(source.license)}</a>` : '';
  }
  function annotations(record, boxes = true, polygons = false, mask = false, path = '') {
    let content = mask ? `<defs><mask id="exact-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="640" height="320" style="mask-type:luminance"><image href="${esc(path)}" x="0" y="0" width="640" height="320"/></mask></defs><rect width="640" height="320" fill="#6df1b8" fill-opacity=".65" mask="url(#exact-mask)"/>` : '';
    for (const instance of record.instances.filter(i => i.visible)) {
      const color = colors[instance.class] || '#ffffff';
      const [x1,y1,x2,y2] = instance.bbox_xyxy;
      if (polygons && instance.polygon?.length) {
        const points = instance.polygon.reduce((all,v,i,a) => i % 2 ? all : all.concat(`${v},${a[i+1]}`), []).join(' ');
        content += `<polygon points="${points}" fill="${color}" fill-opacity=".16" stroke="${color}" stroke-width="1.5"/>`;
      }
      if (boxes) content += `<rect x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" fill="none" stroke="${color}" stroke-width="2"/><rect x="${x1}" y="${Math.max(0,y1-19)}" width="${names[instance.class].length*7+14}" height="19" rx="2" fill="${color}"/><text x="${x1+7}" y="${Math.max(14,y1-5)}" font-size="12" font-family="Segoe UI, sans-serif" font-weight="700" fill="#142625">${names[instance.class]}</text>`;
    }
    return content;
  }
  async function showHero(label) {
    const request = ++heroRequest;
    featured = samples.find(s => s.group === 'TVIC29_C000' && s.label === label);
    $('hero-image').src = displayPath(featured.image);
    $('hero-image').alt = `${names[label]} release example on source ${featured.source}`;
    $('hero-group').textContent = featured.group;
    $('hero-class').textContent = names[label];
    $('hero-credit').innerHTML = credit(featured.source);
    document.querySelectorAll('[data-hero]').forEach(b => b.setAttribute('aria-pressed', b.dataset.hero === label));
    if ($('hero-clean')) $('hero-clean').src = displayPath(featured.counterpart);
    const record = await detail(featured);
    if (request !== heroRequest) return;
    $('hero-overlay').innerHTML = annotations(record);
    updateHeroComparison();
  }
  const steps = [
    ['Source & regions','Separate the surface from the marking.','Identify the package face, marking strokes, and protected structures. This separates where surface defects may appear from where text defects may alter the marking.','good','Paper §3.2. The image is a clean release rendering of the source, not a raw source photograph.'],
    ['Clean capture','Render the defect-free counterpart.','Apply the capture transform before drawing a defect. Images in the same capture group share the same pose, illumination, blur, and sensor variation.','good','Paper §3.3. The exact clean counterpart is retained for comparison.'],
    ['Defect formation','Turn a physical cause into an image change.','For abrasion, a path controls geometry while varying contact, grains, and opacity control appearance. Defect changes are restricted to the allowed surface.','scratch','Paper §3.4. This is a final release example, not a new rendering.'],
    ['Labels by construction','Record the rendered support and visible instances.','The renderer supplies support masks. Visible instances provide polygons and bounding boxes; each component keeps its own defect type. Masks are not guaranteed to contain every changed pixel.','scratch','Paper §3.5 and archive format limitations. Shown here: generator boxes and instance polygons.'],
    ['Dataset & checks','Keep the generation record with the image.','Record the source, capture group, defect components, severity, and split. Keep related images together and evaluate appearance, inspector recognition, and detector transfer separately.','combined','Paper §§3.5, 4.1–4.5. Combined images retain component-level annotations.']
  ];
  async function showStep(index) {
    currentStep = index;
    const request = ++stepRequest;
    const [label,title,description,kind,source] = steps[index];
    const sample = samples.find(s => s.group === 'TVIC29_C000' && s.label === kind);
    $('method-image').src = displayPath(sample.image);
    $('method-kicker').textContent = label;
    $('method-title').textContent = title;
    $('method-description').textContent = description;
    $('method-source').textContent = source;
    $('method-credit').innerHTML = credit(sample.source);
    const drawing = index >= 3 ? annotations(await detail(sample), true, index === 3) : '';
    if (request !== stepRequest) return;
    $('method-overlay').innerHTML = drawing;
    document.querySelectorAll('[data-step]').forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.step) === index));
    if ($('tour-position')) $('tour-position').textContent = `${index+1} / ${steps.length} · ${label}`;
  }
  function filterSamples() {
    let result = samples.filter(s => (selectedClass === 'all' || s.label === selectedClass) && ($('filter-source').value === 'all' || s.source === $('filter-source').value) && ($('filter-severity').value === 'all' || s.severity.includes($('filter-severity').value)) && ($('filter-split').value === 'all' || s.split === $('filter-split').value));
    const query = $('image-search')?.value.trim().toLowerCase();
    if (query) result = result.filter(s => `${s.id} ${s.source} ${s.group} ${names[s.label]}`.toLowerCase().includes(query));
    const sort = $('filter-sort').value;
    if (sort === 'severity') result.sort((a,b) => b.severity_value-a.severity_value);
    if (sort === 'instances') result.sort((a,b) => b.instances-a.instances);
    if (sort === 'source') result.sort((a,b) => a.source.localeCompare(b.source) || a.id.localeCompare(b.id));
    return result;
  }
  function renderGrid() {
    const result = filterSamples();
    $('filter-count').textContent = `${number(result.length)} specimens · showing ${number(Math.min(shown,result.length))}`;
    $('sample-grid').innerHTML = result.length ? result.slice(0,shown).map(s => `<article class="sample-card"><button data-open="${esc(s.id)}"><div class="card-image"><img src="${esc(s.thumb)}" width="480" height="240" loading="lazy" alt="${names[s.label]} on IC source ${esc(s.source)}"><span class="card-arrow" aria-hidden="true">↗</span></div><div class="card-info"><div class="card-label-row"><strong>${names[s.label]}</strong><span class="severity-pill">${esc([...new Set(s.severity)].join(' / ') || 'clean')}</span></div><span class="card-id mono">${esc(s.id)}</span></div></button><p class="image-credit">${credit(s.source)}</p></article>`).join('') : '<p class="empty-state">No samples match these filters. Try another source or severity level.</p>';
    $('load-more').hidden = shown >= result.length;
    if ($('random-specimen')) $('random-specimen').disabled = result.length === 0;
  }
  function updateOverlay() {
    if (!current) return;
    $('annotation-overlay').innerHTML = annotations(cache.get(current.id),$('show-boxes').checked,$('show-polygons').checked,$('show-mask').checked,current.mask);
    const value = Number($('compare-slider').value);
    const clip = `inset(0 ${100-value}% 0 0)`;
    $('defect-layer').style.clipPath = clip;
    $('annotation-overlay').style.clipPath = clip;
    $('view-tag').textContent = value === 100 ? 'Synthetic image' : value === 0 ? 'Defect-free counterpart' : 'Synthetic ← | → Defect-free';
  }
  async function openViewer(id) {
    stopTour(); stopComparison();
    const request = ++viewerRequest;
    current = samples.find(s => s.id === id);
    const record = await detail(current);
    if (request !== viewerRequest) return;
    $('viewer-title').textContent = `${names[current.label]} · ${current.id}`;
    $('clean-image').src = current.counterpart;
    $('defect-image').src = current.image;
    $('defect-image').alt = `${names[current.label]} specimen ${current.id}`;
    $('viewer-credit').innerHTML = credit(current.source);
    $('compare-slider').value = 100;
    $('viewer-facts').innerHTML = [['Image class',names[current.label]],['Source',current.source],['Capture group',current.group],['Component types',current.types.map(t => names[t]).join(', ') || 'None'],['Severity',current.severity.join(', ') || 'Not applicable'],['Visible instances',current.instances],['Source-disjoint split',current.split],['Product-matched split',current.pm_split],['Dimensions',Object.keys(stats.image_sizes).join(', ') + ' pixels']].map(([key,value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('');
    $('viewer-record').textContent = JSON.stringify(record,null,2);
    if ($('viewer-position')) {
      const list = viewerList();
      $('viewer-position').textContent = `${list.findIndex(s=>s.id===id)+1} / ${list.length} in this selection`;
    }
    updateOverlay();
    if (!$('viewer').open) $('viewer').showModal();
  }
  function showSplit(key) {
    const split = stats[key];
    document.querySelectorAll('[data-split]').forEach(b => b.setAttribute('aria-pressed', b.dataset.split === key));
    $('split-title').textContent = key === 'source_disjoint' ? 'Evaluate on unseen source images.' : 'Evaluate new captures of familiar sources.';
    $('split-description').textContent = key === 'source_disjoint' ? 'A source image belongs to only one subset. This is the stricter check of generalization across the source collection.' : 'Sources may appear in multiple subsets, but their capture groups remain separate. This tests new simulated captures of familiar packages.';
    const labels = {train:'Training',val:'Validation',test:'Test'};
    $('split-bar').innerHTML = Object.entries(labels).map(([k]) => `<span style="width:${split[k]/stats.images*100}%"></span>`).join('');
    $('split-numbers').innerHTML = Object.entries(labels).map(([k,label]) => `<div><dt>${label}</dt><dd>${number(split[k])}</dd></div>`).join('');
  }
  async function showFormat(kind) {
    const sample = samples.find(s => s.id === 'TVIC29_C000_scratch');
    const record = await detail(sample);
    const options = {
      boxes: [`labels/boxes/${sample.split}/${sample.id}.txt`,'YOLO detection: class ID, normalized center x, center y, width, height. One row represents one visible instance.'],
      polygons: [`labels/polygons/${sample.split}/${sample.id}.txt`,'YOLO segmentation: class ID followed by normalized polygon vertices. These are outlines, not bounding boxes.'],
      provenance: ['provenance/records.jsonl','Shown here: one record excerpt from the full JSONL file, selected by image_id. It links the image to its source, clean counterpart, capture group, parameters, severity, and component labels.']
    };
    const [file,description] = options[kind];
    formatText = kind === 'provenance' ? JSON.stringify({image_id:record.image_id,source_id:record.source_id,capture_group:record.capture_group,split:record.split,component_classes:record.component_classes,components:record.components,seed:record.seed},null,2) : await (await fetch('samples/'+file)).text();
    $('format-file').textContent = file.replace('labels/boxes/', 'labels/').replace('labels/polygons/', 'labels_polygons/');
    $('format-content').textContent = formatText;
    $('format-description').textContent = description;
    document.querySelectorAll('[data-format]').forEach(b => b.setAttribute('aria-pressed',b.dataset.format === kind));
  }
  async function copy(value) {
    try { await navigator.clipboard.writeText(value); $('toast').textContent = 'Copied to clipboard'; } catch { $('toast').textContent = 'Select the text to copy it.'; }
    $('toast').classList.add('visible'); setTimeout(() => $('toast').classList.remove('visible'),2200);
  }
  function updateHeroComparison() {
    if (!$('hero-reveal')) return;
    const value = Number($('hero-reveal').value);
    const clip = `inset(0 ${100-value}% 0 0)`;
    $('hero-image').style.clipPath = clip;
    $('hero-overlay').style.clipPath = clip;
    $('hero-divider').style.left = `${value}%`;
    $('hero-divider').hidden = value === 0 || value === 100;
    $('hero-reveal').setAttribute('aria-valuetext', value === 0 ? 'Clean counterpart' : value === 100 ? 'Full synthetic image' : 'Split comparison, synthetic on the left and clean on the right');
  }
  function stopComparison() {
    if (comparisonFrame !== null) cancelAnimationFrame(comparisonFrame);
    comparisonFrame = null;
    if ($('play-comparison')) { $('play-comparison').textContent = '▶ Play comparison'; $('play-comparison').setAttribute('aria-pressed','false'); }
  }
  function playComparison() {
    if (comparisonFrame !== null) { stopComparison(); return; }
    if (reducedMotion.matches) { $('hero-reveal').value = Number($('hero-reveal').value) === 0 ? 100 : 0; updateHeroComparison(); return; }
    $('play-comparison').textContent = 'Ⅱ Pause comparison';
    $('play-comparison').setAttribute('aria-pressed','true');
    const started = performance.now();
    const tick = now => {
      const elapsed = now-started;
      if (elapsed >= 8000) { $('hero-reveal').value=100;updateHeroComparison();stopComparison();return; }
      $('hero-reveal').value = Math.round((1-Math.cos(elapsed/8000*Math.PI))*50);
      updateHeroComparison(); comparisonFrame = requestAnimationFrame(tick);
    };
    comparisonFrame = requestAnimationFrame(tick);
  }
  function stopTour() {
    clearInterval(tourTimer); tourTimer = null;
    if ($('play-tour')) { $('play-tour').textContent='▶ Play walkthrough';$('play-tour').setAttribute('aria-pressed','false'); }
  }
  function viewerList() { const list=filterSamples();return list.some(s=>s.id===current?.id)?list:samples; }
  function moveViewer(direction) {
    if (!current) return;
    const list=viewerList(), position=list.findIndex(s=>s.id===current.id);
    openViewer(list[(position+direction+list.length)%list.length].id);
  }
  function renderChart() {
    const index=Number($('chart-metric').value);
    const full=$('chart-population').value==='full';
    const selected=[...(full?paper.transfer.slice(0,2):paper.transfer.slice(2,4)),...paper.transfer.slice(4)];
    const parse=value=>String(value).split('±').map(v=>Number.parseFloat(v.trim()));
    if ($('chart-order').value==='score') selected.sort((a,b)=>index===5?parse(a[index])[0]-parse(b[index])[0]:parse(b[index])[0]-parse(a[index])[0]);
    const max=index===6?1:index===5?Math.max(0.5,...selected.map(r=>{const [m,s=0]=parse(r[index]);return m+s;})):Number(paper.transfer_headers[index].split('/')[1]);
    $('chart-axis').textContent=`${paper.transfer_headers[index]} · ${index===5?'lower is better':'higher is better'} · scale 0–${max.toFixed(index>=5?2:0)}`;
    $('transfer-chart').innerHTML=selected.map(row=>{
      const [mean,sd=0]=parse(row[index]), low=Math.max(0,mean-sd)/max*100, high=Math.min(max,mean+sd)/max*100;
      const label=row[0].replace(/\s*\[\d+\]/g,'');
      return `<button class="chart-row ${row[0].startsWith('Guidelines')?'our-row':''}" data-chart-method="${esc(row[0])}" aria-label="${esc(label)}: ${esc(row[index])}; uses real defect pixels: ${esc(row[1])}"><span class="chart-method">${esc(label)}</span><span class="chart-track" aria-hidden="true"><span class="chart-fill" style="width:${mean/max*100}%"></span>${sd?`<span class="chart-whisker" style="left:${low}%;width:${high-low}%"></span>`:''}</span><strong class="chart-value">${esc(row[index])}</strong></button>`;
    }).join('');
    $('chart-note').textContent='Bars show means; whiskers show ± sample SD, clipped to the valid scale. These are not confidence intervals or significance tests. Select a method to see its detection and false-alarm results together.';
    $('chart-detail').textContent='Choose a bar to inspect the method.';
  }
  function showChartDetail(method) {
    const row=paper.transfer.find(r=>r[0]===method);
    $('chart-detail').textContent=`${row[0]}: ${paper.transfer_headers[2]} = ${row[2]}; false boxes per defect-free frame = ${row[5]}; correct-class recall = ${row[6]}. Uses real defect pixels: ${row[1]}.`;
    document.querySelectorAll('.chart-row').forEach(b=>b.setAttribute('aria-pressed',b.dataset.chartMethod===method));
  }
  async function setupInteractions() {
    const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));
    // The initial clean image is present in HTML so it can load immediately.
    // Existing image elements are reused when selecting another specimen.
    document.querySelector('.specimen-image').insertAdjacentHTML('beforeend','<span id="hero-divider" class="comparison-divider" aria-hidden="true"><span>↔</span></span>');
    await yieldToBrowser();
    document.querySelector('.specimen-tabs').innerHTML=order.map(kind=>`<button data-hero="${kind}" aria-pressed="${kind===featured.label}">${names[kind]}</button>`).join('');
    await yieldToBrowser();
    $('hero-credit').insertAdjacentHTML('beforebegin','<div class="hero-comparison"><label for="hero-reveal"><span>Clean counterpart</span><span>Synthetic image</span></label><input id="hero-reveal" type="range" min="0" max="100" value="65" aria-label="Compare the featured image with its clean counterpart"><div class="comparison-help"><button id="play-comparison" class="text-button" aria-pressed="false">▶ Play comparison</button><span>Drag to reveal the defect</span></div></div>');
    await yieldToBrowser();
    $('hero-reveal').addEventListener('input',()=>{stopComparison();updateHeroComparison();});
    await yieldToBrowser();
    $('play-comparison').addEventListener('click',playComparison);updateHeroComparison();
    await yieldToBrowser();
    $('pipeline').insertAdjacentHTML('afterend','<div class="tour-controls"><button id="play-tour" class="button secondary" aria-pressed="false">▶ Play walkthrough</button><span id="tour-position" role="status"></span><span class="tour-help">Guided explanation using existing release examples, not live generation.</span></div>');
    await yieldToBrowser();
    $('tour-position').textContent=`${currentStep+1} / ${steps.length} · ${steps[currentStep][0]}`;
    await yieldToBrowser();
    $('play-tour').addEventListener('click',()=>{
      if(tourTimer!==null){stopTour();return;}
      showStep(0);$('play-tour').textContent='Ⅱ Pause walkthrough';$('play-tour').setAttribute('aria-pressed','true');
      tourTimer=setInterval(()=>{if(currentStep>=steps.length-1){stopTour();return;}showStep(currentStep+1);},5000);
    });
    await yieldToBrowser();
    document.querySelector('.filter-toolbar').insertAdjacentHTML('beforebegin','<div class="explore-search"><label for="image-search">Find an image<input id="image-search" type="search" placeholder="Search an image ID, source, or defect name" autocomplete="off"></label><button id="random-specimen" class="button secondary">Explore a random sample ↗</button></div>');
    await yieldToBrowser();
    $('image-search').addEventListener('input',()=>{shown=12;renderGrid();});
    await yieldToBrowser();
    $('random-specimen').addEventListener('click',()=>{const list=filterSamples();if(list.length)openViewer(list[Math.floor(Math.random()*list.length)].id);});
    await yieldToBrowser();
    $('viewer').setAttribute('aria-labelledby','viewer-title');
    await yieldToBrowser();
    document.querySelector('.viewer-layout').insertAdjacentHTML('beforebegin','<div class="viewer-navigation"><button id="previous-sample" class="button secondary" aria-label="Previous specimen">← Previous</button><span id="viewer-position" role="status"></span><button id="next-sample" class="button secondary" aria-label="Next specimen">Next →</button></div>');
    await yieldToBrowser();
    $('previous-sample').addEventListener('click',()=>moveViewer(-1));$('next-sample').addEventListener('click',()=>moveViewer(1));
    await yieldToBrowser();
    $('viewer').addEventListener('keydown',event=>{if(/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;if(event.key==='ArrowLeft'){event.preventDefault();moveViewer(-1);}if(event.key==='ArrowRight'){event.preventDefault();moveViewer(1);}});
    await yieldToBrowser();
    document.querySelector('.results-details').insertAdjacentHTML('beforebegin',`<section class="interactive-results" aria-labelledby="chart-title"><div class="chart-heading"><div><p class="eyebrow">Explore the reported results</p><h3 id="chart-title">Change the measure. See the trade-off.</h3></div><p>Existing manuscript results only. No model runs in the browser.</p></div><div class="chart-controls"><label>Training comparison<select id="chart-population"><option value="matched">${esc(paper.transfer[2][0].replace(', product-matched',''))} + baselines</option><option value="full">Full release + baselines</option></select></label><label>Measure<select id="chart-metric">${[2,3,4,5,6].map(i=>`<option value="${i}">${esc(paper.transfer_headers[i])}</option>`).join('')}</select></label><label>Order<select id="chart-order"><option value="paper">Paper order</option><option value="score">Best point estimate first</option></select></label></div><p id="chart-axis" class="chart-axis"></p><div id="transfer-chart" class="transfer-chart"></div><p id="chart-note" class="note"></p><div id="chart-detail" class="chart-detail" role="status"></div></section>`);
    await yieldToBrowser();
    ['chart-population','chart-metric','chart-order'].forEach(id=>$(id).addEventListener('change',renderChart));renderChart();
    await yieldToBrowser();
    document.querySelector('.site-header').insertAdjacentHTML('beforeend','<div class="reading-progress" aria-hidden="true"><span id="reading-progress-fill"></span></div>');
    await yieldToBrowser();
    const navigation=[...document.querySelectorAll('#navigation a')];let scrollFrame=null;
    await yieldToBrowser();
    const updatePosition=()=>{
      scrollFrame=null;const available=document.documentElement.scrollHeight-innerHeight;
      $('reading-progress-fill').style.transform=`scaleX(${available>0?scrollY/available:0})`;
      let active=null;for(const link of navigation){const section=document.querySelector(link.getAttribute('href'));if(section&&section.getBoundingClientRect().top<=170)active=link;}
      navigation.forEach(link=>{if(link===active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
    };
    await yieldToBrowser();
    addEventListener('scroll',()=>{if(scrollFrame===null)scrollFrame=requestAnimationFrame(updatePosition);},{passive:true});updatePosition();
    await yieldToBrowser();
    if(!reducedMotion.matches){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target);}}),{threshold:0.06});document.querySelectorAll('.section-heading,.cause-grid article,.evidence-cards article').forEach(element=>{element.classList.add('reveal-item');observer.observe(element);});}
    document.addEventListener('visibilitychange',()=>{if(document.hidden){stopTour();stopComparison();}});
    await yieldToBrowser();
    reducedMotion.addEventListener('change',()=>{stopTour();stopComparison();});
    await yieldToBrowser();
  }
  function setupAccess() {
    const doi = config.zenodo_doi;
    $('reserved-doi').textContent = doi;
    $('zenodo-record').href = `https://doi.org/${doi}`;
    $('copy-doi').disabled = !doi;
    $('copy-doi').addEventListener('click',()=>copy(doi));
    const email = config.request_access_email;
    const subject = 'ICMarkingSynthetic research access request';
    const body = `Hello,\n\nI would like to request access to ICMarkingSynthetic.\nDOI: ${doi}\n\nName:\nAffiliation:\nResearch purpose:\nRequested materials (dataset, generator, or both):\n\nThank you.`;
    $('request-email').href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    $('request-contact').href = `mailto:${email}`;
    $('request-contact').textContent = email;
    for (const kind of ['dataset','code']) {
      const archive = release[kind];
      $(kind+'-archive-name').textContent = archive.name;
      const size = archive.bytes >= 1e9 ? `${(archive.bytes/1e9).toFixed(2)} GB` : `${(archive.bytes/1e6).toFixed(2)} MB`;
      $(kind+'-archive-meta').textContent = `${size} · Uploaded · Restricted`;
    }
    $('archive-checksums').innerHTML = ['dataset','code'].map(kind=>`<dt>${esc(release[kind].name)}</dt><dd>${esc(release[kind].sha256)}</dd>`).join('');
    const descriptions = {
      docs:'Annotation format definitions and preserved validation results.',
      examples:'Executed browsing and statistics notebooks, plus loading, training, and face-crop scripts.',
      images:'Full grayscale images in source-disjoint train, validation, and test folders.',
      masks:'Union and component renderer-support masks. These are not exhaustive maps of every changed pixel.',
      labels:'YOLO bounding boxes, arranged for the standard detector loader.',
      labels_polygons:'Normalized instance polygons for segmentation.',
      labels_coco:'Pixel-space boxes and polygons in COCO format.',
      face_crop:'The same images cropped to the package face, with transformed labels and their own dataset definitions.',
      splits:'CSV source membership and capture-group-safe product-matched image lists.',
      provenance:'Per-image generation records, source attribution, and auxiliary defect-free counterparts.',
      supplement_cosmetic:'Separate cosmetic hard negatives and their labels and face crops, outside the balanced main collection.'
    };
    const folders = Object.entries(release.dataset.folders).map(([name,count])=>`<div><code>${esc(name)}/</code><p>${esc(descriptions[name] || 'Supporting archive files.')} <span class="micro">${number(count)} files</span></p></div>`).join('');
    const docs = Object.entries(release.documents).map(([path,content])=>`<details><summary>${esc(path)} <span aria-hidden="true">+</span></summary><pre>${esc(content)}</pre></details>`).join('');
    document.querySelector('#formats .shell').insertAdjacentHTML('beforeend',`<div class="package-guide"><h3>Inside the uploaded dataset archive</h3><div class="package-folders">${folders}</div><p>Top-level orientation, attribution, license, checksum, dataset-definition, and metadata files accompany these folders. The following documentation is read directly from the verified archive.</p>${docs}</div>`);
    document.querySelector('.request-details').insertAdjacentHTML('afterend',`<details class="package-guide"><summary>Generator contents, installation, and reproduction limits <span aria-hidden="true">+</span></summary><pre>${esc(release.code.readme)}</pre><pre>${esc(release.code.tested_platforms)}</pre></details>`);
  }
  function whenNear(ids, work) {
    let pending = true;
    const observer = new IntersectionObserver(entries => {
      if (pending && entries.some(entry => entry.isIntersecting)) {
        pending = false; observer.disconnect(); work();
      }
    }, {rootMargin: '250px'});
    ids.forEach(id => observer.observe($(id)));
  }
  async function init() {
    const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));
    [stats,samples,sources,summary,paper,config,release] = await Promise.all(['stats','featured','sources','sample_summary','paper','config','release'].map(name => json(`data/${name}.json`)));
    const measures = [[stats.images,'synthetic images'],[stats.image_classes,'image classes'],[stats.defect_types,'defect types'],[stats.sources,'source images'],[stats.visible_instances,'visible instances']];
    await yieldToBrowser();
    $('key-metrics').innerHTML = measures.map(([value,label]) => `<div class="metric"><strong>${number(value)}</strong><span>${label}</span></div>`).join('');
    await yieldToBrowser();
    $('pipeline').innerHTML = steps.map((s,i) => `<button data-step="${i}" aria-pressed="${i===0}"><span>${String(i+1).padStart(2,'0')}</span>${s[0]}</button>`).join('');
    await yieldToBrowser();
    await yieldToBrowser();
    $('explore-intro').textContent = `A traceable sample of ${number(summary.sample_images)} release images, ${number(summary.class_counts.good)} per class. Inspect the clean counterpart and annotations without downloading an archive.`;
    await yieldToBrowser();
    $('class-filters').innerHTML = [['all','All images'],...order.map(k => [k,names[k]])].map(([key,label]) => `<button data-class="${key}" aria-pressed="${key==='all'}">${label}</button>`).join('');
    await yieldToBrowser();
    $('filter-source').innerHTML += sources.map(s => `<option value="${esc(s.id)}">${esc(s.id)}</option>`).join('');
    await yieldToBrowser();
    $('group-label').textContent = 'TVIC29_C000';
    await yieldToBrowser();
    $('group-strip').innerHTML = order.map(kind => { const s=samples.find(s=>s.group==='TVIC29_C000'&&s.label===kind); return `<div><button data-open="${s.id}" aria-label="Inspect ${names[kind]} example"><img src="${s.thumb}" width="480" height="240" loading="lazy" alt="${names[kind]} example from the same capture"><span>${names[kind]}</span></button><p class="image-credit">${credit(s.source)}</p></div>`; }).join('');
    await yieldToBrowser();
    $('composition').innerHTML = stats.classes.map(c => `<tr><th scope="row">${names[c.label]}</th><td>${number(c.images)}</td><td>${number(c.instances)}</td></tr>`).join('');
    await yieldToBrowser();
    $('supplement-copy').textContent = `${number(stats.capture_groups)} capture groups connect the balanced collection. A separate ${number(stats.cosmetic_images)}-image cosmetic supplement is not part of the ${number(stats.images)} images. The archive includes ${number(release.counterparts)} auxiliary clean counterparts recovered from the original captures. The viewer always uses the matching stored counterpart, not an approximate regeneration.`;
    await yieldToBrowser();
    await yieldToBrowser();
    $('inspector-result').textContent = paper.inspector_adapted + '%';
    await yieldToBrowser();
    $('inspector-description').textContent = `On the synthetic test split, with thresholds fitted on synthetic validation images. Published thresholds yield ${paper.inspector_published}% in the manuscript.`;
    await yieldToBrowser();
    $('transfer-result').innerHTML = `${esc(paper.transfer[0][2])}<small> / ${esc(paper.transfer_headers[2].split('/')[1].trim())}</small>`;
    await yieldToBrowser();
    $('transfer-table').innerHTML = `<caption>Detector transfer on real frames. FB: mean false boxes per defect-free frame. Values are mean ± sample SD over training seeds. Bracketed source numbers refer to the manuscript bibliography.</caption><thead><tr>${paper.transfer_headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${paper.transfer.map(row=>`<tr>${row.map((v,i)=>i?`<td>${esc(v)}</td>`:`<th scope="row">${esc(v)}</th>`).join('')}</tr>`).join('')}</tbody>`;
    await yieldToBrowser();
    $('format-choices').innerHTML = [['boxes','Bounding boxes','Detection labels'],['polygons','Instance polygons','Segmentation labels'],['provenance','Generation record','Traceable image metadata']].map(([k,t,d])=>`<button data-format="${k}" aria-pressed="${k==='boxes'}"><strong>${t}</strong><span>${d}</span></button>`).join('');
    await yieldToBrowser();
    citationText = `@unpublished{hoque${paper.year}icmarkingsynthetic,\n  title = {${paper.paper_title}},\n  author = {Hoque, Md Sami Ul and Kehtarnavaz, Nasser},\n  year = {${paper.year}},\n  note = {Manuscript under review}\n}`;
    await yieldToBrowser();
    $('citation-text').textContent = citationText;
    await yieldToBrowser();
    whenNear(['citation'], () => { $('attribution-table').innerHTML = sources.map(s=>`<tr><th scope="row"><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.id)}</a></th><td>${esc(s.author)}</td><td><a href="${esc(s.license_url)}" target="_blank" rel="noopener noreferrer">${esc(s.license)}</a></td><td>${esc(s.modifications)} Synthetic capture and defects applied for this collection.</td></tr>`).join(''); });
    await yieldToBrowser();
    $('reference-text').innerHTML = `[1] <a href="${esc(paper.reference_url)}" target="_blank" rel="noopener noreferrer">${esc(paper.reference)}</a>`;
    await yieldToBrowser();
    $('build-date').textContent = 'Prepared ' + new Date(config.generated).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
    await yieldToBrowser();
    whenNear(['explore'], async () => { samples = await json('data/sample_index.json'); renderGrid(); }); showSplit('source_disjoint');
    await yieldToBrowser();
    await yieldToBrowser();
    await Promise.all([showHero('scratch'),showStep(0),showFormat('boxes')]);
    await setupInteractions();
    await yieldToBrowser();
    await yieldToBrowser();
    whenNear(['formats','access'], setupAccess);
    await yieldToBrowser();
    document.body.dataset.ready = 'true';
    // Restore the requested section after asynchronous content changes page height.
    const initialSection = document.getElementById(location.hash.slice(1));
    if (initialSection) requestAnimationFrame(() => initialSection.scrollIntoView({behavior:'instant', block:'start'}));
    await yieldToBrowser();
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button'); if(!button) return;
    if(button.dataset.hero) {stopComparison();showHero(button.dataset.hero);}
    if(button.dataset.step!==undefined) {stopTour();showStep(Number(button.dataset.step));}
    if(button.dataset.class) {selectedClass=button.dataset.class;shown=12;document.querySelectorAll('[data-class]').forEach(b=>b.setAttribute('aria-pressed',b===button));renderGrid();}
    if(button.dataset.open) openViewer(button.dataset.open);
    if(button.dataset.split) showSplit(button.dataset.split);
    if(button.dataset.format) showFormat(button.dataset.format);
    if(button.dataset.chartMethod) showChartDetail(button.dataset.chartMethod);
  });
  ['filter-source','filter-severity','filter-split','filter-sort'].forEach(id=>$(id).addEventListener('change',()=>{shown=12;renderGrid();}));
  $('load-more').addEventListener('click',()=>{shown+=12;renderGrid();});
  $('reset-filters').addEventListener('click',()=>{selectedClass='all';shown=12;if($('image-search'))$('image-search').value='';['filter-source','filter-severity','filter-split'].forEach(id=>$(id).value='all');$('filter-sort').value='curated';document.querySelectorAll('[data-class]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.class==='all'));renderGrid();});
  $('hero-open').addEventListener('click',()=>openViewer(featured.id));
  $('close-viewer').addEventListener('click',()=>$('viewer').close());
  $('viewer').addEventListener('click',event=>{if(event.target===$('viewer')) {const r=$('viewer').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('viewer').close();}});
  ['show-boxes','show-polygons','show-mask'].forEach(id=>$(id).addEventListener('change',updateOverlay));
  $('compare-slider').addEventListener('input',updateOverlay);
  $('copy-format').addEventListener('click',()=>copy(formatText));
  $('copy-citation').addEventListener('click',()=>copy(citationText));
  const menu=document.querySelector('.menu-toggle');menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',open);$('navigation').classList.toggle('open',open);});
  $('navigation').addEventListener('click',event=>{if(event.target.closest('a')){menu.setAttribute('aria-expanded','false');$('navigation').classList.remove('open');}});
  init().catch(error=>{$('filter-count').textContent='The preview data could not be loaded. Please refresh from the local server.';console.error(error);});
})();
