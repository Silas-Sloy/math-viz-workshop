@echo off
chcp 65001 >nul
rem 双击本文件，或在本目录的终端里输入 dev.cmd 回车，即可启动开发服务器
rem 原理：把内置 Node 目录临时加进 PATH，避免终端里找不到 npm

set "NODE_HOME=%USERPROFILE%\.workbuddy\binaries\node\versions\22.22.2-6"

if not exist "%NODE_HOME%\npm.cmd" (
  echo [错误] 没找到 npm，路径：%NODE_HOME%
  echo 请把本文件里的 NODE_HOME 改成你机器上 node 的实际目录
  pause
  exit /b 1
)

set "PATH=%NODE_HOME%;%PATH%"

if not exist "node_modules" (
  echo 首次运行，正在安装依赖...
  call "%NODE_HOME%\npm.cmd" install
)

echo.
echo 正在启动开发服务器，启动后浏览器打开 http://localhost:5173
echo 按 Ctrl+C 可停止
echo.
call "%NODE_HOME%\npm.cmd" run dev

pause
