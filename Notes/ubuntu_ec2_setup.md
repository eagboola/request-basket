# EC2 Instance Setup Guide — Ubuntu 24.04

> Translated from Amazon Linux (yum) to Ubuntu 24.04 (apt). All concepts identical; package manager and a few config paths differ.

---

## System & Core Dependencies

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm git
```

---

## PostgreSQL Installation & Configuration

### Install

```bash
sudo apt install -y postgresql postgresql-contrib
# Ubuntu auto-initializes the DB cluster on install — no initdb step needed
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Set Password

```bash
sudo su - postgres
psql -c "ALTER USER postgres WITH PASSWORD 'yourpassword';"
exit
```

### Configure postgresql.conf

```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
# Note: Replace '16' with your installed version (check: ls /etc/postgresql/)
```

Set:
```
listen_addresses = 'localhost'
port = 5432
```

### Configure pg_hba.conf

```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf
# Change authentication from ident to md5:
host all all 127.0.0.1/32 md5
```

### Restart PostgreSQL

```bash
sudo systemctl restart postgresql
```

### Initialize Database

```bash
sudo -i -u postgres psql
CREATE DATABASE yourdatabase;
\c requestbucket
CREATE TABLE table_name (
  id serial PRIMARY KEY,
  field1 data_type,
  field2 data_type,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE related_table (
  id serial PRIMARY KEY,
  table_id integer REFERENCES table_name(id) ON DELETE CASCADE,
  field1 data_type,
  field2 data_type
);
CREATE INDEX idx_name ON table_name(field_name);
```

---

## MongoDB Setup

### Add Repository & Install

```bash
# 1. Import GPG key:
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

# 2. Add Ubuntu repo:
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

# 3. Install:
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Install MongoDB Shell

```bash
wget https://downloads.mongodb.com/compass/mongosh-1.8.0-linux-x64.tgz
tar -zxvf mongosh-1.8.0-linux-x64.tgz
sudo mv mongosh-1.8.0-linux-x64/bin/mongosh /usr/local/bin/
mongosh
use your_database_name
```

---

## Nginx Setup

### Install & Start

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Build and Deploy Frontend

```bash
sudo mkdir -p /var/www/yourapp
cd your_app_name/client
npm install
npm run build
sudo cp -r ./dist/* /var/www/yourapp/
```

### Configure Nginx

```bash
sudo nano /etc/nginx/nginx.conf
```

```nginx
server_name [your-public-dns] or [ec2-instance-public-ip];

location / {
  root /var/www/yourapp;
  try_files $uri $uri/ /index.html;
}

location /api/ {
  proxy_pass http://localhost:3001;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
  proxy_cache_bypass $http_upgrade;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}

# Optional: if webhooks route to /:webhook_id instead of /api/:webhook_id
location ~ ^/([a-zA-Z0-9]+)$ {
  proxy_pass http://localhost:3001/$1;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
  proxy_cache_bypass $http_upgrade;
}
```

### Apply Configuration

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL Configuration (Optional)

```bash
# Ubuntu uses snap (not pip) for Certbot:
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Environment Variables

```bash
cd server   # or 'backend' depending on your folder name
touch .env
nano .env
```

```env
MONGO_URL=your_connection_string
POSTGRES_USER=your_user
POSTGRES_HOST=localhost
POSTGRES_PW=your_pass
POSTGRES_DATABASE=yourdatabase
POSTGRES_PORT=5432
EXPRESS_PORT=port_number
```

---

## Run Your App

```bash
# Within the server folder:
npm run dev
```

---

## Quick Reference: Amazon Linux vs Ubuntu

| Step | Amazon Linux | Ubuntu 24.04 |
|---|---|---|
| Package manager | `yum` | `apt` |
| PG config path | `/var/lib/pgsql/data/` | `/etc/postgresql/16/main/` |
| PG cluster init | Manual (`postgresql-setup`) | Auto on install |
| MongoDB repo | Amazon 2023 URL | Ubuntu `noble` URL |
| Certbot install | pip via venv | `snap install` |

> All `systemctl` commands, Nginx config blocks, and `.env` setup carry over from Amazon Linux unchanged.
