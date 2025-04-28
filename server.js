const express = require('express');
const AWS = require('aws-sdk');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const mysql = require('mysql2/promise');

// Load environment variables from .env file
dotenv.config();

// Function to load parameters from Parameter Store
async function loadParametersFromSSM() {
  try {
    console.log('Loading parameters from AWS Parameter Store...');
    const ssm = new AWS.SSM();
    
    const result = await ssm.getParametersByPath({
      Path: '/idrp/',
      WithDecryption: true
    }).promise();
    
    if (result.Parameters && result.Parameters.length > 0) {
      result.Parameters.forEach(param => {
        // Extract parameter name without the prefix
        const paramName = param.Name.split('/').pop();
        // Set as environment variable
        process.env[paramName] = param.Value;
        console.log(`Loaded parameter: ${paramName}`);
      });
      console.log('Successfully loaded all parameters from Parameter Store');
    } else {
      console.log('No parameters found in Parameter Store, using environment variables from .env file');
    }
  } catch (error) {
    console.error('Error loading parameters from SSM:', error);
    console.log('Falling back to environment variables from .env file');
  }
}

// Create Express app
const app = express();
const port = process.env.PORT || 5001;
const upload = multer({ storage: multer.memoryStorage() });

// Function to reset database connections before starting the server
const resetDatabaseConnections = async () => {
  try {
    // Create a separate connection to reset connections
    const mysql = require('mysql2');
    const resetConnection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: 'admin', // Use admin user for this operation
      password: 'FTUmO16nRBQI8S5FE8YI',
      ssl: { rejectUnauthorized: false }
    });
    
    console.log('Attempting to reset database connections...');
    
    resetConnection.connect((err) => {
      if (err) {
        console.error('Error connecting to database for reset:', err);
        return;
      }
      
      console.log('Connected to database for connection reset');
      
      // Show current processes
      resetConnection.query('SHOW PROCESSLIST', (err, results) => {
        if (err) {
          console.error('Error showing processes:', err);
          return;
        }
        
        console.log(`Found ${results.length} active connections`);
        
        // Kill connections for our application user
        const connectionsToKill = results.filter(process => 
          process.User === 'idrp_app' || process.User === 'admin'
        );
        
        console.log(`Killing ${connectionsToKill.length} connections`);
        
        let killCount = 0;
        connectionsToKill.forEach(process => {
          resetConnection.query(`KILL ${process.Id}`, (killErr) => {
            if (killErr) {
              console.error(`Error killing connection ${process.Id}:`, killErr);
            } else {
              console.log(`Killed connection ${process.Id}`);
              killCount++;
              
              // Close the reset connection after all kills are attempted
              if (killCount === connectionsToKill.length) {
                resetConnection.end();
                console.log('Reset connection closed');
              }
            }
          });
        });
        
        // If no connections to kill, close the reset connection
        if (connectionsToKill.length === 0) {
          resetConnection.end();
          console.log('Reset connection closed - no connections to kill');
        }
      });
    });
    
  } catch (err) {
    console.error('Error resetting connections:', err);
  }
};

// Use the default credentials provider chain (will use instance profile if available)
console.log('Using default AWS credentials provider chain');

// Configure AWS region - use environment variable if set, otherwise use instance metadata service
const getRegion = async () => {
  try {
    // If AWS_REGION is set in environment, use it
    if (process.env.AWS_REGION) {
      console.log(`Using AWS region from environment: ${process.env.AWS_REGION}`);
      return process.env.AWS_REGION;
    }
    
    // Otherwise, try to get region from instance metadata service
    console.log('AWS_REGION not set, attempting to get region from instance metadata');
    const metadata = new AWS.MetadataService();
    return new Promise((resolve, reject) => {
      metadata.request('/latest/meta-data/placement/region', (err, region) => {
        if (err) {
          console.warn('Could not determine region from instance metadata:', err);
          console.log('Falling back to us-east-1');
          resolve('us-east-1');
        } else {
          console.log(`Detected region from instance metadata: ${region}`);
          resolve(region);
        }
      });
    });
  } catch (error) {
    console.warn('Error determining region:', error);
    console.log('Falling back to us-east-1');
    return 'us-east-1';
  }
};

// Set the region asynchronously
getRegion().then(region => {
  AWS.config.update({ region });
  console.log(`AWS SDK configured to use region: ${region}`);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));

// Initialize AWS services
const s3 = new AWS.S3({
  signatureVersion: 'v4' // Important for presigned URLs
});

