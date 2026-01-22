-- Seed data for development and testing

-- Insert sample workshops
INSERT INTO public.workshops (id, title, description, cover_image, event_date, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', '创业方法论 Workshop', '学习YC创业方法论的核心概念和实践技巧，与优秀创业者一起交流讨论。', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800', '2026-01-20', true),
  ('22222222-2222-2222-2222-222222222222', '产品设计思维工作坊', '深入了解产品设计方法论，学习如何从用户需求出发设计产品。', 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800', '2026-01-25', true),
  ('33333333-3333-3333-3333-333333333333', '融资策略分享会', '了解融资的最佳时机、估值方法和投资人沟通技巧。', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800', '2026-02-01', true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample course
INSERT INTO public.courses (id, title, description, cover_image, order_index, is_published) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '创业基础入门', '系统学习创业的核心概念、方法论和实战技巧，从0到1构建你的创业知识体系。', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800', 0, true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample chapters
INSERT INTO public.chapters (id, course_id, title, order_index) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '什么是创业', 0),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '寻找创业想法', 1),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '产品与用户', 2)
ON CONFLICT (id) DO NOTHING;

-- Insert sample lessons
INSERT INTO public.lessons (id, chapter_id, title, content, order_index) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '创业的定义', 
   E'# 创业的定义\n\n创业是一个从0到1的过程，是将想法转化为现实、创造价值的旅程。\n\n## 什么是创业？\n\n创业不仅仅是开一家公司，更是一种**解决问题**的方式。成功的创业往往从发现一个真实存在的问题开始。\n\n> "The best startups generally come from somebody needing to scratch an itch." - Michael Arrington\n\n## 创业的核心要素\n\n1. **问题**：发现一个值得解决的问题\n2. **解决方案**：提出独特的解决方案\n3. **团队**：组建能够执行的团队\n4. **执行**：快速迭代，持续改进\n\n## 观看视频\n\n点击下方链接观看陆奇博士关于创业的精彩演讲：\n\n[观看视频：创业方法论](https://www.youtube.com/watch?v=example)\n\n## 关键点总结\n\n- 创业是解决问题的过程\n- 从用户需求出发\n- 快速验证，持续迭代\n- 组建互补的团队', 0),
  
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '创业者的心态', 
   E'# 创业者的心态\n\n成功的创业者往往具备一些共同的心态特征。\n\n## 成长型思维\n\n相信能力可以通过努力和学习来发展，而不是固定不变的。\n\n```\n固定型思维：我不擅长这个\n成长型思维：我还没学会这个\n```\n\n## 抗压能力\n\n创业充满不确定性，需要：\n\n- 接受失败是学习的一部分\n- 保持乐观但现实的态度\n- 在压力下保持冷静决策\n\n## 持续学习\n\n| 学习领域 | 重要性 |\n|---------|-------|\n| 产品 | 高 |\n| 技术 | 中高 |\n| 市场 | 高 |\n| 财务 | 中 |\n\n## 推荐阅读\n\n- 《从0到1》- Peter Thiel\n- 《精益创业》- Eric Ries', 1),
  
  ('11111111-aaaa-aaaa-aaaa-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '好想法的特征',
   E'# 好想法的特征\n\n不是所有想法都适合创业，好的创业想法有一些共同特征。\n\n## 1. 解决真实问题\n\n好的创业想法必须解决一个**真实存在**的问题，而不是想象中的问题。\n\n### 如何验证问题是否真实？\n\n- 你自己是否遇到过这个问题？\n- 有多少人有同样的问题？\n- 人们现在如何解决这个问题？\n\n## 2. 市场规模足够大\n\n```\nTAM (Total Addressable Market) - 总可触达市场\nSAM (Serviceable Available Market) - 可服务市场\nSOM (Serviceable Obtainable Market) - 可获得市场\n```\n\n## 3. 有独特的洞察\n\n你对这个问题有什么独特的理解？为什么你比其他人更适合解决这个问题？\n\n## 视频资源\n\n[如何找到创业想法 - YC](https://www.youtube.com/watch?v=example2)', 0)
ON CONFLICT (id) DO NOTHING;

-- Insert sample questions
INSERT INTO public.questions (id, lesson_id, type, question_text, options, correct_answer, explanation, order_index) VALUES
  ('q1111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'single',
   '创业的核心是什么？',
   '[{"id": "a", "text": "赚钱"}, {"id": "b", "text": "解决问题"}, {"id": "c", "text": "获得融资"}, {"id": "d", "text": "上市"}]'::jsonb,
   '"b"'::jsonb,
   '成功的创业往往从发现并解决一个真实存在的问题开始，而不仅仅是为了赚钱。', 0),
   
  ('q2222222-2222-2222-2222-222222222222', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'multiple',
   '以下哪些是创业的核心要素？（多选）',
   '[{"id": "a", "text": "问题"}, {"id": "b", "text": "解决方案"}, {"id": "c", "text": "豪华办公室"}, {"id": "d", "text": "团队"}]'::jsonb,
   '["a", "b", "d"]'::jsonb,
   '创业的核心要素包括问题、解决方案、团队和执行，豪华办公室并不是必需的。', 1),
   
  ('q3333333-3333-3333-3333-333333333333', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'boolean',
   '创业者应该具备成长型思维。',
   '[{"id": "true", "text": "正确"}, {"id": "false", "text": "错误"}]'::jsonb,
   '"true"'::jsonb,
   '成长型思维帮助创业者相信能力可以通过努力和学习来发展，这是创业成功的重要心态。', 2),
   
  ('q4444444-4444-4444-4444-444444444444', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'single',
   '以下哪项不是创业者需要的心态特征？',
   '[{"id": "a", "text": "成长型思维"}, {"id": "b", "text": "抗压能力"}, {"id": "c", "text": "害怕失败"}, {"id": "d", "text": "持续学习"}]'::jsonb,
   '"c"'::jsonb,
   '创业者需要把失败视为学习的一部分，而不是害怕失败。', 0)
ON CONFLICT (id) DO NOTHING;
