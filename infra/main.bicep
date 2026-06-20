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
  }
}

output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_LOCATION string = location
output SERVICE_CURIO_URI string = resources.outputs.appUri
output COSMOS_ENDPOINT string = resources.outputs.cosmosEndpoint
