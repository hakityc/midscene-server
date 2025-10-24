import { describe, expect, it } from 'vitest';
import { formatTaskTip, getTaskStageDescription } from '../taskTipFormatter';

describe('taskTipFormatter', () => {
  describe('formatTaskTip', () => {
    describe('Planning 阶段', () => {
      it('应该格式化 Planning/LoadYaml 提示', () => {
        const result = formatTaskTip('Planning / LoadYaml - config.yaml');
        expect(result.formatted).toBe('小乐正在准备任务');
        expect(result.icon).toBe('📋');
        expect(result.category).toBe('planning');
        expect(result.content).toBe('config.yaml');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Planning/Plan 提示', () => {
        const result = formatTaskTip('Planning / Plan - 登录流程');
        expect(result.formatted).toBe('小乐正在规划操作步骤');
        expect(result.icon).toBe('🎯');
        expect(result.category).toBe('planning');
        expect(result.content).toBe('登录流程');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Planning 通用提示', () => {
        const result = formatTaskTip('Planning - 分析任务需求');
        expect(result.formatted).toBe('小乐正在准备操作');
        expect(result.icon).toBe('🎯');
        expect(result.category).toBe('planning');
        expect(result.content).toBe('分析任务需求');
        expect(result.hint).toBe('');
      });
    });

    describe('Insight 阶段', () => {
      it('应该格式化 Insight/Locate 提示', () => {
        const result = formatTaskTip('Insight / Locate - 搜索按钮');
        expect(result.formatted).toBe('小乐正在查找页面元素');
        expect(result.icon).toBe('🔍');
        expect(result.category).toBe('insight');
        expect(result.content).toBe('搜索按钮');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Insight/Query 提示', () => {
        const result = formatTaskTip('Insight / Query - 获取用户名');
        expect(result.formatted).toBe('小乐正在读取页面信息');
        expect(result.icon).toBe('📊');
        expect(result.category).toBe('insight');
        expect(result.content).toBe('获取用户名');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Insight/Boolean 提示', () => {
        const result = formatTaskTip('Insight / Boolean - 检查登录状态');
        expect(result.formatted).toBe('小乐正在检查页面内容');
        expect(result.icon).toBe('🔍');
        expect(result.category).toBe('insight');
        expect(result.content).toBe('检查登录状态');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Insight/Number 提示', () => {
        const result = formatTaskTip('Insight / Number - 统计商品数量');
        expect(result.formatted).toBe('小乐正在读取数值');
        expect(result.icon).toBe('🔢');
        expect(result.category).toBe('insight');
        expect(result.content).toBe('统计商品数量');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Insight/String 提示', () => {
        const result = formatTaskTip('Insight / String - 提取标题文本');
        expect(result.formatted).toBe('小乐正在读取文本');
        expect(result.icon).toBe('📝');
        expect(result.category).toBe('insight');
        expect(result.content).toBe('提取标题文本');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Insight/Assert 提示', () => {
        const result = formatTaskTip('Insight / Assert - 验证结果正确');
        expect(result.formatted).toBe('小乐正在检查页面内容');
        expect(result.icon).toBe('✅');
        expect(result.category).toBe('insight'); // Assert 属于 Insight 阶段
        expect(result.content).toBe('验证结果正确');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Insight 通用提示', () => {
        const result = formatTaskTip('Insight - 页面分析');
        expect(result.formatted).toBe('小乐正在识别页面元素');
        expect(result.icon).toBe('🔍');
        expect(result.category).toBe('insight');
        expect(result.content).toBe('页面分析');
        expect(result.hint).toBe('');
      });
    });

    describe('Action 阶段', () => {
      it('应该格式化 Action/Tap 提示（带内容）', () => {
        const result = formatTaskTip('Action / Tap - 登录按钮');
        expect(result.formatted).toBe('小乐正在点击');
        expect(result.icon).toBe('👆');
        expect(result.category).toBe('action');
        expect(result.content).toBe('登录按钮');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action/Tap 提示（不带内容）', () => {
        const result = formatTaskTip('Action / Tap');
        expect(result.formatted).toBe('小乐正在点击');
        expect(result.icon).toBe('👆');
        expect(result.category).toBe('action');
        expect(result.content).toBe('');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action/Hover 提示（带内容）', () => {
        const result = formatTaskTip('Action / Hover - 菜单项');
        expect(result.formatted).toBe('小乐正在悬停');
        expect(result.icon).toBe('🖱️');
        expect(result.category).toBe('action');
        expect(result.content).toBe('菜单项');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action/Hover 提示（不带内容）', () => {
        const result = formatTaskTip('Action / Hover');
        expect(result.formatted).toBe('小乐正在悬停');
        expect(result.icon).toBe('🖱️');
        expect(result.category).toBe('action');
        expect(result.content).toBe('');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action/Input 提示', () => {
        const result = formatTaskTip('Action / Input - 用户名');
        expect(result.formatted).toBe('小乐正在输入');
        expect(result.icon).toBe('⌨️');
        expect(result.category).toBe('action');
        expect(result.content).toBe('用户名');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action/KeyboardPress 提示', () => {
        const result = formatTaskTip('Action / KeyboardPress - Enter');
        expect(result.formatted).toBe('小乐正在按键');
        expect(result.icon).toBe('⌨️');
        expect(result.category).toBe('action');
        expect(result.content).toBe('Enter');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action/RightClick 提示（带内容）', () => {
        const result = formatTaskTip('Action / RightClick - 文件夹');
        expect(result.formatted).toBe('小乐正在右键点击');
        expect(result.icon).toBe('🖱️');
        expect(result.category).toBe('action');
        expect(result.content).toBe('文件夹');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action/RightClick 提示（不带内容）', () => {
        const result = formatTaskTip('Action / RightClick');
        expect(result.formatted).toBe('小乐正在右键点击');
        expect(result.icon).toBe('🖱️');
        expect(result.category).toBe('action');
        expect(result.content).toBe('');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action/Scroll 提示（带内容）', () => {
        const result = formatTaskTip('Action / Scroll - 滚动到底部');
        expect(result.formatted).toBe('小乐正在滚动页面');
        expect(result.icon).toBe('📜');
        expect(result.category).toBe('action');
        expect(result.content).toBe('滚动到底部');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action/Scroll 提示（不带内容）', () => {
        const result = formatTaskTip('Action / Scroll');
        expect(result.formatted).toBe('小乐正在滚动页面');
        expect(result.icon).toBe('📜');
        expect(result.category).toBe('action');
        expect(result.content).toBe('');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action/Sleep 提示（带内容）', () => {
        const result = formatTaskTip('Action / Sleep - 1000ms');
        expect(result.formatted).toBe('小乐正在等待');
        expect(result.icon).toBe('⏳');
        expect(result.category).toBe('action');
        expect(result.content).toBe('1000ms');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action/Sleep 提示（不带内容）', () => {
        const result = formatTaskTip('Action / Sleep');
        expect(result.formatted).toBe('小乐正在等待');
        expect(result.icon).toBe('⏳');
        expect(result.category).toBe('action');
        expect(result.content).toBe('');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action/DragAndDrop 提示', () => {
        const result = formatTaskTip('Action / DragAndDrop - 拖拽图片');
        expect(result.formatted).toBe('小乐正在拖拽');
        expect(result.icon).toBe('🔄');
        expect(result.category).toBe('action');
        expect(result.content).toBe('拖拽图片');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action/AndroidPull 提示', () => {
        const result = formatTaskTip('Action / AndroidPull - 下拉刷新');
        expect(result.formatted).toBe('小乐正在滑动页面');
        expect(result.icon).toBe('📱');
        expect(result.category).toBe('action');
        expect(result.content).toBe('下拉刷新');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action/Error 提示', () => {
        const result = formatTaskTip('Action / Error - 点击失败');
        expect(result.formatted).toBe('小乐操作遇到问题，正在自动重试');
        expect(result.icon).toBe('❌');
        expect(result.category).toBe('action'); // Error 在 Action 下属于 action 类别
        expect(result.content).toBe('点击失败');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action/Finished 提示（带内容）', () => {
        const result = formatTaskTip('Action / Finished - 任务已完成');
        expect(result.formatted).toBe('小乐操作完成');
        expect(result.icon).toBe('🎉');
        expect(result.category).toBe('action'); // Finished 在 Action 下属于 action 类别
        expect(result.content).toBe('任务已完成');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action/Finished 提示（不带内容）', () => {
        const result = formatTaskTip('Action / Finished');
        expect(result.formatted).toBe('小乐操作完成');
        expect(result.icon).toBe('🎉');
        expect(result.category).toBe('action'); // Finished 在 Action 下属于 action 类别
        expect(result.content).toBe('');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action 自定义操作（带描述）', () => {
        const result = formatTaskTip('Action / CustomAction - 执行自定义操作');
        expect(result.formatted).toBe('小乐正在执行操作');
        expect(result.icon).toBe('⚡');
        expect(result.category).toBe('action');
        expect(result.content).toBe('执行自定义操作');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Action 通用操作', () => {
        const result = formatTaskTip('Action / DoSomething');
        expect(result.formatted).toBe('小乐正在执行操作');
        expect(result.icon).toBe('⚡');
        expect(result.category).toBe('action');
        expect(result.content).toBe('DoSomething');
        expect(result.hint).toBe('');
      });
    });

    describe('Log 阶段', () => {
      it('应该格式化 Log/Screenshot 提示（带内容）', () => {
        const result = formatTaskTip('Log / Screenshot - 保存截图');
        expect(result.formatted).toBe('小乐正在保存截图');
        expect(result.icon).toBe('📸');
        expect(result.category).toBe('general');
        expect(result.content).toBe('保存截图');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Log/Screenshot 提示（不带内容）', () => {
        const result = formatTaskTip('Log / Screenshot');
        expect(result.formatted).toBe('小乐正在保存截图');
        expect(result.icon).toBe('📸');
        expect(result.category).toBe('general');
        expect(result.content).toBe('');
        expect(result.hint).toBe('');
      });

      it('应该格式化 Log 通用提示', () => {
        const result = formatTaskTip('Log - 记录执行结果');
        expect(result.formatted).toBe('小乐正在记录操作');
        expect(result.icon).toBe('📝');
        expect(result.category).toBe('general');
        expect(result.content).toBe('记录执行结果');
        expect(result.hint).toBe('');
      });
    });

    describe('边界情况', () => {
      it('应该处理空字符串', () => {
        const result = formatTaskTip('');
        expect(result.formatted).toBe('小乐正在处理中...');
        expect(result.icon).toBe('🤖');
        expect(result.category).toBe('unknown');
        expect(result.content).toBe('');
        expect(result.hint).toBe('');
      });

      it('应该处理 null 值', () => {
        const result = formatTaskTip(null as any);
        expect(result.formatted).toBe('小乐正在处理中...');
        expect(result.icon).toBe('🤖');
        expect(result.category).toBe('unknown');
        expect(result.content).toBe('');
        expect(result.hint).toBe('');
      });

      it('应该处理 undefined 值', () => {
        const result = formatTaskTip(undefined as any);
        expect(result.formatted).toBe('小乐正在处理中...');
        expect(result.icon).toBe('🤖');
        expect(result.category).toBe('unknown');
        expect(result.content).toBe('');
        expect(result.hint).toBe('');
      });

      it('应该处理非字符串值', () => {
        const result = formatTaskTip(123 as any);
        expect(result.formatted).toBe('小乐正在处理中...');
        expect(result.icon).toBe('🤖');
        expect(result.category).toBe('unknown');
        expect(result.content).toBe('');
        expect(result.hint).toBe('');
      });

      it('应该处理只有空格的字符串', () => {
        const result = formatTaskTip('   ');
        // trim() 后为空字符串，但会走默认分支返回原字符串
        expect(result.formatted).toBe('小乐');
        expect(result.icon).toBe('🤖');
        expect(result.category).toBe('general');
        expect(result.content).toBe('');
        expect(result.hint).toBe('');
      });

      it('应该处理未知格式的提示', () => {
        const result = formatTaskTip('UnknownPhase - Some Action');
        expect(result.formatted).toBe('小乐UnknownPhase - Some Action');
        expect(result.icon).toBe('🤖');
        expect(result.category).toBe('general');
        expect(result.content).toBe('UnknownPhase - Some Action');
        expect(result.hint).toBe('');
      });

      it('应该处理前后有空格的提示', () => {
        const result = formatTaskTip('  Planning / Plan - 测试任务  ');
        expect(result.formatted).toBe('小乐正在规划操作步骤');
        expect(result.icon).toBe('🎯');
        expect(result.category).toBe('planning');
        expect(result.content).toBe('测试任务');
        expect(result.hint).toBe('');
      });
    });

    describe('大小写不敏感', () => {
      it('应该处理小写的 planning', () => {
        const result = formatTaskTip('planning / plan - 测试');
        expect(result.formatted).toBe('小乐正在规划操作步骤');
        expect(result.category).toBe('planning');
        expect(result.content).toBe('测试');
        expect(result.hint).toBe('');
      });

      it('应该处理大写的 INSIGHT', () => {
        const result = formatTaskTip('INSIGHT / LOCATE - 元素');
        expect(result.formatted).toBe('小乐正在查找页面元素');
        expect(result.category).toBe('insight');
        expect(result.content).toBe('元素');
        expect(result.hint).toBe('');
      });

      it('应该处理混合大小写的 AcTiOn', () => {
        const result = formatTaskTip('AcTiOn / TaP - 按钮');
        expect(result.formatted).toBe('小乐正在点击');
        expect(result.category).toBe('action');
        expect(result.content).toBe('按钮');
        expect(result.hint).toBe('');
      });
    });
  });

  describe('getTaskStageDescription', () => {
    it('应该返回 planning 阶段描述', () => {
      expect(getTaskStageDescription('planning')).toBe('任务规划阶段');
    });

    it('应该返回 insight 阶段描述', () => {
      expect(getTaskStageDescription('insight')).toBe('元素定位阶段');
    });

    it('应该返回 action 阶段描述', () => {
      expect(getTaskStageDescription('action')).toBe('执行操作阶段');
    });

    it('应该返回 verify 阶段描述', () => {
      expect(getTaskStageDescription('verify')).toBe('结果验证阶段');
    });

    it('应该返回 extract 阶段描述', () => {
      expect(getTaskStageDescription('extract')).toBe('信息提取阶段');
    });

    it('应该返回 error 阶段描述', () => {
      expect(getTaskStageDescription('error')).toBe('错误处理阶段');
    });

    it('应该返回 retry 阶段描述', () => {
      expect(getTaskStageDescription('retry')).toBe('重试处理阶段');
    });

    it('应该返回 complete 阶段描述', () => {
      expect(getTaskStageDescription('complete')).toBe('任务完成阶段');
    });

    it('应该返回 general 阶段描述', () => {
      expect(getTaskStageDescription('general')).toBe('处理中');
    });

    it('应该为未知类型返回默认描述', () => {
      expect(getTaskStageDescription('unknown')).toBe('处理中');
    });

    it('应该为空字符串返回默认描述', () => {
      expect(getTaskStageDescription('')).toBe('处理中');
    });

    it('应该为未定义类型返回默认描述', () => {
      expect(getTaskStageDescription('nonexistent')).toBe('处理中');
    });
  });

  describe('集成测试', () => {
    it('应该正确处理完整的任务流程', () => {
      const stages = [
        {
          tip: 'Planning / LoadYaml - task.yaml',
          expectedCategory: 'planning',
        },
        { tip: 'Planning / Plan - 执行登录', expectedCategory: 'planning' },
        { tip: 'Insight / Locate - 用户名输入框', expectedCategory: 'insight' },
        { tip: 'Action / Input - admin', expectedCategory: 'action' },
        { tip: 'Insight / Locate - 密码输入框', expectedCategory: 'insight' },
        { tip: 'Action / Input - password123', expectedCategory: 'action' },
        { tip: 'Action / Tap - 登录按钮', expectedCategory: 'action' },
        { tip: 'Insight / Assert - 验证登录成功', expectedCategory: 'insight' }, // Assert 属于 insight
        { tip: 'Action / Finished - 任务完成', expectedCategory: 'action' }, // Finished 属于 action
      ];

      for (const stage of stages) {
        const result = formatTaskTip(stage.tip);
        expect(result.category).toBe(stage.expectedCategory);
        expect(result.formatted).toBeTruthy();
        expect(result.icon).toBeTruthy();
        expect(result.content).toBeDefined();
        expect(result.hint).toBeDefined();
      }
    });

    it('格式化结果应该能正确获取阶段描述', () => {
      const tip = 'Planning / Plan - 测试任务';
      const result = formatTaskTip(tip);
      const description = getTaskStageDescription(result.category);

      expect(result.category).toBe('planning');
      expect(description).toBe('任务规划阶段');
      expect(result.content).toBe('测试任务');
      expect(result.hint).toBe('');
    });
  });
});
