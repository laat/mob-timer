// https://developers.google.com/web/fundamentals/web-components/best-practices#lazy-properties
export function upgradeProperty(el: HTMLElement, prop: string): void {
  if (el.hasOwnProperty(prop)) {
    // @ts-ignore
    let value = el[prop];
    // @ts-ignore
    delete el[prop];
    // @ts-ignore
    el[prop] = value;
  }
}
