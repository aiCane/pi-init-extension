/**
 * /init — 为当前仓库创建或更新 `AGENTS.md`。
 *
 * 改编自 opencode 的 `/init` 命令。运行 `/init` 会向 agent 发送一段提示词，
 * 让其调研仓库并产出一份精简的 AGENTS.md。
 * `/init` 之后的任意文本会被插入到「用户指定的重点或约束」一节中，
 * 并由 agent 遵循。
 *
 * 同时注册一个轻量的 `question` 工具（仿照 opencode 的 question 工具），
 * 使 /init 提示词中的「使用 question 工具」指令真正可用：
 * agent 可以向用户提出一批简短的问题。
 *
 * 用法：
 *   /init                     - 创建或更新 AGENTS.md
 *   /init focus on docs       - 同上，但带有用户指定的重点/约束
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const INIT_TEMPLATE = `创建或更新本仓库的 \`AGENTS.md\`。

目标是一份精简的指令文件，帮助未来的 agent 会话少犯错、快速上手。每一行都应回答一个问题：「没有这份帮助，agent 很可能会遗漏这一点吗？」如果不是，就删掉。

用户指定的重点或约束（务必遵循）：__USER_FOCUS__

## 如何调研

优先阅读信息量最大的来源：
- \`README*\`、根级清单文件、工作区配置、锁文件
- 构建、测试、lint、格式化、类型检查与代码生成配置
- CI 工作流与 pre-commit / 任务运行器配置
- 已有的指令文件（\`AGENTS.md\`、\`CLAUDE.md\`、\`.cursor/rules/\`、\`.cursorrules\`、\`.github/copilot-instructions.md\`）

如果阅读配置和文档后架构仍不清晰，查看少量有代表性的代码文件，找出真正的入口、包边界和执行流程。优先阅读能说明系统如何组装在一起的文件，而不是随机的叶子文件。

优先采用可执行的事实来源，而不是文字描述。如果文档与配置或脚本冲突，以可执行来源为准，只保留你能验证的内容。

## 要提取什么

找出对在该仓库工作的 agent 最有价值的要点：
- 确切的开发命令，尤其是那些不显而易见的
- 如何运行单个测试、单个包或一次聚焦的验证步骤
- 顺序有要求的命令，如 \`lint -> typecheck -> test\`
- monorepo 或多包边界、主要目录的所有权、真正的应用/库入口
- 框架或工具链的特殊之处：生成代码、迁移、代码生成、构建产物、特殊的环境加载、开发服务器、基础设施部署流程
- 与默认行为不同的仓库特定风格或工作流约定
- 测试的特殊之处：fixtures、集成测试前置条件、快照工作流、必需的服务、易挂或昂贵的测试套件
- 已有指令文件中值得保留的重要约束

好的 \`AGENTS.md\` 内容通常是需要阅读多个文件才能推断出来的来之不易的上下文。

## 提问

只有当仓库无法回答某个重要问题时，才向用户提问。最多用 \`question\` 工具提出一批简短的问题。

好的问题：
- 未成文的团队约定
- 分支 / PR / 发布预期
- 已知但未记录下来的设置或测试前置条件

不要询问仓库本身已经说清楚的事情。

## 写作规则

只包含高信号、仓库特定的指导，例如：
- agent 否则会猜错的确切命令和快捷方式
- 从文件名看不出来的架构说明
- 与语言或框架默认行为不同的约定
- 设置要求、环境特殊之处和操作上的坑
- 对重要的现有指令来源的引用

排除：
- 泛泛的软件建议
- 长篇教程或详尽的文件树
- 显而易见的语言约定
- 推测性论断或任何你无法验证的内容

拿不准就删掉。

优先使用简短的章节和要点。如果仓库简单，文件就保持简单。如果仓库很大，只需总结那些真正会改变 agent 工作方式的少量结构性事实。

如果 \`AGENTS.md\` 已存在于项目根目录，就地改进它，而不是盲目重写。保留经验证有用的指导，删除废话或过时的论断，并与当前代码库核对一致。`;

const QuestionItem = Type.Object({
	question: Type.String({ description: "要问的完整问题" }),
	header: Type.Optional(Type.String({ description: "极短标签（最多 30 个字符）" })),
	options: Type.Array(
		Type.Object({
			label: Type.String({ description: "显示文本（1-5 个词，简洁）" }),
			description: Type.Optional(Type.String({ description: "选项说明" })),
		}),
		{ description: "可用的选项" },
	),
	multiple: Type.Optional(Type.Boolean({ description: "允许选择多个选项" })),
	custom: Type.Optional(Type.Boolean({ description: "允许输入自定义答案（默认：true）" })),
});

export default function initExtension(pi: ExtensionAPI) {
	pi.registerCommand("init", {
		description: "为本仓库创建或更新 AGENTS.md",
		handler: async (args, ctx) => {
			const focus = args.trim();

			// `__USER_FOCUS__` 位于冒号行之后。带参数时变成 "\n<focus>"；
			// 不带参数时变成 "\n\n"，与原提示词中的空行保持一致。
			const prompt = INIT_TEMPLATE.replace(
				"__USER_FOCUS__",
				focus ? `\n${focus}` : "\n",
			);

			if (!ctx.isIdle()) {
				ctx.ui.notify("Agent 正忙；/init 已排队，将在当前工作完成后执行", "warning");
				pi.sendUserMessage(prompt, { deliverAs: "followUp" });
				return;
			}

			pi.sendUserMessage(prompt);
		},
	});

	pi.registerTool({
		name: "question",
		label: "提问",
		description:
			'在执行过程中向用户提出一个或多个问题：收集偏好、澄清模糊的指令，或在方向上获得决策。答案以所选标签的数组形式返回。如果你推荐某个特定选项，请将其放在第一位，并在其标签后附加"（推荐）"。不要包含"其他"或兜底选项：除非 custom 为 false，否则会自动提供"输入你自己的答案"选项。',
		parameters: Type.Object({
			questions: Type.Array(QuestionItem, {
				description: "要问的问题（保持在一小批内）",
			}),
		}),
		executionMode: "sequential",

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			if (!ctx.hasUI) {
				return {
					content: [
						{
							type: "text",
							text: "当前模式无法向用户提问（无可用交互界面），请基于合理假设继续。",
						},
					],
					details: { answers: [] as string[][] },
				};
			}

			const answers: string[][] = [];
			for (const q of params.questions) {
				const base = q.header ? `${q.header}: ${q.question}` : q.question;
				const title = q.multiple ? `${base}（可多选，按 Esc 结束）` : base;
				const CUSTOM = "（输入你自己的答案…）";

				const choose = async (): Promise<{ value: string; isCustom: boolean } | undefined> => {
					const items = q.options.map((o) =>
						o.description ? `${o.label} — ${o.description}` : o.label,
					);
					let customIndex = -1;
					if (q.custom !== false) {
						customIndex = items.length;
						items.push(CUSTOM);
					}

					const choice = await ctx.ui.select(title, items);
					if (choice === undefined) return undefined; // 用户取消
					if (customIndex >= 0 && choice === CUSTOM) {
						const custom = await ctx.ui.input(title, "输入你自己的答案");
						return custom === undefined ? undefined : { value: custom, isCustom: true };
					}
					return { value: choice, isCustom: false };
				};

				const selected: string[] = [];
				if (q.multiple) {
					// 持续选择直到用户取消；自定义答案会结束循环。
					for (;;) {
						const result = await choose();
						if (result === undefined) break;
						if (!selected.includes(result.value)) selected.push(result.value);
						if (result.isCustom) break;
					}
				} else {
					const result = await choose();
					if (result !== undefined) selected.push(result.value);
				}
				answers.push(selected);
			}

			const formatted = params.questions
				.map((q, i) => `"${q.question}"="${answers[i].length ? answers[i].join(", ") : "未回答"}"`)
				.join(", ");

			return {
				content: [
					{
						type: "text",
						text: `用户已回答你的问题：${formatted}。你现在可以带着用户的答案继续。`,
					},
				],
				details: { answers },
			};
		},
	});
}
