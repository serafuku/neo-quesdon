# Neo-Quesdon

## Getting Started

### the development server

```bash
# Install dependencies
npm install

# Run local db
docker compose -f compose.local-db.yml up -d

# Run db migration and generate prisma client
npm run prisma

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.


### Deploy production server with docker

```bash
# copy config example file
cp config/docker.env.example config/docker.env

# copy example compose file
cp docker-compose-example.yml docker-compose.yml

# Edit config file
vim config/docker.env

# Compose build
docker compose build

# Deploy
docker compose up -d
```

