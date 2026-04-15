const parseRepoFromAction = (action: string | null) => {
  if (!action) return null;
  const match = action.match(/^\/(.+?)\/(.+?)\/(unstar|star)$/);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2];
  return { fullName: `${owner}/${repo}`, owner, repo };
};

export type RepoInfo = {
  fullName: string;
  owner: string;
  repo: string;
};

export const isStarsPageUrl = (url: string) => url.includes('github.com/') && url.includes('tab=stars');

export const getRepoInfoFromStarForm = (form: HTMLFormElement): RepoInfo | null =>
  parseRepoFromAction(form.getAttribute('action'));

export const findStarForms = (root: ParentNode): HTMLFormElement[] =>
  Array.from(root.querySelectorAll<HTMLFormElement>('form[action]')).filter(form => {
    const action = form.getAttribute('action');
    return Boolean(parseRepoFromAction(action));
  });

export const findStarButtonContainer = (form: HTMLFormElement): Element | null =>
  form.closest('.BtnGroup') || form.parentElement || form.closest('[data-view-component]') || form;
