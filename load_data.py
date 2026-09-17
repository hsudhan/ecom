#!/usr/bin/env python3
"""
Data loader for the `ecommerce` schema in ecomdb.

- Inserts randomized data into ALL 15 tables of the ecommerce schema.
- 100,000 rows in `order` and `shipment` (1:1), proportional volumes elsewhere.
- Referential integrity: every FK-style column references an existing parent
  row (orders -> customers, shipments -> orders, etc.). Cross-table business
  consistency is also preserved where sensible:
    * shopping_cart.customer_id always matches its order's customer_id
    * payment / payment_info amounts equal their order's total_amount
    * shipment_tracking_carrier reuses the shipment's tracking_number
- Non-repeating values: all natural/key-ish attributes (username, email,
  tracking_number, phone, product/customer/category/carrier names, password)
  embed the row sequence number, so duplicates are impossible by construction.
- Randomizer pattern: single seeded RNG (random.Random) drives all random
  choices -> reproducible runs.
- Fast batched INSERTs via psycopg2 execute_values (10K rows per batch).

Run:  python3 load_data.py
"""

import time
from datetime import datetime, timedelta, timezone
from random import Random

import psycopg2
from psycopg2.extras import execute_values

CONN_STRING = "postgresql://harir@localhost:5432/ecomdb"
BATCH_SIZE = 10_000
RNG = Random(42)  # seeded randomizer -> reproducible data

# ---------------------------------------------------------------- volumes ---
NUM_CUSTOMERS = 10_000
NUM_USERS = 10_000
NUM_PRODUCTS = 10_000
NUM_CATEGORIES = 100
NUM_CARRIERS = 20
NUM_ORDERS = 100_000      # required volume
NUM_SHIPMENTS = 100_000   # required volume (1:1 with orders)
LOGINS_PER_USER = 2

# ------------------------------------------------------------ value pools ---
ORDER_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]
SHIPMENT_STATUSES = ["PENDING", "IN_TRANSIT", "DELIVERED", "RETURNED"]
PAYMENT_STATUSES = ["PENDING", "COMPLETED", "FAILED", "REFUNDED"]
PAYMENT_METHODS = ["CREDIT_CARD", "DEBIT_CARD", "PAYPAL", "BANK_TRANSFER"]
LOGIN_TYPES = ["WEB", "MOBILE", "API"]
DEVICES = ["iPhone", "Android", "WindowsPC", "MacBook", "iPad", "LinuxPC"]
FIRST_NAMES = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer",
               "Michael", "Linda", "David", "Elizabeth", "William", "Barbara",
               "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah",
               "Charles", "Karen", "Daniel", "Nancy", "Matthew", "Lisa",
               "Anthony", "Betty", "Mark", "Margaret", "Donald", "Sandra"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia",
              "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez",
              "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor",
              "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
              "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis",
              "Robinson"]
STREETS = ["Main", "Oak", "Pine", "Maple", "Cedar", "Elm", "Washington",
           "Lake", "Hill", "Park", "Sunset", "Ridge"]
CITIES = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix",
          "Seattle", "Denver", "Austin", "Boston", "Miami", "Atlanta",
          "Portland", "Dallas", "San Diego", "Nashville"]
COUNTRIES = ["USA", "Canada", "UK", "Germany", "France", "Australia"]
CATEGORY_WORDS = ["Electronics", "Clothing", "Books", "Home", "Garden",
                  "Sports", "Toys", "Beauty", "Health", "Food", "Auto",
                  "Music", "Movies", "Games", "Office", "Pets", "Jewelry",
                  "Shoes", "Outdoor", "Baby"]
PRODUCT_ADJS = ["Ultra", "Pro", "Mini", "Smart", "Eco", "Turbo", "Lite",
                "Mega", "Nano", "Flex", "Prime", "Air", "Max", "Elite"]
PRODUCT_NOUNS = ["Speaker", "Watch", "Laptop", "Phone", "Camera", "Blender",
                 "Chair", "Lamp", "Backpack", "Headphones", "Keyboard",
                 "Mouse", "Monitor", "Tablet", "Charger", "Drone"]
