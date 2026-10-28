import {publicViews} from './views.js';import {sourcePage,sourceIndex,originalPage} from './pages.js';
import {normalize,reduce,fromSearch,toSearch,routeFor,context} from './public-state.js';
import {productIdentity} from './domain.js';import {byId} from './core.js';import {amountGeometry} from './chart-model.js';
import {readingSpatialSpec} from './reading-spatial-model.js';import {createSceneRenderer} from './scene-renderer.js';
const BASE=new URL('../',import.meta.url),ROOT=BASE.pathname,KEY='sinoseal-public-preview-r2:reading';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let saved=null;try{saved=context(JSON.parse(sessionStorage.getItem(KEY)));}catch{}
const motion=matchMedia('(prefers-reduced-motion: reduce)');let state=fromSearch(location.search,saved?.state||{paused:motion.matches});
let route=routeFor(location.pathname.startsWith(ROOT)?location.pathname.slice(ROOT.length):'missing'),scene=null,sceneObserver=null,sceneVisible=true,layoutFrame=0,renderToken=0;
let rendererStatus={kind:'pending',label:'正在准备三维场景'};
const href=(path='',extra={})=>{let next=normalize({...state,...extra});if(Object.hasOwn(extra,'product'))next=reduce(next,{type:'select',product:extra.product});return new URL(path,BASE).pathname+'?'+toSearch(next);};
function capture(){if(route.kind==='workspace')state=normalize({...state,methodOpen:$$('details[data-method-disclosure]').filter(x=>x.open).map(x=>x.id)});return {path:route.path,state:{...state},scroll:scrollY,focus:document.activeElement?.id||'',returnContext:history.state?.returnContext||null};}
function save(c=capture()){history.replaceState({...c,app:KEY},'',href(route.path)+(location.hash||''));try{sessionStorage.setItem(KEY,JSON.stringify(c));}catch{}}
function restore(c){const token=renderToken;requestAnimationFrame(()=>{if(token!==renderToken)return;scrollTo({top:c?.scroll||0,behavior:'instant'});if(c?.focus)document.getElementById(c.focus)?.focus({preventScroll:true});scheduleSceneLayout();});}
function navigate(path,{nextState=state,originFocus=null}={}){
 const prior=capture();if(originFocus)prior.focus=originFocus;save(prior);const next=routeFor(path);if(next.kind==='missing')return;
 state=normalize({...nextState,methodOpen:prior.state.methodOpen});route=next;const c={path:route.path,state:{...state},scroll:0,focus:'page-title',returnContext:prior};history.pushState({...c,app:KEY},'',href(route.path));render();restore(c);
}
function dispatch(action,{focus=document.activeElement?.id}={}){const c=capture();state=reduce(state,action);save({...c,state:{...state},focus});render();restore({...c,state:{...state},focus});}
function back(){if(history.state?.app===KEY&&history.state?.returnContext){history.back();return;}navigate('research/sinoseal/');}
function shell(){return `<a class="skip" href="#main">跳到研究内容</a><header class="masthead"><a class="brand" data-route href="${href('')}"><span>中密研究<small>SPATIAL RESEARCH</small></span></a><nav class="main-nav" aria-label="导航"><a id="nav-workspace" data-route href="${href('research/sinoseal/')}">对象研究</a><a id="nav-original" data-route href="${href('originals/sinoseal/')}">完整原稿</a><a id="nav-sources" data-route href="${href('sources/')}">来源</a></nav><div class="global-tools"><button id="pause" aria-pressed="${state.paused}">${state.paused?'动效已暂停':'暂停动效'}</button><button id="mode-toggle" aria-pressed="${state.mode==='flat'}">${state.mode==='flat'?'恢复三维':'二维视图'}</button></div></header><main id="main"></main><footer class="page-footer"><span>空间阅读 R2 · 初步候选</span><span>研究快照 2026.10.17 · 无实时行情</span></footer>`;}
function render(){cancelSceneLayout();++renderToken;document.body.innerHTML=shell();const main=$('#main');main.innerHTML=route.kind==='workspace'?publicViews({state,href,rendererStatus}).workspace():route.kind==='source'?sourcePage({alias:route.source,state,href}):route.kind==='sources'?sourceIndex(href):route.kind==='original'?originalPage(href):`<h1 id="page-title">未登记页面</h1><a data-route href="${href('')}">返回对象研究</a>`;document.body.dataset.page=route.kind;document.body.dataset.mode=state.mode;document.body.classList.toggle('motion-paused',state.paused);document.title='中密研究 · 空间阅读 R2';initScene();}

function positionChartAxes(){for(const tick of $$('[data-axis-position]'))tick.style.setProperty('left',tick.dataset.axisPosition+'%');}

function cancelSceneLayout(){if(layoutFrame)cancelAnimationFrame(layoutFrame);layoutFrame=0;}

function scheduleSceneLayout(){if(layoutFrame)return;layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;updateScene();});}

