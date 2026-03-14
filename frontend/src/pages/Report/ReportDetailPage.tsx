import React from "react";
import { useParams, Link } from "react-router-dom";
import { Typography, Card, Space, Tag, Divider, Image, Form, Input, Button, List, Empty, Upload, Select, message, Tooltip } from "antd";
import { UploadOutlined, EyeOutlined, WarningOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd";
import { AppLayout } from "../../components/layout/AppLayout";
import { ComplaintModal } from "../../components/common/ComplaintModal";
import { API_BASE, getAvatarUrl, splitPlatforms, formatDate } from "../../utils";
import { ReportItem, CommentItem } from "../../types";

export function ReportDetailPage() {
  const params = useParams();
  const [report, setReport] = React.useState<ReportItem | null>(null);
  const [comments, setComments] = React.useState<CommentItem[]>([]);
  const [commentForm] = Form.useForm();
  const [commentFiles, setCommentFiles] = React.useState<UploadFile[]>([]);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [captcha, setCaptcha] = React.useState({ num1: 0, num2: 0, operator: '+' });
  const [complaintOpen, setComplaintOpen] = React.useState(false);
  
  const generateCaptcha = React.useCallback(() => {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    const operator = Math.random() > 0.5 ? '+' : '-';
    if (operator === '-' && num1 < num2) {
      setCaptcha({ num1: num2, num2: num1, operator });
    } else {
      setCaptcha({ num1, num2, operator });
    }
  }, []);

  React.useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const emojis = ["😀", "😎", "🔥", "✅", "😂", "🥳", "👍", "💯", "🤝", "🎯", "⚡", "🌟"];

  React.useEffect(() => {
    if (!params.id) return;
    fetch(`${API_BASE}/reports/${params.id}`)
      .then((r) => r.json())
      .then((data) => setReport(data))
      .catch(() => {});
    fetch(`${API_BASE}/reports/${params.id}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(data.items ?? []))
      .catch(() => {});
      
    // Record view
    fetch(`${API_BASE}/reports/${params.id}/view`, { method: "POST" }).catch(() => {});
  }, [params.id]);

  const mentionOptions = React.useMemo(() => {
    const items = comments.map((item) => item.username);
    return Array.from(new Set(items));
  }, [comments]);

  const appendToComment = (value: string) => {
    const current = commentForm.getFieldValue("content") ?? "";
    commentForm.setFieldValue("content", `${current}${value}`);
  };

  const submitComment = async () => {
    if (!params.id) return;
    
    // Check lock
    const lockTime = parseInt(localStorage.getItem("comment_lock_until") || "0");
    if (Date.now() < lockTime) {
        const seconds = Math.ceil((lockTime - Date.now()) / 1000);
        message.error(`请等待 ${seconds} 秒后再试`);
        return;
    }

    try {
        const values = await commentForm.validateFields();
        
        // Captcha validation
        const expected = captcha.operator === '+' 
          ? captcha.num1 + captcha.num2 
          : captcha.num1 - captcha.num2;
        
        if (parseInt(values.captchaAnswer) !== expected) {
            const attempts = parseInt(localStorage.getItem("comment_attempts") || "0") + 1;
            localStorage.setItem("comment_attempts", attempts.toString());
            
            if (attempts >= 3) {
                const lockUntil = Date.now() + 60000;
                localStorage.setItem("comment_lock_until", lockUntil.toString());
                localStorage.setItem("comment_attempts", "0");
                message.error("验证失败次数过多，请等待 60 秒");
            } else {
                message.error(`验证错误，剩余尝试次数: ${3 - attempts}`);
                generateCaptcha();
                commentForm.setFieldValue("captchaAnswer", "");
            }
            return;
        }

        // Reset attempts on success
        localStorage.setItem("comment_attempts", "0");

        setSubmitting(true);
        const formData = new FormData();
        formData.append("content", values.content);
        formData.append("username", values.username);
        commentFiles.forEach((file) => {
        if (file.originFileObj) {
            formData.append("images", file.originFileObj);
        }
        });
        const res = await fetch(`${API_BASE}/reports/${params.id}/comments`, {
        method: "POST",
        body: formData
        });
        if (res.ok) {
        const created = await res.json();
        setComments((prev) => [created, ...prev]);
        commentForm.resetFields();
        setCommentFiles([]);
        message.success("评论发表成功");
        } else {
        message.error("评论失败");
        }
    } catch (e) {
        // ignore
    } finally {
        setSubmitting(false);
    }
  };

  const avatarUrl = report ? getAvatarUrl(report) : null;

  return (
    <AppLayout>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {!report ? (
            <Empty description="未找到曝光信息" />
          ) : (
            <>
              <Card className="card-animate" bordered={false}>
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                  <div className="detail-header">
                    <div className="avatar-badge detail-avatar">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={report.targetName} />
                      ) : (
                        report.targetName.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="detail-info">
                      <Typography.Title level={3} style={{ margin: 0 }}>
                        {report.title}
                      </Typography.Title>
                      <Space size={8} wrap style={{ marginTop: 4 }}>
                        {splitPlatforms(report.platform).map((platform) => (
                          <Tag key={platform} color="blue">
                            {platform}
                          </Tag>
                        ))}
                        <Tag color={report.status === "approved" ? "green" : "orange"}>
                          {report.status === "approved" ? "已公示" : "审核中"}
                        </Tag>
                        <Tag icon={<EyeOutlined />} color="default">{report.trafficVolume || 0}</Tag>
                      </Space>
                      <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                        被曝光人：{report.targetName} · 发布于 {formatDate(report.createdAt)}
                        {report.publisherIp && (
                            <span style={{ marginLeft: 8 }}>· 发布者IP: {report.publisherIp}</span>
                        )}
                        <Button type="link" size="small" danger icon={<WarningOutlined />} onClick={() => setComplaintOpen(true)} style={{ marginLeft: 8 }}>
                            投诉/举报
                        </Button>
                      </Typography.Text>
                    </div>
                  </div>
                  
                  <Divider style={{ margin: "12px 0" }} />
                  
                  <div className="report-content">
                    <Typography.Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>
                        {report.content}
                    </Typography.Paragraph>
                  </div>
                  
                  {report.evidences?.length ? (
                    <div>
                        <Typography.Title level={5}>证据截图</Typography.Title>
                        <Space wrap size={16}>
                        {report.evidences.map((img) => (
                            <Image key={img.id} width={200} src={img.url} style={{ borderRadius: 8, objectFit: 'cover' }} />
                        ))}
                        </Space>
                    </div>
                  ) : null}
                </Space>
              </Card>
              <ComplaintModal 
                open={complaintOpen} 
                onCancel={() => setComplaintOpen(false)} 
                reportId={report.id} 
              />

              <Card className="card-animate form-panel comment-panel" style={{ marginTop: 24 }} bordered={false}>
                <Typography.Title level={4}>评论 ({comments.length})</Typography.Title>
                <Form form={commentForm} layout="vertical">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                    <Form.Item name="username" label="昵称" rules={[{ required: true, min: 2, message: '请输入昵称' }]}>
                        <Input placeholder="请输入您的昵称" />
                    </Form.Item>
                    <Form.Item name="content" label="评论内容" rules={[{ required: true, min: 2, message: '请输入内容' }]}>
                        <Input.TextArea rows={4} showCount maxLength={300} placeholder="理性发言，文明交流..." />
                    </Form.Item>
                  </div>
                  
                  <Space className="comment-toolbar" wrap style={{ marginBottom: 16 }}>
                    <Button size="small" onClick={() => setEmojiOpen((prev) => !prev)}>😊 表情</Button>
                    <Select
                      placeholder="@提及用户"
                      options={mentionOptions.map((name) => ({ value: name, label: `@${name}` }))}
                      onChange={(value) => appendToComment(`@${value} `)}
                      style={{ width: 140 }}
                      allowClear
                      showSearch
                      size="small"
                    />
                  </Space>
                  
                  {emojiOpen ? (
                    <div className="emoji-panel" style={{ marginBottom: 16 }}>
                      {emojis.map((emoji) => (
                        <button key={emoji} type="button" onClick={() => appendToComment(emoji)}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  
                  <Form.Item label="图片附件（可选）">
                    <Upload
                      listType="picture-card"
                      fileList={commentFiles}
                      beforeUpload={(file) => {
                        const isImage = file.type.startsWith("image/");
                        if (!isImage) {
                          message.error("仅支持图片");
                          return Upload.LIST_IGNORE;
                        }
                        return false;
                      }}
                      onChange={({ fileList: next }) => setCommentFiles(next.slice(0, 3))}
                    >
                      {commentFiles.length >= 3 ? null : <div><UploadOutlined /><div style={{marginTop: 8}}>上传</div></div>}
                    </Upload>
                  </Form.Item>

                  <Form.Item 
                      name="captchaAnswer" 
                      label={`人机验证: ${captcha.num1} ${captcha.operator} ${captcha.num2} = ?`} 
                      rules={[{ required: true, message: "请输入计算结果" }]}
                      style={{ maxWidth: 200 }}
                  >
                      <Input placeholder="请输入结果" type="number" />
                  </Form.Item>
                  
                  <Button type="primary" onClick={submitComment} loading={submitting}>
                    发表评论
                  </Button>
                </Form>
                
                <Divider />
                
                <List
                  dataSource={comments}
                  locale={{ emptyText: "暂无评论，快来抢沙发吧" }}
                  itemLayout="vertical"
                  renderItem={(item) => (
                    <List.Item key={item.id} style={{ padding: '16px 0' }}>
                      <List.Item.Meta
                        avatar={<div className="avatar-badge" style={{ width: 32, height: 32, fontSize: 14 }}>{item.username.slice(0, 1).toUpperCase()}</div>}
                        title={
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 'bold' }}>{item.username}</span>
                                <span style={{ fontSize: 12, opacity: 0.6 }}>{formatDate(item.createdAt)}</span>
                            </div>
                        }
                        description={
                          <div style={{ marginTop: 8 }}>
                            <div className="comment-content" style={{ fontSize: 14, color: 'inherit', lineHeight: 1.6 }}>{item.content}</div>
                            {item.attachments?.length ? (
                              <Space wrap style={{ marginTop: 8 }}>
                                {item.attachments.map((img) => (
                                  <Image key={img.id} width={100} src={img.url} style={{ borderRadius: 4 }} />
                                ))}
                              </Space>
                            ) : null}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </>
          )}
      </div>
    </AppLayout>
  );
}
