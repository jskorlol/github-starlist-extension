import type { RepoInfo } from './dom-utils';

const extractLabelText = (input: HTMLInputElement) => {
  const label = input.closest('label');
  if (!label) return null;
  const textEl = label.querySelector<HTMLElement>('.Truncate-text') || label;
  const text = (textEl.textContent || '').trim();
  return text.length > 0 ? text : null;
};

export type RepoListResult =
  | { status: 'loading'; labels: [] }
  | { status: 'error'; labels: [] }
  | { status: 'ok'; labels: string[] };

export const fetchRepoListStatus = async (repo: RepoInfo): Promise<RepoListResult> => {
  const response = await fetch(`https://github.com/${repo.fullName}/lists`, {
    headers: {
      accept: 'text/html',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    return { status: 'error', labels: [] };
  }

  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const inputs = Array.from(
    doc.querySelectorAll<HTMLInputElement>('input.js-user-list-menu-item, input[name="list_ids[]"]'),
  );
  if (inputs.length === 0) {
    return { status: 'error', labels: [] };
  }

  const checked = inputs.filter(input => input.hasAttribute('checked'));
  const labels = checked.map(extractLabelText).filter((label): label is string => Boolean(label));

  return { status: 'ok', labels };
};
