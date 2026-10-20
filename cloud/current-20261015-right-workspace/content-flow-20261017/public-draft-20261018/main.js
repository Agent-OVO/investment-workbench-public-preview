import {createDocumentReader} from './document-reader.js';
const documents=createDocumentReader({root:document.querySelector('[data-local-draft]'),baseURL:import.meta.url});
await documents.start();
