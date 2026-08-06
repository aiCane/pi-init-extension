# pi-init-extension

为 [pi](https://github.com/earendil-works/pi-coding-agent) 提供 `/init` 命令：调研当前仓库并创建或更新一份精简的 `AGENTS.md`，帮助未来的 agent 会话快速上手、少犯错。

本扩展改编自 [opencode](https://github.com/sst/opencode) 的 `/init` 命令，并已中文化，适配全中文思考链。同时注册一个轻量的 `question` 工具，使提示词中的「使用 question 工具」指令真正可用。

## 安装

```bash
# 固定版本（推荐）
pi install git:github.com/aiCane/pi-extension-init@v1.0.0

# 或跟随 main 分支
pi install https://github.com/aiCane/pi-extension-init

# 或临时试用（不写入配置，仅本次运行生效）
pi -e git:github.com/aiCane/pi-extension-init
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

## 本地开发

```bash
pi -e ./extensions/init.ts   # 临时加载测试
```

## 许可

MIT。改编自 [opencode](https://github.com/sst/opencode)（MIT）的 `/init` 命令，版权声明见 [LICENSE](LICENSE)。
