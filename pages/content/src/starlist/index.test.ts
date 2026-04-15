import { initStarListBadges } from './index';
import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate as waitForImmediate } from 'node:timers/promises';

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_WINDOW = globalThis.window;
const ORIGINAL_DOCUMENT = globalThis.document;
const ORIGINAL_MUTATION_OBSERVER = globalThis.MutationObserver;
const ORIGINAL_DOM_PARSER = globalThis.DOMParser;
const ORIGINAL_ELEMENT = globalThis.Element;
const ORIGINAL_HTML_ELEMENT = globalThis.HTMLElement;
const ORIGINAL_NODE = globalThis.Node;
const ORIGINAL_SET_TIMEOUT = globalThis.setTimeout;
const ORIGINAL_CLEAR_TIMEOUT = globalThis.clearTimeout;

let scheduledTimeouts: Array<() => void> = [];

const createCardMarkup = (fullName = 'php/pie', action = `/${fullName}/unstar`) => `
  <li>
    <a href="/${fullName}" data-repository-hovercard>${fullName}</a>
    <div class="BtnGroup">
      <form action="${action}" method="post">
        <button type="submit">Starred</button>
      </form>
    </div>
  </li>
`;

const flushDomWork = async () => {
  await waitForImmediate();
  await waitForImmediate();
};

const runNextScheduledTimeout = async () => {
  const next = scheduledTimeouts.shift();
  if (!next) return;
  next();
  await flushDomWork();
};

test.beforeEach(() => {
  const dom = new JSDOM(`<!doctype html><html><body><ul>${createCardMarkup()}</ul></body></html>`, {
    url: 'https://github.com/jskorlol?tab=stars',
  });

  scheduledTimeouts = [];
  globalThis.window = dom.window as unknown as typeof window;
  globalThis.document = dom.window.document;
  globalThis.MutationObserver = dom.window.MutationObserver as unknown as typeof MutationObserver;
  globalThis.DOMParser = dom.window.DOMParser as unknown as typeof DOMParser;
  globalThis.Element = dom.window.Element as unknown as typeof Element;
  globalThis.HTMLElement = dom.window.HTMLElement as unknown as typeof HTMLElement;
  globalThis.Node = dom.window.Node as unknown as typeof Node;
  globalThis.setTimeout = ((handler: TimerHandler) => {
    const callback =
      typeof handler === 'function'
        ? () => {
            handler();
          }
        : () => {};

    scheduledTimeouts.push(callback);
    return (scheduledTimeouts.length - 1) as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
  globalThis.clearTimeout = ((id: ReturnType<typeof setTimeout>) => {
    const index = Number(id);
    if (Number.isInteger(index) && scheduledTimeouts[index]) {
      scheduledTimeouts[index] = () => {};
    }
  }) as typeof clearTimeout;
});

test.afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  globalThis.window = ORIGINAL_WINDOW;
  globalThis.document = ORIGINAL_DOCUMENT;
  globalThis.MutationObserver = ORIGINAL_MUTATION_OBSERVER;
  globalThis.DOMParser = ORIGINAL_DOM_PARSER;
  globalThis.Element = ORIGINAL_ELEMENT;
  globalThis.HTMLElement = ORIGINAL_HTML_ELEMENT;
  globalThis.Node = ORIGINAL_NODE;
  globalThis.setTimeout = ORIGINAL_SET_TIMEOUT;
  globalThis.clearTimeout = ORIGINAL_CLEAR_TIMEOUT;
});

