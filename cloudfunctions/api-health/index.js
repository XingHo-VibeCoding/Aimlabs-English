/**
 * /api/health —— WordWorld 健康检查（CloudBase HTTP 函数版）
 *
 * 为什么长这样：新建函数时选的是「HTTP 函数」类型，
 * 它要求代码自己启动一个 HTTP 服务、监听 9000 端口
 * （模板的 scf_bootstrap 启动脚本会执行 node index.js）。
 * 别人用浏览器打开公网网址 → 腾讯云把请求转发给这个服务 → 返回 JSON。
 */
const http = require('http');

const server = http.createServer((req, res) => {
  // 跨域说明（Day 20）：不手写 Access-Control-Allow-Origin，交给网关自动回，
  // 否则会和网关拼成多值无效头反被浏览器拦截。
  // 任何路径、任何方法都返回同样的健康状态（健康检查不需要区分）
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(
    JSON.stringify({
      status: 'ok',                  // 「我还活着」
      service: 'wordworld',          // 谁在回答
      time: new Date().toISOString(), // 服务器当前时间，证明是刚刚真实返回的
    })
  );
});

// 端口必须是 9000：云函数容器的 scf_bootstrap 约定监听这个端口
server.listen(9000, () => {
  console.log('api-health is listening on port 9000');
});
