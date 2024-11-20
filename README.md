# Backend API Service

A Node.js/Express backend service that provides APIs for the AI Aizent project. This service handles user authentication, agent management, blog posts, newsletters, and more.

## Technology Stack

- **Node.js** and **Express**
- **MongoDB** with Mongoose
- **Passport.js** for authentication
- **Cloudinary** for file uploads
- **JWT** for authorization
- **Nodemailer** for email services

## Prerequisites

- **Node.js** (v14.x or higher)
- **MongoDB** database
- **Cloudinary** account
- **Gmail** account (for email services)

## Environment Variables

Create a `.env` file in the root directory with these variables:

MONGO_URI=your_mongodb_connection_string
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
JWT_SECRET=your_jwt_secret
JWT_SECRET_KEY=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
EMAIL_USER=your_email
EMAIL_PASS=your_email_app_password
NEWS_API_KEY=your_news_api_key
NODE_ENV=development

## Installation

1. **Clone the repository:**

   git clone <repository-url>
   cd Backend

2. **Install dependencies:**

   npm install

## Running the Application

- **Development mode:**

   npm run dev

- **Production mode:**

   npm start

The server will start on https://backend-1-sval.onrender.com by default.

## API Routes

- /api/agents - Agent management
- /api/users - User authentication and management
- /api/admin - Admin functionalities
- /api/usecase - Use cases
- /api/news - News management
- /api/newsletter - Newsletter subscriptions
- /api/blogs - Blog management
- /api/contact - Contact form submissions

## Features

- User authentication (JWT and Google OAuth)
- File uploads to Cloudinary
- Email notifications
- CORS support
- Session management
- MongoDB database integration
- RESTful API endpoints

# Backend Project Structure

```plaintext
Backend/
├── config/
│   ├── cloudinary.js
│   ├── db.js
│   ├── multer.js
│   └── passport.js
├── controllers/
├── models/
│   ├── Agent.js
│   └── Blog.js
├── routes/
├── .env
├── .gitignore
├── App.js
├── package.json
└── README.md
```

## Scripts

- npm start - Start the server
- npm run dev - Start the server with nodemon for development

## Contributing

1. Fork the repository
2. Create your feature branch (git checkout -b feature/AmazingFeature)
3. Commit your changes (git commit -m 'Add some AmazingFeature')
4. Push to the branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

## License

This project is licensed under the ISC License.
"""
