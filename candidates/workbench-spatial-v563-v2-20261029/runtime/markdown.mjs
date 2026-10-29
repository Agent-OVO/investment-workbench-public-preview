/** Safe document DOM: no innerHTML, raw HTML execution, automatic external requests or eval. */
export function inline(text,doc=document,onLink=()=>{}){
 const fragment=doc.createDocumentFragment(),re=/(!?\[([^\]]*)\]\(([^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;let pos=0,m;
 while((m=re.exec(text))){fragment.append(doc.createTextNode(text.slice(pos,m.index)));if(m[4]){const e=doc.createElement('strong');e.textContent=m[4];fragment.append(e)}else if(m[5]){const e=doc.createElement('code');e.textContent=m[5];fragment.append(e)}else{const e=doc.createElement('button');e.type='button';e.className='inline-link';e.textContent=(m[1].startsWith('!')?'图：':'')+m[2];const href=m[3],label=m[2],isImage=m[1].startsWith('!');e.addEventListener('click',()=>onLink(href,label,isImage));fragment.append(e)}pos=re.lastIndex}
 fragment.append(doc.createTextNode(text.slice(pos)));return fragment
}
export function renderMarkdown(markdown,{doc=document,onLink=()=>{}}={}){
 const f=doc.createDocumentFragment(),lines=markdown.split('\n');let i=0;
 const add=(tag,text)=>{const n=doc.createElement(tag);n.append(inline(text,doc,onLink));f.append(n);return n};
 while(i<lines.length){const line=lines[i];if(!line.trim()){i++;continue}
  if(/^```/.test(line)){let text=[];i++;while(i<lines.length&&!/^```/.test(lines[i]))text.push(lines[i++]);add('pre',text.join('\n'));i++;continue}
  if(/^\s*\|/.test(line)&&i+1<lines.length&&/^\s*\|[\s:|\-]+$/.test(lines[i+1])){const wrap=doc.createElement('div');wrap.className='table-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','原文表格，可横向滚动');const table=doc.createElement('table');let header=true;while(i<lines.length&&/^\s*\|/.test(lines[i])){if(!/^[\s:|\-]+$/.test(lines[i])){const row=doc.createElement('tr');for(const cell of lines[i].trim().replace(/^\||\|$/g,'').split('|')){const c=doc.createElement(header?'th':'td');c.append(inline(cell.trim(),doc,onLink));row.append(c)}table.append(row);header=false}i++}wrap.append(table);f.append(wrap);continue}
  const h=line.match(/^(#{1,6})\s+(.*)$/);if(h){add('h'+Math.min(6,h[1].length+1),h[2]);i++;continue}
  if(/^[-*]\s+/.test(line)||/^\d+[.、]\s+/.test(line)){const ordered=/^\d/.test(line),list=doc.createElement(ordered?'ol':'ul');while(i<lines.length&&/^(?:[-*]|\d+[.、])\s+/.test(lines[i])){const li=doc.createElement('li');li.append(inline(lines[i].replace(/^(?:[-*]|\d+[.、])\s+/,''),doc,onLink));list.append(li);i++}f.append(list);continue}
  if(/^---+$/.test(line)){f.append(doc.createElement('hr'));i++;continue}
  if(/^>/.test(line)){add('blockquote',line.replace(/^>\s?/,''));i++;continue}
  let p=[line];i++;while(i<lines.length&&lines[i].trim()&&!/^(?:#{1,6}\s|\||```|[-*]\s|\d+[.、]\s|>)/.test(lines[i]))p.push(lines[i++]);add('p',p.join('\n'))
 }return f
}
