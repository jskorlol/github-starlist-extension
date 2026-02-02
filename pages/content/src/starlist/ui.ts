const BADGE_CLASS = 'gh-starlist-badge';
const BADGE_LOADING_CLASS = 'gh-starlist-badge--loading';
const BADGE_LABEL_CLASS = 'gh-starlist-badge--label';

const ensureContainer = (container: Element) => {
  let badgeWrap = container.querySelector(`.${BADGE_CLASS}`) as HTMLSpanElement | null;
  if (!badgeWrap) {
    badgeWrap = document.createElement('span');
    badgeWrap.className = BADGE_CLASS;
    container.insertBefore(badgeWrap, container.firstChild);
  }
  return badgeWrap;
};

const clearBadges = (badgeWrap: Element) => {
  badgeWrap.textContent = '';
};

export const setLoading = (container: Element) => {
  const badgeWrap = ensureContainer(container);
  badgeWrap.classList.add(BADGE_LOADING_CLASS);
  clearBadges(badgeWrap);
};

export const setLabels = (container: Element, labels: string[]) => {
  const badgeWrap = ensureContainer(container);
  badgeWrap.classList.remove(BADGE_LOADING_CLASS);
  clearBadges(badgeWrap);

  if (labels.length === 0) {
    badgeWrap.remove();
    return;
  }

  labels.forEach(label => {
    const badge = document.createElement('span');
    badge.className = BADGE_LABEL_CLASS;
    badge.textContent = label;
    badgeWrap.appendChild(badge);
  });
};

export const clearBadge = (container: Element) => {
  const badgeWrap = container.querySelector(`.${BADGE_CLASS}`);
  if (badgeWrap) badgeWrap.remove();
};
