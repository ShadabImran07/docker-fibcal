const keys = require('./keys');

// Express App setup
const express = require('express');
const bodyParser = require('body-parser'); 
const cors = require('cors');
const app = express();

app.use(cors());
app.use(bodyParser.json());


// Postgress client setup
const {Pool} = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
})

pgClient.on("connect", (client) => {
    client
      .query("CREATE TABLE IF NOT EXISTS values (number INT)")
      .catch((err) => console.error(err));
  });

//   Redis client setup
const redis = require('redis')

const redisClient = redis.createClient({
    host:keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});
const redPublisher = redisClient.duplicate();

// express route handler setup
app.get('/', (req, res) => {
    res.send('Hello World!');
})

app.get('/values/all', async(req, res) => {
    const values = await pgClient.query("SELECT * FROM values");
    res.send(values.rows)
})
app.get('/values/current', async(req, res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    })
})

app.post('/values', async(req, res) => {
    const index = req.body.index;
    if(parseInt(index)>40){
        res.status(422).send('Index must be less than 40');
    }
    redisClient.hset('values',index,'Noting yet!');
    redPublisher.publish('inset', index)
    pgClient.query('INSERT INTO values(number) VALUES ($1)',[index]);
    res.status(201).send('Inserted');
})

app.listen(5000,err => {
    console.log("listening on port");
})