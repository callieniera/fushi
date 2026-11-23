import { appView } from './app.js';
import { curriculum } from './content/index.js';
import { browserProgress } from './storage.js';
import './styles.css';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Learning app root is missing.');
root.replaceChildren(appView(curriculum(), browserProgress()));
