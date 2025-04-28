#!/bin/bash
set -e

# Update system packages
yum update -y

# Install Git
yum install -y git

# Install Node.js
curl -sL https://rpm.nodesource.com/setup_16.x | bash -
yum install -y nodejs

# Install Docker (if needed for your application)
yum install -y docker
systemctl start docker
systemctl enable docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone the repository
cd /home/ec2-user
git clone https://github.com/mlungwsr/idrp.git
cd idrp

# Set up AWS credentials for Parameter Store access
# Assuming the EC2 instance has an IAM role with appropriate permissions

# Run the parameter setup script
chmod +x setup-parameters.sh
./setup-parameters.sh

# Start the application using Docker Compose
docker-compose up -d

# Alternatively, if not using Docker:
# npm install
# npm run build
# npm start
