# Application Functional Specification: ECOMMERCE MODULE

## Overview

This specification defines the UI layout, component hierarchy, and data-fetching behavior for a web application, specifically focusing on the navigation interface and the **ORDERS** tab data grid.

use claude.md to create solidJS, solidstart, nodejs, fastify application

web application should run in localhost:8081

## Navigation & Tab Architecture

The application features a primary tab bar containing the following views:

* **ORDERS**
* **SHIPMENT**
* **USERS**
* **LOGIN**
* **SHOPPING CART**
* **PAYMENT INFO**
* **PAYMENT**
* **SHIPMENT TRACKING**

## ORDERS Tab & `ORDERS-PANEL` Specifications

### Layout Structure

* **Trigger:** Clicking the **ORDERS** tab renders the `ORDERS-PANEL` container directly below the main tab bar.
* **Pagination Control:** Positioned at the top right of the `ORDERS-PANEL`, containing:
* Current page indicator / status
* **PREVIOUS** button (decrements the active page index)
* **NEXT** button (increments the active page index)

to the left side of pagination control there should be a button with display "reload cache"
* **RELOAD CACHE** button (click event should reload redis cache of the correponding tab db table data based on the context)
NOTE: shipment tab reload cache button click sbould reload only shipments from db table onto redis cache
where as orders tab reload cache button click should reload only orders and so on

* **Data Table:** Located below the pagination control within the `ORDERS-PANEL`.

### Table Styling Requirements

* **Row Shading:** Alternating horizontal shading using light and dark gray rows to enhance data readability.

### API Integration & Pagination Logic

* **Endpoint URL Pattern:** `http://localhost:4001/orders?page={page}&page_size=50`
* **Page Range Constraints:** The dynamic `page` parameter starts at `1` and is uncapped — navigation continues until the upstream `total_pages` (COUNT(*) ÷ page_size) is reached.
* **State Management:**
* Initial state defaults to `page=1`.
* Clicking the **NEXT** button increments the `page` value by `1` (capped only at the upstream `total_pages`).
* Clicking the **PREVIOUS** button decrements the `page` value by `1` (floored at `1`).
* State updates automatically trigger a fresh HTTP `GET` request to fetch and display the corresponding dataset for the selected page.
* always load from ecomrust redis cache first and if cache miss load from database table

* in the orders and shipments tab, make all columns in the table sortable toggle asc and desc. start with ASC as initial state
* ensure redis cache is optimized for sorting as well
* ensure optimum performance in the db layer for all sortable columns

%% -------------------------------------------------------------------------------------- %%