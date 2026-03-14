import React from "react";
import { Form, Input, Select, Upload, Button, message, Card, Typography, Checkbox } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd";
import { AppLayout } from "../../components/layout/AppLayout";
import { API_BASE, platformOptions } from "../../utils";

export function PublishPage() {
  const [form] = Form.useForm();
  const [fileList, setFileList] = React.useState<UploadFile[]>([]);
  const [platformValues, setPlatformValues] = React.useState<any[]>(platformOptions);

  React.useEffect(() => {
    fetch(`${API_BASE}/platforms`)
        .then(r => r.json())
        .then(data => {
            if (data.items && data.items.length > 0) {
                setPlatformValues(data.items.map((p: any) => ({
                    label: p.name,
                    value: p.name,
                    icon: p.icon
                })));
            }
        })
        .catch(() => {});
  }, []);

  const [submitting, setSubmitting] = React.useState(false);

  const [captcha, setCaptcha] = React.useState({ num1: 0, num2: 0, operator: '+' });

  const generateCaptcha = React.useCallback(() => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
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

  const onSubmit = async () => {
    try {
        const values = await form.validateFields();
        
        // Captcha validation
        const expected = captcha.operator === '+' 
          ? captcha.num1 + captcha.num2 
          : captcha.num1 - captcha.num2;
        
        if (parseInt(values.captchaAnswer) !== expected) {
          message.error("人机验证错误，请重试");
          generateCaptcha();
          form.setFieldValue("captchaAnswer", "");
          return;
        }

        if (!values.agreement) {
            message.error("请阅读并同意免责声明");
            return;
        }

        setSubmitting(true);
        const platforms = Array.isArray(values.platform) ? values.platform : [values.platform].filter(Boolean);
        const formData = new FormData();
        formData.append("title", values.title);
        formData.append("content", values.content);
        formData.append("publisher", values.publisher);
        formData.append("targetName", values.targetName);
        if (values.targetId) {
        formData.append("targetId", values.targetId);
        }
        formData.append("platform", platforms.join(","));
        fileList.forEach((file) => {
        if (file.originFileObj) {
            formData.append("images", file.originFileObj);
        }
        });
        const res = await fetch(`${API_BASE}/reports`, {
        method: "POST",
        body: formData
        });
        if (res.ok) {
        message.success("提交成功，请耐心等待审核");
        form.resetFields();
        setFileList([]);
        } else {
        const data = await res.json().catch(() => null);
        console.error("Submit error response:", data);
        if (data?.message === "rate_limited") {
            message.error("提交太频繁，请稍后再试");
        } else if (data?.message === "invalid_payload") {
             message.error("表单数据格式有误，请检查");
        } else {
            message.error(`提交失败: ${data?.message ?? "未知错误"} ${data?.error ? "(" + data.error + ")" : ""}`);
        }
        }
    } catch (e) {
        // validation failed
    } finally {
        setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Typography.Title level={3} style={{ marginBottom: 24 }}>发布曝光</Typography.Title>
        <Card className="card-animate form-panel">
            <div style={{ background: 'rgba(255, 77, 79, 0.1)', border: '1px solid #ff4d4f', borderRadius: 8, padding: 16, marginBottom: 24 }}>
                <Typography.Paragraph type="danger" strong style={{ marginBottom: 0 }}>
                    奇源情报局仅对存在公共争议的信息进行存档与索引，目的在于促进信息透明与事实核查。本平台从未、亦不会鼓励、组织或资助任何恶意悬赏、人肉搜索、网络暴力、骚扰、恐吓、诽谤、挂人或其他违法活动。任何用户不得以本平台名义实施上述行为，否则由此产生的全部法律责任由行为人自行承担，与本平台无关。
                </Typography.Paragraph>
            </div>

            <Form form={form} layout="vertical" requiredMark="optional">
            <Form.Item name="title" label="标题" rules={[{ required: true, min: 2, message: "请输入标题" }]}>
                <Input placeholder="简要描述曝光事件" />
            </Form.Item>
            <Form.Item name="content" label="详细内容" rules={[{ required: true, min: 10, message: "请详细描述经过，至少10个字" }]}>
                <Input.TextArea rows={6} placeholder="请详细描述事情经过、时间、地点等信息..." />
            </Form.Item>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item name="publisher" label="您的昵称" rules={[{ required: true, min: 2 }]}>
                    <Input placeholder="如何称呼您" />
                </Form.Item>
                <Form.Item name="targetName" label="被曝光人昵称" rules={[{ required: true, min: 2 }]}>
                    <Input placeholder="对方的游戏ID或昵称" />
                </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item name="targetId" label="被曝光人 ID (可选)">
                    <Input placeholder="Steam ID / QQ号 / Discord ID" />
                </Form.Item>
                <Form.Item name="platform" label="涉及平台" rules={[{ required: true, message: "请选择平台" }]}>
                    <Select
                    mode="multiple"
                    allowClear
                    placeholder="选择平台"
                    maxTagCount="responsive"
                    options={platformValues}
                    />
                </Form.Item>
            </div>

            <Form.Item label="证据截图（最多3张，单张≤5MB）">
                <Upload
                listType="picture-card"
                fileList={fileList}
                beforeUpload={(file) => {
                    const isImage = file.type.startsWith("image/");
                    if (!isImage) {
                    message.error("仅支持图片文件");
                    return Upload.LIST_IGNORE;
                    }
                    const isLt5m = file.size / 1024 / 1024 <= 5;
                    if (!isLt5m) {
                    message.error("图片不能超过5MB");
                    return Upload.LIST_IGNORE;
                    }
                    if (fileList.length >= 3) {
                    message.error("最多上传3张");
                    return Upload.LIST_IGNORE;
                    }
                    return false;
                }}
                onChange={({ fileList: next }) => setFileList(next.slice(0, 3))}
                >
                {fileList.length >= 3 ? null : (
                    <div>
                        <UploadOutlined />
                        <div style={{ marginTop: 8 }}>上传</div>
                    </div>
                )}
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

            <Form.Item 
                name="agreement" 
                valuePropName="checked" 
                rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('请勾选同意免责声明')) }]}
            >
                <Checkbox>我已阅读并同意上述免责声明</Checkbox>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Button type="primary" onClick={onSubmit} loading={submitting} size="large">
                    提交审核
                </Button>
            </Form.Item>
            </Form>
        </Card>
      </div>
    </AppLayout>
  );
}
