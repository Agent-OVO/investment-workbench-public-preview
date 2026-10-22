import { renderC01 } from './c01-content.js';
import { conclusionExcerpt } from './conclusion-excerpts.js';
import { deriveC02Visuals } from '/investment-workbench-public-preview/workbench-review/continuity/c02-research-visuals.js';

// Reuse exact V4 evidence/data derivation, not its three projective carriers.
// No complete paper is copied into this summary; the independent reader remains.
export function renderHybridBody({ report, loaded }, doc = document) {
  const visuals = report.slug === 'sinoseal' ? deriveC02Visuals(loaded.raw) : null;
  const template = doc.createElement('template');
  template.innerHTML = renderC01({ report, raw: loaded.raw, visuals });
  // Replace the inherited metadata preview before insertion, not after a flash
  // of misleading text. Keep Sinoseal's previously checked summary unchanged.
  if (report.slug !== 'sinoseal') {
    const excerpt = conclusionExcerpt({ report, loaded });
    const judgment = template.content.querySelector('.c01-focus .c01-judgment');
    if (!judgment) throw new Error('MISSING_CONCLUSION_HOST');
    const label = doc.createElement('span'); label.textContent = excerpt.label;
    const quote = doc.createElement('p'); quote.textContent = excerpt.text;
    const source = doc.createElement('a'); source.className = 'c01-text-link';
    source.href = excerpt.href; source.textContent = excerpt.sourceLabel;
    judgment.replaceChildren(label, quote, source);
    if (excerpt.verified) {
      judgment.dataset.conclusionSha256 = excerpt.sha256;
      const boundary = doc.createElement('p'); boundary.className = 'c01-caption';
      boundary.textContent = '固定研究截点的原文节选，不是完整结论或当前建议。';
      judgment.append(boundary);
    }
  }
  const fragment = doc.createDocumentFragment();
  for (const key of ['focus', 'evidence', 'records']) {
    const section = template.content.querySelector(`[data-plane="${key}"]`);
    if (!section) throw new Error('INCOMPLETE_RESEARCH_SUMMARY');
    section.removeAttribute('data-plane');
    section.classList.remove('c01-plane');
    // Unique native IDs, no hidden duplicate measured copy and no matrix3d.
    for (const node of section.querySelectorAll('[id]')) {
      const oldId = node.id;
      node.id = 'native-' + oldId;
      if (section.getAttribute('aria-labelledby') === oldId) {
        section.setAttribute('aria-labelledby', node.id);
      }
    }
    fragment.append(section);
  }
  return fragment;
}
