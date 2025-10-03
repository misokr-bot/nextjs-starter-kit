"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check } from "lucide-react";

export default function ApiDocs() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CodeBlock = ({ code, language, id }: { code: string; language: string; id: string }) => (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        className="absolute top-2 right-2"
        onClick={() => copyToClipboard(code, id)}
      >
        {copiedCode === id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">API 문서</h1>
        <p className="text-lg text-gray-600">
          SaaS 플랫폼의 REST API를 사용하여 애플리케이션을 구축하세요
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="authentication">인증</TabsTrigger>
          <TabsTrigger value="users">사용자</TabsTrigger>
          <TabsTrigger value="organizations">조직</TabsTrigger>
          <TabsTrigger value="api-keys">API 키</TabsTrigger>
          <TabsTrigger value="examples">예시</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API 개요</CardTitle>
              <CardDescription>
                RESTful API를 통해 모든 기능에 프로그래밍 방식으로 접근할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">기본 URL</h3>
                <CodeBlock
                  code={`${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/api`}
                  language="text"
                  id="base-url"
                />
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">응답 형식</h3>
                <p className="text-sm text-gray-600 mb-2">
                  모든 API 응답은 JSON 형식으로 반환됩니다
                </p>
                <CodeBlock
                  code={`{
  "success": true,
  "data": {
    // 응답 데이터
  },
  "error": null
}`}
                  language="json"
                  id="response-format"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-2">에러 처리</h3>
                <p className="text-sm text-gray-600 mb-2">
                  에러가 발생하면 적절한 HTTP 상태 코드와 함께 에러 메시지가 반환됩니다
                </p>
                <CodeBlock
                  code={`{
  "success": false,
  "error": "Unauthorized",
  "message": "API 키가 유효하지 않습니다"
}`}
                  language="json"
                  id="error-format"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="authentication" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>인증</CardTitle>
              <CardDescription>
                API 키를 사용하여 요청을 인증합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">API 키 사용</h3>
                <p className="text-sm text-gray-600 mb-2">
                  모든 API 요청에 Authorization 헤더를 포함해야 합니다
                </p>
                <CodeBlock
                  code={`curl -H "Authorization: Bearer sk_your_api_key_here" \\
  "${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/api/users"`}
                  language="bash"
                  id="auth-example"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-2">API 키 생성</h3>
                <p className="text-sm text-gray-600 mb-2">
                  대시보드에서 API 키를 생성하고 관리할 수 있습니다
                </p>
                <CodeBlock
                  code={`POST /api/dev/api-keys
Content-Type: application/json
Authorization: Bearer your_session_token

{
  "name": "My API Key",
  "permissions": ["user:read", "organization:read"]
}`}
                  language="http"
                  id="create-api-key"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>사용자 API</CardTitle>
              <CardDescription>
                사용자 정보를 조회하고 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">사용자 정보 조회</h3>
                <CodeBlock
                  code={`GET /api/users/me
Authorization: Bearer sk_your_api_key_here`}
                  language="http"
                  id="get-user"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-2">응답 예시</h3>
                <CodeBlock
                  code={`{
  "id": "user_123",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z"
}`}
                  language="json"
                  id="user-response"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>조직 API</CardTitle>
              <CardDescription>
                조직과 멤버를 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">조직 목록 조회</h3>
                <CodeBlock
                  code={`GET /api/organizations
Authorization: Bearer sk_your_api_key_here`}
                  language="http"
                  id="get-organizations"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-2">조직 생성</h3>
                <CodeBlock
                  code={`POST /api/organizations
Content-Type: application/json
Authorization: Bearer sk_your_api_key_here

{
  "name": "My Organization",
  "slug": "my-org",
  "description": "Organization description"
}`}
                  language="http"
                  id="create-organization"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-2">멤버 초대</h3>
                <CodeBlock
                  code={`POST /api/organizations/{org_id}/invite
Content-Type: application/json
Authorization: Bearer sk_your_api_key_here

{
  "email": "newmember@example.com",
  "role": "member"
}`}
                  language="http"
                  id="invite-member"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API 키 관리</CardTitle>
              <CardDescription>
                API 키를 생성, 조회, 업데이트, 삭제할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">API 키 목록 조회</h3>
                <CodeBlock
                  code={`GET /api/dev/api-keys
Authorization: Bearer your_session_token`}
                  language="http"
                  id="get-api-keys"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-2">API 키 생성</h3>
                <CodeBlock
                  code={`POST /api/dev/api-keys
Content-Type: application/json
Authorization: Bearer your_session_token

{
  "name": "Production API Key",
  "permissions": ["user:read", "organization:read"],
  "expiresAt": "2024-12-31T23:59:59Z"
}`}
                  language="http"
                  id="create-api-key-detailed"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-2">API 키 회전</h3>
                <CodeBlock
                  code={`POST /api/dev/api-keys/{key_id}/rotate
Authorization: Bearer your_session_token`}
                  language="http"
                  id="rotate-api-key"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>실제 사용 예시</CardTitle>
              <CardDescription>
                다양한 프로그래밍 언어로 API를 사용하는 예시입니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">JavaScript/Node.js</h3>
                <CodeBlock
                  code={`const API_KEY = 'sk_your_api_key_here';
const BASE_URL = '${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/api';

async function getCurrentUser() {
  const response = await fetch(\`\${BASE_URL}/users/me\`, {
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  
  return await response.json();
}

// 사용 예시
getCurrentUser()
  .then(user => console.log('Current user:', user))
  .catch(error => console.error('Error:', error));`}
                  language="javascript"
                  id="js-example"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-2">Python</h3>
                <CodeBlock
                  code={`import requests

API_KEY = 'sk_your_api_key_here'
BASE_URL = '${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/api'

def get_current_user():
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(f'{BASE_URL}/users/me', headers=headers)
    response.raise_for_status()
    
    return response.json()

# 사용 예시
try:
    user = get_current_user()
    print(f"Current user: {user}")
except requests.exceptions.RequestException as e:
    print(f"Error: {e}")`}
                  language="python"
                  id="python-example"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-2">cURL</h3>
                <CodeBlock
                  code={`# 사용자 정보 조회
curl -H "Authorization: Bearer sk_your_api_key_here" \\
  "${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/api/users/me"

# 조직 목록 조회
curl -H "Authorization: Bearer sk_your_api_key_here" \\
  "${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/api/organizations"

# 새 조직 생성
curl -X POST \\
  -H "Authorization: Bearer sk_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Org", "slug": "my-org"}' \\
  "${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/api/organizations"`}
                  language="bash"
                  id="curl-examples"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>레이트 리미트</CardTitle>
              <CardDescription>
                API 사용량 제한에 대한 정보입니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-blue-600">1000</div>
                    <div className="text-sm text-gray-600">요청/시간</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-green-600">10000</div>
                    <div className="text-sm text-gray-600">요청/일</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-purple-600">100000</div>
                    <div className="text-sm text-gray-600">요청/월</div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">레이트 리미트 정보</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• 레이트 리미트는 API 키별로 적용됩니다</li>
                    <li>• 제한에 도달하면 429 Too Many Requests 에러가 반환됩니다</li>
                    <li>• Retry-After 헤더에 재시도 가능한 시간이 포함됩니다</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
