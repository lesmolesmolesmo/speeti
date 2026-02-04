# Speeti - Delivery Service Application

## Overview

Speeti is a Flink-style grocery delivery service application focused on the Münster, Germany market. The application enables customers to order groceries and have them delivered within 15 minutes. It consists of three main interfaces: a customer-facing app for browsing and ordering products, a driver app for order fulfillment and delivery, and an admin dashboard for managing products, orders, and operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with Vite as the build tool
- **Styling**: Tailwind CSS with a custom pink/rose color palette matching Flink's branding
- **State Management**: Zustand with persistence middleware for client-side state
- **Animations**: Framer Motion for UI transitions
- **Real-time**: Socket.io-client for live order tracking and driver chat
- **Maps**: Mapbox GL for location services and delivery tracking
- **Routing**: React Router DOM for navigation

### Backend Architecture
- **Framework**: Express.js on Node.js (minimum version 18)
- **Database**: SQLite using better-sqlite3 for synchronous, performant queries
- **Real-time**: Socket.io for WebSocket connections (order updates, chat)
- **Authentication**: JWT-based authentication with bcryptjs for password hashing
- **File Uploads**: Multer for handling product images
- **Image Processing**: Sharp for image optimization
- **Rate Limiting**: express-rate-limit to protect against abuse

### Database Schema
SQLite database (`speeti.db`) with tables for:
- `users` - Customer, driver, and admin accounts with role-based access
- `products` - Product catalog with pricing, units, deposits, and inventory
- `categories` - Product categorization with icons and colors
- `orders` - Order management with status tracking and payment info
- `order_items` - Individual items within orders
- `addresses` - Customer delivery addresses with detailed fields
- `reviews` - Post-delivery ratings for orders and drivers

### API Structure
RESTful API under `/api` prefix with endpoints for:
- `/auth/*` - Authentication (login, register)
- `/products` - Product CRUD operations
- `/categories` - Category management
- `/orders` - Order creation and tracking
- `/addresses` - Address management
- `/track/:orderNumber` - Public order tracking with token verification
- Admin-specific endpoints for dashboard operations

### Key Design Patterns
- **Monorepo Structure**: Separate `/frontend` and `/backend` directories with root-level orchestration
- **API Proxy**: Vite dev server proxies `/api` requests to Express backend
- **Persistent Cart**: Zustand persist middleware stores cart state in localStorage
- **Token-based Tracking**: Orders include tracking tokens for secure public access
- **German Localization**: All user-facing content in German, currency in EUR

## External Dependencies

### Payment Processing
- **Stripe**: Payment processing for card payments (`stripe` package)
- Payment methods include: Stripe, cash on delivery

### Email Services
- **Resend**: Transactional email delivery for order confirmations and status updates
- Email templates include order confirmation, status updates (preparing, delivering, delivered)

### PDF Generation
- **PDFKit**: Invoice generation in German format with company branding

### Image Processing
- **Sharp**: Server-side image optimization for product photos

### Maps & Geocoding
- **Mapbox GL**: Frontend map rendering and geocoding for address input
- Used for delivery tracking visualization

### Environment Variables Required
- `JWT_SECRET` - Secret key for JWT signing
- `STRIPE_SECRET_KEY` - Stripe API key for payments
- `RESEND_API_KEY` - Resend API key for emails
- `FROM_EMAIL` - Sender email address for transactional emails
- Mapbox token configured in frontend for map services