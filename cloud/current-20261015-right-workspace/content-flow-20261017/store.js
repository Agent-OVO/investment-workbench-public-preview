const views = new Set(['overview','focus','relations','timeline','reading','evidence']);
const spaceViews = new Set(['overview','focus','relations','timeline']);
const freeze = value => { if(value && typeof value==='object' && !Object.isFrozen(value)){Object.freeze(value);Object.values(value).forEach(freeze);} return value; };
export function validateContent(content) {
 if(content.schema!=='c01-content-v1'||content.synthetic!==true||!content.research?.length) throw new Error('CONTENT_SCHEMA');
 const researchIds=new Set(), results=new Set(), relationIds=new Set();
 for(const r of content.research){if(researchIds.has(r.researchId)||!r.versions?.length)throw new Error('CONTENT_RESEARCH');researchIds.add(r.researchId);
 const versions=new Set(), evidenceIds=new Set(r.evidence.map(e=>e.id));
 if(evidenceIds.size!==r.evidence.length)throw new Error('DUPLICATE_EVIDENCE');
 for(const v of r.versions){if(versions.has(v.versionId)||results.has(v.resultId))throw new Error('DUPLICATE_VERSION_RESULT');versions.add(v.versionId);results.add(v.resultId);
 if(v.evidenceIds.some(id=>!evidenceIds.has(id)))throw new Error('MISSING_EVIDENCE');
 for(const e of r.evidence){if(e.kind==='chart'&&(!e.series?.length||e.series.some(n=>!Number.isFinite(n))))throw new Error('INVALID_CHART');}
 }}
 for(const rel of content.relations){if(relationIds.has(rel.id)||!results.has(rel.fromResultId)||!results.has(rel.toResultId))throw new Error('INVALID_RELATION');relationIds.add(rel.id);}
 for(const r of content.research)for(const v of r.versions){for(const id of v.relationIds){const rel=content.relations.find(x=>x.id===id);if(!rel||rel.fromResultId!==v.resultId||rel.evidenceIds.some(x=>!v.evidenceIds.includes(x)))throw new Error('INVALID_VERSION_RELATION');}}
 return freeze(content);
}
export function createStore(input) {
 const content=validateContent(structuredClone(input)), listeners=new Set();
 const first=content.research[0], latest=first.versions.at(-1);
 let state=freeze({schema:'c01-state-v1',researchId:first.researchId,versionId:latest.versionId,resultId:latest.resultId,evidenceId:null,view:'overview',spaceView:'overview',evidenceReturnView:'overview',error:null,revision:0});
 const locate=(researchId,versionId)=>{const research=content.research.find(r=>r.researchId===researchId); if(!research)throw new Error('研究不存在：'+researchId); const version=research.versions.find(v=>v.versionId===versionId);if(!version)throw new Error('版本不存在：'+versionId);return {research,version};};
 const snapshot=()=>{const {research,version}=locate(state.researchId,state.versionId);const evidence=research.evidence.filter(e=>version.evidenceIds.includes(e.id));return freeze({state,research,version,resultId:version.resultId,evidence,selectedEvidence:evidence.find(e=>e.id===state.evidenceId)||null,relations:content.relations.filter(r=>version.relationIds.includes(r.id)&&r.fromResultId===version.resultId)});};
 const publish=patch=>{state=freeze({...state,...patch,revision:state.revision+1});const s=snapshot();listeners.forEach(fn=>fn(s));return state;};
 const selection=(researchId,versionId)=>{const {research,version}=locate(researchId,versionId);return {researchId:research.researchId,versionId:version.versionId,resultId:version.resultId,evidenceId:null};};
 const hydrate=hash=>{
 if(!hash||hash==='#')return {error:null};
 if(/%(?![a-f0-9]{2})/i.test(hash))throw new Error('链接编码无效');
 const p=new URLSearchParams(hash.replace(/^#/,'')), allowed=new Set(['research','version','result','view','evidence','space','from']);
 for(const key of p.keys())if(!allowed.has(key)||p.getAll(key).length!==1)throw new Error('链接字段无效或重复：'+key);
 if(!p.has('research')||!p.has('version'))throw new Error('链接缺少研究或版本');
 const chosen=selection(p.get('research'),p.get('version'));
 if(p.has('result')&&p.get('result')!==chosen.resultId)throw new Error('链接结果与版本不一致');
 const view=p.get('view')||'overview';if(!views.has(view))throw new Error('链接视图无效');
 const ev=p.get('evidence');const {version}=locate(chosen.researchId,chosen.versionId);
 if(ev&&!version.evidenceIds.includes(ev))throw new Error('该版本没有链接中的证据');
 if((view==='evidence')!==Boolean(ev))throw new Error('证据视图与证据字段不一致');
 const spaceView=spaceViews.has(view)?view:(p.get('space')||'overview');
 if(!spaceViews.has(spaceView))throw new Error('返回空间无效');
 if(spaceViews.has(view)&&(p.has('space')||p.has('from')))throw new Error('空间链接不应含弹层来源');
 const evidenceReturnView=view==='evidence'?(p.get('from')||spaceView):spaceView;
 if(view!=='evidence'&&p.has('from'))throw new Error('非证据视图不应含证据来源');
 if(!spaceViews.has(evidenceReturnView)&&evidenceReturnView!=='reading')throw new Error('证据来源无效');
 if(spaceViews.has(evidenceReturnView)&&evidenceReturnView!==spaceView)throw new Error('证据来源与返回空间不一致');
 return {...chosen,view,spaceView,evidenceReturnView,evidenceId:ev||null,error:null};
 };
 const dispatch=action=>{
 try{
 let patch={error:null};
 switch(action.type){
 case 'select': {const r=content.research.find(x=>x.researchId===action.researchId);if(!r)throw new Error('研究不存在：'+action.researchId);const targetView=action.view||'overview';if(!spaceViews.has(targetView))throw new Error('选择研究的目标视图无效');patch={...patch,...selection(r.researchId,action.versionId||r.versions.at(-1).versionId),view:targetView,spaceView:targetView,evidenceReturnView:targetView};break;}
 case 'set-version':patch={...patch,...selection(state.researchId,action.versionId),view:state.view==='evidence'?state.evidenceReturnView:state.view};break;
 case 'focus':case 'relations':case 'timeline':patch.view=patch.spaceView=patch.evidenceReturnView=action.type;patch.evidenceId=null;break;
 case 'read':patch.view='reading';patch.evidenceId=null;break;
 case 'overview':patch.view=patch.spaceView=patch.evidenceReturnView='overview';patch.evidenceId=null;break;
 case 'open-evidence':if(!snapshot().evidence.some(e=>e.id===action.evidenceId))throw new Error('该版本没有证据：'+action.evidenceId);patch.view='evidence';patch.evidenceReturnView=state.view==='evidence'?state.evidenceReturnView:state.view;patch.evidenceId=action.evidenceId;break;
 case 'close-evidence':case 'return-evidence':if(state.view==='evidence'){patch.view=state.evidenceReturnView;patch.evidenceId=null;}break;
 case 'return-space':if(state.view==='reading'||state.view==='evidence'){patch.view=state.spaceView;patch.evidenceId=null;patch.evidenceReturnView=state.spaceView;}break;
 case 'hydrate':patch=hydrate(action.hash);break;
 case 'clear-error':break;
 default:throw new Error('操作不存在：'+action.type);
 }
 return publish(patch);
 }catch(e){return publish({error:{code:action.type==='hydrate'?'INVALID_DEEP_LINK':'INVALID_ACTION',message:e.message}});}
 };
 return {getState:()=>state,getSnapshot:snapshot,dispatch,subscribe:fn=>{listeners.add(fn);fn(snapshot());return()=>listeners.delete(fn);}};
}
export function serializeState(state){const p=new URLSearchParams({research:state.researchId,version:state.versionId,result:state.resultId,view:state.view});if(state.evidenceId)p.set('evidence',state.evidenceId);if(['reading','evidence'].includes(state.view)){p.set('space',state.spaceView||'overview');if(state.view==='evidence')p.set('from',state.evidenceReturnView||state.spaceView||'overview');}return '#'+p;}

