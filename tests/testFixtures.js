export const TEST_SETTINGS = `
enableFeatureX:
  description: Enable support for experimental Feature X
  category: Features
  type: toggle
  default: false

maxConcurrentJobs:
  description: Maximum number of concurrent background jobs
  category: Performance
  type: integer
  default: 8
  public: true

temperatureThreshold:
  description: Threshold temperature in Celsius before alerts trigger
  category: Monitoring
  type: decimal
  default: 75.5
  public: false

defaultLanguage:
  description: Default language used across the application
  category: Localization
  type: select
  default: en
  options:
    - en
    - es
    - fr
    - de
    - zh
  public: true

availableRegions:
  description: Regions the user is allowed to operate in
  category: Access Control
  type: multiselect
  default: [us-east, eu-central]
  options:
    - us-east
    - us-west
    - eu-central
    - ap-south
    - sa-east
  public: true

showAdvancedOptions:
  description: Whether to display advanced configuration options
  category: UI
  type: toggle
  default: true
  public: true

userRole:
  description: Default role assigned to new users
  category: Security
  type: select
  default:
    label: "Viewer"
    value: "viewer"
  options:
    - label: "Viewer"
      value: "viewer"
    - label: "Editor"
      value: "editor"
    - label: "Admin"
      value: "admin"
  public: true

permittedModules:
  description: Modules enabled for the current tenant
  category: Modules
  type: multiselect
  default:
    - label: "Reporting"
      value: "reporting"
    - label: "Data Import"
      value: "import"
  options:
    - label: "Reporting"
      value: "reporting"
    - label: "Data Import"
      value: "import"
    - label: "Notifications"
      value: "notifications"
    - label: "Audit Logs"
      value: "audit"
  public: true

customFooterText:
  description: Custom text shown in the footer
  category: Branding
  type: text
  default: "Powered by YourCompany"
  public: true

integrationKeys:
  description: List of service key name-value pairs
  category: Integrations
  type: textpairs
  default:
    - ["analytics", "key123"]
    - ["crm", "token456"]

statusOverride:
  description: Manually override the system status
  category: System
  type: switch
  default: online
  options:
    - online
    - maintenance
    - offline

deploymentEnvironment:
  description: Current deployment environment
  category: Environment
  type: switch
  default:
    label: "Production"
    value: "prod"
  options:
    - label: "Development"
      value: "dev"
    - label: "Staging"
      value: "staging"
    - label: "Production"
      value: "prod"

supportedFormats:
  description: File formats allowed for uploads
  category: Upload
  type: multiselect
  default: [pdf, jpg]
  public: true

maintenanceMessage:
  description: Message shown during scheduled maintenance
  category: UI
  type: text
  default: "The system is temporarily unavailable due to maintenance."

latencyBuffer:
  description: Additional buffer in seconds to account for latency
  category: Performance
  type: decimal
  default: 1.25
`
