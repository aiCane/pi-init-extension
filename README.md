# pi-init-extension

为 [pi](https://github.com/earendil-works/pi-coding-agent) 提供 `/init` 命令：调研当前仓库并创建或更新一份精简的 `AGENTS.md`，帮助未来的 agent 会话快速上手、少犯错。

本扩展改编自 [opencode](https://github.com/sst/opencode) 的 `/init` 命令，并已中文化，适配全中文思考链。同时注册一个轻量的 `question` 工具，作为零依赖的提问后备。

## 安装

```bash
# npm（推荐）
pi install npm:@niliy/pi-init

# 或跟随 git main 分支（开发快照，不与 npm 版本对齐）
pi install git:github.com/aiCane/pi-extension-init

# 或临时试用（不写入配置，仅本次运行生效）
pi -e npm:@niliy/pi-init
```

安装后执行 `/reload` 热加载，或重启 pi。

## 用法

```
/init                    创建或更新 AGENTS.md
/init 重点关注文档部分  同上，但带有用户指定的重点/约束
```

## 说明

- 提示词为全中文，包含「如何调研」「要提取什么」「提问」「写作规则」四个环节。
- 遵循高信号原则：只保留 agent 没有帮助就容易遗漏的内容，拿不准就删掉。
- 若 `AGENTS.md` 已存在于项目根目录，会就地改进而非盲目重写。

## 与外部提问工具的配合

本扩展自带的 `question` 工具很轻（逐题 `ctx.ui.select`，支持多选与自定义答案），只够 `/init` 用。如果另外装了功能更全的 [`@juicesharp/rpiv-ask-user-question`](https://pi.dev/packages/@juicesharp/rpiv-ask-user-question)（`ask_user_question`，带标签页、笔记、preview 侧栏），本扩展会自动让位：

| 环境 | `question` 状态 | `/init` 提示词引用 |
|---|---|---|
| 装了 rpiv，有交互界面 | 从工具集中摘掉 | `ask_user_question` |
| 没装 rpiv，有交互界面 | 挂上 | `question` |
| 无交互界面（`ctx.hasUI === false`） | 摘掉 | 不提问，要求按合理假设继续 |

因此 `/init` 的提示词永远不会引用一个不存在的工具，也**不强制依赖**任何第三方包。对账在 `before_agent_start` 里做，只读写自己那个工具名，扩展加载顺序无关。

可选安装：

```bash
pi install npm:@juicesharp/rpiv-ask-user-question
```

## 本地开发

```bash
pi -ne -e ./extensions/init.ts   # 临时加载测试
```

带上 `-ne` 很重要：如果已经装过本包（`pi install`），两个副本会同时注册 `question`，pi 会直接报 `Tool "question" conflicts with ...` 并中止加载——跨扩展的工具重名是硬错误，只能改名或摘掉一个。

改完记得跑一下下面这个零成本的冒烟测试（用不存在的 model 让 pi 在加载完扩展后立即退出）：

```bash
pi -ne -e ./extensions/init.ts -p hi --model definitely-not-a-real-model
# 只输出 'Model "..." not found' 就是干净的；出现 'Failed to load extension' 才是真报错
```

## 许可

MIT。改编自 [opencode](https://github.com/sst/opencode)（MIT）的 `/init` 命令，版权声明见 [LICENSE](LICENSE)。
