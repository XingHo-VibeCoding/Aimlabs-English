# 发布前检查（preflight-check）

> 上线/推送前，自动扫一遍项目里「不该出现」的敏感信息，避免把密钥或内部地址带上线。
> 本说明对应用户级 Skill `~/.workbuddy/skills/preflight-check/`（Day 25 建立）。

## 什么时候用

- 代码准备 `git push` / 部署上线之前
- 怀疑密钥、token、密码被写进代码里
- 想确认 `.env` 有没有被 git 盯上（可能已经漏进仓库）

## 检查什么（当前 v1 三项）

| # | 检查项 | 判什么为「有问题」 | 严重度 |
|---|---|---|---|
| 1 | 密钥泄露 | 硬编码的敏感信息：腾讯云 `AKID` 开头密钥、`sk-` 开头 OpenAI 密钥、`ghp_` / `gho_` 开头 GitHub Token，以及 `password` / `secret` / `api_key` 等字段被赋了值 | ❌ 失败 |
| 2 | 公网地址 | 写死的 `tcloudbaseapp.com` / `app.tcloudbase.com` / 裸 IP | ⚠️ 提示（业务配置通常合理，需人工判断） |
| 3 | .env 入库 | `.env` 被 git 跟踪，或残留在提交历史里 | ❌ 失败 |

> 检查项 2 是「提示」不是「失败」：本项目里 CloudBase 网关域名（`...ap-shanghai.app.tcloudbase.com`）本来就该写在后端代码里，脚本只负责列出来，由人判断合不合理。

## 怎么用

```bash
bash ~/.workbuddy/skills/preflight-check/scripts/check.sh <要检查的项目目录>
```

省略目录参数时默认检查当前目录。例：

```bash
bash ~/.workbuddy/skills/preflight-check/scripts/check.sh .
```

## 怎么读结果

- 每项前有图标：`✅` 通过、`❌` 失败、`⚠️` 提示、`ℹ️` 说明。
- 末尾汇总 `❌ 失败项 N`、`⚠️ 提示项 N`，并给一句总结论。
- 退出码：`0` = 通过，`1` = 有失败项（可用于流水线判断）。

## 范围与限制

- 自动跳过 `node_modules/`、`dist/`、`.git/`、图片、zip、`.map`、`.lock`——这些不是「人写的代码」，扫了只会误报。
- 只**找出**问题，不自动删任何文件或密钥，发现后由人决定怎么处理。

## 已知边界（诚实声明）

- 密钥检查靠「特征词 + 正则」，可能漏掉改名换姓的密钥，也可能把注释里的示例误报为密钥——所以是「疑似」提示，需人工确认。
- 目前只做静态文本扫描，不联网验证密钥是否真实有效。
- 后续可扩展：`.gitignore` 完整性、`dist` 残留调试信息、依赖漏洞等（本次按最小版只做三项）。
