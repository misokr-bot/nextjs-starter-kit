"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MessageCircle, Mail, Phone, BookOpen, HelpCircle } from "lucide-react";

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("getting-started");

  const faqData = [
    {
      category: "getting-started",
      title: "시작하기",
      questions: [
        {
          question: "계정을 어떻게 생성하나요?",
          answer: "홈페이지에서 '시작하기' 버튼을 클릭하고 이메일 주소를 입력하여 계정을 생성할 수 있습니다. 이메일 인증 후 프로필을 완성하세요."
        },
        {
          question: "첫 번째 조직을 어떻게 만들까요?",
          answer: "대시보드의 설정 > 조직 관리에서 '조직 생성' 버튼을 클릭하여 새 조직을 만들 수 있습니다. 조직 이름과 슬러그를 입력하세요."
        },
        {
          question: "API 키는 어떻게 생성하나요?",
          answer: "대시보드의 설정 > API 키 관리에서 새 API 키를 생성할 수 있습니다. 키 이름과 권한을 설정한 후 생성하세요."
        }
      ]
    },
    {
      category: "billing",
      title: "결제 및 구독",
      questions: [
        {
          question: "구독 플랜을 어떻게 변경하나요?",
          answer: "대시보드의 설정 > 결제 관리에서 현재 구독을 확인하고 다른 플랜으로 업그레이드 또는 다운그레이드할 수 있습니다."
        },
        {
          question: "결제 실패 시 어떻게 해야 하나요?",
          answer: "결제 실패 시 이메일로 알림을 받게 됩니다. 결제 정보를 업데이트하고 다시 시도하거나 고객지원팀에 문의하세요."
        },
        {
          question: "환불 정책은 어떻게 되나요?",
          answer: "30일 무조건 환불 보장을 제공합니다. 구독 취소 후 30일 이내에 환불을 요청하시면 전액 환불해드립니다."
        }
      ]
    },
    {
      category: "security",
      title: "보안",
      questions: [
        {
          question: "2단계 인증을 어떻게 설정하나요?",
          answer: "대시보드의 설정 > 보안 설정에서 2단계 인증을 활성화할 수 있습니다. Google Authenticator 등의 앱을 사용하세요."
        },
        {
          question: "API 키가 노출되었을 때 어떻게 해야 하나요?",
          answer: "즉시 해당 API 키를 삭제하고 새 키를 생성하세요. 의심스러운 활동이 있다면 고객지원팀에 신고하세요."
        },
        {
          question: "비밀번호를 잊어버렸을 때 어떻게 해야 하나요?",
          answer: "로그인 페이지에서 '비밀번호 찾기'를 클릭하여 이메일로 재설정 링크를 받을 수 있습니다."
        }
      ]
    },
    {
      category: "api",
      title: "API 사용법",
      questions: [
        {
          question: "API 레이트 리미트는 어떻게 되나요?",
          answer: "기본적으로 시간당 1,000회, 일일 10,000회, 월간 100,000회 요청이 가능합니다. 더 높은 제한이 필요하면 고객지원팀에 문의하세요."
        },
        {
          question: "API 키 권한은 어떻게 관리하나요?",
          answer: "API 키 생성 시 필요한 권한을 선택할 수 있습니다. 나중에 설정에서 권한을 수정할 수도 있습니다."
        },
        {
          question: "웹훅은 어떻게 설정하나요?",
          answer: "조직 설정에서 웹훅 URL을 등록하고 원하는 이벤트를 선택할 수 있습니다. 서명 검증을 위해 시크릿을 설정하세요."
        }
      ]
    }
  ];

  const filteredFAQs = faqData.map(category => ({
    ...category,
    questions: category.questions.filter(q => 
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">도움말 센터</h1>
        <p className="text-lg text-gray-600">
          자주 묻는 질문과 가이드를 통해 문제를 해결하세요
        </p>
        
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="문제를 검색하세요..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="getting-started">시작하기</TabsTrigger>
          <TabsTrigger value="billing">결제</TabsTrigger>
          <TabsTrigger value="security">보안</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        {filteredFAQs.map((category) => (
          <TabsContent key={category.category} value={category.category} className="space-y-6">
            <div className="grid gap-6">
              {category.questions.map((faq, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            추가 도움이 필요하신가요?
          </CardTitle>
          <CardDescription>
            위의 정보로 문제를 해결할 수 없다면 고객지원팀에 문의하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-4 border rounded-lg">
              <Mail className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium">이메일 지원</div>
                <div className="text-sm text-gray-600">support@yourdomain.com</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 border rounded-lg">
              <MessageCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium">라이브 채팅</div>
                <div className="text-sm text-gray-600">24/7 실시간 지원</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 border rounded-lg">
              <Phone className="h-5 w-5 text-purple-600" />
              <div>
                <div className="font-medium">전화 지원</div>
                <div className="text-sm text-gray-600">평일 9AM-6PM</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            빠른 링크
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <HelpCircle className="h-4 w-4 mb-2" />
              <span className="font-medium">API 문서</span>
              <span className="text-xs text-gray-500">개발자 가이드</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <BookOpen className="h-4 w-4 mb-2" />
              <span className="font-medium">가이드</span>
              <span className="text-xs text-gray-500">단계별 튜토리얼</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <MessageCircle className="h-4 w-4 mb-2" />
              <span className="font-medium">커뮤니티</span>
              <span className="text-xs text-gray-500">사용자 포럼</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <Mail className="h-4 w-4 mb-2" />
              <span className="font-medium">피드백</span>
              <span className="text-xs text-gray-500">의견 제안</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
