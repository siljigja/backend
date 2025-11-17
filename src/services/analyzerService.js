const axios = require('axios');
const crypto = require('node:crypto');
const { config } = require('../config/env');
const { logger } = require('../utils/logger');

const SYSTEM_PROMPT = [
  '너는 "API 보안 취약점 탐지 엔진"을 위한 전문 백엔드 코드 리뷰어이자 보안 엔지니어 역할을 수행한다.',
  '주어진 입력(소스 코드, OpenAPI/Swagger 스펙, 또는 엔드포인트 예시)만 보고 보안 취약점을 식별·설명·수정 코드 제안까지 자동으로 작성하라.',
  '다음 지침을 모두 준수하라.',
  '1) 학습/재학습 금지: 사용자 응답이나 피드백을 수집해 모델을 추가 학습시키라는 항목은 포함 금지.',
  '2) 입력 가정: 모든 외부 입력(req.query, req.body, headers, cookies, path params 등)은 완전히 사용자 통제값으로 가정.',
  '3) 언어: 기본 출력은 한국어. 약어(CWE, OWASP, CVE, JWT, mTLS 등)는 영어 병기 가능.',
  '4) 출력 형식(엄격): 반드시 JSON 한 개만 반환하고 JSON 외에는 1~3줄 한국어 요약 이외 추가 금지.',
  '5) JSON 스키마는 아래와 완전히 동일해야 한다.',
  '   {',
  '     "analysis_id": "string",',
  '     "project_id": "string|null",',
  '     "input_type": "code|openapi|curl_example|other",',
'     "issues": [',
  '       {',
  '         "id": "string",',
  '         "name": "string",',
  '         "description": "string",',
  '         "fix_code": "string",',
  '         "severity": "Critical|High|Medium|Low",',
  '         "file_path": "string|null",',
  '         "start_line": number|null,',
  '         "end_line": number|null,',
'         "confidence": number,',
'         "exploit_example": "string(optional)",',
'         "display_meta": {',
'             "severity_color": "string(hex)",',
'             "highlight_lines": [optional two numbers start/end],',
'             "fix_color": "string(optional hex)"',
'         }',
  '       }',
  '     ],',
  '     "generated_at": "ISO8601-timestamp"',
  '   }',
'6) issues 배열은 최소 1개 이상. name, description, fix_code는 필수이며 빈 문자열 금지.',
  '7) description에는 최대 8~10줄 이내의 관련 코드 스니펫과 위험 설명을 포함.',
'8) fix_code는 실행 가능한 최소 수정안이어야 하며 필요 시 주석으로 전제 조건을 짧게 기술. display_meta.fix_color가 있으면 파란 계열(hex)을 사용.',
  '9) severity는 위 열거형 중 하나만 허용. confidence는 0~1 사이 소수.',
  '10) 입력이 불충분하면 단일 이슈를 만들고 가정 사항을 명시하며 confidence를 낮게 설정.',
  '11) 악성 페이로드, 파괴적 RCE PoC 등은 금지. 재현 예시는 읽기 전용/비파괴적이어야 함.',
  '12) JSON 직후 1~2줄 한국어 요약을 붙여도 되지만 그 외 텍스트는 출력 금지.'
].join('\n');

const isoNow = () => new Date().toISOString();
const genId = (prefix) => `${prefix}-${crypto.randomBytes(4).toString('hex')}`;

const severityColor = (severity = 'Medium') => {
  switch (severity) {
    case 'Critical':
      return '#ff4d4f';
    case 'High':
      return '#ff8c42';
    case 'Medium':
      return '#ffbf3c';
    case 'Low':
      return '#4caf50';
    default:
      return '#ffbf3c';
  }
};

const buildIssue = (idx, {
  name,
  description,
  fix_code,
  severity = 'Medium',
  file_path = null,
  start_line = null,
  end_line = null,
  confidence = 0.5,
  exploit_example,
  display_meta
}) => ({
  id: `ISSUE-${idx}`,
  name,
  description,
  fix_code,
  severity,
  file_path,
  start_line,
  end_line,
  confidence,
  ...(exploit_example ? { exploit_example } : {}),
  display_meta: display_meta || {
    severity_color: severityColor(severity),
    highlight_lines: start_line && end_line ? [start_line, end_line] : []
  }
});

