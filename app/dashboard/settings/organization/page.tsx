"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, X, Mail } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  website?: string;
  members: {
    id: string;
    userId: string;
    role: string;
    isActive: boolean;
    joinedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
  }[];
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

export default function OrganizationSettings() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Record<string, PendingInvite[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // New organization form
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [newOrgDescription, setNewOrgDescription] = useState("");
  const [newOrgWebsite, setNewOrgWebsite] = useState("");

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch("/api/organizations");
      if (response.ok) {
        const data = await response.json();
        const orgs = data.organizations;
        setOrganizations(orgs);

        // Fetch pending invites for each organization
        for (const org of orgs) {
          fetchPendingInvites(org.id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
      toast.error("조직 목록을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvites = async (organizationId: string) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/invites`);
      if (response.ok) {
        const data = await response.json();
        setPendingInvites(prev => ({
          ...prev,
          [organizationId]: data.invites || []
        }));
      }
    } catch (error) {
      console.error("Failed to fetch pending invites:", error);
    }
  };

  const createOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newOrgName || !newOrgSlug) {
      toast.error("이름과 슬러그는 필수입니다");
      return;
    }

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newOrgName,
          slug: newOrgSlug,
          description: newOrgDescription,
          website: newOrgWebsite,
        }),
      });

      if (response.ok) {
        toast.success("조직이 성공적으로 생성되었습니다");
        setNewOrgName("");
        setNewOrgSlug("");
        setNewOrgDescription("");
        setNewOrgWebsite("");
        fetchOrganizations();
      } else {
        const error = await response.json();
        toast.error(error.error || "조직 생성에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to create organization:", error);
      toast.error("조직 생성에 실패했습니다");
    }
  };

  const inviteMember = async (organizationId: string, e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteEmail) {
      toast.error("이메일은 필수입니다");
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${organizationId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (response.ok) {
        toast.success("초대가 성공적으로 전송되었습니다");
        setInviteEmail("");
        setInviteRole("member");
        fetchPendingInvites(organizationId);
        fetchOrganizations();
      } else {
        const error = await response.json();
        toast.error(error.error || "초대 전송에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to invite member:", error);
      toast.error("초대 전송에 실패했습니다");
    }
  };

  const changeMemberRole = async (organizationId: string, memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        toast.success("멤버 역할이 변경되었습니다");
        fetchOrganizations();
      } else {
        const error = await response.json();
        toast.error(error.error || "역할 변경에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to change member role:", error);
      toast.error("역할 변경에 실패했습니다");
    }
  };

  const removeMember = async (organizationId: string, memberId: string, memberName: string) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(`${memberName} 님이 조직에서 제거되었습니다`);
        fetchOrganizations();
      } else {
        const error = await response.json();
        toast.error(error.error || "멤버 제거에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error("멤버 제거에 실패했습니다");
    }
  };

  const cancelInvite = async (organizationId: string, inviteId: string) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/invites/${inviteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("초대가 취소되었습니다");
        fetchPendingInvites(organizationId);
      } else {
        const error = await response.json();
        toast.error(error.error || "초대 취소에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to cancel invite:", error);
      toast.error("초대 취소에 실패했습니다");
    }
  };

  const deleteOrganization = async (organizationId: string, organizationName: string) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(`${organizationName} 조직이 삭제되었습니다`);
        fetchOrganizations();
      } else {
        const error = await response.json();
        toast.error(error.error || "조직 삭제에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to delete organization:", error);
      toast.error("조직 삭제에 실패했습니다");
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "destructive";
      case "admin":
        return "default";
      case "member":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner":
        return "소유자";
      case "admin":
        return "관리자";
      case "member":
        return "멤버";
      default:
        return role;
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
        <h1 className="text-3xl font-bold text-gray-900">조직 관리</h1>
        <p className="text-gray-600">조직을 생성하고 멤버를 관리하세요</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="create">조직 생성</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {organizations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <h3 className="text-lg font-semibold mb-2">조직이 없습니다</h3>
                <p className="text-gray-600 mb-4">새로운 조직을 생성하거나 초대를 받아보세요</p>
                <Button onClick={() => setActiveTab("create")}>
                  조직 생성하기
                </Button>
              </CardContent>
            </Card>
          ) : (
            organizations.map((org) => (
              <Card key={org.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{org.name}</CardTitle>
                      <CardDescription>
                        {org.description || "설명이 없습니다"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{org.slug}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">멤버 ({org.members.length}명)</h4>
                      <div className="space-y-2">
                        {org.members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                {member.user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium">{member.user.name}</div>
                                <div className="text-sm text-gray-500">{member.user.email}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Select
                                value={member.role}
                                onValueChange={(newRole) => changeMemberRole(org.id, member.id, newRole)}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="owner">소유자</SelectItem>
                                  <SelectItem value="admin">관리자</SelectItem>
                                  <SelectItem value="member">멤버</SelectItem>
                                </SelectContent>
                              </Select>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>멤버 제거 확인</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {member.user.name} 님을 조직에서 제거하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>취소</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => removeMember(org.id, member.id, member.user.name)}
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      제거
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pending Invitations */}
                    {pendingInvites[org.id]?.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-2 flex items-center">
                          <Mail className="mr-2 h-4 w-4" />
                          대기 중인 초대 ({pendingInvites[org.id].length}개)
                        </h4>
                        <div className="space-y-2">
                          {pendingInvites[org.id].map((invite) => (
                            <div key={invite.id} className="flex items-center justify-between p-2 border rounded bg-gray-50">
                              <div>
                                <div className="font-medium text-sm">{invite.email}</div>
                                <div className="text-xs text-gray-500">
                                  {getRoleLabel(invite.role)} • 만료: {new Date(invite.expiresAt).toLocaleDateString()}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelInvite(org.id, invite.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2">멤버 초대</h4>
                      <form onSubmit={(e) => inviteMember(org.id, e)} className="flex space-x-2">
                        <Input
                          type="email"
                          placeholder="이메일 주소"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="flex-1"
                        />
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                          className="px-3 py-2 border rounded-md"
                        >
                          <option value="member">멤버</option>
                          <option value="admin">관리자</option>
                        </select>
                        <Button type="submit">초대</Button>
                      </form>
                    </div>

                    {/* Danger Zone - Delete Organization */}
                    {org.members.find(m => m.role === "owner") && (
                      <div className="border-t pt-4 mt-4">
                        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                          <h4 className="font-semibold text-red-700 mb-2">위험 영역</h4>
                          <p className="text-sm text-gray-600 mb-3">
                            조직을 삭제하면 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                          </p>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="mr-2 h-4 w-4" />
                                조직 삭제
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>조직 삭제 확인</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <strong>{org.name}</strong> 조직을 정말 삭제하시겠습니까?
                                  <br />
                                  <br />
                                  이 작업은 되돌릴 수 없으며, 다음 항목이 영구적으로 삭제됩니다:
                                  <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>조직 정보</li>
                                    <li>모든 멤버 ({org.members.length}명)</li>
                                    <li>대기 중인 초대</li>
                                    <li>관련된 모든 데이터</li>
                                  </ul>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteOrganization(org.id, org.name)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  영구 삭제
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>새 조직 생성</CardTitle>
              <CardDescription>
                새로운 조직을 생성하고 팀을 구성하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createOrganization} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">조직 이름 *</Label>
                    <Input
                      id="name"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="예: 우리 회사"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug">슬러그 *</Label>
                    <Input
                      id="slug"
                      value={newOrgSlug}
                      onChange={(e) => setNewOrgSlug(e.target.value)}
                      placeholder="예: our-company"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">설명</Label>
                  <Textarea
                    id="description"
                    value={newOrgDescription}
                    onChange={(e) => setNewOrgDescription(e.target.value)}
                    placeholder="조직에 대한 간단한 설명을 입력하세요"
                  />
                </div>
                <div>
                  <Label htmlFor="website">웹사이트</Label>
                  <Input
                    id="website"
                    type="url"
                    value={newOrgWebsite}
                    onChange={(e) => setNewOrgWebsite(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <Button type="submit" className="w-full">
                  조직 생성
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
