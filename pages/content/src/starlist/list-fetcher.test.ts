import { fetchRepoListStatus } from './list-fetcher';
import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
import test from 'node:test';

const ORIGINAL_FETCH = globalThis.fetch;

const readHeader = (headers: HeadersInit | undefined, name: string) => {
  if (!headers) return '';
  const lowerName = name.toLowerCase();

  if (headers instanceof Headers) {
    return headers.get(name) ?? '';
  }

  if (Array.isArray(headers)) {
    const found = headers.find(([key]) => key.toLowerCase() === lowerName);
    return found?.[1] ?? '';
  }

  const asRecord = headers as Record<string, string>;
  const hit = Object.entries(asRecord).find(([key]) => key.toLowerCase() === lowerName);
  return hit?.[1] ?? '';
};

test.beforeEach(() => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  globalThis.DOMParser = dom.window.DOMParser as unknown as typeof DOMParser;
});

test.after(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

test('신규 GitHub lists 마크업(button aria-checked)을 파싱하고 experimental 경로를 호출한다', async () => {
  let requestedUrl = '';
  let acceptHeader = '';

  const html = `
    <div class="js-user-list-menu-content-root">
      <action-list>
        <ul>
          <li>
            <button data-target="user-list-menu.listItems" aria-checked="true" type="button">
              <span class="ActionListItem-label">🤖 ai</span>
            </button>
          </li>
          <li>
            <button data-target="user-list-menu.listItems" aria-checked="false" type="button">
              <span class="ActionListItem-label">⚛️ react.native</span>
            </button>
          </li>
        </ul>
      </action-list>
    </div>
  `;

  globalThis.fetch = (async (input, init) => {
    requestedUrl = String(input);
    acceptHeader = readHeader(init?.headers, 'accept');
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
  }) as typeof fetch;

  const result = await fetchRepoListStatus({
    fullName: 'am-will/codex-skills',
    owner: 'am-will',
    repo: 'codex-skills',
  });

  assert.equal(requestedUrl, 'https://github.com/am-will/codex-skills/lists?experimental=1&q=');
  assert.match(acceptHeader, /text\/fragment\+html/i);
  assert.deepEqual(result, { status: 'ok', labels: ['🤖 ai'] });
});

test('신규 마크업에서 체크된 버튼이 없으면 빈 라벨 목록을 반환한다', async () => {
  const html = `
    <div>
      <button data-target="user-list-menu.listItems" aria-checked="false" type="button">
        <span class="ActionListItem-label">🐘 php.laravel</span>
      </button>
    </div>
  `;

  globalThis.fetch = (async () => new Response(html, { status: 200 })) as typeof fetch;

  const result = await fetchRepoListStatus({
    fullName: 'owner/repo',
    owner: 'owner',
    repo: 'repo',
  });

  assert.deepEqual(result, { status: 'ok', labels: [] });
});

test('data-target 없이 role=option + aria-checked 구조도 파싱한다', async () => {
  const html = `
    <ul>
      <li>
        <div role="option" aria-checked="true" class="ActionListContent">
          <span class="ActionListItem-label">🔺 node.nextjs</span>
        </div>
      </li>
      <li>
        <div role="option" aria-checked="false" class="ActionListContent">
          <span class="ActionListItem-label">🎨 design</span>
        </div>
      </li>
    </ul>
  `;

  globalThis.fetch = (async () => new Response(html, { status: 200 })) as typeof fetch;

  const result = await fetchRepoListStatus({
    fullName: 'owner/repo',
    owner: 'owner',
    repo: 'repo',
  });

  assert.deepEqual(result, { status: 'ok', labels: ['🔺 node.nextjs'] });
});

test('신규 GitHub 응답의 aria-selected=true 구조도 파싱한다', async () => {
  const html = `
    <div class="js-user-list-menu-content-root">
      <action-list>
        <ul>
          <li>
            <button data-target="user-list-menu.listItems" aria-selected="true" type="button" class="ActionListContent">
              <span class="ActionListItem-label">⚙️ framework</span>
            </button>
          </li>
          <li>
            <button data-target="user-list-menu.listItems" aria-selected="true" type="button" class="ActionListContent">
              <span class="ActionListItem-label">🐘 php.laravel</span>
            </button>
          </li>
          <li>
            <button data-target="user-list-menu.listItems" aria-selected="false" type="button" class="ActionListContent">
              <span class="ActionListItem-label">🤖 ai</span>
            </button>
          </li>
        </ul>
      </action-list>
    </div>
  `;

  globalThis.fetch = (async () => new Response(html, { status: 200 })) as typeof fetch;

  const result = await fetchRepoListStatus({
    fullName: 'php/pie',
    owner: 'php',
    repo: 'pie',
  });

  assert.deepEqual(result, { status: 'ok', labels: ['⚙️ framework', '🐘 php.laravel'] });
});

test('레거시 input checked 마크업도 계속 파싱한다', async () => {
  const html = `
    <div>
      <label>
        <input class="js-user-list-menu-item" name="list_ids[]" checked />
        <span class="Truncate-text">🏰 devops</span>
      </label>
      <label>
        <input class="js-user-list-menu-item" name="list_ids[]" />
        <span class="Truncate-text">⚙️ framework</span>
      </label>
    </div>
  `;

  globalThis.fetch = (async () => new Response(html, { status: 200 })) as typeof fetch;

  const result = await fetchRepoListStatus({
    fullName: 'owner/repo',
    owner: 'owner',
    repo: 'repo',
  });

  assert.deepEqual(result, { status: 'ok', labels: ['🏰 devops'] });
});

test('experimental 응답이 인식 불가면 /lists 경로로 재시도한다', async () => {
  const urls: string[] = [];

  globalThis.fetch = (async input => {
    const requested = String(input);
    urls.push(requested);

    if (requested.endsWith('/lists?experimental=1&q=')) {
      return new Response('<div>unexpected</div>', { status: 200 });
    }

    return new Response(
      `
      <label>
        <input class="js-user-list-menu-item" name="list_ids[]" type="checkbox" checked />
        <span class="Truncate-text">🐶 etc</span>
      </label>
      `,
      { status: 200 },
    );
  }) as typeof fetch;

  const result = await fetchRepoListStatus({
    fullName: 'owner/repo',
    owner: 'owner',
    repo: 'repo',
  });

  assert.deepEqual(urls, [
    'https://github.com/owner/repo/lists?experimental=1&q=',
    'https://github.com/owner/repo/lists',
  ]);
  assert.deepEqual(result, { status: 'ok', labels: ['🐶 etc'] });
});

test('fetch 응답이 실패이면 error를 반환한다', async () => {
  globalThis.fetch = (async () => new Response('nope', { status: 500 })) as typeof fetch;

  const result = await fetchRepoListStatus({
    fullName: 'owner/repo',
    owner: 'owner',
    repo: 'repo',
  });

  assert.deepEqual(result, { status: 'error', labels: [] });
});

test('첫 요청이 네트워크 예외여도 다음 경로로 재시도한다', async () => {
  let calls = 0;

  globalThis.fetch = (async input => {
    calls += 1;
    if (String(input).endsWith('/lists?experimental=1&q=')) {
      throw new Error('network');
    }

    return new Response(
      `
      <button data-target="user-list-menu.listItems" aria-checked="true" type="button">
        <span class="ActionListItem-label">🤖 ai</span>
      </button>
      `,
      { status: 200 },
    );
  }) as typeof fetch;

  const result = await fetchRepoListStatus({
    fullName: 'owner/repo',
    owner: 'owner',
    repo: 'repo',
  });

  assert.equal(calls, 2);
  assert.deepEqual(result, { status: 'ok', labels: ['🤖 ai'] });
});

test('인식 가능한 마크업이 없으면 error를 반환한다', async () => {
  globalThis.fetch = (async () => new Response('<div>unexpected</div>', { status: 200 })) as typeof fetch;

  const result = await fetchRepoListStatus({
    fullName: 'owner/repo',
    owner: 'owner',
    repo: 'repo',
  });

  assert.deepEqual(result, { status: 'error', labels: [] });
});
