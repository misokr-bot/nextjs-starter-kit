"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface TwoFactorStatus {
  isEnabled: boolean;
  hasBackupCodes: boolean;
  backupCodesCount: number;
}

interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export default function SecuritySettings() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [token, setToken] = useState("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/2fa/status");
      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
      }
    } catch (error) {
      console.error("Failed to fetch 2FA status:", error);
      toast.error("2FA 상태를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const startSetup = async () => {
    try {
      const response = await fetch("/api/2fa/setup", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setSetup(data.setup);
        setShowBackupCodes(true);
        toast.success("2FA 설정이 시작되었습니다");
      } else {
        const error = await response.json();
        toast.error(error.error || "2FA 설정 시작에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to start 2FA setup:", error);
      toast.error("2FA 설정 시작에 실패했습니다");
    }
  };

  const verifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast.error("인증 코드를 입력해주세요");
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch("/api/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          action: "enable",
        }),
      });

      if (response.ok) {
        toast.success("2FA가 성공적으로 활성화되었습니다");
        setSetup(null);
        setToken("");
        setShowBackupCodes(false);
        fetchStatus();
      } else {
        const error = await response.json();
        toast.error(error.error || "2FA 활성화에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to enable 2FA:", error);
      toast.error("2FA 활성화에 실패했습니다");
    } finally {
      setVerifying(false);
    }
  };

  const disable2FA = async () => {
    if (!confirm("2FA를 비활성화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    try {
      const response = await fetch("/api/2fa/disable", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("2FA가 비활성화되었습니다");
        fetchStatus();
      } else {
        const error = await response.json();
        toast.error(error.error || "2FA 비활성화에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to disable 2FA:", error);
      toast.error("2FA 비활성화에 실패했습니다");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">보안 설정</h1>
        <p className="text-gray-600">계정 보안을 강화하세요</p>
      </div>

      {/* 2FA Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>2단계 인증 (2FA)</span>
            <Badge variant={status?.isEnabled ? "default" : "secondary"}>
              {status?.isEnabled ? "활성화됨" : "비활성화됨"}
            </Badge>
          </CardTitle>
          <CardDescription>
            계정에 추가 보안 계층을 추가하여 무단 접근을 방지합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status?.isEnabled ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  ✅ 2단계 인증이 활성화되어 있습니다. 백업 코드 {status.backupCodesCount}개가 남아있습니다.
                </AlertDescription>
              </Alert>
              <Button variant="destructive" onClick={disable2FA}>
                2FA 비활성화
              </Button>
            </div>
          ) : setup ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">2FA 설정</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label>1. 인증 앱에 QR 코드 스캔</Label>
                    <p className="text-sm text-gray-600 mb-2">
                      Google Authenticator, Authy, 1Password 등의 앱을 사용하여 QR 코드를 스캔하세요
                    </p>
                    {setup.qrCodeUrl && (
                      <div className="flex justify-center p-4 bg-white border rounded">
                        <img src={setup.qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>2. 수동 입력 (선택사항)</Label>
                    <p className="text-sm text-gray-600 mb-2">
                      QR 코드를 스캔할 수 없는 경우 이 시크릿 키를 수동으로 입력하세요
                    </p>
                    <Input
                      value={setup.secret}
                      readOnly
                      className="font-mono text-sm"
                    />
                  </div>

                  <form onSubmit={verifyAndEnable} className="space-y-4">
                    <div>
                      <Label htmlFor="token">3. 인증 코드 입력</Label>
                      <p className="text-sm text-gray-600 mb-2">
                        인증 앱에서 생성된 6자리 코드를 입력하세요
                      </p>
                      <Input
                        id="token"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        className="w-32"
                      />
                    </div>
                    <Button type="submit" disabled={verifying}>
                      {verifying ? "확인 중..." : "2FA 활성화"}
                    </Button>
                  </form>
                </div>
              </div>

              {showBackupCodes && setup.backupCodes && (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      ⚠️ 백업 코드를 안전한 곳에 저장하세요. 각 코드는 한 번만 사용할 수 있습니다.
                    </AlertDescription>
                  </Alert>
                  
                  <div>
                    <Label>백업 코드</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2 p-4 bg-gray-50 rounded">
                      {setup.backupCodes.map((code, index) => (
                        <div key={index} className="font-mono text-sm">
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  🔒 2단계 인증을 활성화하여 계정을 더욱 안전하게 보호하세요
                </AlertDescription>
              </Alert>
              <Button onClick={startSetup}>
                2FA 설정 시작
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle>보안 팁</CardTitle>
          <CardDescription>
            계정 보안을 강화하는 방법들
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>• 강력하고 고유한 비밀번호를 사용하세요</li>
            <li>• 2단계 인증을 활성화하세요</li>
            <li>• 백업 코드를 안전한 곳에 보관하세요</li>
            <li>• 의심스러운 로그인 시도를 주의하세요</li>
            <li>• 정기적으로 비밀번호를 변경하세요</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
