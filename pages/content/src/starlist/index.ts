import {
  findCardFromStarForm,
  findStarButtonContainer,
  findStarForms,
  getRepoInfoFromCard,
  getRepoInfoFromStarForm,
  isStarsPageUrl,
} from './dom-utils';
import { fetchRepoListStatus } from './list-fetcher';
import { clearBadge, setLabels, setLoading } from './ui';
import type { RepoListResult } from './list-fetcher';

const processedCards = new WeakSet<Element>();
const repoStatusCache = new Map<string, RepoListResult>();
const inFlight = new Map<string, Promise<RepoListResult>>();

const applyResult = (form: HTMLFormElement, result: RepoListResult) => {
  const container = findStarButtonContainer(form);
  if (!container) return;

  if (result.status === 'loading') {
    setLoading(container);
    return;
  }

  if (result.status === 'error') {
    clearBadge(container);
    return;
  }

  setLabels(container, result.labels);
};

const fetchStatusWithCache = (fullName: string, owner: string, repo: string) => {
  const cached = repoStatusCache.get(fullName);
  if (cached) return Promise.resolve(cached);

  const existing = inFlight.get(fullName);
  if (existing) return existing;

  const promise = fetchRepoListStatus({ fullName, owner, repo }).then(result => {
    repoStatusCache.set(fullName, result);
    inFlight.delete(fullName);
    return result;
  });

  inFlight.set(fullName, promise);
  return promise;
};

const handleStarForm = (form: HTMLFormElement) => {
  const card = findCardFromStarForm(form);
  if (!card) return;
  if (processedCards.has(card)) return;
  processedCards.add(card);

  const repoInfo = getRepoInfoFromStarForm(form) || getRepoInfoFromCard(card);
  if (!repoInfo) return;

  applyResult(form, { status: 'loading', labels: [] });

  void fetchStatusWithCache(repoInfo.fullName, repoInfo.owner, repoInfo.repo).then(result => {
    applyResult(form, result);
  });
};

export const initStarListBadges = () => {
  if (!isStarsPageUrl(window.location.href)) return;

  const scan = (root: ParentNode) => {
    const forms = findStarForms(root);
    forms.forEach(handleStarForm);
  };

  scan(document);

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node instanceof Element) scan(node);
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
};
