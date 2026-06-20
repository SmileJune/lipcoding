#!/usr/bin/env bash
# Curio — GitHub OAuth 라이브 로그인 활성화 헬퍼.
# 브라우저에서 OAuth 앱을 먼저 등록한 뒤 이 스크립트를 실행하세요.
#   사용법: bash scripts/enable-github-oauth.sh
# Client Secret 은 화면에 표시되지 않으며 모델·로그·커밋에 남지 않습니다.
set -euo pipefail
cd "$(dirname "$0")/.."

APP_URL="https://app-curio-osnoy7.azurewebsites.net"
CALLBACK="$APP_URL/api/auth/callback"

cat <<EOF
─────────────────────────────────────────────
 Curio · GitHub OAuth 라이브 로그인 활성화
─────────────────────────────────────────────
OAuth 앱이 아직 없다면 브라우저에서 먼저 등록하세요:
  https://github.com/settings/applications/new

  Application name:            Curio
  Homepage URL:               $APP_URL
  Authorization callback URL: $CALLBACK

등록 후 "Generate a new client secret" 으로 시크릿을 생성하고
Client ID 와 Client Secret 을 복사해 두세요.
─────────────────────────────────────────────
EOF

read -r -p "Client ID 붙여넣기 후 Enter: " CLIENT_ID
read -r -s -p "Client Secret 붙여넣기 후 Enter (화면 비표시): " CLIENT_SECRET
echo

# 앞뒤 공백 제거
CLIENT_ID="${CLIENT_ID//[[:space:]]/}"
CLIENT_SECRET="${CLIENT_SECRET//[[:space:]]/}"
if [[ -z "$CLIENT_ID" || -z "$CLIENT_SECRET" ]]; then
  echo "✗ Client ID/Secret 이 비어 있어 중단합니다." >&2
  exit 1
fi

# SESSION_SECRET 이 없으면 자동 생성
CUR_SECRET="$(azd env get-values 2>/dev/null | grep '^SESSION_SECRET=' | cut -d= -f2- | tr -d '"')"
if [[ -z "$CUR_SECRET" ]]; then
  azd env set SESSION_SECRET "$(openssl rand -hex 32)"
  echo "✓ SESSION_SECRET 자동 생성"
fi

azd env set GITHUB_OAUTH_CLIENT_ID "$CLIENT_ID"
azd env set GITHUB_OAUTH_CLIENT_SECRET "$CLIENT_SECRET"
echo "✓ OAuth 자격증명을 azd 환경에 저장"

echo "▶ App Service 설정 반영(azd provision)…"
azd provision

echo
echo "✓ 완료! 라이브 GitHub 로그인이 활성화되었습니다."
echo "  검증: curl -s $APP_URL/api/auth/me 의 authMode 가 'live' 여야 합니다."
