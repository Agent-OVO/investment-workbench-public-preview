import {content} from '../content/index.js';
import {createContentAdapter} from '../content/art-rebuild/adapter.js';
import {createStore} from './store.js';
import {mountReader} from './reader.js';
import {installHistory} from './history.js';
import {renderPanel,stageBindings,stageFor,spaceFor,STAGE_BASELINE,continuationText} from './presentation.js';

const initialUI=window.history.state?.contentFlow?window.history.state.ui:null;
const store=createStore(content),adapter=createContentAdapter({store,content});
if(location.hash)store.dispatch({type:'hydrate',hash:location.hash});else store.dispatch({type:'relations'});
const el=id=>document.getElementById(id),panel=el('flow-panel'),spatial=el('spatial-details');
let scene=null,scenePromise=null,reader=null,currentStage=null,lastPanelKey=null,sceneSequence=0;
const cameras=new Map();
const capture=()=>{
 const diagnostics=scene?.getDiagnostics(),pose=diagnostics?.camera;if(pose&&currentStage&&diagnostics.currentVariant===STAGE_BASELINE[currentStage])cameras.set(currentStage,pose);
 return {reader:reader?.capture(),cameras:[...cameras],scroll:[window.scrollX,window.scrollY],focusKey:document.activeElement?.dataset?.focusKey||null};
};
const restore=ui=>{
 if(!ui)return;for(const [key,pose] of ui.cameras||[])cameras.set(key,pose);
 reader?.restore(ui.reader);const target=stageFor(store.getSnapshot());
 if(scene?.getDiagnostics().currentVariant===STAGE_BASELINE[target])scene.restorePose(cameras.get(target));
 requestAnimationFrame(()=>{reader?.restore(ui.reader);if(!['reading','evidence'].includes(store.getState().view)){if(ui.scroll)window.scrollTo(...ui.scroll);[...document.querySelectorAll('[data-focus-key]')].find(x=>x.dataset.focusKey===ui.focusKey)?.focus({preventScroll:true});}});
};
const history=installHistory({store,win:window,capture,restore});
document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault();panel.focus();panel.scrollIntoView({block:'start'});});
reader=mountReader({root:el('reader'),store,content});
function dispatch(action){
 if(action.type==='follow-relation'){
  const rel=adapter.getPresentation().relations.find(r=>r.id===action.relationId);
  if(!rel)return;store.dispatch({...rel.action,view:'relations'});
 }else store.dispatch(action);
}
// Keep only the last committed overlay, never a scene/model or history cache.
let lastAnchorRender=null;
function updateAnchors(){
 const layer=el('stage-bindings'),active=document.activeElement,hadAnchorFocus=[...layer.children].includes(active);
 const retainFocus=items=>{
  if(!hadAnchorFocus)return;
  const next=items.find(node=>node.dataset.focusKey===active.dataset.focusKey&&node.tagName==='BUTTON');
  const fallbackPanel=el('flow-panel');
  const fallback=spatial.open?[...(fallbackPanel?.querySelectorAll?.('[data-focus-key]')||[])].find(node=>node.dataset.focusKey===active.dataset.fallbackFocusKey)||fallbackPanel:spatial.querySelector?.('summary')||fallbackPanel;
  (next||fallback)?.focus({preventScroll:true});
 };
 if(!scene||!spatial.open){lastAnchorRender=null;if(layer.children.length)layer.replaceChildren();retainFocus([]);return;}
 const s=store.getSnapshot(),bindings=stageBindings({store,content}),anchors=scene.getContentAnchors(),rect=el('stage').getBoundingClientRect();
 const target=STAGE_BASELINE[stageFor(s)];
 if(scene.getDiagnostics().currentVariant!==target){lastAnchorRender=null;if(layer.children.length)layer.replaceChildren();retainFocus([]);return;}
 const entries=[];let omitted=0;
 for(const binding of bindings){const a=anchors.find(x=>x.name===binding.node);if(!a){omitted++;continue;}
  const w=(a.right-a.left)*rect.width,h=(a.bottom-a.top)*rect.height;
  // Never clamp a clipped physical anchor into an unrelated model location.
  if(!a.inDepth||a.left<0||a.top<0||a.right>1||a.bottom>1||!Number.isFinite(w)||!Number.isFinite(h)){omitted++;continue;}
  // Keep the full-card 105 × 44 guard. Only a registered relation can use a separate 44 × 44 target.
  const compact=w<105||h<44,relation=binding.action?.type==='follow-relation'&&binding.compactRelation;
  if(compact&&(!relation||w<44||h<44)){omitted++;continue;}
  entries.push({surface:binding.node,html:compact?'':binding.html,label:compact?relation.label:'',ariaLabel:compact?relation.ariaLabel:'',compact,
   fallbackFocusKey:relation?relation.fallbackFocusKey:'',selected:binding.selected,interactive:!!binding.action,action:binding.action,
   left:compact?(a.left*rect.width+(w-44)/2)+'px':(a.left*100)+'%',top:compact?(a.top*rect.height+(h-44)/2)+'px':(a.top*100)+'%',width:(compact?44:w)+'px',height:(compact?44:h)+'px'});
 }
 const previous=lastAnchorRender;
 const same=previous&&previous.layer===layer&&previous.scene===scene&&previous.target===target&&
  previous.researchId===s.state.researchId&&previous.versionId===s.state.versionId&&previous.resultId===s.resultId&&
  previous.width===rect.width&&previous.height===rect.height&&previous.omitted===omitted&&previous.entries.length===entries.length&&
  layer.children.length===previous.nodes.length&&previous.nodes.every((node,i)=>layer.children[i]===node)&&
  entries.every((entry,i)=>{const old=previous.entries[i];return ['surface','html','label','ariaLabel','compact','fallbackFocusKey','selected','interactive','left','top','width','height'].every(key=>entry[key]===old[key]);});
 if(same){
  // Equivalent markup can still carry a new action object or destination.
  entries.forEach((entry,i)=>{previous.entries[i].action=entry.action;});return;
 }
 const items=entries.map(entry=>{
  const node=document.createElement(entry.interactive?'button':'div');node.className='surface-content'+(entry.selected?' selected':'')+(entry.compact?' surface-relation-compact':'');
  if(entry.compact){node.textContent=entry.label;node.setAttribute('aria-label',entry.ariaLabel);}else node.innerHTML=entry.html;
  if(typeof entry.selected==='boolean')node.setAttribute('aria-pressed',String(entry.selected));
  node.dataset.focusKey='anchor:'+entry.surface;node.dataset.surface=entry.surface;node.dataset.fallbackFocusKey=entry.fallbackFocusKey;
  Object.assign(node.style,{left:entry.left,top:entry.top,width:entry.width,height:entry.height});
  if(entry.interactive){node.type='button';node.addEventListener('click',()=>dispatch(entry.action));}
  return node;
 });
 layer.replaceChildren(...items);retainFocus(items);
 el('anchor-status').textContent=omitted?`${omitted} 个资料面因裁切或字号空间不足，已保留下方完整可读入口。`:'内容标注来自当前版本；锚点对齐与遮挡仍待浏览器视觉确认。';
 lastAnchorRender={layer,scene,target,researchId:s.state.researchId,versionId:s.state.versionId,resultId:s.resultId,width:rect.width,height:rect.height,omitted,entries,nodes:items};
}
async function ensureScene(){
 if(scenePromise)return scenePromise;
 scenePromise=import('./stage.js').then(({mountStage})=>mountStage({root:el('stage-host'),variant:STAGE_BASELINE[stageFor(store.getSnapshot())],onUpdate:()=>{updateAnchors();history.save();}})).then(handle=>{scene=handle;currentStage=Object.keys(STAGE_BASELINE).find(key=>STAGE_BASELINE[key]===handle.getDiagnostics().currentVariant)||null;return handle;}).catch(error=>{el('status').textContent='空间场景不可用，完整研究操作与阅读仍可用。'+error.message;return null;});
 return scenePromise;
}
async function syncScene(){
 if(!spatial.open)return;
 const sequence=++sceneSequence,target=stageFor(store.getSnapshot()),handle=await ensureScene();if(!handle)return;
 if(!spatial.open){handle.suspend(true);return;}if(sequence!==sceneSequence)return;
 const before=handle.getDiagnostics();if(currentStage&&before.currentVariant===STAGE_BASELINE[currentStage]&&before.camera)cameras.set(currentStage,before.camera);
 // A retained scene can already match while an obsolete target is still loading.
 if(before.currentVariant!==STAGE_BASELINE[target]||before.requestedVariant!==STAGE_BASELINE[target])await handle.selectVariant(STAGE_BASELINE[target]);
 if(sequence!==sceneSequence)return;
 if(!spatial.open){handle.suspend(true);return;}if(handle.getDiagnostics().currentVariant!==STAGE_BASELINE[target])return;
 currentStage=target;handle.restorePose(cameras.get(target));
 // No continuous animation while reading or viewing evidence, or in reduced motion.
 handle.setAnimationPlaying(false);handle.suspend(false);updateAnchors();
}
for(const r of content.research)el('research').add(new Option(r.title,r.researchId));
el('research').addEventListener('change',()=>{store.dispatch({type:'select',researchId:el('research').value,view:'relations'});});
el('version').addEventListener('change',()=>store.dispatch({type:'set-version',versionId:el('version').value}));
document.addEventListener('click',event=>{
 const target=event.target.closest('[data-action],[data-version],[data-evidence],[data-relation]');if(!target)return;
 if(target.dataset.action)dispatch({type:target.dataset.action});
 else if(target.dataset.version){const key=target.dataset.focusKey;dispatch({type:'set-version',versionId:target.dataset.version});[...document.querySelectorAll('[data-focus-key]')].find(x=>x.dataset.focusKey===key)?.focus({preventScroll:true});}
 else if(target.dataset.evidence)dispatch({type:'open-evidence',evidenceId:target.dataset.evidence});
 else if(target.dataset.relation)dispatch({type:'follow-relation',relationId:target.dataset.relation});
});
store.subscribe(s=>{
 el('research').value=s.state.researchId;
 if(el('version').dataset.research!==s.state.researchId){el('version').replaceChildren(...s.research.versions.map(v=>new Option(`${v.versionId.toUpperCase()} · ${v.change}`,v.versionId)));el('version').dataset.research=s.state.researchId;}
 el('version').value=s.state.versionId;
 el('selection').textContent=`${s.resultId} · ${s.version.versionId.toUpperCase()} · ${s.evidence.length} 项证据 · ${s.relations.length} 条已登记出站关系`;
 const currentNav=stageFor(s)==='reading'?'read':stageFor(s);
 for(const id of ['relations','timeline','read'])el(id).setAttribute('aria-current',String(id===currentNav));
 el('error').hidden=!s.state.error;el('error').textContent=s.state.error?`链接或操作无法完成：${s.state.error.message}。当前有效研究保留。`:'';
 const panelKey=JSON.stringify([s.resultId,spaceFor(s)]);if(panelKey!==lastPanelKey){const active=document.activeElement,wasInPanel=panel.contains(active),focusKey=active?.dataset?.focusKey;panel.innerHTML=renderPanel({store,content});lastPanelKey=panelKey;if(wasInPanel&&!['reading','evidence'].includes(s.state.view)){const next=[...panel.querySelectorAll('[data-focus-key]')].find(x=>x.dataset.focusKey===focusKey);(next||panel).focus({preventScroll:true});}}
 el('continuation').value=continuationText(s);syncScene();updateAnchors();
});
spatial.addEventListener('toggle',()=>{if(spatial.open)syncScene();else{sceneSequence++;scene?.suspend(true);updateAnchors();}});
if(!matchMedia('(max-width: 800px)').matches)spatial.open=true;
el('continue').addEventListener('click',async()=>{
 const text=continuationText(store.getSnapshot());
 window.open('https://chatgpt.com/','_blank','noopener,noreferrer');
 try{await navigator.clipboard.writeText(text);el('continue-status').textContent='衔接文字已复制。请在 ChatGPT 中粘贴并确认发送；若新窗口未打开，请使用旁边的链接。';}
 catch{el('continuation').hidden=false;el('continuation').value=text;el('continuation').focus();el('continuation').select();el('continue-status').textContent='浏览器未允许自动复制。请复制下方已选文字，再在 ChatGPT 中粘贴。';}
});
el('boot-status').textContent='当前内容已接通；空间呈现与响应式效果待真实浏览器验收。';
window.CONTENT_FLOW_DEBUG={store,content,adapter,reader,getScene:()=>scene,getDiagnostics:()=>({state:store.getState(),reader:reader.getDiagnostics(),scene:scene?.getDiagnostics()||null,baseline:'79620ebe5d449f91519c70e2d4d6e9166366275d',visualAccepted:false}),capture,restore};
el('reader').addEventListener('scroll',()=>history.save(),true);
window.addEventListener('pagehide',()=>history.save());

restore(initialUI);
