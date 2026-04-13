# Production Deployment (Ubuntu VM + Docker Compose)

## 1) Install Docker + Compose

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
newgrp docker
```

## 2) Prepare environment

```bash
cd /path/to/TAC-Web
cp backend/.env.example backend/.env
# Edit backend/.env with production values
```

## 3) Start stack

```bash
docker compose up -d --build
```

## 4) Verify

```bash
docker compose ps
curl -I http://<VM_IP>/
curl -I http://<VM_IP>/api/health
```

Expected:
- Frontend: `http://<VM_IP>/`
- Backend API: `http://<VM_IP>/api`

## 5) Common operations

```bash
# Logs
docker compose logs -f nginx
docker compose logs -f backend
docker compose logs -f frontend

# Restart
docker compose restart

# Pull + rebuild deploy
git pull
docker compose up -d --build
```

## 6) Switch from IP to domain later

1. Point DNS:
   - `domain.com` -> VM public IP
   - `api.domain.com` -> VM public IP
2. Edit `deployment/nginx/reverse-proxy.conf`:
   - Uncomment domain blocks.
   - Keep `domain.com` -> frontend and `api.domain.com` -> backend.
3. Reload stack:

```bash
docker compose up -d
```

## 7) HTTPS options

### Option A: Certbot on VM
- Install certbot and issue certs for both domains.
- Mount cert paths in `docker-compose.yml` and add `listen 443 ssl;` blocks in nginx config.

### Option B: Cloudflare (free SSL)
- Put domains behind Cloudflare.
- Set SSL mode to `Full` (or `Full (strict)` with origin cert).
- Keep origin on HTTP or configure origin certs for end-to-end TLS.
