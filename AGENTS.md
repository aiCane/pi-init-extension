# AGENTS.md

pi 扩展包，提供 `/init` 命令（生成/更新 `AGENTS.md`）和一个轻量 `question` 工具。全部逻辑在 `extensions/init.ts` 一个文件里，通过 `package.json` 的 `pi.extensions: ["./extensions"]` 注册。

## 没有构建、测试、lint 流程

不要找 `npm install` / `npm test` / `tsconfig.json` / CI——都不存在。依赖只有 `peerDependencies`（`@earendil-works/pi-coding-agent`、`typebox`），由宿主 pi 运行时提供，本地没有 `node_modules` 和锁文件。验证改动只需下面两条命令；涉及工具激活的改动另见「验证三态」。

## 命令

```bash
# 临时加载测试（必须带 -ne）
pi -ne -e ./extensions/init.ts

# 冒烟测试：用不存在的 model 让 pi 加载完扩展后立刻退出
pi -ne -e ./extensions/init.ts -p hi --model definitely-not-a-real-model
# 期望：只输出 Model "..." not found 并退出 1（说明扩展已干净加载）
# 出现 Failed to load extension 才是真报错
```

`-ne`（`--no-extensions`）不可省略：它禁用已发现的扩展，但显式的 `-e` 仍加载。若本包已用 `pi install` 装过，两份副本会同时注册 `question`，pi 会以 `Tool "question" conflicts with ...` 中止加载——这是硬错误，只能改名或摘掉一个。

改工具 API 时读宿主包内的 `docs/extensions.md`；但 `defaultActive`（本扩展靠它让 `question` 默认不激活）docs 里搜不到，只在 `dist/core/extensions/types.d.ts` 的类型注释里。同理，`exposure: "hidden"` 会被 `setActiveTools()` 忽略也只写在该类型里，不在 docs。

## 验证三态

工具可用性有三态，其中两态只有 UI 模式（`ctx.hasUI === true`）才有，`pi -p` 测不了；第三态只有无头模式能测。三态都用同一个办法验证：跑一轮对话，再从 session 目录里第一条 `role=system` 消息读 `toolsAdded[].name`（`-p` 和 `--mode rpc` 都会在 `--session-dir` 下落盘）：

```bash
read_tools() { python3 -c '
import json,glob,sys
for line in open(sorted(glob.glob(sys.argv[1]+"/*.jsonl"))[0]):
    m = json.loads(line).get("message")
    if m and m.get("role") == "system":
        print([t["name"] for t in (m.get("toolsAdded") or [])]); break' "$1"; }

# ① 无 UI：两个提问工具都不该出现
d=$(mktemp -d); pi --session-dir "$d" --model deepseek-flash -ne \
  -e ./extensions/init.ts -p "reply ok" >/dev/null 2>&1; read_tools "$d"

# ②③ 有 UI：起 RPC 进程，向 stdin 写 {"id":"1","type":"prompt","message":"reply ok"}，
#     等 stdout 出现 agent_settled 后终止（约 20s）。可选加 -e npm:@juicesharp/rpiv-ask-user-question
d=$(mktemp -d); pi --mode rpc --session-dir "$d" --model deepseek-flash -ne \
  -e ./extensions/init.ts; read_tools "$d"
```

期望：① 只有 `read bash edit write`；② 没装 rpiv → 多一个 `question`；③ 装了 rpiv → 多的是 `ask_user_question`，**没有** `question`。②③ 与两个 `-e` 的先后顺序无关（已验证）。`-e npm:...` 是一次性加载，不写 `settings.json`，跑完不残留。

## 硬约束

- **跨扩展工具重名是硬错误**。新增工具名时假定任何名字都可能已被占用。
- `question` 用 `defaultActive: false` + `before_agent_start` 对账来控制是否激活。**不要改用 `exposure: "hidden"` 当开关**：`setActiveTools()` 明确忽略 hidden 工具（见 `types.d.ts`），激活不了也摘不掉。
- 对账只读写 `LOCAL_ASK_TOOL` 自己，每次都重新读 `pi.getAllTools()` / `pi.getActiveTools()`，因此与扩展加载顺序无关。不要去动外部工具，它有各自的 reconciler。
- 工具可用性三态，必须一致地贯穿 `/init` 提示词与工具激活逻辑：装了 rpiv 的 `ask_user_question` → 引用它并摘掉本地 `question`；没装且有 UI → 用本地 `question`；`ctx.hasUI === false` → 两者都摘掉，提示词改成「不要提问，按合理假设继续」。任何情况下提示词都不能引用不存在的工具。

## 提示词模板

`INIT_TEMPLATE` 是纯中文提示词，占位符由 `handler` 里的两次 `String.replace` 填充：

- `__ASK_SECTION__` 由 `buildAskSection(askTool)` 生成，随工具可用性变化。
- `__USER_FOCUS__` 紧跟在「用户指定的重点或约束（务必遵循）：」冒号之后（同一行）。两个分支都替换成以 `\n` 开头的串：有参数用 `\n<focus>`，无参数用 `\n`，这样原文里的空行得以保留。改模板时不要破坏这个行数假设。

对外用词统一为中文；`question` 工具的描述里也包含「（推荐）」「输入你自己的答案」等既有措辞约定。

## 发布

发布走 npm，不再打 git tag：

```bash
npm pack --dry-run   # 先看包名与 tarball 内容
npm publish --access public
```

- npm 包名 `@niliy/pi-init`（scope 是发布用的 npm 账号 `niliy`），GitHub 仓库是 `aiCane/pi-init-extension`，两者不同名是正常的。
- 为什么必须带 scope：unscoped 的 `pi-init` 和 `pi-init-extension` 都已被其他人占用，而且都是生成 AGENTS.md 的同类工具；不带 scope 的 `npm install pi-init` 装到的是别人的包。
- 陷阱：GitHub 仓库叫 `aiCane/pi-init-extension`，与 npm 上被第三方占用的包 `pi-init-extension` 同名但毫无关系。README 里的仓库 URL 不能当 npm 包名用。
- 版本号只在 npm 上递增；git 分支是开发快照。历史 tag `v1.0.0` / `v1.1.0` 是旧分发方式的遗留物，README 不再引用，无需再对齐。
- scoped 包必须带 `--access public`，否则会因默认私有而发布失败（免费账号）。且 scope 必须属于发布者账号，否则报 `E404 Scope not found`。
- `files` 只放 `extensions`：`AGENTS.md` 是给仓库看的，不进 tarball。
