# Revelo Monorepo Migration Guide

## Current Structure Analysis

- **Root**: Contains API code, shared config files, and testing setup
- **Client**: Vue.js application in `/client` folder
- **Clip**: Python service in `/clip` folder (can be kept separate or integrated)

## Dependency Sharing in Workspaces

pnpm workspaces automatically handle dependency sharing and deduplication:

```bash
# If both api/ and client/ use the same version of a package
api/package.json:     "axios": "^1.10.0"
client/package.json:  "axios": "^1.10.0"

# pnpm will automatically deduplicate and share it
```

## Shared Development Dependencies

For tools like linting, formatting, and testing that should be consistent across your workspace, you can:

1. **Install shared dev dependencies at the root level**
2. **Use shared configuration files**
3. **Keep workspace-specific configs in each package when needed**

### Root-level shared dependencies:

- ESLint + plugins
- Prettier
- Husky (git hooks)
- Jest/Vitest (if using same test setup)

### Package-specific dependencies:

- Framework-specific tools (Vue ESLint plugin only in client)
- Build tools (Vite for client, nodemon for API)

## Step-by-Step Migration Guide (Direct Root Structure)

### 1. Create Workspace Structure

```bash
# Create workspace config
echo "packages:
  - 'api'
  - 'client'" > pnpm-workspace.yaml
```

### 2. Move API Code to api/ Directory

```bash
# Move API files to api directory
mkdir api
mv api.js api/
mv config.js api/ 2>/dev/null || true
mv drizzle.config.js api/
mv jest.config.mjs api/
mv tests api/
mv api/* api/ 2>/dev/null || true  # Move the api folder contents
```

### 3. Keep client/ as is

```bash
# Client stays where it is
# Just update its package.json
```

## Root Package.json (with shared dev dependencies)

```json
{
  "name": "revelo",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.12.3",
  "scripts": {
    "dev": "concurrently -n \"Client,API\" -c \"#41b883,#00a0df\" \"pnpm client dev\" \"pnpm api dev\"",
    "dev:api": "pnpm api dev",
    "dev:client": "pnpm client dev",
    "build": "pnpm client build && pnpm api build",
    "build:api": "pnpm api build",
    "build:client": "pnpm client build",
    "lint": "eslint .",
    "lint:api": "eslint api/",
    "lint:client": "eslint client/",
    "format": "prettier --write .",
    "format:api": "prettier --write api/",
    "format:client": "prettier --write client/",
    "test": "pnpm api test",
    "test:api": "pnpm api test",
    "db:generate": "pnpm api db:generate",
    "db:migrate": "pnpm api db:migrate",
    "db:create": "pnpm api db:create",
    "db:drop": "pnpm api db:drop",
    "db:revert": "pnpm api db:revert",
    "api": "pnpm --filter api",
    "client": "pnpm --filter client"
  },
  "devDependencies": {
    "concurrently": "^9.2.0",
    "prettier": "^3.6.2",
    "@eslint/js": "^9.30.1",
    "eslint": "^9.30.1",
    "eslint-plugin-perfectionist": "^4.15.0",
    "globals": "^16.3.0",
    "husky": "^9.0.11",
    "lint-staged": "^15.2.2"
  }
}
```

## API Package.json (api/package.json)

```json
{
  "name": "api",
  "version": "1.0.0",
  "type": "module",
  "main": "api.js",
  "scripts": {
    "dev": "nodemon api.js",
    "build": "echo 'API build complete'",
    "test": "NODE_OPTIONS='--experimental-vm-modules --no-warnings' NODE_ENV=test jest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "node drizzle/migrate.js",
    "db:create": "node drizzle/create.js",
    "db:drop": "node drizzle/drop.js",
    "db:revert": "npx drizzle-kit drop"
  },
  "dependencies": {
    "bcryptjs": "^3.0.2",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^17.2.0",
    "drizzle-orm": "^0.44.2",
    "exifr": "^7.1.3",
    "express": "^5.1.0",
    "js-yaml": "^4.1.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "2.0.1",
    "nodemailer": "^7.0.5",
    "pg": "^8.16.3",
    "postgres": "^3.4.7",
    "sharp": "^0.34.3",
    "uuid": "^11.1.0",
    "zod": "^4.0.5"
  },
  "devDependencies": {
    "cross-env": "^7.0.3",
    "drizzle-kit": "^0.31.4",
    "jest": "^30.0.4",
    "morgan": "^1.10.0",
    "nodemon": "^3.1.10",
    "supertest": "^7.1.3"
  }
}
```

