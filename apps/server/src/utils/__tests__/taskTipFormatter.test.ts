import { describe, it, expect } from 'vitest';
import { formatTaskTip, getTaskStageDescription } from '../taskTipFormatter';

describe('taskTipFormatter', () => {
  describe('formatTaskTip', () => {
    describe('Planning 阶段', () => {
      it('应该格式化 Planning/LoadYaml 提示', () => {
        const result = formatTaskTip('Planning / LoadYaml - config.yaml');
        expect(result.formatted).toBe('📋 正在解析任务配置: config.yaml');
        expect(result.icon).toBe('📋');
        expect(result.category).toBe('planning');
      });

      it('应该格式化 Planning/Plan 提示', () => {
        const result = formatTaskTip('Planning / Plan - 登录流程');
        expect(result.formatted).toBe('🎯 正在制定执行计划: 登录流程');
        expect(result.icon).toBe('🎯');
        expect(result.category).toBe('planning');
      });

      it('应该格式化 Planning 通用提示', () => {
        const result = formatTaskTip('Planning - 分析任务需求');
        expect(result.formatted).toBe('🎯 正在规划任务: 分析任务需求');
        expect(result.icon).toBe('🎯');
        expect(result.category).toBe('planning');
      });
    });

    describe('Insight 阶段', () => {
      it('应该格式化 Insight/Locate 提示', () => {
        const result = formatTaskTip('Insight / Locate - 搜索按钮');
        expect(result.formatted).toBe('🔍 正在定位元素: 搜索按钮');
        expect(result.icon).toBe('🔍');
        expect(result.category).toBe('insight');
      });

      it('应该格式化 Insight/Query 提示', () => {
        const result = formatTaskTip('Insight / Query - 获取用户名');
        expect(result.formatted).toBe('📊 正在查询信息: 获取用户名');
        expect(result.icon).toBe('📊');
        expect(result.category).toBe('insight');
      });

      it('应该格式化 Insight/Boolean 提示', () => {
        const result = formatTaskTip('Insight / Boolean - 检查登录状态');
        expect(result.formatted).toBe('🔍 正在检查条件: 检查登录状态');
        expect(result.icon).toBe('🔍');
        expect(result.category).toBe('insight');
      });

      it('应该格式化 Insight/Number 提示', () => {
        const result = formatTaskTip('Insight / Number - 统计商品数量');
        expect(result.formatted).toBe('🔢 正在提取数值: 统计商品数量');
        expect(result.icon).toBe('🔢');
        expect(result.category).toBe('insight');
      });

      it('应该格式化 Insight/String 提示', () => {
        const result = formatTaskTip('Insight / String - 提取标题文本');
        expect(result.formatted).toBe('📝 正在提取文本: 提取标题文本');
        expect(result.icon).toBe('📝');
        expect(result.category).toBe('insight');
      });

      it('应该格式化 Insight/Assert 提示', () => {
        const result = formatTaskTip('Insight / Assert - 验证结果正确');
        expect(result.formatted).toBe('✅ 正在断言验证: 验证结果正确');
        expect(result.icon).toBe('✅');
        expect(result.category).toBe('insight'); // Assert 属于 Insight 阶段
      });

      it('应该格式化 Insight 通用提示', () => {
        const result = formatTaskTip('Insight - 页面分析');
        expect(result.formatted).toBe('🔍 正在感知分析: 页面分析');
        expect(result.icon).toBe('🔍');
        expect(result.category).toBe('insight');
      });
    });

    describe('Action 阶段', () => {
      it('应该格式化 Action/Tap 提示（带内容）', () => {
        const result = formatTaskTip('Action / Tap - 登录按钮');
        expect(result.formatted).toBe('👆 正在点击: 登录按钮');
        expect(result.icon).toBe('👆');
        expect(result.category).toBe('action');
      });

      it('应该格式化 Action/Tap 提示（不带内容）', () => {
        const result = formatTaskTip('Action / Tap');
        expect(result.formatted).toBe('👆 正在点击');
        expect(result.icon).toBe('👆');
        expect(result.category).toBe('action');
      });

      it('应该格式化 Action/Hover 提示（带内容）', () => {
        const result = formatTaskTip('Action / Hover - 菜单项');
        expect(result.formatted).toBe('🖱️ 正在悬停: 菜单项');
        expect(result.icon).toBe('🖱️');
        expect(result.category).toBe('action');
      });

      it('应该格式化 Action/Hover 提示（不带内容）', () => {
        const result = formatTaskTip('Action / Hover');
        expect(result.formatted).toBe('🖱️ 正在悬停');
        expect(result.icon).toBe('🖱️');
        expect(result.category).toBe('action');
      });

      it('应该格式化 Action/Input 提示', () => {
        const result = formatTaskTip('Action / Input - 用户名');
        expect(result.formatted).toBe('⌨️ 正在输入: 用户名');
        expect(result.icon).toBe('⌨️');
        expect(result.category).toBe('action');
      });

      it('应该格式化 Action/KeyboardPress 提示', () => {
        const result = formatTaskTip('Action / KeyboardPress - Enter');
        expect(result.formatted).toBe('⌨️ 正在按键: Enter');
        expect(result.icon).toBe('⌨️');
        expect(result.category).toBe('action');
      });

      it('应该格式化 Action/RightClick 提示（带内容）', () => {
        const result = formatTaskTip('Action / RightClick - 文件夹');
        expect(result.formatted).toBe('🖱️ 正在右键点击: 文件夹');
        expect(result.icon).toBe('🖱️');
        expect(result.category).toBe('action');
      });

      it('应该格式化 Action/RightClick 提示（不带内容）', () => {
        const result = formatTaskTip('Action / RightClick');
        expect(result.formatted).toBe('🖱️ 正在右键点击');
        expect(result.icon).toBe('🖱️');
        expect(result.category).toBe('action');
      });

      it('应该格式化 Action/Scroll 提示（带内容）', () => {
        const result = formatTaskTip('Action / Scroll - 滚动到底部');
        expect(result.formatted).toBe('📜 正在滚动: 滚动到底部');
        expect(result.icon).toBe('📜');
        expect(result.category).toBe('action');
      });

      it('应该格式化 Action/Scroll 提示（不带内容）', () => {
        const result = formatTaskTip('Action / Scroll');
        expect(result.formatted).toBe('📜 正在滚动页面');
        expect(result.icon).toBe('📜');
        expect(result.category).toBe('action');
      });

      it('应该格式化 Action/Sleep 提示（带内容）', () => {
        const result = formatTaskTip('Action / Sleep - 1000ms');
        expect(result.formatted).toBe('⏳ 正在等待: 1000ms');
        expect(result.icon).toBe('⏳');
        expect(result.category).toBe('action');
      });

      it('应该格式化 Action/Sleep 提示（不带内容）', () => {
        const result = formatTaskTip('Action / Sleep');
        expect(result.formatted).toBe('⏳ 正在等待');
        expect(result.icon).toBe('⏳');
        expect(result.category).toBe('action');
      });

      it('应该格式化 Action/DragAndDrop 提示', () => {
        const result = formatTaskTip('Action / DragAndDrop - 拖拽图片');
        expect(result.formatted).toBe('🔄 正在拖拽: 拖拽图片');
        expect(result.icon).toBe('🔄');
        expect(result.category).toBe('action');
      });

      it('应该格式化 Action/AndroidPull 提示', () => {
        const result = formatTaskTip('Action / AndroidPull - 下拉刷新');
        expect(result.formatted).toBe('📱 正在滑动: 下拉刷新');
        expect(result.icon).toBe('📱');
        expect(result.category).toBe('action');
      });

      it('应该格式化 Action/Error 提示', () => {
        const result = formatTaskTip('Action / Error - 点击失败');
        expect(result.formatted).toBe('❌ 操作出错: 点击失败');
        expect(result.icon).toBe('❌');
        expect(result.category).toBe('action'); // Error 在 Action 下属于 action 类别
      });

      it('应该格式化 Action/Finished 提示（带内容）', () => {
        const result = formatTaskTip('Action / Finished - 任务已完成');
        expect(result.formatted).toBe('🎉 操作完成: 任务已完成');
        expect(result.icon).toBe('🎉');
        expect(result.category).toBe('action'); // Finished 在 Action 下属于 action 类别
      });

      it('应该格式化 Action/Finished 提示（不带内容）', () => {
        const result = formatTaskTip('Action / Finished');
        expect(result.formatted).toBe('🎉 操作完成');
        expect(result.icon).toBe('🎉');
        expect(result.category).toBe('action'); // Finished 在 Action 下属于 action 类别
      });

      it('应该格式化 Action 自定义操作（带描述）', () => {
        const result = formatTaskTip('Action / CustomAction - 执行自定义操作');
        expect(result.formatted).toContain('⚡');
        expect(result.icon).toBe('⚡');
        expect(result.category).toBe('action');
      });

      it('应该格式化 Action 通用操作', () => {
        const result = formatTaskTip('Action / DoSomething');
        expect(result.formatted).toBe('⚡ 正在执行: DoSomething');
        expect(result.icon).toBe('⚡');
        expect(result.category).toBe('action');
      });
    });

    describe('Log 阶段', () => {
      it('应该格式化 Log/Screenshot 提示（带内容）', () => {
        const result = formatTaskTip('Log / Screenshot - 保存截图');
        expect(result.formatted).toBe('📸 正在截图记录: 保存截图');
        expect(result.icon).toBe('📸');
        expect(result.category).toBe('general');
      });

      it('应该格式化 Log/Screenshot 提示（不带内容）', () => {
        const result = formatTaskTip('Log / Screenshot');
        expect(result.formatted).toBe('📸 正在截图记录');
        expect(result.icon).toBe('📸');
        expect(result.category).toBe('general');
      });

      it('应该格式化 Log 通用提示', () => {
        const result = formatTaskTip('Log - 记录执行结果');
        expect(result.formatted).toBe('📝 正在记录日志: 记录执行结果');
        expect(result.icon).toBe('📝');
        expect(result.category).toBe('general');
      });
    });

    describe('边界情况', () => {
      it('应该处理空字符串', () => {
        const result = formatTaskTip('');
        expect(result.formatted).toBe('🤖 AI正在处理中...');
        expect(result.icon).toBe('🤖');
        expect(result.category).toBe('unknown');
      });

      it('应该处理 null 值', () => {
        const result = formatTaskTip(null as any);
        expect(result.formatted).toBe('🤖 AI正在处理中...');
        expect(result.icon).toBe('🤖');
        expect(result.category).toBe('unknown');
      });

      it('应该处理 undefined 值', () => {
        const result = formatTaskTip(undefined as any);
        expect(result.formatted).toBe('🤖 AI正在处理中...');
        expect(result.icon).toBe('🤖');
        expect(result.category).toBe('unknown');
      });

      it('应该处理非字符串值', () => {
        const result = formatTaskTip(123 as any);
        expect(result.formatted).toBe('🤖 AI正在处理中...');
        expect(result.icon).toBe('🤖');
        expect(result.category).toBe('unknown');
      });

      it('应该处理只有空格的字符串', () => {
        const result = formatTaskTip('   ');
        // trim() 后为空字符串，但会走默认分支返回带空格的原字符串
        expect(result.formatted).toContain('🤖');
        expect(result.icon).toBe('🤖');
        expect(result.category).toBe('general');
      });

      it('应该处理未知格式的提示', () => {
        const result = formatTaskTip('UnknownPhase - Some Action');
        expect(result.formatted).toBe('🤖 UnknownPhase - Some Action');
        expect(result.icon).toBe('🤖');
        expect(result.category).toBe('general');
      });

      it('应该处理前后有空格的提示', () => {
        const result = formatTaskTip('  Planning / Plan - 测试任务  ');
        expect(result.formatted).toBe('🎯 正在制定执行计划: 测试任务');
        expect(result.icon).toBe('🎯');
        expect(result.category).toBe('planning');
      });
    });

    describe('大小写不敏感', () => {
      it('应该处理小写的 planning', () => {
        const result = formatTaskTip('planning / plan - 测试');
        expect(result.formatted).toBe('🎯 正在制定执行计划: 测试');
        expect(result.category).toBe('planning');
      });

      it('应该处理大写的 INSIGHT', () => {
        const result = formatTaskTip('INSIGHT / LOCATE - 元素');
        expect(result.formatted).toBe('🔍 正在定位元素: 元素');
        expect(result.category).toBe('insight');
      });

      it('应该处理混合大小写的 AcTiOn', () => {
        const result = formatTaskTip('AcTiOn / TaP - 按钮');
        expect(result.formatted).toBe('👆 正在点击: 按钮');
        expect(result.category).toBe('action');
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
        { tip: 'Planning / LoadYaml - task.yaml', expectedCategory: 'planning' },
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
      }
    });

    it('格式化结果应该能正确获取阶段描述', () => {
      const tip = 'Planning / Plan - 测试任务';
      const result = formatTaskTip(tip);
      const description = getTaskStageDescription(result.category);

      expect(result.category).toBe('planning');
      expect(description).toBe('任务规划阶段');
    });
  });
});

