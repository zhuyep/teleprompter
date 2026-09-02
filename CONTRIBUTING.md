# Contributing / 参与贡献

Thank you for helping improve Teleprompter. 感谢你帮助改进提词器。

## Before opening an issue / 提交 Issue 前

- Search existing issues first. / 请先搜索已有 Issue。
- Include the browser, operating system, device type, and clear reproduction steps. / 请写明浏览器、操作系统、设备类型和复现步骤。
- Do not include private script content in screenshots or examples. / 截图和示例中请勿包含私人稿件内容。

## Pull requests / 提交 PR

1. Keep each pull request focused on one problem. / 每个 PR 请只解决一个问题。
2. Preserve the no-build, no-backend architecture unless the change has been discussed first. / 除非事先讨论，请保持“无需构建、无后端”的架构。
3. Test desktop and mobile layouts, playback controls, persistence, and offline loading. / 请测试桌面端与移动端布局、播放控制、本地保存和离线加载。
4. Update both Chinese and English user-facing documentation when behavior changes. / 行为变化时请同步更新中英文说明。

## Local checks / 本地检查

```bash
node --check app.js
python3 -m json.tool manifest.json >/dev/null
python3 -m http.server 8000
```

By contributing, you agree that your contribution is licensed under the repository's MIT License.

提交贡献即表示你同意按本仓库的 MIT 许可证发布贡献内容。

