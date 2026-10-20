// A module-loading failure must never erase the build-verified static article.
const status=document.querySelector('[data-load-status]');
import('./report.js').catch(()=>{
 if(status){status.setAttribute('role','alert');status.textContent='动态阅读组件未能加载；完整静态正文与来源仍在下方。可刷新页面重试。诊断：READER_MODULE_LOAD_FAILED';}
});
