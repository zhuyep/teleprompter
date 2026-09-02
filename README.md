# Teleprompter / 提词器

A privacy-first, installable browser teleprompter for talks, recording, teaching, and live streaming. No account, backend, or upload required.

一个本地优先、可安装的网页提词器，适合演讲、录课、口播与直播。无需账号，不依赖后端，稿件不会上传。

**[Try it online / 在线使用](https://zhuyep.github.io/teleprompter/)**

## Features / 功能

- Smooth auto-scroll with adjustable speed / 平滑自动滚动与实时速度调节
- Font size, line height, and text-color controls / 字号、行距与文字颜色调节
- Horizontal mirror mode for physical teleprompter rigs / 适配实体提词器的水平镜像模式
- Pause, reset, keyboard shortcuts, and touch gestures / 暂停、重置、键盘快捷键与触控手势
- Local script library and automatic draft saving / 本地稿件库与草稿自动保存
- Installable PWA with offline support / 支持安装到桌面和离线使用
- No analytics and no server-side storage / 无统计脚本、无服务端存储

## Quick start / 快速开始

1. Open the [online app](https://zhuyep.github.io/teleprompter/). / 打开[在线应用](https://zhuyep.github.io/teleprompter/)。
2. Paste or type a script. / 输入或粘贴稿件。
3. Adjust font size, speed, line height, color, and mirror mode. / 调整字号、速度、行距、颜色和镜像模式。
4. Select **Start / 开始播放**. Tap the reading area or press <kbd>Space</kbd> to pause. / 点击“开始播放”；轻点阅读区或按空格暂停。

### Keyboard shortcuts / 键盘快捷键

| Key / 按键 | Action / 操作 |
| --- | --- |
| <kbd>Space</kbd> | Pause or resume / 暂停或继续 |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Slower or faster / 减速或加速 |
| <kbd>R</kbd> | Return to the beginning / 回到开头 |
| <kbd>Esc</kbd> | Exit playback / 退出播放 |

## Privacy / 隐私

Scripts and preferences are stored only in your browser using `localStorage`. The app has no backend and sends no script content to the repository owner. Clearing site data in your browser also removes locally saved scripts.

稿件和设置只通过 `localStorage` 保存在当前浏览器中。应用没有后端，也不会把稿件内容发送给仓库维护者。清除浏览器站点数据会同时删除本地保存的稿件。

## Run locally / 本地运行

The app has no build step or third-party runtime dependency. Serve the repository with any static web server:

本项目无需构建，也没有第三方运行时依赖。使用任意静态文件服务器即可运行：

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. A local web server is recommended because service workers are not available when opening `index.html` directly from the filesystem.

然后访问 `http://localhost:8000`。建议通过本地服务器运行，因为直接双击打开 `index.html` 时无法正常启用 Service Worker。

## Contributing / 参与贡献

Bug reports and focused pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before contributing.

欢迎提交缺陷和边界清晰的改进，请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## License / 许可证

[MIT](LICENSE) © Zhuy

