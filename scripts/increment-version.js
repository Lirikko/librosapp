const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');
const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');

function incrementVersion(version) {
  const parts = version.split('.');
  if (parts.length < 3) return '1.0.0';
  parts[2] = parseInt(parts[2], 10) + 1;
  return parts.join('.');
}

function updateAppJson() {
  if (!fs.existsSync(APP_JSON_PATH)) {
    console.error('app.json not found');
    return;
  }

  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
  const oldVersion = appJson.expo.version || '1.0.0';
  const newVersion = incrementVersion(oldVersion);

  appJson.expo.version = newVersion;

  // Increment Android versionCode if it exists, or initialize it
  if (!appJson.expo.android) {
    appJson.expo.android = {};
  }
  
  if (appJson.expo.android.versionCode) {
    appJson.expo.android.versionCode += 1;
  } else {
    appJson.expo.android.versionCode = 1;
  }

  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2));
  console.log(`Updated app.json: ${oldVersion} -> ${newVersion} (versionCode: ${appJson.expo.android.versionCode})`);
  return newVersion;
}

function updatePackageJson(newVersion) {
  if (!fs.existsSync(PACKAGE_JSON_PATH)) {
    console.error('package.json not found');
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  const oldVersion = packageJson.version || '1.0.0';
  
  packageJson.version = newVersion;

  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2));
  console.log(`Updated package.json: ${oldVersion} -> ${newVersion}`);
}

const newVersion = updateAppJson();
if (newVersion) {
  updatePackageJson(newVersion);
}