CARRIER_WORDS = ["Global", "Swift", "Prime", "Rapid", "Arrow", "Eagle",
                 "Falcon", "Atlas", "Comet", "Orbit", "Vertex", "Zenith",
                 "Pioneer", "Summit", "Titan", "Vortex", "Nimbus", "Horizon",
                 "Quantum", "Meridian"]

NOW = datetime.now(timezone.utc)


# ------------------------------------------------------------- helpers ------
def rand_ts(days_ago_min: int, days_ago_max: int) -> datetime:
    """Random timezone-aware timestamp between N..M days in the past."""
    delta = timedelta(
        days=RNG.randint(days_ago_min, days_ago_max),
        hours=RNG.randint(0, 23),
        minutes=RNG.randint(0, 59),
        seconds=RNG.randint(0, 59),
    )
    return NOW - delta


def money(lo: float, hi: float) -> float:
    return round(RNG.uniform(lo, hi), 2)


def rand_ip() -> str:
    return f"{RNG.randint(1, 223)}.{RNG.randint(0, 255)}.{RNG.randint(0, 255)}.{RNG.randint(1, 254)}"


def insert(cur, table: str, cols: str, rows: list) -> None:
    """Batched multi-row INSERT."""
    sql = f"INSERT INTO ecommerce.{table} ({cols}) VALUES %s"
    execute_values(cur, sql, rows, page_size=BATCH_SIZE)
    print(f"  {table:<28} {len(rows):>8,} rows")


# ------------------------------------------------------- table loaders ------
def load_customers(cur) -> None:
    rows = [
        (
            f"{RNG.choice(FIRST_NAMES)} {RNG.choice(LAST_NAMES)} {i}",      # unique name
            f"customer{i}@example.com",                                     # unique email
            f"{RNG.randint(1, 9999)} {RNG.choice(STREETS)} St, Apt {i}",    # unique address
            f"+1-555-{i:07d}"[:20],                                         # unique phone
            (ts := rand_ts(365, 730)),
            ts + timedelta(hours=RNG.randint(1, 500)),
        )
        for i in range(1, NUM_CUSTOMERS + 1)
    ]
    insert(cur, "customer", "name, email, address, phone_number, created_at, updated_at", rows)


def load_users(cur) -> None:
    rows = [
        (
            f"user_{i:06d}",                                                # unique username
            f"user{i}@example.com",                                         # unique email
            f"pwd_{i}_{RNG.getrandbits(64):016x}",                          # unique password
            (ts := rand_ts(365, 730)),
            ts + timedelta(hours=RNG.randint(1, 500)),
        )
        for i in range(1, NUM_USERS + 1)
    ]
    insert(cur, '"user"', "username, email, password, created_at, updated_at", rows)


def load_categories(cur) -> list:
    names = [f"{w[:12]}_{i:03d}" for i, w in
             enumerate((w for w in CATEGORY_WORDS for _ in range(5)), start=1)]  # 100 unique names
    rows = [
        (
            names[i - 1],
            f"Category {names[i - 1]}: products of type {CATEGORY_WORDS[(i - 1) % len(CATEGORY_WORDS)]}",
            (ts := rand_ts(365, 730)),
            ts + timedelta(hours=RNG.randint(1, 500)),
        )
        for i in range(1, NUM_CATEGORIES + 1)
    ]
    insert(cur, "product_category", "name, description, created_at, updated_at", rows)
    return names


def load_carriers(cur) -> None:
    rows = [
        (
            f"{CARRIER_WORDS[i - 1]}Logistics_{i:02d}",                     # unique name
            f"Carrier {CARRIER_WORDS[i - 1]} logistics services, region {i}",
            (ts := rand_ts(365, 730)),
            ts + timedelta(hours=RNG.randint(1, 500)),
        )
        for i in range(1, NUM_CARRIERS + 1)
    ]
    insert(cur, "shipment_carrier", "name, description, created_at, updated_at", rows)


