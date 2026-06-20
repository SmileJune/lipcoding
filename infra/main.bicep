targetScope = 'subscription'

@description('azd 환경 이름 (리소스 그룹·접두사에 사용)')
param environmentName string

@description('배포 위치 (예: koreacentral)')
param location string

@description('GitHub Copilot 토큰 (선택, 비우면 데모 폴백)')
@secure()
param githubToken string = ''

@description('GitHub OAuth 앱 Client ID (선택, 비우면 데모 로그인)')
param githubOAuthClientId string = ''

@description('GitHub OAuth 앱 Client Secret (선택)')
@secure()
param githubOAuthClientSecret string = ''

@description('세션 JWT 서명 비밀 (선택, 비우면 데모 로그인)')
@secure()
param sessionSecret string = ''

@description('Azure OpenAI 배포 위치 (모델 가용 지역. 미지정 시 기본 위치)')
param openAiLocation string = location

@description('Azure OpenAI 모델 배포 이름')
param openAiDeploymentName string = 'gpt-4o-mini'

@description('Azure OpenAI 모델 이름')
param openAiModelName string = 'gpt-4o-mini'

@description('Azure OpenAI 모델 버전')
param openAiModelVersion string = '2024-07-18'

@description('Azure OpenAI 데이터 평면 API 버전')
param openAiApiVersion string = '2024-10-21'

var tags = { 'azd-env-name': environmentName }

resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-${environmentName}'
  location: location
  tags: tags
}

module resources './modules/resources.bicep' = {
  name: 'resources'
  scope: rg
  params: {
    name: environmentName
    location: location
    tags: tags
    githubToken: githubToken
    githubOAuthClientId: githubOAuthClientId
    githubOAuthClientSecret: githubOAuthClientSecret
    sessionSecret: sessionSecret
    openAiLocation: openAiLocation
    openAiDeploymentName: openAiDeploymentName
    openAiModelName: openAiModelName
    openAiModelVersion: openAiModelVersion
    openAiApiVersion: openAiApiVersion
  }
}

output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_LOCATION string = location
output SERVICE_CURIO_URI string = resources.outputs.appUri
output COSMOS_ENDPOINT string = resources.outputs.cosmosEndpoint
output AZURE_OPENAI_ENDPOINT string = resources.outputs.openAiEndpoint
output AZURE_OPENAI_DEPLOYMENT string = resources.outputs.openAiDeploymentName
