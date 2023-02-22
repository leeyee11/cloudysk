# Cloudysk
A Node.js based file browser.

## Install
```bash
# Clone project
git clone https://github.com/leeyee11/cloudysk.git
cd cloudysk
npm ci
npm run build

# Setup frontend
git clone https://github.com/leeyee11/cloudysk-frontend.git frontend
cd frontend
npm ci
npm run build
cd ..

# Start running
node dist/index.js
```

## Folders
* frontend: it's used to host the frontend code, `cloudysk-frontend` project need to be cloned into this folder
* db: it's used to store `realm` database local files
* data: it's used to store the cloud files

## Usage
Open `http://localhost:3000` in browser