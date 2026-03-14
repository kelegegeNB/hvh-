import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ConfigProvider, theme as antTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

import { HomePage } from "./pages/Home/HomePage";
import { HotPage } from "./pages/Hot/HotPage";
import { PublishPage } from "./pages/Publish/PublishPage";
import { ReportDetailPage } from "./pages/Report/ReportDetailPage";
import { AnnouncementsPage } from "./pages/Home/AnnouncementsPage";
import { AdminPage } from "./pages/Admin/AdminPage";
import { AppealPage } from "./pages/Appeal/AppealPage";
import { ViolatorPage } from "./pages/Violator/ViolatorPage";
import { PrivacyPage, TermsPage, ContactPage } from "./pages/Legal/LegalPages";
import { DisclaimerPage } from "./pages/Legal/DisclaimerPage";
import { ErrorPage, NotFoundPage } from "./pages/ErrorPage";

import "./styles.css";

// Global Fetch Interceptor
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    // If we are on the appeal page, suppress global 403 handling for background requests
    // The appeal page logic itself will handle critical errors if needed.
    const isAppealPage = window.location.pathname.startsWith('/appeal');

    try {
        const response = await originalFetch(...args);
        if (response.status === 403) {
            // Check if it's an IP ban
            try {
                const clone = response.clone();
                const data = await clone.json();
                if (data.message === "ip_banned" && !isAppealPage) {
                    // Dispatch event only if NOT on appeal page
                    window.dispatchEvent(new CustomEvent('ip-banned', { 
                        detail: {
                            message: data.message,
                            detail: data.detail,
                            reason: data.reason,
                            endAt: data.endAt
                        }
                    }));
                }
            } catch (e) {
                // Not JSON or other error, ignore
            }
        }
        return response;
    } catch (error) {
        throw error;
    }
};

const router = createBrowserRouter([
  { path: "/", element: <HomePage />, errorElement: <ErrorPage /> },
  { path: "/hot", element: <HotPage />, errorElement: <ErrorPage /> },
  { path: "/publish", element: <PublishPage />, errorElement: <ErrorPage /> },
  { path: "/reports/:id", element: <ReportDetailPage />, errorElement: <ErrorPage /> },
  { path: "/announcements", element: <AnnouncementsPage />, errorElement: <ErrorPage /> },
  { path: "/appeal", element: <AppealPage />, errorElement: <ErrorPage /> },
  { path: "/violators", element: <ViolatorPage />, errorElement: <ErrorPage /> },
  { path: "/privacy", element: <PrivacyPage />, errorElement: <ErrorPage /> },
  { path: "/terms", element: <TermsPage />, errorElement: <ErrorPage /> },
  { path: "/contact", element: <ContactPage />, errorElement: <ErrorPage /> },
  { path: "/disclaimer", element: <DisclaimerPage />, errorElement: <ErrorPage /> },
  { path: "/admin", element: <AdminPage />, errorElement: <ErrorPage /> },
  { path: "*", element: <NotFoundPage /> }
]);

function App() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#648cff',
          colorBgBase: isDark ? '#0a1024' : '#f0f2f5',
          colorBgContainer: isDark ? '#141a30' : '#ffffff',
          colorText: isDark ? '#e6edf5' : '#1f1f1f',
          fontFamily: '"Inter", "PingFang SC", "Microsoft YaHei", sans-serif',
          borderRadius: 8,
          wireframe: false,
        },
        components: {
            Button: {
                borderRadius: 8,
                controlHeight: 36,
            },
            Card: {
                colorBgContainer: 'transparent', // We handle card bg in CSS for glassmorphism
                borderRadiusLG: 16,
            },
            Input: {
                colorBgContainer: 'transparent',
                activeBorderColor: '#648cff',
            },
            Select: {
                colorBgContainer: 'transparent',
            },
            Table: {
                colorBgContainer: 'transparent',
                headerBg: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
            },
            Modal: {
                contentBg: isDark ? '#141a30' : '#ffffff',
                headerBg: isDark ? '#141a30' : '#ffffff',
            }
        }
      }}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
