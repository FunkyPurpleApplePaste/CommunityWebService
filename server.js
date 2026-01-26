const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();
const port = 3000;

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:  process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0,
}

const app = express();
app.use(express.json());

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
});

function requireAuth(req, res, next) {
    const header = req.headers.authorization; // "Bearer <token>"
    if (!header) return res.status(401).json({ error: "Missing Authorization header" });
    const [type, token] = header.split(" ");
    if (type !== "Bearer" || !token) {
        return res.status(401).json({ error: "Invalid Authorization format" });
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid/Expired token" });
    }
}
// Protect only ONE route for this demo
app.post("/addcard", requireAuth, async (req, res) => {
// existing addcard logic (same as before)
});

app.get('/allcards', async (req, res) => {
    try {
        let connections = await mysql.createConnection(dbConfig);
        const [rows] = await connections.execute('SELECT * FROM defaultdb.cards');
        res.json(rows);
    } catch {
        console.error(err);
        res.status(500).json({message:'Server error for allcards'});
    }
});

app.post('/addcard', async (req, res) => {
    const { card_name , card_pic } = req.body;
    try {
        let connection = await mysql.createConnection(dbConfig);
        await connection.execute('INSERT INTO cards (card_name, card_pic) VALUES (?,?)', [card_name, card_pic]);
        res.status(201).json({message:'Cards '+card_name+' added successfully.'});
    } catch (err) {
        console.error(err);
        res.status(500).json({message: 'Server error - could not add card' + card_name});
    }
})

// Example Route: Update a card
app.put('/updatecard/:id', async (req, res) => {
    const { id } = req.params;
    const { card_name, card_pic } = req.body;
    try{
        let connection = await mysql.createConnection(dbConfig);
        await connection.execute('UPDATE cards SET card_name=?, card_pic=? WHERE id=?', [card_name, card_pic, id]);
        res.status(201).json({ message: 'Card ' + id + ' updated successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error - could not update card ' + id });
    }
});

// Example Route: Delete a card
app.delete('/deletecard/:id', async (req, res) => {
    const { id } = req.params;
    try{
        let connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM cards WHERE id=?', [id]);
        res.status(201).json({ message: 'Card ' + id + ' deleted successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error - could not delete card ' + id });
    }
});

