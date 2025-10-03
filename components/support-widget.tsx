"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Send, Mail, Phone } from "lucide-react";

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "email" | "phone">("chat");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 실제 구현에서는 지원 티켓 시스템과 연동
      await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이션
      
      alert("메시지가 전송되었습니다. 빠른 시일 내에 답변드리겠습니다.");
      setMessage("");
      setEmail("");
      setSubject("");
    } catch (error) {
      alert("메시지 전송에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 h-96 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">고객지원</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={activeTab === "chat" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("chat")}
              className="flex-1"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              채팅
            </Button>
            <Button
              variant={activeTab === "email" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("email")}
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-1" />
              이메일
            </Button>
            <Button
              variant={activeTab === "phone" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("phone")}
              className="flex-1"
            >
              <Phone className="h-4 w-4 mr-1" />
              전화
            </Button>
          </div>

          {/* Chat Tab */}
          {activeTab === "chat" && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">지원팀</span>
                  <Badge variant="secondary" className="text-xs">온라인</Badge>
                </div>
                <p>안녕하세요! 무엇을 도와드릴까요?</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <Textarea
                  placeholder="메시지를 입력하세요..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[80px]"
                  required
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? "전송 중..." : "전송"}
                </Button>
              </form>
            </div>
          )}

          {/* Email Tab */}
          {activeTab === "email" && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                이메일로 문의사항을 보내주시면 24시간 내에 답변드립니다.
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  placeholder="이메일 주소"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  placeholder="제목"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
                <Textarea
                  placeholder="문의 내용을 입력하세요..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[80px]"
                  required
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <Mail className="h-4 w-4 mr-2" />
                  {isSubmitting ? "전송 중..." : "이메일 전송"}
                </Button>
              </form>
            </div>
          )}

          {/* Phone Tab */}
          {activeTab === "phone" && (
            <div className="space-y-4">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">전화 지원</div>
                  <div className="text-sm text-gray-600">평일 9AM - 6PM (KST)</div>
                </div>
                <div className="text-2xl font-bold text-blue-600">+82-2-1234-5678</div>
                <Button className="w-full">
                  <Phone className="h-4 w-4 mr-2" />
                  지금 전화하기
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 text-center">
                통화료는 고객 부담입니다
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
