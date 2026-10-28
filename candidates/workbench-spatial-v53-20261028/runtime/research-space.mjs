import {normalizeData,normalizeState,selectedRecord,spatialLayout,productDelta,formatMoney,presetView,centsToMoney} from './space-model.mjs';
import {createSpaceRenderer} from './space-renderer.mjs';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(text,action)=>{const b=el('button','',text);b.type='button';b.addEventListener('click',action);return b;};
const labeled=(text,node)=>{const l=el('label','rs-control');l.append(el('span','',text),node);return l;};
export function createResearchSpace({host,data,state:initial={},onAction=()=>{}}){
 if(!host?.append)throw new TypeError('A DOM host is required');
 let model=normalizeData(data),state=normalizeState(model,initial),disposed=false,rendererStatus='',layout=spatialLayout(model,state);
 const root=el('section','research-space');root.setAttribute('aria-label','产品与报告期空间研究');
 const heading=el('div','rs-heading'),title=el('h3','rs-title'),subtitle=el('p','rs-subtitle');heading.append(title,subtitle);
 const toolbar=el('div','rs-toolbar');toolbar.setAttribute('aria-label','研究空间视角与切片');
 const mode3d=button('三维探索',()=>dispatch({mode:'3d'},{type:'mode',mode:'3d'}));const mode2d=button('二维辅助',()=>dispatch({mode:'2d'},{type:'mode',mode:'2d'}));
 const overview=button('空间总览',()=>setPreset('overview')),compare=button('正交精确比较',()=>setPreset('compare'));
 const focus=button('聚焦所选产品',()=>{const r=selectedRecord(model,state);if(r)dispatch({focusId:r.productId,view:presetView('focus',state.view)},{type:'focus',focusId:r.productId});});
 const reset=button('恢复全部',()=>dispatch({focusId:null,period:'all',view:presetView('overview',state.view)},{type:'reset',focusId:null,period:'all',view:presetView('overview',state.view)}));
 const pause=button('锁定视角',()=>dispatch({paused:!state.paused},{type:'pause',paused:!state.paused}));
 toolbar.append(mode3d,mode2d,overview,compare,focus,reset,pause);
 const filters=el('div','rs-filters'),periodSelect=el('select'),orderSelect=el('select');periodSelect.setAttribute('aria-label','报告期切面');orderSelect.setAttribute('aria-label','产品排列');
 orderSelect.append(new Option('原披露顺序','source'),new Option('跨期变动：减少额优先','delta'));
 periodSelect.addEventListener('change',()=>dispatch({period:periodSelect.value},{type:'period',period:periodSelect.value}));
 orderSelect.addEventListener('change',()=>dispatch({view:{...state.view,order:orderSelect.value}},{type:'view',view:{...state.view,order:orderSelect.value}}));
 filters.append(labeled('报告期切面',periodSelect),labeled('产品排列',orderSelect));
 const zoomOut=button('−',()=>setView({...state.view,zoom:state.view.zoom/1.2})),zoomIn=button('+',()=>setView({...state.view,zoom:state.view.zoom*1.2}));zoomOut.setAttribute('aria-label','缩小空间');zoomIn.setAttribute('aria-label','放大空间');
 const left=button('↶',()=>setView({...state.view,preset:'custom',yaw:state.view.yaw+.18})),right=button('↷',()=>setView({...state.view,preset:'custom',yaw:state.view.yaw-.18}));left.setAttribute('aria-label','向左旋转');right.setAttribute('aria-label','向右旋转');
 filters.append(el('span','rs-camera-label','视角'),left,right,zoomOut,zoomIn);
 const question=el('p','rs-question'),questionText=el('span'),questionButton=button('比较这项',()=>{const p=largestDecline();if(p){const r=model.records.find(r=>r.productId===p.id&&r.period===model.periods.at(-1)?.id);if(r)select(r.id);dispatch({focusId:p.id,period:'all',view:presetView('focus',state.view)},{type:'focus',focusId:p.id});}});question.append(questionText,questionButton);
 const scroll=el('div','rs-chart-scroll');scroll.setAttribute('tabindex','0');scroll.setAttribute('aria-label','可横向滚动的比较空间；完整对象入口在下方数字表');
 const legend=el('div','rs-legend'),status=el('p','rs-render-status'),scrollHint=el('p','rs-scroll-hint','↔ 图表可左右滑动，也可聚焦所选对象');status.setAttribute('role','status');
 const selection=el('div','rs-selection'),selectedText=el('p','rs-selected-value'),source=button('定位原始披露',()=>{const r=selectedRecord(model,state);if(r)onAction({type:'evidence',id:r.id,measurementId:r.id,productId:r.productId,period:r.period,sourceRefs:[...r.sourceRefs],record:serialRecord(r)});}),body=button('转到对应正文',()=>{const r=selectedRecord(model,state);if(r)onAction({type:'reading',id:r.productId,measurementId:r.id,period:r.period,sectionId:r.sectionId});});selection.append(selectedText,body,source);
 const tableWrap=el('div','rs-table-scroll'),table=el('table','rs-table');tableWrap.append(table);
 const help=el('p','rs-help','拖动旋转；Ctrl + 滚轮缩放，或使用视角按钮。表内方向键遍历对象，Enter 选择。三维与二维共享同一份金额、筛选与选择。');
 const scope=el('p','rs-scope'),notes=el('details','rs-notes'),encoding=el('p','rs-help'),summary=el('summary','','图表说明');notes.append(summary,encoding,help,scope);root.append(heading,toolbar,filters,question,scroll,scrollHint,legend,status,selection,tableWrap,notes);host.append(root);
 const renderer=createSpaceRenderer({host:scroll,onSelect:select,onView:setView,onStatus:s=>{rendererStatus=s.reason||'';status.textContent=rendererStatus;if(s.renderer==='2d'&&state.mode==='3d'){state={...state,mode:'2d'};render();onAction({type:'renderer-fallback',mode:'2d',reason:rendererStatus});}}});
 function serialRecord(r){const {cents,...rest}=r;return {...rest,valueCents:cents===null?null:String(cents)};}
 function largestDecline(){return [...model.products].filter(p=>productDelta(model,p.id)!==null).sort((a,b)=>{const aa=productDelta(model,a.id),bb=productDelta(model,b.id);return aa<bb?-1:aa>bb?1:0;})[0];}
 function dispatch(next,action){if(disposed)return;state=normalizeState(model,{...state,...next,view:{...state.view,...next.view}});render();onAction(action);}
 function select(id){const r=model.records.find(r=>r.id===id);if(!r)return;dispatch({selectedId:r.productId,measurementId:r.id},{type:'select',id:r.productId,measurementId:r.id,period:r.period,record:serialRecord(r)});}
 function setView(view){if(state.paused)return;dispatch({view},{type:'view',view:normalizeState(model,{...state,view}).view});}
 function setPreset(preset){dispatch({view:presetView(preset,state.view)},{type:'view',view:presetView(preset,state.view)});}
 function rebuildTable(){
  const active=document.activeElement?.getAttribute?.('data-record');table.replaceChildren();
  const caption=el('caption','',`${model.metricLabel}精确值（元）；每个数值都是可选择对象`);table.append(caption);
  const thead=el('thead'),tr=el('tr');tr.append(el('th','',model.axisLabel));
  for(const p of layout.periods){const th=el('th','',p.label);th.scope='col';tr.append(th);}const dh=el('th','','两期变化（元）');dh.scope='col';if(model.comparablePeriods)tr.append(dh);thead.append(tr);table.append(thead);
  const tbody=el('tbody');for(const [i,p]of layout.products.entries()){
   const row=el('tr');const name=el('th','',`${String(i+1).padStart(2,'0')}  ${p.label}`);name.scope='row';row.append(name);
   for(const period of layout.periods){const td=el('td'),r=model.records.find(r=>r.productId===p.id&&r.period===period.id);if(r){const b=button(formatMoney(r.cents),()=>select(r.id));b.setAttribute('data-record',r.id);b.setAttribute('aria-label',`${p.label}，${period.label}，${model.metricLabel} ${formatMoney(r.cents)}${r.cents===null?'':'元'}`);b.setAttribute('aria-pressed',String(r.id===state.measurementId||r.id===state.selectedId||(!state.measurementId&&r.productId===state.selectedId)));b.className='rs-value-button';td.append(b);}else td.textContent='未披露';row.append(td);}
   if(model.comparablePeriods){const delta=productDelta(model,p.id),td=el('td',delta===null?'':delta<0n?'rs-negative':'rs-positive',delta===null?'不可比':`${delta>0n?'+':''}${formatMoney(delta)}`);row.append(td);}tbody.append(row);
  }table.append(tbody);if(active){const target=[...table.querySelectorAll('[data-record]')].find(n=>n.getAttribute('data-record')===active);target?.focus({preventScroll:true});}
 }
 table.addEventListener('keydown',e=>{const target=e.target.closest?.('[data-record]');if(!target)return;const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];if(!keys.includes(e.key))return;e.preventDefault();const buttons=[...table.querySelectorAll('[data-record]')],index=buttons.indexOf(target),cols=layout.periods.length;let next=index;if(e.key==='ArrowLeft')next--;if(e.key==='ArrowRight')next++;if(e.key==='ArrowUp')next-=cols;if(e.key==='ArrowDown')next+=cols;if(e.key==='Home')next=0;if(e.key==='End')next=buttons.length-1;buttons[Math.max(0,Math.min(buttons.length-1,next))]?.focus();});
 let tableSignature='';
 function render(){
  layout=spatialLayout(model,state);const r=selectedRecord(model,state);
  title.textContent=`${model.axisLabel} × 报告期 × ${model.metricLabel}`;
  subtitle.textContent=`${model.periods.map(p=>p.label).join(model.periodOrderTrusted?' → ':' / ')} · 图中万元，精确表为元`;
  root.setAttribute('aria-label',`${model.axisLabel}与报告期空间研究`);focus.textContent=`聚焦所选${model.axisLabel}`;orderSelect.setAttribute('aria-label',`${model.axisLabel}排列`);filters.querySelectorAll('label')[1].querySelector('span').textContent=`${model.axisLabel}排列`;
  for(const [b,active]of [[mode3d,state.mode==='3d'],[mode2d,state.mode==='2d'],[overview,state.view.preset==='overview'],[compare,state.view.preset==='compare'],[pause,state.paused]])b.setAttribute('aria-pressed',String(active));
  pause.textContent=state.paused?'视角已锁定':'锁定视角';focus.disabled=!r;source.disabled=!r||!r.sourceRefs.length;body.disabled=!r;orderSelect.value=state.view.order;orderSelect.options[1].disabled=!model.comparablePeriods;
  for(const b of [left,right,zoomOut,zoomIn])b.disabled=state.paused||state.mode==='2d';
  const options=[['all','全部报告期'],...model.periods.map(p=>[p.id,p.label])];if(periodSelect.options.length!==options.length||options.some((x,i)=>periodSelect.options[i]?.value!==x[0])){periodSelect.replaceChildren(...options.map(([v,label])=>new Option(label,v)));}periodSelect.value=state.period;
  legend.replaceChildren(...model.periods.map((p,i)=>{const item=el('span',`rs-period-color rs-period-${i%4}`,p.label);return item;}));
  encoding.textContent=`横轴为${model.axisLabel}、深度为报告期，高度为金额。连线仅连接同一对象两期披露，不表示期间内走势；固定宽、深不表示金额。正交比较保留同一金额尺度。`;
  const p=largestDecline(),delta=p?productDelta(model,p.id):null;question.hidden=!p||!model.comparablePeriods;
  questionText.textContent=p?`${delta<0n?'减少最多':'增加最少'}：${p.label}，两期变化 ${delta>0n?'+':''}${formatMoney(delta,{wan:true})} 万元。 `:'';
  selectedText.textContent=r?`${r.productLabel} · ${r.period} · ${r.metricLabel} ${formatMoney(r.cents)}${r.cents===null?'':' 元'}${r.cents===null?'（未披露，不画作零）':''}`:'请选择一个已披露对象。';
  const chosenDelta=r?productDelta(model,r.productId):null;if(chosenDelta!==null)selectedText.append(document.createTextNode(`；两期变化 ${chosenDelta>0n?'+':''}${formatMoney(chosenDelta)} 元`));
  const selectedVisible=!r||layout.marks.some(m=>m.record.id===r.id);if(!selectedVisible)selectedText.append(document.createTextNode(' · 所选对象在当前切面之外；选择身份保留。'));
  status.textContent=rendererStatus;status.hidden=!rendererStatus;
  scope.textContent=[...model.limitations,...(r?.limitations||[])].join(' ');
  const sig=JSON.stringify([model.id,model.revision,model.records.map(x=>[x.id,x.amount]),layout.products.map(x=>x.id),layout.periods.map(x=>x.id),state.selectedId,state.measurementId]);if(sig!==tableSignature){tableSignature=sig;rebuildTable();}
  renderer.update(layout,state);
 }
 render();
 return {
  update(next={}){if(disposed)return;if(next.data){model=normalizeData(next.data);tableSignature='';}const incoming={...next.state};if(incoming.selectedId!==undefined&&incoming.selectedId!==state.selectedId&&incoming.measurementId===undefined)incoming.measurementId='';state=normalizeState(model,{...state,...incoming,view:{...state.view,...incoming.view}});render();},
  setMode(mode){dispatch({mode},{type:'mode',mode});},
  dispose(){if(disposed)return;disposed=true;renderer.dispose();root.remove();},
  getSnapshot(){return {dataId:model.id,revision:model.revision,recordIds:model.records.map(r=>r.id),visibleIds:layout.marks.map(m=>m.record.id),selectedRecord:((r)=>r?serialRecord(r):null)(selectedRecord(model,state)),state:structuredClone(state),domain:{...layout.domain},rendering:renderer.getSnapshot()};}
 };
}
/** Compatibility adapter only: identical model, scene and operations. */
export function mountResearchSpace(host,options){
 const data={id:options.id||'research',metricLabel:options.records[0]?.metricLabel,measurements:options.records.map(r=>({id:r.id,productId:r.productId,productLabel:r.productLabel,period:r.periodId,periodLabel:r.periodLabel,amount:r.valueCents===null?null:centsToMoney(r.valueCents),unit:'CNY',metricLabel:r.metricLabel,sourceRefs:r.sourceId?[r.sourceId]:[],sectionId:r.sectionId,limitations:r.limitations}))};
 const instance=createResearchSpace({host,data,state:options,onAction:a=>{if(a.type==='select')options.onSelect?.(a.measurementId,{productId:a.id,periodId:a.period,record:a.record});if(a.type==='evidence')options.onOpenEvidence?.(a.record);if(a.type==='view')options.onView?.(a.view);}});
 return {setState:partial=>instance.update({state:partial}),destroy:()=>instance.dispose(),getSnapshot:()=>instance.getSnapshot()};
}
