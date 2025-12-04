(() => {
  async function playEpisode(episodeNumber) {
    console.log('[腾讯视频播放] [playEpisode] 开始播放集数:', episodeNumber);
    try {
      const hasRangeSelector = document.querySelector(
        '[dt-params*="mod_id=series"]',
      );
      console.log(
        '[腾讯视频播放] [playEpisode] 检查范围选择器:',
        !!hasRangeSelector,
      );

      if (hasRangeSelector) {
        const rangeInfo = findRangeForEpisode(episodeNumber);
        console.log('[腾讯视频播放] [playEpisode] 查找范围信息:', rangeInfo);
        if (!rangeInfo) {
          console.log(
            '[腾讯视频播放] [playEpisode] 未找到范围信息，返回 false',
          );
          return false;
        }

        const currentActiveRange = getCurrentActiveRange();
        console.log(
          '[腾讯视频播放] [playEpisode] 当前激活范围:',
          currentActiveRange,
        );
        const needSwitchRange =
          !currentActiveRange || currentActiveRange !== rangeInfo.text;
        console.log(
          '[腾讯视频播放] [playEpisode] 是否需要切换范围:',
          needSwitchRange,
        );

        if (needSwitchRange) {
          const rangeButton = findRangeButton(rangeInfo.text);
          console.log(
            '[腾讯视频播放] [playEpisode] 查找范围按钮:',
            !!rangeButton,
          );
          if (!rangeButton) {
            console.log(
              '[腾讯视频播放] [playEpisode] 未找到范围按钮，返回 false',
            );
            return false;
          }
          console.log(
            '[腾讯视频播放] [playEpisode] 点击范围按钮:',
            rangeInfo.text,
          );
          rangeButton.click();
          const waitResult = await waitForEpisodeListUpdate(episodeNumber);
          console.log(
            '[腾讯视频播放] [playEpisode] 等待集数列表更新结果:',
            waitResult,
          );
        }
      }

      const episodeElement = findEpisodeElement(episodeNumber);
      console.log(
        '[腾讯视频播放] [playEpisode] 查找集数元素:',
        !!episodeElement,
      );
      if (!episodeElement) {
        console.log('[腾讯视频播放] [playEpisode] 未找到集数元素，返回 false');
        return false;
      }

      console.log('[腾讯视频播放] [playEpisode] 点击集数元素:', episodeNumber);
      episodeElement.click();
      console.log('[腾讯视频播放] [playEpisode] 播放成功，返回 true');
      return true;
    } catch (error) {
      console.log('[腾讯视频播放] [playEpisode] 发生异常:', error);
      return false;
    }
  }

  function findRangeForEpisode(episodeNumber) {
    console.log(
      '[腾讯视频播放] [findRangeForEpisode] 开始查找范围，集数:',
      episodeNumber,
    );
    const mainPlayList = document.querySelector(
      '[data-mvp-dom="main_play_list"]',
    );
    console.log(
      '[腾讯视频播放] [findRangeForEpisode] 查找主播放列表:',
      !!mainPlayList,
    );
    if (!mainPlayList) {
      console.log(
        '[腾讯视频播放] [findRangeForEpisode] 未找到主播放列表，返回 null',
      );
      return null;
    }

    const rangeButtons = mainPlayList.querySelectorAll(
      '[dt-params*="mod_id=series"]',
    );
    console.log(
      '[腾讯视频播放] [findRangeForEpisode] 找到范围按钮数量:',
      rangeButtons.length,
    );

    for (const button of rangeButtons) {
      const dtParams = button.getAttribute('dt-params');
      const titleMatch = dtParams.match(/title=(\d+)-(\d+)/);

      if (titleMatch) {
        const start = parseInt(titleMatch[1], 10);
        const end = parseInt(titleMatch[2], 10);
        console.log(
          '[腾讯视频播放] [findRangeForEpisode] 检查范围:',
          start,
          '-',
          end,
        );

        if (episodeNumber >= start && episodeNumber <= end) {
          const result = {
            start,
            end,
            text: start + '-' + end,
            element: button,
          };
          console.log(
            '[腾讯视频播放] [findRangeForEpisode] 找到匹配范围:',
            result.text,
          );
          return result;
        }
      }
    }

    console.log(
      '[腾讯视频播放] [findRangeForEpisode] 未找到匹配范围，返回 null',
    );
    return null;
  }

  function getCurrentActiveRange() {
    console.log('[腾讯视频播放] [getCurrentActiveRange] 开始获取当前激活范围');
    const mainPlayList = document.querySelector(
      '[data-mvp-dom="main_play_list"]',
    );
    console.log(
      '[腾讯视频播放] [getCurrentActiveRange] 查找主播放列表:',
      !!mainPlayList,
    );
    if (!mainPlayList) {
      console.log(
        '[腾讯视频播放] [getCurrentActiveRange] 未找到主播放列表，返回 null',
      );
      return null;
    }

    const activeButton = mainPlayList.querySelector(
      '[dt-params*="mod_id=series"].b-tag--active',
    );
    console.log(
      '[腾讯视频播放] [getCurrentActiveRange] 查找激活按钮:',
      !!activeButton,
    );
    if (!activeButton) {
      console.log(
        '[腾讯视频播放] [getCurrentActiveRange] 未找到激活按钮，返回 null',
      );
      return null;
    }

    const dtParams = activeButton.getAttribute('dt-params');
    const titleMatch = dtParams.match(/title=(\d+)-(\d+)/);
    const result = titleMatch ? titleMatch[1] + '-' + titleMatch[2] : null;
    console.log('[腾讯视频播放] [getCurrentActiveRange] 当前激活范围:', result);
    return result;
  }

  function findRangeButton(rangeText) {
    console.log(
      '[腾讯视频播放] [findRangeButton] 开始查找范围按钮，范围文本:',
      rangeText,
    );
    const mainPlayList = document.querySelector(
      '[data-mvp-dom="main_play_list"]',
    );
    console.log(
      '[腾讯视频播放] [findRangeButton] 查找主播放列表:',
      !!mainPlayList,
    );
    if (!mainPlayList) {
      console.log(
        '[腾讯视频播放] [findRangeButton] 未找到主播放列表，返回 null',
      );
      return null;
    }

    const rangeButtons = mainPlayList.querySelectorAll(
      '[dt-params*="mod_id=series"]',
    );
    console.log(
      '[腾讯视频播放] [findRangeButton] 找到范围按钮数量:',
      rangeButtons.length,
    );

    for (const button of rangeButtons) {
      const dtParams = button.getAttribute('dt-params');
      if (dtParams.includes('title=' + rangeText)) {
        console.log('[腾讯视频播放] [findRangeButton] 找到匹配的范围按钮');
        return button;
      }
    }

    console.log(
      '[腾讯视频播放] [findRangeButton] 未找到匹配的范围按钮，返回 null',
    );
    return null;
  }

  function waitForEpisodeListUpdate(episodeNumber, maxWait = 5000) {
    console.log(
      '[腾讯视频播放] [waitForEpisodeListUpdate] 开始等待集数列表更新，集数:',
      episodeNumber,
      '最大等待时间:',
      maxWait,
    );
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = 100;

      const check = () => {
        const element = findEpisodeElement(episodeNumber);
        if (element) {
          console.log(
            '[腾讯视频播放] [waitForEpisodeListUpdate] 找到集数元素，等待成功',
          );
          resolve(true);
          return;
        }

        const elapsed = Date.now() - startTime;
        if (elapsed > maxWait) {
          console.log(
            '[腾讯视频播放] [waitForEpisodeListUpdate] 等待超时，返回 false',
          );
          resolve(false);
          return;
        }

        setTimeout(check, checkInterval);
      };

      setTimeout(check, 200);
    });
  }

  function findEpisodeElement(episodeNumber) {
    console.log(
      '[腾讯视频播放] [findEpisodeElement] 开始查找集数元素，集数:',
      episodeNumber,
    );
    const mainPlayList = document.querySelector(
      '[data-mvp-dom="main_play_list"]',
    );
    const searchRoot = mainPlayList || document;
    console.log(
      '[腾讯视频播放] [findEpisodeElement] 搜索根节点:',
      searchRoot === mainPlayList ? 'mainPlayList' : 'document',
    );

    const episodeElements = searchRoot.querySelectorAll(
      '.playlist-item-rect__title--numeric',
    );
    console.log(
      '[腾讯视频播放] [findEpisodeElement] 找到集数元素数量:',
      episodeElements.length,
    );

    for (const element of episodeElements) {
      const number = parseInt(element.textContent.trim(), 10);
      if (number === episodeNumber) {
        const container = element.closest('.playlist-item-rect__container');
        console.log('[腾讯视频播放] [findEpisodeElement] 找到匹配的集数元素');
        return container;
      }
    }

    console.log(
      '[腾讯视频播放] [findEpisodeElement] 未找到匹配的集数元素，返回 null',
    );
    return null;
  }

  playEpisode(lbxx);
})();
