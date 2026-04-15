import type { RepoInfo } from './dom-utils';

const extractLegacyLabelText = (input: HTMLInputElement) => {
  const label = input.closest('label');
  if (!label) return null;
  const textEl = label.querySelector<HTMLElement>('.Truncate-text') || label;
  const text = (textEl.textContent || '').trim();
  return text.length > 0 ? text : null;
};

const extractOptionLabelText = (option: Element) => {
  const textEl =
    option.querySelector<HTMLElement>('.ActionListItem-label') || option.querySelector<HTMLElement>('.Truncate-text');
  const source = textEl || option;
  const text = (source.textContent || '').trim();
  return text.length > 0 ? text : null;
};

const LIST_SELECTION_ATTRIBUTES = ['aria-checked', 'aria-selected'] as const;

const hasListSelectionAttribute = (element: Element) =>
  LIST_SELECTION_ATTRIBUTES.some(attribute => element.hasAttribute(attribute));

const isSelectedListOption = (element: Element) =>
  LIST_SELECTION_ATTRIBUTES.some(attribute => element.getAttribute(attribute) === 'true');

const isListOptionElement = (element: Element) => {
  if (!hasListSelectionAttribute(element)) return false;
  if (element.tagName === 'BUTTON') return true;
  if (element.getAttribute('role') === 'option') return true;
  return element.classList.contains('ActionListContent');
};

const extractCheckedOptionLabels = (doc: Document): string[] | null => {
  const options = Array.from(doc.querySelectorAll<HTMLElement>('[aria-checked], [aria-selected]')).filter(
    isListOptionElement,
  );
  if (options.length === 0) return null;

  const checked = options.filter(isSelectedListOption);
  return checked.map(extractOptionLabelText).filter((label): label is string => Boolean(label));
};

const extractCheckedLegacyInputLabels = (doc: Document): string[] | null => {
  const inputs = Array.from(
    doc.querySelectorAll<HTMLInputElement>('input.js-user-list-menu-item, input[name="list_ids[]"][type="checkbox"]'),
  );
  if (inputs.length === 0) return null;

  const checked = inputs.filter(input => input.hasAttribute('checked'));
  return checked.map(extractLegacyLabelText).filter((label): label is string => Boolean(label));
};

type RepoListResult =
  | { status: 'loading'; labels: [] }
  | { status: 'error'; labels: [] }
  | { status: 'ok'; labels: string[] };

const parseCheckedListLabels = (doc: Document): string[] | null => {
  const optionLabels = extractCheckedOptionLabels(doc);
  if (optionLabels) return optionLabels;

  return extractCheckedLegacyInputLabels(doc);
};

const LIST_ENDPOINTS = ['lists?experimental=1&q=', 'lists'] as const;

const fetchListPage = async (url: string) =>
  fetch(url, {
    headers: {
      accept: 'text/fragment+html, text/html;q=0.9',
    },
    credentials: 'include',
  });

const fetchRepoListStatus = async (repo: RepoInfo): Promise<RepoListResult> => {
  const parser = new DOMParser();

  for (const endpoint of LIST_ENDPOINTS) {
    const url = `https://github.com/${repo.fullName}/${endpoint}`;

    let response: Response;
    try {
      response = await fetchListPage(url);
    } catch {
      continue;
    }

    if (!response.ok) continue;

    const html = await response.text();
    const doc = parser.parseFromString(html, 'text/html');
    const labels = parseCheckedListLabels(doc);
    if (labels) {
      return { status: 'ok', labels };
    }
  }

  return { status: 'error', labels: [] };
};

export type { RepoListResult };
export { parseCheckedListLabels, fetchRepoListStatus };
