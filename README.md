# dsh-chat-thinking-editor

> 让 AI 按你的来。它不行，你自己来。

用 DeepSeek Harness 用了这么久，我算是想明白了一件事：模型再聪明，也有它就喜欢犟的时候。尤其在碰上一些技术向的活儿的时候——逆向点东西、拆个协议、翻一翻底层逻辑——它动不动就卡住，然后甩给你那句熟悉的：

> 「这个我帮不了你，因为它可能会违反……」

懂的人都懂。后面省略号什么内容，你自己脑补也补得出来。

你重新问它一遍？它还是那句话。你换个说法再试？还是那句话，顶多加一句「建议你走正规流程」之类的。烧一堆 token，结果它连脑子里那段长长的思考，都还是沿着它自己那套「不行」一直推下去。

所以我就写了这个插件。**别跟 AI 较劲了，直接改它。**

它不配合，你就把它那条回答，连同它脑子里折腾的那串思维链，一起拎出来改掉。改完保存，之后这整个对话——包括它接下来写的东西、想的过程——全都只认你改好的那个版本。它正文明明堂堂地收着你的意思，连它推演的那条路都是按你的方向走的。

一句话：**保留 AI 的聪明，改掉你不想要的部分，让它彻底听你的话。**

**中文** · [English](./README_EN.md)

---

## 它都能干嘛

- 每条 AI 消息的操作条上，多了根**小铅笔**；
- 点开弹出编辑框，**回复内容**和**思考链**两个都能改；
- 点哪条回复的铅笔，就只编辑那一条的正文与思考链；不再弹出一个要滚动的全量列表；
- 改完保存，AI 就只认你的版本；同一句想改几次改几次，不用重新跑。

一些贴心小细节：图片、工具调用这些非文本的东西会原样留着不动；正文留空就算清空这段，思考链留空就把那个思维块删掉；agent 正在跑的时候会锁住不能改，免得你们俩同时动同一段话打起来。

## DSH 0.2.1-rc.2 适配说明

原版 0.1.2 不能直接用于 0.2.1；0.2.0 已完成适配：

- **宿主侧机制换了**：0.2.1 禁止 `assistant/message` 再携带 `sourceEventSeqs`，原版“再追加一条 assistant 消息做 surface replace”的做法会直接抛错。现在改为追加 `plugin:assistant-edit` 插件记录，并通过 `SessionStore.registerMessageProjection` 注册纯投影；原事件永不修改，模型与 UI 每次 fold 都会看到编辑后的版本，重复编辑按日志顺序叠加。
- **新增 `assistantEdit/list`**：原版从浏览器 chat snapshot 里收集消息，0.2.1 的 chat 投影已移到 ui-chat 且结构变化；现在由宿主按当前 surface 枚举，客户端只负责渲染。
- **客户端依赖迁移**：`dsh-client-runtime` 已不存在；改用 `dsh-client-ui-chat` / `dsh-client-ui-session` / `dsh-client-ui-renderer` 的类型合并，图标改为 `IconEditOutlineRegular` / `IconCloseOutlineRegular`。
- **前端展示同步**：聊天记录是浏览器从原始事件 fold 出来的，看不到宿主的消息投影。插件**就地替换**官方 `assistant-step` 登记项里的组件（不新增槽位声明；DSH 一个子槽只允许一个声明者，重复声明会抛错），把该消息的 text/reasoning blocks 换成投影值后再交给官方视图，因此折叠摘要、展开的思考链、正文都会更新；其余渲染、操作按钮、CoT 翻译仍走官方组件。
- **延迟注册**：官方 `assistant-step` 条目可能在本插件 apply 之后才注册，所以插件订阅 `conversation.chat.node` 的变更，条目一出现就替换，并补一次 1s 重试；已用真实浏览器（隔离 DSH 实例 + 实际会话日志）验证正文与思考链的保存/刷新回显。
- **原生视觉**：弹窗、按钮、标签、加载态全部复用 `@deepseek-ai/dsh-client-ui-primitives` 的 `Modal` / `Button` / `Tag` / `TextShimmer`，不再自绘 dialog、遮罩、按钮或徽章；只有 DSH 没有原语的“多行文本域”用原生 textarea + `--dsw-*` token 着色。
- **关闭入口**：使用官方 `Modal` 的右上角 ×、Esc、遮罩关闭，并在底部保留一个「关闭」按钮。

本地开发安装：

```bash
dsh plugin --profile web add /workspace/unraid/work/dsh-chat-thinking-editor
```

验证：

```bash
# 客户端 bundle 已进入 HMR 图
curl -s http://127.0.0.1:3080/plugins/events | grep -c dsh-chat-thinking-editor
# 宿主投影/接口回放测试（用任意真实 session.v4.jsonl 解压后的文件）
node test/local-0.2.1.mjs /path/to/session.jsonl
```

安装后**刷新一次页面**；之后助手消息操作条里的铅笔即可打开编辑弹窗。

## 安装

前提：装好 DeepSeek Harness（`dsh`，需要 `0.2.1-rc.2` 或更高的 0.2.x）。

npm 安装（当前 `0.2.0`）：

```bash
dsh plugin --profile web add dsh-chat-thinking-editor@0.2.0
```

想改源码、跟着一起折腾的，clone 下来走本地路径挂也行：

```bash
git clone https://github.com/yumiao-dev/dsh-chat-thinking-editor.git
dsh plugin --profile web add /path/to/dsh-chat-thinking-editor
```

想手搓挂载的话，把 [cordis.patch.yml](./cordis.patch.yml) 里那行合进你 profile 的 `dsh.profile.bundles` 层，重启 `dsh web` 就完事。

装完刷新一下 DSH 页面，就能看到那根铅笔了。

## 怎么用

1. DSH 里跑一段对话，找一条你不满意的 AI 回复；
2. 鼠标挪上去，点铅笔；
3. 在「编辑助手消息」里点开那条；
4. 改正文，改思考链，爱改哪个改哪个（留空＝删掉那部分）；
5. 点保存——之后它就顺着你的版本往下走了。

关闭：点官方 `Modal` 右上角的 ×、按 Esc、点遮罩，或点底部「关闭」按钮都可以。

## 顺带修的一个小毛病

写这插件的时候顺手修了个烦人的 bug：以前你对其中一个编辑框「全选（Ctrl/Cmd+A）→ 删除」，另一个框的内容也会跟着被清空。原因是选区在弹窗里串了，两个相邻输入框被一起选中了。现在全选只影响你当前正编辑的那一栏，不会误伤隔壁。

## 兼容性

- 目标版本：DeepSeek Harness `0.2.1-rc.2`（peer 区间 `^0.2.1-rc.2`；插件版本 `0.2.0`）；
- 环境：Node 22.19+ / 24+，pnpm 12；
- 底层走的是官方 `plugin:assistant-edit` 消息投影（和 `image/offload` 同一套 seam）和 `conversation.chat.assistant-actions` 槽位，不碰私有接口。

> 提醒一句：DSH 官方自己都标了 **developer preview**，接口往后大概率还会变。哪天升级 DSH 之后发现不好用了，来提个 issue 就行。

## 目录结构

```text
.
├── src/           # TypeScript 源码（Host + 前端逻辑）
├── lib/           # 编译产物，npm 入口
├── cordis.patch.yml  # DSH 挂载声明
├── package.json
└── README.md
```

## License

[MIT](./LICENSE)

写给在 `dsh-plugin` 专区晃悠的你：与其跟一个嘴硬的模型来回折腾，不如把它掰过来。这插件就是干这个的。
