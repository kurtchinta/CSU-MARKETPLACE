-- =====================================================================
-- CSU MARKETPLACE - COMPREHENSIVE NOTIFICATION SYSTEM
-- Automated Notifications for All System Activities
-- Version: 1.0 Production
-- Date: November 14, 2025
-- =====================================================================
-- 
-- PURPOSE:
-- This file implements a complete notification system that automatically
-- generates notifications for users and admins based on system activities.
--
-- EVENTS COVERED:
-- 1. Orders: Create, Accept, Reject, Complete, Cancel
-- 2. Products: Create, Approve, Reject, Update, Delete
-- 3. Reviews: New review received, Review response
-- 4. Blockchain: Transaction confirmation, failures
-- 5. Cart: Items added (optional)
-- 6. Favorites: Product favorited by users
-- 7. System: Account updates, admin actions
--
-- NOTIFICATION TYPES:
-- - transaction: Order and transaction-related notifications
-- - product: Product listing and moderation notifications
-- - system: Account and system-level notifications
-- - blockchain: Blockchain transaction status updates
--
-- =====================================================================

-- =====================================================================
-- HELPER FUNCTION: Get All Admin User IDs
-- =====================================================================

CREATE OR REPLACE FUNCTION get_admin_user_ids()
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT user_id 
        FROM users 
        WHERE is_admin = TRUE AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_admin_user_ids() IS 
'Returns array of all active admin user IDs for bulk notification';

-- =====================================================================
-- HELPER FUNCTION: Get Product Owner Details
-- =====================================================================

CREATE OR REPLACE FUNCTION get_product_owner(p_product_id INTEGER)
RETURNS TABLE (
    owner_id UUID,
    owner_name VARCHAR(201),
    product_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.user_id,
        CONCAT(u.first_name, ' ', u.last_name)::VARCHAR(201),
        p.product_name
    FROM products p
    INNER JOIN users u ON p.user_id = u.user_id
    WHERE p.product_id = p_product_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_product_owner(INTEGER) IS 
'Returns owner details for a given product ID';

-- =====================================================================
-- CORE NOTIFICATION FUNCTION: Create Notification
-- =====================================================================

CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title VARCHAR(255),
    p_message TEXT,
    p_type notification_type,
    p_related_product_id INTEGER DEFAULT NULL,
    p_related_order_id UUID DEFAULT NULL,
    p_related_transaction_id UUID DEFAULT NULL,
    p_related_review_id INTEGER DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL,
    p_action_label VARCHAR(100) DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_notification_id INTEGER;
BEGIN
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        related_product_id,
        related_order_id,
        related_transaction_id,
        related_review_id,
        action_url,
        action_label,
        is_read,
        created_at
    ) VALUES (
        p_user_id,
        p_title,
        p_message,
        p_type,
        p_related_product_id,
        p_related_order_id,
        p_related_transaction_id,
        p_related_review_id,
        p_action_url,
        p_action_label,
        FALSE,
        NOW()
    )
    RETURNING notification_id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_notification IS 
'Core function to create a single notification with all optional parameters';

-- =====================================================================
-- BULK NOTIFICATION FUNCTION: Notify All Admins
-- =====================================================================

