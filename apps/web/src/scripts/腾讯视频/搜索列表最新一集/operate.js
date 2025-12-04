(() => {
  const waitFor = (fn, timeout, interval) =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      const loop = () => {
        try {
          console.log('waitFor: tick');
          const result = fn();
          if (result) {
            console.log('waitFor: condition satisfied');
            resolve(result);
            return;
          }
          if (Date.now() - start >= timeout) {
            console.log('waitFor: timeout');
            reject(new Error('waitFor timeout'));
            return;
          }
          setTimeout(loop, interval);
        } catch {
          console.log('waitFor: error in condition function');
          reject(new Error('waitFor error'));
        }
      };
      loop();
    });

  const toNumberString = (value) => {
    if (!value) return '';
    return String(value).trim();
  };

  const findEpisodeInContainer = (container, episodeNumber) => {
    if (!container) return null;
    const target = String(episodeNumber);
    console.log('findEpisodeInContainer: target', target, container);
    const items = container.querySelectorAll(
      '.episodepc[title], .episodepc .episode__title',
    );
    const list = [];
    items.forEach((node) => {
      const element = node.classList.contains('episodepc')
        ? node
        : node.closest('.episodepc');
      if (!element || list.includes(element)) return;
      list.push(element);
    });
    for (const element of list) {
      const title = toNumberString(element.getAttribute('title'));
      const textNode = element.querySelector('.episode__title');
      const text = toNumberString(textNode && textNode.textContent);
      if (title === target || text === target) {
        console.log('findEpisodeInContainer: matched element', {
          title,
          text,
        });
        return element;
      }
    }
    return null;
  };

  const findMainEpisodesContainer = () => {
    const container = document.querySelector(
      '.pc-summary__episodes .square-episodespc',
    );
    console.log('findMainEpisodesContainer: primary', !!container);
    if (container) return container;
    const candidates = Array.from(
      document.querySelectorAll("div[dt-eid='poster']"),
    );
    for (const node of candidates) {
      if (node.classList.contains('pc-summary__episodes')) return node;
      const square = node.querySelector('.square-episodespc');
      if (square) return square;
    }
    console.log('findMainEpisodesContainer: not found');
    return null;
  };

  const clickEpisodeInMainList = (episodeNumber) => {
    const container = findMainEpisodesContainer();
    if (!container) return false;
    const target = findEpisodeInContainer(container, episodeNumber);
    if (!target) return false;
    const clickable = target.querySelector("[role='button']") || target;
    clickable.click();
    console.log('clickEpisodeInMainList: clicked', episodeNumber);
    return true;
  };

  const findEllipsisTrigger = () => {
    const container = findMainEpisodesContainer();
    if (!container) return null;
    const explicit = container.querySelector('.episodepc[title="..."]');
    if (explicit) return explicit;
    const items = container.querySelectorAll('.episodepc');
    for (const item of items) {
      const textNode = item.querySelector('.episode__title');
      if (toNumberString(textNode && textNode.textContent) === '...') {
        return item;
      }
    }
    console.log('findEllipsisTrigger: not found');
    return null;
  };

  const buildBlockLabel = (episodeNumber) => {
    const index = Math.floor((episodeNumber - 1) / 30);
    const start = index * 30 + 1;
    const end = start + 29;
    return `${start}-${end}`;
  };

  const findBlockTabsRoot = () => {
    const labels = ['1-30', '31-60', '61-90', '91-118'];
    const elements = Array.from(
      document.querySelectorAll('div, span, button, a'),
    );
    for (const element of elements) {
      const text = toNumberString(element.textContent);
      for (const label of labels) {
        if (text.includes(label)) {
          return element.parentElement || element;
        }
      }
    }
    console.log('findBlockTabsRoot: not found');
    return null;
  };

  const clickBlockTab = async (episodeNumber) => {
    const label = buildBlockLabel(episodeNumber);
    console.log('clickBlockTab: label', label);
    const root = await waitFor(findBlockTabsRoot, 5000, 100);
    const tabs = Array.from(root.querySelectorAll('div, span, button, a'));
    let target = null;
    for (const tab of tabs) {
      const text = toNumberString(tab.textContent);
      if (text === label || text.includes(label)) {
        target = tab;
        break;
      }
    }
    if (!target) throw new Error('block tab not found');
    const clickable = target.closest("[role='tab']") || target;
    clickable.click();
    console.log('clickBlockTab: clicked tab', label);
    return root;
  };

  const clickEpisodeInPopup = async (episodeNumber) => {
    console.log('clickEpisodeInPopup: start', episodeNumber);
    const root = await clickBlockTab(episodeNumber);
    const target = await waitFor(
      () => {
        const scoped =
          (root && root.closest('.pc-summary__episodes')) || document.body;
        return (
          findEpisodeInContainer(scoped, episodeNumber) ||
          findEpisodeInContainer(document.body, episodeNumber)
        );
      },
      5000,
      100,
    );
    const clickable = target.querySelector("[role='button']") || target;
    clickable.click();
    console.log('clickEpisodeInPopup: clicked', episodeNumber);
  };

  const ensureEllipsisPanel = async () => {
    console.log('ensureEllipsisPanel: start');
    const trigger = findEllipsisTrigger();
    if (!trigger) throw new Error('ellipsis trigger not found');
    const clickable = trigger.querySelector("[role='button']") || trigger;
    clickable.click();
    await waitFor(findBlockTabsRoot, 5000, 100);
    console.log('ensureEllipsisPanel: panel ready');
  };

  const playEpisode = async (episodeNumber) => {
    try {
      const value = Number(episodeNumber);
      if (!Number.isInteger(value) || value < 1) {
        throw new Error('invalid episode number');
      }
      console.log('playEpisode: start', value);
      if (clickEpisodeInMainList(value)) {
        console.log('playEpisode: finished in main list');
        return { status: 'success' };
      }
      await ensureEllipsisPanel();
      await clickEpisodeInPopup(value);
      console.log('playEpisode: finished in popup');
      return { status: 'success' };
    } catch (error) {
      console.log('playEpisode: error', error);
      throw error;
    }
  };

  playEpisode(35);
})();
