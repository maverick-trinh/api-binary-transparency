# Project Structure Refactoring

This document outlines the improved project structure for the Binary Transparency API.

## New Structure

```
src/
├── app.ts                    # Express app configuration
├── server.ts                 # Server startup and configuration
├── config/                   # Configuration files
│   ├── environment.ts        # Environment variables
│   ├── logger.ts            # Logger configuration
│   └── swagger.ts           # Swagger/OpenAPI configuration
├── controllers/             # Request handlers
│   └── walrusController.ts  # Walrus-related endpoints
├── services/               # Business logic
│   └── walrusService.ts    # Walrus operations service
├── routes/                 # Route definitions
│   ├── index.ts           # Main router
│   └── walrusRoutes.ts    # Walrus-specific routes
├── middleware/            # Express middleware
│   └── errorHandler.ts    # Error handling middleware
├── utils/                 # Utility functions
│   └── helpers.ts         # Helper functions (base64 encoding, etc.)
├── lib/                   # Library code (existing)
├── factory/              # Factory patterns (existing)
├── types/                # Type definitions
└── models/               # Data models (if needed)
```

## Key Improvements

### 1. **Separation of Concerns**
- **Controllers**: Handle HTTP requests/responses
- **Services**: Contain business logic
- **Routes**: Define API endpoints
- **Middleware**: Handle cross-cutting concerns

### 2. **Configuration Management**
- Centralized environment variable handling
- Proper TypeScript typing for environment variables
- Swagger configuration separated from main app

### 3. **Error Handling**
- Centralized error handling middleware
- Proper 404 handling
- Consistent error response format

### 4. **Utility Functions**
- Moved to dedicated utils folder
- Reusable base64 encoding functions
- Clean separation from business logic

### 5. **Type Safety**
- Fixed SUI_NETWORK type issues
- Proper typing for environment variables
- Better TypeScript configuration

## API Endpoints

- `GET /api/fetch-blobs` - Fetch blob data from Walrus network
- `GET /api-docs` - Swagger API documentation

## Environment Variables

The following environment variables are supported:

- `SUI_NETWORK`: 'testnet' | 'mainnet' | 'devnet' | 'localnet' (default: 'testnet')
- `WALRUS_NETWORK`: 'testnet' | 'mainnet' (default: 'testnet')
- `NODE_ENV`: Environment mode (default: 'development')
- `PORT`: Server port (default: 5000)
- `PORTAL_DOMAIN_NAME_LENGTH`: Portal domain length (default: 7)
- And others as defined in `config/environment.ts`

## Running the Application

1. **Development**: `npm run dev`
2. **Build**: `npm run build`
3. **Production**: `npm start`

## Benefits of This Structure

1. **Maintainability**: Clear separation makes code easier to maintain
2. **Scalability**: Easy to add new controllers, services, and routes
3. **Testability**: Each component can be tested independently
4. **Reusability**: Services and utilities can be reused across controllers
5. **Type Safety**: Better TypeScript support and error catching
6. **Documentation**: Clear API documentation with Swagger

This structure follows Node.js/Express best practices and makes the codebase more professional and maintainable.
