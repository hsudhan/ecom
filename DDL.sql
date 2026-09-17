-- Create the database
--CREATE DATABASE ecomdb;

-- Create schema
CREATE SCHEMA ecommerce;

-- Create tables

-- 1. Order table
CREATE TABLE ecommerce.order (
    id BIGSERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_order_customer_id ON ecommerce.order USING btree (customer_id);
CREATE INDEX idx_order_status ON ecommerce.order USING btree (status);

-- 2. User table
CREATE TABLE ecommerce.user (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_username ON ecommerce.user USING btree (username);

-- 3. Login table
CREATE TABLE ecommerce.login (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    login_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(20) NOT NULL,
    login_type VARCHAR(10) NOT NULL,
    device_name VARCHAR(20) NOT NULL,
    location VARCHAR(100) NOT NULL
);

-- Create indexes
CREATE INDEX idx_login_user_id ON ecommerce.login USING btree (user_id);
CREATE INDEX idx_login_login_date ON ecommerce.login USING btree (login_date);

-- 4. Shipment table
CREATE TABLE ecommerce.shipment (
    id BIGSERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    shipment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    shipment_status VARCHAR(20) NOT NULL,
    shipment_cost NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_shipment_order_id ON ecommerce.shipment USING btree (order_id);
CREATE INDEX idx_shipment_shipment_status ON ecommerce.shipment USING btree (shipment_status);

-- 5. Shopping Cart table
CREATE TABLE ecommerce.shopping_cart (
    id BIGSERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_shopping_cart_order_id ON ecommerce.shopping_cart USING btree (order_id);
CREATE INDEX idx_shopping_cart_customer_id ON ecommerce.shopping_cart USING btree (customer_id);
CREATE INDEX idx_shopping_cart_product_id ON ecommerce.shopping_cart USING btree (product_id);

-- 6. Payment Info table
CREATE TABLE ecommerce.payment_info (
    id BIGSERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    payment_amount NUMERIC(10, 2) NOT NULL,
    payment_status VARCHAR(20) NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_payment_info_order_id ON ecommerce.payment_info USING btree (order_id);
CREATE INDEX idx_payment_info_payment_method ON ecommerce.payment_info USING btree (payment_method);
CREATE INDEX idx_payment_info_payment_status ON ecommerce.payment_info USING btree (payment_status);

-- 7. Payment table
CREATE TABLE ecommerce.payment (
    id BIGSERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payment_amount NUMERIC(10, 2) NOT NULL,
    payment_status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_payment_order_id ON ecommerce.payment USING btree (order_id);
CREATE INDEX idx_payment_payment_amount ON ecommerce.payment USING btree (payment_amount);
CREATE INDEX idx_payment_payment_status ON ecommerce.payment USING btree (payment_status);

-- 8. Shipment Tracking table
CREATE TABLE ecommerce.shipment_tracking (
    id BIGSERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL,
    tracking_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_shipment_tracking_shipment_id ON ecommerce.shipment_tracking USING btree (shipment_id);
CREATE INDEX idx_shipment_tracking_tracking_number ON ecommerce.shipment_tracking USING btree (tracking_number);

-- 9. Other tables

-- 9.1. Customer table
CREATE TABLE ecommerce.customer (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    address VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_customer_name ON ecommerce.customer USING btree (name);

-- 9.2. Product table
CREATE TABLE ecommerce.product (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_product_name ON ecommerce.product USING btree (name);
CREATE INDEX idx_product_category ON ecommerce.product USING btree (category);

-- 9.3. Order Product table
CREATE TABLE ecommerce.order_product (
    id BIGSERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_order_product_order_id ON ecommerce.order_product USING btree (order_id);
CREATE INDEX idx_order_product_product_id ON ecommerce.order_product USING btree (product_id);

-- 9.4. Product Category table
CREATE TABLE ecommerce.product_category (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_product_category_name ON ecommerce.product_category USING btree (name);

-- 9.5. Shipment Carrier table
CREATE TABLE ecommerce.shipment_carrier (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_shipment_carrier_name ON ecommerce.shipment_carrier USING btree (name);

-- 9.6. Shipment Tracking Carrier table
CREATE TABLE ecommerce.shipment_tracking_carrier (
    id BIGSERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL,
    carrier_id INTEGER NOT NULL,
    tracking_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_shipment_tracking_carrier_shipment_id ON ecommerce.shipment_tracking_carrier USING btree (shipment_id);
CREATE INDEX idx_shipment_tracking_carrier_carrier_id ON ecommerce.shipment_tracking_carrier USING btree (carrier_id);

-- 9.7. Product Category Product table
CREATE TABLE ecommerce.product_category_product (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_product_category_product_product_id ON ecommerce.product_category_product USING btree (product_id);
CREATE INDEX idx_product_category_product_category_id ON ecommerce.product_category_product USING btree (category_id);