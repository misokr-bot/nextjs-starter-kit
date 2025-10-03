import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

export interface WelcomeEmailData {
  name: string;
  email: string;
}

export interface PaymentFailedEmailData {
  name: string;
  email: string;
  amount: number;
  currency: string;
  retryUrl: string;
}

export interface SubscriptionRenewalEmailData {
  name: string;
  email: string;
  planName: string;
  amount: number;
  currency: string;
  nextBillingDate: string;
}

export interface SecurityAlertEmailData {
  name: string;
  email: string;
  action: string;
  timestamp: string;
  ipAddress?: string;
}

export async function sendEmail(template: EmailTemplate) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@yourdomain.com",
      to: template.to,
      subject: template.subject,
      html: template.html,
    });

    if (error) {
      console.error("Failed to send email:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log("Email sent successfully:", data);
    return data;
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
}

export async function sendWelcomeEmail(data: WelcomeEmailData) {
  const template: EmailTemplate = {
    to: data.email,
    subject: "환영합니다! 계정이 성공적으로 생성되었습니다",
    html: generateWelcomeEmailHtml(data),
  };

  return await sendEmail(template);
}

export async function sendPaymentFailedEmail(data: PaymentFailedEmailData) {
  const template: EmailTemplate = {
    to: data.email,
    subject: "결제 실패 알림 - 즉시 조치가 필요합니다",
    html: generatePaymentFailedEmailHtml(data),
  };

  return await sendEmail(template);
}

export async function sendSubscriptionRenewalEmail(data: SubscriptionRenewalEmailData) {
  const template: EmailTemplate = {
    to: data.email,
    subject: "구독 갱신 알림",
    html: generateSubscriptionRenewalEmailHtml(data),
  };

  return await sendEmail(template);
}

export async function sendSecurityAlertEmail(data: SecurityAlertEmailData) {
  const template: EmailTemplate = {
    to: data.email,
    subject: "보안 알림 - 계정 활동 감지",
    html: generateSecurityAlertEmailHtml(data),
  };

  return await sendEmail(template);
}

function generateWelcomeEmailHtml(data: WelcomeEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>환영합니다!</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 환영합니다!</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">안녕하세요, ${data.name}님!</h2>
        
        <p>계정이 성공적으로 생성되었습니다. 이제 모든 기능을 사용하실 수 있습니다.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h3 style="margin-top: 0; color: #667eea;">다음 단계:</h3>
          <ul>
            <li>프로필을 완성해주세요</li>
            <li>구독 플랜을 선택해주세요</li>
            <li>대시보드에서 서비스를 시작해보세요</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
             style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            대시보드로 이동
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          문의사항이 있으시면 언제든지 고객지원팀에 연락해주세요.
        </p>
      </div>
    </body>
    </html>
  `;
}

function generatePaymentFailedEmailHtml(data: PaymentFailedEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>결제 실패 알림</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ 결제 실패</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">안녕하세요, ${data.name}님!</h2>
        
        <p>죄송합니다. 구독 결제 처리 중 문제가 발생했습니다.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff6b6b;">
          <h3 style="margin-top: 0; color: #ff6b6b;">결제 정보:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>금액:</strong> ${data.currency} ${data.amount}</li>
            <li><strong>상태:</strong> 결제 실패</li>
            <li><strong>시간:</strong> ${new Date().toLocaleString('ko-KR')}</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.retryUrl}" 
             style="background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            결제 다시 시도
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          결제 문제가 지속되면 고객지원팀에 연락해주세요.
        </p>
      </div>
    </body>
    </html>
  `;
}

function generateSubscriptionRenewalEmailHtml(data: SubscriptionRenewalEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>구독 갱신 알림</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">💳 구독 갱신</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">안녕하세요, ${data.name}님!</h2>
        
        <p>구독이 성공적으로 갱신되었습니다.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h3 style="margin-top: 0; color: #667eea;">구독 정보:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>플랜:</strong> ${data.planName}</li>
            <li><strong>금액:</strong> ${data.currency} ${data.amount}</li>
            <li><strong>다음 결제일:</strong> ${data.nextBillingDate}</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
             style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            대시보드로 이동
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          구독 관리나 문의사항이 있으시면 고객지원팀에 연락해주세요.
        </p>
      </div>
    </body>
    </html>
  `;
}

function generateSecurityAlertEmailHtml(data: SecurityAlertEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>보안 알림</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔒 보안 알림</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">안녕하세요, ${data.name}님!</h2>
        
        <p>계정에서 새로운 활동이 감지되었습니다.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff6b6b;">
          <h3 style="margin-top: 0; color: #ff6b6b;">활동 정보:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>활동:</strong> ${data.action}</li>
            <li><strong>시간:</strong> ${data.timestamp}</li>
            ${data.ipAddress ? `<li><strong>IP 주소:</strong> ${data.ipAddress}</li>` : ''}
          </ul>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeaa7;">
          <p style="margin: 0; color: #856404;"><strong>주의:</strong> 본인이 수행한 활동이 아니라면 즉시 비밀번호를 변경하고 고객지원팀에 연락해주세요.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings" 
             style="background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            보안 설정 확인
          </a>
        </div>
      </div>
    </body>
    </html>
  `;
}
