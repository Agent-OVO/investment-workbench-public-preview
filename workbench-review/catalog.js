import {CATALOG_PATH,QUERY_LIMIT,normalizeQuery,queryFromSearch,catalogHref,catalogReportHref,validSnapshot,loadSnapshot,saveSnapshot} from './catalog-state.js';

export function createCatalogPage({doc=document,win=window}={}){
 const input=doc.querySelector('[data-search-input]');if(!input)return null;
 const cards=[...doc.querySelectorAll('[data-report-card]')];
 const status=doc.querySelector('[data-search-status]'),empty=doc.querySelector('[data-search-empty]');
 const clear=input.form.querySelector('[type="reset"]');
 const links=cards.flatMap(card=>[...card.querySelectorAll('a')].map(link=>({link,card,href:link.getAttribute('href')})));
 const focusTargets=new Map([['search',input],['clear',clear],...links.map(({link},index)=>['link-'+index,link])]);
 const listeners=[];let disposed=false,restoreFrame=null,navigationSnapshot=null,navigationActiveElement=null;
 input.maxLength=QUERY_LIMIT;
 const on=(target,event,handler)=>{target.addEventListener(event,handler);listeners.push(()=>target.removeEventListener(event,handler));};
 const focusKey=target=>[...focusTargets].find(([,node])=>node===target)?.[0]||'';
 const capture=(target=doc.activeElement)=>({query:normalizeQuery(input.value),scrollY:Math.min(10000000,Math.max(0,Number(win.scrollY)||0)),focus:focusKey(target)});
 const remember=(snapshot=capture(),persist=false)=>{
  try{win.history.replaceState({...win.history.state,workbenchCatalog:snapshot},'',catalogHref(snapshot.query));}catch{/* Filtering remains usable if History API access is blocked. */}
  if(persist)saveSnapshot(win,snapshot);
 };
 const render=()=>{
  input.value=normalizeQuery(input.value);const value=input.value.trim().toLocaleLowerCase();let count=0;
  for(const card of cards){card.hidden=!card.dataset.search.toLocaleLowerCase().includes(value);if(!card.hidden)count++;}
  status.textContent=`显示 ${count} / ${cards.length} 份公开稿`;empty.hidden=count>0;
  for(const {link,href} of links){const target=catalogReportHref(href,input.value,win.location.href);if(target)link.setAttribute('href',target);}
 };
 const cancelRestore=()=>{if(restoreFrame!==null){win.cancelAnimationFrame(restoreFrame);restoreFrame=null;}};
 const restore=snapshot=>{
  cancelRestore();if(!snapshot)return;
  restoreFrame=win.requestAnimationFrame(()=>{restoreFrame=null;if(disposed)return;
   const target=focusTargets.get(snapshot.focus),card=links.find(item=>item.link===target)?.card;
   if(target&&!card?.hidden)target.focus({preventScroll:true});
   win.scrollTo(0,snapshot.scrollY);
  });
 };
 const readEntry=()=>{
  const query=queryFromSearch(win.location.search),resume=new URLSearchParams(win.location.search).get('resume')==='1';
  const snapshot=validSnapshot(win.history.state?.workbenchCatalog,query)||(resume?loadSnapshot(win,query):null);
  navigationSnapshot=null;input.value=query;render();remember(snapshot||capture());restore(snapshot);
 };
 const update=()=>{cancelRestore();navigationSnapshot=null;render();remember();};
 on(input,'input',update);
 on(input.form,'submit',event=>event.preventDefault());
 on(input.form,'reset',()=>queueMicrotask(()=>{if(!disposed)update();}));
 // Save the clicked link explicitly: some pointer-driven browsers do not focus anchors.
 for(const {link} of links)for(const event of ['click','auxclick','contextmenu'])on(link,event,()=>{cancelRestore();navigationSnapshot=capture(link);navigationActiveElement=doc.activeElement;remember(navigationSnapshot,true);});
 on(win,'pagehide',()=>{cancelRestore();const current=capture();if(navigationSnapshot&&doc.activeElement===navigationActiveElement)current.focus=navigationSnapshot.focus;remember(current,true);});
 on(win,'pageshow',event=>{if(event.persisted)readEntry();});
 on(win,'popstate',readEntry);
 readEntry();
 return {dispose(){disposed=true;cancelRestore();for(const off of listeners)off();},getState:()=>capture()};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'&&window.location.pathname===CATALOG_PATH)createCatalogPage();