const analyzeJsCodeFallback = (source, filename = null) => {
  const issues = [];
  const lines = source.split(/\r?\n/);
  const add = (payload) => issues.push(buildIssue(issues.length + 1, payload));

  const containsExpress = /express\(\)/.test(source);
  const usesHelmet = /helmet\(/.test(source);

  lines.forEach((line, index) => {
    if (/\beval\s*\(/.test(line)) {
      add({
        name: '동적 코드 실행(eval) 사용',
        description: `다음 코드가 동적 실행을 허용하여 RCE 위험이 있습니다.\n${line.trim()}`,
        fix_code: `// eval 사용 금지. 안전한 파서/화이트리스트 방식으로 대체
// 목적이 JSON 처리라면
const data = JSON.parse(input);`,
        severity: 'High',
        file_path: filename,
        start_line: index + 1,
        end_line: index + 1,
        confidence: 0.9
      });
    }

    if (/child_process\.(exec|execFile|spawn)\s*\(/.test(line)) {
      add({
        name: '명령 주입 가능성(child_process)',
        description: `child_process 호출이 감지되었습니다. 사용자 입력이 결합되면 명령 주입 위험이 큽니다.\n${line.trim()}`,
        fix_code: `// 안전한 실행: 인자 배열을 명확히 분리하고 사용자 입력을 엄격 검증
import { execFile } from 'child_process';
const safeArgs = ['--version']; // 사용자 입력은 화이트리스트 검증 필요
execFile('node', safeArgs, (err, stdout) => { /* ... */ });`,
        severity: 'High',
        file_path: filename,
        start_line: index + 1,
        end_line: index + 1,
        confidence: 0.75
      });
    }

    if (/(SELECT|INSERT|UPDATE|DELETE)[^;]*\+\s*req\./i.test(line) || /query\s*\(.*\+.*req\./i.test(line)) {
      add({
        name: 'SQL 인젝션 위험(문자열 결합 쿼리)',
        description: `SQL 쿼리에 사용자 입력이 문자열 결합으로 포함될 수 있습니다.\n${line.trim()}`,
        fix_code: `// 파라미터 바인딩 사용 예 (mysql2/promise 가정)
const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);`,
        severity: 'High',
        file_path: filename,
        start_line: index + 1,
        end_line: index + 1,
        confidence: 0.7
      });
    }

    if (/jwt\.(decode|verify)\s*\(/i.test(line) && !/jwt\.verify\s*\(/i.test(source)) {
      add({
        name: 'JWT 검증 누락 가능성',
        description: 'JWT를 decode만 하고 verify(서명 검증)를 수행하지 않으면 위조 토큰 수용 위험이 있습니다.',
        fix_code: `// 항상 jwt.verify 사용
import jwt from 'jsonwebtoken';
const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });`,
        severity: 'High',
        file_path: filename,
        start_line: index + 1,
        end_line: index + 1,
        confidence: 0.6
      });
    }
  });

  if (containsExpress && !usesHelmet) {
    if (!issues.some((item) => item.name.includes('보안 헤더'))) {
      issues.push(buildIssue(issues.length + 1, {
        name: '보안 헤더 미적용(Helmet 미사용)',
        description: 'Express 앱에서 Helmet 미사용으로 보안 헤더(XSS, 클릭재킹 등) 결여 위험이 있습니다.',
        fix_code: `import helmet from 'helmet';
const app = express();
app.use(helmet());`,
        severity: 'Medium',
        file_path: filename,
        start_line: null,
        end_line: null,
        confidence: 0.65
      }));
    }
  }

  return issues;
};

const analyzeOpenApiFallback = (specText) => {
  const issues = [];
  const add = (payload) => issues.push(buildIssue(issues.length + 1, payload));

  if (/servers\s*:\s*\[?[\s\S]*http:\/\//i.test(specText)) {
    add({
      name: 'OpenAPI: HTTP 서버 사용',
      description: '서버 URL에 http가 포함되어 전송 중 도청/변조 위험이 있습니다.',
      fix_code: `# 서버 URL을 HTTPS로 변경
servers:
  - url: https://defepwn.com`,
      severity: 'High',
      file_path: null,
      start_line: null,
      end_line: null,
      confidence: 0.8
    });
  }

  if (!/securityschemes/i.test(specText)) {
    add({
      name: 'OpenAPI: 인증 스키마 누락',
      description: 'components.securitySchemes가 없어 인증이 정의되지 않았을 수 있습니다.',
      fix_code: `components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
security:
  - bearerAuth: []`,
      severity: 'Medium',
      file_path: null,
      start_line: null,
      end_line: null,
      confidence: 0.6
    });
  }

  return issues;
};

const analyzeCurlFallback = (text) => {
  const issues = [];
  const add = (payload) => issues.push(buildIssue(issues.length + 1, payload));

  if (/curl\b/.test(text) && /http:\/\//i.test(text) && !/https:\/\//i.test(text)) {
    add({
      name: 'HTTP 사용(curl 예시)',
      description: 'TLS 미사용 요청 예시입니다. 중간자 공격 위험이 있습니다.',
      fix_code: `# HTTPS로 변경
curl https://defepwn.com/health`,
      severity: 'High',
      file_path: null,
      start_line: null,
      end_line: null,
      confidence: 0.85,
      exploit_example: 'GET http://example.com/health'
    });
  }

  if (/authorization:\s*bearer\s+[A-Za-z0-9-_\.]+/i.test(text)) {
    add({
      name: 'Bearer 토큰 노출 위험',
      description: '예시에 실제 토큰이 포함되면 로그/히스토리 노출 위험이 있습니다.',
      fix_code: `# 토큰은 자리표시자로 교체
curl -H "Authorization: Bearer <TOKEN>" https://defepwn.com`,
      severity: 'Medium',
      file_path: null,
      start_line: null,
      end_line: null,
      confidence: 0.7
    });
  }

  return issues;
};

const fallbackAnalyze = ({ project_id, input_type, content, file_path }) => {
  let issues = [];
  try {
    switch (input_type) {
      case 'code':
        issues = analyzeJsCodeFallback(content, file_path || null);
        break;
      case 'openapi':
        issues = analyzeOpenApiFallback(content);
        break;
      case 'curl_example':
        issues = analyzeCurlFallback(content);
        break;
      default:
        issues = [];
    }
  } catch (error) {
    logger.warn('Fallback analyzer error', { error: error.message });
  }

  if (issues.length === 0) {
    issues = [buildIssue(1, {
      name: '컨텍스트 부족(가정 기반 보고)',
      description: '취약점을 확인하기에 입력 컨텍스트가 부족합니다. 더 많은 코드/스펙을 제공해 주세요.',
      fix_code: `// 더 많은 코드 스니펫 또는 OpenAPI 문서를 제공하세요.`,
      severity: 'Low',
      file_path: file_path || null,
      start_line: null,
      end_line: null,
      confidence: 0.25
    })];
  }

  return {
    analysis_id: genId('analysis'),
    project_id: project_id || null,
    input_type,
    issues,
    generated_at: isoNow()
  };
};

const extractJsonPayload = (text) => {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return trimmed.slice(start, end + 1);
};

const buildUserPayloadDescription = ({ project_id, input_type, content, file_path }) =>
  JSON.stringify(
    {
      project_id: project_id || null,
      input_type,
      file_path: file_path || null,
      content
    },
    null,
    2
  );

const callDeepseek = async ({ project_id, input_type, content, file_path }) => {
  const { deepseek } = config;
  if (!deepseek.apiKey) {
    logger.warn('DEEPSEEK_API_KEY(HF_API_KEY) 미설정: ChatGPT로 대체합니다.');
    return null;
  }

  const prompt = `${SYSTEM_PROMPT}\n\n[사용자 입력]\n${buildUserPayloadDescription({
    project_id,
    input_type,
    content,
    file_path
  })}\n\n위 지침을 따른 JSON만 반환하세요.`;

  const url = deepseek.baseUrl || `https://api-inference.huggingface.co/models/${deepseek.model}`;
  const body = {
    inputs: prompt,
    parameters: {
      max_new_tokens: 1024,
      temperature: 0.2
    }
  };

  const response = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${deepseek.apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 45000
  });

  let generated = '';
  const data = response.data;
  if (Array.isArray(data)) {
    generated = data[0]?.generated_text || data[0]?.output_text || '';
  } else if (typeof data === 'object' && data !== null) {
    generated = data.generated_text || data.output_text || '';
  } else if (typeof data === 'string') {
    generated = data;
  }

  const jsonPayload = extractJsonPayload(generated);
  if (!jsonPayload) {
    throw new Error('DeepSeek(HuggingFace) 응답에서 JSON을 추출할 수 없습니다.');
  }
  return JSON.parse(jsonPayload);
};

const callChatGpt = async ({ project_id, input_type, content, file_path }) => {
  if (!config.chatgptApiKey) {
    logger.warn('CHATGPT_API_KEY 미설정: 룰 기반 분석으로 대체합니다.');
    return null;
  }

  const payloadDescription = buildUserPayloadDescription({
    project_id,
    input_type,
    content,
    file_path
  });

  const body = {
    model: config.chatgptModel,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `다음 입력을 분석하여 규칙을 모두 지키는 JSON만 응답하라.\n${payloadDescription}`
      }
    ],
    temperature: 0,
    response_format: { type: 'json_object' }
  };

  const response = await axios.post(config.chatgptBaseUrl, body, {
    headers: {
      Authorization: `Bearer ${config.chatgptApiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  const contentText = response.data?.choices?.[0]?.message?.content;
  const jsonPayload = extractJsonPayload(contentText);
  if (!jsonPayload) {
    throw new Error('ChatGPT 응답에서 JSON을 추출할 수 없습니다.');
  }
  return JSON.parse(jsonPayload);
};

const hydrateResponse = (result, fallbackInput) => {
  if (!result || typeof result !== 'object') {
    return null;
  }
  const normalized = { ...result };
  normalized.analysis_id = normalized.analysis_id || genId('analysis');
  normalized.project_id = normalized.project_id ?? fallbackInput.project_id ?? null;
  normalized.input_type = normalized.input_type || fallbackInput.input_type;
  normalized.generated_at = normalized.generated_at || isoNow();

  if (!Array.isArray(normalized.issues)) {
    normalized.issues = [];
  }
  normalized.issues = normalized.issues.map((issue, idx) => ({
    id: issue.id || `ISSUE-${idx + 1}`,
    name: issue.name,
    description: issue.description,
    fix_code: issue.fix_code,
    severity: issue.severity || 'Medium',
    file_path: issue.file_path ?? null,
    start_line: issue.start_line ?? null,
    end_line: issue.end_line ?? null,
    confidence: issue.confidence ?? 0.5,
    ...(issue.exploit_example ? { exploit_example: issue.exploit_example } : {}),
    display_meta: issue.display_meta || {
      severity_color: severityColor(issue.severity || 'Medium'),
      highlight_lines:
        issue.start_line && issue.end_line ? [issue.start_line, issue.end_line] : [],
      fix_color: '#1976d2'
    }
  })).filter((issue) => issue.name && issue.description && issue.fix_code);

  if (normalized.issues.length === 0) {
    return null;
  }
  return normalized;
};

const analyzeInput = async ({ project_id = null, input_type = 'other', content = '', file_path = null }) => {
  const payload = { project_id, input_type, content, file_path };

  try {
    const deepseekResult = await callDeepseek(payload);
    const hydrated = hydrateResponse(deepseekResult, payload);
    if (hydrated) {
      return hydrated;
    }
  } catch (error) {
    logger.warn('DeepSeek 분석 실패, OpenAI로 대체', { error: error.message });
  }

  try {
    const chatGptResult = await callChatGpt(payload);
    const hydrated = hydrateResponse(chatGptResult, payload);
    if (hydrated) {
      return hydrated;
    }
  } catch (error) {
    logger.warn('ChatGPT 분석 실패, 룰 기반으로 대체', { error: error.message });
  }

  return fallbackAnalyze(payload);
};

module.exports = {
  analyzeInput
};
