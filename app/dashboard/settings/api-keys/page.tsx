"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Key, Trash2, RefreshCw, Plus, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ApiKey {
  id: string;
  name: string;
  permissions: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const AVAILABLE_PERMISSIONS = [
  { id: "read:all", label: "읽기 전체", description: "모든 리소스 읽기" },
  { id: "write:all", label: "쓰기 전체", description: "모든 리소스 쓰기" },
  { id: "delete:all", label: "삭제 전체", description: "모든 리소스 삭제" },
  { id: "admin", label: "관리자", description: "모든 권한" },
];

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showCreatedKey, setShowCreatedKey] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/dev/api-keys");
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.apiKeys || []);
      }
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
      toast.error("API 키 목록을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newKeyName.trim()) {
      toast.error("API 키 이름을 입력하세요");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/dev/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newKeyName,
          permissions: newKeyPermissions,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedKey(data.key);
        setShowCreatedKey(true);
        toast.success("API 키가 생성되었습니다");
        setNewKeyName("");
        setNewKeyPermissions([]);
        fetchApiKeys();
      } else {
        const error = await response.json();
        toast.error(error.error || "API 키 생성에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to create API key:", error);
      toast.error("API 키 생성에 실패했습니다");
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (text: string, label: string = "API 키") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label}가 클립보드에 복사되었습니다`);
    } catch (error) {
      toast.error("복사에 실패했습니다");
    }
  };

  const rotateApiKey = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/dev/api-keys/${id}/rotate`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedKey(data.key);
        setShowCreatedKey(true);
        toast.success(`${name} 키가 재생성되었습니다`);
        fetchApiKeys();
      } else {
        const error = await response.json();
        toast.error(error.error || "키 재생성에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to rotate API key:", error);
      toast.error("키 재생성에 실패했습니다");
    }
  };

  const deleteApiKey = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/dev/api-keys/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(`${name} 키가 삭제되었습니다`);
        fetchApiKeys();
      } else {
        const error = await response.json();
        toast.error(error.error || "키 삭제에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to delete API key:", error);
      toast.error("키 삭제에 실패했습니다");
    }
  };

  const togglePermission = (permissionId: string) => {
    setNewKeyPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "사용 안 됨";
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (apiKey: ApiKey) => {
    if (!apiKey.isActive) {
      return <Badge variant="destructive">비활성</Badge>;
    }
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return <Badge variant="destructive">만료됨</Badge>;
    }
    return <Badge variant="default">활성</Badge>;
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API 키 관리</h1>
          <p className="text-gray-600">API 키를 생성하고 관리하세요</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              새 API 키
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>새 API 키 생성</DialogTitle>
              <DialogDescription>
                API 키는 생성 시 한 번만 표시됩니다. 안전한 곳에 보관하세요.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createApiKey}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">API 키 이름 *</Label>
                  <Input
                    id="name"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="예: Production API Key"
                    required
                  />
                </div>
                <div>
                  <Label className="mb-3 block">권한</Label>
                  <div className="space-y-3">
                    {AVAILABLE_PERMISSIONS.map((permission) => (
                      <div key={permission.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={permission.id}
                          checked={newKeyPermissions.includes(permission.id)}
                          onCheckedChange={() => togglePermission(permission.id)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={permission.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {permission.label}
                          </label>
                          <p className="text-sm text-muted-foreground">
                            {permission.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating ? "생성 중..." : "API 키 생성"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Created Key Display Dialog */}
      <Dialog open={showCreatedKey} onOpenChange={setShowCreatedKey}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
              API 키가 생성되었습니다
            </DialogTitle>
            <DialogDescription>
              아래 API 키를 안전한 곳에 복사하세요. 이 키는 다시 표시되지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded-lg border-2 border-yellow-400">
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono break-all">{createdKey}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(createdKey || "", "API 키")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>중요:</strong> 이 API 키는 다시 표시되지 않습니다. 지금 복사하여 안전하게 보관하세요.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCreatedKey(false)}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {apiKeys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">API 키가 없습니다</h3>
            <p className="text-gray-600 mb-4">새로운 API 키를 생성하여 시작하세요</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Key className="h-5 w-5" />
                      <span>{apiKey.name}</span>
                    </CardTitle>
                    <CardDescription>
                      생성: {formatDate(apiKey.createdAt)}
                    </CardDescription>
                  </div>
                  {getStatusBadge(apiKey)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">마지막 사용</p>
                      <p className="font-medium">{formatDate(apiKey.lastUsedAt)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">만료일</p>
                      <p className="font-medium">
                        {apiKey.expiresAt ? formatDate(apiKey.expiresAt) : "없음"}
                      </p>
                    </div>
                  </div>

                  {apiKey.permissions.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">권한</p>
                      <div className="flex flex-wrap gap-2">
                        {apiKey.permissions.map((permission) => (
                          <Badge key={permission} variant="outline">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-2 border-t">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          키 재생성
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>API 키 재생성</AlertDialogTitle>
                          <AlertDialogDescription>
                            {apiKey.name} 키를 재생성하시겠습니까? 기존 키는 즉시 무효화되며, 새 키가 생성됩니다.
                            이 작업은 되돌릴 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction onClick={() => rotateApiKey(apiKey.id, apiKey.name)}>
                            재생성
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-2 h-4 w-4" />
                          삭제
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>API 키 삭제</AlertDialogTitle>
                          <AlertDialogDescription>
                            {apiKey.name} 키를 정말 삭제하시겠습니까? 이 키를 사용하는 모든 요청이 즉시 실패합니다.
                            이 작업은 되돌릴 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteApiKey(apiKey.id, apiKey.name)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
