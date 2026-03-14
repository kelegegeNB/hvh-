
import React from "react";
import { Typography, Card, Divider, Button } from "antd";
import { AppLayout } from "../../components/layout/AppLayout";

export function DisclaimerPage() {
    return (
        <AppLayout>
            <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 20px" }}>
                <Typography.Title level={2} style={{ textAlign: "center", marginBottom: 30 }}>免责声明</Typography.Title>
                <Card className="card-animate legal-card" bordered={false} style={{ padding: 24 }}>
                    <div className="rich-content">
                        <Typography.Paragraph strong style={{ fontSize: 16, lineHeight: 1.8 }}>
                            "奇源情报局仅对存在公共争议的信息进行存档与索引，目的在于促进信息透明与事实核查。本平台从未、亦不会鼓励、组织或资助任何恶意悬赏、人肉搜索、网络暴力、骚扰、恐吓、诽谤、挂人或其他违法活动。任何用户不得以本平台名义实施上述行为，否则由此产生的全部法律责任由行为人自行承担，与本平台无关。"
                        </Typography.Paragraph>
                        
                        <Divider />
                        
                        <Typography.Title level={4}>一、信息真实性声明</Typography.Title>
                        <Typography.Paragraph>
                            平台所有内容均由用户自行发布，平台仅提供信息存储空间服务。平台不保证信息的准确性、完整性或有效性，用户应自行判断并承担使用信息可能产生的风险。
                        </Typography.Paragraph>

                        <Typography.Title level={4}>二、合规义务</Typography.Title>
                        <Typography.Paragraph>
                            用户在使用本平台服务时，必须遵守中华人民共和国相关法律法规。对于违法违规内容，平台有权在不通知的情况下进行删除、屏蔽或移交司法机关处理。
                        </Typography.Paragraph>

                        <Typography.Title level={4}>三、版权声明</Typography.Title>
                        <Typography.Paragraph>
                            平台尊重知识产权。如果您认为平台内容侵犯了您的权益，请通过官方渠道提交权利证明，我们将依法处理。
                        </Typography.Paragraph>

                        <div style={{ marginTop: 40, textAlign: 'center' }}>
                            <Button type="primary" href="/">返回首页</Button>
                        </div>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
