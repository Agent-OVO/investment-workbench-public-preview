import {render,selectedProducts} from './render.js';
import {byId} from './core.js';
import {getSource} from './domain.js';
import {parseRoute,stateFromSearch,searchFromState,normalizeState,reduceState} from './state.js';
import {captureContext,returnContext,sourcePath,workspacePath} from './navigation.js';
const base=new URL('../',import.meta.url).pathname;
const root=document.getElementById('app');
let route=parseRoute(location.pathname,base),state=stateFromSearch(location.search),returnTo=returnContext(history.state?.returnContext,base);
if(!selectedProducts.includes(state.product))state=normalizeState({...state,product:'repair'});
function source(){return route.kind==='source'?route.source:null;}
function currentPath(){return location.pathname+location.search;}
function context(focus=document.activeElement?.id||''){return captureContext(currentPath(),state,window.scrollY,focus);}
function setCurrent(focus=document.activeElement?.id||''){history.replaceState({...context(focus),returnContext:returnTo},'',currentPath());}
function paint({focus='',scroll=null,announce=''}={}){
 root.innerHTML=render({state,source:source(),base,error:route.kind==='notfound'});
 if(focus)document.getElementById(focus)?.focus({preventScroll:true});
 if(scroll!==null)window.scrollTo({top:scroll,left:0,behavior:'instant'});
 if(announce)document.getElementById('live-status').textContent=announce;
}
function push(path,{focus='',scroll=window.scrollY}={}){
 history.pushState({...captureContext(path,state,scroll,focus),returnContext:returnTo},'',path);
 route=parseRoute(location.pathname,base);paint({focus,scroll});
}
function revealSource(){
 const panel=document.querySelector('.source-reading'),rect=panel?.getBoundingClientRect?.();
 if(window.innerWidth<=800||(rect&&(rect.top<0||rect.top>window.innerHeight-120))){panel?.scrollIntoView({block:'start',behavior:'instant'});setCurrent('source-title');}
}
function openSource(alias,trigger){
 if(!getSource(alias))return;
 const isSource=route.kind==='source';
 if(!isSource){returnTo=context(trigger.id);setCurrent(trigger.id);}
 else setCurrent(trigger.id);
 const target=base+sourcePath(alias)+'?'+searchFromState(state);
 if(target===currentPath()){document.getElementById('source-title')?.focus({preventScroll:true});revealSource();return;}
 push(target,{focus:'source-title'});
 // The source replaces only the annotation column, inside the same reading plane.
 // On small screens that column is below the chart; reveal it without hiding data.
 revealSource();
}
function goBack(){
 const saved=returnContext(returnTo,base);setCurrent();
 if(saved){state=normalizeState(saved.state);returnTo=null;push(saved.path,{focus:saved.focus,scroll:saved.scroll});}
 else{ returnTo=null;push(base+workspacePath+'?'+searchFromState(state),{focus:'product-'+state.product}); }
}
root.addEventListener('click',event=>{
 const node=event.target.closest('button,a');if(!node)return;
 if(node.matches('a')&&(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0))return;
 if(node.dataset.source){event.preventDefault();openSource(node.dataset.source,node);}
 else if(node.hasAttribute('data-return')){event.preventDefault();goBack();}
 else if(node.dataset.product&&selectedProducts.includes(node.dataset.product)){
  setCurrent(node.id);state=reduceState(state,{type:'select',product:node.dataset.product});
  history.replaceState({...context(node.id),returnContext:returnTo},'',location.pathname+'?'+searchFromState(state));
  paint({focus:node.id,scroll:window.scrollY,announce:byId[state.product].label+'已选择；解释与来源已同步'});
 }
 else if(node.hasAttribute('data-mode')){
  state=reduceState(state,{type:'mode',value:state.mode==='flat'?'spatial':'flat'});
  history.replaceState({...context(node.id),returnContext:returnTo},'',location.pathname+'?'+searchFromState(state));paint({focus:node.id,scroll:window.scrollY});
 }
 else if(node.hasAttribute('data-workspace')){event.preventDefault();if(source())goBack();else{document.getElementById('research-title')?.focus();window.scrollTo({top:0,behavior:'instant'});}}
});
root.addEventListener('toggle',event=>{
 if(event.target.id!=='exact-values')return;
 state=reduceState(state,{type:'detail',value:event.target.open?'numbers':'evidence'});
 history.replaceState({...context(),returnContext:returnTo},'',location.pathname+'?'+searchFromState(state));
},true);
window.addEventListener('popstate',event=>{
 const restored=event.state;route=parseRoute(location.pathname,base);state=stateFromSearch(location.search,restored?.state||{});if(!selectedProducts.includes(state.product))state=normalizeState({...state,product:'repair'});
 returnTo=returnContext(restored?.returnContext,base);paint({focus:restored?.focus||(source()?'source-title':'research-title'),scroll:Number.isFinite(restored?.scroll)?restored.scroll:0});
});
window.addEventListener('pagehide',()=>setCurrent());
// Record natural scrolling without injecting any camera or wheel listeners.
let scrollTick=false;window.addEventListener('scroll',()=>{if(scrollTick)return;scrollTick=true;requestAnimationFrame(()=>{scrollTick=false;setCurrent();});},{passive:true});
history.scrollRestoration='manual';paint({scroll:Number.isFinite(history.state?.scroll)?history.state.scroll:null});setCurrent();
