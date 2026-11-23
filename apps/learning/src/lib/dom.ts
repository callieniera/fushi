export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: {
    className?: string;
    text?: string;
    id?: string;
    attributes?: Record<string, string>;
  } = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.id) node.id = options.id;
  for (const [name, value] of Object.entries(options.attributes ?? {})) node.setAttribute(name, value);
  return node;
}

export function button(text: string, onClick?: () => void): HTMLButtonElement {
  const node = element('button', { text, attributes: { type: 'button' } });
  if (onClick) node.addEventListener('click', onClick);
  return node;
}

export function replaceChildren(parent: HTMLElement, ...children: (Node | string)[]): void {
  parent.replaceChildren(...children);
}

export function downloadLabel(url: string): string {
  return new URL(url, document.baseURI).href;
}
