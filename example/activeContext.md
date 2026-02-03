# 🧠 Active Memory & Constraints (核心记忆与约束)
<!-- 考虑增加一份长期的记忆和当前需求的记忆 -->
<!-- 不知道为什么老锁文件，考虑给ai增加一条手动更新 -->
## 🛑 Critical Rules & Patterns (强制规范与踩坑记录)
oc相关的ts定义尽量放在`src/types/oc.d.ts`中，不要在其他文件中定义
- **[架构约束]**: 
  - 业务组件的 props 不需要映射接口字段，而应该将整个对象传入组件，便于快速迭代
  - 业务组件的 props 名称、事件名称尽量简短
  - CSS Modules 必须使用连接线命名（kebab-case），在 TSX 中使用方括号语法引用：`styles['class-name']`
- **[OC 区域约束]**: 
  - **单个 OC 模式（displayType: 'single'）**：左侧大卡使用 `OCCard`，右侧小卡使用 `OCSmallCard`（最多 6 个），小卡数据来自该 OC 的 `product_list` 映射；PC 端为 3x2 网格静态展示，移动端小卡使用 `AcgSwiper` 左右滑动；下方有 View All，右上角没有 View All；小卡加密判断对齐 `ProductAccessMode.PASSWORD`
  - **多个 OC 模式（displayType: 'multiple'）**：不再区分大卡/小卡，统一使用 `OCListCard`；PC 端最多显示 3 个卡片，移动端通过 `AcgSwiper` 滑动展示最多 6 个卡片；PC 端右上角有 View All，移动端没有任何 View All
  - 模式由 `storeData.oc_list` 长度决定：0 个不渲染 OC 区域，1 个为单 OC，2 个及以上为多 OC
  - 两种模式的 View All 跳转：单 OC 跳到 `/store/[slug]/oc/[ocName]`，多 OC 跳到 `/store/[slug]/oc`

## 🔌 Session Handoff (会话交接)
- **[当前上下文]**: 
  - **店铺 OC 区域**：`StoreFeaturedContent` 从 `storeData.oc_list` 读取 OC 数据，根据数量判断单/多 OC 模式，多 OC 模式的 View All 跳转到 `/store/[slug]/oc`
  - **OC 列表页**：路由为 `/store/[slug]/oc`，通过 `getStoreIntroductionSSR` 获取 `storeData.oc_list`；PC 端显示面包屑导航，每个 OC 区块包含左侧 `OCCard` 大卡和右侧 `OCSmallCard` 小卡网格（最多 6 个），底部有 View All 按钮跳转到对应 OC 详情页；移动端隐藏面包屑，每个 OC 区块顶部显示头像+名称+收藏按钮，小卡使用 `AcgSwiper` 横向滑动
  - **OC 详情页**：`[slug]/oc/[ocSlug]/page.tsx` 通过 `getOCDetailSSR` 获取 OC 详情，调用 `/web/oc/detail` 接口；页面包含面包屑、OC 头像名称收藏、OCCard 大卡、以及商品列表分页展示
  - **兼容路由**：`/store/oc-hub/page.tsx` 处理旧链接 `/store/oc-hub?store_slug=xxx`，重定向到 `/store/[slug]/oc`

## 💡 Pending Ideas (待办思路)
- 后端 `oc_list` 若补充 `access_mode` 字段，可去掉各处 FIXME 默认 1
- `OCListCard` 当前标签 `# Vtuber`、`# OC` 为硬编码，后续可从接口或配置动态生成
- 视需求决定是否将 OC 区域抽离成独立业务组件复用
- OC 列表页的多语言文案 `oc.no-products-yet` 和 `oc.browse-all-characters-from` 需要在翻译文件中补充
