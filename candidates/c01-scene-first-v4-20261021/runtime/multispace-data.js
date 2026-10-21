import {REPORTS, CANDIDATE_BASE, parseReport, historyFor} from '../research-history-data.js';
export const GROUPS=[['all','全部公开样本'],['equipment','设备与服务'],['resources','资源与能源'],['transport','交通专题'],['banks','银行专题']];
const tags={sinoseal:'equipment',yizumi:'equipment',honghua:'equipment',shaangu:'equipment',crsc:'equipment',zoomlion:'equipment',sungrow:'resources',yuntianhua:'resources',airtransport:'transport',baiyunfollowup:'transport',banks:'banks'};
export const categoryFor=slug=>tags[slug]||'all';
export function searchReports(query='',group='all') {const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);return REPORTS.filter(r=>(group==='all'||categoryFor(r.slug)===group)&&words.every(w=>(r.company+' '+r.title+' '+GROUPS.find(x=>x[0]===categoryFor(r.slug))?.[1]).toLocaleLowerCase().includes(w)));}
export function spaceHref(page,slug='') {if(!['overview','study'].includes(page))throw Error('UNKNOWN_SPACE_PAGE');if(slug&&!REPORTS.some(r=>r.slug===slug))throw Error('UNKNOWN_REPORT');return CANDIDATE_BASE+(page==='overview'?'':'study/')+(slug?'?report='+encodeURIComponent(slug):'');}
export function initialSelection(search) {const parsed=parseReport(search);return parsed.kind==='choose'?{kind:'selected',report:REPORTS.find(r=>r.slug==='sinoseal'),message:'初始展示中密控股公开快照，可从研究目录更换。',isDefault:true}:parsed;}
export function catalogState(report) {const h=historyFor(report.slug);return {snapshots:h.snapshotCount,label:h.kind,limitation:h.limitation,related:h.related};}
export function paragraphPreview(raw,max=170){const blocks=raw.split(/\n\s*\n/).filter(s=>s.trim()&&!/^\s*[#|\-*>]/.test(s.trim())&&!/https?:\/\//.test(s));return (blocks[0]||'请进入完整原稿查看研究内容。').replace(/[*_`]/g,'').replace(/\s+/g,' ').slice(0,max);}
