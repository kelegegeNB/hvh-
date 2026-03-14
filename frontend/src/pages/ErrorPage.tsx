import React from "react";
import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";
import { Button } from "antd";
import { HomeOutlined } from "@ant-design/icons";
import { AppLayout } from "../components/layout/AppLayout";

export function ErrorPage() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const title = status === 404 ? "页面不存在" : "页面出错了";
  const messageText =
    status === 404
      ? "抱歉，你访问的页面似乎已经迷失在网络黑洞中。"
      : "系统暂时遇到了一点小麻烦，请稍后再试。";
  
  return (
    <AppLayout>
      <div className="error-page">
        <div className="error-card">
          <div className="error-title">{status}</div>
          <div className="error-subtitle">{title}</div>
          <div className="error-message">{messageText}</div>
          <Link to="/">
            <Button type="primary" size="large" shape="round" icon={<HomeOutlined />}>
              返回首页
            </Button>
          </Link>
        </div>
        <div className="error-glow" />
      </div>
    </AppLayout>
  );
}

export function NotFoundPage() {
    return (
        <AppLayout>
            <div className="error-page">
              <div className="error-card">
                <div className="error-title">404</div>
                <div className="error-subtitle">页面不存在</div>
                <div className="error-message">抱歉，你访问的页面似乎已经迷失在网络黑洞中。</div>
                <Link to="/">
                  <Button type="primary" size="large" shape="round" icon={<HomeOutlined />}>
                    返回首页
                  </Button>
                </Link>
              </div>
              <div className="error-glow" />
            </div>
        </AppLayout>
      );
}
