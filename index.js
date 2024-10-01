const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");
app.use(cors());
app.use(express.json());

app.get("/products", async (req, res) => {
    try {
        const allProducts = await pool.query("select * from products");
        res.json(allProducts.rows);
    }
    catch (err) {
        console.log(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/product", async (req, res) => {
    try {
        const { id, name, price, category, quantity } = req.body;
        const newProduct = await pool.query(`insert into products (id,name,price,category,quantity) values($1,$2,$3,$4,$5)`, [id, name, price, category, quantity]);
        res.json(newProduct.rows[0]);
    }
    catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

app.delete("/product/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const deleteProduct = await pool.query("delete from products where id =$1", [id]);
        res.json('Product deleted');
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.put("/product/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, category, quantity } = req.body;
        const updateProduct = await pool.query(
            "UPDATE products SET name = $1, price = $2, category = $3, quantity = $4 WHERE id = $5 RETURNING *",
            [name, price, category, quantity, id]
        );

        if (updateProduct.rowCount === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json({ message: "Product updated successfully", product: updateProduct.rows[0] });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


app.get("/customers", async (req, res) => {
    try {
        const allCustomers = await pool.query("select * from customers");
        res.json(allCustomers.rows);
    }
    catch (err) {
        console.log(err.message);
        res.status(500).json({ error: "Server error" });
    }
});


app.get("/order", async (req, res) => {
    try {
        const allOrders = await pool.query(`SELECT o.id,c.name AS customer_name,p.name AS product_name,
                ord.date_created,
                SUM(o.quantity) AS total_quantity,
                SUM(o.price_at_purchase * o.quantity) AS total_price
            FROM products p
            JOIN order_items o ON p.id = o.product_id
            JOIN orders ord ON ord.id = o.order_id
            JOIN customers c ON ord.customer_id = c.id
            GROUP BY o.id,p.name, c.name,ord.id
            order by ord.id asc`);
        res.json(allOrders.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/orders", async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { customerId, status, selectedProducts } = req.body;


        const orderResult = await client.query(
            "INSERT INTO orders (customer_id, status, date_created) VALUES ($1, $2, CURRENT_DATE) RETURNING id",
            [customerId, status]
        );
        const orderId = orderResult.rows[0].id;


        for (let product of selectedProducts) {
            await client.query(
                "INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)",
                [orderId, product.id, product.orderQuantity, product.price]
            );

            await client.query(
                "UPDATE products SET quantity = quantity - $1 WHERE id = $2",
                [product.orderQuantity, product.id]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, orderId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    } finally {
        client.release();
    }
});


app.listen(5000, () => {
    console.log('server on port 5000')
});

