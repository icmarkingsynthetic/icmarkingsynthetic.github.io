/* Render content from the existing data and UI functions, without a browser. */
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require(process.argv[2] || 'jsdom');
const root = path.resolve(__dirname, '..');
const dom = new JSDOM(fs.readFileSync(path.join(root,'index.template.html'),'utf8'), {
  url:'https://example.invalid/', runScripts:'outside-only', pretendToBeVisual:true
});
const w = dom.window;
let pending=0;
w.fetch=async url=>{
  pending++;
  try {
    const file=path.resolve(root,String(url));
    if(!file.startsWith(root+path.sep))throw Error('Input outside site');
    const value=await fs.promises.readFile(file,'utf8');
    return {ok:true,json:async()=>JSON.parse(value),text:async()=>value};
  } finally {pending--;}
};
w.matchMedia=()=>({matches:true,addEventListener(){}});
w.IntersectionObserver=class {
  constructor(callback){this.callback=callback;}
  observe(target){queueMicrotask(()=>this.callback([{target,isIntersecting:true}]));}
  disconnect(){} unobserve(){}
};
w.eval(fs.readFileSync(path.join(root,'assets/js/site.js'),'utf8'));
(async()=>{
  for(let i=0;i<100;i++){
    await new Promise(resolve=>setTimeout(resolve,50));
    if(w.document.body.dataset.ready==='true'&&pending===0)break;
  }
  for(const id of ['hero-class','key-metrics','composition','transfer-table','attribution-table','archive-checksums','format-content']){
    if(!w.document.getElementById(id).textContent.trim())throw Error('Missing rendered content: '+id);
  }
  w.document.body.dataset.prerender='true';
  w.document.querySelectorAll('[aria-current]').forEach(e=>e.removeAttribute('aria-current'));
  fs.writeFileSync(path.join(root,'index.html'),dom.serialize()+'\n');
  console.log('Static content generated from data files; original images unchanged.');
  w.close();
})().catch(error=>{console.error(error);w.close();process.exitCode=1;});
