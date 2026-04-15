import { findStarButtonContainer, findStarForms, getRepoInfoFromStarForm, isStarsPageUrl } from './dom-utils';
import { fetchRepoListStatus } from './list-fetcher';
import { clearBadge, setLabels, setLoading } from './ui';
import type { RepoListResult } from './list-fetcher';

const BADGE_REAPPLY_DELAY_MS = 2000;
const BADGE_RECOVERY_LOADING_MS = 250;
const BADGE_LABEL_CLASS = 'gh-starlist-badge--label';
const BADGE_LOADING_CLASS = 'gh-starlist-badge--loading';

const processedForms = new WeakSet<HTMLFormElement>();
const repoStatusCache = new Map<string, RepoListResult>();
const inFlight = new Map<string, Promise<RepoListResult>>();
const scheduledReapplies = new Map<string, ReturnType<typeof setTimeout>>();
const scheduledRecoveryCompletes = new Map<string, ReturnType<typeof setTimeout>>();

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

const getRepoInfoForForm = (form: HTMLFormElement) => getRepoInfoFromStarForm(form);

const getFormsForRepo = (fullName: string) =>
  findStarForms(document).filter(form => getRepoInfoForForm(form)?.fullName === fullName);

const hasVisibleBadgeState = (form: HTMLFormElement) => {
  const container = findStarButtonContainer(form);
  if (!container) return false;

  return Boolean(container.querySelector(`.${BADGE_LABEL_CLASS}, .${BADGE_LOADING_CLASS}`));
};

const reapplyCachedResult = (fullName: string) => {
  const cached = repoStatusCache.get(fullName);
  if (!cached || cached.status !== 'ok' || cached.labels.length === 0) return;

  const forms = getFormsForRepo(fullName);
  forms.forEach(form => applyResult(form, cached));
};

const scheduleCachedResultReapply = (fullName: string, result: RepoListResult) => {
  if (result.status !== 'ok' || result.labels.length === 0) return;

  const existing = scheduledReapplies.get(fullName);
  if (existing) clearTimeout(existing);
  const existingRecoveryComplete = scheduledRecoveryCompletes.get(fullName);
  if (existingRecoveryComplete) clearTimeout(existingRecoveryComplete);

  const timeoutId = setTimeout(() => {
    scheduledReapplies.delete(fullName);
    const formsNeedingRecovery = getFormsForRepo(fullName).filter(form => !hasVisibleBadgeState(form));
    if (formsNeedingRecovery.length === 0) return;

    formsNeedingRecovery.forEach(form => applyResult(form, { status: 'loading', labels: [] }));

    const recoveryCompleteId = setTimeout(() => {
      scheduledRecoveryCompletes.delete(fullName);
      reapplyCachedResult(fullName);
    }, BADGE_RECOVERY_LOADING_MS);

    scheduledRecoveryCompletes.set(fullName, recoveryCompleteId);
  }, BADGE_REAPPLY_DELAY_MS);

  scheduledReapplies.set(fullName, timeoutId);
};

const handleStarForm = (form: HTMLFormElement) => {
  if (processedForms.has(form)) return;
  processedForms.add(form);

  const repoInfo = getRepoInfoForForm(form);
  if (!repoInfo) return;

  const cached = repoStatusCache.get(repoInfo.fullName);
  if (cached) {
    applyResult(form, cached);
    scheduleCachedResultReapply(repoInfo.fullName, cached);
    return;
  }

  applyResult(form, { status: 'loading', labels: [] });

  void fetchStatusWithCache(repoInfo.fullName, repoInfo.owner, repoInfo.repo)
    .then(result => {
      applyResult(form, result);
      scheduleCachedResultReapply(repoInfo.fullName, result);
    })
    .catch(() => {
      applyResult(form, { status: 'error', labels: [] });
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
