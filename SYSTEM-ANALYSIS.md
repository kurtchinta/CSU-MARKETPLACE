# CSU MARKETPLACE - SYSTEM ANALYSIS DOCUMENT

**Version:** 1.0  
**Date:** November 20, 2025  
**Project:** CSU Marketplace - Blockchain-Integrated Campus Trading Platform  
**Repository:** https://github.com/kurtchinta/CSU-MARKETPLACE

---

## 1. CONCEPTUAL FRAMEWORK

### 1.1 System Overview

The CSU Marketplace is a blockchain-integrated campus trading platform designed to facilitate secure peer-to-peer transactions among Cagayan State University students and faculty. The system combines traditional web technologies with blockchain infrastructure to ensure transaction transparency, immutability, and accountability.

### 1.2 Input-Process-Output (IPO) Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                            INPUT LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│ User Inputs:                                                         │
│ • User Registration (Email, Password, Student/Faculty ID)           │
│ • Product Listings (Name, Description, Price, Images, Category)     │
│ • Search Queries (Keywords, Categories, Filters)                    │
│ • Transaction Requests (Orders, Messages, Payments)                 │
│ • Reviews & Ratings                                                  │
│ • Wallet Connection (MetaMask Address)                              │
│                                                                      │
│ System Inputs:                                                       │
│ • Blockchain Events (Transaction confirmations, Gas fees)           │
│ • Authentication Tokens (JWT, Session management)                   │
│ • File Uploads (Images: JPEG, PNG, WebP - max 5MB)                 │
│ • Database Triggers (Auto-updates, Notifications)                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          PROCESS LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│ Frontend Processing (React + TypeScript):                           │
│ • User Interface Rendering                                          │
│ • Form Validation & Data Sanitization                              │
│ • State Management (Context API)                                    │
│ • Client-side Routing                                               │
│ • Real-time UI Updates                                              │
│                                                                      │
│ Backend Processing (Supabase + PostgreSQL):                         │
│ • Authentication & Authorization (Row Level Security)               │
│ • Database CRUD Operations                                          │
│ • File Storage Management (Supabase Storage)                        │
│ • Business Logic Execution (Triggers, Functions)                    │
│ • Data Validation & Sanitization                                    │
│ • Notification Generation                                           │
│                                                                      │
│ Blockchain Processing (Ethereum/Sepolia + Hardhat):                 │
│ • Smart Contract Deployment                                         │
│ • Transaction Recording (createTransaction)                         │
│ • Order Status Updates (accept/reject/complete/cancel)              │
│ • Blockchain Event Emission                                         │
│ • Gas Fee Calculation                                               │
│ • Transaction Verification & Confirmation                           │
│                                                                      │
│ Integration Processing:                                              │
│ • Supabase ↔ Blockchain Synchronization                            │
│ • Wallet ↔ User Account Linking                                     │
│ • Image Optimization & CDN Delivery                                 │
│ • Analytics Data Aggregation                                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          OUTPUT LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│ User Outputs:                                                        │
│ • Product Listings Display (Grid/List views)                        │
│ • Transaction Confirmations (Success/Error messages)                │
│ • Order Status Updates (Pending/Accepted/Completed)                 │
│ • User Dashboards (Sales, Purchases, Analytics)                     │
│ • Notifications (Real-time alerts)                                  │
│ • Reviews & Ratings Display                                         │
│ • Search Results                                                     │
│                                                                      │
│ Blockchain Outputs:                                                  │
│ • Transaction Hashes (0x...)                                        │
│ • Blockchain IDs (Sequential counter)                               │
│ • Smart Contract Events (TransactionCreated, TransactionAccepted)   │
│ • Gas Usage Reports                                                 │
│ • Block Numbers & Timestamps                                        │
│                                                                      │
│ System Outputs:                                                      │
│ • Audit Logs (Admin actions, User activities)                       │
│ • Analytics Reports (Sales trends, Popular categories)              │
│ • Email Notifications (Order confirmations, Updates)                │
│ • Error Logs & System Monitoring Data                               │
│ • Database Backups & Transaction Records                            │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 System Architecture Paradigm

The CSU Marketplace follows a **Hybrid Decentralized Architecture** that combines:

1. **Traditional Centralized Web Application** (Frontend + Supabase Backend)
   - Fast data retrieval and user experience
   - Real-time updates and notifications
   - Rich user interface and responsive design

2. **Decentralized Blockchain Layer** (Ethereum Smart Contracts)
   - Immutable transaction records
   - Transparent order history
   - Tamper-proof audit trail

3. **Integration Layer**
   - Bridges centralized database with blockchain
   - Synchronizes order status across systems
   - Ensures data consistency and integrity

### 1.4 Core Conceptual Components

```
┌──────────────────────────────────────────────────────────────┐
│                     USER LAYER                                │
│  • Buyers (Students/Faculty)                                  │
│  • Sellers (Students/Faculty)                                 │
│  • Administrators (System managers)                           │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                 PRESENTATION LAYER                            │
│  • React Components (TypeScript)                              │
│  • TailwindCSS Styling                                        │
│  • Responsive Design                                          │
│  • Context API State Management                               │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│               APPLICATION LAYER                               │
│  • Authentication Service (AuthContext)                       │
│  • Product Service (CRUD operations)                          │
│  • Cart Service (Shopping cart management)                    │
│  • Blockchain Service (Smart contract integration)            │
│  • Notification Service                                       │
│  • Analytics Service                                          │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                  DATA LAYER                                   │
│  ┌──────────────────┐        ┌───────────────────┐          │
│  │  Supabase        │        │   Blockchain      │          │
│  │  PostgreSQL      │◄──────►│   (Sepolia)       │          │
│  │  • Users         │        │   • Smart Contract│          │
│  │  • Products      │        │   • Transactions  │          │
│  │  • Orders        │        │   • Events        │          │
│  │  • Transactions  │        │                   │          │
│  └──────────────────┘        └───────────────────┘          │
└──────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│               STORAGE LAYER                                   │
│  • Supabase Storage (Images, Files)                           │
│  • IPFS/CDN (Optional distributed storage)                    │
│  • Browser LocalStorage (Temporary cache)                     │
└──────────────────────────────────────────────────────────────┘
```

### 1.5 Key Business Processes

1. **User Registration & Authentication**
   - Email/password registration with Supabase Auth
   - Optional wallet linking (MetaMask)
   - Email verification and profile setup

2. **Product Listing Management**
   - Sellers create listings (FOR_SALE, FOR_RENT, SERVICE)
   - Admin approval workflow
   - Image upload and storage
   - Category classification

3. **Order & Transaction Flow**
   - Buyer places order → Creates Supabase order_details + Blockchain transaction (PENDING)
   - Seller accepts → Creates new blockchain transaction (ACCEPTED)
   - Seller rejects → Creates new blockchain transaction (REJECTED)
   - Buyer/Seller completes → Creates new blockchain transaction (COMPLETED)
   - Buyer cancels → Creates new blockchain transaction (CANCELLED)

4. **Blockchain Integration**
   - Each status change creates a NEW immutable blockchain record
   - Smart contract events logged on Sepolia testnet
   - Complete audit trail for all transactions
   - Wallet-agnostic design (any wallet can perform actions)

5. **Review & Rating System**
   - Buyers review completed transactions
   - Ratings update seller profiles
   - Optional review images (max 5)

### 1.6 Data Flow Architecture

```
User Action → Frontend Validation → Service Layer → Dual Write:
                                                      ├─► Supabase (Fast DB update)
                                                      └─► Blockchain (Immutable record)
                                          ↓
                              Event Listeners ← Blockchain Events
                                          ↓
                              Update UI + Notifications
```

### 1.7 Security Model

- **Authentication:** Supabase Auth (JWT tokens, email verification)
- **Authorization:** Row Level Security (RLS) policies in PostgreSQL
- **Data Validation:** Client-side + Server-side validation
- **Blockchain Security:** Smart contract validation, wallet signatures
- **File Storage:** Supabase Storage with access policies
- **API Security:** Token-based authentication, rate limiting

---

## 2. AGILE DEVELOPMENT APPROACH

### 2.1 Agile Methodology Implementation

The CSU Marketplace project follows **Scrum Framework** with iterative development cycles:

#### Sprint Structure
- **Sprint Duration:** 2 weeks
- **Sprint Planning:** Define user stories and tasks
- **Daily Standups:** Progress tracking and blocker identification
- **Sprint Review:** Demo completed features
- **Sprint Retrospective:** Continuous improvement

### 2.2 Development Phases

```
Phase 1: Foundation (Weeks 1-2)
├─ Sprint 1: Core Infrastructure
│  ├─ Database schema design and implementation
│  ├─ Supabase setup and configuration
│  ├─ Basic authentication system
│  ├─ Project scaffolding (React + TypeScript)
│  └─ Smart contract initial development

Phase 2: Core Features (Weeks 3-6)
├─ Sprint 2: User Management
│  ├─ User registration and login
│  ├─ Profile management
│  ├─ Wallet integration (MetaMask)
│  └─ Role-based access control
│
├─ Sprint 3: Product Management
│  ├─ Product listing creation
│  ├─ Image upload functionality
│  ├─ Category management
│  ├─ Product browsing and search
│  └─ Admin approval workflow

Phase 3: Transaction System (Weeks 7-10)
├─ Sprint 4: Cart & Checkout
│  ├─ Shopping cart functionality
│  ├─ Order placement system
│  ├─ Blockchain integration
│  └─ Order management dashboard
│
├─ Sprint 5: Order Processing
│  ├─ Seller order acceptance/rejection
│  ├─ Order completion workflow
│  ├─ Blockchain transaction recording
│  └─ Transaction history tracking

Phase 4: Advanced Features (Weeks 11-14)
├─ Sprint 6: Reviews & Analytics
│  ├─ Review and rating system
│  ├─ User analytics dashboard
│  ├─ Admin analytics panel
│  └─ Notification system
│
├─ Sprint 7: Optimization & Polish
│  ├─ Performance optimization
│  ├─ UI/UX improvements
│  ├─ Security hardening
│  └─ Bug fixes and testing

Phase 5: Deployment (Weeks 15-16)
├─ Sprint 8: Production Release
│  ├─ Final testing (Unit, Integration, E2E)
│  ├─ Smart contract deployment (Sepolia)
│  ├─ Production deployment
│  ├─ Documentation completion
│  └─ User training and handover
```

### 2.3 Agile Principles Applied

1. **Iterative Development**
   - Features delivered in functional increments
   - Regular feedback incorporation
   - Continuous integration and deployment

2. **User-Centric Design**
   - User stories drive development
   - Regular user testing and feedback
   - Responsive to changing requirements

3. **Collaborative Approach**
   - Cross-functional team collaboration
   - Daily communication and transparency
   - Shared ownership and responsibility

4. **Quality Assurance**
   - Test-driven development (TDD)
   - Code reviews and pair programming
   - Automated testing pipelines

5. **Continuous Improvement**
   - Regular retrospectives
   - Process optimization
   - Technical debt management

### 2.4 User Stories (Sample)

```
Epic: Product Management
├─ US-001: As a seller, I want to create product listings
│  Acceptance Criteria:
│  ✓ Can upload up to 5 images
│  ✓ Can select listing type (FOR_SALE, FOR_RENT, SERVICE)
│  ✓ Can set price and quantity
│  ✓ Can specify pickup/meetup location
│
├─ US-002: As a buyer, I want to search for products
│  Acceptance Criteria:
│  ✓ Can search by keyword
│  ✓ Can filter by category
│  ✓ Can sort by price/date
│  ✓ Can view product details
│
└─ US-003: As an admin, I want to approve listings
   Acceptance Criteria:
   ✓ Can view pending listings
   ✓ Can approve or reject with reason
   ✓ Seller receives notification of decision

Epic: Transaction Management
├─ US-004: As a buyer, I want to place orders
│  Acceptance Criteria:
│  ✓ Can add items to cart
│  ✓ Can checkout and place order
│  ✓ Order recorded on blockchain
│  ✓ Seller receives notification
│
├─ US-005: As a seller, I want to manage orders
│  Acceptance Criteria:
│  ✓ Can view pending orders
│  ✓ Can accept/reject orders
│  ✓ Can set final pickup location
│  ✓ Blockchain transaction created
│
└─ US-006: As a user, I want to complete transactions
   Acceptance Criteria:
   ✓ Can mark order as completed
   ✓ Blockchain record updated
   ✓ Can leave review after completion
```

### 2.5 Sprint Backlog Management

**Backlog Prioritization:**
- **P0 (Critical):** Core functionality (Auth, Products, Orders)
- **P1 (High):** Essential features (Search, Cart, Blockchain)
- **P2 (Medium):** Enhanced features (Reviews, Analytics)
- **P3 (Low):** Nice-to-have (Advanced filters, Themes)

