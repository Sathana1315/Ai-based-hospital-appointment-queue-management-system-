# Deployment Guide

This guide describes how to deploy the Q-Med application to a production server (Ubuntu/Debian recommended).

## Prerequisites
- Docker Engine & Docker Compose installed
- A domain name pointing to your server's IP
- Open ports 80 and 443

## Steps to Deploy

### 1. Clone the repository
```bash
git clone https://github.com/your-org/q-med.git
cd q-med
```

### 2. Configure Environment
Create a `.env.production` file at the root:
```bash
cp .env.example .env.production
nano .env.production
```
*Fill in the `MONGODB_URI`, `SECRET_KEY`, and `GROQ_API_KEY`.*

### 3. Start the containers
```bash
docker-compose up --build -d
```
This will build the React app, install Python dependencies, configure Nginx, and start the services.

### 4. Backups
Set up a cronjob for daily backups:
```bash
0 2 * * * /path/to/q-med/scripts/backup.sh >> /var/log/qmed-backup.log 2>&1
```

### 5. SSL / HTTPS (Optional but Recommended)
Install Certbot and run it alongside the Nginx container, or place a Cloudflare proxy in front of your server.
