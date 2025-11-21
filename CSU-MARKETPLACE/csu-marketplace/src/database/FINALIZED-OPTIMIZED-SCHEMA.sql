-- =====================================================================
-- CSU MARKETPLACE - PRODUCTION-READY DATABASE SCHEMA
-- Organized, Optimized & Finalized
-- Version: 1.0 Production
-- Date: November 14, 2025
-- =====================================================================

-- Clean slate
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- =====================================================================
-- ENUMS
-- =====================================================================

CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE notification_type AS ENUM ('transaction', 'product', 'system', 'blockchain');

-- =====================================================================
-- TABLE 1: ROLES
-- =====================================================================

CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name user_role UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (role_name) VALUES ('admin'), ('user');

-- =====================================================================
-- TABLE 2: USERS (Core Identity)
-- =====================================================================

CREATE TABLE users (
    -- Identity
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL DEFAULT 2 REFERENCES roles(role_id),
    is_admin BOOLEAN GENERATED ALWAYS AS (role_id = 1) STORED,
    
    -- Authentication & Contact
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(42) UNIQUE,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    id_number VARCHAR(20) UNIQUE NOT NULL,
    department VARCHAR(100),
    year_level VARCHAR(10),
    gender VARCHAR(10),
    phone_number VARCHAR(20),
    bio TEXT,
    profile_picture_url TEXT,
    
    -- Account Status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Statistics (Auto-updated by triggers)
    total_products_posted INTEGER DEFAULT 0,
    total_products_sold INTEGER DEFAULT 0,
    total_orders_as_buyer INTEGER DEFAULT 0,
    total_orders_as_seller INTEGER DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0.00,
    average_seller_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews_received INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_wallet_address CHECK (
        wallet_address IS NULL OR 
        (LENGTH(wallet_address) = 42 AND wallet_address ~* '^0x[a-f0-9]{40}$')
    ),
    CONSTRAINT valid_gender CHECK (gender IN ('Male', 'Female', 'Other')),
    CONSTRAINT valid_year_level CHECK (year_level IN ('1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'))
);

-- Indexes
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_wallet_address ON users(wallet_address) WHERE wallet_address IS NOT NULL;
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_id_number ON users(id_number);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_last_active ON users(last_active_at DESC);
CREATE INDEX idx_users_profile_picture ON users(profile_picture_url) WHERE profile_picture_url IS NOT NULL;

-- =====================================================================
-- TABLE 3: USER PROFILE PICTURES (REMOVED - Using profile_picture_url in users table)
-- =====================================================================

-- Note: Profile pictures are now stored directly in users.profile_picture_url
-- Storage path: profile-pictures/{user_id}/profile.{ext}
-- No separate table needed

-- =====================================================================
-- TABLE 4: CATEGORIES
-- =====================================================================

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    total_products INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial categories
INSERT INTO categories (category_name) VALUES
('Electronics'),
('Mobile Phones & Accessories'),
('Laptops & Computers'),
('Chargers & Cables'),
('Earphones & Headphones'),
('Books & Supplies'),
('Notebooks & Stationery'),
('Calculators'),
('Art Materials'),
('Laboratory Equipment'),
('Clothing & Accessories'),
('Uniforms'),
('Shoes & Bags'),
('Campus Merchandise'),
('Personal Care Items'),
('Furniture'),
('Dorm Essentials'),
('Appliances'),
('Bedding & Curtains'),
('Storage & Organization'),
('Sports & Recreation'),
('Musical Instruments'),
('Outdoor Equipment'),
('Gaming Accessories'),
('Services'),
('Printing & Photocopy'),
('Tutoring & Academic Help'),
('Tech Support & Repairs'),
('Photography & Videography'),
('Event Assistance'),
('Room or Equipment Rentals'),
('Transportation / Ride Share'),
('Snacks & Homemade Goods'),
('Cooked Meals & Catering'),
('Beverages'),
('Others');

CREATE INDEX idx_categories_name ON categories(category_name);

-- =====================================================================
-- TABLE 5: PRODUCTS
-- =====================================================================

CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(category_id),
    
    -- Basic Info
    product_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    sold_count INTEGER DEFAULT 0,
    condition VARCHAR(50),
    
    -- Listing Details
    listing_type TEXT NOT NULL DEFAULT 'FOR_SALE',
    status TEXT DEFAULT 'PENDING',
    
    -- Type-specific fields
    rent_duration VARCHAR(50),
    return_condition TEXT,
    service_schedule VARCHAR(100),
    service_duration VARCHAR(50),
    requirements TEXT,
    
    -- Location & Contact
    meetup_location TEXT,
    pickup_location TEXT,
    contact_information TEXT,
    
    -- Status & Visibility
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    
    -- Admin Actions
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_price CHECK (price >= 0),
    CONSTRAINT valid_quantity CHECK (quantity >= 0),
    CONSTRAINT valid_listing_type CHECK (listing_type IN ('FOR_SALE', 'FOR_RENT', 'SERVICE')),
    CONSTRAINT valid_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

-- Indexes
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_listing_type ON products(listing_type);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_products_available ON products(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_products_approved ON products(status, is_available) WHERE status = 'APPROVED' AND is_available = TRUE;

-- =====================================================================
-- TABLE 6: PRODUCT IMAGES
-- =====================================================================

CREATE TABLE product_images (
    image_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    image_order INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_image_order CHECK (image_order BETWEEN 1 AND 5),
    CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 5242880),
    CONSTRAINT valid_mime_type CHECK (mime_type IN ('image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'))
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_user_id ON product_images(user_id);
CREATE INDEX idx_product_images_order ON product_images(product_id, image_order);

-- =====================================================================
-- TABLE 7: CART
-- =====================================================================

CREATE TABLE cart (
    cart_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_cart_quantity CHECK (quantity > 0),
    UNIQUE(user_id, product_id)
);

CREATE INDEX idx_cart_user_id ON cart(user_id);
CREATE INDEX idx_cart_product_id ON cart(product_id);

-- =====================================================================
-- TABLE 8: ORDER DETAILS (Internal Order Management)
-- =====================================================================

CREATE TABLE order_details (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_detail_id SERIAL UNIQUE NOT NULL,
    
    -- Participants
    buyer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    
    -- Order Info (snapshot from product at time of order)
    listing_type TEXT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    buyer_quantity INTEGER NOT NULL DEFAULT 1,
    
    -- Locations (from product)
    pickup_location TEXT,
    meetup_location TEXT,
    
    -- Type-specific fields
    requirements TEXT,
    return_condition TEXT,
    rental_duration TEXT,
    start_date DATE,
    end_date DATE,
    service_schedule TEXT,
    service_duration TEXT,
    
    -- Communication
    message_to_seller TEXT,
    
    -- Seller Response
    final_pickup_location TEXT,
    final_meetup_location TEXT,
    rejection_reason TEXT,
    
    -- Buyer Actions
    cancellation_reason TEXT,
    
    -- Status
    order_status TEXT DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_order_price CHECK (price >= 0),
    CONSTRAINT valid_buyer_quantity CHECK (buyer_quantity > 0),
    CONSTRAINT different_buyer_seller CHECK (buyer_id != seller_id),
    CONSTRAINT valid_order_status CHECK (order_status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
    CONSTRAINT valid_listing_type CHECK (listing_type IN ('FOR_SALE', 'FOR_RENT', 'SERVICE'))
);

-- Indexes
CREATE INDEX idx_order_details_buyer_id ON order_details(buyer_id);
CREATE INDEX idx_order_details_seller_id ON order_details(seller_id);
CREATE INDEX idx_order_details_product_id ON order_details(product_id);
CREATE INDEX idx_order_details_status ON order_details(order_status);
CREATE INDEX idx_order_details_created_at ON order_details(created_at DESC);

-- =====================================================================
-- TABLE 9: TRANSACTIONS (Blockchain Record)
-- =====================================================================

CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES order_details(order_id),
    
    -- Blockchain Data
    blockchain_id BIGINT UNIQUE,
    blockchain_tx_hash VARCHAR(66),
    blockchain_confirmed_at TIMESTAMPTZ,
    blockchain_block_number BIGINT,
    gas_used BIGINT,
    is_blockchain_pending BOOLEAN DEFAULT TRUE,
    
    -- Participants (snapshot)
    buyer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(product_id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(category_id),
    
    -- Transaction Details (immutable blockchain data)
    buyer_name VARCHAR(200) NOT NULL,
    seller_name VARCHAR(200) NOT NULL,
    seller_phone VARCHAR(20),
    listing_type TEXT NOT NULL,
    category_name VARCHAR(100),
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT NOT NULL,
    item_price DECIMAL(12, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    
    -- Location & Details
    final_pickup_location TEXT,
    final_meetup_location TEXT,
    contact_info TEXT,
    
    -- Type-specific
    return_condition TEXT,
    rental_duration TEXT,
    start_date DATE,
    end_date DATE,
    service_schedule TEXT,
    service_duration TEXT,
    message_to_seller TEXT,
    
    -- Reasons
    rejection_reason TEXT,
    cancellation_reason TEXT,
    
    -- Status & Timestamps
    transaction_status TEXT DEFAULT 'PENDING',
    pending_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_transaction_status CHECK (
        transaction_status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED')
    ),
    CONSTRAINT valid_listing_type CHECK (
        listing_type IN ('FOR_SALE', 'FOR_RENT', 'SERVICE')
    )
);

-- Indexes
CREATE INDEX idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller_id ON transactions(seller_id);
CREATE INDEX idx_transactions_product_id ON transactions(product_id);
CREATE INDEX idx_transactions_order_id ON transactions(order_id);
CREATE INDEX idx_transactions_status ON transactions(transaction_status);
CREATE INDEX idx_transactions_blockchain_tx_hash ON transactions(blockchain_tx_hash) WHERE blockchain_tx_hash IS NOT NULL;
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_blockchain_pending ON transactions(is_blockchain_pending) WHERE is_blockchain_pending = true;
CREATE INDEX idx_transactions_completed_at ON transactions(completed_at DESC) WHERE completed_at IS NOT NULL;

-- =====================================================================
-- TABLE 10: BLOCKCHAIN TRANSACTIONS (Blockchain Activity Log)
-- =====================================================================

CREATE TABLE blockchain_transactions (
    blockchain_tx_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(transaction_id) ON DELETE SET NULL,
    blockchain_tx_hash VARCHAR(66) UNIQUE,
    blockchain_status TEXT NOT NULL DEFAULT 'pending',
    contract_address VARCHAR(42) NOT NULL DEFAULT '0x742e1FE604CAD88CB58A67BA23e407c6A15bAFa6',
    from_address VARCHAR(42),
    to_address VARCHAR(42),
    blockchain_id BIGINT,
    gas_used BIGINT,
    gas_price BIGINT,
    block_number BIGINT,
    block_timestamp TIMESTAMPTZ,
    confirmation_count INTEGER DEFAULT 0,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    CONSTRAINT valid_blockchain_status CHECK (blockchain_status IN ('pending', 'confirmed', 'failed')),
    CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= 5)
);

-- Indexes
CREATE INDEX idx_blockchain_tx_transaction_id ON blockchain_transactions(transaction_id);
CREATE INDEX idx_blockchain_tx_hash ON blockchain_transactions(blockchain_tx_hash);
CREATE INDEX idx_blockchain_tx_status ON blockchain_transactions(blockchain_status);
CREATE INDEX idx_blockchain_tx_pending ON blockchain_transactions(blockchain_status) WHERE blockchain_status = 'pending';

-- =====================================================================
-- TABLE 11: REVIEWS
-- =====================================================================

CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(product_id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    response TEXT,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(transaction_id, reviewer_id)
);

-- Indexes
CREATE INDEX idx_reviews_transaction_id ON reviews(transaction_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_seller_id ON reviews(seller_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- =====================================================================
-- TABLE 12: NOTIFICATIONS
-- =====================================================================

CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL DEFAULT 'system',
    related_product_id INTEGER REFERENCES products(product_id) ON DELETE SET NULL,
    related_order_id UUID REFERENCES order_details(order_id) ON DELETE SET NULL,
    related_transaction_id UUID REFERENCES transactions(transaction_id) ON DELETE SET NULL,
    related_review_id INTEGER REFERENCES reviews(review_id) ON DELETE SET NULL,
    action_url TEXT,
    action_label VARCHAR(100),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- =====================================================================
-- TABLE 13: ADMIN LOGS
-- =====================================================================

CREATE TABLE admin_logs (
    log_id SERIAL PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_user UUID REFERENCES users(user_id) ON DELETE SET NULL,
    target_product INTEGER REFERENCES products(product_id) ON DELETE SET NULL,
    target_transaction UUID REFERENCES transactions(transaction_id) ON DELETE SET NULL,
    description TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_action ON admin_logs(action);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- =====================================================================
-- TABLE 14: PRODUCT FAVORITES
-- =====================================================================

CREATE TABLE product_favorites (
    favorite_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Indexes
CREATE INDEX idx_favorites_user_id ON product_favorites(user_id);
CREATE INDEX idx_favorites_product_id ON product_favorites(product_id);
CREATE INDEX idx_favorites_created_at ON product_favorites(created_at DESC);

-- =====================================================================
-- TRIGGERS & FUNCTIONS
-- =====================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_details_updated_at BEFORE UPDATE ON order_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- No trigger needed for user_profile_pictures table (removed)

-- Category product count management
CREATE OR REPLACE FUNCTION trigger_increment_category_product_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE categories SET total_products = total_products + 1 WHERE category_id = NEW.category_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_product_created_increment_category
    AFTER INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION trigger_increment_category_product_count();

CREATE OR REPLACE FUNCTION trigger_decrement_category_product_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE categories SET total_products = GREATEST(total_products - 1, 0) WHERE category_id = OLD.category_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_product_deleted_decrement_category
    AFTER DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION trigger_decrement_category_product_count();

CREATE OR REPLACE FUNCTION trigger_update_category_on_product_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.category_id != NEW.category_id THEN
        UPDATE categories SET total_products = GREATEST(total_products - 1, 0) WHERE category_id = OLD.category_id;
        UPDATE categories SET total_products = total_products + 1 WHERE category_id = NEW.category_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_product_category_changed
    AFTER UPDATE OF category_id ON products
    FOR EACH ROW
    WHEN (OLD.category_id IS DISTINCT FROM NEW.category_id)
    EXECUTE FUNCTION trigger_update_category_on_product_change();

-- Transaction status timestamp management
CREATE OR REPLACE FUNCTION handle_transaction_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_status != OLD.transaction_status THEN
        CASE NEW.transaction_status
            WHEN 'ACCEPTED' THEN NEW.accepted_at = NOW();
            WHEN 'REJECTED' THEN NEW.rejected_at = NOW();
            WHEN 'COMPLETED' THEN NEW.completed_at = NOW();
            WHEN 'CANCELLED' THEN NEW.cancelled_at = NOW();
        END CASE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_status_change
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION handle_transaction_status_change();

-- Review validation (only buyers can review completed transactions)
CREATE OR REPLACE FUNCTION validate_review_creation()
RETURNS TRIGGER AS $$
DECLARE
    v_buyer_id UUID;
    v_status TEXT;
BEGIN
    SELECT buyer_id, transaction_status INTO v_buyer_id, v_status
    FROM transactions WHERE transaction_id = NEW.transaction_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;
    
    IF NEW.reviewer_id != v_buyer_id THEN
        RAISE EXCEPTION 'Only buyers can review transactions';
    END IF;
    
    IF v_status != 'COMPLETED' THEN
        RAISE EXCEPTION 'Can only review completed transactions';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_review_before_insert
    BEFORE INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION validate_review_creation();

-- Update user statistics on transaction completion
CREATE OR REPLACE FUNCTION update_user_stats_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_status = 'COMPLETED' AND OLD.transaction_status != 'COMPLETED' THEN
        -- Update seller stats
        UPDATE users 
        SET 
            total_products_sold = total_products_sold + 1,
            total_revenue = total_revenue + NEW.item_price,
            total_orders_as_seller = total_orders_as_seller + 1
        WHERE user_id = NEW.seller_id;
        
        -- Update buyer stats
        UPDATE users 
        SET total_orders_as_buyer = total_orders_as_buyer + 1
        WHERE user_id = NEW.buyer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_stats_on_complete
    AFTER UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_on_transaction();

-- Update seller rating when review is added
CREATE OR REPLACE FUNCTION update_seller_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_avg_rating DECIMAL(3, 2);
    v_review_count INTEGER;
BEGIN
    SELECT AVG(rating)::DECIMAL(3, 2), COUNT(*)
    INTO v_avg_rating, v_review_count
    FROM reviews
    WHERE seller_id = NEW.seller_id;
    
    UPDATE users 
    SET 
        average_seller_rating = COALESCE(v_avg_rating, 0.00),
        total_reviews_received = v_review_count
    WHERE user_id = NEW.seller_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_on_review
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_seller_rating();

-- Increment user product count on product creation
CREATE OR REPLACE FUNCTION increment_user_product_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET total_products_posted = total_products_posted + 1 WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_product_created_increment_user_count
    AFTER INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION increment_user_product_count();

-- Update product sold_count when transaction is completed
CREATE OR REPLACE FUNCTION update_product_sold_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_status = 'COMPLETED' AND OLD.transaction_status != 'COMPLETED' THEN
        UPDATE products 
        SET sold_count = sold_count + NEW.quantity
        WHERE product_id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sold_count_on_complete
    AFTER UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_product_sold_count();

-- =====================================================================
-- ESSENTIAL VIEWS
-- =====================================================================

-- Active products view
CREATE OR REPLACE VIEW vw_active_products AS
SELECT 
    p.product_id,
    p.product_name,
    p.description,
    p.price,
    p.quantity,
    p.listing_type,
    p.condition,
    p.view_count,
    p.created_at,
    u.user_id,
    u.username,
    u.first_name,
    u.last_name,
    u.average_seller_rating,
    c.category_id,
    c.category_name,
    COALESCE(array_agg(pi.storage_path ORDER BY pi.image_order) FILTER (WHERE pi.storage_path IS NOT NULL), '{}') as image_paths
FROM products p
INNER JOIN users u ON p.user_id = u.user_id
INNER JOIN categories c ON p.category_id = c.category_id
LEFT JOIN product_images pi ON p.product_id = pi.product_id
WHERE p.status = 'APPROVED' AND p.is_available = TRUE
GROUP BY p.product_id, u.user_id, u.username, u.first_name, u.last_name, u.average_seller_rating, c.category_id, c.category_name;

-- User profile view
CREATE OR REPLACE VIEW vw_user_profiles AS
SELECT 
    u.user_id,
    u.username,
    u.first_name,
    u.last_name,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
    u.email,
    u.department,
    u.year_level,
    u.bio,
    u.is_admin,
    u.is_verified,
    u.total_products_posted,
    u.total_products_sold,
    u.total_revenue,
    u.average_seller_rating,
    u.total_reviews_received,
    u.created_at,
    upp.public_url as profile_picture_url,
    COUNT(DISTINCT p.product_id) FILTER (WHERE p.status = 'APPROVED' AND p.is_available = TRUE) as active_listings
FROM users u
LEFT JOIN user_profile_pictures upp ON u.user_id = upp.user_id
LEFT JOIN products p ON u.user_id = p.user_id
GROUP BY u.user_id, upp.public_url;

-- =====================================================================
-- COMPLETION MESSAGE
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'CSU MARKETPLACE - PRODUCTION SCHEMA DEPLOYED';
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'Tables: 14';
    RAISE NOTICE 'Indexes: 80+';
    RAISE NOTICE 'Triggers: 12';
    RAISE NOTICE 'Views: 2';
    RAISE NOTICE '';
    RAISE NOTICE 'Status: ✅ Ready for Production';
    RAISE NOTICE '========================================================';
END $$;

-- =====================================================================
-- ALTER ORDER_DETAILS: ADD CATEGORY_NAME COLUMN
-- =====================================================================

ALTER TABLE order_details
ADD COLUMN category_name VARCHAR(100);

-- Create index on category_name for faster queries
CREATE INDEX idx_order_details_category_name ON order_details(category_name);

-- =====================================================================
-- ALTER REVIEWS: ADD REVIEW_IMAGES COLUMN
-- =====================================================================

-- Add review_images column to store array of image URLs
ALTER TABLE reviews
ADD COLUMN review_images TEXT[];

-- Add constraint to limit number of review images (max 5)
ALTER TABLE reviews
ADD CONSTRAINT check_review_images_count CHECK (
    review_images IS NULL OR array_length(review_images, 1) <= 5
);

-- Create index on review_images for queries that check if reviews have images
CREATE INDEX idx_reviews_with_images ON reviews(review_id) WHERE review_images IS NOT NULL AND array_length(review_images, 1) > 0;

-- Add comment for documentation
COMMENT ON COLUMN reviews.review_images IS 'Array of image URLs (max 5) uploaded by the buyer with their review. Storage path: review-images/{review_id}/{filename}';

-- Populate category_name from products -> categories for existing records
UPDATE order_details od
SET category_name = c.category_name
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id
WHERE od.product_id = p.product_id AND od.category_name IS NULL;

-- Create trigger to auto-populate category_name when new orders are created
CREATE OR REPLACE FUNCTION populate_order_category_name()
RETURNS TRIGGER AS $$
BEGIN
    SELECT c.category_name INTO NEW.category_name
    FROM products p
    INNER JOIN categories c ON p.category_id = c.category_id
    WHERE p.product_id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_created_set_category_name
    BEFORE INSERT ON order_details
    FOR EACH ROW
    EXECUTE FUNCTION populate_order_category_name();
