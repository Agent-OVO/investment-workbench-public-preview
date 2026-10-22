import { renderC01 } from './c01-content.js';
import { deriveC02Visuals } from '/investment-workbench-public-preview/workbench-review/continuity/c02-research-visuals.js';

// Reuse exact V4 evidence/data derivation, not its three projective carriers.
// No complete paper is copied into this summary; the independent reader remains.
export function renderHybridBody({ report, loaded }, doc = document) {
  const visuals = report.slug === 'sinoseal' ? deriveC02Visuals(loaded.raw) : null;
  const template = doc.createElement('template');
  template.innerHTML = renderC01({ report, raw: loaded.raw, visuals });
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
