import {parseReport,HONGHUA_BEFORE} from '../research-history-data.js';
const PREFIX='c01-hybrid-reading-20261022:view:v1:';
export function viewMemoryKey(mode,search='') {
 if(!['overview','study','history'].includes(mode))return null;
 const {report}=parseReport(search);if(!report)return null;
 const versions=new URLSearchParams(search).getAll('version');let sha=report.sha256;
 if(mode==='history'){
  if(versions.length>1||versions.length&&(!['current','before'].includes(versions[0])||versions[0]==='before'&&report.slug!=='honghua'))return null;
  if(versions[0]==='before')sha=HONGHUA_BEFORE.sha256;
 }
 return PREFIX+mode+':'+report.slug+':'+sha;
}
export function safeView(value){
 const p=value?.presentation;if(!p||![p.yawDegrees,p.pitchDegrees,p.zoom].every(Number.isFinite))return null;
 return {presentation:{yawDegrees:Math.max(-4,Math.min(4,p.yawDegrees)),pitchDegrees:Math.max(-2,Math.min(2,p.pitchDegrees)),zoom:Math.max(.94,Math.min(1.06,p.zoom))},selectedId:typeof value.selectedId==='string'?value.selectedId:null};
}