function updateScene(){
 positionChartAxes();
 const host=$('#scene-stage'),canvas=$('#scene-canvas');if(!host||!canvas){scene?.setState({visible:false});return;}
 const chart=$('#chart-stage');if(!chart)return;
 const width=host.clientWidth,height=host.clientHeight,base=host.getBoundingClientRect(),domainMin=Number(chart.dataset.domainMin),domainMax=Number(chart.dataset.domainMax);
 const sceneRows=[...host.querySelectorAll('.entity-anchor')].map(el=>{const r=el.getBoundingClientRect(),productId=el.dataset.selectProduct,value=Number(el.dataset.value),g=amountGeometry(value,{left:r.left-base.left,right:r.right-base.left,domainMin,domainMax});return {id:productIdentity(productId),productId,value,positive:value>0,x0:g.x0,x1:g.x1,y:r.top-base.top+r.height/2,height:22};});
 const reading=readingSpatialSpec({product:state.product,base,selectedRow:document.getElementById('select-'+state.product)?.closest('.product-lane')?.getBoundingClientRect(),focus:$('.reading-focus-anchor')?.getBoundingClientRect(),ports:$$('[data-spatial-source]').map(el=>({alias:el.dataset.spatialSource,rect:el.getBoundingClientRect()}))});
 scene?.setScene({kind:'reading',width,height,rows:sceneRows,reading,selectedId:productIdentity(state.product),domainMin,domainMax});
 scene?.setState({selectedId:productIdentity(state.product),product:state.product,paused:state.paused,visible:sceneVisible&&!document.hidden,mode:state.mode});
 host.dataset.renderer=rendererStatus.kind;host.dataset.mode=state.mode;chart.dataset.renderer=rendererStatus.kind;chart.dataset.mode=state.mode;
}

function initScene(){
 positionChartAxes();
 const canvas=$('#scene-canvas');sceneObserver?.disconnect();sceneObserver=null;if(!canvas){sceneVisible=false;scene?.setState({visible:false});return;}
 sceneVisible=true;
 if(scene?.reparentTo)scene.reparentTo(canvas);else{scene?.dispose();scene=createSceneRenderer({canvas,onSelect:(id,hit)=>{const product=hit?.productId||String(id).match(/:product:([a-z-]+)$/)?.[1];if(product&&Object.hasOwn(byId,product))dispatch({type:'select',product,id:productIdentity(product)});},onStatus:status=>{rendererStatus=typeof status==='string'?{label:status,kind:'fallback'}:status;const host=$('#scene-stage');if(host)host.dataset.renderer=rendererStatus.kind;const chart=$('#chart-stage');if(chart)chart.dataset.renderer=rendererStatus.kind;if($('#renderer-status'))$('#renderer-status').textContent=state.mode==='flat'?'二维视图 · 数据和选择保持完整':rendererStatus.label;}});}
 updateScene();
 if(typeof IntersectionObserver!=='undefined'){sceneObserver=new IntersectionObserver(entries=>{sceneVisible=entries.some(entry=>entry.isIntersecting);scene?.setState({visible:sceneVisible&&!document.hidden});},{threshold:0.01});sceneObserver.observe($('#scene-stage'));}
 if(document.fonts?.ready)document.fonts.ready.then(()=>updateScene());
}
document.addEventListener('click',e=>{
 const a=e.target.closest('a');if(a&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){
  if(a.hasAttribute('data-route')){const url=new URL(a.href);if(url.origin!==location.origin||!url.pathname.startsWith(ROOT))return;e.preventDefault();navigate(url.pathname.slice(ROOT.length),{nextState:fromSearch(url.search,state),originFocus:a.id||null});return;}
  const fragment=a.getAttribute('href');if(fragment?.startsWith('#')){const target=document.getElementById(fragment.slice(1));if(target){e.preventDefault();const focus=fragment==='#selected-reading'?document.getElementById('selected-title'):target;target.scrollIntoView({behavior:'instant',block:'start'});focus?.focus({preventScroll:true});save();scheduleSceneLayout();}return;}
 }
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.hasAttribute('data-back'))back();else if(b.id==='pause')dispatch({type:'pause'},{focus:b.id});else if(b.id==='mode-toggle')dispatch({type:'mode',value:state.mode==='flat'?'spatial':'flat'},{focus:b.id});else if(b.dataset.selectProduct){if(b.hasAttribute('data-open-numbers'))state=reduce(state,{type:'detail',value:'numbers'});dispatch({type:'select',product:b.dataset.selectProduct},{focus:b.hasAttribute('data-open-numbers')?'detail-numbers':b.id});}else if(b.dataset.detail)dispatch({type:'detail',value:b.dataset.detail},{focus:'detail-'+b.dataset.detail});else if(b.dataset.chartMode)dispatch({type:'chartMode',value:b.dataset.chartMode},{focus:b.id});
});
document.addEventListener('toggle',e=>{const d=e.target;if(route.kind==='workspace'&&d.tagName==='DETAILS'&&d.dataset.methodDisclosure===d.id&&document.getElementById(d.id)===d){state=reduce(state,{type:'methodToggle',id:d.id,open:d.open});save();scheduleSceneLayout();}},true);
window.addEventListener('scroll',()=>{save();scheduleSceneLayout();},{passive:true});window.addEventListener('resize',scheduleSceneLayout);
window.addEventListener('popstate',e=>{const c=e.state?.app===KEY?context(e.state):null;route=routeFor(location.pathname.startsWith(ROOT)?location.pathname.slice(ROOT.length):'missing');state=c?.state||fromSearch(location.search);render();restore(c);});
document.addEventListener('visibilitychange',()=>scene?.setState({visible:sceneVisible&&!document.hidden}));
window.addEventListener('pagehide',()=>{cancelSceneLayout();save();scene?.setState({visible:false});});window.addEventListener('unload',()=>{cancelSceneLayout();sceneObserver?.disconnect();scene?.dispose();});
motion.addEventListener('change',e=>{if(e.matches)dispatch({type:'pause',value:true});});
if('scrollRestoration'in history)history.scrollRestoration='manual';const initial=history.state?.app===KEY?context(history.state):null;if(initial)state=initial.state;render();save(initial||capture());if(initial)restore(initial);
