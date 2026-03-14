
import React from "react";
import { Layout, Card, Form, Input, Button, message, Typography, Row, Col, Alert, Result } from "antd";
import { useSearchParams, Link } from "react-router-dom";
import { AppLayout } from "../../components/layout/AppLayout";
import { API_BASE } from "../../utils";

export function AppealPage() {
    const [form] = Form.useForm();
    const [loading, setLoading] = React.useState(false);
    const [success, setSuccess] = React.useState(false);
    const [captcha, setCaptcha] = React.useState({ q: "3+5", a: 8 }); // Mock captcha logic for frontend

    // Simple random math for captcha
    const refreshCaptcha = () => {
        const a = Math.floor(Math.random() * 9) + 1;
        const b = Math.floor(Math.random() * 9) + 1;
        setCaptcha({ q: `${a}+${b}=?`, a: a + b });
    };

    const [searchParams] = useSearchParams();

    React.useEffect(() => {
        refreshCaptcha();
        // Auto-fill reason from URL if present
        const reason = searchParams.get('reason');
        if (reason) {
            form.setFieldsValue({
                content: `[自动填写] 封禁原因: ${reason}\n\n申诉理由: `
            });
        }
    }, [searchParams]);

    const onFinish = async (values: any) => {
        if (parseInt(values.captchaAnswer) !== captcha.a) {
            message.error("验证码错误");
            refreshCaptcha();
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/appeals`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: values.content,
                    contact: values.contact,
                    captcha: values.captchaAnswer
                })
            });

            if (res.ok) {
                setSuccess(true);
            } else {
                const data = await res.json();
                if (data.message === "rate_limit_exceeded") {
                    message.error("提交过于频繁，请稍后再试");
                } else {
                    message.error("提交失败，请重试");
                }
            }
        } catch(e) {
            message.error("网络错误");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 20px" }}>
                <Card className="form-panel" style={{ background: 'var(--card-bg)' }}>
                    <Typography.Title level={2} style={{ textAlign: "center", marginBottom: 30 }}>账号申诉</Typography.Title>
                    
                    {success ? (
                        <div style={{ padding: "40px 0" }}>
                            <Result
                                status="success"
                                title="申诉已提交"
                                subTitle="您的申诉已成功提交，管理员将在24小时内审核。请留意您的联系方式（邮件/QQ）。"
                                extra={[
                                    <Button type="primary" key="home">
                                        <Link to="/">返回首页</Link>
                                    </Button>
                                ]}
                            />
                        </div>
                    ) : (
                        <Form form={form} layout="vertical" onFinish={onFinish}>
                            <Alert 
                                message="申诉须知" 
                                description="请如实填写申诉理由。如果是误封，请详细说明情况。恶意提交申诉将导致永久封禁。" 
                                type="info" 
                                showIcon 
                                style={{ marginBottom: 24 }}
                            />
                            
                            <Form.Item 
                                name="content" 
                                label="申诉理由 (不少于50字)" 
                                rules={[{ required: true, min: 50, message: '请详细描述情况，不少于50字' }]}
                            >
                                <Input.TextArea rows={6} placeholder="请详细描述您的操作行为、被封禁原因以及申诉理由..." />
                            </Form.Item>

                            <Form.Item 
                                name="contact" 
                                label="联系方式 (QQ或邮箱)" 
                                rules={[{ required: true, message: '请输入联系方式' }]}
                            >
                                <Input placeholder="用于接收申诉结果通知" />
                            </Form.Item>

                            <Form.Item 
                                label="人机验证" 
                                required
                            >
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Input disabled value={captcha.q} style={{ textAlign: 'center', fontWeight: 'bold' }} />
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item 
                                            name="captchaAnswer" 
                                            noStyle
                                            rules={[{ required: true, message: '请输入答案' }]}
                                        >
                                            <Input placeholder="请输入计算结果" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Form.Item>

                            <Form.Item style={{ marginTop: 24 }}>
                                <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                                    提交申诉
                                </Button>
                            </Form.Item>
                        </Form>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
