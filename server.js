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

app.put('/updatecard/:id', async (req, res) => {
    const { id } = req.params;
    const { card_name, card_pic } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute(
            'UPDATE cards SET card_name = ?, card_pic = ? WHERE id = ?',
            [card_name, card_pic, id]
        );
        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: `No card found with id ${id}` });
        }

        res.json({ message: `Card with id ${id} updated successfully.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: `Server error - could not update card ${id}` });
    }
});

app.delete('/deletecard/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('DELETE FROM cards WHERE id = ?', [id]);
        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: `No card found with id ${id}` });
        }

        res.json({ message: `Card with id ${id} deleted successfully.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: `Server error - could not delete card ${id}` });
    }
});