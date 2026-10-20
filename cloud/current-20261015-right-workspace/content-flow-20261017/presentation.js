import {createContentAdapter} from '../content/art-rebuild/adapter.js';
import {renderChartSvg, chartModel, escapeXml as esc} from '../integration/chart.js';
import {displayEvidence, versionEvidence} from './content-context.js';
import {renderReadableChart} from './chart-reading.js';

export const STAGE_BASELINE=Object.freeze({relations:'c02-platform-b',timeline:'c03-trees-75',reading:'c04-whole-canopy'});
export const spaceFor=s=>['reading','evidence'].includes(s.state.view)?s.state.spaceView:s.state.view;
export const stageFor=s=>s.state.view==='reading'||(s.state.view==='evidence'&&s.state.evidenceReturnView==='reading')?'reading':spaceFor(s)==='timeline'?'timeline':'relations';
export function evidenceDelta(from,to){const a=from?.evidenceIds||[],b=to.evidenceIds;return {added:b.filter(id=>!a.includes(id)),removed:a.filter(id=>!b.includes(id))};}
export function continuationText(s) {
 const evidence=versionEvidence(s),allowed=new Set(evidence.map(e=>e.id));
 const question=typeof s.version.currentQuestion==='string'&&s.version.currentQuestion.trim()?s.version.currentQuestion.trim():'本版未单独定义当前问题。请先补充本次想继续研究的具体问题；不要把标题或正文中的示例提问擅自当作用户当前任务。';
 const records=evidence.map(e=>{
  const lines=[`${e.id} · ${e.title}`,`类型：${e.kind}${e.chartType?' / '+e.chartType:''}`,`来源：${e.source||'未提供'}`,`单位：${e.units||'不适用'}`,`时间 / 类别范围：${e.timeRange||'未提供'}`,`资料性质：${e.isSynthetic===true?'合成演示；不是实测或真实研究证据':'未标明；请核实'}`];
  if(e.kind==='chart'){
   const model=chartModel(e);
   lines.push(`数值（标签: 值）：${model.values.map((value,i)=>`${model.labels[i]}: ${value}`).join('；')}`);
   if(!e.labels)lines.push('图表未单独提供 labels 字段；上列数字标签为数据序位，不是新增的测量含义。');
  }else if(e.kind==='document'){
   lines.push(e.originalAvailable===false?'原始 PDF 不存在；原件不可用，不提供原件下载。':'原件可用状态未确认。');
   lines.push(e.syntheticPreviewAsset?'只有合成 SVG 预览；不等同于 PDF 原件。':'没有附带预览。');
   lines.push('本次文本复制不包含附件或预览图像；如需查看，请返回原界面。');
  }else{
   lines.push(`图像说明：${e.alt||e.title}`,'本次文本复制不包含图像文件或像素；需要看图时，请用户自行附图，不能假装已经查看。');
  }
  if(e.displayCorrection)lines.push(e.displayCorrection);
  return lines.join('\n');
 });
 const relations=s.relations.filter(rel=>rel.fromResultId===s.resultId&&s.version.relationIds.includes(rel.id)&&rel.evidenceIds.every(id=>allowed.has(id)));
 const relationText=relations.length?relations.map(rel=>`${rel.id} · ${rel.label}\n${rel.fromResultId} → ${rel.toResultId}\n依据：${rel.evidenceIds.join('、')}\n${rel.description}`).join('\n\n'):'本版未登记出站研究关系。';
 return [
  '请基于下列本版资料继续研究。这是合成验收数据，不是真实投资研究。',
  '这是供用户审阅后手动粘贴和发送的衔接文本；不会自动发送研究内容或附件。',
  `研究：${s.research.title}\nresearchId: ${s.state.researchId}\nresultId: ${s.resultId}\nversionId: ${s.version.versionId}\n版本阶段：${s.version.change}\n阶段标识：${s.version.dateLabel}`,
  `当前问题：${question}`,
  `当前阅读标题：${s.version.article.title}\n本版提要：${s.version.article.deck}`,
  '以下是当前选中版本的完整正文。文中涉及其他阶段的叙述不改变本版证据可用范围。',
  ...s.version.article.chapters.map(ch=>`${ch.title}\n${ch.paragraphs.join('\n\n')}`),
  `本版证据：${evidence.map(e=>e.id).join('、')}\n以下仅包含本版可用证据，未列材料不随本次衔接提供。`,
  ...records,
  `本版已登记关系（仅按保存记录，不从文字或布局推导）：\n${relationText}`,
  '来源记录：Agent-OVO/investment-research-spatial-frontend / cloud/current-20261015-right-workspace/content/index.js；内容基线 8c3b5cad015ff276b164dd13a9b2213a87ed2c07。',
  '原始外部来源链接、真实样本及事实时点均未提供。',
  '请先确认用户要继续的问题和缺少的资料，再讨论可能的研究步骤；不得将合成数据、模板中的后阶段叙述或图像说明当作真实结论或新增关系。'
 ].join('\n\n');
}
const evidenceButton=e=>`<button type="button" data-evidence="${esc(e.id)}" data-focus-key="evidence:${esc(e.id)}">${esc(e.id)} · ${esc(e.title)}${e.kind==='document'?' · 原 PDF 不存在':''}</button>`;
export function evidenceMedia(e,researchId){
 e=displayEvidence(e,researchId);
 if(e.kind==='chart')return renderReadableChart(e);
 if(e.kind==='document')return `<p class="missing">合成附件预览，原 PDF 不存在</p>${e.syntheticPreviewAsset?`<img src="${esc(e.syntheticPreviewAsset)}" alt="原创合成附件预览，非 PDF 原件">`:''}`;
 return e.kind==='image'&&/^data:image\/(svg\+xml|png|jpeg|webp);/.test(e.asset||'')?`<img src="${esc(e.asset)}" alt="${esc(e.alt||e.title)}">`:'';
}
const provenance=e=>`<small>来源：${esc(e.source)}<br>单位：${esc(e.units||'不适用')} · 时间范围：${esc(e.timeRange)}<br>合成演示；事实时点不适用${e.displayCorrection?`<br>${esc(e.displayCorrection)}`:''}</small>`;
export function renderPanel({store,content}){
 const s=store.getSnapshot(),p=createContentAdapter({store,content}).getPresentation();
 const view=spaceFor(s),identity=`${esc(s.state.researchId)} / ${esc(s.resultId)} / ${esc(s.state.versionId)}`;
 const intro=`<div class="identity">${identity}</div><h2>${esc(s.research.title)}</h2><p>${esc(s.version.article.deck)}</p><p class="synthetic">合成演示 · ${esc(s.version.dateLabel)} · 事实时点不适用</p>`;
 let main='';
 if(view==='timeline')main=`<h3>C03 · 版本时间剖面</h3><p>保存版本的资料变化，不代表越新越正确。</p>${s.research.versions.length===1?'<p class="empty">暂无可比较的历史版本。</p>':''}<ol class="version-list">${s.research.versions.map((v,i)=>{const d=evidenceDelta(s.research.versions[i-1],v);return `<li class="version-card${v.versionId===s.version.versionId?' selected':''}"><button type="button" data-version="${esc(v.versionId)}" data-focus-key="version:${esc(v.versionId)}" aria-pressed="${v.versionId===s.version.versionId}">${esc(v.versionId.toUpperCase())} · ${esc(v.dateLabel)}<strong>${esc(v.change)}</strong><span>${esc(v.resultId)}</span></button><p>${v.evidenceIds.length} 项证据 · ${v.article.chapters.length} 章正文</p><p>${i?'相对前一保存版':'首版登记'}：新增 ${esc(d.added.join('、')||'无')}；移除 ${esc(d.removed.join('、')||'无')}</p></li>`;}).join('')}</ol><p>所选版本：${esc(s.version.article.title)}</p><button type="button" data-action="read" data-focus-key="timeline:read">阅读所选 ${esc(s.version.versionId.toUpperCase())} 全文</button>`;
 else main=`<h3>C02 · 本版已登记的研究关系</h3>${p.relations.length?p.relations.map(rel=>`<section class="relation-card"><p class="relation-label">${esc(rel.label)} · 合成演示</p><h4>${esc(s.research.title)} → ${esc(rel.target.title)}</h4><p>${esc(rel.fromResultId)} → ${esc(rel.toResultId)}</p><p>仅代表已登记的主题关联。</p><div class="button-row">${rel.evidenceIds.map(id=>evidenceButton(s.evidence.find(e=>e.id===id))).join('')}</div><button type="button" data-relation="${esc(rel.id)}" data-focus-key="relation:${esc(rel.id)}">进入关联研究 ${esc(rel.target.versionId.toUpperCase())}</button></section>`).join(''):'<p class="empty">本版未登记出站研究关系。</p>'}<div class="empty-grid"><p>反证关系<br><strong>未登记</strong></p><p>共享证据关系<br><strong>未登记</strong></p><p>后续问题关系<br><strong>未登记</strong></p></div><div class="button-row"><button type="button" data-action="timeline" data-focus-key="relations:timeline">查看 ${s.research.versions.length} 个保存版本</button><button type="button" data-action="read" data-focus-key="relations:read">阅读全文</button></div>`;
 return `<section class="flow-primary">${intro}${main}</section><aside class="flow-evidence" aria-label="当前版本证据"><h3>本版证据 · ${s.evidence.length} 项</h3><p>依据所选版本限定，切版时同步更新。</p>${versionEvidence(s).map(e=>`<figure>${evidenceButton(e)}${evidenceMedia(e)}<figcaption>${provenance(e)}</figcaption></figure>`).join('')}</aside>`;
}
export function stageBindings({store,content}){
 const s=store.getSnapshot(),p=createContentAdapter({store,content}).getPresentation(),stage=stageFor(s);
 const item=(node,html,action)=>({node,html,action});
 if(stage==='timeline'){
  return s.research.versions.slice(0,4).map((v,i)=>{
   const selected=v.versionId===s.state.versionId;
   return {...item(`C03_0${i}__content_surface_blank`,`<b>${esc(v.versionId.toUpperCase())}${selected?' <span class="surface-selection-status" aria-hidden="true">· 当前选中</span>':''} · ${esc(v.change)}</b><span>${v.evidenceIds.length} 项证据 · ${v.article.chapters.length} 章</span><small>${esc(v.resultId)}</small>`,{type:'set-version',versionId:v.versionId}),selected};
  }).concat([item('C03_ENV__blank_action_landing_face','<b>阅读全文</b>',{type:'read'})]);
 }
 if(stage==='reading')return [item('C04_left_source_context_blank_insert','<b>合成演示</b><span>来源与单位见全文图注</span>',null),item('C04_right_chart_context_blank_insert',`<b>${s.evidence.length} 项本版证据</b>`,null)];
 const relation=p.relations[0],basis=relation&&versionEvidence(s).find(e=>e.id===relation.evidenceIds[0]);
 // A compact affordance describes only this saved relation and keeps its original action.
 const compactRelation=relation?{label:'关联',ariaLabel:`进入关联研究：${relation.target.title} ${relation.target.versionId.toUpperCase()}；${relation.label}；依据 ${relation.evidenceIds.join('、')}；合成演示`,fallbackFocusKey:`relation:${relation.id}`}:null;
 return [item('C02_FOCUS_ART_blank_content_plane',`<b>${esc(s.research.title)}</b><span>${esc(s.version.versionId.toUpperCase())} · ${s.evidence.length} 项证据</span><small>合成演示 · 点击全文</small>`,{type:'read'}),{...item('upper_left__C02_CLUSTER_ART_leaf_1_blank_replaceable_surface',relation?`<b>${esc(relation.label)}</b><span>→ ${esc(relation.target.title)}</span><small>依据 ${esc(relation.evidenceIds.join('、'))}</small>`:'<b>本版未登记关系</b>',relation?{type:'follow-relation',relationId:relation.id}:null),compactRelation},item('upper_right__C02_CLUSTER_ART_leaf_1_blank_replaceable_surface','<b>反证关系</b><span>未登记</span>',null),item('lower_left__C02_CLUSTER_ART_leaf_1_blank_replaceable_surface','<b>共享证据关系</b><span>未登记</span>',null),item('lower_right__C02_CLUSTER_ART_leaf_1_blank_replaceable_surface','<b>后续问题关系</b><span>未登记</span>',null),...(basis?[item('C02_BIND_floating_media_0',`<b>${esc(basis.title)}</b>${renderChartSvg(basis)}<small>${esc(basis.id)} · 合成演示</small>`,{type:'open-evidence',evidenceId:basis.id})]:[])];
}
