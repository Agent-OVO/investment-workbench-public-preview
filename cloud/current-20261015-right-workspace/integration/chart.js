export const escapeXml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function chartModel(evidence) {
 if(evidence.kind!=='chart'||!evidence.series?.length||evidence.series.some(n=>!Number.isFinite(n)))throw new Error('INVALID_CHART');
 const values=[...evidence.series], labels=evidence.labels?.length===values.length?[...evidence.labels]:values.map((_,i)=>String(i+1));
 const min=Math.min(0,...values),max=Math.max(0,...values),span=max-min||1;
 const total=values.reduce((a,b)=>a+b,0);
 if(evidence.chartType==='distribution'&&(values.some(v=>v<0)||total<=0))throw new Error('INVALID_DISTRIBUTION');
 let cumulative=0;const segments=values.map((value,i)=>{const fraction=total?value/total:0;const segment=Object.freeze({value,label:labels[i],fraction,start:cumulative});cumulative+=fraction;return segment;});
 return Object.freeze({id:evidence.id,type:evidence.chartType||'line',total,segments:Object.freeze(segments),values:Object.freeze(values),labels:Object.freeze(labels),min,max,span,points:Object.freeze(values.map((value,i)=>Object.freeze({value,label:labels[i],x:56+i*488/Math.max(1,values.length-1),y:240-(value-min)*180/span}))),units:evidence.units||'示意无量纲',title:evidence.title,source:evidence.source,timeRange:evidence.timeRange});
}
export function renderChartSvg(evidence,{height=300}={}){
 const H=Number.isFinite(height)?Math.max(300,Math.min(600,height)):300;
 const m=chartModel(evidence),title=escapeXml(m.title),ink='#253c44',paper='#f7f3e9';
 const text=(x,y,value,size=15,anchor='start')=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${ink}">${escapeXml(value)}</text>`;
 const header=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 ${H}" role="img" data-chart-type="${escapeXml(m.type)}" aria-label="${escapeXml(m.title+'；'+m.units+'；'+(m.timeRange||''))}"><rect width="600" height="${H}" fill="${paper}"/>`+text(30,28,m.title,17);
 const footer=text(30,H-10,m.units+' · '+(m.timeRange||''),12);
 if(m.type==='distribution'){
  const colors=['#986033','#426c75','#88967a','#65536e','#b1945f'],circumference=2*Math.PI*78;
  const arcs=m.segments.map((s,i)=>`<circle data-series-value="${s.value}" cx="158" cy="150" r="78" fill="none" stroke="${colors[i%colors.length]}" stroke-width="30" stroke-dasharray="${s.fraction*circumference} ${circumference}" stroke-dashoffset="${-s.start*circumference}" transform="rotate(-90 158 150)"><title>${escapeXml(s.label+': '+s.value+' ('+(s.fraction*100).toFixed(1)+'%)')}</title></circle>`).join('');
  const legend=m.segments.map((s,i)=>`<rect x="292" y="${69+i*38}" width="13" height="13" fill="${colors[i%colors.length]}"/>`+text(316,82+i*38,s.label+' · '+s.value+' / '+(s.fraction*100).toFixed(1)+'%',16)).join('');
  return header+arcs+text(158,147,m.total,24,'middle')+text(158,170,'合计',13,'middle')+legend+footer+'</svg>';
 }
 const left=56,right=560,top=58,bottom=H-64,width=right-left,plotHeight=bottom-top;
 const y=value=>bottom-(value-m.min)*plotHeight/m.span;
 // Bar geometry and category labels share one centre calculation. Never derive the label from line-chart points.
 const x=i=>m.type==='bar'?left+(i+.5)*width/m.values.length:left+i*(width-16)/Math.max(1,m.values.length-1);
 const format=value=>String(Number(value.toFixed(3)));
 const grid=[0,.5,1].map(t=>{const value=m.min+t*m.span,yy=y(value);return `<path d="M${left} ${yy}H${right}" stroke="#d8ddd5" stroke-width="1"/>`+text(46,yy+5,format(value),12,'end');}).join('');
 const zero=y(0);
 const art=m.type==='line'?`<polyline fill="none" stroke="#ac7040" stroke-width="4" points="${m.values.map((v,i)=>x(i)+','+y(v)).join(' ')}"/>`+m.values.map((value,i)=>`<circle data-series-value="${value}" cx="${x(i)}" cy="${y(value)}" r="5" fill="#ac7040"><title>${escapeXml(m.labels[i]+': '+value)}</title></circle>`).join(''):m.values.map((value,i)=>{const barWidth=width/m.values.length*.62;return `<rect data-series-value="${value}" data-category-index="${i}" x="${x(i)-barWidth/2}" y="${Math.min(y(value),zero)}" width="${barWidth}" height="${Math.max(1,Math.abs(zero-y(value)))}" fill="#587c74"><title>${escapeXml(m.labels[i]+': '+value)}</title></rect>`;}).join('');
 const labels=m.values.map((_,i)=>`<text data-category-index="${i}" x="${x(i)}" y="${H-36}" text-anchor="middle" font-size="14" fill="${ink}">${escapeXml(m.labels[i])}</text>`).join('');
 return header+grid+`<path d="M${left} ${top}V${bottom}H${right}" fill="none" stroke="#7b8c86"/>`+art+labels+footer+'</svg>';
}
