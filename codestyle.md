# 前端代码规范

参考来源：[Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)、[Google HTML/CSS Style Guide](https://google.github.io/styleguide/htmlcssguide.html)。以下为本项目采用的规则，不声明全面符合上游的每条规定。

- JavaScript 和 HTML 缩进为 2 空格；JavaScript 使用双引号、分号、`const` 优先，需重新赋值时使用 `let`。
- 函数和变量使用 `camelCase`，CSS 类和 DOM ID 使用清晰的 `kebab-case`。
- 仅前端负责输入、请求和显示，不在浏览器计算最终表达式结果。
- HTTP 调用集中在 `request` 函数；统一处理超时、网络错误和非成功状态。
- 服务器返回的动态文本使用 `textContent` 或 DOM API，避免把动态内容写入 `innerHTML`。
- 样式位于独立 CSS 文件，按页面区域组织；简短规则允许在同一行书写。
- 按钮使用真实 `button`，输入有标签，动态信息有状态提示，提供键盘焦点和手机布局。
- 注释解释设计约束，不重复描述显而易见的代码。
- 不在仓库提交密钥、本地日志或依赖目录。