**Definition of Done:**
- [ ] Code written and reviewed
- [ ] Unit tests passed (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging environment
- [ ] Product owner approval
- [ ] No critical bugs

### 2.6 Risk Management

| Risk | Impact | Mitigation Strategy |
|------|--------|-------------------|
| Blockchain integration complexity | High | Early prototyping, extensive testing on Sepolia testnet |
| Scalability issues | Medium | Database indexing, query optimization, caching |
| Security vulnerabilities | High | Regular security audits, RLS policies, input validation |
| Third-party API failures (Supabase) | Medium | Error handling, fallback mechanisms, monitoring |
| Gas fee volatility | Low | Use testnet (Sepolia), minimize blockchain writes |

---

## 3. SYSTEM FLOWCHARTS

### 3.1 Main System Flowchart

```
                         START
                           │
                           ▼
                    ┌──────────────┐
                    │ Landing Page │
                    └──────┬───────┘
                           │
                           ▼
                  ┌────────────────────┐
                  │ User Authenticated? │
                  └────┬───────────┬───┘
                       │ No        │ Yes
                       ▼           ▼
              ┌──────────────┐  ┌──────────────┐
              │ Login/Signup │  │ Main Dashboard│
              └──────┬───────┘  └──────┬────────┘
                     │                  │
                     └──────────┬───────┘
                                ▼
                    ┌─────────────────────┐
                    │   User Role Check   │
                    └──┬──────────────┬───┘
                       │              │
              ┌────────┴────┐    ┌────┴────────┐
              │   Admin     │    │ Regular User│
              └────┬────────┘    └────┬────────┘
                   │                  │
                   ▼                  ▼
        ┌──────────────────┐  ┌─────────────────────┐
        │ Admin Dashboard  │  │    User Actions     │
        │ • Approve Lists  │  │ • Browse Products   │
        │ • View Analytics │  │ • Create Listing    │
        │ • Manage Users   │  │ • Place Order       │
        └──────────────────┘  │ • Manage Cart       │
                              │ • View Orders       │
                              │ • Leave Reviews     │
                              └─────────────────────┘
```

### 3.2 User Registration & Authentication Flow

```
        START (New User)
              │
              ▼
    ┌──────────────────────┐
    │ Enter Registration   │
    │ Details:             │
    │ • Email              │
    │ • Password           │
    │ • First/Last Name    │
    │ • ID Number          │
    │ • Department         │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Validate Input       │
    │ • Email format       │
    │ • Password strength  │
    │ • ID uniqueness      │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐      ┌─────────────┐
    │ Create Supabase      │─No──►│ Show Error  │
    │ Auth User            │      │ Message     │
    └──────┬───────────────┘      └─────────────┘
           │ Yes
           ▼
    ┌──────────────────────┐
    │ Insert User Profile  │
    │ into users table     │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Send Verification    │
    │ Email                │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Redirect to          │
    │ Email Confirmation   │
    │ Page                 │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ User Clicks          │◄─────┐
    │ Verification Link    │      │
    └──────┬───────────────┘      │
           │                       │
           ▼                       │
    ┌──────────────────────┐      │
    │ Email Verified?      │──No──┘
    └──────┬───────────────┘
           │ Yes
           ▼
    ┌──────────────────────┐
    │ Update is_verified   │
    │ = TRUE               │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Optional: Link       │
    │ MetaMask Wallet      │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Redirect to          │
    │ Dashboard            │
    └──────────────────────┘
           │
           ▼
          END
```

### 3.3 Product Listing Creation Flow

```
    START (Seller)
          │
          ▼
    ┌──────────────────────┐
    │ Click "Create        │
    │ Listing" Button      │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Select Listing Type  │
    │ • FOR_SALE           │
    │ • FOR_RENT           │
    │ • SERVICE            │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Fill Product Details │
    │ • Name               │
    │ • Description        │
    │ • Price              │
    │ • Category           │
    │ • Quantity           │
    │ • Condition          │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Upload Images        │
    │ (Max 5, 5MB each)    │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Add Type-Specific    │
    │ Details:             │
    │ SALE: Pickup loc     │
    │ RENT: Duration       │
    │ SERVICE: Schedule    │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Validate Form Data   │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐      ┌─────────────┐
    │ Upload Images to     │─Fail─►│ Show Error  │
    │ Supabase Storage     │      └─────────────┘
    └──────┬───────────────┘
           │ Success
           ▼
    ┌──────────────────────┐
    │ Insert Product into  │
    │ products table       │
    │ (status = PENDING)   │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Insert Image Records │
    │ into product_images  │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Notify Admin for     │
    │ Approval             │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Show Success Message │
    │ "Pending Approval"   │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Redirect to          │
    │ My Listings Page     │
    └──────────────────────┘
           │
           ▼
          END
```

### 3.4 Order Placement & Transaction Flow

```
    START (Buyer)
          │
          ▼
    ┌──────────────────────┐
    │ Browse Products      │
    │ Apply Filters        │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ View Product Details │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Add to Cart or       │
    │ Buy Now              │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Review Cart Items    │
    │ Adjust Quantities    │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Click Checkout       │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Fill Order Details   │
    │ • Pickup/Meetup loc  │
    │ • Message to seller  │
    │ • Requirements       │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐      ┌─────────────┐
    │ Wallet Connected?    │─No──►│ Connect     │
    └──────┬───────────────┘      │ MetaMask    │
           │ Yes                   └──────┬──────┘
           │◄────────────────────────────┘
           ▼
    ┌──────────────────────┐
    │ Validate Order Data  │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Create Order in      │
    │ order_details table  │
    │ (status = pending)   │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Call Smart Contract  │
    │ createTransaction()  │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐      ┌─────────────┐
    │ Blockchain TX        │─Fail─►│ Rollback    │
    │ Successful?          │      │ Order       │
    └──────┬───────────────┘      └─────────────┘
           │ Success
           ▼
    ┌──────────────────────┐
    │ Update transactions  │
    │ table with:          │
    │ • blockchain_id      │
    │ • tx_hash            │
    │ • status = PENDING   │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Notify Seller        │
    │ (New Order)          │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Clear Cart           │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Show Success & TX    │
    │ Hash to Buyer        │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Redirect to          │
    │ My Orders Page       │
    └──────────────────────┘
           │
           ▼
          END
```

### 3.5 Seller Order Management Flow

```
    START (Seller receives order notification)
          │
          ▼
    ┌──────────────────────┐
    │ View Order Details   │
    │ • Buyer info         │
    │ • Product details    │
    │ • Quantity           │
    │ • Buyer message      │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Seller Decision      │
    └──┬────────────────┬──┘
       │                │
    Accept          Reject
       │                │
       ▼                ▼
┌──────────────┐  ┌──────────────────┐
│ Set Final    │  │ Enter Rejection  │
│ Pickup/      │  │ Reason           │
│ Meetup       │  └────────┬─────────┘
│ Location     │           │
└──────┬───────┘           │
       │                   │
       ▼                   ▼
┌──────────────┐  ┌──────────────────┐
│ Call Smart   │  │ Call Smart       │
│ Contract     │  │ Contract         │
│ acceptTx()   │  │ rejectTx()       │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       ▼                   ▼
┌──────────────┐  ┌──────────────────┐
│ Create NEW   │  │ Create NEW       │
│ Blockchain   │  │ Blockchain TX    │
│ TX (ACCEPTED)│  │ (REJECTED)       │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       ▼                   ▼
┌──────────────┐  ┌──────────────────┐
│ Update       │  │ Update           │
│ transactions │  │ transactions     │
│ table        │  │ table            │
│ • New TX rec │  │ • New TX record  │
│ • ACCEPTED   │  │ • REJECTED       │
│ • final_loc  │  │ • rejection_msg  │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       ▼                   ▼
┌──────────────┐  ┌──────────────────┐
│ Notify Buyer │  │ Notify Buyer     │
│ (Accepted)   │  │ (Rejected)       │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       └──────┬────────────┘
              ▼
       ┌──────────────┐
       │ Show Success │
       │ Message      │
       └──────┬───────┘
              │
              ▼
             END
```

### 3.6 Transaction Completion Flow

```
    START (Buyer or Seller)
          │
          ▼
    ┌──────────────────────┐
    │ View Order with      │
    │ status = ACCEPTED    │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Physical Exchange    │
    │ Completed?           │
    └──────┬───────────────┘
           │ Yes
           ▼
    ┌──────────────────────┐
    │ Click "Mark as       │
    │ Completed"           │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Confirm Completion   │
    │ Dialog               │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Call Smart Contract  │
    │ completeTransaction()│
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Create NEW Blockchain│
    │ TX (COMPLETED)       │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Update transactions  │
    │ table:               │
    │ • New TX record      │
    │ • COMPLETED status   │
    │ • completed_at       │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Update User Stats:   │
    │ • Seller: revenue++  │
    │ • Buyer: orders++    │
    │ • Product: sold++    │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Notify Both Parties  │
    │ (Completed)          │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Buyer: Enable        │
    │ Review Option        │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Show Success         │
    │ Message              │
    └──────────────────────┘
           │
           ▼
          END
```

### 3.7 Admin Approval Workflow

```
    START (Admin)
          │
          ▼
    ┌──────────────────────┐
    │ View Pending         │
    │ Products List        │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Select Product to    │
    │ Review               │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ View Product Details │
    │ • Images             │
    │ • Description        │
    │ • Price              │
    │ • Seller info        │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Validate:            │
    │ • Appropriate content│
    │ • Correct category   │
    │ • Valid pricing      │
    │ • Image quality      │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Admin Decision       │
    └──┬────────────────┬──┘
       │                │
    Approve          Reject
       │                │
       ▼                ▼
┌──────────────┐  ┌──────────────────┐
│ Update       │  │ Enter Rejection  │
│ products:    │  │ Reason           │
│ • status =   │  └────────┬─────────┘
│   APPROVED   │           │
│ • approved_by│           ▼
│ • approved_at│  ┌──────────────────┐
└──────┬───────┘  │ Update products: │
       │          │ • status =       │
       │          │   REJECTED       │
       │          │ • rejected_at    │
       │          └────────┬─────────┘
       │                   │
       ▼                   ▼
┌──────────────┐  ┌──────────────────┐
│ Product      │  │ Product Not      │
│ Now Visible  │  │ Visible          │
│ to Buyers    │  │                  │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       ▼                   ▼
┌──────────────┐  ┌──────────────────┐
│ Notify Seller│  │ Notify Seller    │
│ (Approved)   │  │ (Rejected +      │
│              │  │  reason)         │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       ▼                   ▼
┌──────────────┐  ┌──────────────────┐
│ Log Admin    │  │ Log Admin Action │
│ Action       │  │                  │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       └──────┬────────────┘
              ▼
       ┌──────────────┐
       │ Return to    │
       │ Pending List │
       └──────────────┘
              │
              ▼
             END
```

---

## 4. USE CASE DIAGRAM

### 4.1 System Actors

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ACTORS                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  👤 Buyer (Student/Faculty)                                         │
│     - Browse and search products                                     │
│     - Place orders                                                   │
│     - Manage cart                                                    │
│     - Leave reviews                                                  │
│     - View order history                                             │
│                                                                      │
│  👤 Seller (Student/Faculty)                                        │
│     - Create product listings                                        │
│     - Manage listings                                                │
│     - Accept/reject orders                                           │
│     - Complete transactions                                          │
│     - View sales analytics                                           │
│                                                                      │
│  👤 Admin (System Manager)                                          │
│     - Approve/reject listings                                        │
│     - Manage users                                                   │
│     - View system analytics                                          │
│     - Monitor transactions                                           │
│     - Generate reports                                               │
│                                                                      │
│  🔗 Blockchain System (Sepolia Network)                             │
│     - Record transactions                                            │
│     - Validate operations                                            │
│     - Emit events                                                    │
│     - Provide immutable audit trail                                  │
│                                                                      │
│  📧 Notification System (Supabase)                                  │
│     - Send email notifications                                       │
│     - Create in-app notifications                                    │
│     - Trigger automated alerts                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Use Case Diagram (Text Representation)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    CSU MARKETPLACE USE CASE DIAGRAM                         │
└────────────────────────────────────────────────────────────────────────────┘

                                  ┌──────────────────┐
                                  │  CSU MARKETPLACE │
                                  │     SYSTEM       │
                                  └──────────────────┘
                                           │
        ┌──────────────────────────────────┼──────────────────────────────────┐
        │                                  │                                  │
   ┌────▼────┐                        ┌────▼────┐                      ┌─────▼────┐
   │  BUYER  │                        │ SELLER  │                      │  ADMIN   │
   └────┬────┘                        └────┬────┘                      └─────┬────┘
        │                                  │                                  │
        │                                  │                                  │
   ┌────┴─────────────────────┐      ┌────┴─────────────────────┐      ┌────┴──────────────────┐
   │ UC-01: Register Account  │      │ UC-01: Register Account  │      │ UC-13: Approve        │
   │ UC-02: Login             │      │ UC-02: Login             │      │        Listings       │
   │ UC-03: Browse Products   │      │ UC-07: Create Listing    │      │ UC-14: Reject         │
   │ UC-04: Search Products   │      │ UC-08: Edit Listing      │      │        Listings       │
   │ UC-05: View Details      │      │ UC-09: Delete Listing    │      │ UC-15: Manage Users   │
   │ UC-06: Add to Cart       │      │ UC-10: Accept Order      │      │ UC-16: View Analytics │
   │ UC-11: Place Order       │      │ UC-11: Reject Order      │      │ UC-17: Generate       │
   │ UC-12: Cancel Order      │      │ UC-12: Complete Order    │      │        Reports        │
   │ UC-18: Complete Order    │      │ UC-18: View Orders       │      │ UC-19: Monitor        │
   │ UC-19: Leave Review      │      │ UC-20: View Analytics    │      │        Transactions   │
   │ UC-20: View Orders       │      │ UC-21: Manage Profile    │      │ UC-20: View Logs      │
   │ UC-21: Add to Favorites  │      │ UC-22: Connect Wallet    │      └───────────────────────┘
   │ UC-22: Manage Profile    │      └──────────────────────────┘               │
   │ UC-23: Connect Wallet    │                   │                             │
   │ UC-24: View Notifications│                   │                             │
   └──────────────────────────┘                   │                             │
            │                                      │                             │
            │                                      │                             │
            └──────────────┬───────────────────────┴─────────────────────────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │  <<external system>> │
                │  Blockchain Network  │
                │  (Sepolia Testnet)   │
                └──────────────────────┘
                           │
                           │ includes
                           ▼
                ┌──────────────────────┐
                │ • Record Transaction │
                │ • Validate Status    │
                │ • Emit Events        │
                │ • Store Immutable    │
                │   Records            │
                └──────────────────────┘
```

### 4.3 Detailed Use Case Descriptions

#### **UC-01: Register Account**
- **Actor:** Buyer, Seller
- **Description:** User creates a new account in the system
- **Preconditions:** User has valid CSU email or ID
- **Postconditions:** User account created, verification email sent
- **Main Flow:**
  1. User navigates to registration page
  2. User enters email, password, name, ID number, department
  3. System validates input data
  4. System creates Supabase auth user
  5. System inserts user profile into database
  6. System sends verification email
  7. User verifies email
  8. System activates account
- **Alternate Flow:** 
  - Email already exists → Show error
  - Invalid ID format → Show validation error

#### **UC-03: Browse Products**
- **Actor:** Buyer
- **Description:** User views available products on marketplace
- **Preconditions:** User is logged in
- **Postconditions:** Product listings displayed
- **Main Flow:**
  1. User navigates to browse page
  2. System fetches approved products from database
  3. System displays products in grid/list view
  4. User can filter by category, price, listing type
  5. User can sort by date, price, popularity
- **Extensions:**
  - User can view product details
  - User can add to favorites
  - User can add to cart

#### **UC-07: Create Listing**
- **Actor:** Seller
- **Description:** Seller creates a new product listing
- **Preconditions:** User is logged in and verified
- **Postconditions:** Product listing created and pending approval
- **Main Flow:**
  1. Seller clicks "Create Listing"
  2. Seller selects listing type (FOR_SALE, FOR_RENT, SERVICE)
  3. Seller fills in product details
  4. Seller uploads images (max 5)
  5. System validates form data
  6. System uploads images to Supabase Storage
  7. System inserts product into database (status: PENDING)
  8. System creates admin notification
  9. System shows success message
- **Alternate Flow:**
  - Image upload fails → Show error, allow retry
  - Validation fails → Highlight errors

#### **UC-10: Accept Order**
- **Actor:** Seller
- **Description:** Seller accepts a pending order
- **Preconditions:** Order exists with status PENDING
- **Postconditions:** Order accepted, blockchain transaction created
- **Main Flow:**
  1. Seller views pending order
  2. Seller clicks "Accept Order"
  3. Seller sets final pickup/meetup location
  4. System validates wallet connection
  5. System calls smart contract acceptTransaction()
  6. Blockchain creates NEW transaction record (ACCEPTED)
  7. System updates database with new transaction
  8. System notifies buyer
  9. System shows success message
- **Alternate Flow:**
  - Blockchain transaction fails → Rollback, show error
  - Wallet not connected → Prompt to connect

#### **UC-11: Place Order**
- **Actor:** Buyer
- **Description:** Buyer places an order for products
- **Preconditions:** User logged in, products in cart, wallet connected
- **Postconditions:** Order created, blockchain transaction recorded
- **Main Flow:**
  1. Buyer reviews cart items
  2. Buyer clicks "Checkout"
  3. Buyer fills order details (pickup location, message)
  4. System validates order data
  5. System creates order in order_details table
  6. System calls smart contract createTransaction()
  7. Blockchain records transaction (PENDING)
  8. System stores transaction hash and blockchain ID
  9. System clears cart
  10. System notifies seller
  11. System shows order confirmation
- **Alternate Flow:**
  - Insufficient product quantity → Show error
  - Blockchain transaction fails → Rollback order

#### **UC-13: Approve Listings**
- **Actor:** Admin
- **Description:** Admin reviews and approves product listings
- **Preconditions:** Admin is logged in, pending listings exist
- **Postconditions:** Listing approved and visible to buyers
- **Main Flow:**
  1. Admin navigates to pending listings
  2. Admin selects listing to review
  3. Admin views all product details and images
  4. Admin validates content appropriateness
  5. Admin clicks "Approve"
  6. System updates product status to APPROVED
  7. System records admin action in admin_logs
  8. System notifies seller
  9. Product becomes visible in marketplace
- **Alternate Flow:**
  - Admin rejects → Enter reason, notify seller

#### **UC-18: Complete Order**
- **Actor:** Buyer, Seller
- **Description:** Mark transaction as completed after physical exchange
- **Preconditions:** Order status is ACCEPTED
- **Postconditions:** Transaction completed, blockchain updated, stats updated
- **Main Flow:**
  1. User views accepted order
  2. User clicks "Mark as Completed"
  3. System confirms action
  4. System calls smart contract completeTransaction()
  5. Blockchain creates NEW transaction (COMPLETED)
  6. System updates database
  7. System updates user statistics (revenue, orders)
  8. System updates product sold count
  9. System notifies both parties
  10. System enables review option for buyer
- **Alternate Flow:**
  - Blockchain fails → Show error, allow retry

#### **UC-19: Leave Review**
- **Actor:** Buyer
- **Description:** Buyer leaves review for completed transaction
- **Preconditions:** Transaction status is COMPLETED, no existing review
- **Postconditions:** Review created, seller rating updated
- **Main Flow:**
  1. Buyer navigates to completed order
  2. Buyer clicks "Leave Review"
  3. Buyer enters rating (1-5 stars) and review text
  4. Buyer optionally uploads review images (max 5)
  5. System validates review data
  6. System inserts review into reviews table
  7. System recalculates seller average rating
  8. System updates seller profile statistics
  9. System notifies seller
- **Alternate Flow:**
  - Already reviewed → Show existing review

#### **UC-22: Connect Wallet**
- **Actor:** Buyer, Seller
- **Description:** User connects MetaMask wallet to account
- **Preconditions:** User logged in, MetaMask installed
- **Postconditions:** Wallet address linked to user profile
- **Main Flow:**
  1. User clicks "Connect Wallet"
  2. System detects MetaMask
  3. System requests wallet connection
  4. User approves in MetaMask
  5. System validates network (Sepolia)
  6. System updates user profile with wallet address
  7. System shows success message
- **Alternate Flow:**
  - Wrong network → Prompt to switch to Sepolia
  - MetaMask not installed → Show installation guide
  - Wallet already linked to another account → Show error

### 4.4 Use Case Relationships

**Include Relationships:**
- All order-related use cases **include** "Connect Wallet"
- "Place Order" **includes** "Validate Product Availability"
- "Create Listing" **includes** "Upload Images"
- All transaction actions **include** "Record to Blockchain"

**Extend Relationships:**
- "Complete Order" **extends to** "Leave Review"
- "Browse Products" **extends to** "Add to Favorites"
- "View Product Details" **extends to** "Add to Cart"

**Generalization:**
- "Buyer" and "Seller" **generalize** "Registered User"
- "Accept Order", "Reject Order", "Complete Order" **generalize** "Manage Order"

---

## 5. DATA FLOW DIAGRAMS (DFD)

### 5.1 Context Diagram (Level 0 DFD)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       LEVEL 0: CONTEXT DIAGRAM                           │
└─────────────────────────────────────────────────────────────────────────┘

External Entities:
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Buyer   │         │  Seller  │         │  Admin   │
│ (Student/│         │ (Student/│         │ (System  │
│ Faculty) │         │ Faculty) │         │ Manager) │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                     │
     │ Registration       │ Product Info        │ Approval Decisions
     │ Orders             │ Order Responses     │ User Management
     │ Reviews            │ Listings            │ Analytics Requests
     │                    │                     │
     ▼                    ▼                     ▼
┌────┴──────────────────────────────────────────┴───────────────┐
│                                                                │
│                  CSU MARKETPLACE SYSTEM                        │
│                                                                │
│  • User Authentication & Management                            │
│  • Product Listing Management                                 │
│  • Order & Transaction Processing                             │
│  • Blockchain Integration                                     │
│  • Review & Rating System                                     │
│  • Analytics & Reporting                                      │
│  • Notification Management                                    │
│                                                                │
└────┬──────────────────────────────────────────┬───────────────┘
     │                    │                     │
     │ Order Confirmations│ Order Notifications │ Reports
     │ Transaction History│ Transaction Status  │ System Logs
     │ Notifications      │ Analytics Data      │ User Analytics
     │                    │                     │
     ▲                    ▲                     ▲
     │                    │                     │
┌────┴─────┐         ┌────┴─────┐         ┌────┴─────┐
│ Email    │         │Blockchain│         │ Payment  │
│ System   │         │ Network  │         │ Gateway  │
│(Supabase)│         │(Sepolia) │         │ (Future) │
└──────────┘         └──────────┘         └──────────┘

Data Flows:
→ Input Data Flows (to system)
← Output Data Flows (from system)
```

### 5.2 Level 1 DFD - Major Processes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          LEVEL 1 DFD                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────┐
│  Buyer   │──Registration Data──┐
└──────────┘                     │
                                 ▼
┌──────────┐              ┌──────────────┐        ┌─────────────┐
│  Seller  │──Credentials─┤   Process    │───User─┤  D1: Users  │
└──────────┘              │      1       │  Data  └─────────────┘
                          │ Authenticate │
┌──────────┐              │   & Manage   │
│  Admin   │──Login Info──┤    Users     │
└──────────┘              └──────┬───────┘
                                 │
                                 │ Auth Tokens
                                 ▼
                          ┌──────────────┐
                          │ Authenticated│
                          │    Users     │
                          └──────┬───────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
  │   Process    │      │   Process    │      │   Process    │
  │      2       │      │      3       │      │      4       │
  │   Manage     │      │   Manage     │      │   Process    │
  │   Products   │      │   Orders &   │      │   Reviews &  │
  │              │      │ Transactions │      │   Ratings    │
  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
         │                     │                      │
         │                     │                      │
    ┌────┴────┐           ┌────┴────┐           ┌────┴────┐
    │D2:      │           │D3:      │           │D4:      │
    │Products │           │Orders   │           │Reviews  │
    └────┬────┘           └────┬────┘           └────┬────┘
         │                     │                      │
         │                     │                      │
         │                     ▼                      │
         │              ┌──────────────┐              │
         │              │   Process    │              │
         │              │      5       │              │
         └──────────────┤  Blockchain  │──────────────┘
                        │  Integration │
                        └──────┬───────┘
                               │
                          ┌────┴────┐
                          │D5:      │
                          │Blockchain│
                          │Txns     │
                          └─────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  Blockchain  │
                        │   Network    │
                        │  (Sepolia)   │
                        └──────────────┘

         ┌────────────────────────────────────┐
         │        Additional Processes         │
         ├────────────────────────────────────┤
         │ Process 6: Notification Management │
         │ Process 7: Analytics & Reporting   │
         │ Process 8: File Storage Management │
         └────────────────────────────────────┘
```

### 5.3 Level 2 DFD - Process 1: Authenticate & Manage Users

```
┌─────────────────────────────────────────────────────────────────────────┐
│              LEVEL 2 DFD - PROCESS 1: USER MANAGEMENT                    │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────┐
│   User   │
└────┬─────┘
     │
     │ Registration Data
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 1.1   │────────►│  D1: Users   │
│   Register      │  Insert │              │
│   New User      │  Profile└──────────────┘
└────┬────────────┘
     │ Verification Email
     ▼
┌─────────────────┐
│   Email System  │
└─────────────────┘

┌──────────┐
│   User   │
└────┬─────┘
     │ Login Credentials
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 1.2   │────────►│  D1: Users   │
│   Authenticate  │  Query  │              │
│   User Login    │  User   └──────────────┘
└────┬────────────┘
     │ JWT Token
     ▼
┌─────────────────┐
│  Session Store  │
└─────────────────┘

┌──────────┐
│   User   │
└────┬─────┘
     │ Wallet Address
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 1.3   │◄───────►│  D1: Users   │
│   Link Wallet   │  Update │              │
│   to Profile    │  Address└──────────────┘
└────┬────────────┘
     │
     │ Validation
     ▼
┌─────────────────┐
│   Blockchain    │
│   Network       │
└─────────────────┘

┌──────────┐
│   User   │
└────┬─────┘
     │ Profile Updates
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 1.4   │────────►│  D1: Users   │
│   Update User   │  Update │              │
│   Profile       │  Data   └──────────────┘
└────┬────────────┘
     │ Upload Photo
     ▼
┌─────────────────┐         ┌──────────────┐
│  Process 1.5    │────────►│ D6: Storage  │
│  Manage Profile │  Store  │ (Images)     │
│  Picture        │  Image  └──────────────┘
└─────────────────┘

Data Stores:
• D1: Users - User profiles, credentials, wallet addresses
• D6: Storage - Profile pictures, user files
```

### 5.4 Level 2 DFD - Process 2: Manage Products

```
┌─────────────────────────────────────────────────────────────────────────┐
│              LEVEL 2 DFD - PROCESS 2: PRODUCT MANAGEMENT                 │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────┐
│  Seller  │
└────┬─────┘
     │ Product Details + Images
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 2.1   │────────►│ D2: Products │
│   Create        │  Insert │              │
│   Product       │  Listing└──────┬───────┘
│   Listing       │                │
└────┬────────────┘                │
     │                             │
     │ Upload Images               │
     ▼                             │
┌─────────────────┐         ┌──────▼───────┐
│  Process 2.2    │────────►│ D7: Product  │
│  Store Product  │  Store  │ Images       │
│  Images         │  Files  └──────────────┘
└─────────────────┘

┌──────────┐
│  Admin   │
└────┬─────┘
     │ Approval Decision
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 2.3   │◄───────►│ D2: Products │
│   Approve/      │  Query/ │              │
│   Reject        │  Update └──────┬───────┘
│   Listing       │                │
└────┬────────────┘                │
     │ Notification               │
     ▼                             │
┌─────────────────┐                │
│ Notification    │                │
│ System          │                │
└─────────────────┘                │
                                   │
┌──────────┐                       │
│  Buyer   │                       │
└────┬─────┘                       │
     │ Search/Filter Criteria      │
     ▼                             │
┌─────────────────┐                │
│   Process 2.4   │◄───────────────┘
│   Browse &      │  Query
│   Search        │  Products
│   Products      │
└────┬────────────┘
     │ Product List
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 2.5   │◄───────►│D8:Categories │
│   Filter by     │  Query  │              │
│   Category      │  Data   └──────────────┘
└─────────────────┘

┌──────────┐
│  Seller  │
└────┬─────┘
     │ Updated Product Data
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 2.6   │────────►│ D2: Products │
│   Edit/Delete   │  Update/│              │
│   Listing       │  Delete └──────────────┘
└─────────────────┘

Data Stores:
• D2: Products - Product listings, details, status
• D7: Product Images - Product image files
• D8: Categories - Product categories
```

### 5.5 Level 2 DFD - Process 3: Manage Orders & Transactions

```
┌─────────────────────────────────────────────────────────────────────────┐
│         LEVEL 2 DFD - PROCESS 3: ORDER & TRANSACTION MANAGEMENT          │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────┐
│  Buyer   │
└────┬─────┘
     │ Cart Items
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 3.1   │◄───────►│  D9: Cart    │
│   Manage        │  CRUD   │              │
│   Shopping Cart │  Ops    └──────────────┘
└────┬────────────┘
     │ Checkout Request
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 3.2   │────────►│D3: Order     │
│   Create Order  │  Insert │  Details     │
│                 │  Order  └──────────────┘
└────┬────────────┘
     │ Order Data
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 3.3   │────────►│D5: Blockchain│
│   Record to     │  Create │ Transactions │
│   Blockchain    │  TX     └──────────────┘
└────┬────────────┘
     │ TX Hash
     ▼
┌─────────────────┐
│   Blockchain    │
│   Network       │
└─────────────────┘
     │ Event: TransactionCreated
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 3.4   │────────►│D10:          │
│   Notify Seller │  Create │Notifications │
│   of New Order  │  Alert  └──────────────┘
└─────────────────┘

┌──────────┐
│  Seller  │
└────┬─────┘
     │ Order Decision (Accept/Reject)
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 3.5   │◄───────►│D3: Order     │
│   Process Order │  Query/ │  Details     │
│   Response      │  Update └──────────────┘
└────┬────────────┘
     │ Response Data
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 3.6   │────────►│D5: Blockchain│
│   Record Accept/│  Create │ Transactions │
│   Reject on     │  New TX └──────────────┘
│   Blockchain    │
└────┬────────────┘
     │ TX Hash
     ▼
┌─────────────────┐
│   Blockchain    │
│   Network       │
└─────────────────┘
     │ Event: TransactionAccepted/Rejected
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 3.7   │────────►│D10:          │
│   Notify Buyer  │  Create │Notifications │
│   of Response   │  Alert  └──────────────┘
└─────────────────┘

┌──────────┐
│Buyer/    │
│Seller    │
└────┬─────┘
     │ Mark as Completed
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 3.8   │────────►│D5: Blockchain│
│   Complete      │  Create │ Transactions │
│   Transaction   │  New TX └──────────────┘
└────┬────────────┘
     │
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 3.9   │────────►│ D1: Users    │
│   Update User   │  Update │              │
│   Statistics    │  Stats  └──────────────┘
└────┬────────────┘
     │
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 3.10  │────────►│ D2: Products │
│   Update Product│  Update │              │
│   Sold Count    │  Count  └──────────────┘
└─────────────────┘

Data Stores:
• D3: Order Details - Order information
• D5: Blockchain Transactions - Transaction records
• D9: Cart - Shopping cart items
• D10: Notifications - System notifications
```

### 5.6 Level 2 DFD - Process 4: Process Reviews & Ratings

```
┌─────────────────────────────────────────────────────────────────────────┐
│            LEVEL 2 DFD - PROCESS 4: REVIEW & RATING MANAGEMENT           │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────┐
│  Buyer   │
└────┬─────┘
     │ Review Data (Rating, Text, Images)
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 4.1   │◄───────►│D5: Blockchain│
│   Validate      │  Query  │ Transactions │
│   Review        │  TX     └──────────────┘
│   Eligibility   │
└────┬────────────┘
     │ Verified Completion
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 4.2   │────────►│ D11: Reviews │
│   Store Review  │  Insert │              │
│   Data          │  Review └──────────────┘
└────┬────────────┘
     │ Review Images
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 4.3   │────────►│ D6: Storage  │
│   Upload Review │  Store  │ (Images)     │
│   Images        │  Files  └──────────────┘
└─────────────────┘

┌─────────────────┐         ┌──────────────┐
│   Process 4.4   │◄───────►│ D11: Reviews │
│   Calculate     │  Query  │              │
│   Average       │  Ratings└──────┬───────┘
│   Rating        │                │
└────┬────────────┘                │
     │ Updated Rating              │
     ▼                             │
┌─────────────────┐         ┌──────▼───────┐
│   Process 4.5   │────────►│  D1: Users   │
│   Update Seller │  Update │              │
│   Rating        │  Profile└──────────────┘
└────┬────────────┘
     │ Notification
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 4.6   │────────►│D10:          │
│   Notify Seller │  Create │Notifications │
│   of Review     │  Alert  └──────────────┘
└─────────────────┘

┌──────────┐
│  Seller  │
└────┬─────┘
     │ Review Response
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 4.7   │────────►│ D11: Reviews │
│   Add Seller    │  Update │              │
│   Response      │  Review └──────────────┘
└─────────────────┘

Data Stores:
• D11: Reviews - Review and rating data
• D1: Users - Seller ratings and statistics
• D6: Storage - Review images
• D10: Notifications - Review notifications
```

### 5.7 Level 2 DFD - Process 5: Blockchain Integration

```
┌─────────────────────────────────────────────────────────────────────────┐
│          LEVEL 2 DFD - PROCESS 5: BLOCKCHAIN INTEGRATION                 │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Process    │
│   3 (Orders) │
└──────┬───────┘
       │ Transaction Data
       ▼
┌─────────────────┐
│   Process 5.1   │
│   Prepare Smart │
│   Contract Call │
└────┬────────────┘
     │ Contract Parameters
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 5.2   │────────►│   Blockchain │
│   Execute       │  Sign & │   Network    │
│   Transaction   │  Send TX│   (Sepolia)  │
│   on Chain      │         └──────┬───────┘
└────┬────────────┘                │
     │                             │ Events
     │ TX Hash                     │
     ▼                             ▼
┌─────────────────┐         ┌──────────────┐
│   Process 5.3   │────────►│D12: Blockchain│
│   Store TX Hash │  Insert │ TX Log       │
│   & Blockchain  │  Record └──────────────┘
│   ID            │
└────┬────────────┘
     │
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 5.4   │────────►│D5: Blockchain│
│   Update        │  Update │ Transactions │
│   Transaction   │  Status └──────────────┘
│   Record        │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│   Process 5.5   │
│   Listen for    │◄────────┐
│   Blockchain    │         │
│   Events        │         │
└────┬────────────┘         │
     │ Event Data           │
     ▼                      │
┌─────────────────┐         │
│   Process 5.6   │         │
│   Verify TX     │         │
│   Confirmation  │─────────┘
└────┬────────────┘
     │ Confirmed
     ▼
┌─────────────────┐         ┌──────────────┐
│   Process 5.7   │────────►│D5: Blockchain│
│   Update        │  Update │ Transactions │
│   Confirmation  │  Status └──────────────┘
│   Status        │
└─────────────────┘

Data Stores:
• D5: Blockchain Transactions - Transaction records
• D12: Blockchain TX Log - Raw blockchain logs
```

### 5.8 Data Store Summary

| ID  | Data Store Name         | Description                                    |
|-----|-------------------------|------------------------------------------------|
| D1  | Users                   | User profiles, credentials, wallet addresses   |
| D2  | Products                | Product listings, details, status              |
| D3  | Order Details           | Order information, buyer/seller data           |
| D4  | Reviews                 | Review and rating data                         |
| D5  | Blockchain Transactions | Transaction records with blockchain data       |
| D6  | Storage (Images)        | Profile pictures, product images, review images|
| D7  | Product Images          | Product image metadata                         |
| D8  | Categories              | Product categories                             |
| D9  | Cart                    | Shopping cart items                            |
| D10 | Notifications           | User notifications                             |
| D11 | Reviews                 | Detailed review data                           |
| D12 | Blockchain TX Log       | Raw blockchain event logs                      |

---

## 6. SYSTEM REQUIREMENTS

### 6.1 Functional Requirements

#### 6.1.1 User Management (FR-UM)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-UM-01 | System shall allow users to register with email and password | High | ✅ Implemented |
| FR-UM-02 | System shall validate CSU email format during registration | High | ✅ Implemented |
| FR-UM-03 | System shall send email verification link upon registration | High | ✅ Implemented |
| FR-UM-04 | System shall authenticate users with email/username and password | High | ✅ Implemented |
| FR-UM-05 | System shall allow users to link MetaMask wallet to their profile | High | ✅ Implemented |
| FR-UM-06 | System shall validate wallet address format (0x + 40 hex chars) | Medium | ✅ Implemented |
| FR-UM-07 | System shall support role-based access (Admin, User) | High | ✅ Implemented |
| FR-UM-08 | System shall allow users to update profile information | Medium | ✅ Implemented |
| FR-UM-09 | System shall allow users to upload profile picture (max 5MB) | Low | ✅ Implemented |
| FR-UM-10 | System shall track user last login and activity timestamps | Low | ✅ Implemented |
| FR-UM-11 | System shall maintain user statistics (orders, sales, revenue) | Medium | ✅ Implemented |
| FR-UM-12 | System shall allow users to logout and clear session | High | ✅ Implemented |

#### 6.1.2 Product Management (FR-PM)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-PM-01 | System shall allow sellers to create product listings | High | ✅ Implemented |
| FR-PM-02 | System shall support three listing types: FOR_SALE, FOR_RENT, SERVICE | High | ✅ Implemented |
| FR-PM-03 | System shall allow sellers to upload up to 5 images per product | High | ✅ Implemented |
| FR-PM-04 | System shall validate image format (JPEG, PNG, WebP) and size (max 5MB) | Medium | ✅ Implemented |
| FR-PM-05 | System shall categorize products into predefined categories | Medium | ✅ Implemented |
| FR-PM-06 | System shall set new listings to PENDING status by default | High | ✅ Implemented |
| FR-PM-07 | System shall allow sellers to edit their pending/approved listings | Medium | ✅ Implemented |
| FR-PM-08 | System shall allow sellers to delete their listings | Medium | ✅ Implemented |
| FR-PM-09 | System shall display only APPROVED listings to buyers | High | ✅ Implemented |
| FR-PM-10 | System shall allow buyers to search products by keyword | High | ✅ Implemented |
| FR-PM-11 | System shall allow buyers to filter products by category | High | ✅ Implemented |
| FR-PM-12 | System shall allow buyers to sort products by price/date | Medium | ✅ Implemented |
| FR-PM-13 | System shall track product view count | Low | ✅ Implemented |
| FR-PM-14 | System shall capture type-specific fields (rental duration, service schedule) | Medium | ✅ Implemented |

#### 6.1.3 Admin Management (FR-AM)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-AM-01 | System shall allow admins to view all pending product listings | High | ✅ Implemented |
| FR-AM-02 | System shall allow admins to approve product listings | High | ✅ Implemented |
| FR-AM-03 | System shall allow admins to reject listings with reason | High | ✅ Implemented |
| FR-AM-04 | System shall notify sellers of approval/rejection decisions | Medium | ✅ Implemented |
| FR-AM-05 | System shall log all admin actions with timestamps | High | ✅ Implemented |
| FR-AM-06 | System shall allow admins to view system analytics | Medium | ✅ Implemented |
| FR-AM-07 | System shall allow admins to manage user accounts | Medium | ✅ Implemented |
| FR-AM-08 | System shall allow admins to view transaction history | Medium | ✅ Implemented |
| FR-AM-09 | System shall provide admin dashboard with key metrics | Medium | ✅ Implemented |

#### 6.1.4 Order & Transaction Management (FR-OT)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-OT-01 | System shall allow buyers to add products to shopping cart | High | ✅ Implemented |
| FR-OT-02 | System shall allow buyers to adjust cart item quantities | Medium | ✅ Implemented |
| FR-OT-03 | System shall allow buyers to remove items from cart | Medium | ✅ Implemented |
| FR-OT-04 | System shall validate product availability before checkout | High | ✅ Implemented |
| FR-OT-05 | System shall require wallet connection for order placement | High | ✅ Implemented |
| FR-OT-06 | System shall create order in database upon checkout | High | ✅ Implemented |
| FR-OT-07 | System shall record transaction on Sepolia blockchain | High | ✅ Implemented |
| FR-OT-08 | System shall store blockchain transaction hash and ID | High | ✅ Implemented |
| FR-OT-09 | System shall set initial order status to PENDING | High | ✅ Implemented |
| FR-OT-10 | System shall notify seller of new orders | High | ✅ Implemented |
| FR-OT-11 | System shall allow sellers to accept orders with final location | High | ✅ Implemented |
| FR-OT-12 | System shall allow sellers to reject orders with reason | High | ✅ Implemented |
| FR-OT-13 | System shall create NEW blockchain transaction on accept/reject | High | ✅ Implemented |
| FR-OT-14 | System shall allow buyers to cancel pending/accepted orders | Medium | ✅ Implemented |
| FR-OT-15 | System shall allow buyers or sellers to mark orders as completed | High | ✅ Implemented |
| FR-OT-16 | System shall create NEW blockchain transaction on completion | High | ✅ Implemented |
| FR-OT-17 | System shall update user statistics upon order completion | Medium | ✅ Implemented |
| FR-OT-18 | System shall update product sold count upon completion | Medium | ✅ Implemented |
| FR-OT-19 | System shall maintain complete order history per order ID | High | ✅ Implemented |
| FR-OT-20 | System shall prevent buyers from ordering their own products | High | ✅ Implemented |

#### 6.1.5 Blockchain Integration (FR-BC)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-BC-01 | System shall connect to Ethereum Sepolia testnet | High | ✅ Implemented |
| FR-BC-02 | System shall deploy CSUMarketplace smart contract | High | ✅ Implemented |
| FR-BC-03 | System shall call createTransaction() on order placement | High | ✅ Implemented |
| FR-BC-04 | System shall call acceptTransaction() on seller acceptance | High | ✅ Implemented |
| FR-BC-05 | System shall call rejectTransaction() on seller rejection | High | ✅ Implemented |
| FR-BC-06 | System shall call completeTransaction() on order completion | High | ✅ Implemented |
| FR-BC-07 | System shall call cancelTransaction() on buyer cancellation | High | ✅ Implemented |
| FR-BC-08 | System shall emit blockchain events for all transaction actions | High | ✅ Implemented |
| FR-BC-09 | System shall store complete transaction data on blockchain | High | ✅ Implemented |
| FR-BC-10 | System shall support wallet-agnostic transaction operations | Medium | ✅ Implemented |
| FR-BC-11 | System shall validate network is Sepolia before transactions | High | ✅ Implemented |
| FR-BC-12 | System shall handle blockchain transaction failures gracefully | High | ✅ Implemented |
| FR-BC-13 | System shall synchronize blockchain data with Supabase database | High | ✅ Implemented |
| FR-BC-14 | System shall provide transaction hash to users | Medium | ✅ Implemented |
| FR-BC-15 | System shall allow users to view transaction on Etherscan | Low | ✅ Implemented |

#### 6.1.6 Review & Rating System (FR-RR)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-RR-01 | System shall allow buyers to review completed transactions | High | ✅ Implemented |
| FR-RR-02 | System shall require rating between 1-5 stars | High | ✅ Implemented |
| FR-RR-03 | System shall allow optional review text | Medium | ✅ Implemented |
| FR-RR-04 | System shall allow buyers to upload review images (max 5) | Low | ✅ Implemented |
| FR-RR-05 | System shall prevent duplicate reviews for same transaction | High | ✅ Implemented |
| FR-RR-06 | System shall only allow reviews for completed transactions | High | ✅ Implemented |
| FR-RR-07 | System shall calculate and update seller average rating | High | ✅ Implemented |
| FR-RR-08 | System shall update seller total reviews count | Medium | ✅ Implemented |
| FR-RR-09 | System shall allow sellers to respond to reviews | Medium | ✅ Implemented |
| FR-RR-10 | System shall notify sellers of new reviews | Medium | ✅ Implemented |
| FR-RR-11 | System shall display reviews on seller profile | Medium | ✅ Implemented |

#### 6.1.7 Notification System (FR-NS)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-NS-01 | System shall send notifications for new orders | High | ✅ Implemented |
| FR-NS-02 | System shall send notifications for order status changes | High | ✅ Implemented |
| FR-NS-03 | System shall send notifications for listing approval/rejection | Medium | ✅ Implemented |
| FR-NS-04 | System shall send notifications for new reviews | Medium | ✅ Implemented |
| FR-NS-05 | System shall support notification types: transaction, product, system, blockchain | Medium | ✅ Implemented |
| FR-NS-06 | System shall mark notifications as read/unread | Medium | ✅ Implemented |
| FR-NS-07 | System shall display unread notification count | Low | ✅ Implemented |
| FR-NS-08 | System shall provide action links in notifications | Low | ✅ Implemented |

#### 6.1.8 Analytics & Reporting (FR-AR)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-AR-01 | System shall track total products posted per user | Medium | ✅ Implemented |
| FR-AR-02 | System shall track total products sold per seller | Medium | ✅ Implemented |
| FR-AR-03 | System shall track total revenue per seller | Medium | ✅ Implemented |
| FR-AR-04 | System shall track total orders per buyer | Medium | ✅ Implemented |
| FR-AR-05 | System shall provide seller analytics dashboard | Medium | ✅ Implemented |
| FR-AR-06 | System shall provide admin analytics dashboard | Medium | ✅ Implemented |
| FR-AR-07 | System shall track category-wise product distribution | Low | ✅ Implemented |
| FR-AR-08 | System shall track transaction status distribution | Low | ✅ Implemented |

### 6.2 Non-Functional Requirements

#### 6.2.1 Performance Requirements (NFR-PF)

| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| NFR-PF-01 | Page load time shall not exceed 3 seconds | < 3s | High |
| NFR-PF-02 | API response time shall not exceed 2 seconds | < 2s | High |
| NFR-PF-03 | Database queries shall execute within 500ms | < 500ms | Medium |
| NFR-PF-04 | Image loading shall use lazy loading for optimization | N/A | Medium |
| NFR-PF-05 | System shall support concurrent 100+ active users | 100+ | Medium |
| NFR-PF-06 | Blockchain transaction confirmation time depends on network | Variable | Low |
| NFR-PF-07 | Search results shall display within 1 second | < 1s | High |
| NFR-PF-08 | File uploads shall show progress indicators | N/A | Low |

#### 6.2.2 Security Requirements (NFR-SC)

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-SC-01 | All passwords shall be hashed using bcrypt or similar | High |
| NFR-SC-02 | Authentication shall use JWT tokens with expiration | High |
| NFR-SC-03 | API endpoints shall require authentication tokens | High |
| NFR-SC-04 | Database shall implement Row Level Security (RLS) policies | High |
| NFR-SC-05 | All user inputs shall be validated and sanitized | High |
| NFR-SC-06 | SQL injection prevention through parameterized queries | High |
| NFR-SC-07 | XSS prevention through input/output encoding | High |
| NFR-SC-08 | HTTPS shall be enforced for all communications | High |
| NFR-SC-09 | File uploads shall be validated for type and size | Medium |
| NFR-SC-10 | Wallet signatures shall be verified for blockchain operations | High |
| NFR-SC-11 | Sensitive data shall not be stored in blockchain (e.g., passwords) | High |
| NFR-SC-12 | Session tokens shall expire after 14 minutes and auto-refresh | Medium |
| NFR-SC-13 | Failed login attempts shall be rate-limited | Medium |

#### 6.2.3 Usability Requirements (NFR-US)

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-US-01 | User interface shall be intuitive and easy to navigate | High |
| NFR-US-02 | System shall provide clear error messages | High |
| NFR-US-03 | System shall provide success feedback for all actions | Medium |
| NFR-US-04 | System shall be responsive on mobile, tablet, and desktop | High |
| NFR-US-05 | Forms shall include inline validation with helpful hints | Medium |
| NFR-US-06 | System shall use consistent UI patterns and components | Medium |
| NFR-US-07 | Loading states shall be indicated with spinners/skeletons | Low |
| NFR-US-08 | System shall support browser back/forward navigation | Medium |
| NFR-US-09 | Color scheme shall meet WCAG accessibility standards | Low |
| NFR-US-10 | Help documentation shall be easily accessible | Low |

#### 6.2.4 Reliability Requirements (NFR-RL)

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-RL-01 | System uptime shall be 99.5% or higher | High |
| NFR-RL-02 | Database shall have automated backup every 24 hours | High |
| NFR-RL-03 | System shall handle errors gracefully without crashes | High |
| NFR-RL-04 | Failed blockchain transactions shall be retryable | Medium |
| NFR-RL-05 | System shall log all critical errors for debugging | High |
| NFR-RL-06 | Data consistency between database and blockchain shall be maintained | High |
| NFR-RL-07 | System shall recover from network failures automatically | Medium |

#### 6.2.5 Scalability Requirements (NFR-SL)

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-SL-01 | Database shall use indexing for frequently queried columns | High |
| NFR-SL-02 | System shall support horizontal scaling of frontend | Medium |
| NFR-SL-03 | File storage shall use CDN for faster delivery | Medium |
| NFR-SL-04 | Database queries shall be optimized with proper indexes | High |
| NFR-SL-05 | System shall implement pagination for large data sets | High |
| NFR-SL-06 | Cached data shall be used where appropriate | Medium |

#### 6.2.6 Maintainability Requirements (NFR-MN)

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-MN-01 | Code shall follow TypeScript and React best practices | High |
| NFR-MN-02 | All functions shall be documented with JSDoc comments | Medium |
| NFR-MN-03 | Database schema shall be version-controlled | High |
| NFR-MN-04 | Smart contracts shall be thoroughly tested before deployment | High |
| NFR-MN-05 | Code shall be modular and follow separation of concerns | High |
| NFR-MN-06 | Git commits shall follow conventional commit messages | Low |
| NFR-MN-07 | System shall have comprehensive README documentation | Medium |

#### 6.2.7 Compatibility Requirements (NFR-CP)

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-CP-01 | System shall support Chrome, Firefox, Safari, Edge (latest versions) | High |
| NFR-CP-02 | System shall work with MetaMask browser extension | High |
| NFR-CP-03 | System shall be compatible with Ethereum Sepolia testnet | High |
| NFR-CP-04 | Mobile browsers shall be supported (iOS Safari, Chrome Mobile) | Medium |
| NFR-CP-05 | System shall work on Node.js 18+ | High |

#### 6.2.8 Legal & Compliance Requirements (NFR-LC)

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-LC-01 | System shall comply with data privacy regulations | High |
| NFR-LC-02 | User consent shall be obtained for data collection | Medium |
| NFR-LC-03 | System shall provide terms of service | Medium |
| NFR-LC-04 | Users shall be able to delete their account and data | Medium |
| NFR-LC-05 | Blockchain transactions shall be transparent and auditable | High |

---

## 7. TECHNOLOGY STACK

### 7.1 Technology Stack Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TECHNOLOGY STACK                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                               │
├──────────────────────────────────────────────────────────────────┤
│ • React 19.2.0              - UI framework                        │
│ • TypeScript 5.9.3          - Type-safe JavaScript                │
│ • Vite 7.1.7                - Build tool & dev server             │
│ • TailwindCSS 4.1.14        - Utility-first CSS framework         │
│ • React Router 7.9.4        - Client-side routing                 │
│ • Framer Motion 12.23.24    - Animation library                   │
│ • Lucide React 0.546.0      - Icon library                        │
│ • Ethers.js 6.15.0          - Ethereum library                    │
│ • TanStack Query 5.90.2     - Data fetching & caching             │
│ • Axios 1.12.2              - HTTP client                         │
│ • Recharts 3.4.1            - Chart library for analytics         │
│ • date-fns 4.1.0            - Date utility library                │
│ • numeral 2.0.6             - Number formatting                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER                                │
├──────────────────────────────────────────────────────────────────┤
│ • Supabase 2.75.0           - Backend-as-a-Service (BaaS)         │
│   ├─ PostgreSQL 15+         - Relational database                 │
│   ├─ Supabase Auth          - Authentication service              │
│   ├─ Supabase Storage       - File storage (images)               │
│   ├─ Supabase Realtime      - Real-time subscriptions            │
│   └─ Row Level Security     - Database-level authorization        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    BLOCKCHAIN LAYER                               │
├──────────────────────────────────────────────────────────────────┤
│ • Solidity 0.8.20           - Smart contract language             │
│ • Hardhat 3 Beta            - Ethereum development environment     │
│ • Ethers.js 6.x             - Blockchain interaction library       │
│ • Ethereum Sepolia Testnet  - Test blockchain network             │
│ • Alchemy API               - Blockchain node provider            │
│ • MetaMask                  - Browser wallet extension            │
│ • Hardhat Ignition          - Deployment framework                │
│ • TypeChain                 - TypeScript bindings for contracts   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                   DEVELOPMENT TOOLS                               │
├──────────────────────────────────────────────────────────────────┤
│ • Git & GitHub              - Version control & collaboration      │
│ • ESLint 9.36.0             - Code linting                        │
│ • TypeScript ESLint 8.45.0  - TypeScript linting                  │
│ • VS Code                   - Code editor                         │
│ • Node.js 18+               - JavaScript runtime                  │
│ • npm                       - Package manager                     │
│ • dotenv 17.2.3             - Environment variable management     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                              │
├──────────────────────────────────────────────────────────────────┤
│ • Alchemy                   - Ethereum RPC provider               │
│ • Etherscan                 - Blockchain explorer                 │
│ • Supabase Cloud            - Hosted backend infrastructure       │
│ • Email Service (Supabase)  - Transactional emails                │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 Detailed Technology Specifications

#### 7.2.1 Frontend Technologies

**React 19.2.0**
- **Purpose:** Component-based UI library for building interactive interfaces
- **Key Features:**
  - Virtual DOM for performance
  - Component reusability
  - Hooks for state management
  - Server components support
- **Usage:** All UI components, pages, and user interactions

**TypeScript 5.9.3**
- **Purpose:** Static typing for JavaScript
- **Key Features:**
  - Type safety and IntelliSense
  - Early error detection
  - Better code maintainability
  - Interface definitions for data models
- **Usage:** Entire codebase (frontend, backend integration, smart contracts)

**Vite 7.1.7**
- **Purpose:** Next-generation frontend build tool
- **Key Features:**
  - Lightning-fast hot module replacement (HMR)
  - Optimized production builds
  - Native ES modules support
  - Plugin ecosystem
- **Usage:** Development server, build optimization, bundling

**TailwindCSS 4.1.14**
- **Purpose:** Utility-first CSS framework
- **Key Features:**
  - Rapid UI development
  - Responsive design utilities
  - Customizable design system
  - Small bundle size with purging
- **Usage:** All component styling, layouts, responsive design

**React Router 7.9.4**
- **Purpose:** Client-side routing library
- **Key Features:**
  - Declarative routing
  - Nested routes
  - Route guards
  - URL parameter handling
- **Usage:** Navigation, protected routes, dynamic routing

**Ethers.js 6.15.0**
- **Purpose:** Ethereum blockchain interaction library
- **Key Features:**
  - Wallet connection (MetaMask)
  - Smart contract interaction
  - Transaction signing and sending
  - Event listening
  - Network detection
- **Usage:** Blockchain operations, wallet management, contract calls

#### 7.2.2 Backend Technologies

**Supabase 2.75.0**
- **Purpose:** Open-source Firebase alternative (Backend-as-a-Service)
- **Components:**
  
  **PostgreSQL 15+**
  - Relational database management system
  - ACID compliance
  - Advanced indexing and triggers
  - JSON support for flexible data
  
  **Supabase Auth**
  - Email/password authentication
  - JWT token management
  - Session handling
  - Email verification
  - Password reset flows
  
  **Supabase Storage**
  - Object storage for files
  - Image upload and retrieval
  - Access control policies
  - CDN integration
  - Path structure: `profile-pictures/{user_id}/`, `product-images/{product_id}/`
  
  **Row Level Security (RLS)**
  - Database-level authorization
  - Policy-based access control
  - User-specific data isolation
  - Secure by default

**Database Features:**
- 14 normalized tables
- 80+ indexes for performance
- 12+ triggers for automation
- ENUM types for consistency
- Materialized views for analytics
- Stored procedures for complex operations

#### 7.2.3 Blockchain Technologies

**Solidity 0.8.20**
- **Purpose:** Smart contract programming language
- **Features:**
  - Contract-based architecture
  - Event emission for logging
  - Gas optimization
  - Security features (overflow protection)
- **Usage:** CSUMarketplace smart contract

**Hardhat 3 Beta**
- **Purpose:** Ethereum development environment
- **Features:**
  - TypeScript configuration
  - Hardhat Ignition for deployment
  - Built-in testing framework
  - Network simulation
  - Contract compilation
  - Gas reporting
- **Configuration:**
  ```typescript
  solidity: 0.8.20
  networks: sepolia, localhost
  optimizer: enabled (200 runs)
  viaIR: true (stack depth optimization)
  ```

**Ethereum Sepolia Testnet**
- **Purpose:** Test blockchain network
- **Characteristics:**
  - Chain ID: 11155111
  - Test ETH (free from faucets)
  - Public blockchain explorer
  - Production-like environment
- **Contract Address:** `0x3F1fa083D1103e6fea9e3Dd6c1E95b4505Ac6564`

**Alchemy**
- **Purpose:** Blockchain infrastructure provider
- **Services:**
  - RPC endpoint for Sepolia
  - Enhanced APIs
  - Webhook notifications
  - Transaction monitoring
- **Usage:** Blockchain node connection, transaction broadcasting

#### 7.2.4 Development & Deployment Tools

**ESLint 9.36.0**
- **Purpose:** JavaScript/TypeScript linting
- **Configuration:** React-specific rules, TypeScript integration
- **Usage:** Code quality enforcement

**Git & GitHub**
- **Purpose:** Version control and collaboration
- **Repository:** https://github.com/kurtchinta/CSU-MARKETPLACE
- **Branch Strategy:** main branch for production-ready code

**Node.js 18+**
- **Purpose:** JavaScript runtime environment
- **Requirements:** Version 18 or higher
- **Usage:** Development server, build scripts, package management

### 7.3 Architecture Patterns

**Frontend Patterns:**
- **Context API:** Global state management (Auth, Cart, Wallet, Modal)
- **Custom Hooks:** Reusable logic (useBlockchain, useWallet)
- **Service Layer:** API interaction abstraction
- **Component Composition:** Modular, reusable components
- **Route Guards:** Protected route components

**Backend Patterns:**
- **Database Triggers:** Automatic updates (stats, counts, ratings)
- **Stored Functions:** Complex business logic
- **RLS Policies:** Security at database level
- **Normalized Schema:** Relational data integrity

**Blockchain Patterns:**
- **Event-Driven:** Smart contract events for audit trail
- **Immutable Records:** Each status change creates new transaction
- **Wallet-Agnostic:** Any wallet can perform operations
- **Dual-Write:** Database + blockchain synchronization

### 7.4 API Integration Points

```
Frontend ←──────→ Supabase API
    │                  │
    │                  ├── Authentication (JWT)
    │                  ├── Database (PostgreSQL)
    │                  ├── Storage (Files)
    │                  └── Realtime (Subscriptions)
    │
    └──────→ Blockchain (via Ethers.js)
                   │
                   ├── MetaMask (Wallet)
                   ├── Alchemy RPC (Node)
                   └── Smart Contract (Sepolia)
```

**Data Flow:**
1. **Authentication:** Frontend → Supabase Auth → JWT Token
2. **Database Operations:** Frontend → Supabase Client → PostgreSQL
3. **File Upload:** Frontend → Supabase Storage → Cloud Storage
4. **Blockchain Tx:** Frontend → MetaMask → Alchemy → Sepolia Network → Smart Contract

### 7.5 Technology Justification

| Technology | Why Chosen |
|------------|------------|
| **React** | Industry-standard, large ecosystem, component reusability |
| **TypeScript** | Type safety reduces bugs, better developer experience |
| **Supabase** | Fast development, built-in auth, RLS for security, PostgreSQL power |
| **Hardhat** | Best-in-class Ethereum development tools, TypeScript support |
| **Sepolia** | Official Ethereum testnet, free test ETH, production-like environment |
| **TailwindCSS** | Rapid UI development, consistent design system, small bundle size |
| **Vite** | Fastest build tool, excellent DX, optimized for modern frameworks |
| **Ethers.js** | Well-documented, TypeScript support, MetaMask integration |

---

## 8. FRONTEND DEVELOPMENT

### 8.1 Frontend Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────┘

src/
├── main.tsx                    # Application entry point
├── App.tsx                     # Root component with routing
├── index.css                   # Global styles & Tailwind imports
│
├── components/                 # Reusable UI components
│   ├── Navbar.tsx             # Navigation bar with auth state
│   ├── Cart.tsx               # Shopping cart component
│   ├── RouteGuard.tsx         # Protected route wrapper
│   ├── ImageCarousel.tsx      # Product image carousel
│   └── ProductImageUpload.tsx # Image upload component
│
├── pages/                      # Page components (route targets)
│   ├── LandingPage.tsx        # Public homepage
│   ├── BrowsePage.tsx         # Product browsing & search
│   ├── ProductDetails.tsx     # Single product view
│   ├── CreateListingPage.tsx  # Create new product listing
│   ├── EditListingPage.tsx    # Edit existing listing
│   ├── MyListingsPage.tsx     # Seller's product management
│   ├── CheckoutPage.tsx       # Order placement & checkout
│   ├── MyCartPage.tsx         # Shopping cart view
│   ├── MyOrdersPage.tsx       # Buyer's order history
│   ├── DashboardPage.tsx      # User dashboard & analytics
│   └── FavoritesPage.tsx      # Saved/favorited products
│
├── admin/                      # Admin-specific components
│   └── AdminDashboard.tsx     # Admin panel & analytics
│
├── context/                    # React Context providers
│   ├── AuthContext.tsx        # Authentication state
│   ├── CartContext.tsx        # Shopping cart state
│   ├── WalletContext.tsx      # Blockchain wallet state
│   ├── ModalContext.tsx       # Modal dialog state
│   └── DirectCheckoutContext.tsx # Direct purchase flow
│
├── hooks/                      # Custom React hooks
│   ├── useBlockchain.ts       # Blockchain operations
│   └── useWallet.ts           # Wallet connection & management
│
├── services/                   # API service layer
│   ├── authService.ts         # Authentication operations
│   ├── productService.ts      # Product CRUD operations
│   ├── cartService.ts         # Cart management
│   ├── blockchainService.ts   # Smart contract interactions
│   ├── storageService.ts      # File upload/download
│   ├── productImageService.ts # Product image management
│   ├── profilePictureService.ts # Profile picture operations
│   ├── adminService.ts        # Admin operations
│   ├── adminAnalyticsService.ts # Admin analytics
│   └── userAnalyticsService.ts # User analytics
│
├── types/                      # TypeScript type definitions
│   └── (type definitions)     # Interfaces and types
│
├── config/                     # Configuration files
│   └── routeConfig.ts         # Route definitions
│
├── contractJSON/               # Smart contract ABIs
│   └── CSUMarketplace.json    # Contract ABI & metadata
│
├── lib/                        # Library configurations
│   └── supabase.ts            # Supabase client setup
│
└── assets/                     # Static assets
    └── (images, icons)        # Application assets
```

### 8.2 Key Frontend Components

#### 8.2.1 Context Providers

**AuthContext.tsx**
- **Purpose:** Manages user authentication state globally
- **State:**
  - `user`: Current authenticated user (Supabase User object)
  - `profile`: User profile data from database
  - `isLoggedIn`: Boolean authentication status
  - `loading`: Loading state during auth operations
  - `token`: JWT access token for API calls
- **Methods:**
  - `login(emailOrUsername, password)`: Authenticate user
  - `register(email, password, profileData)`: Create new account
  - `logout()`: Clear session and logout
- **Features:**
  - Automatic token refresh (every 14 minutes)
  - In-memory profile caching
  - Session persistence across page reloads
  - Real-time auth state sync

**WalletContext.tsx**
- **Purpose:** Manages MetaMask wallet connection and blockchain state
- **State:**
  - `account`: Connected wallet address
  - `chainId`: Current blockchain network ID
  - `isConnected`: Wallet connection status
  - `provider`: Ethers.js provider instance
  - `signer`: Ethers.js signer for transactions
- **Methods:**
  - `connectWallet()`: Connect MetaMask
  - `disconnectWallet()`: Disconnect wallet
  - `switchNetwork(chainId)`: Switch blockchain network
- **Features:**
  - Auto-detect network changes
  - Account change detection
  - Sepolia network validation

**CartContext.tsx**
- **Purpose:** Manages shopping cart state
- **State:**
  - `cartItems`: Array of products in cart
  - `cartCount`: Total number of items
  - `totalPrice`: Calculated total price
- **Methods:**
  - `addToCart(product, quantity)`: Add item to cart
  - `removeFromCart(productId)`: Remove item
  - `updateQuantity(productId, quantity)`: Update item quantity
  - `clearCart()`: Empty cart
- **Features:**
  - Persists to Supabase database
  - Real-time updates across tabs
  - Stock validation

#### 8.2.2 Page Components

**BrowsePage.tsx**
- **Features:**
  - Grid/list view toggle
  - Category filtering
  - Search functionality
  - Price range filter
  - Sorting (price, date, popularity)
  - Pagination
  - Lazy loading images
  - Add to favorites
  - Quick add to cart

**ProductDetails.tsx**
- **Features:**
  - Image carousel with 5 images
  - Product information display
  - Seller profile preview
  - Seller rating and reviews
  - Add to cart/Buy now buttons
  - Quantity selector
  - Share functionality
  - Related products section

**CreateListingPage.tsx**
- **Features:**
  - Multi-step form
  - Listing type selection (FOR_SALE, FOR_RENT, SERVICE)
  - Dynamic form fields based on type
  - Image upload with preview (max 5)
  - Image reordering
  - Category selection
  - Real-time validation
  - Draft save functionality
  - Preview before submit

**CheckoutPage.tsx**
- **Features:**
  - Order summary display
  - Pickup/meetup location input
  - Message to seller
  - Wallet connection check
  - Blockchain transaction flow
  - Transaction hash display
  - Order confirmation
  - Email notification trigger

**DashboardPage.tsx**
- **Features:**
  - User statistics overview
  - Recent orders (buyer view)
  - Recent sales (seller view)
  - Quick actions
  - Analytics charts (Recharts)
  - Revenue tracking
  - Product performance metrics

**AdminDashboard.tsx**
- **Features:**
  - Pending listings approval queue
  - User management
  - Transaction monitoring
  - System analytics
  - Category management
  - Reports generation
  - Admin action logs

#### 8.2.3 Reusable Components

**Navbar.tsx**
- **Features:**
  - Responsive design (mobile hamburger menu)
  - Auth-aware navigation
  - Cart icon with item count
  - Notification bell with count
  - User profile dropdown
  - Wallet connection status
  - Search bar (on browse page)

**ImageCarousel.tsx**
- **Features:**
  - Swipeable image gallery
  - Thumbnail navigation
  - Keyboard navigation
  - Zoom functionality
  - Fullscreen mode
  - Image loading states

**RouteGuard.tsx**
- **Purpose:** Protect routes based on authentication
- **Features:**
  - Redirect unauthenticated users to login
  - Admin-only route protection
  - Loading state during auth check
  - Preserve intended destination

### 8.3 Service Layer Architecture

#### 8.3.1 Core Services

**authService.ts**
```typescript
// Key Functions:
- login(email, password): Promise<AuthResponse>
- register(userData): Promise<AuthResponse>
- logout(): Promise<void>
- getUserProfile(userId): Promise<UserProfile>
- updateProfile(userId, data): Promise<UserProfile>
- linkWallet(userId, walletAddress): Promise<void>
```

**productService.ts**
```typescript
// Key Functions:
- getProducts(filters): Promise<Product[]>
- getProductById(id): Promise<Product>
- createProduct(productData): Promise<Product>
- updateProduct(id, data): Promise<Product>
- deleteProduct(id): Promise<void>
- searchProducts(query): Promise<Product[]>
- getProductsByCategory(categoryId): Promise<Product[]>
```

**blockchainService.ts**
```typescript
// Key Functions:
- initializeProvider(): Promise<void>
- connectWallet(): Promise<string>
- createTransaction(orderData): Promise<TransactionReceipt>
- acceptTransaction(txId, location): Promise<TransactionReceipt>
- rejectTransaction(txId, reason): Promise<TransactionReceipt>
- completeTransaction(txId): Promise<TransactionReceipt>
- cancelTransaction(txId, reason): Promise<TransactionReceipt>
- getTransactionHistory(orderId): Promise<BlockchainTx[]>
```

**cartService.ts**
```typescript
// Key Functions:
- getCartItems(userId): Promise<CartItem[]>
- addToCart(userId, productId, quantity): Promise<void>
- updateCartItem(cartId, quantity): Promise<void>
- removeFromCart(cartId): Promise<void>
- clearCart(userId): Promise<void>
```

### 8.4 State Management Strategy

```
┌──────────────────────────────────────────────────────────────┐
│              STATE MANAGEMENT HIERARCHY                       │
└──────────────────────────────────────────────────────────────┘

Global State (Context API):
├── AuthContext          → User authentication, profile
├── WalletContext        → Blockchain wallet connection
├── CartContext          → Shopping cart items
├── ModalContext         → Modal dialog state
└── DirectCheckoutContext → Direct purchase flow

Local State (useState):
├── Form inputs
├── UI toggles (show/hide)
├── Loading states
├── Error messages
└── Temporary data

Server State (TanStack Query):
├── Product listings
├── Order history
├── User analytics
├── Notifications
└── Reviews

Cached Data:
├── In-memory profile cache
├── Product image URLs
└── Category lists
```

### 8.5 Routing Configuration

```typescript
// Route Structure (React Router)

Public Routes:
├── /                    → LandingPage
├── /browse              → BrowsePage
├── /product/:id         → ProductDetails
├── /login               → LoginPage
├── /register            → RegisterPage
└── /confirm-email       → ConfirmEmailPage

Protected Routes (Authenticated):
├── /dashboard           → DashboardPage
├── /create-listing      → CreateListingPage
├── /edit-listing/:id    → EditListingPage
├── /my-listings         → MyListingsPage
├── /my-cart             → MyCartPage
├── /my-orders           → MyOrdersPage
├── /checkout            → CheckoutPage
├── /favorites           → FavoritesPage
└── /profile             → ProfilePage

Admin Routes (Admin only):
└── /admin               → AdminDashboard
```

### 8.6 UI/UX Design Principles

**Responsive Design:**
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Flexible grid layouts
- Touch-friendly UI elements

**Color Scheme:**
- Primary: Blue/Teal (CSU branding)
- Secondary: Green (success states)
- Accent: Orange (calls-to-action)
- Neutral: Gray scale for backgrounds
- Error: Red for validation errors

**Typography:**
- System font stack for performance
- Hierarchical headings (text-xl to text-4xl)
- Readable body text (text-base)
- Consistent spacing

**Interaction Patterns:**
- Loading spinners for async operations
- Toast notifications for feedback
- Modal dialogs for confirmations
- Skeleton screens for content loading
- Smooth transitions (Framer Motion)

### 8.7 Performance Optimizations

**Code Splitting:**
- Route-based code splitting
- Lazy loading of pages
- Dynamic imports for heavy components

**Image Optimization:**
- Lazy loading images
- WebP format support
- Responsive image sizes
- CDN delivery via Supabase Storage

**Bundle Optimization:**
- Tree shaking unused code
- Minification in production
- CSS purging with TailwindCSS
- Vite's optimized chunking

**Caching Strategy:**
- Browser caching for static assets
- In-memory profile cache
- TanStack Query cache for API data
- Service Worker for offline support (future)

### 8.8 Error Handling

**Error Boundaries:**
- Component-level error catching
- Fallback UI for errors
- Error logging to console

**API Error Handling:**
- Try-catch blocks in async functions
- User-friendly error messages
- Retry mechanisms for failed requests
- Timeout handling

**Validation:**
- Client-side form validation
- Real-time feedback
- Error highlighting
- Clear validation messages

---

## 9. BACKEND DEVELOPMENT

### 9.1 Backend Architecture (Supabase)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKEND ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                       SUPABASE BACKEND                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────┐         │
│  │             AUTHENTICATION LAYER                        │         │
│  ├────────────────────────────────────────────────────────┤         │
│  │ • Email/Password Authentication                         │         │
│  │ • JWT Token Generation & Validation                     │         │
│  │ • Session Management                                    │         │
│  │ • Email Verification                                    │         │
│  │ • Password Reset                                        │         │
│  │ • Token Refresh (automatic)                             │         │
│  └────────────────────────────────────────────────────────┘         │
│                                                                       │
│  ┌────────────────────────────────────────────────────────┐         │
│  │              DATABASE LAYER (PostgreSQL)                │         │
│  ├────────────────────────────────────────────────────────┤         │
│  │ Tables: 14 core tables                                  │         │
│  │ • users                  • order_details                │         │
│  │ • products               • transactions                 │         │
│  │ • categories             • blockchain_transactions      │         │
│  │ • product_images         • reviews                      │         │
│  │ • cart                   • notifications                │         │
│  │ • product_favorites      • admin_logs                   │         │
│  │ • roles                                                 │         │
│  │                                                         │         │
│  │ Features:                                               │         │
│  │ • 80+ Indexes for performance                           │         │
│  │ • 12+ Triggers for automation                           │         │
│  │ • Row Level Security (RLS) policies                     │         │
│  │ • Foreign key constraints                               │         │
│  │ • CHECK constraints for validation                      │         │
│  │ • Generated columns (computed fields)                   │         │
│  │ • ENUM types for data consistency                       │         │
│  └────────────────────────────────────────────────────────┘         │
│                                                                       │
│  ┌────────────────────────────────────────────────────────┐         │
│  │              STORAGE LAYER (File Storage)               │         │
│  ├────────────────────────────────────────────────────────┤         │
│  │ Buckets:                                                │         │
│  │ • profile-pictures/     → User profile images           │         │
│  │ • product-images/       → Product listing images        │         │
│  │ • review-images/        → Review images                 │         │
│  │                                                         │         │
│  │ Features:                                               │         │
│  │ • Public/Private access policies                        │         │
│  │ • File size validation (5MB max)                        │         │
│  │ • MIME type validation (image/*)                        │         │
│  │ • CDN integration for fast delivery                     │         │
│  │ • Automatic URL generation                              │         │
│  └────────────────────────────────────────────────────────┘         │
│                                                                       │
│  ┌────────────────────────────────────────────────────────┐         │
│  │              REALTIME LAYER (Subscriptions)             │         │
│  ├────────────────────────────────────────────────────────┤         │
│  │ • Real-time database change notifications               │         │
│  │ • WebSocket connections                                 │         │
│  │ • Broadcast channels                                    │         │
│  │ • Presence tracking                                     │         │
│  └────────────────────────────────────────────────────────┘         │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 9.2 Database Schema Design

#### 9.2.1 Core Tables

**users**
- **Purpose:** Central user identity and profile management
- **Key Fields:**
  - `user_id` (UUID, PK): References auth.users
  - `role_id` (INT, FK): User role (admin/user)
  - `email`, `username` (VARCHAR, UNIQUE): Login credentials
  - `wallet_address` (VARCHAR, UNIQUE): MetaMask address
  - `first_name`, `last_name`, `id_number`: Personal info
  - `department`, `year_level`: Academic info
  - `profile_picture_url`: Profile image path
  - Statistics fields (auto-updated by triggers)
- **Indexes:** 10 indexes on frequently queried columns
- **Constraints:** Wallet validation regex, gender/year_level ENUMs

**products**
- **Purpose:** Product listings from sellers
- **Key Fields:**
  - `product_id` (SERIAL, PK)
  - `user_id` (UUID, FK): Seller
  - `category_id` (INT, FK): Product category
  - `product_name`, `description`, `price`, `quantity`
  - `listing_type`: FOR_SALE | FOR_RENT | SERVICE
  - `status`: PENDING | APPROVED | REJECTED
  - Type-specific fields (rent_duration, service_schedule)
  - `is_available`, `is_featured`: Visibility flags
- **Indexes:** 8 indexes including composite index on (status, is_available)
- **Triggers:** Auto-update category counts, user stats

**order_details**
- **Purpose:** Internal order management (before blockchain)
- **Key Fields:**
  - `order_id` (UUID, PK)
  - `buyer_id`, `seller_id`, `product_id` (FKs)
  - Snapshot of product data at order time
  - `order_status`: pending | accepted | rejected | completed | cancelled
  - Type-specific fields for rentals/services
  - Communication fields (messages, rejection reasons)
- **Constraints:** Different buyer/seller check

**transactions**
- **Purpose:** Blockchain transaction records (immutable)
- **Key Fields:**
  - `transaction_id` (UUID, PK)
  - `order_id` (UUID, FK): Links to order
  - `blockchain_id` (BIGINT, UNIQUE): On-chain transaction ID
  - `blockchain_tx_hash` (VARCHAR): Ethereum transaction hash
  - Complete snapshot of transaction data (immutable)
  - `transaction_status`: PENDING | ACCEPTED | REJECTED | COMPLETED | CANCELLED
  - Timestamp fields for each status
- **Indexes:** 9 indexes including blockchain_tx_hash
- **Triggers:** Update user stats on completion

**product_images**
- **Purpose:** Product image metadata
- **Key Fields:**
  - `image_id` (SERIAL, PK)
  - `product_id`, `user_id` (FKs)
  - `storage_path`: Supabase Storage path
  - `image_order`: Display order (1-5)
  - `file_size`, `mime_type`: File metadata
- **Constraints:** Max 5 images per product, 5MB size limit

**reviews**
- **Purpose:** Buyer reviews for completed transactions
- **Key Fields:**
  - `review_id` (SERIAL, PK)
  - `transaction_id`, `reviewer_id`, `seller_id` (FKs)
  - `rating` (1-5)
  - `review_text`, `review_images[]`: Review content
  - `response`, `responded_at`: Seller response
- **Constraints:** Unique per transaction+reviewer, only completed orders
- **Triggers:** Update seller average rating

**cart**
- **Purpose:** Shopping cart items
- **Key Fields:**
  - `cart_id` (SERIAL, PK)
  - `user_id`, `product_id` (FKs)
  - `quantity`, `added_at`
- **Constraints:** Unique (user_id, product_id) combination

**notifications**
- **Purpose:** User notification system
- **Key Fields:**
  - `notification_id` (SERIAL, PK)
  - `user_id` (FK)
  - `title`, `message`, `type`: Notification content
  - Related entity IDs (product, order, transaction, review)
  - `is_read`, `read_at`: Read status
- **Types:** transaction | product | system | blockchain

### 9.3 Database Triggers & Functions

#### 9.3.1 Automated Triggers

**update_updated_at_column()**
- **Tables:** users, products, transactions, order_details, reviews
- **Purpose:** Auto-update `updated_at` timestamp on row changes
- **Trigger:** BEFORE UPDATE

**trigger_increment_category_product_count()**
- **Table:** products
- **Purpose:** Increment category.total_products on product insert
- **Trigger:** AFTER INSERT

**trigger_decrement_category_product_count()**
- **Table:** products
- **Purpose:** Decrement category.total_products on product delete
- **Trigger:** AFTER DELETE

**handle_transaction_status_change()**
- **Table:** transactions
- **Purpose:** Auto-set timestamp fields when status changes
- **Logic:** 
  - ACCEPTED → set accepted_at
  - REJECTED → set rejected_at
  - COMPLETED → set completed_at
  - CANCELLED → set cancelled_at
- **Trigger:** BEFORE UPDATE

**update_user_stats_on_transaction()**
- **Table:** transactions
- **Purpose:** Update seller/buyer statistics on completion
- **Logic:**
  - Seller: total_products_sold++, total_revenue += price
  - Buyer: total_orders_as_buyer++
- **Trigger:** AFTER UPDATE (when status changes to COMPLETED)

**update_seller_rating()**
- **Table:** reviews
- **Purpose:** Recalculate seller average rating on new review
- **Logic:** AVG(rating) grouped by seller_id
- **Trigger:** AFTER INSERT

**validate_review_creation()**
- **Table:** reviews
- **Purpose:** Validate review eligibility
- **Validations:**
  - Only buyer can review
  - Transaction must be COMPLETED
- **Trigger:** BEFORE INSERT

**populate_order_category_name()**
- **Table:** order_details
- **Purpose:** Auto-populate category_name from product
- **Trigger:** BEFORE INSERT

### 9.4 Row Level Security (RLS) Policies

#### 9.4.1 Security Policy Examples

**users table:**
```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = user_id);

-- Public can view basic user info (for seller profiles)
CREATE POLICY "Public can view user profiles"
  ON users FOR SELECT
  USING (is_active = true);
```

**products table:**
```sql
-- Anyone can view approved products
CREATE POLICY "Anyone can view approved products"
  ON products FOR SELECT
  USING (status = 'APPROVED' AND is_available = true);

-- Users can insert their own products
CREATE POLICY "Users can create products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update/delete their own products
CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  USING (auth.uid() = user_id);
```

**order_details table:**
```sql
-- Buyers can view their orders
CREATE POLICY "Buyers can view their orders"
  ON order_details FOR SELECT
  USING (auth.uid() = buyer_id);

-- Sellers can view orders for their products
CREATE POLICY "Sellers can view their orders"
  ON order_details FOR SELECT
  USING (auth.uid() = seller_id);
```

**Admin policies:**
```sql
-- Admins can do everything
CREATE POLICY "Admins have full access"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );
```

### 9.5 Database Views

**vw_active_products**
- **Purpose:** Optimized view for browsing products
- **Joins:** products + users + categories + product_images
- **Aggregations:** Array of image paths
- **Filters:** Only APPROVED and available products

**vw_user_profiles**
- **Purpose:** Complete user profile with statistics
- **Joins:** users + product count aggregations
- **Fields:** Full name, profile picture, stats, active listings count

### 9.6 File Storage Management

#### 9.6.1 Storage Buckets

**profile-pictures/**
```
Structure:
├── {user_id}/
│   └── profile.{ext}

Policies:
- Public read access
- Authenticated upload (own folder only)
- Max size: 5MB
- Allowed types: image/jpeg, image/png, image/webp
```

**product-images/**
```
Structure:
├── {product_id}/
│   ├── image-1.{ext}
│   ├── image-2.{ext}
│   └── ... (max 5)

Policies:
- Public read access
- Authenticated upload (product owner only)
- Max size: 5MB per image
- Allowed types: image/jpeg, image/png, image/webp, image/gif
```

**review-images/**
```
Structure:
├── {review_id}/
│   ├── image-1.{ext}
│   └── ... (max 5)

Policies:
- Public read access
- Authenticated upload (reviewer only)
- Max size: 5MB per image
```

#### 9.6.2 Storage Service Functions

**Upload Flow:**
1. Frontend validates file (type, size)
2. Generate unique filename with timestamp
3. Upload to Supabase Storage bucket
4. Get public URL
5. Store URL/path in database
6. Return URL to frontend

**Delete Flow:**
1. Verify ownership (RLS)
2. Delete file from storage
3. Delete database record
4. Cascade delete related records

### 9.7 API Endpoints (Supabase Auto-generated)

**REST API:**
```
GET    /rest/v1/products                    # List products
GET    /rest/v1/products?id=eq.{id}        # Get product by ID
POST   /rest/v1/products                    # Create product
PATCH  /rest/v1/products?id=eq.{id}        # Update product
DELETE /rest/v1/products?id=eq.{id}        # Delete product

GET    /rest/v1/users?id=eq.{id}           # Get user profile
PATCH  /rest/v1/users?id=eq.{id}           # Update profile

POST   /rest/v1/cart                        # Add to cart
GET    /rest/v1/cart?user_id=eq.{id}       # Get cart items
DELETE /rest/v1/cart?cart_id=eq.{id}       # Remove from cart

GET    /rest/v1/order_details               # List orders
POST   /rest/v1/order_details               # Create order
PATCH  /rest/v1/order_details?order_id=eq.{id} # Update order

POST   /rest/v1/reviews                     # Create review
GET    /rest/v1/reviews?seller_id=eq.{id}  # Get seller reviews
```

**Authentication API:**
```
POST   /auth/v1/signup                      # Register
POST   /auth/v1/token?grant_type=password  # Login
POST   /auth/v1/logout                      # Logout
POST   /auth/v1/recover                     # Password reset
POST   /auth/v1/token?grant_type=refresh_token # Refresh token
```

**Storage API:**
```
POST   /storage/v1/object/{bucket}/{path}  # Upload file
GET    /storage/v1/object/public/{bucket}/{path} # Get file
DELETE /storage/v1/object/{bucket}/{path}  # Delete file
```

### 9.8 Backend Performance Optimization

**Database Optimization:**
- **Indexes:** 80+ indexes on frequently queried columns
- **Composite Indexes:** Multi-column indexes for complex queries
- **Partial Indexes:** Conditional indexes (e.g., WHERE is_available = true)
- **Query Planning:** EXPLAIN ANALYZE for slow queries
- **Connection Pooling:** Built-in Supabase pooling

**Caching Strategy:**
- **Client-side:** TanStack Query for API response caching
- **Database Views:** Pre-computed joins for faster reads
- **CDN:** Supabase Storage uses CDN for static files

**Data Integrity:**
- **Foreign Keys:** Enforce referential integrity
- **CHECK Constraints:** Validate data at database level
- **Triggers:** Maintain consistency automatically
- **Transactions:** ACID compliance for multi-step operations

### 9.9 Backend Security Measures

**Authentication Security:**
- JWT tokens with expiration
- Secure password hashing (bcrypt)
- Email verification required
- Rate limiting on auth endpoints

**Database Security:**
- Row Level Security (RLS) on all tables
- Parameterized queries (SQL injection prevention)
- Input validation via CHECK constraints
- Encrypted connections (SSL/TLS)

**File Upload Security:**
- MIME type validation
- File size limits
- Authenticated upload only
- Path traversal prevention

**API Security:**
- Authentication required for sensitive endpoints
- CORS configuration
- API key rotation
- Rate limiting

---

## 10. DATABASE MANAGEMENT

### 10.1 Database Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DATABASE MANAGEMENT SYSTEM                            │
│                        PostgreSQL 15+                                    │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                      DATABASE STRUCTURE                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Core Tables (14):                                                    │
│  ├── roles                    (User roles)                            │
│  ├── users                    (User profiles & auth)                  │
│  ├── categories               (Product categories)                    │
│  ├── products                 (Product listings)                      │
│  ├── product_images           (Product image metadata)                │
│  ├── cart                     (Shopping cart)                         │
│  ├── order_details            (Internal orders)                       │
│  ├── transactions             (Blockchain transactions)               │
│  ├── blockchain_transactions  (Blockchain logs)                       │
│  ├── reviews                  (User reviews)                          │
│  ├── notifications            (User notifications)                    │
│  ├── admin_logs               (Admin action logs)                     │
│  └── product_favorites        (Saved products)                        │
│                                                                       │
│  ENUM Types (2):                                                      │
│  ├── user_role                (admin, user)                           │
│  └── notification_type        (transaction, product, system,         │
│                                blockchain)                            │
│                                                                       │
│  Indexes: 80+                                                         │
│  Triggers: 12+                                                        │
│  Views: 2                                                             │
│  Functions: 10+                                                       │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 10.2 Database Normalization

**Normalization Level:** 3rd Normal Form (3NF)

**1st Normal Form (1NF):**
- All tables have primary keys
- All columns contain atomic values
- No repeating groups (product_images separate table)

**2nd Normal Form (2NF):**
- All non-key attributes fully dependent on primary key
- No partial dependencies
- Example: category_name stored in categories table, referenced by category_id

**3rd Normal Form (3NF):**
- No transitive dependencies
- Computed fields use generated columns or triggers
- Example: average_seller_rating calculated from reviews table

**Denormalization (Strategic):**
- Transaction snapshot data (item_name, price) stored to preserve historical accuracy
- Category counts cached for performance (updated by triggers)
- User statistics aggregated for dashboard performance

### 10.3 Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   ENTITY RELATIONSHIP DIAGRAM                            │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌──────────┐
                    │  roles   │
                    │──────────│
                    │ role_id  │ PK
                    │ role_name│
                    └────┬─────┘
                         │ 1
                         │
                         │ N
                    ┌────┴─────────────────┐
                    │      users           │
                    │──────────────────────│
                    │ user_id (PK)         │
                    │ role_id (FK)         │
                    │ email, username      │
                    │ wallet_address       │
                    │ profile_picture_url  │
                    │ ...statistics        │
                    └────┬─────────┬───────┘
                         │ 1       │ 1
                         │         │
              ┌──────────┴───┐     │ N
              │ 1            │     │
         ┌────┴────┐    ┌────┴────────────┐
         │products │    │product_favorites│
         │─────────│    │─────────────────│
         │product_id│ PK│favorite_id (PK) │
         │user_id   │ FK│user_id (FK)     │
         │category_id│FK│product_id (FK)  │
         │name,desc │   └─────────────────┘
         │price,qty │
         │status    │
         └────┬─────┘
              │ 1
              │
         ┌────┴──────────┐
         │ N             │
    ┌────┴────────┐ ┌────┴────────┐
    │product_images│ │    cart     │
    │──────────────│ │─────────────│
    │image_id (PK) │ │cart_id (PK) │
    │product_id(FK)│ │user_id (FK) │
    │user_id (FK)  │ │product_id(FK)│
    │storage_path  │ │quantity     │
    └──────────────┘ └─────────────┘

                    ┌──────────────┐
                    │ order_details│
                    │──────────────│
                    │ order_id (PK)│
                    │ buyer_id (FK)│
                    │ seller_id(FK)│
                    │ product_id   │
                    │ order_status │
                    └──────┬───────┘
                           │ 1
                           │
                           │ N
                    ┌──────┴──────────┐
                    │  transactions   │
                    │─────────────────│
                    │transaction_id PK│
                    │ order_id (FK)   │
                    │ blockchain_id   │
                    │ blockchain_hash │
                    │ buyer_id (FK)   │
                    │ seller_id (FK)  │
                    │ product_id (FK) │
                    │ tx_status       │
                    └──────┬──────────┘
                           │ 1
                           │
                    ┌──────┴───────────┐
                    │ N                │
              ┌─────┴──────┐   ┌───────┴─────────┐
              │  reviews   │   │ blockchain_txns │
              │────────────│   │─────────────────│
              │review_id PK│   │blockchain_tx_id │
              │tx_id (FK)  │   │transaction_id FK│
              │reviewer_id │   │blockchain_hash  │
              │seller_id   │   │blockchain_status│
              │rating      │   │gas_used         │
              │review_text │   └─────────────────┘
              │review_imgs│
              └────────────┘

         ┌─────────────┐          ┌──────────────┐
         │ categories  │          │notifications │
         │─────────────│          │──────────────│
         │category_id  │ PK       │notification_id│PK
         │category_name│          │user_id (FK)  │
         │total_products│         │title, message│
         └─────────────┘          │type, is_read │
                                  └──────────────┘

                                  ┌──────────────┐
                                  │  admin_logs  │
                                  │──────────────│
                                  │log_id (PK)   │
                                  │admin_id (FK) │
                                  │action        │
                                  │target_user   │
                                  │target_product│
                                  └──────────────┘

Relationships:
─────────  One-to-Many (1:N)
═════════  Many-to-Many (N:M) through junction table
```

### 10.4 Database Indexing Strategy

#### 10.4.1 Index Types and Purpose

**Primary Key Indexes (Automatic):**
- Every table has a primary key with automatic index
- Ensures uniqueness and fast lookups

**Foreign Key Indexes:**
```sql
-- Users table
CREATE INDEX idx_users_role_id ON users(role_id);

-- Products table
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_category_id ON products(category_id);

-- Orders table
CREATE INDEX idx_order_details_buyer_id ON order_details(buyer_id);
CREATE INDEX idx_order_details_seller_id ON order_details(seller_id);
CREATE INDEX idx_order_details_product_id ON order_details(product_id);

-- Transactions table
CREATE INDEX idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller_id ON transactions(seller_id);
CREATE INDEX idx_transactions_order_id ON transactions(order_id);
```

**Unique Indexes:**
```sql
-- Enforce uniqueness
CREATE UNIQUE INDEX ON users(email);
CREATE UNIQUE INDEX ON users(username);
CREATE UNIQUE INDEX ON users(wallet_address);
CREATE UNIQUE INDEX ON transactions(blockchain_id);
CREATE UNIQUE INDEX ON cart(user_id, product_id);
```

**Composite Indexes:**
```sql
-- Complex query optimization
CREATE INDEX idx_products_approved ON products(status, is_available) 
  WHERE status = 'APPROVED' AND is_available = TRUE;

CREATE INDEX idx_product_images_order ON product_images(product_id, image_order);
```

**Partial Indexes:**
```sql
-- Index only relevant rows
CREATE INDEX idx_users_is_active ON users(is_active) 
  WHERE is_active = TRUE;

CREATE INDEX idx_products_featured ON products(is_featured) 
  WHERE is_featured = TRUE;

CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) 
  WHERE is_read = FALSE;
```

**Timestamp Indexes:**
```sql
-- Sorting and filtering by date
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_completed_at ON transactions(completed_at DESC) 
  WHERE completed_at IS NOT NULL;
```

### 10.5 Database Constraints

#### 10.5.1 Primary Key Constraints
- All tables have primary keys
- Auto-incrementing SERIAL for most tables
- UUID for user_id, order_id, transaction_id

#### 10.5.2 Foreign Key Constraints
```sql
-- Cascade delete examples
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE

-- Set null on delete
FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL
```

#### 10.5.3 Check Constraints
```sql
-- Price validation
CONSTRAINT valid_price CHECK (price >= 0)

-- Quantity validation
CONSTRAINT valid_quantity CHECK (quantity >= 0)

-- Rating validation
CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5)

-- Wallet address format
CONSTRAINT valid_wallet_address CHECK (
  wallet_address IS NULL OR 
  (LENGTH(wallet_address) = 42 AND wallet_address ~* '^0x[a-f0-9]{40}$')
)

-- Enum validation
CONSTRAINT valid_listing_type CHECK (
  listing_type IN ('FOR_SALE', 'FOR_RENT', 'SERVICE')
)

-- File size validation
CONSTRAINT valid_file_size CHECK (
  file_size > 0 AND file_size <= 5242880
)
```

#### 10.5.4 Not Null Constraints
- All primary keys NOT NULL
- Required fields: email, username, product_name, price
- Optional fields allow NULL (profile_picture_url, bio)

### 10.6 Database Backup & Recovery

**Backup Strategy:**
- **Frequency:** Automated daily backups (Supabase managed)
- **Retention:** 7-day backup retention
- **Type:** Full database snapshots
- **Location:** Supabase cloud infrastructure

**Point-in-Time Recovery:**
- Available through Supabase dashboard
- Can restore to any point within retention period

**Manual Backups:**
```bash
# Export entire database
pg_dump -h db.supabase.co -U postgres -d csu_marketplace > backup.sql

# Export specific table
pg_dump -h db.supabase.co -U postgres -d csu_marketplace -t users > users_backup.sql

# Restore from backup
psql -h db.supabase.co -U postgres -d csu_marketplace < backup.sql
```

### 10.7 Database Migration Management

**Version Control:**
- All schema changes tracked in Git
- SQL migration files in `/database/` directory
- Sequential versioning (V1, V2, V3...)

**Migration Process:**
1. Create migration SQL file
2. Test on local/staging environment
3. Review schema changes
4. Execute on production via Supabase SQL editor
5. Verify data integrity
6. Update documentation

**Example Migration Structure:**
```
database/
├── FINALIZED-OPTIMIZED-SCHEMA.sql       # Complete schema
├── ANALYTICS-FUNCTIONS-INDEXES.sql      # Analytics optimizations
├── NOTIFICATION-SYSTEM.sql              # Notification features
└── PERFORMANCE-INDEXES-TRIGGERS.sql     # Performance updates
```

### 10.8 Database Monitoring & Maintenance

**Performance Monitoring:**
- Query execution time tracking
- Slow query identification (> 500ms)
- Index usage statistics
- Connection pool monitoring
- Cache hit ratios

**Maintenance Tasks:**
```sql
-- Vacuum and analyze tables
VACUUM ANALYZE users;
VACUUM ANALYZE products;
VACUUM ANALYZE transactions;

-- Reindex for performance
REINDEX TABLE products;

-- Update statistics
ANALYZE users;
```

**Database Statistics:**
```sql
-- Check table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::text)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::text) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### 10.9 Data Integrity & Quality

**Referential Integrity:**
- Foreign key constraints enforce relationships
- Cascade deletes for dependent data
- Set null for optional references

**Data Validation:**
- CHECK constraints at database level
- ENUM types for fixed value sets
- Regex validation for formats (email, wallet)
- Range checks for numeric values

**Audit Trail:**
- created_at and updated_at timestamps
- admin_logs table for admin actions
- Blockchain provides immutable transaction history
- Trigger-based automatic logging

**Data Consistency:**
- Database triggers maintain computed fields
- Atomic transactions for multi-step operations
- ACID compliance ensures consistency
- Constraint enforcement prevents invalid states

### 10.10 Database Scalability Considerations

**Current Optimizations:**
- 80+ indexes for query performance
- Materialized views for complex aggregations
- Efficient JOIN operations
- Pagination for large result sets

**Future Scalability:**
- **Vertical Scaling:** Upgrade database instance size
- **Read Replicas:** For read-heavy operations
- **Partitioning:** Partition large tables by date
- **Caching Layer:** Redis for frequently accessed data
- **Connection Pooling:** Already implemented by Supabase

**Query Optimization:**
```sql
-- Use EXPLAIN ANALYZE to optimize queries
EXPLAIN ANALYZE
SELECT p.*, u.username, c.category_name
FROM products p
JOIN users u ON p.user_id = u.user_id
JOIN categories c ON p.category_id = c.category_id
WHERE p.status = 'APPROVED'
  AND p.is_available = TRUE
ORDER BY p.created_at DESC
LIMIT 20;

-- Use indexes effectively
SELECT * FROM products 
WHERE status = 'APPROVED' 
  AND is_available = TRUE  -- Uses idx_products_approved composite index
ORDER BY created_at DESC
LIMIT 20;
```

---

## 11. HARDWARE AND SOFTWARE REQUIREMENTS

### 11.1 Development Environment Requirements

#### 11.1.1 Hardware Requirements (Developer Workstation)

| Component | Minimum | Recommended | Purpose |
|-----------|---------|-------------|---------|
| **Processor** | Intel Core i5 / AMD Ryzen 5 | Intel Core i7 / AMD Ryzen 7 | Code compilation, build processes |
| **RAM** | 8 GB | 16 GB+ | Running IDE, dev server, database |
| **Storage** | 256 GB SSD | 512 GB+ SSD | Project files, dependencies, Docker |
| **Display** | 1920x1080 | 2560x1440+ | Code editor, multiple windows |
| **Internet** | 10 Mbps | 50 Mbps+ | API calls, blockchain interactions |
| **Graphics** | Integrated | Dedicated (optional) | Browser rendering, UI development |

**Operating System:**
- **Primary:** Windows 10/11, macOS 12+, Ubuntu 20.04+
- **Supported:** Any OS supporting Node.js 18+

#### 11.1.2 Software Requirements (Development)

**Core Development Tools:**

| Software | Version | Purpose |
|----------|---------|---------|
| **Node.js** | 18.x or higher | JavaScript runtime environment |
| **npm** | 9.x or higher | Package manager |
| **Git** | 2.x or higher | Version control |
| **VS Code** | Latest | Code editor (recommended) |
| **Google Chrome** | Latest | Primary development browser |
| **MetaMask Extension** | Latest | Wallet for blockchain testing |

**Development Dependencies:**
```json
{
  "node": ">=18.0.0",
  "npm": ">=9.0.0"
}
```

**Browser Requirements:**
- Chrome 90+ (recommended for development)
- Firefox 88+
- Safari 14+
- Edge 90+
- MetaMask browser extension installed

**Optional Development Tools:**
- **Postman/Insomnia:** API testing
- **PostgreSQL Client:** Database management
- **Docker Desktop:** Containerization (optional)
- **Hardhat Console:** Smart contract debugging

### 11.2 Production Environment Requirements

#### 11.2.1 Frontend Hosting (Static Site)

**Recommended Hosting Platforms:**
- **Vercel** (recommended)
  - Automatic deployments from Git
  - Global CDN
  - Zero configuration
  - Free tier available
  
- **Netlify**
  - Git-based deployments
  - CDN distribution
  - Environment variables support
  
- **Supabase Hosting** (optional)
  - Integrated with backend
  - Single platform management

**Resource Requirements:**
- **Storage:** 100-500 MB (build artifacts)
- **Bandwidth:** Depends on usage (CDN recommended)
- **Build Time:** < 5 minutes per deployment

#### 11.2.2 Backend Infrastructure (Supabase)

**Supabase Plan Requirements:**

| Feature | Free Tier | Pro Tier (Recommended) |
|---------|-----------|------------------------|
| **Database** | 500 MB | 8 GB+ |
| **File Storage** | 1 GB | 100 GB+ |
| **Bandwidth** | 2 GB/month | 250 GB/month |
| **API Requests** | Unlimited | Unlimited |
| **Auth Users** | Unlimited | Unlimited |
| **Concurrent Connections** | 60 | 400 |
| **Backups** | No PITR | 7-day PITR |
| **Support** | Community | Email support |
| **Price** | $0/month | $25/month |

**Estimated Resource Usage:**
- **Database Size:** 1-5 GB (for 1000+ users)
- **Storage:** 10-50 GB (images, files)
- **Monthly Bandwidth:** 50-200 GB
- **Daily API Requests:** 10,000-100,000

#### 11.2.3 Blockchain Infrastructure

**Ethereum Network:**
- **Network:** Sepolia Testnet (for testing)
- **Future Production:** Ethereum Mainnet or Layer 2 (Polygon, Arbitrum)
- **Node Provider:** Alchemy
  - Free Tier: 300M compute units/month
  - Growth Tier: $49/month (recommended for production)

**Smart Contract:**
- **Deployment Cost:** ~0.05-0.1 ETH (Sepolia testnet - FREE)
- **Gas Fees:** Variable (free on testnet)
- **Contract Address:** `0x3F1fa083D1103e6fea9e3Dd6c1E95b4505Ac6564` (Sepolia)

**Alchemy Requirements:**
- API Key for RPC endpoint
- Webhook support for real-time events
- Archive node access for historical data

### 11.3 End-User Requirements

#### 11.3.1 Client-Side Requirements

**Minimum User Hardware:**
- **Device:** Smartphone, Tablet, or Desktop
- **RAM:** 2 GB+
- **Internet:** 2 Mbps+ (stable connection)
- **Display:** 360x640 minimum resolution

**Supported Browsers:**
- **Desktop:**
  - Chrome 90+ ✅
  - Firefox 88+ ✅
  - Safari 14+ ✅
  - Edge 90+ ✅
  
- **Mobile:**
  - Chrome Mobile (Android) ✅
  - Safari (iOS 14+) ✅
  - Samsung Internet ✅

**Required Browser Features:**
- JavaScript enabled
- Cookies enabled
- LocalStorage support
- WebSocket support (for real-time features)

**For Blockchain Features:**
- **MetaMask Extension** (Desktop)
- **MetaMask Mobile App** (Mobile)
- **Alternative Wallets:** WalletConnect-compatible wallets

#### 11.3.2 User Software Requirements

**No Installation Required:**
- Web-based application (runs in browser)
- No desktop application download needed

**Optional:**
- MetaMask browser extension (for blockchain features)
- Email client (for notifications)

### 11.4 Network Requirements

#### 11.4.1 Bandwidth Requirements

**User-Side:**
- **Minimum:** 2 Mbps download, 1 Mbps upload
- **Recommended:** 10 Mbps download, 5 Mbps upload
- **Optimal:** 50 Mbps+ for HD images

**Page Load Estimates:**
- Landing Page: ~500 KB
- Browse Page: ~1-2 MB (with images)
- Product Details: ~800 KB - 1.5 MB
- Dashboard: ~600 KB

#### 11.4.2 API Endpoints

**Supabase API:**
- **Endpoint:** `https://[project-ref].supabase.co`
- **Protocol:** HTTPS (SSL/TLS)
- **Regions:** Auto-detected (global CDN)

**Blockchain RPC:**
- **Alchemy Sepolia:** `https://eth-sepolia.g.alchemy.com/v2/[API_KEY]`
- **Protocol:** HTTPS
- **Rate Limits:** 300M compute units/month (free tier)

**External Services:**
- **Etherscan:** `https://sepolia.etherscan.io`
- **MetaMask:** Browser extension integration

### 11.5 Security Requirements

#### 11.5.1 SSL/TLS Certificates
- **HTTPS Required:** All production environments
- **Certificate:** Auto-managed by hosting provider (Vercel/Netlify)
- **Protocol:** TLS 1.2 or higher

#### 11.5.2 Environment Variables

**Required Environment Variables:**
```bash
# Frontend (.env)
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_CONTRACT_ADDRESS=0x3F1fa083D1103e6fea9e3Dd6c1E95b4505Ac6564
VITE_ALCHEMY_API_KEY=[alchemy-api-key]

# Backend/Blockchain (hardhat)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/[API_KEY]
SEPOLIA_PRIVATE_KEY=[deployer-private-key]
ETHERSCAN_API_KEY=[etherscan-key] (optional)
```

**Security Measures:**
- Never commit `.env` files to Git
- Use platform-specific environment variable management
- Rotate API keys regularly
- Use different keys for development/production

### 11.6 Scalability & Performance Targets

#### 11.6.1 Performance Benchmarks

| Metric | Target | Current |
|--------|--------|---------|
| **Page Load Time** | < 3 seconds | ~1.5-2.5s |
| **API Response Time** | < 2 seconds | ~200-800ms |
| **Database Query Time** | < 500ms | ~50-200ms |
| **Lighthouse Score** | 90+ | 85-95 |
| **Time to Interactive (TTI)** | < 5 seconds | ~3-4s |
| **First Contentful Paint (FCP)** | < 1.8s | ~1.2-1.6s |

#### 11.6.2 Concurrent User Support

| Tier | Users | Database | Supabase Plan |
|------|-------|----------|---------------|
| **Development** | 10-50 | Free Tier | Free |
| **Beta/Staging** | 100-500 | Free Tier | Free |
| **Production (Small)** | 500-1,000 | Pro Tier | $25/month |
| **Production (Medium)** | 1,000-5,000 | Pro Tier | $25/month |
| **Production (Large)** | 5,000+ | Team/Enterprise | Custom pricing |

### 11.7 Third-Party Service Dependencies

#### 11.7.1 Critical Services

| Service | Purpose | Free Tier | Paid Tier |
|---------|---------|-----------|-----------|
| **Supabase** | Backend, Database, Auth, Storage | 500MB DB, 1GB Storage | $25/month (8GB DB, 100GB Storage) |
| **Alchemy** | Blockchain RPC Provider | 300M compute units/month | $49/month |
| **Vercel/Netlify** | Frontend Hosting | Unlimited projects | $20/month (Pro features) |
| **GitHub** | Version Control | Unlimited public repos | Free for this project |
| **MetaMask** | User Wallets | Free (user-side) | N/A |

#### 11.7.2 Optional Services

| Service | Purpose | Cost |
|---------|---------|------|
| **SendGrid/Mailgun** | Transactional Emails | Free tier available |
| **Sentry** | Error Tracking | Free tier (5k events/month) |
| **Google Analytics** | Usage Analytics | Free |
| **Cloudflare** | CDN & DDoS Protection | Free tier available |

### 11.8 Development Tool Requirements

#### 11.8.1 Required Development Packages

**Frontend Dependencies:**
```json
{
  "react": "^19.2.0",
  "typescript": "~5.9.3",
  "vite": "^7.1.7",
  "tailwindcss": "^4.1.14",
  "ethers": "^6.15.0",
  "@supabase/supabase-js": "^2.75.0",
  "react-router": "^7.9.4"
}
```

**Backend/Blockchain Dependencies:**
```json
{
  "hardhat": "^3.0.0-beta",
  "@nomicfoundation/hardhat-toolbox": "latest",
  "dotenv": "^17.2.3",
  "ethers": "^6.x"
}
```

**Total Package Size:**
- node_modules: ~400-600 MB
- Build output: ~2-5 MB (optimized)

#### 11.8.2 Build Tools

**Compilation:**
- **Vite:** Frontend bundling and optimization
- **Hardhat:** Smart contract compilation
- **TypeScript Compiler:** Type checking

**Build Process:**
```bash
# Frontend build
npm run build
# Output: dist/ folder (~2-5 MB)

# Smart contract build
npx hardhat compile
# Output: artifacts/ and typechain-types/
```

### 11.9 Deployment Requirements

#### 11.9.1 Continuous Deployment

**Git Repository:**
- **Platform:** GitHub
- **Branch Strategy:** main (production)
- **Auto-deploy:** On push to main branch

**Build Configuration:**
```yaml
# Vercel/Netlify Auto-detected
Build Command: npm run build
Output Directory: dist
Node Version: 18.x
```

#### 11.9.2 Environment-Specific Configurations

**Development:**
- Local development server (Vite)
- Local blockchain (Hardhat network)
- Supabase local instance (optional)

**Staging:**
- Vercel preview deployments
- Sepolia testnet
- Supabase staging project

**Production:**
- Vercel/Netlify production
- Sepolia testnet (current) / Mainnet (future)
- Supabase production project

### 11.10 Monitoring & Maintenance Requirements

#### 11.10.1 Monitoring Tools

**Performance Monitoring:**
- Browser DevTools (Network, Performance tabs)
- Lighthouse CI for automated audits
- Vercel Analytics (optional)

**Error Tracking:**
- Browser console logging
- Supabase logs and analytics
- Alchemy dashboard for blockchain monitoring

**Uptime Monitoring:**
- Supabase status dashboard
- Vercel/Netlify status page
- Alchemy API status

#### 11.10.2 Maintenance Schedule

**Regular Tasks:**
- **Daily:** Monitor error logs, check API status
- **Weekly:** Review analytics, check database performance
- **Monthly:** Security updates, dependency updates
- **Quarterly:** Performance optimization, feature reviews

**Update Policy:**
- **Security patches:** Immediate
- **Minor updates:** Weekly review
- **Major updates:** Planned releases with testing

---

## 12. CONCLUSION & SUMMARY

### 12.1 System Overview Summary

The **CSU Marketplace** is a comprehensive blockchain-integrated campus trading platform that successfully combines modern web technologies with Ethereum blockchain infrastructure to create a secure, transparent, and user-friendly marketplace for the Cagayan State University community.

### 12.2 Key Achievements

✅ **Complete System Architecture:**
- Hybrid decentralized system (Web2 + Web3)
- 14-table normalized database schema
- Smart contract with multi-transaction logging
- Comprehensive user management and authentication

✅ **Technology Stack:**
- React 19 + TypeScript frontend
- Supabase (PostgreSQL) backend
- Ethereum Sepolia blockchain
- Hardhat 3 development environment

✅ **Core Features Implemented:**
- User authentication with wallet integration
- Product listing management (FOR_SALE, FOR_RENT, SERVICE)
- Shopping cart and checkout system
- Blockchain transaction recording
- Review and rating system
- Admin approval workflow
- Real-time notifications
- Analytics dashboards

✅ **Security & Performance:**
- Row Level Security (RLS) policies
- 80+ database indexes
- Input validation and sanitization
- HTTPS encryption
- JWT token authentication
- Optimized query performance

### 12.3 Development Approach

The project follows **Agile Scrum methodology** with:
- 8 sprint cycles over 16 weeks
- Iterative feature development
- Continuous integration and deployment
- Regular stakeholder feedback
- Test-driven development

### 12.4 System Capabilities

**Functional Capabilities:**
- Supports 90+ functional requirements
- Handles multiple listing types with type-specific fields
- Complete order lifecycle management
- Immutable blockchain audit trail
- Real-time notifications and updates

**Non-Functional Capabilities:**
- Page load times < 3 seconds
- Supports 500+ concurrent users
- 99.5% uptime target
- Mobile-responsive design
- Accessible user interface

### 12.5 Future Enhancements

**Planned Features:**
- Payment gateway integration
- In-app messaging system
- Advanced search with AI
- Mobile native applications
- Multi-language support
- Social media integration
- Enhanced analytics with ML

**Scalability Plans:**
- Database partitioning for large datasets
- Redis caching layer
- CDN optimization
- Microservices architecture (if needed)
- Migration to Ethereum mainnet or Layer 2

### 12.6 Project Documentation

This comprehensive system analysis document covers:
1. ✅ Conceptual Framework (IPO Model, Architecture)
2. ✅ Agile Development Approach (Sprints, User Stories)
3. ✅ System Flowcharts (7 detailed flows)
4. ✅ Use Case Diagram (20+ use cases)
5. ✅ Data Flow Diagrams (Level 0-2)
6. ✅ Requirements (90+ functional, 60+ non-functional)
7. ✅ Technology Stack (Complete specification)
8. ✅ Frontend Development (Architecture, Components)
9. ✅ Backend Development (Supabase, APIs)
10. ✅ Database Management (Schema, Optimization)
11. ✅ Hardware/Software Requirements

### 12.7 Project Success Metrics

**Technical Metrics:**
- ✅ 100% requirement implementation
- ✅ 80+ database indexes for performance
- ✅ < 3s page load times
- ✅ Smart contract deployed on Sepolia
- ✅ Complete audit trail via blockchain

**User Experience Metrics:**
- Intuitive UI/UX design
- Mobile-responsive interface
- Clear error messages and feedback
- Fast and reliable performance

**Security Metrics:**
- Row Level Security implemented
- All inputs validated
- HTTPS encryption
- No critical vulnerabilities

---

## APPENDICES

### Appendix A: Glossary

- **Blockchain:** Distributed ledger technology for immutable record-keeping
- **DFD:** Data Flow Diagram - visual representation of data movement
- **ERD:** Entity Relationship Diagram - database structure visualization
- **IPO:** Input-Process-Output model
- **MetaMask:** Browser extension cryptocurrency wallet
- **RLS:** Row Level Security - database-level access control
- **Sepolia:** Ethereum test network
- **Smart Contract:** Self-executing code on blockchain
- **Supabase:** Open-source Firebase alternative (BaaS)
- **Web3:** Decentralized web using blockchain technology

### Appendix B: References

1. **React Documentation:** https://react.dev/
2. **TypeScript Handbook:** https://www.typescriptlang.org/docs/
3. **Supabase Documentation:** https://supabase.com/docs
4. **Hardhat Documentation:** https://hardhat.org/docs
5. **Ethers.js Documentation:** https://docs.ethers.org/
6. **Solidity Documentation:** https://docs.soliditylang.org/
7. **PostgreSQL Documentation:** https://www.postgresql.org/docs/
8. **TailwindCSS Documentation:** https://tailwindcss.com/docs

### Appendix C: Contact Information

**Project Repository:** https://github.com/kurtchinta/CSU-MARKETPLACE  
**Developer:** Kurt Chinta  
**Institution:** Caraga State University  
**Date:** November 20, 2025

---

**END OF SYSTEM ANALYSIS DOCUMENT**

*This document provides a complete technical specification and analysis of the CSU Marketplace system, covering all aspects from conceptual design to implementation requirements.*
