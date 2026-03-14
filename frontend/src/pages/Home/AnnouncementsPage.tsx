import React from "react";
import { Typography, List, Card, Space, Empty, Divider } from "antd";
import { AppLayout } from "../../components/layout/AppLayout";
import { API_BASE, formatDate } from "../../utils";
import { AnnouncementItem } from "../../types";

export function AnnouncementsPage() {
  const [items, setItems] = React.useState<AnnouncementItem[]>([]);
  React.useEffect(() => {
    fetch(`${API_BASE}/announcements`)
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => {});
  }, []);
  
  return (
    <AppLayout>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <Typography.Title level={3}>网站更新公告</Typography.Title>
          <List
            dataSource={items}
            locale={{ emptyText: <Empty description="暂无公告" /> }}
            renderItem={(item) => (
              <Card className="card-animate announce-card" style={{ marginBottom: 16 }} bordered={false}>
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {item.title}
                  </Typography.Title>
                  <Typography.Text type="secondary">{formatDate(item.createdAt)}</Typography.Text>
                  <Divider style={{ margin: "12px 0" }} />
                  <div
                    className="rich-content"
                    dangerouslySetInnerHTML={{ __html: item.content }}
                  />
                </Space>
              </Card>
            )}
          />
      </div>
    </AppLayout>
  );
}
