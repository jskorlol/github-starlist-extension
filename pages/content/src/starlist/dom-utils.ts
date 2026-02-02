const parseRepoFullNameFromHref = (href: string) => {
  if (!href.startsWith('/')) return null;
  const parts = href.split('?')[0].split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const [owner, repo] = parts;
  if (!owner || !repo) return null;
  if (repo === 'topics' || repo === 'issues' || repo === 'pulls') return null;
  return { fullName: `${owner}/${repo}`, owner, repo };
};

const parseRepoFromAction = (action: string | null) => {
  if (!action) return null;
  const match = action.match(/^\/(.+?)\/(.+?)\/(unstar|star)$/);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2];
  return { fullName: `${owner}/${repo}`, owner, repo };
};

const findRepoLinkInCard = (card: Element): HTMLAnchorElement | null => {
  const hoverLink = card.querySelector<HTMLAnchorElement>('a[data-repository-hovercard]');
  if (hoverLink) return hoverLink;

  const candidates = card.querySelectorAll<HTMLAnchorElement>('a[href^="/"]');
  for (const link of candidates) {
    const href = link.getAttribute('href') || '';
    const info = parseRepoFullNameFromHref(href);
    if (info) return link;
  }

  return null;
};

export type RepoInfo = {
  fullName: string;
  owner: string;
  repo: string;
};

export const isStarsPageUrl = (url: string) => url.includes('github.com/') && url.includes('tab=stars');

export const getRepoInfoFromCard = (card: Element): RepoInfo | null => {
  const link = findRepoLinkInCard(card);
  if (!link) return null;
  const href = link.getAttribute('href') || '';
  return parseRepoFullNameFromHref(href);
};

export const getRepoInfoFromStarForm = (form: HTMLFormElement): RepoInfo | null =>
  parseRepoFromAction(form.getAttribute('action'));

export const findStarForms = (root: ParentNode): HTMLFormElement[] =>
  Array.from(root.querySelectorAll<HTMLFormElement>('form[action]')).filter(form => {
    const action = form.getAttribute('action');
    return Boolean(parseRepoFromAction(action));
  });

export const findCardFromStarForm = (form: HTMLFormElement): Element | null =>
  form.closest('div.col-12.d-block.width-full.py-4.border-bottom') ||
  form.closest('li') ||
  form.closest('article') ||
  form.closest('div[data-hydro-click]') ||
  form.closest('div[data-view-component]') ||
  form.parentElement;

export const findStarButtonContainer = (form: HTMLFormElement): Element | null =>
  form.closest('.BtnGroup') || form.closest('[data-view-component]') || form.parentElement;