test('같은 카드에서 star 버튼 영역이 다시 그려져도 배지를 다시 붙인다', async () => {
  globalThis.fetch = (async () =>
    new Response(
      `
      <div class="js-user-list-menu-content-root">
        <action-list>
          <ul>
            <li>
              <button data-target="user-list-menu.listItems" aria-selected="true" type="button" class="ActionListContent">
                <span class="ActionListItem-label">⚙️ framework</span>
              </button>
            </li>
          </ul>
        </action-list>
      </div>
      `,
      { status: 200, headers: { 'content-type': 'text/html' } },
    )) as typeof fetch;

  initStarListBadges();
  await flushDomWork();

  const card = document.querySelector('li');
  assert.ok(card);
  assert.match(card.textContent || '', /⚙️ framework/);

  const oldButtonGroup = card.querySelector('.BtnGroup');
  assert.ok(oldButtonGroup);
  oldButtonGroup.remove();

  const nextButtonGroup = document.createElement('div');
  nextButtonGroup.className = 'BtnGroup';
  nextButtonGroup.innerHTML = createCardMarkup('php/pie', '/php/pie/unstar');
  const replacementForm = nextButtonGroup.querySelector('.BtnGroup');
  assert.ok(replacementForm);
  card.appendChild(replacementForm);

  await flushDomWork();

  const replacementButtonGroup = card.querySelector('.BtnGroup');
  assert.ok(replacementButtonGroup);
  assert.match(replacementButtonGroup.textContent || '', /⚙️ framework/);
});

test('badge가 뒤늦게 지워져도 지연 재렌더가 다시 붙인다', async () => {
  document.body.innerHTML = `<ul>${createCardMarkup('php/delayed-badge')}</ul>`;

  globalThis.fetch = (async () =>
    new Response(
      `
      <div class="js-user-list-menu-content-root">
        <action-list>
          <ul>
            <li>
              <button data-target="user-list-menu.listItems" aria-selected="true" type="button" class="ActionListContent">
                <span class="ActionListItem-label">🐘 php.laravel</span>
              </button>
            </li>
          </ul>
        </action-list>
      </div>
      `,
      { status: 200, headers: { 'content-type': 'text/html' } },
    )) as typeof fetch;

  initStarListBadges();
  await flushDomWork();

  const buttonGroup = document.querySelector('.BtnGroup');
  assert.ok(buttonGroup);
  assert.match(buttonGroup.textContent || '', /🐘 php\.laravel/);

  const badge = buttonGroup.querySelector('.gh-starlist-badge');
  assert.ok(badge);
  badge.remove();
  assert.doesNotMatch(buttonGroup.textContent || '', /🐘 php\.laravel/);

  await runNextScheduledTimeout();

  assert.ok(buttonGroup.querySelector('.gh-starlist-badge--loading'));
  assert.doesNotMatch(buttonGroup.textContent || '', /🐘 php\.laravel/);

  await runNextScheduledTimeout();

  assert.match(buttonGroup.textContent || '', /🐘 php\.laravel/);
  assert.equal(buttonGroup.querySelector('.gh-starlist-badge--loading'), null);
});

test('공유된 data-view-component 아래 여러 카드가 있어도 각 카드에 개별 badge를 붙인다', async () => {
  document.body.innerHTML = `
    <div data-view-component class="shared-root">
      <ul>
        <li>
          <a href="/owner/first" data-repository-hovercard>owner/first</a>
          <div class="actions">
            <form action="/owner/first/unstar" method="post">
              <button type="submit">Starred</button>
            </form>
          </div>
        </li>
        <li>
          <a href="/owner/second" data-repository-hovercard>owner/second</a>
          <div class="actions">
            <form action="/owner/second/unstar" method="post">
              <button type="submit">Starred</button>
            </form>
          </div>
        </li>
      </ul>
    </div>
  `;

  globalThis.fetch = (async input => {
    const url = String(input);
    const label = url.includes('/owner/first/') ? '🏰 devops' : '🤖 ai';

    return new Response(
      `
      <div class="js-user-list-menu-content-root">
        <action-list>
          <ul>
            <li>
              <button data-target="user-list-menu.listItems" aria-selected="true" type="button" class="ActionListContent">
                <span class="ActionListItem-label">${label}</span>
              </button>
            </li>
          </ul>
        </action-list>
      </div>
      `,
      { status: 200, headers: { 'content-type': 'text/html' } },
    );
  }) as typeof fetch;

  initStarListBadges();
  await flushDomWork();

  const cards = Array.from(document.querySelectorAll('li'));
  assert.equal(cards.length, 2);
  assert.match(cards[0].textContent || '', /🏰 devops/);
  assert.match(cards[1].textContent || '', /🤖 ai/);
});