// Set up RDS signer for IAM authentication - will use the region from AWS.config
const signer = new AWS.RDS.Signer({
  hostname: process.env.DB_HOST,
  port: 3306,
  username: process.env.DB_USER || 'idrp_app'
});

// MySQL database connection pool with IAM authentication and detailed logging
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER || 'idrp_app',
  ssl: { 
    rejectUnauthorized: false  // This allows self-signed certificates
  },
  authPlugins: {
    mysql_clear_password: () => async () => {
      // Get the IAM authentication token with detailed logging
      return new Promise((resolve, reject) => {
        console.log(`Attempting to get auth token for user: ${process.env.DB_USER || 'idrp_app'}`);
        console.log(`Using host: ${process.env.DB_HOST}`);
        
        signer.getAuthToken({}, (err, token) => {
          if (err) {
            console.error('Error getting auth token:', err);
            reject(err);
          } else {
            console.log('Successfully obtained IAM auth token');
            console.log(`Token length: ${token.length} characters`);
            console.log(`Token starts with: ${token.substring(0, 10)}...`);
            resolve(token);
          }
        });
      });
    }
  },
  database: process.env.DB_NAME || 'idrp',
  waitForConnections: true,
  connectionLimit: 5,        // Reduced from 10 to 5
  queueLimit: 0,             // Unlimited queue
  enableKeepAlive: true,     // Keep connections alive
  keepAliveInitialDelay: 10000, // 10 seconds
  idleTimeout: 30000,        // Reduced from 60000 to 30000 (30 seconds)
  maxIdle: 5,                // Reduced from 10 to 5
  acquireTimeout: 10000      // Give up getting a connection after 10 seconds
});

// Add event listeners to monitor the pool
pool.on('connection', (connection) => {
  console.log(`New MySQL connection established with thread ID: ${connection.threadId}`);
});

pool.on('acquire', (connection) => {
  console.log(`Connection ${connection.threadId} acquired from the pool`);
});

pool.on('release', (connection) => {
  console.log(`Connection ${connection.threadId} released back to the pool`);
});

pool.on('error', (err) => {
  console.error('MySQL pool error:', err);
});

// Add a function to end all connections when the server shuts down
process.on('SIGINT', async () => {
  console.log('Closing all database connections...');
  try {
    await pool.end();
    console.log('All connections closed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error closing connections:', err);
    process.exit(1);
  }
});

// Add a periodic connection checker
setInterval(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connection check successful');
    connection.release();
  } catch (err) {
    console.error('Connection check failed:', err);
  }
}, 60000); // Check every minute

// Initialize Cognito Identity Service Provider
const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

// Configure JWT authentication middleware
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: async () => {
      const region = AWS.config.region;
      return `https://cognito-idp.${region}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
    }
  }),
  audience: process.env.COGNITO_CLIENT_ID,
  issuer: async () => {
    const region = AWS.config.region;
    return `https://cognito-idp.${region}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`;
  },
  algorithms: ['RS256']
});

// Create a conditional middleware for JWT checking
const conditionalJwt = (req, res, next) => {
  // Skip JWT check in development mode
  if (process.env.NODE_ENV === 'production') {
    return checkJwt(req, res, next);
  }
  // In development, proceed without authentication
  next();
};

