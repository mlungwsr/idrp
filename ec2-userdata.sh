#!/bin/bash
set -e

# Update system packages
dnf update -y

# Install Git
dnf install -y git

# Install Node.js
dnf install -y nodejs

# Install Docker
dnf install -y docker
systemctl start docker
systemctl enable docker

# Add ec2-user to docker group
usermod -aG docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.23.3/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone the repository
cd /home/ec2-user
git clone https://github.com/mlungwsr/idrp.git
cd idrp

# Run the parameter setup script
chmod +x setup-parameters.sh
./setup-parameters.sh

# Start the application using Docker Compose
docker-compose up -d
