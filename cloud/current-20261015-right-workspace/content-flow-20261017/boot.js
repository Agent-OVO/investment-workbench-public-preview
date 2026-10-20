import('./main.js').catch(error=>{const status=document.querySelector('#boot-status');status.textContent='固定研究内容未能加载，接线候选未启动。请检查依赖；不会混用其他演示数据。'+error.message;status.setAttribute('role','alert');});