def load_products(cur, category_names: list) -> None:
    rows = [
        (
            f"{RNG.choice(PRODUCT_ADJS)} {RNG.choice(PRODUCT_NOUNS)} {i:05d}",  # unique name
            money(1.00, 5000.00),
            f"Description for product {i}: high-quality item, model {i:05d}.",
            category_names[RNG.randrange(NUM_CATEGORIES)][:20],
            (ts := rand_ts(365, 730)),
            ts + timedelta(hours=RNG.randint(1, 500)),
        )
        for i in range(1, NUM_PRODUCTS + 1)
    ]
    insert(cur, "product", "name, price, description, category, created_at, updated_at", rows)


def load_orders(cur) -> list:
    """100K orders. Returns per-order facts needed by child tables:
    orders[i] = (customer_id, order_date, total_amount, status) for order id i+1."""
    orders = []
    rows = []
    for i in range(1, NUM_ORDERS + 1):
        customer_id = RNG.randint(1, NUM_CUSTOMERS)
        order_date = rand_ts(0, 365)
        status = RNG.choice(ORDER_STATUSES)
        total = money(5.00, 10000.00)
        orders.append((customer_id, order_date, total, status))
        rows.append((customer_id, order_date, status, total,
                     order_date, order_date + timedelta(hours=RNG.randint(1, 500))))
    insert(cur, '"order"', "customer_id, order_date, status, total_amount, created_at, updated_at", rows)
    return orders


def load_logins(cur) -> None:
    rows = [
        (
            (i % NUM_USERS) + 1,                                            # valid user_id
            rand_ts(0, 90),
            rand_ip(),
            RNG.choice(LOGIN_TYPES),
            RNG.choice(DEVICES),
            f"{RNG.choice(CITIES)}, {RNG.choice(COUNTRIES)}",
        )
        for i in range(NUM_USERS * LOGINS_PER_USER)
    ]
    insert(cur, "login", "user_id, login_date, ip_address, login_type, device_name, location", rows)


def load_shipments(cur, orders: list) -> list:
    """100K shipments, exactly one per order (order_id unique).
    Returns shipments[i] = (shipment_date, shipment_status) for shipment id i+1."""
    shipments = []
    rows = []
    for i in range(1, NUM_SHIPMENTS + 1):
        _, order_date, _, order_status = orders[i - 1]
        ship_date = order_date + timedelta(days=RNG.randint(1, 5),
                                           hours=RNG.randint(0, 23))
        # status correlated with the parent order for business consistency
        ship_status = "DELIVERED" if order_status == "DELIVERED" else RNG.choice(SHIPMENT_STATUSES)
        shipments.append((ship_date, ship_status))
        rows.append((i, ship_date, ship_status, money(0.99, 200.00),
                     ship_date, ship_date + timedelta(hours=RNG.randint(1, 240))))
    insert(cur, "shipment", "order_id, shipment_date, shipment_status, shipment_cost, created_at, updated_at", rows)
    return shipments


def load_shopping_carts(cur, orders: list) -> None:
    """One cart row per order; customer_id matches the order's customer."""
    rows = [
        (
            i,
            orders[i - 1][0],                                               # same customer as the order
            RNG.randint(1, NUM_PRODUCTS),
            RNG.randint(1, 5),
            (ts := orders[i - 1][1] - timedelta(days=RNG.randint(0, 3))),
            ts + timedelta(hours=RNG.randint(1, 72)),
        )
        for i in range(1, NUM_ORDERS + 1)
    ]
    insert(cur, "shopping_cart", "order_id, customer_id, product_id, quantity, created_at, updated_at", rows)


def load_payments(cur, orders: list) -> None:
    """One payment per order; amount equals the order total."""
    rows = [
        (
            i,
            (pd := orders[i - 1][1] + timedelta(hours=RNG.randint(0, 48))),
            orders[i - 1][2],                                               # == order total_amount
            RNG.choice(PAYMENT_STATUSES),
            pd,
            pd + timedelta(hours=RNG.randint(1, 72)),
        )
        for i in range(1, NUM_ORDERS + 1)
    ]
    insert(cur, "payment", "order_id, payment_date, payment_amount, payment_status, created_at, updated_at", rows)


