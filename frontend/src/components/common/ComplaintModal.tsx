import React from "react";
import { Modal, Form, Input, Button, Upload, message, Typography } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd";
import { API_BASE } from "../../utils";

interface ComplaintModalProps {
  open: boolean;
  onCancel: () => void;
  reportId: string;
}

export const ComplaintModal: React.FC<ComplaintModalProps> = ({ open, onCancel, reportId }) => {
  const [form] = Form.useForm();
  const [files, setFiles] = React.useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [captcha, setCaptcha] = React.useState({ num1: 0, num2: 0, operator: '+' });

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
    if (open) generateCaptcha();
  }, [open, generateCaptcha]);

  const handleSubmit = async () => {
    try {
        const values = await form.validateFields();

        // Captcha validation
        const expected = captcha.operator === '+' 
          ? captcha.num1 + captcha.num2 
          : captcha.num1 - captcha.num2;
        
        if (parseInt(values.captchaAnswer) !== expected) {
            const attempts = parseInt(localStorage.getItem("complaint_attempts") || "0") + 1;
            localStorage.setItem("complaint_attempts", attempts.toString());
            
            if (attempts >= 3) {
                const lockUntil = Date.now() + 60000;
                localStorage.setItem("complaint_lock_until", lockUntil.toString());
                localStorage.setItem("complaint_attempts", "0");
                message.error("验证失败次数过多，请等待 60 秒");
                onCancel();
            } else {
                message.error(`验证错误，剩余尝试次数: ${3 - attempts}`);
                generateCaptcha();
                form.setFieldValue("captchaAnswer", "");
            }
            return;
        }
        localStorage.setItem("complaint_attempts", "0");

        setSubmitting(true);
        const formData = new FormData();
        formData.append("title", values.title);
        formData.append("description", values.description);
        formData.append("contact", values.contact);
        files.forEach((file) => {
            if (file.originFileObj) {
                formData.append("complaintImages", file.originFileObj);
            }
        });

        const res = await fetch(`${API_BASE}/reports/${reportId}/complaints`, {
            method: "POST",
            body: formData
        });

        if (res.ok) {
            message.success("投诉已提交，我们会尽快处理");
            form.resetFields();
            setFiles([]);
            onCancel();
        } else {
            const data = await res.json();
            message.error(data.message || "提交失败");
        }
    } catch (e) {
        // ignore
    } finally {
        setSubmitting(false);
    }
  };

  return (
    <Modal
      title="投诉曝光"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            请填写投诉原因，我们将对该曝光进行复核。
        </Typography.Text>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="title" label="投诉标题" rules={[{ required: true, max: 30, message: "必填，最多30字" }]}>
                <Input placeholder="例如：内容不实、恶意诽谤" />
            </Form.Item>
            <Form.Item name="description" label="投诉说明" rules={[{ required: true, max: 1000, message: "必填，最多1000字" }]}>
                <Input.TextArea rows={4} showCount maxLength={1000} placeholder="请详细描述..." />
            </Form.Item>
            <Form.Item name="contact" label="您的联系方式" rules={[{ required: true, message: "必填，方便我们联系您" }]}>
                <Input placeholder="QQ / 邮箱 / 手机号" />
            </Form.Item>
            <Form.Item label="证据截图（可选）">
                <Upload
                    listType="picture-card"
                    fileList={files}
                    beforeUpload={(file) => {
                        const isImage = file.type.startsWith("image/");
                        const isLt5M = file.size / 1024 / 1024 < 5;
                        if (!isImage) message.error("仅支持图片");
                        if (!isLt5M) message.error("图片不能超过5MB");
                        return false;
                    }}
                    onChange={({ fileList }) => setFiles(fileList.slice(0, 3))}
                >
                    {files.length >= 3 ? null : <div><UploadOutlined /><div style={{marginTop: 8}}>上传</div></div>}
                </Upload>
            </Form.Item>
            <Form.Item 
                name="captchaAnswer" 
                label={`人机验证: ${captcha.num1} ${captcha.operator} ${captcha.num2} = ?`} 
                rules={[{ required: true, message: "请输入计算结果" }]}
            >
                <div style={{ display: 'flex', gap: 8 }}>
                    <Input placeholder="结果" type="number" style={{ width: 100 }} />
                    <Button onClick={generateCaptcha}>刷新</Button>
                </div>
            </Form.Item>
            <div style={{ textAlign: 'right' }}>
                <Button onClick={onCancel} style={{ marginRight: 8 }}>取消</Button>
                <Button type="primary" htmlType="submit" loading={submitting}>提交投诉</Button>
            </div>
        </Form>
    </Modal>
  );
};