// Endpoint to get documents from RDS MySQL database with S3 metadata and presigned URLs
app.get('/api/documents', async (req, res) => {
  let connection;
  try {
    // Get a connection from the pool
    connection = await pool.getConnection();
    console.log('Connection acquired for /api/documents');
    
    // Get documents from the MySQL database
    const [rows] = await connection.query('SELECT * FROM documents');
    console.log(`Retrieved ${rows.length} documents from database`);
    
    // Get S3 objects for additional metadata
    const bucketName = process.env.S3_BUCKET_NAME;
    
    try {
      const s3Data = await s3.listObjectsV2({ Bucket: bucketName }).promise();
      console.log(`Retrieved ${s3Data.Contents.length} objects from S3 bucket ${bucketName}`);
      
      // Create a map of S3 objects by key for quick lookup
      const s3Objects = {};
      s3Data.Contents.forEach(item => {
        s3Objects[item.Key] = item;
      });
      
      // Combine database records with S3 metadata and generate presigned URLs
      const documents = await Promise.all(rows.map(async (row) => {
        const s3Object = s3Objects[row.title];
        
        // Generate a presigned URL for the S3 object
        let url = null;
        try {
          if (s3Object) {
            const params = {
              Bucket: bucketName,
              Key: row.title,
              Expires: 3600 // URL expires in 1 hour
            };
            url = s3.getSignedUrl('getObject', params);
            console.log(`Generated presigned URL for ${row.title}: ${url.substring(0, 50)}...`);
          }
        } catch (urlError) {
          console.error(`Error generating presigned URL for ${row.title}:`, urlError);
        }
        
        return {
          id: row.id,
          title: row.title,
          lastModified: s3Object ? s3Object.LastModified : null,
          size: s3Object ? s3Object.Size : 0,
          url: url
        };
      }));
      
      console.log(`Sending ${documents.length} documents with S3 metadata and presigned URLs`);
      res.json(documents);
    } catch (s3Error) {
      console.error('Error fetching S3 metadata:', s3Error);
      
      // If S3 fails, return just the database records
      const documents = rows.map(row => ({
        id: row.id,
        title: row.title,
        lastModified: null,
        size: 0,
        url: null
      }));
      
      console.log(`Sending ${documents.length} documents without S3 metadata due to error`);
      res.json(documents);
    }
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: error.message });
  } finally {
    // Always release the connection back to the pool
    if (connection) {
      connection.release();
      console.log('Connection released for /api/documents');
    }
  }
});

// Endpoint to check if a user is in the admin group
app.get('/api/check-admin', conditionalJwt, async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // For development, all users are admins
    res.json({ isAdmin: true });
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to create a new user in Cognito
app.post('/api/signup', async (req, res) => {
  let connection;
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required' });
    }

    const params = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: username,
      TemporaryPassword: password,
      UserAttributes: [
        {
          Name: 'email',
          Value: email
        },
        {
          Name: 'email_verified',
          Value: 'true'
        }
      ]
    };

    try {
      await cognitoIdentityServiceProvider.adminCreateUser(params).promise();
      console.log(`Created user ${username} in Cognito`);
      
      // Set permanent password
      const setPasswordParams = {
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: username,
        Password: password,
        Permanent: true
      };
      
      await cognitoIdentityServiceProvider.adminSetUserPassword(setPasswordParams).promise();
      console.log(`Set permanent password for user ${username}`);
      
      // Get a connection to check if we need to create a user record in our database
      connection = await pool.getConnection();
      console.log(`Connection acquired for user signup: ${username}`);
      
      // You could add user to your own database here if needed
      // const [result] = await connection.query(
      //   'INSERT INTO users (username, email) VALUES (?, ?)',
      //   [username, email]
      // );
      
      res.json({
        message: 'User created successfully',
        username: username
      });
    } catch (cognitoError) {
      console.error('Error creating user in Cognito:', cognitoError);
      res.status(500).json({ error: cognitoError.message });
    }
  } catch (error) {
    console.error('Error processing signup:', error);
    res.status(500).json({ error: error.message });
  } finally {
    // Always release the connection back to the pool
    if (connection) {
      connection.release();
      console.log('Connection released for user signup');
    }
  }
});

// Protected endpoint to upload files to S3 and add to database
app.post('/api/upload', conditionalJwt, upload.single('file'), async (req, res) => {
  let connection;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const bucketName = process.env.S3_BUCKET_NAME;
    
    // Upload to S3
    const params = {
      Bucket: bucketName,
      Key: req.file.originalname,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    };

    try {
      await s3.upload(params).promise();
      console.log(`Uploaded ${req.file.originalname} to S3 bucket ${bucketName}`);
    } catch (s3Error) {
      console.error('Error uploading to S3:', s3Error);
      return res.status(500).json({ error: 'Failed to upload file to S3' });
    }
    
    // Add the document to the database
    try {
      // Get a connection from the pool
      connection = await pool.getConnection();
      console.log(`Connection acquired for uploading file: ${req.file.originalname}`);
      
      const [result] = await connection.query(
        'INSERT INTO documents (title) VALUES (?)',
        [req.file.originalname]
      );
      console.log(`Added document ${req.file.originalname} to database with ID ${result.insertId}`);
      
      // Generate a presigned URL for the uploaded file
      const urlParams = {
        Bucket: bucketName,
        Key: req.file.originalname,
        Expires: 3600 // URL expires in 1 hour
      };
      const url = s3.getSignedUrl('getObject', urlParams);
      console.log(`Generated presigned URL for uploaded file: ${url.substring(0, 50)}...`);
      
      res.json({
        message: 'File uploaded successfully',
        file: {
          id: result.insertId,
          name: req.file.originalname,
          type: req.file.mimetype,
          size: req.file.size,
          url: url
        }
      });
    } catch (dbError) {
      console.error('Error adding document to database:', dbError);
      res.status(500).json({ error: 'Failed to add document to database' });
    }
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({ error: error.message });
  } finally {
    // Always release the connection back to the pool
    if (connection) {
      connection.release();
      console.log(`Connection released for uploading file: ${req.file?.originalname || 'unknown'}`);
    }
  }
});