CREATE OR REPLACE FUNCTION notify_all_admins(
    p_title VARCHAR(255),
    p_message TEXT,
    p_type notification_type,
    p_related_product_id INTEGER DEFAULT NULL,
    p_related_order_id UUID DEFAULT NULL,
    p_related_transaction_id UUID DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL,
    p_action_label VARCHAR(100) DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_admin_id UUID;
    v_count INTEGER := 0;
BEGIN
    FOR v_admin_id IN 
        SELECT user_id FROM users WHERE is_admin = TRUE AND is_active = TRUE
    LOOP
        PERFORM create_notification(
            v_admin_id,
            p_title,
            p_message,
            p_type,
            p_related_product_id,
            p_related_order_id,
            p_related_transaction_id,
            NULL,
            p_action_url,
            p_action_label
        );
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_all_admins IS 
'Sends notification to all active admin users';

-- =====================================================================
-- ORDER NOTIFICATIONS
-- =====================================================================

-- 1. ORDER CREATED - Notify Seller and Admins
CREATE OR REPLACE FUNCTION fn_notify_order_created()
RETURNS TRIGGER AS $$
DECLARE
    v_buyer_name VARCHAR(201);
    v_seller_name VARCHAR(201);
    v_product_name VARCHAR(255);
BEGIN
    -- Get buyer, seller, and product names
    SELECT CONCAT(first_name, ' ', last_name) INTO v_buyer_name
    FROM users WHERE user_id = NEW.buyer_id;
    
    SELECT CONCAT(first_name, ' ', last_name) INTO v_seller_name
    FROM users WHERE user_id = NEW.seller_id;
    
    v_product_name := NEW.product_name;
    
    -- Notify Seller
    PERFORM create_notification(
        NEW.seller_id,
        'New Order Received!',
        v_buyer_name || ' has placed an order for your product "' || v_product_name || '". Please review and respond.',
        'transaction',
        NEW.product_id,
        NEW.order_id,
        NULL,
        NULL,
        '/dashboard/seller-orders',
        'View Order'
    );
    
    -- Notify All Admins
    PERFORM notify_all_admins(
        'New Order Placed',
        'Order #' || NEW.order_detail_id || ': ' || v_buyer_name || ' ordered "' || v_product_name || '" from ' || v_seller_name,
        'transaction',
        NEW.product_id,
        NEW.order_id,
        NULL,
        '/admin/dashboard?tab=transactions',
        'View Details'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_order_created
    AFTER INSERT ON order_details
    FOR EACH ROW
    EXECUTE FUNCTION fn_notify_order_created();

COMMENT ON FUNCTION fn_notify_order_created() IS 
'Notifies seller and admins when a new order is placed';

-- 2. ORDER ACCEPTED - Notify Buyer
CREATE OR REPLACE FUNCTION fn_notify_order_accepted()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_name VARCHAR(201);
BEGIN
    IF NEW.order_status = 'accepted' AND OLD.order_status = 'pending' THEN
        SELECT CONCAT(first_name, ' ', last_name) INTO v_seller_name
        FROM users WHERE user_id = NEW.seller_id;
        
        PERFORM create_notification(
            NEW.buyer_id,
            'Order Accepted!',
            v_seller_name || ' has accepted your order for "' || NEW.product_name || '". Check details for pickup/meetup location.',
            'transaction',
            NEW.product_id,
            NEW.order_id,
            NULL,
            NULL,
            '/dashboard/purchases',
            'View Order'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_order_accepted
    AFTER UPDATE OF order_status ON order_details
    FOR EACH ROW
    WHEN (NEW.order_status = 'accepted' AND OLD.order_status = 'pending')
    EXECUTE FUNCTION fn_notify_order_accepted();

COMMENT ON FUNCTION fn_notify_order_accepted() IS 
'Notifies buyer when seller accepts their order';

-- 3. ORDER REJECTED - Notify Buyer
CREATE OR REPLACE FUNCTION fn_notify_order_rejected()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_name VARCHAR(201);
    v_reason TEXT;
BEGIN
    IF NEW.order_status = 'rejected' AND OLD.order_status = 'pending' THEN
        SELECT CONCAT(first_name, ' ', last_name) INTO v_seller_name
        FROM users WHERE user_id = NEW.seller_id;
        
        v_reason := COALESCE(NEW.rejection_reason, 'No reason provided');
        
        PERFORM create_notification(
            NEW.buyer_id,
            'Order Rejected',
            v_seller_name || ' has declined your order for "' || NEW.product_name || '". Reason: ' || v_reason,
            'transaction',
            NEW.product_id,
            NEW.order_id,
            NULL,
            NULL,
            '/dashboard/purchases',
            'View Order'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_order_rejected
    AFTER UPDATE OF order_status ON order_details
    FOR EACH ROW
    WHEN (NEW.order_status = 'rejected' AND OLD.order_status = 'pending')
    EXECUTE FUNCTION fn_notify_order_rejected();

COMMENT ON FUNCTION fn_notify_order_rejected() IS 
'Notifies buyer when seller rejects their order';

-- 4. ORDER COMPLETED - Notify Buyer and Seller
CREATE OR REPLACE FUNCTION fn_notify_order_completed()
RETURNS TRIGGER AS $$
DECLARE
    v_buyer_name VARCHAR(201);
    v_seller_name VARCHAR(201);
BEGIN
    IF NEW.order_status = 'completed' AND OLD.order_status != 'completed' THEN
        SELECT CONCAT(first_name, ' ', last_name) INTO v_buyer_name
        FROM users WHERE user_id = NEW.buyer_id;
        
        SELECT CONCAT(first_name, ' ', last_name) INTO v_seller_name
        FROM users WHERE user_id = NEW.seller_id;
        
        -- Notify Buyer
        PERFORM create_notification(
            NEW.buyer_id,
            'Order Completed!',
            'Your order for "' || NEW.product_name || '" has been completed. Please leave a review!',
            'transaction',
            NEW.product_id,
            NEW.order_id,
            NULL,
            NULL,
            '/dashboard/purchases',
            'Leave Review'
        );
        
        -- Notify Seller
        PERFORM create_notification(
            NEW.seller_id,
            'Sale Completed!',
            'Your sale of "' || NEW.product_name || '" to ' || v_buyer_name || ' has been completed.',
            'transaction',
            NEW.product_id,
            NEW.order_id,
            NULL,
            NULL,
            '/dashboard/sales',
            'View Details'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_order_completed
    AFTER UPDATE OF order_status ON order_details
    FOR EACH ROW
    WHEN (NEW.order_status = 'completed')
    EXECUTE FUNCTION fn_notify_order_completed();

COMMENT ON FUNCTION fn_notify_order_completed() IS 
'Notifies both buyer and seller when order is completed';

-- 5. ORDER CANCELLED - Notify Seller
CREATE OR REPLACE FUNCTION fn_notify_order_cancelled()
RETURNS TRIGGER AS $$
DECLARE
    v_buyer_name VARCHAR(201);
    v_reason TEXT;
BEGIN
    IF NEW.order_status = 'cancelled' AND OLD.order_status != 'cancelled' THEN
        SELECT CONCAT(first_name, ' ', last_name) INTO v_buyer_name
        FROM users WHERE user_id = NEW.buyer_id;
        
        v_reason := COALESCE(NEW.cancellation_reason, 'No reason provided');
        
        PERFORM create_notification(
            NEW.seller_id,
            'Order Cancelled',
            v_buyer_name || ' has cancelled their order for "' || NEW.product_name || '". Reason: ' || v_reason,
            'transaction',
            NEW.product_id,
            NEW.order_id,
            NULL,
            NULL,
            '/dashboard/seller-orders',
            'View Order'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_order_cancelled
    AFTER UPDATE OF order_status ON order_details
    FOR EACH ROW
    WHEN (NEW.order_status = 'cancelled')
    EXECUTE FUNCTION fn_notify_order_cancelled();

COMMENT ON FUNCTION fn_notify_order_cancelled() IS 
'Notifies seller when buyer cancels an order';

-- =====================================================================
-- PRODUCT NOTIFICATIONS
-- =====================================================================

-- 6. PRODUCT CREATED - Notify Admins for Approval
CREATE OR REPLACE FUNCTION fn_notify_product_created()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_name VARCHAR(201);
BEGIN
    SELECT CONCAT(first_name, ' ', last_name) INTO v_seller_name
    FROM users WHERE user_id = NEW.user_id;
    
    -- Notify All Admins for Approval
    PERFORM notify_all_admins(
        'New Product Pending Approval',
        v_seller_name || ' has posted a new product "' || NEW.product_name || '" in ' || 
        (SELECT category_name FROM categories WHERE category_id = NEW.category_id),
        'product',
        NEW.product_id,
        NULL,
        NULL,
        '/admin/dashboard?tab=products',
        'Review Product'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_product_created
    AFTER INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION fn_notify_product_created();

COMMENT ON FUNCTION fn_notify_product_created() IS 
'Notifies admins when new product is created and needs approval';

-- 7. PRODUCT APPROVED - Notify Seller
CREATE OR REPLACE FUNCTION fn_notify_product_approved()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_name VARCHAR(201);
BEGIN
    IF NEW.status = 'APPROVED' AND OLD.status = 'PENDING' THEN
        SELECT CONCAT(first_name, ' ', last_name) INTO v_admin_name
        FROM users WHERE user_id = NEW.approved_by;
        
        PERFORM create_notification(
            NEW.user_id,
            'Product Approved!',
            'Your product "' || NEW.product_name || '" has been approved and is now visible to buyers.',
            'product',
            NEW.product_id,
            NULL,
            NULL,
            NULL,
            '/dashboard/listings',
            'View Product'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_product_approved
    AFTER UPDATE OF status ON products
    FOR EACH ROW
    WHEN (NEW.status = 'APPROVED' AND OLD.status = 'PENDING')
    EXECUTE FUNCTION fn_notify_product_approved();

COMMENT ON FUNCTION fn_notify_product_approved() IS 
'Notifies seller when their product is approved';

-- 8. PRODUCT REJECTED - Notify Seller
CREATE OR REPLACE FUNCTION fn_notify_product_rejected()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'REJECTED' AND OLD.status = 'PENDING' THEN
        PERFORM create_notification(
            NEW.user_id,
            'Product Rejected',
            'Your product "' || NEW.product_name || '" was not approved. Please review guidelines and resubmit.',
            'product',
            NEW.product_id,
            NULL,
            NULL,
            NULL,
            '/dashboard/listings',
            'View Product'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_product_rejected
    AFTER UPDATE OF status ON products
    FOR EACH ROW
    WHEN (NEW.status = 'REJECTED' AND OLD.status = 'PENDING')
    EXECUTE FUNCTION fn_notify_product_rejected();

COMMENT ON FUNCTION fn_notify_product_rejected() IS 
'Notifies seller when their product is rejected';

-- 9. PRODUCT FAVORITED - Notify Seller
CREATE OR REPLACE FUNCTION fn_notify_product_favorited()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name VARCHAR(201);
    v_product_name VARCHAR(255);
    v_product_owner UUID;
BEGIN
    -- Get favoriter's name
    SELECT CONCAT(first_name, ' ', last_name) INTO v_user_name
    FROM users WHERE user_id = NEW.user_id;
    
    -- Get product name and owner
    SELECT product_name, user_id INTO v_product_name, v_product_owner
    FROM products WHERE product_id = NEW.product_id;
    
    -- Notify product owner
    PERFORM create_notification(
        v_product_owner,
        'Your Product Favorited!',
        v_user_name || ' added your product "' || v_product_name || '" to their favorites.',
        'product',
        NEW.product_id,
        NULL,
        NULL,
        NULL,
        '/dashboard/listings',
        'View Product'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_product_favorited
    AFTER INSERT ON product_favorites
    FOR EACH ROW
    EXECUTE FUNCTION fn_notify_product_favorited();

COMMENT ON FUNCTION fn_notify_product_favorited() IS 
'Notifies seller when someone favorites their product';

-- =====================================================================
-- TRANSACTION NOTIFICATIONS
-- =====================================================================

-- 10. TRANSACTION STATUS CHANGE - Notify Relevant Parties
CREATE OR REPLACE FUNCTION fn_notify_transaction_status()
RETURNS TRIGGER AS $$
DECLARE
    v_buyer_name VARCHAR(201);
    v_seller_name VARCHAR(201);
BEGIN
    IF NEW.transaction_status != OLD.transaction_status THEN
        -- Get names
        SELECT CONCAT(first_name, ' ', last_name) INTO v_buyer_name
        FROM users WHERE user_id = NEW.buyer_id;
        
        SELECT CONCAT(first_name, ' ', last_name) INTO v_seller_name
        FROM users WHERE user_id = NEW.seller_id;
        
        CASE NEW.transaction_status
            WHEN 'ACCEPTED' THEN
                PERFORM create_notification(
                    NEW.buyer_id,
                    'Transaction Accepted',
                    'Your transaction for "' || NEW.item_name || '" has been accepted by ' || v_seller_name,
                    'transaction',
                    NEW.product_id,
                    NEW.order_id,
                    NEW.transaction_id,
                    NULL,
                    '/transaction-history',
                    'View Transaction'
                );
                
            WHEN 'COMPLETED' THEN
                PERFORM create_notification(
                    NEW.buyer_id,
                    'Transaction Completed',
                    'Your transaction for "' || NEW.item_name || '" is complete!',
                    'transaction',
                    NEW.product_id,
                    NEW.order_id,
                    NEW.transaction_id,
                    NULL,
                    '/transaction-history',
                    'View Transaction'
                );
                
                PERFORM create_notification(
                    NEW.seller_id,
                    'Payment Received',
                    'Transaction completed for "' || NEW.item_name || '" with ' || v_buyer_name,
                    'transaction',
                    NEW.product_id,
                    NEW.order_id,
                    NEW.transaction_id,
                    NULL,
                    '/transaction-history',
                    'View Transaction'
                );
                
            WHEN 'REJECTED' THEN
                PERFORM create_notification(
                    NEW.buyer_id,
                    'Transaction Rejected',
                    'Transaction for "' || NEW.item_name || '" was rejected. ' || COALESCE(NEW.rejection_reason, ''),
                    'transaction',
                    NEW.product_id,
                    NEW.order_id,
                    NEW.transaction_id,
                    NULL,
                    '/transaction-history',
                    'View Details'
                );
                
            WHEN 'CANCELLED' THEN
                PERFORM create_notification(
                    NEW.seller_id,
                    'Transaction Cancelled',
                    v_buyer_name || ' cancelled transaction for "' || NEW.item_name || '"',
                    'transaction',
                    NEW.product_id,
                    NEW.order_id,
                    NEW.transaction_id,
                    NULL,
                    '/transaction-history',
                    'View Details'
                );
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_transaction_status
    AFTER UPDATE OF transaction_status ON transactions
    FOR EACH ROW
    WHEN (NEW.transaction_status IS DISTINCT FROM OLD.transaction_status)
    EXECUTE FUNCTION fn_notify_transaction_status();

COMMENT ON FUNCTION fn_notify_transaction_status() IS 
'Notifies buyer/seller when transaction status changes';

-- =====================================================================
-- BLOCKCHAIN NOTIFICATIONS
-- =====================================================================

-- 11. BLOCKCHAIN CONFIRMATION - Notify Buyer and Seller
CREATE OR REPLACE FUNCTION fn_notify_blockchain_confirmed()
RETURNS TRIGGER AS $$
DECLARE
    v_buyer_id UUID;
    v_seller_id UUID;
    v_item_name VARCHAR(255);
BEGIN
    IF NEW.blockchain_status = 'confirmed' AND OLD.blockchain_status = 'pending' THEN
        -- Get transaction details
        SELECT buyer_id, seller_id, item_name 
        INTO v_buyer_id, v_seller_id, v_item_name
        FROM transactions 
        WHERE transaction_id = NEW.transaction_id;
        
        IF FOUND THEN
            -- Notify Buyer
            PERFORM create_notification(
                v_buyer_id,
                'Blockchain Confirmed',
                'Your transaction for "' || v_item_name || '" has been confirmed on the blockchain.',
                'blockchain',
                NULL,
                NULL,
                NEW.transaction_id,
                NULL,
                '/transaction-history',
                'View Transaction'
            );
            
            -- Notify Seller
            PERFORM create_notification(
                v_seller_id,
                'Blockchain Confirmed',
                'Sale of "' || v_item_name || '" confirmed on blockchain.',
                'blockchain',
                NULL,
                NULL,
                NEW.transaction_id,
                NULL,
                '/transaction-history',
                'View Transaction'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_blockchain_confirmed
    AFTER UPDATE OF blockchain_status ON blockchain_transactions
    FOR EACH ROW
    WHEN (NEW.blockchain_status = 'confirmed' AND OLD.blockchain_status = 'pending')
    EXECUTE FUNCTION fn_notify_blockchain_confirmed();

COMMENT ON FUNCTION fn_notify_blockchain_confirmed() IS 
'Notifies buyer and seller when blockchain transaction is confirmed';

-- 12. BLOCKCHAIN FAILURE - Notify Buyer, Seller, and Admins
CREATE OR REPLACE FUNCTION fn_notify_blockchain_failed()
RETURNS TRIGGER AS $$
DECLARE
    v_buyer_id UUID;
    v_seller_id UUID;
    v_item_name VARCHAR(255);
    v_error_msg TEXT;
BEGIN
    IF NEW.blockchain_status = 'failed' AND OLD.blockchain_status = 'pending' THEN
        -- Get transaction details
        SELECT buyer_id, seller_id, item_name 
        INTO v_buyer_id, v_seller_id, v_item_name
        FROM transactions 
        WHERE transaction_id = NEW.transaction_id;
        
        v_error_msg := COALESCE(NEW.error_message, 'Unknown error');
        
        IF FOUND THEN
            -- Notify Buyer
            PERFORM create_notification(
                v_buyer_id,
                ' Blockchain Transaction Failed',
                'Transaction for "' || v_item_name || '" failed on blockchain. Support has been notified.',
                'blockchain',
                NULL,
                NULL,
                NEW.transaction_id,
                NULL,
                '/transaction-history',
                'View Details'
            );
            
            -- Notify Seller
            PERFORM create_notification(
                v_seller_id,
                'Blockchain Transaction Failed',
                'Sale of "' || v_item_name || '" failed on blockchain. Support has been notified.',
                'blockchain',
                NULL,
                NULL,
                NEW.transaction_id,
                NULL,
                '/transaction-history',
                'View Details'
            );
            
            -- Notify Admins
            PERFORM notify_all_admins(
                'Blockchain Transaction Failed',
                'Transaction #' || NEW.transaction_id || ' for "' || v_item_name || '" failed. Error: ' || v_error_msg,
                'blockchain',
                NULL,
                NULL,
                NEW.transaction_id,
                '/admin/dashboard?tab=transactions',
                'Investigate'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_blockchain_failed
    AFTER UPDATE OF blockchain_status ON blockchain_transactions
    FOR EACH ROW
    WHEN (NEW.blockchain_status = 'failed' AND OLD.blockchain_status = 'pending')
    EXECUTE FUNCTION fn_notify_blockchain_failed();

COMMENT ON FUNCTION fn_notify_blockchain_failed() IS 
'Notifies all parties when blockchain transaction fails';

-- =====================================================================
-- REVIEW NOTIFICATIONS
-- =====================================================================

-- 13. REVIEW RECEIVED - Notify Seller
CREATE OR REPLACE FUNCTION fn_notify_review_received()
RETURNS TRIGGER AS $$
DECLARE
    v_reviewer_name VARCHAR(201);
    v_product_name VARCHAR(255);
    v_rating_stars TEXT;
BEGIN
    -- Get reviewer name
    SELECT CONCAT(first_name, ' ', last_name) INTO v_reviewer_name
    FROM users WHERE user_id = NEW.reviewer_id;
    
    -- Get product name
    SELECT product_name INTO v_product_name
    FROM products WHERE product_id = NEW.product_id;
    
    -- Create star rating display
    v_rating_stars := REPEAT('⭐', NEW.rating);
    
    PERFORM create_notification(
        NEW.seller_id,
        'New Review Received',
        v_reviewer_name || ' left a ' || v_rating_stars || ' review for "' || v_product_name || '"',
        'transaction',
        NEW.product_id,
        NULL,
        NEW.transaction_id,
        NEW.review_id,
        '/dashboard/sales',
        'View Review'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_review_received
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION fn_notify_review_received();

COMMENT ON FUNCTION fn_notify_review_received() IS 
'Notifies seller when they receive a review';

-- 14. REVIEW RESPONSE - Notify Reviewer
CREATE OR REPLACE FUNCTION fn_notify_review_response()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_name VARCHAR(201);
    v_product_name VARCHAR(255);
BEGIN
    IF NEW.response IS NOT NULL AND (OLD.response IS NULL OR OLD.response IS DISTINCT FROM NEW.response) THEN
        -- Get seller name
        SELECT CONCAT(first_name, ' ', last_name) INTO v_seller_name
        FROM users WHERE user_id = NEW.seller_id;
        
        -- Get product name
        SELECT product_name INTO v_product_name
        FROM products WHERE product_id = NEW.product_id;
        
        PERFORM create_notification(
            NEW.reviewer_id,
            'Seller Responded to Your Review',
            v_seller_name || ' responded to your review for "' || v_product_name || '"',
            'transaction',
            NEW.product_id,
            NULL,
            NEW.transaction_id,
            NEW.review_id,
            '/dashboard/purchases',
            'View Response'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_review_response
    AFTER UPDATE OF response ON reviews
    FOR EACH ROW
    WHEN (NEW.response IS NOT NULL AND (OLD.response IS NULL OR OLD.response IS DISTINCT FROM NEW.response))
    EXECUTE FUNCTION fn_notify_review_response();

COMMENT ON FUNCTION fn_notify_review_response() IS 
'Notifies buyer when seller responds to their review';

-- =====================================================================
-- SYSTEM NOTIFICATIONS
-- =====================================================================

-- 15. USER ACCOUNT VERIFIED - Notify User
CREATE OR REPLACE FUNCTION fn_notify_user_verified()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_verified = TRUE AND OLD.is_verified = FALSE THEN
        PERFORM create_notification(
            NEW.user_id,
            'Account Verified!',
            'Your CSU Marketplace account has been verified. You can now buy and sell products.',
            'system',
            NULL,
            NULL,
            NULL,
            NULL,
            '/dashboard',
            'Go to Dashboard'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_user_verified
    AFTER UPDATE OF is_verified ON users
    FOR EACH ROW
    WHEN (NEW.is_verified = TRUE AND OLD.is_verified = FALSE)
    EXECUTE FUNCTION fn_notify_user_verified();

COMMENT ON FUNCTION fn_notify_user_verified() IS 
'Notifies user when their account is verified';

-- 16. ADMIN ACTION LOG - Notify Affected User
CREATE OR REPLACE FUNCTION fn_notify_admin_action()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_name VARCHAR(201);
BEGIN
    IF NEW.target_user IS NOT NULL THEN
        SELECT CONCAT(first_name, ' ', last_name) INTO v_admin_name
        FROM users WHERE user_id = NEW.admin_id;
        
        PERFORM create_notification(
            NEW.target_user,
            'Account Action',
            'Admin action performed: ' || NEW.action || '. ' || COALESCE(NEW.description, ''),
            'system',
            NEW.target_product,
            NULL,
            NEW.target_transaction,
            NULL,
            '/dashboard',
            'View Details'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_admin_action
    AFTER INSERT ON admin_logs
    FOR EACH ROW
    WHEN (NEW.target_user IS NOT NULL)
    EXECUTE FUNCTION fn_notify_admin_action();

COMMENT ON FUNCTION fn_notify_admin_action() IS 
'Notifies user when admin performs action on their account';

-- =====================================================================
-- UTILITY FUNCTIONS
-- =====================================================================

-- Mark Notification as Read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications 
    SET is_read = TRUE, read_at = NOW()
    WHERE notification_id = p_notification_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_notification_read(INTEGER) IS 
'Marks a specific notification as read';

-- Mark All User Notifications as Read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE notifications 
    SET is_read = TRUE, read_at = NOW()
    WHERE user_id = p_user_id AND is_read = FALSE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_all_notifications_read(UUID) IS 
'Marks all unread notifications for a user as read';

-- Delete Old Read Notifications (Cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(p_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE is_read = TRUE 
    AND read_at < NOW() - (p_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_notifications(INTEGER) IS 
'Deletes read notifications older than specified days (default 30)';

-- =====================================================================
-- NOTIFICATION STATISTICS VIEW
-- =====================================================================

CREATE OR REPLACE VIEW vw_notification_stats AS
SELECT 
    u.user_id,
    u.username,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE n.is_read = FALSE) as unread_count,
    COUNT(*) FILTER (WHERE n.type = 'transaction') as transaction_notifications,
    COUNT(*) FILTER (WHERE n.type = 'product') as product_notifications,
    COUNT(*) FILTER (WHERE n.type = 'system') as system_notifications,
    COUNT(*) FILTER (WHERE n.type = 'blockchain') as blockchain_notifications,
    MAX(n.created_at) as last_notification_at
FROM users u
LEFT JOIN notifications n ON u.user_id = n.user_id
GROUP BY u.user_id, u.username, u.first_name, u.last_name;

COMMENT ON VIEW vw_notification_stats IS 
'Provides notification statistics per user';

-- =====================================================================
-- PERFORMANCE INDEXES
-- =====================================================================

-- Additional indexes for notification queries (already exist in main schema, but ensuring)
-- CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
-- CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
-- CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- =====================================================================
-- ANALYTICS INTEGRATION
-- =====================================================================

-- 17. ANALYTICS MILESTONE - Notify Admins on Platform Milestones
CREATE OR REPLACE FUNCTION fn_notify_analytics_milestone()
RETURNS TRIGGER AS $$
DECLARE
    v_milestone_type TEXT;
    v_milestone_value INTEGER;
BEGIN
    -- Check for user milestones
    IF NEW.total_users >= 1000 AND OLD.total_users < 1000 THEN
        v_milestone_type := 'Total Users';
        v_milestone_value := 1000;
    ELSIF NEW.total_users >= 5000 AND OLD.total_users < 5000 THEN
        v_milestone_type := 'Total Users';
        v_milestone_value := 5000;
    ELSIF NEW.total_users >= 10000 AND OLD.total_users < 10000 THEN
        v_milestone_type := 'Total Users';
        v_milestone_value := 10000;
    -- Check for product milestones
    ELSIF NEW.active_listings >= 500 AND OLD.active_listings < 500 THEN
        v_milestone_type := 'Active Listings';
        v_milestone_value := 500;
    ELSIF NEW.active_listings >= 1000 AND OLD.active_listings < 1000 THEN
        v_milestone_type := 'Active Listings';
        v_milestone_value := 1000;
    -- Check for transaction milestones
    ELSIF NEW.completed_transactions >= 100 AND OLD.completed_transactions < 100 THEN
        v_milestone_type := 'Completed Transactions';
        v_milestone_value := 100;
    ELSIF NEW.completed_transactions >= 500 AND OLD.completed_transactions < 500 THEN
        v_milestone_type := 'Completed Transactions';
        v_milestone_value := 500;
    ELSIF NEW.completed_transactions >= 1000 AND OLD.completed_transactions < 1000 THEN
        v_milestone_type := 'Completed Transactions';
        v_milestone_value := 1000;
    END IF;
    
    -- Send notification if milestone reached
    IF v_milestone_type IS NOT NULL THEN
        PERFORM notify_all_admins(
            '🎉 Platform Milestone Reached!',
            'CSU Marketplace has reached ' || v_milestone_value || ' ' || v_milestone_type || '! Time to celebrate this achievement.',
            'system',
            NULL,
            NULL,
            NULL,
            '/admin/dashboard?tab=analytics',
            'View Analytics'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger would be on mv_daily_platform_metrics after refresh
-- CREATE TRIGGER trigger_notify_analytics_milestone
--     AFTER UPDATE ON mv_daily_platform_metrics
--     FOR EACH ROW
--     EXECUTE FUNCTION fn_notify_analytics_milestone();

COMMENT ON FUNCTION fn_notify_analytics_milestone() IS 
'Notifies admins when platform reaches significant milestones';

-- 18. HIGH-VALUE TRANSACTION - Notify Admins
CREATE OR REPLACE FUNCTION fn_notify_high_value_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_transaction_value DECIMAL(12, 2);
    v_threshold DECIMAL(12, 2) := 5000.00; -- Configurable threshold
BEGIN
    IF NEW.transaction_status = 'COMPLETED' AND OLD.transaction_status != 'COMPLETED' THEN
        v_transaction_value := NEW.item_price * NEW.quantity;
        
        IF v_transaction_value >= v_threshold THEN
            PERFORM notify_all_admins(
                '💎 High-Value Transaction Completed',
                'Transaction #' || NEW.transaction_id || ' completed for ₱' || 
                TO_CHAR(v_transaction_value, 'FM999,999,990.00') || ' - "' || NEW.item_name || '"',
                'transaction',
                NEW.product_id,
                NEW.order_id,
                NEW.transaction_id,
                '/admin/dashboard?tab=transactions',
                'View Transaction'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_high_value_transaction
    AFTER UPDATE OF transaction_status ON transactions
    FOR EACH ROW
    WHEN (NEW.transaction_status = 'COMPLETED' AND OLD.transaction_status != 'COMPLETED')
    EXECUTE FUNCTION fn_notify_high_value_transaction();

COMMENT ON FUNCTION fn_notify_high_value_transaction() IS 
'Notifies admins when high-value transactions are completed (threshold: ₱5000)';

-- 19. LOW ENGAGEMENT ALERT - Notify Admins of Inactive Users
CREATE OR REPLACE FUNCTION fn_notify_low_engagement()
RETURNS INTEGER AS $$
DECLARE
    v_inactive_users INTEGER;
    v_inactive_days INTEGER := 30;
BEGIN
    SELECT COUNT(*) INTO v_inactive_users
    FROM users
    WHERE is_active = TRUE
    AND last_active_at < NOW() - (v_inactive_days || ' days')::INTERVAL
    AND total_products_posted > 0;
    
    IF v_inactive_users > 50 THEN
        PERFORM notify_all_admins(
            '⚠️ User Engagement Alert',
            v_inactive_users || ' previously active users have been inactive for ' || 
            v_inactive_days || ' days. Consider re-engagement campaign.',
            'system',
            NULL,
            NULL,
            NULL,
            '/admin/dashboard?tab=users',
            'View Inactive Users'
        );
    END IF;
    
    RETURN v_inactive_users;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_notify_low_engagement() IS 
'Check and notify admins about users with low engagement (can be scheduled)';

-- 20. CATEGORY TRENDING ALERT - Notify Admins of Hot Categories
CREATE OR REPLACE FUNCTION fn_notify_trending_category()
RETURNS INTEGER AS $$
DECLARE
    v_category_name VARCHAR(100);
    v_transaction_count INTEGER;
    v_revenue DECIMAL(12, 2);
BEGIN
    -- Find category with highest growth in last 7 days
    SELECT 
        c.category_name,
        COUNT(t.transaction_id),
        SUM(t.item_price * t.quantity)
    INTO v_category_name, v_transaction_count, v_revenue
    FROM transactions t
    INNER JOIN categories c ON t.category_id = c.category_id
    WHERE t.transaction_status = 'COMPLETED'
    AND t.completed_at >= NOW() - INTERVAL '7 days'
    GROUP BY c.category_name
    ORDER BY COUNT(t.transaction_id) DESC
    LIMIT 1;
    
    IF v_transaction_count >= 20 THEN -- Threshold for trending
        PERFORM notify_all_admins(
            '📈 Trending Category Alert',
            '"' || v_category_name || '" is trending with ' || v_transaction_count || 
            ' transactions (₱' || TO_CHAR(v_revenue, 'FM999,999,990.00') || ') in the last 7 days.',
            'system',
            NULL,
            NULL,
            NULL,
            '/admin/dashboard?tab=analytics',
            'View Analytics'
        );
    END IF;
    
    RETURN v_transaction_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_notify_trending_category() IS 
'Identify and notify admins about trending categories (can be scheduled daily)';

-- =====================================================================
-- ANALYTICS VIEWS FOR NOTIFICATIONS
-- =====================================================================

-- Notification Analytics View: Delivery and Read Rates
CREATE OR REPLACE VIEW analytics_view_notification_performance AS
SELECT 
    type as notification_type,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE is_read = TRUE) as total_read,
    COUNT(*) FILTER (WHERE is_read = FALSE) as total_unread,
    ROUND(
        (COUNT(*) FILTER (WHERE is_read = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
        2
    ) as read_rate_percent,
    AVG(EXTRACT(EPOCH FROM (read_at - created_at))/60) FILTER (WHERE is_read = TRUE) as avg_time_to_read_minutes,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as sent_last_24h,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as sent_last_7d,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as sent_last_30d
FROM notifications
GROUP BY type
ORDER BY total_sent DESC;

COMMENT ON VIEW analytics_view_notification_performance IS 
'BAR CHART - Notification performance metrics by type with read rates';

-- Notification Analytics View: User Notification Activity
CREATE OR REPLACE VIEW analytics_view_user_notification_activity AS
SELECT 
    u.user_id,
    u.username,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
    COUNT(n.notification_id) as total_notifications_received,
    COUNT(n.notification_id) FILTER (WHERE n.is_read = TRUE) as notifications_read,
    COUNT(n.notification_id) FILTER (WHERE n.is_read = FALSE) as notifications_unread,
    ROUND(
        (COUNT(n.notification_id) FILTER (WHERE n.is_read = TRUE)::DECIMAL / 
        NULLIF(COUNT(n.notification_id), 0)) * 100, 
        2
    ) as read_rate_percent,
    MAX(n.created_at) as last_notification_received,
    MAX(n.read_at) as last_notification_read,
    AVG(EXTRACT(EPOCH FROM (n.read_at - n.created_at))/60) FILTER (WHERE n.is_read = TRUE) as avg_response_time_minutes
FROM users u
LEFT JOIN notifications n ON u.user_id = n.user_id
GROUP BY u.user_id, u.username, u.first_name, u.last_name
HAVING COUNT(n.notification_id) > 0
ORDER BY total_notifications_received DESC;

COMMENT ON VIEW analytics_view_user_notification_activity IS 
'DATA TABLE - User engagement with notifications';

-- Notification Analytics View: Daily Notification Volume
CREATE OR REPLACE VIEW analytics_view_notification_volume AS
SELECT 
    DATE(created_at) as notification_date,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE type = 'transaction') as transaction_notifications,
    COUNT(*) FILTER (WHERE type = 'product') as product_notifications,
    COUNT(*) FILTER (WHERE type = 'system') as system_notifications,
    COUNT(*) FILTER (WHERE type = 'blockchain') as blockchain_notifications,
    COUNT(*) FILTER (WHERE is_read = TRUE) as read_same_day,
    ROUND(
        (COUNT(*) FILTER (WHERE is_read = TRUE AND DATE(read_at) = DATE(created_at))::DECIMAL / 
        NULLIF(COUNT(*), 0)) * 100, 
        2
    ) as same_day_read_rate_percent
FROM notifications
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY notification_date DESC;

COMMENT ON VIEW analytics_view_notification_volume IS 
'LINE CHART - Daily notification volume and engagement trends';

-- Notification Analytics View: Action Click-Through Rate
CREATE OR REPLACE VIEW analytics_view_notification_ctr AS
SELECT 
    type as notification_type,
    action_label,
    COUNT(*) as total_with_action,
    COUNT(*) FILTER (WHERE is_read = TRUE) as total_read,
    ROUND(
        (COUNT(*) FILTER (WHERE is_read = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
        2
    ) as click_through_rate_percent,
    AVG(EXTRACT(EPOCH FROM (read_at - created_at))/3600) FILTER (WHERE is_read = TRUE) as avg_time_to_action_hours
FROM notifications
WHERE action_label IS NOT NULL
GROUP BY type, action_label
ORDER BY total_with_action DESC;

COMMENT ON VIEW analytics_view_notification_ctr IS 
'BAR CHART - Notification action button click-through rates';

-- Materialized View: Notification Engagement Summary (Fast Loading)
CREATE MATERIALIZED VIEW mv_notification_engagement_summary AS
SELECT 
    DATE_TRUNC('day', created_at) as summary_date,
    type as notification_type,
    COUNT(*) as notifications_sent,
    COUNT(*) FILTER (WHERE is_read = TRUE) as notifications_read,
    COUNT(*) FILTER (WHERE is_read = FALSE) as notifications_unread,
    ROUND(
        (COUNT(*) FILTER (WHERE is_read = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
        2
    ) as read_rate_percent,
    ROUND(
        AVG(EXTRACT(EPOCH FROM (read_at - created_at))/60) FILTER (WHERE is_read = TRUE),
        2
    ) as avg_time_to_read_minutes,
    COUNT(DISTINCT user_id) as unique_recipients,
    NOW() as last_refreshed
FROM notifications
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at), type
ORDER BY summary_date DESC, notification_type;

CREATE INDEX ON mv_notification_engagement_summary (summary_date, notification_type);
CREATE INDEX ON mv_notification_engagement_summary (notification_type);

COMMENT ON MATERIALIZED VIEW mv_notification_engagement_summary IS 
'DASHBOARD CARDS - Daily notification engagement metrics (Refresh: Daily)';

-- =====================================================================
-- NOTIFICATION REFRESH FUNCTION (Add to Analytics Refresh)
-- =====================================================================

CREATE OR REPLACE FUNCTION refresh_notification_analytics()
RETURNS TEXT AS $$
DECLARE
    v_start_time TIMESTAMPTZ := NOW();
    v_duration INTERVAL;
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_notification_engagement_summary;
    
    v_duration := NOW() - v_start_time;
    
    RETURN 'Notification analytics refreshed in ' || 
           ROUND(EXTRACT(EPOCH FROM v_duration)::NUMERIC, 2) || ' seconds';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_notification_analytics() IS 
'Refresh notification analytics materialized view - can be scheduled with pg_cron';

-- =====================================================================
-- SCHEDULED ANALYTICS ALERTS (Call these functions via pg_cron)
-- =====================================================================

-- Example pg_cron schedule for analytics notifications:
-- SELECT cron.schedule('check-low-engagement', '0 9 * * MON', 'SELECT fn_notify_low_engagement()');
-- SELECT cron.schedule('check-trending-categories', '0 10 * * *', 'SELECT fn_notify_trending_category()');

-- Combined scheduled analytics check
CREATE OR REPLACE FUNCTION fn_scheduled_analytics_alerts()
RETURNS TEXT AS $$
DECLARE
    v_inactive_count INTEGER;
    v_trending_count INTEGER;
BEGIN
    -- Check low engagement
    v_inactive_count := fn_notify_low_engagement();
    
    -- Check trending categories
    v_trending_count := fn_notify_trending_category();
    
    RETURN 'Analytics alerts processed: ' || v_inactive_count || 
           ' inactive users, ' || v_trending_count || ' trending transactions';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_scheduled_analytics_alerts() IS 
'Run all scheduled analytics alert checks - Schedule daily via pg_cron';

-- =====================================================================
-- COMPLETION MESSAGE
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'CSU MARKETPLACE - NOTIFICATION SYSTEM DEPLOYED';
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'Helper Functions: 3';
    RAISE NOTICE 'Notification Functions: 20 (16 triggers + 4 analytics)';
    RAISE NOTICE 'Triggers: 17';
    RAISE NOTICE 'Utility Functions: 6';
    RAISE NOTICE 'Analytics Views: 5';
    RAISE NOTICE 'Materialized Views: 1';
    RAISE NOTICE '';
    RAISE NOTICE 'NOTIFICATIONS ENABLED FOR:';
    RAISE NOTICE '✅ Order Creation, Acceptance, Rejection, Completion, Cancellation';
    RAISE NOTICE '✅ Product Creation, Approval, Rejection, Favorites';
    RAISE NOTICE '✅ Transaction Status Changes';
    RAISE NOTICE '✅ Blockchain Confirmations and Failures';
    RAISE NOTICE '✅ Reviews and Responses';
    RAISE NOTICE '✅ Account Verification';
    RAISE NOTICE '✅ Admin Actions';
    RAISE NOTICE '';
    RAISE NOTICE 'ANALYTICS INTEGRATION:';
    RAISE NOTICE '✅ Platform Milestones (Users, Listings, Transactions)';
    RAISE NOTICE '✅ High-Value Transaction Alerts (₱5000+)';
    RAISE NOTICE '✅ Low Engagement Alerts (Inactive Users)';
    RAISE NOTICE '✅ Trending Category Detection';
    RAISE NOTICE '✅ Notification Performance Analytics';
    RAISE NOTICE '✅ User Notification Activity Tracking';
    RAISE NOTICE '✅ Daily Notification Volume Trends';
    RAISE NOTICE '✅ Action Click-Through Rate Analysis';
    RAISE NOTICE '';
    RAISE NOTICE 'DASHBOARD PLACEMENT:';
    RAISE NOTICE '📊 Admin Analytics Tab - Notification Performance Charts';
    RAISE NOTICE '📊 Admin Analytics Tab - User Engagement with Notifications';
    RAISE NOTICE '📊 Admin Analytics Tab - Daily Notification Volume';
    RAISE NOTICE '📊 Admin Analytics Tab - Action CTR Analysis';
    RAISE NOTICE '';
    RAISE NOTICE 'SCHEDULED TASKS (Setup via pg_cron):';
    RAISE NOTICE '⏰ SELECT cron.schedule(''check-low-engagement'', ''0 9 * * MON'', $$SELECT fn_notify_low_engagement()$$);';
    RAISE NOTICE '⏰ SELECT cron.schedule(''check-trending'', ''0 10 * * *'', $$SELECT fn_notify_trending_category()$$);';
    RAISE NOTICE '⏰ SELECT cron.schedule(''refresh-notification-analytics'', ''0 2 * * *'', $$SELECT refresh_notification_analytics()$$);';
    RAISE NOTICE '';
    RAISE NOTICE 'Status: 🔔 Notification System Active with Analytics Integration';
    RAISE NOTICE '========================================================';
END $$;