Note: Removed linting dependencies as they're now handled at the root level.

## Client Package.json (client/package.json)

```json
{
  "name": "client",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@radix-ui/colors": "^3.0.0",
    "axios": "^1.10.0",
    "gsap": "^3.13.0",
    "lucide-vue-next": "^0.525.0",
    "pinia": "^3.0.3",
    "vue": "^3.5.17",
    "vue-router": "^4.5.1"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.0",
    "@vitest/eslint-plugin": "1.3.4",
    "@vue/eslint-config-prettier": "^10.1.0",
    "@vue/test-utils": "^2.4.6",
    "eslint-plugin-vue": "^9.33.0",
    "jsdom": "^26.1.0",
    "sass": "^1.89.2",
    "vite": "^6.3.5",
    "vite-plugin-vue-devtools": "^7.7.7",
    "vitest": "^3.2.4"
  }
}
```

Note: Removed general linting dependencies as they're now handled at the root level. Kept Vue-specific ESLint plugins here.

## Shared Configuration Files

Create these shared configuration files at the root level:

### ESLint Config (eslint.config.js)

```javascript
import globals from "globals"
import pluginJs from "@eslint/js"
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended"
import perfectionist from "eslint-plugin-perfectionist"
import pluginVue from "eslint-plugin-vue"

export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,vue}"],
    languageOptions: { globals: globals.browser }
  },
  {
    ignores: ["**/dist/", "**/node_modules/", "**/uploads/", "clip/"]
  },
  pluginJs.configs.recommended,

  // API-specific config
  {
    files: ["api/**/*.js"],
    languageOptions: { globals: globals.node },
    plugins: { perfectionist },
    rules: {
      ...perfectionist.configs.recommended.rules
    }
  },

  // Client-specific config
  {
    files: ["client/**/*.{js,vue}"],
    plugins: { vue: pluginVue },
    rules: {
      ...pluginVue.configs.recommended.rules,
      "vue/multi-word-component-names": "off"
    }
  },

  eslintPluginPrettierRecommended
]
```

### Prettier Config (.prettierrc.json)

```json
{
  "singleQuote": true,
  "semi": false,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 80
}
```

### Git Hooks Setup (Optional)

```bash
# Install husky for git hooks
echo "npx husky install" > .husky/install.js

# Pre-commit hook
echo "npx lint-staged" > .husky/pre-commit
```

### Lint-staged Config (package.json addition)

```json
{
  "lint-staged": {
    "*.{js,vue}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

## Final Directory Structure (Direct Root - Recommended)

```
revelo/
├── pnpm-workspace.yaml
├── package.json
├── eslint.config.js
├── .prettierrc.json
├── .husky/
│   ├── pre-commit
│   └── install.js
├── api/
│   ├── package.json
│   ├── api.js
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── tests/
│   ├── drizzle.config.js
│   └── jest.config.mjs
├── client/
│   ├── package.json
│   ├── src/
│   ├── vite.config.js
│   └── vitest.config.js
├── clip/ (keep as is)
├── uploads/
└── settings.yml
```

## Key Benefits of This Setup

1. **Shared Development Tools**: ESLint, Prettier, and git hooks configured once at the root
2. **Automatic Dependency Deduplication**: pnpm automatically shares common dependencies
3. **Centralized Scripts**: Run commands from root or target specific packages
4. **Clean Structure**: API and client are clearly your main applications
5. **Easy to Scale**: Can add shared packages later if needed
6. **Minimal Refactoring**: Matches your current structure closely

## Shared vs Package-specific Dependencies

### Root Level (Shared):

- `eslint` + core plugins
- `prettier`
- `husky` + `lint-staged`
- `concurrently`
- Common tools used by both projects

### Package Level:

- **API**: `nodemon`, `jest`, `drizzle-kit`, API-specific dependencies
- **Client**: `vite`, `vitest`, `@vitejs/plugin-vue`, Vue-specific ESLint plugins

### Automatically Shared:

- Any dependency with the same version in both `api/` and `client/` will be automatically deduplicated by pnpm

## Installation & Testing

```bash
# Install all dependencies
pnpm install

# Test the setup
pnpm dev
pnpm build
pnpm lint
```

This structure gives you:

- Clean separation between API and client
- Centralized script management from root
- Ability to add shared packages
- Full control over both applications
- Proper workspace dependency management