// Protected endpoint to delete files from S3 and database
app.delete('/api/documents/:id', conditionalJwt, async (req, res) => {
  let connection;
  try {
    const documentId = req.params.id;
    
    // Get a connection from the pool
    connection = await pool.getConnection();
    console.log(`Connection acquired for deleting document ${documentId}`);
    
    // Get the document from the database to get the file name
    const [rows] = await connection.query('SELECT title FROM documents WHERE id = ?', [documentId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const fileName = rows[0].title;
    const bucketName = process.env.S3_BUCKET_NAME;
    
    // Delete from S3
    try {
      await s3.deleteObject({
        Bucket: bucketName,
        Key: fileName
      }).promise();
      console.log(`Deleted ${fileName} from S3 bucket ${bucketName}`);
    } catch (s3Error) {
      console.error('Error deleting from S3:', s3Error);
      return res.status(500).json({ error: 'Failed to delete file from S3' });
    }
    
    // Delete from database
    try {
      await connection.query('DELETE FROM documents WHERE id = ?', [documentId]);
      console.log(`Deleted document with ID ${documentId} from database`);
      
      res.json({
        message: 'Document deleted successfully',
        id: documentId,
        fileName: fileName
      });
    } catch (dbError) {
      console.error('Error deleting from database:', dbError);
      res.status(500).json({ error: 'Failed to delete document from database' });
    }
  } catch (error) {
    console.error('Error processing delete:', error);
    res.status(500).json({ error: error.message });
  } finally {
    // Always release the connection back to the pool
    if (connection) {
      connection.release();
      console.log(`Connection released for deleting document ${req.params.id}`);
    }
  }
});

// Health check endpoint to monitor database connections
app.get('/api/health', async (req, res) => {
  let connection;
  try {
    // Get a connection from the pool
    connection = await pool.getConnection();
    console.log('Connection acquired for health check');
    
    // Perform a simple query to verify database connectivity
    const [rows] = await connection.query('SELECT 1 as healthCheck');
    
    // Get pool statistics (these properties might not be available depending on mysql2 version)
    const stats = {
      threadId: connection.threadId,
      connectionLimit: pool.config.connectionLimit
    };
    
    res.json({ 
      status: 'healthy', 
      database: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    // Always release the connection back to the pool
    if (connection) {
      connection.release();
      console.log('Connection released for health check');
    }
  }
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
}

// Initialize the database connection and start the server
const initializeApp = async () => {
  try {
    // Load parameters from SSM
    await loadParametersFromSSM();
    
    // Reset database connections
    await resetDatabaseConnections();
    
    // Test database connection
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL database');
    
    // Check if the documents table exists
    const [tables] = await connection.query('SHOW TABLES LIKE "documents"');
    if (tables.length === 0) {
      console.log('Documents table does not exist, creating it...');
      await connection.query(`
        CREATE TABLE documents (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL
        )
      `);
      console.log('Documents table created successfully');
    } else {
      console.log('Documents table exists');
      
      // Count documents in the table
      const [countResult] = await connection.query('SELECT COUNT(*) as count FROM documents');
      console.log(`Found ${countResult[0].count} documents in the database`);
    }
    
    connection.release();
    
    // Start the server
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`AWS Region: ${AWS.config.region}`);
      console.log(`S3 Bucket: ${process.env.S3_BUCKET_NAME}`);
      console.log(`Database: ${process.env.DB_HOST}`);
    });
    
    // Catch-all handler for any request that doesn't match the ones above
    app.get('*', (req, res) => {
      if (process.env.NODE_ENV === 'production') {
        res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
      } else {
        res.status(200).send('IDRP API Server is running. In development mode, frontend routes are served by React dev server.');
      }
    });
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
};

initializeApp().catch(err => {
  console.error('Application initialization failed:', err);
  process.exit(1);
});
