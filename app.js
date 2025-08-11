require("module-alias/register")
const dotenv = require("dotenv")
const myEnv = dotenv.config()
const bodyParser = require("body-parser")

const express = require('express');
const app = express()

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/images', express.static('public/images'))
app.use('/css', express.static('public/css'))
app.use('/js', express.static('public/js'))

app.set('view engine', 'twig');
app.set('views', './templates');

const cors = require('cors')
app.use(cors({
  "origin": null,
  "methods": "POST",
  "preflightContinue": true,
  "optionsSuccessStatus": 204
}))


const cookieParser = require("cookie-parser")
app.use(cookieParser())

// Ignore Kubernetes health check probes
app.use((req, res, next) => {
  const userAgent = req.get('User-Agent');
  if (userAgent && userAgent.startsWith('kube-probe')) {
    return res.status(200).send('OK');
  }
  next();
});

const routes = require("./config/routes")
const neo4j = new require('@classes/firestore')


app.use(routes);
app.use(require('./pages/error'));

process.on('SIGINT', async () => {
  await neo4j.close();
  console.log('Neo4j connection closed');
  process.exit();
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Zibix is running on http://localhost:${port}`);
});
