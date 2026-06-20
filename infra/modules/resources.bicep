targetScope = 'resourceGroup'

@description('환경 이름(리소스 명명에 사용)')
param name string

@description('배포 위치')
param location string = resourceGroup().location

@description('공통 태그')
param tags object = {}

@description('GitHub Copilot 토큰 (선택)')
@secure()
param githubToken string = ''

@description('GitHub OAuth 앱 Client ID (선택 — 미설정 시 데모 로그인)')
param githubOAuthClientId string = ''

@description('GitHub OAuth 앱 Client Secret (선택)')
@secure()
param githubOAuthClientSecret string = ''

@description('세션 JWT 서명 비밀 (선택 — 미설정 시 데모 로그인)')
@secure()
param sessionSecret string = ''

@description('Azure OpenAI 배포 위치 (모델 가용 지역. 미지정 시 리소스 그룹 위치)')
param openAiLocation string = location

@description('Azure OpenAI 모델 배포 이름 (앱이 호출하는 deployment)')
param openAiDeploymentName string = 'gpt-4o-mini'

@description('Azure OpenAI 모델 이름')
param openAiModelName string = 'gpt-4o-mini'

@description('Azure OpenAI 모델 버전')
param openAiModelVersion string = '2024-07-18'

@description('Azure OpenAI 배포 SKU (예: GlobalStandard, Standard)')
param openAiDeploymentSku string = 'GlobalStandard'

@description('Azure OpenAI 배포 용량 (1,000 TPM 단위)')
param openAiCapacity int = 30

@description('Azure OpenAI 데이터 평면 API 버전')
param openAiApiVersion string = '2024-10-21'

var serviceName = 'curio'
var suffix = take(uniqueString(subscription().id, resourceGroup().name, name), 6)

// Cosmos 데이터 설정
var cosmosDatabaseName = 'curio'
var cardsContainerName = 'cards'
var boardsContainerName = 'boards'
var usersContainerName = 'users'
// Cosmos DB Built-in Data Contributor (data-plane RBAC, 키리스)
var cosmosDataContributorRoleId = '00000000-0000-0000-0000-000000000002'
// Cognitive Services OpenAI User (data-plane RBAC, 키리스 — 모델 추론 호출 권한)
var cognitiveServicesOpenAiUserRoleId = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'

// ---------- 모니터링 ----------
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-${name}-${suffix}'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${name}-${suffix}'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// ---------- Azure OpenAI (AI / 모델 레이어, 키리스 관리 ID 인증) ----------
// 앱의 AI 기능(요약·정리·Q&A)을 Azure 위에서 실행한다. 로컬 인증(API 키)은 비활성화하고
// App Service 관리 ID 에 "Cognitive Services OpenAI User" 역할을 부여해 Entra 토큰으로만 호출한다.
resource openAi 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: toLower('aoai-${name}-${suffix}')
  location: openAiLocation
  tags: tags
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: toLower('aoai-${name}-${suffix}')
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: true
  }
}

resource openAiDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: openAi
  name: openAiDeploymentName
  sku: {
    name: openAiDeploymentSku
    capacity: openAiCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: openAiModelName
      version: openAiModelVersion
    }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
  }
}

// ---------- Cosmos DB (Serverless, NoSQL) ----------
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: toLower('cosmos-${name}-${suffix}')
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    capabilities: [
      { name: 'EnableServerless' }
    ]
    disableKeyBasedMetadataWriteAccess: true
  }
}

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: cosmosDatabaseName
  properties: {
    resource: { id: cosmosDatabaseName }
  }
}

resource cardsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: cardsContainerName
  properties: {
    resource: {
      id: cardsContainerName
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

resource boardsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: boardsContainerName
  properties: {
    resource: {
      id: boardsContainerName
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

resource usersContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: usersContainerName
  properties: {
    resource: {
      id: usersContainerName
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

// ---------- App Service ----------
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'plan-${name}-${suffix}'
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  properties: {
    reserved: true // Linux 필수
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: 'app-${name}-${suffix}'
  location: location
  kind: 'app,linux'
  tags: union(tags, { 'azd-service-name': serviceName })
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      healthCheckPath: '/api/health'
      appCommandLine: 'node dist/server.js'
      appSettings: [
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'true' }
        // NODE_ENV=production 을 두면 Oryx 의 npm install 이 devDependencies(typescript)를 건너뛰어
        // 서버 빌드(tsc)가 실패한다. 런타임 프로덕션 감지는 WEBSITE_SITE_NAME 으로 처리.
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        { name: 'ApplicationInsightsAgent_EXTENSION_VERSION', value: '~3' }
        { name: 'GITHUB_TOKEN', value: githubToken }
        { name: 'COSMOS_ENDPOINT', value: cosmosAccount.properties.documentEndpoint }
        { name: 'COSMOS_DATABASE', value: cosmosDatabaseName }
        { name: 'COSMOS_CARDS_CONTAINER', value: cardsContainerName }
        { name: 'COSMOS_BOARDS_CONTAINER', value: boardsContainerName }
        { name: 'COSMOS_USERS_CONTAINER', value: usersContainerName }
        { name: 'GITHUB_OAUTH_CLIENT_ID', value: githubOAuthClientId }
        { name: 'GITHUB_OAUTH_CLIENT_SECRET', value: githubOAuthClientSecret }
        { name: 'SESSION_SECRET', value: sessionSecret }
        // Azure OpenAI(모델 레이어). ENDPOINT+DEPLOYMENT 가 있으면 ai.ts 가 azure provider 로 동작.
        { name: 'AZURE_OPENAI_ENDPOINT', value: openAi.properties.endpoint }
        { name: 'AZURE_OPENAI_DEPLOYMENT', value: openAiDeploymentName }
        { name: 'AZURE_OPENAI_API_VERSION', value: openAiApiVersion }
      ]
    }
  }
}

// ---------- Cosmos 데이터 평면 RBAC (App Service 관리 ID → 데이터 기여자) ----------
resource cosmosRoleAssignment 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-05-15' = {
  parent: cosmosAccount
  name: guid(cosmosAccount.id, webApp.id, cosmosDataContributorRoleId)
  properties: {
    roleDefinitionId: '${cosmosAccount.id}/sqlRoleDefinitions/${cosmosDataContributorRoleId}'
    principalId: webApp.identity.principalId
    scope: cosmosAccount.id
  }
}

// ---------- Azure OpenAI RBAC (App Service 관리 ID → OpenAI User, 키리스 추론) ----------
resource openAiRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: openAi
  name: guid(openAi.id, webApp.id, cognitiveServicesOpenAiUserRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      cognitiveServicesOpenAiUserRoleId
    )
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output appUri string = 'https://${webApp.properties.defaultHostName}'
output appName string = webApp.name
output cosmosEndpoint string = cosmosAccount.properties.documentEndpoint
output cosmosAccountName string = cosmosAccount.name
output openAiEndpoint string = openAi.properties.endpoint
output openAiDeploymentName string = openAiDeploymentName
output openAiAccountName string = openAi.name