def load_payment_infos(cur, orders: list) -> None:
    """One payment_info per order; amount equals the order total."""
    rows = [
        (
            i,
            RNG.choice(PAYMENT_METHODS),
            orders[i - 1][2],                                               # == order total_amount
            RNG.choice(PAYMENT_STATUSES),
            (pd := orders[i - 1][1] + timedelta(hours=RNG.randint(0, 48))),
            pd,
            pd + timedelta(hours=RNG.randint(1, 72)),
        )
        for i in range(1, NUM_ORDERS + 1)
    ]
    insert(cur, "payment_info", "order_id, payment_method, payment_amount, payment_status, payment_date, created_at, updated_at", rows)


def load_order_products(cur) -> None:
    """1-2 products per order."""
    rows = []
    for i in range(1, NUM_ORDERS + 1):
        for product_id in RNG.sample(range(1, NUM_PRODUCTS + 1), RNG.choice((1, 1, 2))):
            rows.append((i, product_id, RNG.randint(1, 10),
                         NOW - timedelta(days=RNG.randint(0, 365)),
                         NOW - timedelta(days=RNG.randint(0, 30))))
    insert(cur, "order_product", "order_id, product_id, quantity, created_at, updated_at", rows)


def load_shipment_trackings(cur, shipments: list) -> list:
    """One tracking row per shipment. Returns tracking_numbers[i] for shipment i+1."""
    tracking_numbers = [f"TRK{i:012d}" for i in range(1, NUM_SHIPMENTS + 1)]  # unique
    rows = [
        (
            i,
            tracking_numbers[i - 1],
            shipments[i - 1][1],                                            # mirrors shipment status
            shipments[i - 1][0] + timedelta(days=RNG.randint(0, 10)),
        )
        for i in range(1, NUM_SHIPMENTS + 1)
    ]
    insert(cur, "shipment_tracking", "shipment_id, tracking_number, status, updated_at", rows)
    return tracking_numbers


def load_shipment_tracking_carriers(cur, shipments: list, tracking_numbers: list) -> None:
    """One carrier-tracking row per shipment; reuses the shipment's tracking number."""
    rows = [
        (
            i,
            RNG.randint(1, NUM_CARRIERS),
            tracking_numbers[i - 1],                                        # same tracking number
            shipments[i - 1][1],
            shipments[i - 1][0] + timedelta(days=RNG.randint(0, 10)),
        )
        for i in range(1, NUM_SHIPMENTS + 1)
    ]
    insert(cur, "shipment_tracking_carrier", "shipment_id, carrier_id, tracking_number, status, updated_at", rows)


def load_product_category_products(cur) -> None:
    """1-2 distinct categories per product."""
    rows = []
    for i in range(1, NUM_PRODUCTS + 1):
        for category_id in RNG.sample(range(1, NUM_CATEGORIES + 1), RNG.choice((1, 2))):
            rows.append((i, category_id,
                         NOW - timedelta(days=RNG.randint(0, 365)),
                         NOW - timedelta(days=RNG.randint(0, 30))))
    insert(cur, "product_category_product", "product_id, category_id, created_at, updated_at", rows)


# ----------------------------------------------------------------- main -----
def main() -> None:
    start = time.time()
    conn = psycopg2.connect(CONN_STRING)
    try:
        with conn:
            with conn.cursor() as cur:
                print("Loading ecommerce schema (parent tables first)...")
                load_customers(cur)
                load_users(cur)
                category_names = load_categories(cur)
                load_carriers(cur)
                load_products(cur, category_names)

                orders = load_orders(cur)          # 100K
                load_logins(cur)

                shipments = load_shipments(cur, orders)   # 100K
                load_shopping_carts(cur, orders)
                load_payments(cur, orders)
                load_payment_infos(cur, orders)
                load_order_products(cur)

                tracking_numbers = load_shipment_trackings(cur, shipments)
                load_shipment_tracking_carriers(cur, shipments, tracking_numbers)
                load_product_category_products(cur)
    finally:
        conn.close()
    print(f"\nDone in {time.time() - start:.1f}s")


if __name__ == "__main__":
    main()
