# Unified Order Management System Backend

A powerful, unified backend system that combines order management, inventory tracking, sales analytics, and admin panel functionality.

## Features

### 🛍️ Order Management
- Create and manage orders (regular and bulk)
- Payment integration (PayU, UPI QR codes)
- Order status tracking and updates
- Invoice generation and email notifications
- Shipping label generation

### 👥 User Management
- Role-based access control (Super Admin, Admin, Sales, etc.)
- User authentication with JWT tokens
- Team hierarchy and management
- Sales targets and performance tracking

### 📊 Analytics & Reports
- Dashboard with comprehensive statistics
- Sales performance analytics
- Revenue tracking and forecasting
- Team performance metrics
- Unit economics analysis

### 📦 Inventory Management
- Real-time inventory tracking
- Low stock alerts
- Product management
- SKU management for bulk and wholesale

### 🎯 Sales Management
- Sales enquiry tracking
- Bulk customer management
- Commission settings
- Monthly targets and achievements
- Field sales support

### 🏷️ Marketing Tools
- Discount coupon management
- Review and rating system
- Social media analytics integration
- Launch management

## Technology Stack

- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT tokens, bcrypt
- **Email**: Nodemailer with SMTP
- **PDF Generation**: PDFKit
- **Payments**: PayU integration
- **External Services**: Google Apps Script integration

## Quick Start

### Prerequisites
- Node.js v18 or higher
- MongoDB (local or remote)
- Git

### Installation

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd unified-backend
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the server**
   ```bash
   npm run dev
   ```

4. **Initialize admin user**
   ```bash
   npm run init-admin
   ```

### Manual Installation
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Create .env file
cp .env.example .env

# Start development server
npm run dev
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options:

- **Server**: PORT, NODE_ENV
- **Database**: MONGODB_URI
- **Authentication**: JWT_SECRET
- **Email**: SMTP configuration
- **Payments**: PayU credentials
- **External Services**: Google Apps Script URLs

### Database Setup

The application supports both local and remote MongoDB instances:

```bash
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/oms-unified

# Remote MongoDB (MongoDB Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/oms-unified
```

## API Endpoints

### Public Endpoints
- `GET /api/health` - Health check
- `POST /api/auth/login` - User authentication
- `POST /api/orders` - Create order (public)
- `GET /api/reviews` - Get approved reviews

### Protected Endpoints (require authentication)
- `GET /api/orders` - Get all orders
- `GET /api/dashboard` - Dashboard statistics
- `POST /api/bulk-orders` - Create bulk order
- `GET /api/analytics/*` - Various analytics endpoints
- `POST /api/users` - Create user (admin only)

See `src/routes/index.ts` for complete API documentation.

## Project Structure

```
unified-backend/
├── src/
│   ├── config/           # Configuration settings
│   ├── controllers/      # Route handlers
│   ├── middleware/       # Authentication & validation
│   ├── models/          # Database models (Mongoose)
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic services
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── app.ts           # Express app configuration
│   └── server.ts        # Server startup
├── public/              # Static frontend files
├── uploads/             # File upload storage
├── dist/                # Compiled JavaScript
├── scripts/             # Utility scripts
└── package.json
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run init-admin` - Initialize admin user
- `npm run build:frontend` - Build and copy frontend assets

### Code Style
- TypeScript with strict mode
- ESLint for linting
- Prettier for formatting
- Path mapping for clean imports

### Database Models
- **User**: Admin users with roles and permissions
- **Order**: Order management with status tracking
- **BulkCustomer**: Saved customers for bulk orders
- **Coupon**: Discount coupon management

## Deployment

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set environment variables**
   ```bash
   export NODE_ENV=production
   export PORT=3003
   export MONGODB_URI=your-production-mongodb-url
   ```

3. **Start the server**
   ```bash
   npm start
   ```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3003
CMD ["node", "dist/server.js"]
```

### Environment-specific Notes

- **Development**: Uses nodemon for hot reload
- **Production**: Optimized builds, error handling
- **Security**: Rate limiting, CORS, helmet

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check MONGODB_URI in .env
   - Ensure MongoDB is running
   - Verify network connectivity

2. **Authentication Issues**
   - Check JWT_SECRET configuration
   - Verify user credentials
   - Check token expiration

3. **Email Not Sending**
   - Verify SMTP configuration
   - Check email provider settings
   - Test with email service logs

4. **Frontend Not Loading**
   - Run `npm run build:frontend`
   - Check public folder contents
   - Verify static file serving

### Logs and Debugging

- Development: Detailed console logs
- Production: Error logs only
- MongoDB: Connection status logs
- API: Request/response logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints
- Check environment configuration

---

**The Awla Company** - Unified Order Management System