const fs = require('fs');
const path = require('path');

const runId = `render-build-${Date.now()}`;
const root = process.cwd();
const tsconfigPath = path.join(root, 'tsconfig.json');
let tsconfigTypes = null;

try {
  const tsconfigRaw = fs.readFileSync(tsconfigPath, 'utf8');
  const tsconfig = JSON.parse(tsconfigRaw);
  tsconfigTypes = tsconfig?.compilerOptions?.types ?? null;
} catch {
  tsconfigTypes = 'read-failed';
}

const checks = {
  nodeEnv: process.env.NODE_ENV ?? null,
  npmConfigProduction: process.env.npm_config_production ?? null,
  npmConfigOmit: process.env.npm_config_omit ?? null,
  hasTypesNode: fs.existsSync(path.join(root, 'node_modules', '@types', 'node')),
  hasTypesExpress: fs.existsSync(path.join(root, 'node_modules', '@types', 'express')),
  hasTypesCors: fs.existsSync(path.join(root, 'node_modules', '@types', 'cors')),
  hasTypesMorgan: fs.existsSync(path.join(root, 'node_modules', '@types', 'morgan')),
  hasTypesMulter: fs.existsSync(path.join(root, 'node_modules', '@types', 'multer')),
  hasTypesJsonWebToken: fs.existsSync(path.join(root, 'node_modules', '@types', 'jsonwebtoken')),
  hasTypesWs: fs.existsSync(path.join(root, 'node_modules', '@types', 'ws')),
  tsconfigTypes
};

// #region agent log
fetch('http://127.0.0.1:7763/ingest/f7634983-5a77-4a9d-a744-81ae45180aea', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Debug-Session-Id': '1a4728'
  },
  body: JSON.stringify({
    sessionId: '1a4728',
    runId,
    hypothesisId: 'H1-H5',
    location: 'backend/scripts/render-build-debug.cjs:32',
    message: 'Render build environment and type package presence',
    data: checks,
    timestamp: Date.now()
  })
}).catch(() => {});
// #endregion
