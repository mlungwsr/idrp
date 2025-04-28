-- SQL script to set up IAM authentication for the IDRP application
-- Run this on your RDS MySQL instance

-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS idrp;

-- Use the database
USE idrp;

-- Create a user that uses IAM authentication
CREATE USER 'idrp_app'@'%' IDENTIFIED WITH AWSAuthenticationPlugin AS 'RDS';

-- Grant necessary permissions to the user
GRANT SELECT, INSERT, UPDATE, DELETE ON idrp.* TO 'idrp_app'@'%';

-- If you need to create the documents table
CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL
);

-- Apply the changes
FLUSH PRIVILEGES;
