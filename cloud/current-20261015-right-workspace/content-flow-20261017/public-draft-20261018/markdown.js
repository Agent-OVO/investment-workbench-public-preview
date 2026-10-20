// Deliberately small, text-only Markdown subset for this fixed local research draft.
// Raw HTML is never interpreted. Unrecognised syntax remains visible text.
export function safeExternalURL(value) {
  if (typeof value !== 'string' || value !== value.trim() || /[\u0000-\u0020\u007f\\]/u.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

// Inline subset: HTTPS links, exact **strong** pairs, and single-backtick code.
// Code is opaque. Strong and code may appear in link labels; links/code may appear
// inside strong. Nested links, images, other delimiter runs and malformed spans
// stay literal. Unclosed link/code or non-closing strong openers keep the remaining
// inline block literal. Backslash escapes only the punctuation below, outside code.
// Every token retains a plain text value; source Markdown is never rewritten.
const escapedPunctuation = new Set(['\\','`','*','[',']','(',')','!']);
const runEnd = (text,start,char) => {let end=start;while(text[end]===char)end++;return end;};

function codeSpan(text,start) {
  const openingEnd=runEnd(text,start,'`'),marker=text.slice(start,openingEnd);
  let cursor=openingEnd;
  while(cursor<text.length) {
    const close=text.indexOf('`',cursor);
    if(close<0)break;
    const end=runEnd(text,close,'`');
    if(end-close===marker.length) {
      const value=text.slice(openingEnd,close);
      return {end,text:text.slice(start,end),value,supported:marker.length===1&&value.length>0&&!value.includes('\n')};
    }
    cursor=end;
  }
  // An unmatched delimiter is opaque through the end of this inline block.
  return {end:text.length,text:text.slice(start),supported:false};
}

function linkSpan(text,start) {
  const image=text[start]==='!',open=start+(image?1:0);
  if(text[open]!=='[')return null;
  const literal=end=>({end,text:text.slice(start,end),href:null});
  let cursor=open+1,depth=1,nested=false;
  for(;cursor<text.length;cursor++) {
    if(text[cursor]==='\n')return literal(text.length);
    if(text[cursor]==='\\'){cursor++;continue;}
    if(text[cursor]==='`'){cursor=codeSpan(text,cursor).end-1;continue;}
    if(text[cursor]==='['){depth++;nested=true;}
    if(text[cursor]===']'){depth--;if(depth===0)break;}
  }
  if(cursor>=text.length)return literal(text.length);
  if(text[cursor+1]!=='(')return literal(cursor+1);
  const label=text.slice(open+1,cursor),destinationStart=cursor+2;
  let parens=1,nestedDestination=false;
  for(cursor=destinationStart;cursor<text.length;cursor++) {
    if(text[cursor]==='\n')return literal(text.length);
    if(text[cursor]==='('){parens++;nestedDestination=true;}
    if(text[cursor]===')'){parens--;if(parens===0)break;}
  }
  if(cursor>=text.length)return literal(text.length);
  const href=!image&&!nested&&!nestedDestination&&safeExternalURL(text.slice(destinationStart,cursor));
  return {end:cursor+1,text:text.slice(start,cursor+1),label,href:href||null};
}

function strongEnd(text,start) {
  if(!text[start+2]||/\s/u.test(text[start+2]))return -1;
  for(let cursor=start+2;cursor<text.length;) {
    if(text[cursor]==='\\'){cursor+=2;continue;}
    if(text[cursor]==='`'){cursor=codeSpan(text,cursor).end;continue;}
    if(text[cursor]==='['||text.startsWith('![',cursor)) {
      const link=linkSpan(text,cursor);
      if(link){cursor=link.end;continue;}
    }
    if(text[cursor]==='*') {
      const end=runEnd(text,cursor,'*');
      if(end-cursor===2&&!/\s/u.test(text[cursor-1]))return cursor;
      cursor=end;continue;
    }
    cursor++;
  }
  return -1;
}

function tokenize(text,{links=true,strong=true}={}) {
  const tokens=[];
  const literal=value=>{if(!value)return;const last=tokens.at(-1);if(last?.type==='text')last.text+=value;else tokens.push({type:'text',text:value});};
  for(let cursor=0;cursor<text.length;) {
    const char=text[cursor];
    if(char==='\\'&&escapedPunctuation.has(text[cursor+1])){literal(text[cursor+1]);cursor+=2;continue;}
    if(char==='`') {
      const code=codeSpan(text,cursor);
      if(code.supported)tokens.push({type:'code',text:code.value});else literal(code.text);
      cursor=code.end;continue;
    }
    if(char==='['||text.startsWith('![',cursor)) {
      const link=linkSpan(text,cursor);
      if(link) {
        if(links&&link.href) {
          const children=tokenize(link.label,{links:false,strong});
          tokens.push({type:'link',text:children.map(token=>token.text).join(''),href:link.href,children});
        } else literal(link.text);
        cursor=link.end;continue;
      }
    }
    if(char==='*') {
      const end=runEnd(text,cursor,'*');
      if(strong&&end-cursor===2) {
        const close=strongEnd(text,cursor);
        if(close>=0) {
          const children=tokenize(text.slice(end,close),{links,strong:false});
          tokens.push({type:'strong',text:children.map(token=>token.text).join(''),children});
          cursor=close+2;continue;
        }
        // Conservative fallback also avoids rescanning adversarial unmatched runs.
        literal(text.slice(cursor));break;
      }
      literal(text.slice(cursor,end));cursor=end;continue;
    }
    literal(char);cursor++;
  }
  return tokens;
}

export function inlineTokens(text) {
  if(typeof text!=='string')throw new TypeError('LOCAL_INLINE_TEXT_REQUIRED');
  return tokenize(text);
}

// Use the same display semantics for text-only TOC and accessible labels.
export const inlinePlainText=text=>inlineTokens(text).map(token=>token.text).join('');

const heading = line => /^(#{1,6})\s+(.+)$/.exec(line);
const listItem = line => /^(?:(\d+)\. |(-) )(.+)$/.exec(line);
const isTableRow = line => /^\s*\|.*\|\s*$/.test(line);
const cells = line => line.trim().slice(1, -1).split('|').map(cell => cell.trim());
const tableDivider = line => isTableRow(line) && cells(line).every(cell => /^:?-{3,}:?$/.test(cell));

export function parseMarkdown(raw,{anchorPrefix='local'}={}) {
  if(!/^local(?:-[a-z]+)?$/.test(anchorPrefix))throw Error('LOCAL_ANCHOR_PREFIX_REQUIRED');
  if (typeof raw !== 'string') throw new TypeError('LOCAL_DOCUMENT_TEXT_REQUIRED');
  const lines = raw.split('\n'), blocks = [];
  const append = (type, start, end, data={}) => blocks.push({type, startLine:start+1, endLine:end, source:lines.slice(start,end).join('\n'), ...data});
  for (let index = 0; index < lines.length;) {
    const start = index, line = lines[index];
    if (!line.trim()) { append('blank',index,++index); continue; }
    const h = heading(line);
    if (h) { append('heading',index,++index,{level:h[1].length,text:h[2],anchor:`${anchorPrefix}-line-${start+1}`}); continue; }
    if (isTableRow(line) && tableDivider(lines[index+1] || '')) {
      const header=cells(line), rows=[];
      index+=2;
      while(index<lines.length && isTableRow(lines[index])) rows.push(cells(lines[index++]));
      // An irregular table is preserved as text rather than silently losing cells.
      if(rows.some(row=>row.length!==header.length)) append('literal',start,index);
      else append('table',start,index,{header,rows});
      continue;
    }
    const item=listItem(line);
    if(item) {
      const ordered=!!item[1], items=[];
      while(index<lines.length) {
        const current=listItem(lines[index]);
        if(!current || !!current[1]!==ordered) break;
        items.push({text:current[3],number:ordered?Number(current[1]):null});
        index++;
      }
      append('list',start,index,{ordered,items});continue;
    }
    index++;
    while(index<lines.length && lines[index].trim() && !heading(lines[index]) && !listItem(lines[index]) && !(isTableRow(lines[index]) && tableDivider(lines[index+1] || ''))) index++;
    append('paragraph',start,index,{text:lines.slice(start,index).join('\n')});
  }
  return {raw,anchorPrefix,blocks,headings:blocks.filter(block=>block.type==='heading'),lineCount:lines.length};
}

function element(doc,tag,text) {
  const node=doc.createElement(tag);
  if(text!==undefined) node.textContent=text;
  return node;
}
function appendTokens(doc,parent,tokens) {
  for(const token of tokens) {
    if(token.type==='text') parent.append(doc.createTextNode(token.text));
    else if(token.type==='code') parent.append(element(doc,'code',token.text));
    else if(token.type==='strong') {
      const strong=element(doc,'strong');appendTokens(doc,strong,token.children);parent.append(strong);
    } else if(token.type==='link') {
      const link=element(doc,'a');appendTokens(doc,link,token.children);
      link.href=token.href;link.target='_blank';link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';
      link.setAttribute('aria-label',`${token.text.trim()}（外部来源，新标签页）`);
      parent.append(link);
    }
  }
}
const appendInline=(doc,parent,text)=>appendTokens(doc,parent,inlineTokens(text));

export function renderMarkdown(doc,model) {
  const fragment=doc.createDocumentFragment();
  let parent=fragment, currentSection=null, lastHeading='原文表格', tableCount=0;
  for(const block of model.blocks) {
    if(block.type==='blank') continue;
    let node;
    if(block.type==='heading') {
      if(block.level===2) {
        currentSection=element(doc,'section');currentSection.className='c01-chapter';fragment.append(currentSection);parent=currentSection;
      } else if(block.level===1) parent=fragment;
      node=element(doc,`h${block.level}`);node.id=block.anchor;node.tabIndex=-1;appendInline(doc,node,block.text);
      if(block.level===2) currentSection.setAttribute('aria-labelledby',block.anchor);
      lastHeading=inlinePlainText(block.text);
    } else if(block.type==='paragraph') {node=element(doc,'p');appendInline(doc,node,block.text);}
    else if(block.type==='literal') node=element(doc,'pre',block.source);
    else if(block.type==='list') {
      node=element(doc,block.ordered?'ol':'ul');
      if(block.ordered) node.start=block.items[0].number;
      for(const item of block.items) {const li=element(doc,'li');if(block.ordered)li.value=item.number;appendInline(doc,li,item.text);node.append(li);}
    } else if(block.type==='table') {
      node=element(doc,'div');node.className='local-table-scroll';node.tabIndex=0;node.setAttribute('role','region');
      const table=element(doc,'table'),caption=element(doc,'caption',`原文表 ${++tableCount} · ${lastHeading}`);
      node.id=`${model.anchorPrefix||'local'}-table-region-${block.startLine}`;caption.id=`${model.anchorPrefix||'local'}-table-${block.startLine}`;node.setAttribute('aria-labelledby',caption.id);table.append(caption);
      const head=element(doc,'thead'),hr=element(doc,'tr');
      for(const value of block.header) {const th=element(doc,'th');th.setAttribute('scope','col');appendInline(doc,th,value);hr.append(th);}head.append(hr);table.append(head);
      const body=element(doc,'tbody');
      for(const row of block.rows) {const tr=element(doc,'tr');row.forEach((value,i)=>{const cell=element(doc,i===0?'th':'td');if(i===0)cell.setAttribute('scope','row');appendInline(doc,cell,value);tr.append(cell);});body.append(tr);}table.append(body);node.append(table);
    }
    if(node) {node.dataset.sourceLines=`${block.startLine}-${block.endLine}`;parent.append(node);}
  }
  return fragment;
}
